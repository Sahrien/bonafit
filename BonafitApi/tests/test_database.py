from sqlalchemy import create_engine, inspect, text
from sqlalchemy.pool import StaticPool

from app.database import _ensure_runtime_schema


def test_ensure_sale_and_client_bono_pricing_columns() -> None:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    with engine.begin() as connection:
        connection.execute(
            text(
                """
                CREATE TABLE services (
                    id VARCHAR(36) PRIMARY KEY,
                    name VARCHAR(200) NOT NULL,
                    duration_minutes INTEGER NOT NULL,
                    active BOOLEAN NOT NULL
                )
                """
            )
        )
        connection.execute(
            text(
                """
                CREATE TABLE client_bonos (
                    id VARCHAR(36) PRIMARY KEY,
                    client_id VARCHAR(36) NOT NULL,
                    bono_id VARCHAR(36) NOT NULL,
                    remaining_sessions INTEGER NOT NULL,
                    is_gift BOOLEAN NOT NULL DEFAULT 0,
                    purchased_at DATETIME NOT NULL
                )
                """
            )
        )

    _ensure_runtime_schema(engine)

    inspector = inspect(engine)
    service_columns = {column["name"] for column in inspector.get_columns("services")}
    assert "sale_kind" in service_columns
    assert "sale_value" in service_columns
    bono_columns = {column["name"] for column in inspector.get_columns("client_bonos")}
    assert "list_price" in bono_columns
    assert "paid_price" in bono_columns
    assert "coupon_id" in bono_columns
    assert "client_coupons" in inspector.get_table_names()
