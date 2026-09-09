from unittest import mock

from app.errors import NotFoundError
from app.schemas import BonoOut, ServiceOut
from app.services.catalog import CatalogService
from tests.api import AUTH, api

SERVICE = ServiceOut(
    id="svc-1",
    category="entrenamiento-personal",
    name="EP",
    allowsSingleSession=False,
    singleSessionPrice=None,
    durationMinutes=60,
    bookableByClient=True,
)


def test_list_services() -> None:
    catalog = mock.Mock(spec=CatalogService)
    catalog.list_services.return_value = [SERVICE]
    with api(catalog=catalog) as http:
        response = http.get("/services", headers=AUTH)
    assert response.status_code == 200
    assert response.json()[0]["name"] == "EP"


def test_create_service() -> None:
    catalog = mock.Mock(spec=CatalogService)
    catalog.create_service.return_value = SERVICE
    with api(catalog=catalog) as http:
        response = http.post(
            "/services",
            json={
                "category": "entrenamiento-personal",
                "name": "EP",
                "allowsSingleSession": False,
                "durationMinutes": 60,
                "bookableByClient": True,
            },
            headers=AUTH,
        )
    assert response.status_code == 200
    catalog.create_service.assert_called_once()


def test_create_bono() -> None:
    catalog = mock.Mock(spec=CatalogService)
    catalog.create_bono.return_value = BonoOut(
        id="bono-masaje-1",
        serviceId="svc-masaje",
        name="sesion-suelta",
        description="sessions-1",
        sessionCount=1,
        price=45,
    )
    with api(catalog=catalog) as http:
        response = http.post(
            "/bonos",
            json={
                "serviceId": "svc-masaje",
                "name": "sesion-suelta",
                "description": "sessions-1",
                "sessionCount": 1,
                "price": 45,
            },
            headers=AUTH,
        )
    assert response.status_code == 200
    assert response.json()["sessionCount"] == 1
    catalog.create_bono.assert_called_once()


def test_get_service_not_found() -> None:
    catalog = mock.Mock(spec=CatalogService)
    catalog.get_service.side_effect = NotFoundError("service", "missing")
    with api(catalog=catalog) as http:
        response = http.get("/services/missing", headers=AUTH)
    assert response.status_code == 404
    assert response.json() == {"resource": "service", "id": "missing", "code": "service.notFound"}


def test_delete_bono() -> None:
    catalog = mock.Mock(spec=CatalogService)
    with api(catalog=catalog) as http:
        response = http.delete("/bonos/bono-1", headers=AUTH)
    assert response.status_code == 204
    catalog.delete_bono.assert_called_once()
