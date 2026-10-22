"""Horoscope deploy targets: build a pinned commit on this machine, ship it.

Horoscope is a multi-surface app in its own GitLab repo:

* FastAPI + chart renderer -> ``/srv/horoscope/api`` (:8090)
* editor SPA              -> ``/srv/horoscope/public`` (``/horoscope/``)
* customer app SPA        -> ``/srv/tucartalaser/app`` (``/app/``)
* marketing landing       -> ``/srv/tucartalaser/public`` (domain root)

Like Estalvia, this target fetches an exact commit into a clean clone so the
deployed build never contains uncommitted local work (the landing assets in
particular can have work-in-progress photos in the working tree).
"""

from __future__ import annotations

import shutil
import subprocess
import tempfile
from pathlib import Path
from shlex import quote

from bonafit_deploy import rsync as rsync_mod
from bonafit_deploy.horoscope import verify as verify_mod
from bonafit_deploy.process import run
from bonafit_deploy.settings import HoroscopeEnv

BACKEND_SKIP_DIRS = {
    ".venv",
    "tests",
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
    ".ruff_cache",
    "dist",
    ".git",
}
BACKEND_SKIP_FILES = {".env"}
BACKEND_ROOT_FILES = (
    "pyproject.toml",
    "poetry.lock",
    "README.md",
    "alembic.ini",
    "requirements.txt",
)
BACKEND_ROOT_DIRS = ("api", "horoscope", "alembic")


def deploy_horoscope(
    env: HoroscopeEnv,
    *,
    commit: str,
    skip_tests: bool,
    target: str,
) -> None:
    """Targets: ``all`` | ``api`` | ``web`` | ``app`` | ``landing``."""
    with tempfile.TemporaryDirectory(prefix="horoscope-build-") as tmp:
        clone = Path(tmp) / "horoscope"
        _fetch_commit(env, clone, commit)
        built = _build(clone, skip_tests=skip_tests, target=target)

        if target in ("all", "api"):
            _ship_api(env, clone, built["requirements"])
            _restart_and_migrate(env)

        if target in ("all", "web"):
            verify_mod.ship_web(
                env,
                built["web"],
                remote=env.remote_web,
                owner=env.app_user,
            )
        if target in ("all", "app"):
            verify_mod.ship_web(
                env,
                built["app"],
                remote=env.remote_app,
                owner=env.tcl_owner,
            )
        if target in ("all", "landing"):
            verify_mod.ship_web(
                env,
                built["landing"],
                remote=env.remote_landing,
                owner=env.tcl_owner,
            )

        verify_mod.write_marker(env, commit=commit)
        verify_mod.verify_deployed(
            env,
            commit=commit,
            expect_api=target in ("all", "api"),
            expect_web=target in ("all", "web"),
            expect_app=target in ("all", "app"),
            expect_landing=target in ("all", "landing"),
            web_assets={
                "web": verify_mod.web_asset_names(built["web"]) if "web" in built else (),
                "app": verify_mod.web_asset_names(built["app"]) if "app" in built else (),
                "landing": (
                    verify_mod.web_asset_names(built["landing"])
                    if "landing" in built
                    else ()
                ),
            },
        )

    print(f"Deployed horoscope {commit[:12]} ({target})", flush=True)


def _fetch_commit(env: HoroscopeEnv, clone: Path, commit: str) -> None:
    """Clean clone at exactly ``commit`` — never the working tree."""
    clone.parent.mkdir(parents=True, exist_ok=True)
    print(f"Fetching {env.repo_url} @ {commit}", flush=True)
    env_vars = {
        "GIT_TERMINAL_PROMPT": "0",
        "GIT_SSH_COMMAND": "ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new",
    }
    run(["git", "init", "--quiet", str(clone)], cwd=clone.parent)
    run(["git", "remote", "add", "origin", env.repo_url], cwd=clone)
    run(
        ["git", "fetch", "--quiet", "--depth", "1", "origin", commit],
        cwd=clone,
        env=env_vars,
    )
    run(["git", "checkout", "--quiet", "FETCH_HEAD"], cwd=clone)


def _build(clone: Path, *, skip_tests: bool, target: str) -> dict[str, Path]:
    """Build the requested surfaces and return their deployable paths."""
    out: dict[str, Path] = {}

    if target in ("all", "api"):
        out["requirements"] = _prepare_backend(clone, skip_tests=skip_tests)

    if target in ("all", "web", "app"):
        web = clone / "web"
        node_env = _node_env()
        run(["pnpm", "install", "--frozen-lockfile"], cwd=web, env=node_env)
        if target in ("all", "web"):
            out["web"] = _build_web_variant(web, "horoscope", "/horoscope/")
        if target in ("all", "app"):
            out["app"] = _build_web_variant(web, "app", "/app/")

    if target in ("all", "landing"):
        landing = clone / "landing"
        node_env = _node_env()
        run(["pnpm", "install", "--frozen-lockfile"], cwd=landing, env=node_env)
        run(["pnpm", "build"], cwd=landing, env=node_env)
        out["landing"] = _angular_browser_dir(landing / "dist" / "landing")
        _assert_base_href(out["landing"], "/")

    return out


