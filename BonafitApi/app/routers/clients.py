from dependency_injector.wiring import inject
from fastapi import APIRouter, Response, status

from app.schemas import (
    ClientBonoOut,
    ClientBonoPatch,
    ClientOut,
    ClientWrite,
    ContractBono,
    SessionBalanceOut,
)
from app.wiring import AuthSvc, AuthorizationHeader, ClientSvc

router = APIRouter(tags=["clients"])


@router.get("/clients", response_model=list[ClientOut])
@inject
def list_clients(
    client_service: ClientSvc,
    auth_service: AuthSvc,
    authorization: AuthorizationHeader = None,
) -> list[ClientOut]:
    user = auth_service.require_not_must_change(authorization)
    return client_service.list_clients(user)


@router.get("/clients/{client_id}", response_model=ClientOut)
@inject
def get_client(
    client_id: str,
    client_service: ClientSvc,
    auth_service: AuthSvc,
    authorization: AuthorizationHeader = None,
) -> ClientOut:
    user = auth_service.require_not_must_change(authorization)
    return client_service.get_client(client_id, user)


@router.get("/clients/{client_id}/session-balance", response_model=list[SessionBalanceOut])
@inject
def session_balance(
    client_id: str,
    client_service: ClientSvc,
    auth_service: AuthSvc,
    authorization: AuthorizationHeader = None,
) -> list[SessionBalanceOut]:
    user = auth_service.require_not_must_change(authorization)
    return client_service.session_balance(client_id, user)


@router.post("/clients", response_model=ClientOut)
@inject
def create_client(
    payload: ClientWrite,
    client_service: ClientSvc,
    auth_service: AuthSvc,
    authorization: AuthorizationHeader = None,
) -> ClientOut:
    auth_service.require_admin(authorization)
    return client_service.create_client(payload)


@router.put("/clients/{client_id}", response_model=ClientOut)
@inject
def update_client(
    client_id: str,
    payload: ClientWrite,
    client_service: ClientSvc,
    auth_service: AuthSvc,
    authorization: AuthorizationHeader = None,
) -> ClientOut:
    user = auth_service.require_not_must_change(authorization)
    return client_service.update_client(client_id, payload, user)


@router.delete("/clients/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
@inject
def delete_client(
    client_id: str,
    client_service: ClientSvc,
    auth_service: AuthSvc,
    authorization: AuthorizationHeader = None,
) -> Response:
    auth_service.require_admin(authorization)
    client_service.delete_client(client_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/client-bonos", response_model=list[ClientBonoOut])
@inject
def list_client_bonos(
    clientId: str,
    client_service: ClientSvc,
    auth_service: AuthSvc,
    authorization: AuthorizationHeader = None,
) -> list[ClientBonoOut]:
    user = auth_service.require_not_must_change(authorization)
    return client_service.list_client_bonos(clientId, user)


@router.post("/client-bonos", response_model=ClientBonoOut)
@inject
def contract_bono(
    payload: ContractBono,
    client_service: ClientSvc,
    auth_service: AuthSvc,
    authorization: AuthorizationHeader = None,
) -> ClientBonoOut:
    user = auth_service.require_not_must_change(authorization)
    return client_service.contract_bono(payload, user)


@router.put("/client-bonos/{bono_id}", response_model=ClientBonoOut)
@inject
def update_client_bono(
    bono_id: str,
    payload: ClientBonoPatch,
    client_service: ClientSvc,
    auth_service: AuthSvc,
    authorization: AuthorizationHeader = None,
) -> ClientBonoOut:
    auth_service.require_admin(authorization)
    return client_service.update_client_bono(bono_id, payload)
