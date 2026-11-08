import pytest

from app.errors import BusinessError, NotFoundError
from app.schemas import TaskPatch, TaskWrite
from app.services.tasks import TaskService
from tests.factories import admin_user


def test_create_task_records_opener(task_service: TaskService) -> None:
    created = task_service.create_task(
        TaskWrite(title="  Revisar bonos caducados  ", description="  Antes del viernes  "),
        admin_user(),
    )

    assert created.title == "Revisar bonos caducados"
    assert created.description == "Antes del viernes"
    assert created.status == "pending"
    assert created.createdById == "user-1"
    assert created.createdByName == "Alex"
    assert created.completedAt is None


def test_list_tasks_newest_first(task_service: TaskService) -> None:
    first = task_service.create_task(TaskWrite(title="Primera"), admin_user())
    second = task_service.create_task(TaskWrite(title="Segunda"), admin_user())

    rows = task_service.list_tasks()

    assert [row.id for row in rows] == [second.id, first.id]


def test_update_task_status_keeps_completion_time_in_sync(task_service: TaskService) -> None:
    created = task_service.create_task(TaskWrite(title="Llamar al cliente"), admin_user())

    done = task_service.update_task(created.id, TaskPatch(status="done"))
    assert done.status == "done"
    assert done.completedAt is not None

    reopened = task_service.update_task(created.id, TaskPatch(status="inProgress"))
    assert reopened.status == "inProgress"
    assert reopened.completedAt is None


def test_update_task_fields(task_service: TaskService) -> None:
    created = task_service.create_task(TaskWrite(title="Antiguo"), admin_user())

    updated = task_service.update_task(
        created.id,
        TaskPatch(title="  Nuevo título  ", description="  Nueva nota  "),
    )

    assert updated.title == "Nuevo título"
    assert updated.description == "Nueva nota"


def test_delete_task(task_service: TaskService) -> None:
    created = task_service.create_task(TaskWrite(title="Temporal"), admin_user())

    task_service.delete_task(created.id)

    with pytest.raises(NotFoundError):
        task_service.update_task(created.id, TaskPatch(status="done"))


def test_blank_title_is_rejected(task_service: TaskService) -> None:
    with pytest.raises(BusinessError) as exc:
        task_service.create_task(TaskWrite(title="   "), admin_user())

    assert exc.value.code == "task.titleRequired"


def test_missing_task_raises_not_found(task_service: TaskService) -> None:
    with pytest.raises(NotFoundError):
        task_service.update_task("missing", TaskPatch(status="done"))
