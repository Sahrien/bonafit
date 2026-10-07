from __future__ import annotations

import shutil
import tempfile
from pathlib import Path
from shlex import quote

from bonafit_deploy import rsync, ssh
from bonafit_deploy.paths import API_ROOT, DESK_ROOT, WEB_ROOT
from bonafit_deploy.process import run
from bonafit_deploy.settings import DeployEnv

BACKEND_SKIP_DIRS = {".venv", "tests", "__pycache__", ".pytest_cache", "dist", ".git"}
BACKEND_SKIP_FILES = {".env"}
BACKEND_ROOT_FILES = ("pyproject.toml", "uv.lock", ".python-version", "README.md")
BACKEND_ROOT_DIRS = ("app", "scripts")


def deploy_frontend(env: DeployEnv, *, skip_tests: bool) -> None:
    _deploy_angular(
        DESK_ROOT,
        output_path="dist/bonafit-desk",
        remote=env.remote_frontend,
        env=env,
        skip_tests=skip_tests,
    )


def deploy_web(env: DeployEnv, *, skip_tests: bool) -> None:
    _deploy_angular(
        WEB_ROOT,
        output_path="dist/bonafit",
        remote=env.remote_web,
        env=env,
        skip_tests=skip_tests,
    )


def deploy_backend(env: DeployEnv, *, skip_tests: bool) -> None:
    if not skip_tests:
        run(["uv", "run", "pytest"], cwd=API_ROOT)
    with tempfile.TemporaryDirectory(prefix="bonafit-api-") as staging_dir:
        staging = Path(staging_dir)
        _stage_backend(API_ROOT, staging)
        rsync.upload_directory(
            local=staging,
            remote=env.remote_backend,
            host=env.ssh_host,
            port=env.ssh_port,
            user=env.ssh_user,
            private_key=env.ssh_private_key,
            delete=True,
            excludes=(".env", ".venv", "__pycache__"),
            remote_owner=env.app_user,
        )
    _restart_backend(env)


def _deploy_angular(
    project: Path,
    *,
    output_path: str,
    remote: str,
    env: DeployEnv,
    skip_tests: bool,
) -> None:
    run(["npm", "ci"], cwd=project)
    if not skip_tests:
        run(
            [
                "npx",
                "ng",
                "test",
                "--watch=false",
                "--browsers=ChromeHeadless",
            ],
            cwd=project,
        )
    run(["npx", "ng", "build", "--configuration", "production"], cwd=project)
    local = _angular_browser_dir(project, output_path)
    rsync.upload_directory(
        local=local,
        remote=remote,
        host=env.ssh_host,
        port=env.ssh_port,
        user=env.ssh_user,
        private_key=env.ssh_private_key,
        delete=True,
        remote_owner=env.app_user,
    )


def _angular_browser_dir(project: Path, output_path: str) -> Path:
    dist = project / output_path
    browser = dist / "browser"
    if browser.is_dir():
        return browser
    if dist.is_dir():
        return dist
    raise FileNotFoundError(f"build output not found: {dist}")


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


def _restart_backend(env: DeployEnv) -> None:
    remote = env.remote_backend.rstrip("/")
    app_user = quote(env.app_user)
    unit = quote(env.api_unit)
    # deploy cannot cd into bonafit-owned dirs; run sync as app_user via sudo
    command = (
        f"sudo -u {app_user} bash -lc {quote(f'cd {remote} && uv sync --frozen')} && "
        f"sudo systemctl enable --now {unit} && "
        f"sudo systemctl restart {unit}"
    )
    ssh.run_remote(
        host=env.ssh_host,
        port=env.ssh_port,
        user=env.ssh_user,
        password="",
        private_key=env.ssh_private_key,
        command=command,
    )
