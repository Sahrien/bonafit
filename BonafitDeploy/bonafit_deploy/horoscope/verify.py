"""Post-deploy assertions and the deployed-commit marker for Horoscope.

A green rsync/systemctl is not enough: the deployed surfaces must prove they
serve the build this run just uploaded. Checks:

* API health reports ``ok``;
* every shipped SPA has ``index.html`` at its web root;
* each public SPA returns the app shell and references a ``main-*.js`` that
  exists in the bundle just built;
* ``DEPLOYED_COMMIT`` on the server matches the commit that was built.
"""

from __future__ import annotations

import re
import shlex
import time
import urllib.error
import urllib.request
from pathlib import Path

from bonafit_deploy import rsync as rsync_mod
from bonafit_deploy import ssh as ssh_mod
from bonafit_deploy.settings import HoroscopeEnv

MARKER_NAME = "DEPLOYED_COMMIT"

_HTTP_TIMEOUT = 20
_RETRIES = 8
_RETRY_DELAY = 5.0


class DeployVerificationError(RuntimeError):
    """A post-deploy assertion failed; the deploy must be reported as failed."""


def ship_web(env: HoroscopeEnv, browser: Path, *, remote: str, owner: str) -> None:
    """Upload the contents of an Angular ``browser`` directory to ``remote``."""
    rsync_mod.upload_directory(
        local=browser,
        remote=remote,
        host=env.ssh_host,
        port=env.ssh_port,
        user=env.ssh_user,
        private_key=env.ssh_private_key,
        delete=True,
        remote_owner=owner,
    )


def run_remote(env: HoroscopeEnv, command: str) -> None:
    ssh_mod.run_remote(
        host=env.ssh_host,
        port=env.ssh_port,
        user=env.ssh_user,
        password="",
        private_key=env.ssh_private_key,
        command=command,
    )


def write_marker(env: HoroscopeEnv, *, commit: str) -> None:
    """Record the exact commit deployed next to the API."""
    remote = shlex.quote(env.remote_api.rstrip("/"))
    stamp = time.strftime("%Y-%m-%dT%H:%M:%S%z")
    body = f"{commit} {stamp}"
    owner = shlex.quote(env.app_user)
    _remote(
        env,
        f"printf '%s\\n' {shlex.quote(body)} | sudo tee {remote}/{MARKER_NAME} "
        f">/dev/null && sudo chown {owner}:{owner} {remote}/{MARKER_NAME}",
    )
    print(f"+ recorded {MARKER_NAME} = {commit}", flush=True)


def read_marker(env: HoroscopeEnv) -> str:
    out = _remote(
        env,
        f"sudo cat {shlex.quote(env.remote_api.rstrip('/'))}/{MARKER_NAME} "
        "2>/dev/null || true",
    )
    lines = (out or "").strip().splitlines()
    return lines[0].split()[0] if lines else ""


def verify_deployed(
    env: HoroscopeEnv,
    *,
    commit: str,
    expect_api: bool,
    expect_web: bool,
    expect_app: bool,
    expect_landing: bool,
    web_assets: dict[str, tuple[str, ...]],
) -> None:
    checks: list[str] = []

    if expect_api:
        body = _http_get(env.public_api_health)
        if '"ok"' not in body.replace(" ", ""):
            raise DeployVerificationError(
                f"API health at {env.public_api_health} did not report ok: "
                f"{body[:200]!r}"
            )
        checks.append(f"api {env.public_api_health} -> ok")

    surfaces = []
    if expect_web:
        surfaces.append(
            (
                "web",
                env.remote_web,
                env.public_web_url,
                "/horoscope/",
                web_assets.get("web", ()),
            )
        )
    if expect_app:
        surfaces.append(
            ("app", env.remote_app, env.public_app_url, "/app/", web_assets.get("app", ()))
        )
    if expect_landing:
        surfaces.append(
            (
                "landing",
                env.remote_landing,
                env.public_landing_url,
                "/",
                web_assets.get("landing", ()),
            )
        )

    for name, remote, url, base_href, expected_assets in surfaces:
        _assert_index_at_root(env, remote, name)
        index = _http_get(url)
        if "<app-root" not in index:
            raise DeployVerificationError(
                f"{url} did not return the app shell (no <app-root>): "
                f"{index[:200]!r}"
            )
        if f'<base href="{base_href}">' not in index:
            raise DeployVerificationError(
                f"{url} has the wrong <base href>; expected {base_href!r}"
            )
        referenced = set(re.findall(r"(main-[A-Z0-9]+\.js)", index))
        if not expected_assets:
            raise DeployVerificationError(
                f"no main-*.js in the uploaded {name} bundle to compare against"
            )
        missing = referenced - set(expected_assets)
        if missing:
            raise DeployVerificationError(
                f"{name} index references bundles that were not deployed: "
                + ", ".join(sorted(missing))
            )
        checks.append(f"{name} {url} -> app shell + uploaded bundle")

    recorded = read_marker(env)
    if not recorded:
        raise DeployVerificationError(
            f"no {MARKER_NAME} at {env.remote_api} — the deploy did not record "
            "what it shipped"
        )
    if not (recorded.startswith(commit) or commit.startswith(recorded)):
        raise DeployVerificationError(
            f"{MARKER_NAME} says {recorded} but this run deployed {commit}"
        )
    checks.append(f"{MARKER_NAME}={recorded}")

    print("Verified: " + "; ".join(checks), flush=True)


def web_asset_names(browser: Path) -> tuple[str, ...]:
    return tuple(sorted(path.name for path in browser.glob("main-*.js")))


def _assert_index_at_root(env: HoroscopeEnv, remote: str, name: str) -> None:
    root = remote.rstrip("/")
    out = _remote(
        env,
        f"test -f {shlex.quote(root)}/index.html && echo ROOT_OK || echo MISSING",
    )
    if "ROOT_OK" not in (out or ""):
        raise DeployVerificationError(
            f"{root}/index.html is missing — the {name} SPA was uploaded one "
            "level too deep"
        )


def _remote(env: HoroscopeEnv, command: str) -> str:
    """Run a remote command and capture stdout (reads marker/probes)."""
    import paramiko

    from bonafit_deploy.ssh import _load_private_key  # noqa: PLC2701

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(
        hostname=env.ssh_host,
        port=env.ssh_port,
        username=env.ssh_user,
        pkey=_load_private_key(env.ssh_private_key, password=""),
        allow_agent=False,
        look_for_keys=False,
    )
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
