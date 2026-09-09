from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime

from app.models import User


@dataclass(frozen=True, slots=True)
class CurrentUser:
    id: str
    role: str
    client_id: str | None
    trainer_id: str | None
    email: str
    display_name: str
    must_change_password: bool

    @classmethod
    def from_orm(cls, user: User) -> CurrentUser:
        return cls(
            id=user.id,
            role=user.role,
            client_id=user.client_id,
            trainer_id=user.trainer_id,
            email=user.email,
            display_name=user.display_name,
            must_change_password=user.must_change_password,
        )


def actor_of(user: CurrentUser) -> str:
    return "client" if user.role == "client" else "admin"


def utcnow() -> datetime:
    return datetime.now(UTC)
