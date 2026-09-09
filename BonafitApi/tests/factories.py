from datetime import UTC, datetime

from app.database import Database
from app.identity import CurrentUser
from app.models import Bono, BookingSettings, Client, ClientBono, Service, Trainer, TrainerSchedule, User


def admin_user() -> CurrentUser:
    return CurrentUser(
        id="user-1",
        role="admin",
        client_id=None,
        trainer_id="trainer-1",
        email="lucia@bonafit.com",
        display_name="Alex",
        must_change_password=False,
    )


def client_user(client_id: str = "client-1") -> CurrentUser:
    return CurrentUser(
        id="user-c",
        role="client",
        client_id=client_id,
        trainer_id=None,
        email="marina.lopez@example.com",
        display_name="Marina",
        must_change_password=False,
    )


def add_user(db: Database, password_hash: str, **overrides: object) -> None:
    values: dict[str, object] = {
        "id": "user-c",
        "email": "marina.lopez@example.com",
        "password_hash": password_hash,
        "display_name": "Marina",
        "role": "client",
        "client_id": "client-1",
        "must_change_password": False,
    }
    values.update(overrides)
    with db.session() as session:
        session.add(User(**values))


def add_client(db: Database, **overrides: object) -> None:
    values: dict[str, object] = {
        "id": "client-1",
        "first_name": "Marina",
        "last_name": "Lopez",
        "email": "marina.lopez@example.com",
        "phone": "+34000000001",
        "notes": "knee",
        "instant_confirm": False,
    }
    values.update(overrides)
    with db.session() as session:
        session.add(Client(**values))


def add_trainer(db: Database, **overrides: object) -> None:
    values: dict[str, object] = {"id": "trainer-1", "name": "Alex"}
    values.update(overrides)
    with db.session() as session:
        session.add(Trainer(**values))


def add_service(db: Database, **overrides: object) -> None:
    values: dict[str, object] = {
        "id": "svc-1",
        "category": "entrenamiento-personal",
        "name": "EP",
        "allows_single_session": False,
        "single_session_price": None,
        "duration_minutes": 60,
        "bookable_by_client": True,
        "active": True,
    }
    values.update(overrides)
    with db.session() as session:
        session.add(Service(**values))


def add_bono(db: Database, **overrides: object) -> None:
    values: dict[str, object] = {
        "id": "bono-1",
        "service_id": "svc-1",
        "name": "10-pack",
        "description": "",
        "session_count": 10,
        "price": 300,
    }
    values.update(overrides)
    with db.session() as session:
        session.add(Bono(**values))


def add_client_bono(db: Database, **overrides: object) -> None:
    values: dict[str, object] = {
        "id": "cb-1",
        "client_id": "client-1",
        "bono_id": "bono-1",
        "remaining_sessions": 10,
        "purchased_at": datetime(2026, 9, 1, tzinfo=UTC),
        "expires_at": None,
    }
    values.update(overrides)
    with db.session() as session:
        session.add(ClientBono(**values))


def add_settings(db: Database, **overrides: object) -> None:
    values: dict[str, object] = {
        "id": "booking-settings",
        "next_day_cutoff_time": "18:00",
        "default_location": "Studio",
    }
    values.update(overrides)
    with db.session() as session:
        session.add(BookingSettings(**values))


def add_schedule(db: Database, **overrides: object) -> None:
    values: dict[str, object] = {
        "id": "sch-1",
        "trainer_id": "trainer-1",
        "weekday": 3,
        "start_time": "10:00",
        "end_time": "12:00",
    }
    values.update(overrides)
    with db.session() as session:
        session.add(TrainerSchedule(**values))
