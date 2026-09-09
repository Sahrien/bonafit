from collections.abc import Callable, Iterator
from contextlib import AbstractContextManager, contextmanager

from sqlalchemy import Engine, create_engine, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.pool import StaticPool

SessionFactory = Callable[..., AbstractContextManager[Session]]


class Base(DeclarativeBase):
    pass


class Database:
    def __init__(self, db_url: str) -> None:
        if db_url.startswith("sqlite"):
            self._engine = create_engine(
                db_url,
                connect_args={"check_same_thread": False},
                poolclass=StaticPool,
            )
        else:
            self._engine = create_engine(db_url, pool_pre_ping=True)
        self._session_factory = sessionmaker(bind=self._engine, autoflush=False, autocommit=False)

    @property
    def engine(self) -> Engine:
        return self._engine

    def create_database(self) -> None:
        import app.models  # noqa: F401

        Base.metadata.create_all(self._engine)

    def clear_tables(self) -> None:
        import app.models  # noqa: F401

        with self._engine.begin() as connection:
            if self._engine.dialect.name == "postgresql":
                tables = ", ".join(table.name for table in Base.metadata.sorted_tables)
                connection.execute(text(f"TRUNCATE {tables} RESTART IDENTITY CASCADE"))
                return
            for table in reversed(Base.metadata.sorted_tables):
                connection.execute(table.delete())

    @contextmanager
    def session(self) -> Iterator[Session]:
        session = self._session_factory()
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()
