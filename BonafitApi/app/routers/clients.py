from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.deps import require_admin, require_not_must_change
from app.emailer import generate_password, send_temporary_password
from app.errors import BusinessError, NotFoundError
from app.models import Appointment, Bono, Client, ClientBono, FormAssignment, Service, User
from app.schemas import (
    ClientBonoOut,
    ClientBonoPatch,
    ClientOut,
    ClientWrite,
    ContractBono,
    SessionBalanceOut,
)
from app.security import hash_password
from app.serializers import client_bono_out, client_out

router = APIRouter(tags=["clients"])


def _client_or_404(db: Session, client_id: str) -> Client:
    client = db.get(Client, client_id)
    if client is None:
        raise NotFoundError("client", client_id)
    return client


def _hide_notes(user: User) -> bool:
    return user.role == "client"


@router.get("/clients", response_model=list[ClientOut])
def list_clients(
    db: Session = Depends(get_db),
    user: User = Depends(require_not_must_change),
) -> list[ClientOut]:
    if user.role == "client":
        if not user.client_id:
            return []
        client = _client_or_404(db, user.client_id)
        return [client_out(client, hide_notes=True)]
    rows = db.scalars(select(Client).order_by(Client.last_name, Client.first_name)).all()
    return [client_out(row) for row in rows]


@router.get("/clients/{client_id}", response_model=ClientOut)
def get_client(
    client_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_not_must_change),
) -> ClientOut:
    if user.role == "client" and user.client_id != client_id:
        raise HTTPException(status_code=403, detail="forbidden")
    return client_out(_client_or_404(db, client_id), hide_notes=_hide_notes(user))


@router.get("/clients/{client_id}/session-balance", response_model=list[SessionBalanceOut])
def session_balance(
    client_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_not_must_change),
) -> list[SessionBalanceOut]:
    if user.role == "client" and user.client_id != client_id:
        raise HTTPException(status_code=403, detail="forbidden")
    _client_or_404(db, client_id)
    rows = db.scalars(
        select(ClientBono)
        .options(selectinload(ClientBono.bono).selectinload(Bono.service))
        .where(ClientBono.client_id == client_id)
    ).all()
    totals: dict[str, int] = {}
    now = datetime.now(UTC)
    for row in rows:
        service = row.bono.service
        if service.category not in {"entrenamiento-personal", "hipopresivos"}:
            continue
        if row.remaining_sessions <= 0:
            continue
        if row.expires_at is not None and row.expires_at <= now:
            continue
        totals[service.id] = totals.get(service.id, 0) + row.remaining_sessions
    return [
        SessionBalanceOut(serviceId=service_id, remainingSessions=total)
        for service_id, total in totals.items()
    ]


@router.post("/clients", response_model=ClientOut)
def create_client(
    payload: ClientWrite,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> ClientOut:
    email = str(payload.email).lower()
    if db.scalar(select(Client).where(Client.email == email)) or db.scalar(
        select(User).where(User.email == email)
    ):
        raise BusinessError("client.emailTaken")
    client = Client(
        first_name=payload.firstName.strip(),
        last_name=payload.lastName.strip(),
        email=email,
        phone=payload.phone.strip(),
        notes=payload.notes,
        instant_confirm=payload.instantConfirm,
    )
    db.add(client)
    db.flush()
    password = generate_password()
    display = f"{client.first_name} {client.last_name}".strip()
    db.add(
        User(
            email=email,
            password_hash=hash_password(password),
            display_name=display,
            role="client",
            client_id=client.id,
            must_change_password=True,
        )
    )
    try:
        send_temporary_password(email, display, password)
    except Exception:
        pass
    return client_out(client, temporary_password=password)


@router.put("/clients/{client_id}", response_model=ClientOut)
def update_client(
    client_id: str,
    payload: ClientWrite,
    db: Session = Depends(get_db),
    user: User = Depends(require_not_must_change),
) -> ClientOut:
    client = _client_or_404(db, client_id)
    if user.role == "client":
        if user.client_id != client_id:
            raise HTTPException(status_code=403, detail="forbidden")
        client.first_name = payload.firstName.strip()
        client.last_name = payload.lastName.strip()
        client.phone = payload.phone.strip()
        if user.client:
            user.display_name = f"{client.first_name} {client.last_name}".strip()
        return client_out(client, hide_notes=True)
    email = str(payload.email).lower()
    taken = db.scalar(select(Client).where(Client.email == email, Client.id != client_id))
    if taken:
        raise BusinessError("client.emailTaken")
    client.first_name = payload.firstName.strip()
    client.last_name = payload.lastName.strip()
    client.email = email
    client.phone = payload.phone.strip()
    client.notes = payload.notes
    client.instant_confirm = payload.instantConfirm
    account = db.scalar(select(User).where(User.client_id == client.id))
    if account:
        account.email = email
        account.display_name = f"{client.first_name} {client.last_name}".strip()
    return client_out(client)


@router.delete("/clients/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_client(
    client_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> Response:
    client = _client_or_404(db, client_id)
    if (
        db.scalar(select(Appointment.id).where(Appointment.client_id == client_id).limit(1))
        or db.scalar(select(ClientBono.id).where(ClientBono.client_id == client_id).limit(1))
        or db.scalar(select(FormAssignment.id).where(FormAssignment.client_id == client_id).limit(1))
    ):
        raise BusinessError("client.hasRelations")
    account = db.scalar(select(User).where(User.client_id == client_id))
    if account:
        db.delete(account)
    db.delete(client)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/client-bonos", response_model=list[ClientBonoOut])
def list_client_bonos(
    clientId: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_not_must_change),
) -> list[ClientBonoOut]:
    if user.role == "client" and user.client_id != clientId:
        raise HTTPException(status_code=403, detail="forbidden")
    _client_or_404(db, clientId)
    rows = db.scalars(
        select(ClientBono)
        .where(ClientBono.client_id == clientId)
        .order_by(ClientBono.purchased_at.desc())
    ).all()
    return [client_bono_out(row) for row in rows]


@router.post("/client-bonos", response_model=ClientBonoOut)
def contract_bono(
    payload: ContractBono,
    db: Session = Depends(get_db),
    user: User = Depends(require_not_must_change),
) -> ClientBonoOut:
    if user.role == "client" and user.client_id != payload.clientId:
        raise HTTPException(status_code=403, detail="forbidden")
    client = _client_or_404(db, payload.clientId)
    bono = db.get(Bono, payload.bonoId)
    if bono is None:
        raise NotFoundError("bono", payload.bonoId)
    service = db.get(Service, bono.service_id)
    if service is None or service.category == "masaje":
        raise BusinessError("bono.notAllowed")
    if not service.active:
        raise BusinessError("booking.serviceInactive")
    row = ClientBono(
        client_id=client.id,
        bono_id=bono.id,
        remaining_sessions=bono.session_count,
        purchased_at=datetime.now(UTC),
        expires_at=None,
    )
    db.add(row)
    db.flush()
    return client_bono_out(row)


@router.put("/client-bonos/{bono_id}", response_model=ClientBonoOut)
def update_client_bono(
    bono_id: str,
    payload: ClientBonoPatch,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> ClientBonoOut:
    row = db.get(ClientBono, bono_id)
    if row is None:
        raise NotFoundError("client-bono", bono_id)
    row.remaining_sessions = payload.remainingSessions
    row.expires_at = payload.expiresAt
    return client_bono_out(row)
