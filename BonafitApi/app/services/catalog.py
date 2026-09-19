from sqlalchemy import select

from app.database import SessionFactory
from app.errors import BusinessError, NotFoundError
from app.i18n import DEFAULT_LANGUAGE, merge_i18n
from app.identity import CurrentUser
from app.models import Appointment, Bono, ClientBono, Service
from app.roles import UserRole
from app.schemas import BonoOut, BonoWrite, ServiceOut, ServiceWrite
from app.serializers import bono_out, service_out


def _lang(user: CurrentUser | None = None) -> str:
    return (user.language if user else None) or DEFAULT_LANGUAGE


class CatalogService:
    def __init__(self, session_factory: SessionFactory) -> None:
        self._session_factory = session_factory

    def list_services(self, user: CurrentUser) -> list[ServiceOut]:
        with self._session_factory() as db:
            query = select(Service).order_by(Service.name)
            if user.role == UserRole.CLIENT:
                query = query.where(Service.active.is_(True))
            lang = _lang(user)
            return [service_out(row, lang) for row in db.scalars(query).all()]

    def get_service(self, service_id: str, user: CurrentUser) -> ServiceOut:
        with self._session_factory() as db:
            row = db.get(Service, service_id)
            if row is None or (user.role == UserRole.CLIENT and not row.active):
                raise NotFoundError("service", service_id)
            return service_out(row, _lang(user))

    def create_service(self, payload: ServiceWrite) -> ServiceOut:
        with self._session_factory() as db:
            resolved, i18n = merge_i18n({"name": payload.name}, payload.i18n)
            row = Service(
                name=resolved["name"],
                shares_session_pool=True,
                forces_single_session=payload.forcesSingleSession,
                single_session_price=payload.singleSessionPrice,
                duration_minutes=payload.durationMinutes,
                active=payload.active,
                sale_kind=payload.saleKind,
                sale_value=payload.saleValue,
                i18n=i18n,
            )
            _apply_service_rules(row, payload)
            db.add(row)
            db.flush()
            return service_out(row)

    def update_service(self, service_id: str, payload: ServiceWrite) -> ServiceOut:
        with self._session_factory() as db:
            row = db.get(Service, service_id)
            if row is None:
                raise NotFoundError("service", service_id)
            resolved, i18n = merge_i18n({"name": payload.name}, payload.i18n)
            row.name = resolved["name"]
            row.i18n = i18n
            row.shares_session_pool = True
            row.forces_single_session = payload.forcesSingleSession
            row.single_session_price = payload.singleSessionPrice
            row.duration_minutes = payload.durationMinutes
            row.active = payload.active
            row.sale_kind = payload.saleKind
            row.sale_value = payload.saleValue
            _apply_service_rules(row, payload)
            return service_out(row)

    def delete_service(self, service_id: str) -> None:
        with self._session_factory() as db:
            row = db.get(Service, service_id)
            if row is None:
                raise NotFoundError("service", service_id)
            if db.scalar(select(Appointment.id).where(Appointment.service_id == service_id).limit(1)):
                raise BusinessError("service.hasRelations")
            if db.scalar(select(Bono.id).where(Bono.service_id == service_id).limit(1)):
                raise BusinessError("service.hasRelations")
            db.delete(row)

    def list_bonos(self, service_id: str | None, user: CurrentUser | None = None) -> list[BonoOut]:
        with self._session_factory() as db:
            query = select(Bono)
            if service_id:
                query = query.where(Bono.service_id == service_id)
            lang = _lang(user)
            return [bono_out(row, lang) for row in db.scalars(query).all()]

    def get_bono(self, bono_id: str, user: CurrentUser | None = None) -> BonoOut:
        with self._session_factory() as db:
            row = db.get(Bono, bono_id)
            if row is None:
                raise NotFoundError("bono", bono_id)
            return bono_out(row, _lang(user))

    def create_bono(self, payload: BonoWrite) -> BonoOut:
        with self._session_factory() as db:
            service = db.get(Service, payload.serviceId)
            if service is None:
                raise NotFoundError("service", payload.serviceId)
            resolved, i18n = merge_i18n(
                {"name": payload.name, "description": payload.description},
                payload.i18n,
            )
            row = Bono(
                service_id=service.id,
                name=resolved["name"],
                description=resolved["description"],
                session_count=payload.sessionCount,
                price=payload.price,
                i18n=i18n,
            )
            db.add(row)
            db.flush()
            return bono_out(row)

    def update_bono(self, bono_id: str, payload: BonoWrite) -> BonoOut:
        with self._session_factory() as db:
            row = db.get(Bono, bono_id)
            if row is None:
                raise NotFoundError("bono", bono_id)
            service = db.get(Service, payload.serviceId)
            if service is None:
                raise NotFoundError("service", payload.serviceId)
            resolved, i18n = merge_i18n(
                {"name": payload.name, "description": payload.description},
                payload.i18n,
            )
            row.service_id = service.id
            row.name = resolved["name"]
            row.description = resolved["description"]
            row.session_count = payload.sessionCount
            row.price = payload.price
            row.i18n = i18n
            return bono_out(row)

    def delete_bono(self, bono_id: str) -> None:
        with self._session_factory() as db:
            row = db.get(Bono, bono_id)
            if row is None:
                raise NotFoundError("bono", bono_id)
            if db.scalar(select(ClientBono.id).where(ClientBono.bono_id == bono_id).limit(1)):
                raise BusinessError("bono.hasRelations")
            db.delete(row)


def _apply_service_rules(row: Service, payload: ServiceWrite) -> None:
    if payload.forcesSingleSession:
        row.allows_single_session = True
        row.bookable_by_client = False
        return
    row.allows_single_session = payload.allowsSingleSession
    row.bookable_by_client = payload.bookableByClient
