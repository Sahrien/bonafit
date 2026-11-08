from unittest.mock import MagicMock, patch

from app.config import Settings
from app.emailer import Emailer


def _settings(**overrides: object) -> Settings:
    values: dict[str, object] = {
        "smtp_host": "smtp.example.com",
        "smtp_port": 465,
        "smtp_user": "user@example.com",
        "smtp_password": "secret",
        "smtp_from": "user@example.com",
        "smtp_starttls": False,
    }
    values.update(overrides)
    return Settings(**values)


def test_password_reset_uses_ssl_on_port_465() -> None:
    emailer = Emailer(_settings())
    with (
        patch("app.emailer.smtplib.SMTP_SSL") as ssl_smtp,
        patch("app.emailer.smtplib.SMTP") as plain_smtp,
    ):
        connection = MagicMock()
        ssl_smtp.return_value.__enter__.return_value = connection

        assert emailer.send_password_reset("to@example.com", "Ana", "Temp123", "es") is True

    ssl_smtp.assert_called_once_with("smtp.example.com", 465, timeout=15)
    plain_smtp.assert_not_called()
    connection.starttls.assert_not_called()
    connection.login.assert_called_once_with("user@example.com", "secret")
    message = connection.send_message.call_args.args[0]
    assert message["To"] == "to@example.com"
    assert "Contraseña temporal: Temp123" in message.get_content()


def test_temporary_password_uses_starttls_on_port_587() -> None:
    emailer = Emailer(_settings(smtp_port=587, smtp_starttls=True))
    with patch("app.emailer.smtplib.SMTP") as plain_smtp:
        connection = MagicMock()
        plain_smtp.return_value.__enter__.return_value = connection

        assert emailer.send_temporary_password("to@example.com", "Ana", "Temp123", "en") is True

    plain_smtp.assert_called_once_with("smtp.example.com", 587, timeout=15)
    connection.starttls.assert_called_once()
    assert "Temporary password: Temp123" in connection.send_message.call_args.args[0].get_content()


def test_email_is_not_sent_without_host() -> None:
    emailer = Emailer(_settings(smtp_host=""))

    assert emailer.send_password_reset("to@example.com", "Ana", "Temp123", "es") is False
