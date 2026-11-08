import secrets
import smtplib
from email.message import EmailMessage

from app.config import Settings
from app.i18n import DEFAULT_LANGUAGE, normalize_language


def generate_password(length: int = 12) -> str:
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"
    return "".join(secrets.choice(alphabet) for _ in range(length))


_TEMP_PASSWORD_MAIL = {
    "es": {
        "subject": "Acceso a Bonafit",
        "body": (
            "Hola {name},\n\n"
            "Tu acceso a Bonafit ya está creado.\n"
            "Contraseña temporal: {password}\n\n"
            "Cámbiala en el primer acceso.\n"
        ),
    },
    "en": {
        "subject": "Bonafit access",
        "body": (
            "Hello {name},\n\n"
            "Your Bonafit account is ready.\n"
            "Temporary password: {password}\n\n"
            "Change it the first time you sign in.\n"
        ),
    },
}

_PASSWORD_RESET_MAIL = {
    "es": {
        "subject": "Recupera tu contraseña de Bonafit",
        "body": (
            "Hola {name},\n\n"
            "Hemos recibido una solicitud para recuperar tu contraseña de Bonafit.\n"
            "Contraseña temporal: {password}\n\n"
            "Cámbiala al entrar. Si no has solicitado este cambio, contacta con el estudio.\n"
        ),
    },
    "en": {
        "subject": "Reset your Bonafit password",
        "body": (
            "Hello {name},\n\n"
            "We received a request to reset your Bonafit password.\n"
            "Temporary password: {password}\n\n"
            "Change it when you sign in. If you did not request this, contact the studio.\n"
        ),
    },
}


class Emailer:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    def generate_password(self, length: int = 12) -> str:
        return generate_password(length)

    def send_temporary_password(
        self,
        to_email: str,
        display_name: str,
        password: str,
        language: str = DEFAULT_LANGUAGE,
    ) -> bool:
        copy = _TEMP_PASSWORD_MAIL[normalize_language(language)]
        return self._send(
            to_email,
            copy["subject"],
            copy["body"].format(name=display_name, password=password),
        )

    def send_password_reset(
        self,
        to_email: str,
        display_name: str,
        password: str,
        language: str = DEFAULT_LANGUAGE,
    ) -> bool:
        copy = _PASSWORD_RESET_MAIL[normalize_language(language)]
        return self._send(
            to_email,
            copy["subject"],
            copy["body"].format(name=display_name, password=password),
        )

    def _send(self, to_email: str, subject: str, body: str) -> bool:
        settings = self._settings
        if not settings.smtp_host or not settings.smtp_from:
            return False
        message = EmailMessage()
        message["Subject"] = subject
        message["From"] = settings.smtp_from
        message["To"] = to_email
        message.set_content(body)
        use_ssl = settings.smtp_port == 465
        smtp_class = smtplib.SMTP_SSL if use_ssl else smtplib.SMTP
        with smtp_class(settings.smtp_host, settings.smtp_port, timeout=15) as smtp:
            if not use_ssl and settings.smtp_starttls:
                smtp.starttls()
            if settings.smtp_user:
                smtp.login(settings.smtp_user, settings.smtp_password)
            smtp.send_message(message)
        return True
