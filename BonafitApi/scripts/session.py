from collections.abc import Iterator
from contextlib import contextmanager

from sqlalchemy.orm import Session

from app.containers import Container

_container = Container()


@contextmanager
def session_scope() -> Iterator[Session]:
    with _container.db().session() as db:
        yield db
