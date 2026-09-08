from __future__ import annotations

from datetime import UTC, datetime

from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.errors import BOOKING_ERROR_CODES, BusinessError
from app.models import User
from app.security import decode_access_token


def get_optional_user(
    db: Session = Depends(get_db),
    authorization: str | None = Header(default=None),
) -> User | None:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    token = authorization.split(" ", 1)[1].strip()
    try:
        user_id = decode_access_token(token)
    except ValueError:
        return None
    return db.get(User, user_id)


def get_current_user(user: User | None = Depends(get_optional_user)) -> User:
    if user is None:
        raise HTTPException(status_code=401, detail="unauthorized")
    return user


def require_not_must_change(user: User = Depends(get_current_user)) -> User:
    if user.must_change_password:
        raise BusinessError(BOOKING_ERROR_CODES["mustChangePassword"], status_code=403)
    return user


def require_admin(user: User = Depends(require_not_must_change)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="forbidden")
    return user


def actor_of(user: User) -> str:
    return "client" if user.role == "client" else "admin"


def utcnow() -> datetime:
    return datetime.now(UTC)
