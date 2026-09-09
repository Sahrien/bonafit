import pytest

from app.database import Database
from app.models import User
from scripts.seed import CONFIRM_PHRASE, main, prompt_force_confirmation, seed_database


def _database() -> Database:
    database = Database("sqlite://")
    database.create_database()
    return database


def test_prompt_accepts_exact_reset() -> None:
    assert prompt_force_confirmation(lambda _: CONFIRM_PHRASE) is True


def test_prompt_rejects_other_text() -> None:
    assert prompt_force_confirmation(lambda _: "reset") is False
    assert prompt_force_confirmation(lambda _: "yes") is False


def test_prompt_rejects_eof() -> None:
    def boom(_: str) -> str:
        raise EOFError

    assert prompt_force_confirmation(boom) is False


def test_seed_then_skip() -> None:
    database = _database()
    assert seed_database(database) == "Seeded demo data."
    with database.session() as db:
        db.add(
            User(
                id="user-extra",
                email="extra@bonafit.com",
                password_hash="x",
                display_name="Extra",
                role="admin",
                must_change_password=False,
            )
        )
    assert seed_database(database) == "Database already seeded."
    with database.session() as db:
        assert db.get(User, "user-extra") is not None


def test_force_aborts_without_confirmation(capsys: pytest.CaptureFixture[str]) -> None:
    database = _database()
    seed_database(database)
    with pytest.raises(SystemExit) as exc:
        main(["--force"], database=database, read_line=lambda _: "no")
    assert exc.value.code == 1
    assert "Aborted." in capsys.readouterr().err
    with database.session() as db:
        assert db.get(User, "user-trainer-1") is not None


def test_force_clears_and_reseeds() -> None:
    database = _database()
    seed_database(database)
    with database.session() as db:
        user = db.get(User, "user-trainer-1")
        assert user is not None
        user.email = "stale@bonafit.local"
        db.add(
            User(
                id="user-extra",
                email="extra@bonafit.com",
                password_hash="x",
                display_name="Extra",
                role="admin",
                must_change_password=False,
            )
        )

    main(["--force"], database=database, read_line=lambda _: CONFIRM_PHRASE)

    with database.session() as db:
        assert db.get(User, "user-extra") is None
        lucia = db.get(User, "user-trainer-1")
        assert lucia is not None
        assert lucia.email == "lucia@bonafit.com"
