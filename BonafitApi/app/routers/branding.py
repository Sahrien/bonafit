from dependency_injector.wiring import inject
from fastapi import APIRouter, File, UploadFile

from app.schemas import BrandingOut, BrandingWrite
from app.wiring import AuthSvc, AuthorizationHeader, BrandingSvc

router = APIRouter(tags=["branding"])


@router.get("/branding", response_model=BrandingOut)
@inject
def get_branding(branding_service: BrandingSvc) -> BrandingOut:
    return branding_service.get_branding()


@router.put("/branding", response_model=BrandingOut)
@inject
def update_branding(
    payload: BrandingWrite,
    branding_service: BrandingSvc,
    auth_service: AuthSvc,
    authorization: AuthorizationHeader = None,
) -> BrandingOut:
    auth_service.require_admin(authorization)
    return branding_service.update_branding(payload)


@router.post("/branding/logo", response_model=BrandingOut)
@inject
def upload_logo(
    branding_service: BrandingSvc,
    auth_service: AuthSvc,
    file: UploadFile = File(...),
    authorization: AuthorizationHeader = None,
) -> BrandingOut:
    auth_service.require_admin(authorization)
    return branding_service.save_asset("logo", file)


@router.delete("/branding/logo", response_model=BrandingOut)
@inject
def delete_logo(
    branding_service: BrandingSvc,
    auth_service: AuthSvc,
    authorization: AuthorizationHeader = None,
) -> BrandingOut:
    auth_service.require_admin(authorization)
    return branding_service.delete_asset("logo")


@router.post("/branding/favicon", response_model=BrandingOut)
@inject
def upload_favicon(
    branding_service: BrandingSvc,
    auth_service: AuthSvc,
    file: UploadFile = File(...),
    authorization: AuthorizationHeader = None,
) -> BrandingOut:
    auth_service.require_admin(authorization)
    return branding_service.save_asset("favicon", file)


@router.delete("/branding/favicon", response_model=BrandingOut)
@inject
def delete_favicon(
    branding_service: BrandingSvc,
    auth_service: AuthSvc,
    authorization: AuthorizationHeader = None,
) -> BrandingOut:
    auth_service.require_admin(authorization)
    return branding_service.delete_asset("favicon")
