from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.database import SessionFactory
from app.emailer import Emailer
from app.errors import BusinessError, ForbiddenError, NotFoundError
from app.identity import CurrentUser
from app.models import Appointment, Bono, Client, ClientBono, FormAssignment, Service, User
from app.schemas import (
    ClientBonoOut,
    ClientBonoPatch,
    ClientOut,
    ClientWrite,
    ContractBono,
    SessionBalanceOut,
)
from app.security import Security
from app.serializers import client_bono_out, client_out


class ClientService:
    def __init__(
        self,
        session_factory: SessionFactory,
        security: Security,
        emailer: Emailer,
    ) -> None:
        self._session_factory = session_factory
        self._security = security
        self._emailer = emailer

    def list_clients(self, user: CurrentUser) -> list[ClientOut]:
        with self._session_factory() as db:
            if user.role == "client":
                if not user.client_id:
                    return []
                client = _client_or_404(db, user.client_id)
                return [client_out(client, hide_notes=True)]
            rows = db.scalars(select(Client).order_by(Client.last_name, Client.first_name)).all()
            return [client_out(row) for row in rows]

    def get_client(self, client_id: str, user: CurrentUser) -> ClientOut:
        with self._session_factory() as db:
            if user.role == "client" and user.client_id != client_id:
                raise ForbiddenError()
            return client_out(_client_or_404(db, client_id), hide_notes=_hide_notes(user))

    def session_balance(self, client_id: str, user: CurrentUser) -> list[SessionBalanceOut]:
        with self._session_factory() as db:
            if user.role == "client" and user.client_id != client_id:
                raise ForbiddenError()
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

    def create_client(self, payload: ClientWrite) -> ClientOut:
        with self._session_factory() as db:
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
            password = self._emailer.generate_password()
            display = f"{client.first_name} {client.last_name}".strip()
            db.add(
                User(
                    email=email,
                    password_hash=self._security.hash_password(password),
                    display_name=display,
                    role="client",
                    client_id=client.id,
                    must_change_password=True,
                )
            )
            try:
                self._emailer.send_temporary_password(email, display, password)
            except Exception:
                pass
            return client_out(client, temporary_password=password)

    def update_client(self, client_id: str, payload: ClientWrite, user: CurrentUser) -> ClientOut:
        with self._session_factory() as db:
            client = _client_or_404(db, client_id)
            if user.role == "client":
                if user.client_id != client_id:
                    raise ForbiddenError()
                client.first_name = payload.firstName.strip()
                client.last_name = payload.lastName.strip()
                client.phone = payload.phone.strip()
                account = db.get(User, user.id)
                if account:
                    account.display_name = f"{client.first_name} {client.last_name}".strip()
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

    def delete_client(self, client_id: str) -> None:
        with self._session_factory() as db:
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

    def list_client_bonos(self, client_id: str, user: CurrentUser) -> list[ClientBonoOut]:
        with self._session_factory() as db:
            if user.role == "client" and user.client_id != client_id:
                raise ForbiddenError()
            _client_or_404(db, client_id)
            rows = db.scalars(
                select(ClientBono)
                .where(ClientBono.client_id == client_id)
                .order_by(ClientBono.purchased_at.desc())
            ).all()
            return [client_bono_out(row) for row in rows]

    def contract_bono(self, payload: ContractBono, user: CurrentUser) -> ClientBonoOut:
        with self._session_factory() as db:
            if user.role == "client" and user.client_id != payload.clientId:
                raise ForbiddenError()
            client = _client_or_404(db, payload.clientId)
            bono = db.get(Bono, payload.bonoId)
            if bono is None:
                raise NotFoundError("bono", payload.bonoId)
            service = db.get(Service, bono.service_id)
            if service is None:
                raise NotFoundError("service", bono.service_id)
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

    def update_client_bono(self, bono_id: str, payload: ClientBonoPatch) -> ClientBonoOut:
        with self._session_factory() as db:
            row = db.get(ClientBono, bono_id)
            if row is None:
                raise NotFoundError("client-bono", bono_id)
            row.remaining_sessions = payload.remainingSessions
            row.expires_at = payload.expiresAt
            return client_bono_out(row)


def _client_or_404(db: Session, client_id: str) -> Client:
    client = db.get(Client, client_id)
    if client is None:
        raise NotFoundError("client", client_id)
    return client


def _hide_notes(user: CurrentUser) -> bool:
    return user.role == "client"
