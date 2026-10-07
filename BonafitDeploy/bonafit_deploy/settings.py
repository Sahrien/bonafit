from dataclasses import dataclass
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

from bonafit_deploy.paths import PACKAGE_ROOT


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=PACKAGE_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    ssh_host: str
    ssh_port: int = 22
    ssh_user: str = "deploy"
    ssh_private_key: str = "~/.ssh/id_ed25519_ovh"

    # Prod remotes (OVH). --dev swaps the /srv/bonafit prefix for /srv/dev.bonafit.
    remote_web: str = "/srv/bonafit/public"
    remote_frontend: str = "/srv/bonafit/app"
    remote_backend: str = "/srv/bonafit/api"

    api_unit: str = "bonafit-api-bonafit"
    api_unit_dev: str = "bonafit-api-bonafit_dev"
    app_user: str = "bonafit"


@dataclass(frozen=True)
class DeployEnv:
    ssh_host: str
    ssh_port: int
    ssh_user: str
    ssh_private_key: Path
    remote_frontend: str
    remote_backend: str
    remote_web: str
    api_unit: str
    app_user: str


def _resolve_private_key(value: str) -> Path:
    path = Path(value).expanduser()
    if not path.is_absolute():
        path = PACKAGE_ROOT / path
    return path.resolve()


def _dev_remote(path: str) -> str:
    """Map /srv/bonafit/... -> /srv/dev.bonafit/..."""
    if path.startswith("/srv/bonafit"):
        return "/srv/dev.bonafit" + path[len("/srv/bonafit") :]
    raise ValueError(f"cannot derive --dev remote from {path!r}; expected /srv/bonafit/...")


def load_env(*, dev: bool) -> DeployEnv:
    settings = Settings()
    if dev:
        remote_web = _dev_remote(settings.remote_web)
        remote_frontend = _dev_remote(settings.remote_frontend)
        remote_backend = _dev_remote(settings.remote_backend)
        api_unit = settings.api_unit_dev
    else:
        remote_web = settings.remote_web
        remote_frontend = settings.remote_frontend
        remote_backend = settings.remote_backend
        api_unit = settings.api_unit
    return DeployEnv(
        ssh_host=settings.ssh_host,
        ssh_port=settings.ssh_port,
        ssh_user=settings.ssh_user,
        ssh_private_key=_resolve_private_key(settings.ssh_private_key),
        remote_frontend=remote_frontend,
        remote_backend=remote_backend,
        remote_web=remote_web,
        api_unit=api_unit,
        app_user=settings.app_user,
    )
