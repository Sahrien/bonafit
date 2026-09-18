from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime

from app.models import User
from app.roles import UserRole


@dataclass(frozen=True, slots=True)
class CurrentUser:
    id: str
    role: UserRole
    client_id: str | None
    trainer_id: str | None
    email: str
    display_name: str
    must_change_password: bool
    language: str = "es"

    @classmethod
    def from_orm(cls, user: User) -> CurrentUser:
        return cls(
            id=user.id,
            role=UserRole(user.role),
            client_id=user.client_id,
            trainer_id=user.trainer_id,
            email=user.email,
            display_name=user.display_name,
            must_change_password=user.must_change_password,
            language=getattr(user, "language", None) or "es",
        )


def actor_of(user: CurrentUser) -> UserRole:
    return UserRole.CLIENT if user.role == UserRole.CLIENT else UserRole.ADMIN


def utcnow() -> datetime:
    return datetime.now(UTC)
