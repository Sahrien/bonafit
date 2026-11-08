from datetime import UTC, datetime
from unittest import mock

from app.schemas import TaskOut
from app.services.tasks import TaskService
from tests.api import AUTH, api

TASK = TaskOut(
    id="task-1",
    title="Revisar bonos",
    description="",
    status="pending",
    createdById="user-1",
    createdByName="Alex",
    createdAt=datetime(2026, 11, 8, 9, 0, tzinfo=UTC),
    updatedAt=datetime(2026, 11, 8, 9, 0, tzinfo=UTC),
    completedAt=None,
)


def test_list_tasks() -> None:
    tasks = mock.Mock(spec=TaskService)
    tasks.list_tasks.return_value = [TASK]
    with api(tasks=tasks) as http:
        response = http.get("/tasks", headers=AUTH)

    assert response.status_code == 200
    assert response.json()[0]["createdByName"] == "Alex"


def test_create_task() -> None:
    tasks = mock.Mock(spec=TaskService)
    tasks.create_task.return_value = TASK
    with api(tasks=tasks) as http:
        response = http.post("/tasks", json={"title": "Revisar bonos"}, headers=AUTH)

    assert response.status_code == 200
    assert response.json()["status"] == "pending"
    tasks.create_task.assert_called_once()


def test_update_task_status() -> None:
    tasks = mock.Mock(spec=TaskService)
    tasks.update_task.return_value = TASK.model_copy(
        update={"status": "done", "completedAt": datetime(2026, 11, 8, 10, 0, tzinfo=UTC)}
    )
    with api(tasks=tasks) as http:
        response = http.patch("/tasks/task-1", json={"status": "done"}, headers=AUTH)

    assert response.status_code == 200
    assert response.json()["status"] == "done"
    tasks.update_task.assert_called_once()


def test_delete_task() -> None:
    tasks = mock.Mock(spec=TaskService)
    with api(tasks=tasks) as http:
        response = http.delete("/tasks/task-1", headers=AUTH)

    assert response.status_code == 204
    tasks.delete_task.assert_called_once_with("task-1")
