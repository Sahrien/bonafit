import pytest

from app.database import Database
from app.security import Security
from app.services.auth import AuthService

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
def auth_service(db: Database, security: Security) -> AuthService:
    return AuthService(session_factory=db.session, security=security)
