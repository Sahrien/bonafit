from datetime import UTC, datetime

from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session, selectinload

from app.database import SessionFactory
from app.emailer import Emailer
from app.errors import BusinessError, ForbiddenError, NotFoundError
from app.identity import CurrentUser
from app.models import Appointment, Bono, Client, ClientBono, ClientCoupon, FormAssignment, Service, User
from app.services.accounting import AccountingService
from app.pricing import best_coupon, coupon_applies, priced_offer
from app.roles import UserRole
from app.schemas import (
    ClientBonoOut,
    ClientBonoPatch,
    ClientCouponOut,
    ClientCouponWrite,
    ClientOut,
    ClientWrite,
    ContractBono,
    SessionBalanceOut,
)
from app.security import Security
from app.serializers import client_bono_out, client_coupon_out, client_out


class ClientService:
    def __init__(
        self,
        session_factory: SessionFactory,
        security: Security,
        emailer: Emailer,
        accounting_service: AccountingService | None = None,
    ) -> None:
        self._session_factory = session_factory
        self._security = security
        self._emailer = emailer
        self._accounting = accounting_service

    def list_clients(self, user: CurrentUser) -> list[ClientOut]:
        with self._session_factory() as db:
            if user.role == UserRole.CLIENT:
                if not user.client_id:
                    return []
                client = _client_or_404(db, user.client_id)
                return [client_out(client, hide_notes=True)]
            rows = db.scalars(select(Client).order_by(Client.last_name, Client.first_name)).all()
            return [client_out(row) for row in rows]

    def get_client(self, client_id: str, user: CurrentUser) -> ClientOut:
        with self._session_factory() as db:
            if user.role == UserRole.CLIENT and user.client_id != client_id:
                raise ForbiddenError()
            return client_out(_client_or_404(db, client_id), hide_notes=_hide_notes(user))

    def session_balance(self, client_id: str, user: CurrentUser) -> list[SessionBalanceOut]:
        with self._session_factory() as db:
            if user.role == UserRole.CLIENT and user.client_id != client_id:
                raise ForbiddenError()
            _client_or_404(db, client_id)
            rows = db.scalars(
                select(ClientBono)
                .options(
                    selectinload(ClientBono.bono)
                    .selectinload(Bono.service)
                )
                .where(ClientBono.client_id == client_id)
            ).all()
            totals: dict[str, int] = {}
            now = datetime.now(UTC)
            for row in rows:
                service = row.bono.service
                if row.is_gift:
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
                    role=UserRole.CLIENT,
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
            if user.role == UserRole.CLIENT:
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
            db.execute(delete(ClientCoupon).where(ClientCoupon.client_id == client_id))
            db.delete(client)

    def list_client_bonos(self, client_id: str, user: CurrentUser) -> list[ClientBonoOut]:
        with self._session_factory() as db:
            if user.role == UserRole.CLIENT and user.client_id != client_id:
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
            if user.role == UserRole.CLIENT and user.client_id != payload.clientId:
                raise ForbiddenError()
            client = _client_or_404(db, payload.clientId)
            bono = _resolve_contract_bono(db, payload, user)
            service = db.get(Service, bono.service_id)
            if service is None:
                raise NotFoundError("service", bono.service_id)
            if not service.active:
                raise BusinessError("booking.serviceInactive")
            remaining = bono.session_count
            is_gift = user.role == UserRole.ADMIN and payload.isGift
            if (
                user.role == UserRole.ADMIN
                and payload.bonoId is None
                and payload.serviceId
            ):
                remaining = payload.remainingSessions or 1
                is_gift = True
            list_price = float(bono.price)
            coupon = None
            paid_price = 0.0 if is_gift else list_price
            if not is_gift:
                coupon = _resolve_contract_coupon(db, payload, client.id, service.id, bono.id, list_price, service)
                priced = priced_offer(
                    list_price,
                    getattr(service, "sale_kind", None),
                    float(getattr(service, "sale_value", 0) or 0),
                    coupon,
                )
                paid_price = priced.paid_price
                if coupon is not None:
                    coupon.used_at = datetime.now(UTC)
            row = ClientBono(
                client_id=client.id,
                bono_id=bono.id,
                remaining_sessions=remaining,
                is_gift=is_gift,
                purchased_at=datetime.now(UTC),
                expires_at=None,
                list_price=list_price,
                paid_price=paid_price,
                coupon_id=None if is_gift or coupon is None else coupon.id,
            )
            db.add(row)
            db.flush()
            if self._accounting is not None:
                self._accounting.record_sale(db, row)
            return client_bono_out(row)

    def list_coupons(self, client_id: str, user: CurrentUser) -> list[ClientCouponOut]:
        with self._session_factory() as db:
            if user.role == UserRole.CLIENT and user.client_id != client_id:
                raise ForbiddenError()
            _client_or_404(db, client_id)
            rows = db.scalars(
                select(ClientCoupon)
                .where(ClientCoupon.client_id == client_id)
                .order_by(ClientCoupon.id)
            ).all()
            return [client_coupon_out(row) for row in rows]

    def create_coupon(self, client_id: str, payload: ClientCouponWrite) -> ClientCouponOut:
        with self._session_factory() as db:
            _client_or_404(db, client_id)
            if payload.serviceId and db.get(Service, payload.serviceId) is None:
                raise NotFoundError("service", payload.serviceId)
            if payload.bonoId and db.get(Bono, payload.bonoId) is None:
                raise NotFoundError("bono", payload.bonoId)
            row = ClientCoupon(
                client_id=client_id,
                kind=payload.kind,
                value=payload.value,
                service_id=payload.serviceId,
                bono_id=payload.bonoId,
            )
            db.add(row)
            db.flush()
            return client_coupon_out(row)

    def delete_coupon(self, coupon_id: str) -> None:
        with self._session_factory() as db:
            row = db.get(ClientCoupon, coupon_id)
            if row is None:
                raise NotFoundError("coupon", coupon_id)
            if row.used_at is not None:
                raise BusinessError("discount.couponUsed")
            db.delete(row)

    def update_client_bono(self, bono_id: str, payload: ClientBonoPatch) -> ClientBonoOut:
        with self._session_factory() as db:
            row = db.get(ClientBono, bono_id)
            if row is None:
                raise NotFoundError("client-bono", bono_id)
            row.remaining_sessions = payload.remainingSessions
            row.expires_at = payload.expiresAt
            return client_bono_out(row)

    def delete_client_bono(self, bono_id: str) -> None:
        with self._session_factory() as db:
            row = db.get(ClientBono, bono_id)
            if row is None:
                raise NotFoundError("client-bono", bono_id)
            upcoming = db.scalar(
                select(Appointment.id)
                .where(
                    Appointment.client_bono_id == bono_id,
                    Appointment.status.in_(("pending", "confirmed")),
                )
                .limit(1)
            )
            if upcoming:
                raise BusinessError("client-bono.hasRelations")
            db.execute(
                update(Appointment)
                .where(Appointment.client_bono_id == bono_id)
                .values(client_bono_id=None)
            )
            db.delete(row)


