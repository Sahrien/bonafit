"""Create database tables from SQLAlchemy models."""

import app.models  # noqa: F401
from app.database import Base, engine


def main() -> None:
    Base.metadata.create_all(bind=engine)
    print("Created database tables from models.")


if __name__ == "__main__":
    main()
