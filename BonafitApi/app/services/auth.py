from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import SessionFactory
from app.errors import BOOKING_ERROR_CODES, BusinessError, ForbiddenError, UnauthorizedError
from app.identity import CurrentUser
from app.models import User
from app.schemas import AuthSessionOut, ChangePasswordRequest, LoginRequest
from app.security import Security
from app.serializers import user_out


class AuthService:
    def __init__(self, session_factory: SessionFactory, security: Security) -> None:
        self._session_factory = session_factory
        self._security = security

    def login(self, payload: LoginRequest) -> AuthSessionOut:
        with self._session_factory() as db:
            user = db.scalar(select(User).where(User.email == str(payload.email).lower()))
            if user is None or not self._security.verify_password(payload.password, user.password_hash):
                raise UnauthorizedError("invalid credentials")
            return AuthSessionOut(user=user_out(user), token=self._security.create_access_token(user.id))

    def me(self, authorization: str | None) -> AuthSessionOut | None:
        with self._session_factory() as db:
            user = self._load_user(db, authorization)
            if user is None:
                return None
            return AuthSessionOut(user=user_out(user), token="")

    def change_password(self, authorization: str | None, payload: ChangePasswordRequest) -> dict:
        with self._session_factory() as db:
            user = self._load_user(db, authorization)
            if user is None:
                raise UnauthorizedError()
            if not self._security.verify_password(payload.currentPassword, user.password_hash):
                raise UnauthorizedError("invalid credentials")
            user.password_hash = self._security.hash_password(payload.newPassword)
            user.must_change_password = False
            db.add(user)
            return {"ok": True}

    def optional_user(self, authorization: str | None) -> CurrentUser | None:
        if not authorization or not authorization.lower().startswith("bearer "):
            return None
        with self._session_factory() as db:
            user = self._load_user(db, authorization)
            return CurrentUser.from_orm(user) if user else None

    def require_user(self, authorization: str | None) -> CurrentUser:
        user = self.optional_user(authorization)
        if user is None:
            raise UnauthorizedError()
        return user

    def require_not_must_change(self, authorization: str | None) -> CurrentUser:
        user = self.require_user(authorization)
        if user.must_change_password:
            raise BusinessError(BOOKING_ERROR_CODES["mustChangePassword"], status_code=403)
        return user

    def require_admin(self, authorization: str | None) -> CurrentUser:
        user = self.require_not_must_change(authorization)
        if user.role != "admin":
            raise ForbiddenError()
        return user

    def _load_user(self, db: Session, authorization: str | None) -> User | None:
        if not authorization or not authorization.lower().startswith("bearer "):
            return None
        token = authorization.split(" ", 1)[1].strip()
        try:
            user_id = self._security.decode_access_token(token)
        except ValueError:
            return None
        return db.get(User, user_id)