def _client_or_404(db: Session, client_id: str) -> Client:
    client = db.get(Client, client_id)
    if client is None:
        raise NotFoundError("client", client_id)
    return client


def _resolve_contract_bono(db: Session, payload: ContractBono, user: CurrentUser) -> Bono:
    if payload.bonoId:
        bono = db.get(Bono, payload.bonoId)
        if bono is None:
            raise NotFoundError("bono", payload.bonoId)
        return bono
    if user.role != UserRole.ADMIN or not payload.serviceId:
        raise BusinessError("booking.bonoRequired")
    service = db.get(Service, payload.serviceId)
    if service is None:
        raise NotFoundError("service", payload.serviceId)
    return catalog_bono_for_service(db, service.id)


def catalog_bono_for_service(db: Session, service_id: str) -> Bono:
    bonos = list(
        db.scalars(select(Bono).where(Bono.service_id == service_id).order_by(Bono.id)).all()
    )
    if not bonos:
        raise BusinessError("booking.bonoRequired")
    single = next((item for item in bonos if item.session_count == 1), None)
    return single or bonos[0]


def _resolve_contract_coupon(
    db: Session,
    payload: ContractBono,
    client_id: str,
    service_id: str,
    bono_id: str,
    list_price: float,
    service: Service,
) -> ClientCoupon | None:
    unused = list(
        db.scalars(
            select(ClientCoupon).where(ClientCoupon.client_id == client_id, ClientCoupon.used_at.is_(None))
        ).all()
    )
    if payload.couponId:
        coupon = db.get(ClientCoupon, payload.couponId)
        if (
            coupon is None
            or coupon.client_id != client_id
            or not coupon_applies(coupon, service_id, bono_id)
        ):
            raise BusinessError("discount.couponInvalid")
        return coupon
    return best_coupon(
        unused,
        service_id,
        bono_id,
        list_price,
        getattr(service, "sale_kind", None),
        float(getattr(service, "sale_value", 0) or 0),
    )


def _hide_notes(user: CurrentUser) -> bool:
    return user.role == UserRole.CLIENT
