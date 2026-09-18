from dependency_injector.wiring import inject
from fastapi import APIRouter

from app.schemas import AuthMePatch, AuthSessionOut, ChangePasswordRequest, LoginRequest
from app.wiring import AuthSvc, AuthorizationHeader

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=AuthSessionOut)
@inject
def login(payload: LoginRequest, auth_service: AuthSvc) -> AuthSessionOut:
    return auth_service.login(payload)


@router.post("/logout")
def logout() -> None:
    return None


@router.get("/me", response_model=AuthSessionOut | None)
@inject
def me(auth_service: AuthSvc, authorization: AuthorizationHeader = None) -> AuthSessionOut | None:
    return auth_service.me(authorization)


@router.patch("/me", response_model=AuthSessionOut)
@inject
def update_me(
    payload: AuthMePatch,
    auth_service: AuthSvc,
    authorization: AuthorizationHeader = None,
) -> AuthSessionOut:
    return auth_service.update_me(authorization, payload)


@router.post("/change-password")
@inject
def change_password(
    payload: ChangePasswordRequest,
    auth_service: AuthSvc,
    authorization: AuthorizationHeader = None,
) -> dict:
    return auth_service.change_password(authorization, payload)
