from dependency_injector.wiring import inject
from fastapi import APIRouter, status

from app.schemas import TaskOut, TaskPatch, TaskWrite
from app.wiring import AuthSvc, AuthorizationHeader, TaskSvc

router = APIRouter(tags=["tasks"])


@router.get("/tasks", response_model=list[TaskOut])
@inject
def list_tasks(
    task_service: TaskSvc,
    auth_service: AuthSvc,
    authorization: AuthorizationHeader = None,
) -> list[TaskOut]:
    auth_service.require_admin(authorization)
    return task_service.list_tasks()


@router.post("/tasks", response_model=TaskOut)
@inject
def create_task(
    payload: TaskWrite,
    task_service: TaskSvc,
    auth_service: AuthSvc,
    authorization: AuthorizationHeader = None,
) -> TaskOut:
    user = auth_service.require_admin(authorization)
    return task_service.create_task(payload, user)


@router.patch("/tasks/{task_id}", response_model=TaskOut)
@inject
def update_task(
    task_id: str,
    payload: TaskPatch,
    task_service: TaskSvc,
    auth_service: AuthSvc,
    authorization: AuthorizationHeader = None,
) -> TaskOut:
    auth_service.require_admin(authorization)
    return task_service.update_task(task_id, payload)


@router.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
@inject
def delete_task(
    task_id: str,
    task_service: TaskSvc,
    auth_service: AuthSvc,
    authorization: AuthorizationHeader = None,
) -> None:
    auth_service.require_admin(authorization)
    task_service.delete_task(task_id)
