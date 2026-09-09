import pytest

from app.database import Database
from app.errors import BusinessError, NotFoundError
from app.schemas import BonoWrite, ServiceWrite
from app.services.catalog import CatalogService
from tests.factories import add_bono, add_client, add_client_bono, add_service, admin_user, client_user


def _service(**overrides: object) -> ServiceWrite:
    values: dict[str, object] = {
        "category": "entrenamiento-personal",
        "name": "EP",
        "allowsSingleSession": False,
        "durationMinutes": 60,
        "bookableByClient": True,
        "active": True,
    }
    values.update(overrides)
    return ServiceWrite(**values)


def test_create_and_list_services(catalog_service: CatalogService) -> None:
    created = catalog_service.create_service(_service())
    rows = catalog_service.list_services(admin_user())
    assert rows[0].id == created.id
    assert rows[0].name == "EP"


def test_masaje_forces_single_session_and_not_bookable(catalog_service: CatalogService) -> None:
    created = catalog_service.create_service(
        _service(category="masaje", allowsSingleSession=False, bookableByClient=True)
    )
    assert created.allowsSingleSession is True
    assert created.bookableByClient is False


def test_client_cannot_see_inactive_service(catalog_service: CatalogService, db: Database) -> None:
    add_service(db, active=False)
    assert catalog_service.list_services(client_user()) == []
    with pytest.raises(NotFoundError):
        catalog_service.get_service("svc-1", client_user())
    assert catalog_service.get_service("svc-1", admin_user()).id == "svc-1"


def test_create_list_get_bono(catalog_service: CatalogService, db: Database) -> None:
    add_service(db)
    created = catalog_service.create_bono(
        BonoWrite(serviceId="svc-1", name="pack", description="", sessionCount=5, price=120)
    )
    assert created.sessionCount == 5
    assert catalog_service.get_bono(created.id).name == "pack"
    assert len(catalog_service.list_bonos("svc-1")) == 1


def test_delete_bono_blocked_when_contracted(catalog_service: CatalogService, db: Database) -> None:
    add_client(db)
    add_service(db)
    add_bono(db)
    add_client_bono(db)
    with pytest.raises(BusinessError) as exc:
        catalog_service.delete_bono("bono-1")
    assert exc.value.code == "bono.hasRelations"


def test_delete_service_blocked_when_has_bono(catalog_service: CatalogService, db: Database) -> None:
    add_service(db)
    add_bono(db)
    with pytest.raises(BusinessError) as exc:
        catalog_service.delete_service("svc-1")
    assert exc.value.code == "service.hasRelations"


def test_delete_service(catalog_service: CatalogService, db: Database) -> None:
    add_service(db)
    catalog_service.delete_service("svc-1")
    with pytest.raises(NotFoundError):
        catalog_service.get_service("svc-1", admin_user())
