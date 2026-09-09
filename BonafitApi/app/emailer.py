import secrets
import smtplib
from email.message import EmailMessage

from app.config import Settings


def generate_password(length: int = 12) -> str:
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"
    return "".join(secrets.choice(alphabet) for _ in range(length))


class Emailer:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    def generate_password(self, length: int = 12) -> str:
        return generate_password(length)

    def send_temporary_password(self, to_email: str, display_name: str, password: str) -> bool:
        settings = self._settings
        if not settings.smtp_host or not settings.smtp_from:
            return False
        message = EmailMessage()
        message["Subject"] = "Acceso a Bonafit"
        message["From"] = settings.smtp_from
        message["To"] = to_email
        message.set_content(
            f"Hola {display_name},\n\n"
            f"Tu acceso a Bonafit ya está creado.\n"
            f"Contraseña temporal: {password}\n\n"
            "Cámbiala en el primer acceso.\n"
        )
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as smtp:
            if settings.smtp_starttls:
                smtp.starttls()
            if settings.smtp_user:
                smtp.login(settings.smtp_user, settings.smtp_password)
            smtp.send_message(message)
        return True
