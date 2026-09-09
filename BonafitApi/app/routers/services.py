from dependency_injector.wiring import inject
from fastapi import APIRouter, Response, status

from app.schemas import BonoOut, BonoWrite, ServiceOut, ServiceWrite
from app.wiring import AuthSvc, AuthorizationHeader, CatalogSvc

router = APIRouter(tags=["services"])


@router.get("/services", response_model=list[ServiceOut])
@inject
def list_services(
    catalog_service: CatalogSvc,
    auth_service: AuthSvc,
    authorization: AuthorizationHeader = None,
) -> list[ServiceOut]:
    user = auth_service.require_not_must_change(authorization)
    return catalog_service.list_services(user)


@router.get("/services/{service_id}", response_model=ServiceOut)
@inject
def get_service(
    service_id: str,
    catalog_service: CatalogSvc,
    auth_service: AuthSvc,
    authorization: AuthorizationHeader = None,
) -> ServiceOut:
    user = auth_service.require_not_must_change(authorization)
    return catalog_service.get_service(service_id, user)


@router.post("/services", response_model=ServiceOut)
@inject
def create_service(
    payload: ServiceWrite,
    catalog_service: CatalogSvc,
    auth_service: AuthSvc,
    authorization: AuthorizationHeader = None,
) -> ServiceOut:
    auth_service.require_admin(authorization)
    return catalog_service.create_service(payload)


@router.put("/services/{service_id}", response_model=ServiceOut)
@inject
def update_service(
    service_id: str,
    payload: ServiceWrite,
    catalog_service: CatalogSvc,
    auth_service: AuthSvc,
    authorization: AuthorizationHeader = None,
) -> ServiceOut:
    auth_service.require_admin(authorization)
    return catalog_service.update_service(service_id, payload)


@router.delete("/services/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
@inject
def delete_service(
    service_id: str,
    catalog_service: CatalogSvc,
    auth_service: AuthSvc,
    authorization: AuthorizationHeader = None,
) -> Response:
    auth_service.require_admin(authorization)
    catalog_service.delete_service(service_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/bonos", response_model=list[BonoOut])
@inject
def list_bonos(
    catalog_service: CatalogSvc,
    auth_service: AuthSvc,
    serviceId: str | None = None,
    authorization: AuthorizationHeader = None,
) -> list[BonoOut]:
    auth_service.require_not_must_change(authorization)
    return catalog_service.list_bonos(serviceId)


@router.get("/bonos/{bono_id}", response_model=BonoOut)
@inject
def get_bono(
    bono_id: str,
    catalog_service: CatalogSvc,
    auth_service: AuthSvc,
    authorization: AuthorizationHeader = None,
) -> BonoOut:
    auth_service.require_not_must_change(authorization)
    return catalog_service.get_bono(bono_id)


@router.post("/bonos", response_model=BonoOut)
@inject
def create_bono(
    payload: BonoWrite,
    catalog_service: CatalogSvc,
    auth_service: AuthSvc,
    authorization: AuthorizationHeader = None,
) -> BonoOut:
    auth_service.require_admin(authorization)
    return catalog_service.create_bono(payload)


@router.put("/bonos/{bono_id}", response_model=BonoOut)
@inject
def update_bono(
    bono_id: str,
    payload: BonoWrite,
    catalog_service: CatalogSvc,
    auth_service: AuthSvc,
    authorization: AuthorizationHeader = None,
) -> BonoOut:
    auth_service.require_admin(authorization)
    return catalog_service.update_bono(bono_id, payload)


@router.delete("/bonos/{bono_id}", status_code=status.HTTP_204_NO_CONTENT)
@inject
def delete_bono(
    bono_id: str,
    catalog_service: CatalogSvc,
    auth_service: AuthSvc,
    authorization: AuthorizationHeader = None,
) -> Response:
    auth_service.require_admin(authorization)
    catalog_service.delete_bono(bono_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
