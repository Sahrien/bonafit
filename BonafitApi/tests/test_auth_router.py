from unittest import mock

from fastapi.testclient import TestClient

from app.errors import BusinessError, UnauthorizedError
from app.main import app
from app.schemas import AuthSessionOut, AuthUserOut
from app.services.auth import AuthService


def _session(token: str = "jwt-token") -> AuthSessionOut:
    return AuthSessionOut(
        user=AuthUserOut(id="user-1", displayName="Alex", role="admin", email="lucia@bonafit.com"),
        token=token,
    )


def test_login_ok() -> None:
    auth_mock = mock.Mock(spec=AuthService)
    auth_mock.login.return_value = _session()

    with app.container.auth_service.override(auth_mock):
        response = TestClient(app).post(
            "/auth/login",
            json={"email": "lucia@bonafit.com", "password": "secret"},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["token"] == "jwt-token"
    assert body["user"]["email"] == "lucia@bonafit.com"
    auth_mock.login.assert_called_once()


def test_login_unauthorized() -> None:
    auth_mock = mock.Mock(spec=AuthService)
    auth_mock.login.side_effect = UnauthorizedError("invalid credentials")

    with app.container.auth_service.override(auth_mock):
        response = TestClient(app).post(
            "/auth/login",
            json={"email": "lucia@bonafit.com", "password": "wrong"},
        )

    assert response.status_code == 401
    assert response.json() == {"detail": "invalid credentials"}


def test_me_ok() -> None:
    auth_mock = mock.Mock(spec=AuthService)
    auth_mock.me.return_value = _session(token="")

    with app.container.auth_service.override(auth_mock):
        response = TestClient(app).get("/auth/me", headers={"Authorization": "Bearer t"})

    assert response.status_code == 200
    assert response.json()["user"]["id"] == "user-1"
    auth_mock.me.assert_called_once()


def test_me_anonymous() -> None:
    auth_mock = mock.Mock(spec=AuthService)
    auth_mock.me.return_value = None

    with app.container.auth_service.override(auth_mock):
        response = TestClient(app).get("/auth/me")

    assert response.status_code == 200
    assert response.json() is None


def test_change_password_ok() -> None:
    auth_mock = mock.Mock(spec=AuthService)
    auth_mock.change_password.return_value = {"ok": True}

    with app.container.auth_service.override(auth_mock):
        response = TestClient(app).post(
            "/auth/change-password",
            json={"currentPassword": "old-secret", "newPassword": "new-secret"},
            headers={"Authorization": "Bearer t"},
        )

    assert response.status_code == 200
    assert response.json() == {"ok": True}
    auth_mock.change_password.assert_called_once()
    authorization, payload = auth_mock.change_password.call_args.args
    assert authorization == "Bearer t"
    assert payload.currentPassword == "old-secret"
    assert payload.newPassword == "new-secret"


def test_change_password_first_login_without_current() -> None:
    auth_mock = mock.Mock(spec=AuthService)
    auth_mock.change_password.return_value = {"ok": True}

    with app.container.auth_service.override(auth_mock):
        response = TestClient(app).post(
            "/auth/change-password",
            json={"newPassword": "new-secret"},
            headers={"Authorization": "Bearer t"},
        )

    assert response.status_code == 200
    _, payload = auth_mock.change_password.call_args.args
    assert payload.currentPassword == ""
    assert payload.newPassword == "new-secret"


def test_change_password_wrong_current() -> None:
    auth_mock = mock.Mock(spec=AuthService)
    auth_mock.change_password.side_effect = BusinessError("auth.invalidCurrentPassword")

    with app.container.auth_service.override(auth_mock):
        response = TestClient(app).post(
            "/auth/change-password",
            json={"currentPassword": "wrong", "newPassword": "new-secret"},
            headers={"Authorization": "Bearer t"},
        )

    assert response.status_code == 409
    assert response.json() == {"code": "auth.invalidCurrentPassword"}


def test_logout() -> None:
    response = TestClient(app).post("/auth/logout")
    assert response.status_code == 200


def test_accounts_endpoint_removed() -> None:
    response = TestClient(app).get("/auth/accounts")
    assert response.status_code == 404
