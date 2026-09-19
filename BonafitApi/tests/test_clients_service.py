import pytest

from app.database import Database
from app.errors import BusinessError, ForbiddenError, NotFoundError
from app.models import Appointment
from app.schemas import ClientBonoPatch, ClientCouponWrite, ClientWrite, ContractBono
from app.services.clients import ClientService
from tests.factories import (
    add_appointment,
    add_bono,
    add_client,
    add_client_bono,
    add_service,
    add_trainer,
    add_user,
    admin_user,
    client_user,
)


def _write(**overrides: object) -> ClientWrite:
    values: dict[str, object] = {
        "firstName": "Ana",
        "lastName": "Ruiz",
        "email": "ana@example.com",
        "phone": "600000000",
        "notes": "new",
        "instantConfirm": True,
    }
    values.update(overrides)
    return ClientWrite(**values)


def test_list_hides_notes_from_client(client_service: ClientService, db: Database) -> None:
    add_client(db)
    admin_rows = client_service.list_clients(admin_user())
    assert admin_rows[0].notes == "knee"
    client_rows = client_service.list_clients(client_user())
    assert client_rows[0].notes == ""


def test_get_client_forbidden_for_other_client(client_service: ClientService, db: Database) -> None:
    add_client(db, id="client-2", email="pablo@example.com")
    with pytest.raises(ForbiddenError):
        client_service.get_client("client-2", client_user())


def test_create_client(client_service: ClientService) -> None:
    created = client_service.create_client(_write())
    assert created.email == "ana@example.com"
    assert created.temporaryPassword == "temp-pass-12"


def test_create_client_allows_empty_phone(client_service: ClientService) -> None:
    created = client_service.create_client(_write(phone=""))
    assert created.phone == ""


def test_create_client_rejects_taken_email(client_service: ClientService, db: Database) -> None:
    add_client(db, email="ana@example.com")
    with pytest.raises(BusinessError) as exc:
        client_service.create_client(_write())
    assert exc.value.code == "client.emailTaken"


def test_client_update_keeps_email_and_notes(
    client_service: ClientService, db: Database, password_hash: str
) -> None:
    add_client(db)
    add_user(db, password_hash)
    updated = client_service.update_client(
        "client-1",
        _write(firstName="Marina", lastName="Lopez", email="hacked@example.com", notes="nope"),
        client_user(),
    )
    assert updated.notes == ""
    stored = client_service.get_client("client-1", admin_user())
    assert stored.email == "marina.lopez@example.com"
    assert stored.notes == "knee"
    assert stored.firstName == "Marina"


def test_session_balance_sums_all_services(client_service: ClientService, db: Database) -> None:
    add_client(db)
    add_service(db)
    add_service(db, id="svc-masaje", name="Masaje", shares_session_pool=False, allows_single_session=True)
    add_bono(db)
    add_bono(db, id="bono-m", service_id="svc-masaje", session_count=1)
    add_client_bono(db, remaining_sessions=4)
    add_client_bono(db, id="cb-empty", remaining_sessions=0)
    add_client_bono(db, id="cb-m", bono_id="bono-m", remaining_sessions=1)
    balance = {row.serviceId: row.remainingSessions for row in client_service.session_balance("client-1", admin_user())}
    assert balance == {"svc-1": 4, "svc-masaje": 1}


def test_contract_and_list_bonos(client_service: ClientService, db: Database) -> None:
    add_client(db)
    add_service(db)
    add_bono(db)
    contracted = client_service.contract_bono(ContractBono(clientId="client-1", bonoId="bono-1"), admin_user())
    assert contracted.remainingSessions == 10
    assert contracted.isGift is False
    rows = client_service.list_client_bonos("client-1", admin_user())
    assert len(rows) == 1


def test_admin_gifts_catalog_pack(client_service: ClientService, db: Database) -> None:
    add_client(db)
    add_service(db)
    add_bono(db)
    gifted = client_service.contract_bono(
        ContractBono(clientId="client-1", bonoId="bono-1", isGift=True),
        admin_user(),
    )
    assert gifted.isGift is True
    assert gifted.remainingSessions == 10


def test_admin_gifts_single_session_for_service(client_service: ClientService, db: Database) -> None:
    add_client(db)
    add_service(db)
    add_bono(db, session_count=10)
    gifted = client_service.contract_bono(
        ContractBono(clientId="client-1", serviceId="svc-1", remainingSessions=1),
        admin_user(),
    )
    assert gifted.remainingSessions == 1
    assert gifted.bonoId == "bono-1"
    assert gifted.isGift is True


def test_admin_gift_prefers_single_session_catalog_bono(
    client_service: ClientService, db: Database
) -> None:
    add_client(db)
    add_service(db)
    add_bono(db, id="bono-10", session_count=10)
    add_bono(db, id="bono-1", name="suelta", session_count=1)
    gifted = client_service.contract_bono(
        ContractBono(clientId="client-1", serviceId="svc-1", remainingSessions=1),
        admin_user(),
    )
    assert gifted.bonoId == "bono-1"
    assert gifted.remainingSessions == 1
    assert gifted.isGift is True


