from collections.abc import Iterator
from contextlib import contextmanager

from sqlalchemy.orm import Session

from app.database import SessionLocal


@contextmanager
def session_scope() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
