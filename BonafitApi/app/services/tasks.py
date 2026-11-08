from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import SessionFactory
from app.errors import BusinessError, NotFoundError
from app.identity import CurrentUser
from app.models import Task
from app.schemas import TaskOut, TaskPatch, TaskWrite
from app.serializers import task_out


class TaskService:
    def __init__(self, session_factory: SessionFactory) -> None:
        self._session_factory = session_factory

    def list_tasks(self) -> list[TaskOut]:
        with self._session_factory() as db:
            rows = db.scalars(select(Task).order_by(Task.created_at.desc())).all()
            return [task_out(row) for row in rows]

    def create_task(self, payload: TaskWrite, user: CurrentUser) -> TaskOut:
        with self._session_factory() as db:
            title = payload.title.strip()
            if not title:
                raise BusinessError("task.titleRequired")
            now = datetime.now(UTC)
            row = Task(
                title=title,
                description=payload.description.strip(),
                status=payload.status,
                created_by_id=user.id,
                created_by_name=user.display_name or user.email,
                created_at=now,
                updated_at=now,
                completed_at=now if payload.status == "done" else None,
            )
            db.add(row)
            db.flush()
            return task_out(row)

    def update_task(self, task_id: str, payload: TaskPatch) -> TaskOut:
        with self._session_factory() as db:
            row = _task_or_404(db, task_id)
            if payload.title is not None:
                title = payload.title.strip()
                if not title:
                    raise BusinessError("task.titleRequired")
                row.title = title
            if payload.description is not None:
                row.description = payload.description.strip()
            if payload.status is not None and payload.status != row.status:
                row.status = payload.status
                row.completed_at = datetime.now(UTC) if payload.status == "done" else None
            row.updated_at = datetime.now(UTC)
            db.flush()
            return task_out(row)

    def delete_task(self, task_id: str) -> None:
        with self._session_factory() as db:
            db.delete(_task_or_404(db, task_id))


def _task_or_404(db: Session, task_id: str) -> Task:
    row = db.get(Task, task_id)
    if row is None:
        raise NotFoundError("task", task_id)
    return row
