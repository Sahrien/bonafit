import logging

import pytest
from fastapi.testclient import TestClient

from app.errors import public_validation_errors
from app.main import app


def test_public_validation_errors_redact_passwords() -> None:
    errors = [
        {
            "type": "string_too_short",
            "loc": ("body", "newPassword"),
            "msg": "String should have at least 8 characters",
            "input": "short",
        },
        {
            "type": "value_error",
            "loc": ("body", "email"),
            "msg": "value is not a valid email address",
            "input": "not-an-email",
        },
        {
            "type": "missing",
            "loc": ("body",),
            "msg": "Field required",
            "input": {"email": "lucia@bonafit.com", "password": "ChangeMe123!"},
        },
    ]

    sanitized = public_validation_errors(errors)
    assert sanitized[0]["input"] == "[redacted]"
    assert sanitized[1]["input"] == "not-an-email"
    assert sanitized[2]["input"] == {"email": "lucia@bonafit.com", "password": "[redacted]"}


def test_invalid_login_body_is_logged(caplog: pytest.LogCaptureFixture) -> None:
    with caplog.at_level(logging.WARNING, logger="bonafit"):
        response = TestClient(app).post(
            "/auth/login",
            json={"email": "not-an-email", "password": "ChangeMe123!"},
        )

    assert response.status_code == 422
    assert "POST /auth/login" in caplog.text
    assert "not-an-email" in caplog.text
    assert "ChangeMe123!" not in caplog.text
    assert response.json()["detail"]
