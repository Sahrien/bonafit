import pytest
from sqlalchemy.exc import StatementError

from app.database import Database
from app.models import User
from app.roles import USER_ROLE_VALUES, UserRole


def test_user_roles_are_admin_and_client() -> None:
    assert USER_ROLE_VALUES == ("admin", "client")
    assert UserRole.ADMIN == "admin"
    assert UserRole.CLIENT == "client"


def test_user_role_rejects_unknown_value() -> None:
    with pytest.raises(ValueError):
        UserRole("trainer")


def test_user_column_rejects_unknown_role() -> None:
    database = Database("sqlite://")
    database.create_database()
    with pytest.raises(StatementError):
        with database.session() as session:
            session.add(
                User(
                    id="user-bad-role",
                    email="bad-role@bonafit.com",
                    password_hash="x",
                    display_name="Bad",
                    role="trainer",  # type: ignore[arg-type]
                )
            )
