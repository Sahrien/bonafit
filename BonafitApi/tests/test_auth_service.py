import pytest

from app.database import Database
from app.errors import BusinessError, ForbiddenError, UnauthorizedError
from app.models import User
from app.schemas import ChangePasswordRequest, LoginRequest
from app.security import Security
from app.services.auth import AuthService

ADMIN_EMAIL = "lucia@bonafit.com"
PASSWORD = "secret"


def _add_user(db: Database, password_hash: str, **overrides: object) -> User:
    values: dict[str, object] = {
        "id": "user-1",
        "email": ADMIN_EMAIL,
        "password_hash": password_hash,
        "display_name": "Alex",
        "role": "admin",
        "must_change_password": False,
    }
    values.update(overrides)
    user = User(**values)
    with db.session() as session:
        session.add(user)
    return user


def _bearer(security: Security, user_id: str = "user-1") -> str:
    return f"Bearer {security.create_access_token(user_id)}"


def test_login_ok(auth_service: AuthService, db: Database, security: Security, password_hash: str) -> None:
    _add_user(db, password_hash)
    session = auth_service.login(LoginRequest(email=ADMIN_EMAIL, password=PASSWORD))
    assert session.user.email == ADMIN_EMAIL
    assert session.user.role == "admin"
    assert security.decode_access_token(session.token) == "user-1"


def test_login_rejects_unknown_email(auth_service: AuthService) -> None:
    with pytest.raises(UnauthorizedError):
        auth_service.login(LoginRequest(email="nobody@example.com", password=PASSWORD))


def test_login_rejects_bad_password(auth_service: AuthService, db: Database, password_hash: str) -> None:
    _add_user(db, password_hash)
    with pytest.raises(UnauthorizedError):
        auth_service.login(LoginRequest(email=ADMIN_EMAIL, password="wrong"))


def test_me_returns_user(auth_service: AuthService, db: Database, security: Security, password_hash: str) -> None:
    _add_user(db, password_hash)
    me = auth_service.me(_bearer(security))
    assert me is not None
    assert me.user.id == "user-1"
    assert me.token == ""


def test_me_without_token(auth_service: AuthService) -> None:
    assert auth_service.me(None) is None
    assert auth_service.me("Bearer not-a-jwt") is None


def test_change_password(auth_service: AuthService, db: Database, security: Security, password_hash: str) -> None:
    _add_user(db, password_hash, must_change_password=True)
    assert auth_service.change_password(
        _bearer(security),
        ChangePasswordRequest(currentPassword=PASSWORD, newPassword="new-secret"),
    ) == {"ok": True}
    session = auth_service.login(LoginRequest(email=ADMIN_EMAIL, password="new-secret"))
    assert session.user.mustChangePassword is False


def test_change_password_unauthorized(auth_service: AuthService) -> None:
    with pytest.raises(UnauthorizedError):
        auth_service.change_password(
            None,
            ChangePasswordRequest(currentPassword=PASSWORD, newPassword="new-secret"),
        )


def test_require_user_without_token(auth_service: AuthService) -> None:
    with pytest.raises(UnauthorizedError):
        auth_service.require_user(None)


def test_require_not_must_change(auth_service: AuthService, db: Database, security: Security, password_hash: str) -> None:
    _add_user(db, password_hash, must_change_password=True)
    with pytest.raises(BusinessError) as exc:
        auth_service.require_not_must_change(_bearer(security))
    assert exc.value.code == "auth.mustChangePassword"


def test_require_admin(auth_service: AuthService, db: Database, security: Security, password_hash: str) -> None:
    _add_user(db, password_hash)
    assert auth_service.require_admin(_bearer(security)).role == "admin"


def test_require_admin_forbids_client(
    auth_service: AuthService, db: Database, security: Security, password_hash: str
) -> None:
    _add_user(db, password_hash, id="user-c", role="client")
    with pytest.raises(ForbiddenError):
        auth_service.require_admin(_bearer(security, "user-c"))
