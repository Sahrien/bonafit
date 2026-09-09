from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://bonafit:bonafit@localhost:5432/bonafit"
    jwt_secret: str = "change-this-in-production"
    jwt_expire_hours: int = 12
    bootstrap_password: str = "ChangeMe123!"
    cors_origins: str = (
        "http://localhost:4200,http://127.0.0.1:4200,"
        "http://localhost:4201,http://127.0.0.1:4201"
    )
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""
    smtp_starttls: bool = True
    timezone: str = "Europe/Madrid"

    @property
    def cors_origin_list(self) -> list[str]:
        return [item.strip() for item in self.cors_origins.split(",") if item.strip()]


settings = Settings()
