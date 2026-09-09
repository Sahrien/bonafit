from datetime import UTC, datetime
from unittest import mock

from fastapi.testclient import TestClient

from app.main import app
from app.schemas import ClientBonoOut, ClientOut
from app.services.clients import ClientService
from tests.api import AUTH, api

CLIENT = ClientOut(
    id="client-1",
    firstName="Marina",
    lastName="Lopez",
    email="marina.lopez@example.com",
    phone="+34000000001",
    notes="knee",
)


def test_list_clients() -> None:
    clients = mock.Mock(spec=ClientService)
    clients.list_clients.return_value = [CLIENT]
    with api(clients=clients) as http:
        response = http.get("/clients", headers=AUTH)
    assert response.status_code == 200
    assert response.json()[0]["firstName"] == "Marina"
    clients.list_clients.assert_called_once()


def test_create_client() -> None:
    clients = mock.Mock(spec=ClientService)
    clients.create_client.return_value = CLIENT
    with api(clients=clients) as http:
        response = http.post(
            "/clients",
            json={
                "firstName": "Marina",
                "lastName": "Lopez",
                "email": "marina.lopez@example.com",
                "phone": "+34000000001",
            },
            headers=AUTH,
        )
    assert response.status_code == 200
    clients.create_client.assert_called_once()


def test_contract_bono() -> None:
    clients = mock.Mock(spec=ClientService)
    clients.contract_bono.return_value = ClientBonoOut(
        id="cb-m",
        clientId="client-1",
        bonoId="bono-masaje-1",
        remainingSessions=1,
        purchasedAt=datetime(2026, 9, 9, 8, 0, tzinfo=UTC),
        expiresAt=None,
    )
    with api(clients=clients) as http:
        response = http.post(
            "/client-bonos",
            json={"clientId": "client-1", "bonoId": "bono-masaje-1"},
            headers=AUTH,
        )
    assert response.status_code == 200
    assert response.json()["remainingSessions"] == 1
    clients.contract_bono.assert_called_once()


def test_delete_client() -> None:
    clients = mock.Mock(spec=ClientService)
    with api(clients=clients) as http:
        response = http.delete("/clients/client-1", headers=AUTH)
    assert response.status_code == 204
    clients.delete_client.assert_called_once()


def test_clients_unauthorized_without_token() -> None:
    response = TestClient(app).get("/clients")
    assert response.status_code == 401
    assert response.json() == {"detail": "unauthorized"}
