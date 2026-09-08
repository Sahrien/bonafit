from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, get_optional_user
from app.models import User
from app.schemas import AuthSessionOut, AuthUserOut, ChangePasswordRequest, LoginRequest
from app.security import create_access_token, hash_password, verify_password
from app.serializers import user_out

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/accounts", response_model=list[AuthUserOut])
def list_accounts(db: Session = Depends(get_db)) -> list[AuthUserOut]:
    users = db.scalars(select(User).order_by(User.display_name)).all()
    return [user_out(user) for user in users]


@router.post("/login", response_model=AuthSessionOut)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> AuthSessionOut:
    user = db.scalar(select(User).where(User.email == str(payload.email).lower()))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="invalid credentials")
    return AuthSessionOut(user=user_out(user), token=create_access_token(user.id))


@router.post("/logout")
def logout() -> None:
    return None


@router.get("/me", response_model=AuthSessionOut | None)
def me(user: User | None = Depends(get_optional_user)) -> AuthSessionOut | None:
    if user is None:
        return None
    return AuthSessionOut(user=user_out(user), token="")


@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    if not verify_password(payload.currentPassword, user.password_hash):
        raise HTTPException(status_code=401, detail="invalid credentials")
    user.password_hash = hash_password(payload.newPassword)
    user.must_change_password = False
    db.add(user)
    return {"ok": True}
