"""Post-deploy assertions and the deployed-commit marker for Estalvia.

A deploy is not done when rsync and ``systemctl restart`` return 0: every
failure this tool has actually shipped (a missing ``alembic.ini``, the SPA
uploaded one directory too deep) reported success and then served 403 or died
on reload. So a deploy only succeeds once the live surface proves it:

* the API's public health endpoint answers 200 and reports ok;
* the SPA's public index answers 200 and is the build just uploaded, i.e. it
  references a ``main-*.js`` that exists in that build (a stale index pointing
  at a deleted chunk is a blank page behind a 200);
* ``index.html`` sits at the web root, never nested under a subdirectory;
* ``DEPLOYED_COMMIT`` on the server equals the commit that was built.

The marker is owned by this tool and written on every deploy, so the deployed
revision is readable afterwards instead of inferred from process start times.
The old infra ``deploy.sh`` kept its own copy under ``/var/lib/infra-deploy``,
which goes stale the first time a BonafitDeploy deploy runs — read this one.
"""

from __future__ import annotations

import re
import shlex
import time
import urllib.error
import urllib.request
from pathlib import Path

from bonafit_deploy.settings import EstalviaEnv

MARKER_NAME = "DEPLOYED_COMMIT"

_HTTP_TIMEOUT = 20
_RETRIES = 8
_RETRY_DELAY = 5.0


class DeployVerificationError(RuntimeError):
    """A post-deploy assertion failed; the deploy must be reported as failed."""


def write_marker(env: EstalviaEnv, *, commit: str) -> None:
    """Record the commit this run deployed, next to the deployed code."""
    remote = shlex.quote(_remote_api(env))
    stamp = time.strftime("%Y-%m-%dT%H:%M:%S%z")
    body = f"{commit} {stamp}"
    _remote(
        env,
        f"printf '%s\\n' {shlex.quote(body)} | sudo tee "
        f"{remote}/{MARKER_NAME} >/dev/null && "
        f"sudo chown {shlex.quote(env.app_user)}:{shlex.quote(env.app_user)} "
        f"{remote}/{MARKER_NAME}",
    )
    print(f"+ recorded {MARKER_NAME} = {commit}", flush=True)


def read_marker(env: EstalviaEnv) -> str:
    """Return the full sha recorded on the server, or '' when absent."""
    out = _remote(
        env,
        f"sudo cat {shlex.quote(_remote_api(env))}/{MARKER_NAME} 2>/dev/null || true",
    )
    lines = (out or "").strip().splitlines()
    return lines[0].split()[0] if lines else ""


def verify_deployed(
    env: EstalviaEnv,
    *,
    commit: str,
    expect_api: bool,
    expect_web: bool,
    web_assets: tuple[str, ...] = (),
) -> None:
    """Assert the live surface serves what was just deployed, or raise."""
    checks: list[str] = []

    if expect_api:
        body = _http_get(env.public_api_health)
        normalised = body.replace(" ", "")
        if '"ok"' not in normalised and "'ok'" not in normalised:
            raise DeployVerificationError(
                f"API health at {env.public_api_health} did not report ok: "
                f"{body[:200]!r}"
            )
        checks.append(f"api {env.public_api_health} -> ok")

    if expect_web:
        assert_index_at_root(env)
        checks.append(f"{_remote_public(env)}/index.html present")

        index = _http_get(env.public_web_url)
        if "<app-root" not in index:
            raise DeployVerificationError(
                f"{env.public_web_url} did not return the app shell (no "
                f"<app-root>): {index[:200]!r}"
            )
        checks.append(f"web {env.public_web_url} -> app shell")

        referenced = set(re.findall(r"(main-[A-Z0-9]+\.js)", index))
        if web_assets:
            missing = referenced - set(web_assets)
            if missing:
                raise DeployVerificationError(
                    "index.html references bundles that were not deployed: "
                    + ", ".join(sorted(missing))
                )
            checks.append("index matches the uploaded bundle")
        elif referenced:
            raise DeployVerificationError(
                "could not check the shell against the build: no main-*.js in "
                f"the uploaded bundle (index references {sorted(referenced)})"
            )

    recorded = read_marker(env)
    if not recorded:
        raise DeployVerificationError(
            f"no {MARKER_NAME} at {_remote_api(env)} — the deploy did not "
            "record what it shipped"
        )
    if not (recorded.startswith(commit) or commit.startswith(recorded)):
        raise DeployVerificationError(
            f"{MARKER_NAME} says {recorded} but this run deployed {commit}"
        )
    checks.append(f"{MARKER_NAME}={recorded}")

    print("Verified: " + "; ".join(checks), flush=True)


def assert_index_at_root(env: EstalviaEnv) -> None:
    """``index.html`` must be at the web root, never under a subdirectory."""
    root = _remote_public(env)
    out = _remote(
        env, f"test -f {shlex.quote(root)}/index.html && echo ROOT_OK || echo MISSING"
    )
    if "ROOT_OK" not in (out or ""):
        raise DeployVerificationError(
            f"{root}/index.html is missing — the SPA was uploaded one level too "
            "deep (check the dist path handed to upload_directory)"
        )


def web_asset_names(browser: Path) -> tuple[str, ...]:
    """``main-*.js`` bundle names in a built SPA, for the shell check."""
    return tuple(sorted(p.name for p in browser.glob("main-*.js")))


def _remote_api(env: EstalviaEnv) -> str:
    return env.remote_api.rstrip("/")


def _remote_public(env: EstalviaEnv) -> str:
    return env.remote_public.rstrip("/")


def _remote(env: EstalviaEnv, command: str) -> str:
    """Run a command on the server and return its stdout.

    ``run_remote`` in this package streams to the terminal and returns None, so
    reads (the marker, the index probe) go through their own capture path
    rather than changing that shared helper's contract.
    """
    import paramiko

    from bonafit_deploy.ssh import _load_private_key  # noqa: PLC2701

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    kwargs: dict[str, object] = {
        "hostname": env.ssh_host,
        "port": env.ssh_port,
        "username": env.ssh_user,
        "pkey": _load_private_key(env.ssh_private_key, password=""),
        "allow_agent": False,
        "look_for_keys": False,
    }
    client.connect(**kwargs)
    try:
        _stdin, stdout, stderr = client.exec_command(f"bash -lc {shlex.quote(command)}")
        out = stdout.read().decode()
        err = stderr.read().decode()
        status = stdout.channel.recv_exit_status()
    finally:
        client.close()
    if status != 0 and "MISSING" not in out:
        raise DeployVerificationError(
            f"remote probe failed (exit {status}): {command} :: {err.strip()[:200]}"
        )
    return out


def _http_get(url: str) -> str:
    """GET a URL, retrying while the restarted unit is still coming up."""
    last: Exception | None = None
    for attempt in range(1, _RETRIES + 1):
        try:
            with urllib.request.urlopen(url, timeout=_HTTP_TIMEOUT) as response:
                if response.status != 200:
                    raise DeployVerificationError(f"{url} -> HTTP {response.status}")
                return response.read().decode("utf-8", "replace")
        except (urllib.error.URLError, OSError, DeployVerificationError) as exc:
            last = exc
            if attempt < _RETRIES:
                print(f"  {url} not ready yet ({exc}); retrying", flush=True)
                time.sleep(_RETRY_DELAY)
    raise DeployVerificationError(f"{url} never became ready: {last}")
