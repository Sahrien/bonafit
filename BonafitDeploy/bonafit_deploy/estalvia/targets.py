"""Estalvia deploy targets: build a pinned commit on this machine, ship to the VPS.

Estalvia is a monorepo (FastAPI backend + Angular frontend) in
``gitlab.com/madriguera1/sagar``. Unlike the Bonafit targets, which build the
working tree, this one always fetches an **exact commit** into a clean clone so
what is deployed is reproducible and never someone's uncommitted work.
"""

from __future__ import annotations

import shutil
import subprocess
import tempfile
from pathlib import Path

from bonafit_deploy import rsync as rsync_mod
from bonafit_deploy import ssh as ssh_mod
from bonafit_deploy.estalvia import verify as verify_mod
from bonafit_deploy.process import run
from bonafit_deploy.settings import EstalviaEnv

# Backend files/dirs to ship (mirrors the repo's own layout).
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
    "uv.lock",
    ".python-version",
    "alembic.ini",
    "README.md",
)
BACKEND_ROOT_DIRS = ("app", "alembic")

FRONTEND_SKIP_DIRS = {"node_modules", ".angular", ".git", "__pycache__"}


def deploy_estalvia(
    env: EstalviaEnv,
    *,
    commit: str,
    skip_tests: bool,
    target: str,
) -> None:
    """Targets: ``all`` | ``api`` | ``web``."""
    with tempfile.TemporaryDirectory(prefix="estalvia-build-") as tmp:
        clone = Path(tmp) / "sagar"
        _fetch_commit(env, clone, commit)
        built = _build(clone, env, skip_tests=skip_tests, target=target)

        if target in ("all", "api"):
            _ship_api(env, clone, built["api"])
        if target in ("all", "web"):
            _ship_web(env, built["web"])

        if target in ("all", "api"):
            _restart_and_migrate(env)

        # Record what shipped, then prove the live surface serves it. A
        # deploy that cannot prove itself is a failed deploy: the worst
        # historical outcome was a green exit that served 403 or left a
        # dead unit behind.
        verify_mod.write_marker(env, commit=commit)
        verify_mod.verify_deployed(
            env,
            commit=commit,
            expect_api=target in ("all", "api"),
            expect_web=target in ("all", "web"),
            web_assets=(
                verify_mod.web_asset_names(built["web"])
                if target in ("all", "web")
                else ()
            ),
        )

    print(f"Deployed estalvia {commit[:12]} ({target})", flush=True)


def _fetch_commit(env: EstalviaEnv, clone: Path, commit: str) -> None:
    """Clean clone at exactly ``commit`` — never the working tree.

    ``GIT_TERMINAL_PROMPT=0`` matters: without it git blocks on a credential
    prompt forever when the machine has no credentials for the repo, which
    looks like a hang rather than an error.
    """
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


def _build(
    clone: Path,
    env: EstalviaEnv,
    *,
    skip_tests: bool,
    target: str,
) -> dict[str, Path]:
    """Build backend deps and/or the Angular bundle. Returns output paths."""
    out: dict[str, Path] = {}
    backend = clone / "backend"

    if target in ("all", "api"):
        run(["uv", "sync", "--quiet"], cwd=backend)
        if not skip_tests:
            # A clean clone has no .env, and config now requires these. Point
            # the suite at a throwaway DSN; DB-backed tests skip when it is
            # unreachable, which is the correct signal on a build machine.
            run(
                ["uv", "run", "python", "-m", "unittest", "discover", "-s", "tests"],
                cwd=backend,
                env={
                    "DATABASE_URL": "postgresql+psycopg://estalvia:estalvia@localhost:5432/estalvia",
                    "JWT_SECRET": "deploy-test-only-not-a-secret",
                },
            )
        out["api"] = backend

    if target in ("all", "web"):
        frontend = clone / "frontend"
        node_env = _node_env()
        run(["pnpm", "install", "--frozen-lockfile"], cwd=frontend, env=node_env)
        run(["pnpm", "run", "build:prod"], cwd=frontend, env=node_env)
        out["web"] = _angular_browser_dir(frontend)

    return out


