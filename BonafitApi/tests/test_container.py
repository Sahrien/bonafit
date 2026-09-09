from datetime import UTC, datetime
from unittest import mock

from fastapi.testclient import TestClient

from app.main import app
from app.schemas import BonoOut, ClientBonoOut
from app.services.auth import AuthService
from app.services.catalog import CatalogService
from app.services.clients import ClientService


def test_health() -> None:
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_create_masaje_bono() -> None:
    auth_mock = mock.Mock(spec=AuthService)
    catalog_mock = mock.Mock(spec=CatalogService)
    catalog_mock.create_bono.return_value = BonoOut(
        id="bono-masaje-1",
        serviceId="svc-masaje",
        name="sesion-suelta",
        description="sessions-1",
        sessionCount=1,
        price=45,
    )

    with app.container.auth_service.override(auth_mock), app.container.catalog_service.override(catalog_mock):
        response = TestClient(app).post(
            "/bonos",
            json={
                "serviceId": "svc-masaje",
                "name": "sesion-suelta",
                "description": "sessions-1",
                "sessionCount": 1,
                "price": 45,
            },
            headers={"Authorization": "Bearer t"},
        )

    assert response.status_code == 200
    assert response.json()["sessionCount"] == 1
    catalog_mock.create_bono.assert_called_once()


def test_contract_masaje_bono() -> None:
    auth_mock = mock.Mock(spec=AuthService)
    client_mock = mock.Mock(spec=ClientService)
    client_mock.contract_bono.return_value = ClientBonoOut(
        id="cb-m",
        clientId="client-1",
        bonoId="bono-masaje-1",
        remainingSessions=1,
        purchasedAt=datetime(2026, 9, 9, 8, 0, tzinfo=UTC),
        expiresAt=None,
    )

    with app.container.auth_service.override(auth_mock), app.container.client_service.override(client_mock):
        response = TestClient(app).post(
            "/client-bonos",
            json={"clientId": "client-1", "bonoId": "bono-masaje-1"},
            headers={"Authorization": "Bearer t"},
        )

    assert response.status_code == 200
    assert response.json()["remainingSessions"] == 1
    client_mock.contract_bono.assert_called_once()


def test_clients_unauthorized_without_token() -> None:
    response = TestClient(app).get("/clients")
    assert response.status_code == 401
    assert response.json() == {"detail": "unauthorized"}
