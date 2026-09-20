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

    ftp_host: str
    ftp_port: int = 21
    ftp_tls: bool = False
    ftp_user: str
    ftp_password: str
    ftp_user_dev: str
    ftp_password_dev: str
    ftp_remote_frontend: str
    ftp_remote_backend: str
    ftp_remote_web: str
    ssh_host: str = ""
    ssh_port: int = 22
    ssh_user: str = ""
    ssh_password: str = ""
    ssh_user_dev: str = ""
    ssh_password_dev: str = ""
    ssh_private_key: str = "id_rsa"


@dataclass(frozen=True)
class DeployEnv:
    ftp_host: str
    ftp_port: int
    ftp_tls: bool
    ftp_user: str
    ftp_password: str
    ssh_host: str
    ssh_port: int
    ssh_user: str
    ssh_password: str
    ssh_private_key: Path
    remote_frontend: str
    remote_backend: str
    remote_web: str


def _resolve_private_key(value: str) -> Path:
    path = Path(value).expanduser()
    if not path.is_absolute():
        path = PACKAGE_ROOT / path
    return path.resolve()


def load_env(*, dev: bool) -> DeployEnv:
    settings = Settings()
    ftp_user = settings.ftp_user_dev if dev else settings.ftp_user
    ftp_password = settings.ftp_password_dev if dev else settings.ftp_password
    ssh_user = (settings.ssh_user_dev if dev else settings.ssh_user) or ftp_user
    ssh_password = (
        (settings.ssh_password_dev if dev else settings.ssh_password) or ftp_password
    )
    return DeployEnv(
        ftp_host=settings.ftp_host,
        ftp_port=settings.ftp_port,
        ftp_tls=settings.ftp_tls,
        ftp_user=ftp_user,
        ftp_password=ftp_password,
        ssh_host=settings.ssh_host or settings.ftp_host,
        ssh_port=settings.ssh_port,
        ssh_user=ssh_user,
        ssh_password=ssh_password,
        ssh_private_key=_resolve_private_key(settings.ssh_private_key),
        remote_frontend=settings.ftp_remote_frontend,
        remote_backend=settings.ftp_remote_backend,
        remote_web=settings.ftp_remote_web,
    )
