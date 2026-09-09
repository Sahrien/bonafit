"""Create a login user from an email and a generated password."""

from __future__ import annotations

import argparse
import sys

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.containers import Container
from app.emailer import generate_password
from app.models import Client, Trainer, User
from app.security import hash_password


def default_display_name(email: str) -> str:
    local = email.split("@", 1)[0]
    return local.replace(".", " ").replace("_", " ").replace("-", " ").title()


def split_name(display_name: str) -> tuple[str, str]:
    parts = display_name.split(None, 1)
    first = parts[0]
    last = parts[1] if len(parts) > 1 else "-"
    return first, last


def create_user(
    db: Session,
    *,
    email: str,
    role: str,
    display_name: str,
) -> tuple[User, str]:
    if db.scalar(select(User.id).where(User.email == email)) is not None:
        raise ValueError(f"User already exists: {email}")
    if db.scalar(select(Client.id).where(Client.email == email)) is not None:
        raise ValueError(f"Client already exists: {email}")

    password = generate_password()
    trainer_id: str | None = None
    client_id: str | None = None

    if role == "admin":
        trainer = Trainer(name=display_name)
        db.add(trainer)
        db.flush()
        trainer_id = trainer.id
    else:
        first_name, last_name = split_name(display_name)
        client = Client(
            first_name=first_name,
            last_name=last_name,
            email=email,
            phone="",
        )
        db.add(client)
        db.flush()
        client_id = client.id

    user = User(
        email=email,
        password_hash=hash_password(password),
        display_name=display_name,
        role=role,
        trainer_id=trainer_id,
        client_id=client_id,
        must_change_password=True,
    )
    db.add(user)
    db.flush()
    return user, password


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(
        description="Create a user from an email and print a generated password.",
    )
    parser.add_argument("email", help="Login email")
    parser.add_argument(
        "--role",
        choices=("admin", "client"),
        default="admin",
        help="Account role (default: admin)",
    )
    parser.add_argument("--name", help="Display name (default: derived from the email)")
    args = parser.parse_args(argv)

    email = args.email.strip().lower()
    if "@" not in email:
        print("Email must contain @", file=sys.stderr)
        raise SystemExit(1)

    display_name = (args.name or default_display_name(email)).strip()
    if not display_name:
        print("Display name cannot be empty", file=sys.stderr)
        raise SystemExit(1)

    container = Container()
    try:
        with container.db().session() as db:
            user, password = create_user(
                db,
                email=email,
                role=args.role,
                display_name=display_name,
            )
            role = user.role
            try:
                container.emailer().send_temporary_password(email, display_name, password)
            except Exception:
                pass
    except ValueError as exc:
        print(str(exc), file=sys.stderr)
        raise SystemExit(1) from exc

    print(f"Created {role} user {email}")
    print(f"Temporary password: {password}")


if __name__ == "__main__":
    main()
