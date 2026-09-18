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
        settings = self._settings
        if not settings.smtp_host or not settings.smtp_from:
            return False
        copy = _TEMP_PASSWORD_MAIL[normalize_language(language)]
        message = EmailMessage()
        message["Subject"] = copy["subject"]
        message["From"] = settings.smtp_from
        message["To"] = to_email
        message.set_content(copy["body"].format(name=display_name, password=password))
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as smtp:
            if settings.smtp_starttls:
                smtp.starttls()
            if settings.smtp_user:
                smtp.login(settings.smtp_user, settings.smtp_password)
            smtp.send_message(message)
        return True
