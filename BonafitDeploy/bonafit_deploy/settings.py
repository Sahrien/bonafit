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


# ---------------------------------------------------------------- Estalvia
# Estalvia lives in its own repo (GitLab), so its settings are separate from
# the Bonafit FTP/SSH block above.


class EstalviaSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=PACKAGE_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    estalvia_repo_url: str = "git@gitlab.com:madriguera1/sagar.git"
    estalvia_remote_api: str = "/srv/estalvia/api"
    estalvia_remote_public: str = "/srv/estalvia/public"
    estalvia_api_unit: str = "estalvia-api"
    estalvia_app_user: str = "estalvia"
    estalvia_public_api_health: str = "https://bona-fit.es/estalvia/api/health"
    estalvia_public_web_url: str = "https://bona-fit.es/estalvia/"


@dataclass(frozen=True)
class EstalviaEnv:
    ssh_host: str
    ssh_port: int
    ssh_user: str
    ssh_private_key: Path
    repo_url: str
    remote_api: str
    remote_public: str
    api_unit: str
    app_user: str
    public_api_health: str
    public_web_url: str


def load_estalvia_env() -> EstalviaEnv:
    """Estalvia reuses the same SSH block as Bonafit, with its own remotes."""
    settings = Settings()
    est = EstalviaSettings()
    return EstalviaEnv(
        ssh_host=settings.ssh_host or settings.ftp_host,
        ssh_port=settings.ssh_port,
        ssh_user=settings.ssh_user or settings.ftp_user,
        ssh_private_key=_resolve_private_key(settings.ssh_private_key),
        repo_url=est.estalvia_repo_url,
        remote_api=est.estalvia_remote_api,
        remote_public=est.estalvia_remote_public,
        api_unit=est.estalvia_api_unit,
        app_user=est.estalvia_app_user,
        public_api_health=est.estalvia_public_api_health,
        public_web_url=est.estalvia_public_web_url,
    )