def _node_env() -> dict[str, str]:
    """PATH with a real Linux node, plus a pnpm that runs under it.

    Borda's PATH exposes Windows shims under /mnt/c/... which crash when run
    from WSL, and `node` itself is absent from a non-interactive PATH. Prefer
    the nvm node and corepack's pnpm, so the build does not depend on a login
    shell.
    """
    home = Path.home()
    candidates = sorted(home.glob(".nvm/versions/node/*/bin"), reverse=True)
    if not candidates:
        raise RuntimeError(
            "no Linux node found under ~/.nvm/versions/node/*/bin — "
            "install Node (Angular 19 needs 18+) or fix PATH"
        )
    node_bin = candidates[-1]  # oldest = safest default across majors
    for cand in candidates:  # prefer 22.x for Angular 19
        if cand.name and (cand.parent.name or "").startswith("v22"):
            node_bin = cand
            break
    path_parts = [str(node_bin), "/usr/local/bin", "/usr/bin", "/bin"]
    pnpm = node_bin / "pnpm"
    npm = node_bin / "npm"
    if not pnpm.exists() and npm.exists():
        # corepack ships with node; enable pnpm the first time.
        subprocess.run(
            [str(node_bin / "corepack"), "enable"],
            capture_output=True,
            check=False,
        )
    return {"PATH": ":".join(path_parts)}


def _angular_browser_dir(frontend: Path) -> Path:
    """Resolve the directory whose *contents* are the deployable SPA.

    Angular 19 with ``outputPath: dist/frontend`` writes the app to
    ``dist/frontend/browser``. Older layouts put it straight in ``dist/browser``.
    Returning the wrong level nests everything one directory too deep and the
    site 403s, so try the specific paths first and only then fall back.
    """
    candidates = (
        frontend / "dist" / "frontend" / "browser",
        frontend / "dist" / "browser",
    )
    for candidate in candidates:
        if (candidate / "index.html").is_file():
            return candidate
    raise FileNotFoundError(
        "no built SPA found (looked for index.html in "
        + ", ".join(str(c) for c in candidates)
        + ")"
    )


def _ship_api(env: EstalviaEnv, clone: Path, backend: Path) -> None:
    """Stage backend sources (never .env/.venv) and rsync them to /srv/estalvia/api."""
    with tempfile.TemporaryDirectory(prefix="estalvia-api-") as staging_dir:
        staging = Path(staging_dir)
        _stage_backend(backend, staging)
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


def _ship_web(env: EstalviaEnv, browser: Path) -> None:
    """Upload the *contents* of dist/.../browser to the web root.

    upload_directory already sends the directory's contents (it appends a
    trailing slash), so passing dist/.../browser lands index.html at the root
    of /srv/estalvia/public — which is what nginx serves.
    """
    rsync_mod.upload_directory(
        local=browser,
        remote=env.remote_public,
        host=env.ssh_host,
        port=env.ssh_port,
        user=env.ssh_user,
        private_key=env.ssh_private_key,
        delete=True,
        remote_owner=env.app_user,
    )


def _restart_and_migrate(env: EstalviaEnv) -> None:
    """Remote: sync deps as the app user, apply migrations, restart the unit."""
    remote = env.remote_api.rstrip("/")
    app_user = env.app_user
    command = (
        f"sudo -u {app_user} bash -lc 'cd {remote} && uv sync --frozen && "
        f"uv run alembic upgrade head' && "
        f"sudo systemctl enable --now {env.api_unit} && "
        f"sudo systemctl restart {env.api_unit}"
    )
    ssh_mod.run_remote(
        host=env.ssh_host,
        port=env.ssh_port,
        user=env.ssh_user,
        password="",
        private_key=env.ssh_private_key,
        command=command,
    )


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