def test_client_cannot_gift_single_session(client_service: ClientService, db: Database) -> None:
    add_client(db)
    add_service(db)
    add_bono(db)
    with pytest.raises(BusinessError) as exc:
        client_service.contract_bono(
            ContractBono(clientId="client-1", serviceId="svc-1", remainingSessions=1),
            client_user(),
        )
    assert exc.value.code == "booking.bonoRequired"


def test_gift_single_session_requires_catalog_bono(client_service: ClientService, db: Database) -> None:
    add_client(db)
    add_service(db)
    with pytest.raises(BusinessError) as exc:
        client_service.contract_bono(
            ContractBono(clientId="client-1", serviceId="svc-1", remainingSessions=1),
            admin_user(),
        )
    assert exc.value.code == "booking.bonoRequired"


def test_contract_inactive_service(client_service: ClientService, db: Database) -> None:
    add_client(db)
    add_service(db, active=False)
    add_bono(db)
    with pytest.raises(BusinessError) as exc:
        client_service.contract_bono(ContractBono(clientId="client-1", bonoId="bono-1"), admin_user())
    assert exc.value.code == "booking.serviceInactive"


def test_update_client_bono(client_service: ClientService, db: Database) -> None:
    add_client(db)
    add_service(db)
    add_bono(db)
    add_client_bono(db)
    updated = client_service.update_client_bono("cb-1", ClientBonoPatch(remainingSessions=2, expiresAt=None))
    assert updated.remainingSessions == 2


def test_delete_client_bono(client_service: ClientService, db: Database) -> None:
    add_client(db)
    add_service(db)
    add_bono(db)
    add_client_bono(db)
    client_service.delete_client_bono("cb-1")
    assert client_service.list_client_bonos("client-1", admin_user()) == []


def test_delete_client_bono_blocked_by_upcoming(client_service: ClientService, db: Database) -> None:
    add_trainer(db)
    add_client(db)
    add_service(db)
    add_bono(db)
    add_client_bono(db)
    add_appointment(db, client_bono_id="cb-1", status="confirmed")
    with pytest.raises(BusinessError) as exc:
        client_service.delete_client_bono("cb-1")
    assert exc.value.code == "client-bono.hasRelations"
    assert client_service.list_client_bonos("client-1", admin_user())[0].id == "cb-1"


def test_delete_client_bono_unlinks_completed(client_service: ClientService, db: Database) -> None:
    add_trainer(db)
    add_client(db)
    add_service(db)
    add_bono(db)
    add_client_bono(db)
    add_appointment(db, client_bono_id="cb-1", status="completed")
    client_service.delete_client_bono("cb-1")
    assert client_service.list_client_bonos("client-1", admin_user()) == []
    with db.session() as session:
        appointment = session.get(Appointment, "apt-1")
        assert appointment is not None
        assert appointment.client_bono_id is None


def test_delete_client_blocked_by_bono(client_service: ClientService, db: Database) -> None:
    add_client(db)
    add_service(db)
    add_bono(db)
    add_client_bono(db)
    with pytest.raises(BusinessError) as exc:
        client_service.delete_client("client-1")
    assert exc.value.code == "client.hasRelations"


def test_delete_client(client_service: ClientService, db: Database, password_hash: str) -> None:
    add_client(db)
    add_user(db, password_hash)
    client_service.delete_client("client-1")
    with pytest.raises(NotFoundError):
        client_service.get_client("client-1", admin_user())


def test_contract_applies_sale_and_coupon(client_service: ClientService, db: Database) -> None:
    add_client(db)
    add_service(db, sale_kind="percent", sale_value=20)
    add_bono(db, price=200)
    coupon = client_service.create_coupon(
        "client-1",
        ClientCouponWrite(kind="percent", value=10),
    )
    contracted = client_service.contract_bono(
        ContractBono(clientId="client-1", bonoId="bono-1"),
        client_user(),
    )
    assert contracted.listPrice == 200
    assert contracted.paidPrice == 144
    assert contracted.couponId == coupon.id
    stored = client_service.list_coupons("client-1", client_user())
    assert stored[0].usedAt is not None


def test_gift_does_not_consume_coupon(client_service: ClientService, db: Database) -> None:
    add_client(db)
    add_service(db, sale_kind="percent", sale_value=50)
    add_bono(db, price=200)
    coupon = client_service.create_coupon(
        "client-1",
        ClientCouponWrite(kind="amount", value=20),
    )
    gifted = client_service.contract_bono(
        ContractBono(clientId="client-1", bonoId="bono-1", isGift=True),
        admin_user(),
    )
    assert gifted.isGift is True
    assert gifted.paidPrice == 0
    assert gifted.couponId is None
    unused = client_service.list_coupons("client-1", admin_user())
    assert unused[0].id == coupon.id
    assert unused[0].usedAt is None


def test_invalid_coupon_on_contract(client_service: ClientService, db: Database) -> None:
    add_client(db)
    add_service(db)
    add_bono(db)
    add_bono(db, id="bono-2", name="other", price=80)
    scoped = client_service.create_coupon(
        "client-1",
        ClientCouponWrite(kind="percent", value=10, bonoId="bono-1"),
    )
    with pytest.raises(BusinessError) as exc:
        client_service.contract_bono(
            ContractBono(clientId="client-1", bonoId="bono-2", couponId=scoped.id),
            client_user(),
        )
    assert exc.value.code == "discount.couponInvalid"

