"""Create database tables from SQLAlchemy models."""

from app.containers import Container


def main() -> None:
    Container().db().create_database()
    print("Created database tables from models.")


if __name__ == "__main__":
    main()
