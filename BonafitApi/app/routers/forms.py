from dependency_injector.wiring import inject
from fastapi import APIRouter, Response, status

from app.schemas import AssignFormIn, FormAssignmentOut, FormOut, FormWrite, SubmitFormIn
from app.wiring import AuthSvc, AuthorizationHeader, FormSvc

router = APIRouter(tags=["forms"])


@router.get("/forms", response_model=list[FormOut])
@inject
def list_forms(
    form_service: FormSvc,
    auth_service: AuthSvc,
    authorization: AuthorizationHeader = None,
) -> list[FormOut]:
    auth_service.require_admin(authorization)
    return form_service.list_forms()


@router.get("/forms/{form_id}", response_model=FormOut)
@inject
def get_form(
    form_id: str,
    form_service: FormSvc,
    auth_service: AuthSvc,
    authorization: AuthorizationHeader = None,
) -> FormOut:
    auth_service.require_admin(authorization)
    return form_service.get_form(form_id)


@router.post("/forms", response_model=FormOut)
@inject
def create_form(
    payload: FormWrite,
    form_service: FormSvc,
    auth_service: AuthSvc,
    authorization: AuthorizationHeader = None,
) -> FormOut:
    auth_service.require_admin(authorization)
    return form_service.create_form(payload)


@router.put("/forms/{form_id}", response_model=FormOut)
@inject
def update_form(
    form_id: str,
    payload: FormWrite,
    form_service: FormSvc,
    auth_service: AuthSvc,
    authorization: AuthorizationHeader = None,
) -> FormOut:
    auth_service.require_admin(authorization)
    return form_service.update_form(form_id, payload)


@router.delete("/forms/{form_id}", status_code=status.HTTP_204_NO_CONTENT)
@inject
def delete_form(
    form_id: str,
    form_service: FormSvc,
    auth_service: AuthSvc,
    authorization: AuthorizationHeader = None,
) -> Response:
    auth_service.require_admin(authorization)
    form_service.delete_form(form_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/form-assignments", response_model=list[FormAssignmentOut])
@inject
def assign_form(
    payload: AssignFormIn,
    form_service: FormSvc,
    auth_service: AuthSvc,
    authorization: AuthorizationHeader = None,
) -> list[FormAssignmentOut]:
    auth_service.require_admin(authorization)
    return form_service.assign_form(payload)


@router.get("/form-assignments", response_model=list[FormAssignmentOut])
@inject
def list_assignments(
    form_service: FormSvc,
    auth_service: AuthSvc,
    formId: str | None = None,
    mine: bool = False,
    authorization: AuthorizationHeader = None,
) -> list[FormAssignmentOut]:
    user = auth_service.require_not_must_change(authorization)
    return form_service.list_assignments(user, form_id=formId, mine=mine)


@router.get("/form-assignments/{assignment_id}", response_model=FormAssignmentOut)
@inject
def get_assignment(
    assignment_id: str,
    form_service: FormSvc,
    auth_service: AuthSvc,
    authorization: AuthorizationHeader = None,
) -> FormAssignmentOut:
    user = auth_service.require_not_must_change(authorization)
    return form_service.get_assignment(assignment_id, user)


@router.post("/form-assignments/{assignment_id}/submit", response_model=FormAssignmentOut)
@inject
def submit_assignment(
    assignment_id: str,
    payload: SubmitFormIn,
    form_service: FormSvc,
    auth_service: AuthSvc,
    authorization: AuthorizationHeader = None,
) -> FormAssignmentOut:
    user = auth_service.require_not_must_change(authorization)
    return form_service.submit_assignment(assignment_id, payload, user)