def _prepare_backend(clone: Path, *, skip_tests: bool) -> Path:
    """Compile runtime requirements and optionally run the test suite.

    The repo is Poetry-managed but the VPS uses ``uv pip`` with a generated
    requirements file (the pre-BonafitDeploy deploy script did the same).
    """
    requirements = clone / "requirements.txt"
    run(
        ["uv", "pip", "compile", "pyproject.toml", "-o", str(requirements)],
        cwd=clone,
    )
    if not skip_tests:
        run(["uv", "venv", "--python", "3.12", ".venv"], cwd=clone)
        run(
            [
                "uv",
                "pip",
                "install",
                "--python",
                ".venv/bin/python",
                "-r",
                "requirements.txt",
            ],
            cwd=clone,
        )
        run(
            [".venv/bin/python", "-m", "unittest", "discover", "-s", "tests"],
            cwd=clone,
        )
    return requirements


def _build_web_variant(web: Path, name: str, base_href: str) -> Path:
    """Build one editor SPA with a specific ``baseHref``."""
    out_dir = web / "dist" / f"deploy-{name}"
    shutil.rmtree(out_dir, ignore_errors=True)
    run(
        [
            "pnpm",
            "exec",
            "ng",
            "build",
            "--configuration",
            "production",
            "--base-href",
            base_href,
            "--output-path",
            f"dist/deploy-{name}",
        ],
        cwd=web,
        env=_node_env(),
    )
    browser = _angular_browser_dir(out_dir)
    _assert_base_href(browser, base_href)
    return browser


def _angular_browser_dir(dist: Path) -> Path:
    browser = dist / "browser"
    if (browser / "index.html").is_file():
        return browser
    if (dist / "index.html").is_file():
        return dist
    raise FileNotFoundError(
        f"no built SPA found under {dist} (looked for index.html at its root "
        "and in browser/)"
    )


def _assert_base_href(browser: Path, expected: str) -> None:
    index = (browser / "index.html").read_text(encoding="utf-8")
    if f'<base href="{expected}">' not in index:
        raise RuntimeError(
            f"expected <base href=\"{expected}\"> in {browser / 'index.html'}"
        )


def _node_env() -> dict[str, str]:
    """PATH with a real Linux node, plus a pnpm that runs under it."""
    home = Path.home()
    candidates = sorted(home.glob(".nvm/versions/node/*/bin"), reverse=True)
    if not candidates:
        raise RuntimeError(
            "no Linux node found under ~/.nvm/versions/node/*/bin — "
            "install Node (Angular 19 needs 18+) or fix PATH"
        )
    node_bin = candidates[-1]
    for cand in candidates:
        if (cand.parent.name or "").startswith("v22"):
            node_bin = cand
            break
    pnpm = node_bin / "pnpm"
    npm = node_bin / "npm"
    if not pnpm.exists() and npm.exists():
        subprocess.run(
            [str(node_bin / "corepack"), "enable"],
            capture_output=True,
            check=False,
        )
    return {
        "PATH": ":".join(
            [str(node_bin), "/usr/local/bin", "/usr/bin", "/bin"]
        )
    }


def _ship_api(env: HoroscopeEnv, clone: Path, requirements: Path) -> None:
    """Stage backend sources (never .env/.venv) and upload them to the VPS."""
    with tempfile.TemporaryDirectory(prefix="horoscope-api-") as staging_dir:
        staging = Path(staging_dir)
        _stage_backend(clone, staging)
        shutil.copy2(requirements, staging / "requirements.txt")
        rsync_mod.upload_directory(
            local=staging,
            remote=env.remote_api,
            host=env.ssh_host,
            port=env.ssh_port,
            user=env.ssh_user,
            private_key=env.ssh_private_key,
            delete=True,
            excludes=(".env", ".venv", "__pycache__"),
            remote_owner=env.app_user,
        )


def _restart_and_migrate(env: HoroscopeEnv) -> None:
    """Remote: install deps, require .env, migrate, restart the API unit."""
    remote = env.remote_api.rstrip("/")
    app_user = quote(env.app_user)
    api_unit = quote(env.api_unit)
    command = (
        f"sudo -u {app_user} bash -lc {quote(f'cd {remote} && (test -d .venv || uv venv --python 3.12 .venv) && uv pip install -r requirements.txt')} && "
        f"sudo -u {app_user} bash -lc {quote(f'test -f {remote}/.env || {{ echo \"MISSING {remote}/.env — create it with DATABASE_URL and JWT_SECRET\" >&2; exit 1; }}')} && "
        f"sudo -u {app_user} bash -lc {quote(f'cd {remote} && .venv/bin/alembic upgrade head')} && "
        f"sudo systemctl enable --now {api_unit} && "
        f"sudo systemctl restart {api_unit}"
    )
    verify_mod.run_remote(env, command)


def _stage_backend(api_root: Path, staging: Path) -> None:
    for name in BACKEND_ROOT_FILES:
        source = api_root / name
        if source.is_file():
            shutil.copy2(source, staging / name)
    for name in BACKEND_ROOT_DIRS:
        source = api_root / name
        if source.is_dir():
            _copytree_filtered(source, staging / name)


def _copytree_filtered(source: Path, dest: Path) -> None:
    dest.mkdir(parents=True, exist_ok=True)
    for item in source.iterdir():
        if item.is_dir():
            if item.name in BACKEND_SKIP_DIRS:
                continue
            _copytree_filtered(item, dest / item.name)
            continue
        if item.name in BACKEND_SKIP_FILES or item.suffix == ".pyc":
            continue
        shutil.copy2(item, dest / item.name)
