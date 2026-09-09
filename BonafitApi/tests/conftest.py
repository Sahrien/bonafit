from unittest import mock

import pytest

from app.database import Database
from app.emailer import Emailer
from app.security import Security
from app.services.auth import AuthService
from app.services.calendar import CalendarService
from app.services.catalog import CatalogService
from app.services.clients import ClientService
from app.services.forms import FormService

_PASSWORD = "secret"


@pytest.fixture(scope="session")
def security() -> Security:
    return Security(jwt_secret="test-jwt-secret-not-for-production-use", jwt_expire_hours=1)


@pytest.fixture(scope="session")
def password_hash(security: Security) -> str:
    return security.hash_password(_PASSWORD)


@pytest.fixture
def db() -> Database:
    database = Database("sqlite://")
    database.create_database()
    return database


@pytest.fixture
def emailer() -> Emailer:
    stub = mock.Mock(spec=Emailer)
    stub.generate_password.return_value = "temp-pass-12"
    stub.send_temporary_password.return_value = False
    return stub


@pytest.fixture
def auth_service(db: Database, security: Security) -> AuthService:
    return AuthService(session_factory=db.session, security=security)


@pytest.fixture
def client_service(db: Database, security: Security, emailer: Emailer) -> ClientService:
    return ClientService(session_factory=db.session, security=security, emailer=emailer)


@pytest.fixture
def catalog_service(db: Database) -> CatalogService:
    return CatalogService(session_factory=db.session)


@pytest.fixture
def calendar_service(db: Database) -> CalendarService:
    return CalendarService(session_factory=db.session)


@pytest.fixture
def form_service(db: Database) -> FormService:
    return FormService(session_factory=db.session)
