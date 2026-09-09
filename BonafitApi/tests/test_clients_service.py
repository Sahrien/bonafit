import pytest

from app.database import Database
from app.errors import BusinessError, ForbiddenError, NotFoundError
from app.schemas import ClientBonoPatch, ClientWrite, ContractBono
from app.services.clients import ClientService
from tests.factories import add_bono, add_client, add_client_bono, add_service, add_user, admin_user, client_user


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


def test_session_balance_skips_masaje_and_empty(client_service: ClientService, db: Database) -> None:
    add_client(db)
    add_service(db)
    add_service(db, id="svc-masaje", category="masaje", name="Masaje", allows_single_session=True)
    add_bono(db)
    add_bono(db, id="bono-m", service_id="svc-masaje", session_count=1)
    add_client_bono(db, remaining_sessions=4)
    add_client_bono(db, id="cb-empty", remaining_sessions=0)
    add_client_bono(db, id="cb-m", bono_id="bono-m", remaining_sessions=1)
    balance = client_service.session_balance("client-1", admin_user())
    assert len(balance) == 1
    assert balance[0].serviceId == "svc-1"
    assert balance[0].remainingSessions == 4


def test_contract_and_list_bonos(client_service: ClientService, db: Database) -> None:
    add_client(db)
    add_service(db)
    add_bono(db)
    contracted = client_service.contract_bono(ContractBono(clientId="client-1", bonoId="bono-1"), admin_user())
    assert contracted.remainingSessions == 10
    rows = client_service.list_client_bonos("client-1", admin_user())
    assert len(rows) == 1


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
