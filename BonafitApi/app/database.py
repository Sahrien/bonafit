from collections.abc import Callable, Iterator
from contextlib import AbstractContextManager, contextmanager

from sqlalchemy import inspect, Engine, create_engine, text
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
        _ensure_appointment_notes(self._engine)
        _ensure_trainer_concurrent_capacity(self._engine)
        _ensure_user_language(self._engine)
        _ensure_catalog_i18n(self._engine)

    @property
    def engine(self) -> Engine:
        return self._engine

    def create_database(self) -> None:
        import app.models  # noqa: F401

        Base.metadata.create_all(self._engine)
        _flatten_legacy_categories(self._engine)
        _ensure_appointment_notes(self._engine)
        _ensure_trainer_concurrent_capacity(self._engine)
        _ensure_user_language(self._engine)
        _ensure_catalog_i18n(self._engine)

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


def _flatten_legacy_categories(engine: Engine) -> None:
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    if "services" not in tables:
        return
    columns = {column["name"] for column in inspector.get_columns("services")}
    foreign_keys = inspector.get_foreign_keys("services")
    dialect = engine.dialect.name
    false_sql = "FALSE" if dialect == "postgresql" else "0"

    with engine.begin() as connection:
        if "shares_session_pool" not in columns:
            connection.execute(
                text(f"ALTER TABLE services ADD COLUMN shares_session_pool BOOLEAN NOT NULL DEFAULT {false_sql}")
            )
        if "forces_single_session" not in columns:
            connection.execute(
                text(f"ALTER TABLE services ADD COLUMN forces_single_session BOOLEAN NOT NULL DEFAULT {false_sql}")
            )
        if "service_categories" in tables and "category" in columns:
            if dialect == "postgresql":
                connection.execute(
                    text(
                        """
                        UPDATE services AS service
                        SET shares_session_pool = category.shares_session_pool,
                            forces_single_session = category.forces_single_session
                        FROM service_categories AS category
                        WHERE service.category = category.id
                        """
                    )
                )
            else:
                connection.execute(
                    text(
                        """
                        UPDATE services
                        SET shares_session_pool = COALESCE((
                            SELECT shares_session_pool FROM service_categories
                            WHERE id = services.category
                        ), shares_session_pool),
                            forces_single_session = COALESCE((
                            SELECT forces_single_session FROM service_categories
                            WHERE id = services.category
                        ), forces_single_session)
                        """
                    )
                )
        if "category" in columns:
            if dialect == "postgresql":
                for foreign_key in foreign_keys:
                    name = foreign_key.get("name")
                    constrained = foreign_key.get("constrained_columns") or []
                    if name and "category" in constrained:
                        connection.execute(text(f'ALTER TABLE services DROP CONSTRAINT "{name}"'))
            connection.execute(text("ALTER TABLE services DROP COLUMN category"))
        if "service_categories" in tables:
            connection.execute(text("DROP TABLE IF EXISTS service_categories"))

    if "client_bonos" not in tables:
        return
    bono_columns = {column["name"] for column in inspector.get_columns("client_bonos")}
    if "is_gift" in bono_columns:
        return
    with engine.begin() as connection:
        connection.execute(
            text(f"ALTER TABLE client_bonos ADD COLUMN is_gift BOOLEAN NOT NULL DEFAULT {false_sql}")
        )


def _ensure_appointment_notes(engine: Engine) -> None:
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    if "appointments" not in tables:
        return
    columns = {column["name"] for column in inspector.get_columns("appointments")}
    if "notes" in columns:
        return
    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE appointments ADD COLUMN notes TEXT NOT NULL DEFAULT ''"))


def _ensure_trainer_concurrent_capacity(engine: Engine) -> None:
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    if "trainers" not in tables:
        return
    columns = {column["name"] for column in inspector.get_columns("trainers")}
    if "concurrent_capacity" in columns:
        return
    with engine.begin() as connection:
        connection.execute(
            text("ALTER TABLE trainers ADD COLUMN concurrent_capacity INTEGER NOT NULL DEFAULT 1")
        )


def _json_default(dialect: str) -> str:
    return "'{}'" if dialect == "postgresql" else "'{}'"


def _ensure_user_language(engine: Engine) -> None:
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    if "users" not in tables:
        return
    columns = {column["name"] for column in inspector.get_columns("users")}
    if "language" in columns:
        return
    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE users ADD COLUMN language VARCHAR(8) NOT NULL DEFAULT 'es'"))


def _ensure_catalog_i18n(engine: Engine) -> None:
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    dialect = engine.dialect.name
    json_type = "JSONB" if dialect == "postgresql" else "JSON"
    default = _json_default(dialect)
    specs = (
        ("services", "i18n"),
        ("bonos", "i18n"),
        ("forms", "i18n"),
        ("form_questions", "i18n"),
        ("form_question_options", "i18n"),
        ("form_assignments", "i18n"),
    )
    missing: list[tuple[str, str]] = []
    for table, column in specs:
        if table not in tables:
            continue
        existing = {item["name"] for item in inspector.get_columns(table)}
        if column not in existing:
            missing.append((table, column))
    if not missing:
        return
    with engine.begin() as connection:
        for table, column in missing:
            connection.execute(
                text(f"ALTER TABLE {table} ADD COLUMN {column} {json_type} NOT NULL DEFAULT {default}")
            )


