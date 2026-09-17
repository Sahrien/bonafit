from app.database import Database
from app.models import Client, Trainer
from app.roles import UserRole
from scripts.create_user import create_user


def _database() -> Database:
    database = Database("sqlite://")
    database.create_database()
    return database


def test_create_admin_user() -> None:
    database = _database()
    with database.session() as db:
        user, password = create_user(
            db,
            email="trainer@bonafit.com",
            role=UserRole.ADMIN,
            display_name="Alex Martin",
        )
        assert user.role is UserRole.ADMIN
        assert user.trainer_id is not None
        assert user.client_id is None
        assert db.get(Trainer, user.trainer_id) is not None
        assert len(password) >= 8


def test_create_client_user() -> None:
    database = _database()
    with database.session() as db:
        user, _password = create_user(
            db,
            email="marina@example.com",
            role=UserRole.CLIENT,
            display_name="Marina Lopez",
        )
        assert user.role is UserRole.CLIENT
        assert user.client_id is not None
        client = db.get(Client, user.client_id)
        assert client is not None
        assert client.first_name == "Marina"
        assert client.last_name == "Lopez"
