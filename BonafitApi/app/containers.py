from dependency_injector import containers, providers

from app.config import Settings
from app.database import Database
from app.emailer import Emailer
from app.security import Security
from app.services.auth import AuthService
from app.services.calendar import CalendarService
from app.services.catalog import CatalogService
from app.services.clients import ClientService
from app.services.forms import FormService


class Container(containers.DeclarativeContainer):
    wiring_config = containers.WiringConfiguration(
        modules=[
            "app.routers.auth",
            "app.routers.clients",
            "app.routers.services",
            "app.routers.calendar",
            "app.routers.forms",
        ],
        auto_wire=False,
    )

    settings = providers.Singleton(Settings)

    db = providers.Singleton(Database, db_url=settings.provided.database_url)

    security = providers.Singleton(
        Security,
        jwt_secret=settings.provided.jwt_secret,
        jwt_expire_hours=settings.provided.jwt_expire_hours,
    )

    emailer = providers.Singleton(Emailer, settings=settings)

    auth_service = providers.Factory(
        AuthService,
        session_factory=db.provided.session,
        security=security,
    )

    client_service = providers.Factory(
        ClientService,
        session_factory=db.provided.session,
        security=security,
        emailer=emailer,
    )

    catalog_service = providers.Factory(
        CatalogService,
        session_factory=db.provided.session,
    )

    calendar_service = providers.Factory(
        CalendarService,
        session_factory=db.provided.session,
    )

    form_service = providers.Factory(
        FormService,
        session_factory=db.provided.session,
    )
