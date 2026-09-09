from sqlalchemy import select

from app.database import SessionFactory
from app.errors import BusinessError, NotFoundError
from app.identity import CurrentUser
from app.models import Appointment, Bono, ClientBono, Service
from app.schemas import BonoOut, BonoWrite, ServiceOut, ServiceWrite
from app.serializers import bono_out, service_out

MASAGE = "masaje"


class CatalogService:
    def __init__(self, session_factory: SessionFactory) -> None:
        self._session_factory = session_factory

    def list_services(self, user: CurrentUser) -> list[ServiceOut]:
        with self._session_factory() as db:
            query = select(Service).order_by(Service.name)
            if user.role == "client":
                query = query.where(Service.active.is_(True))
            return [service_out(row) for row in db.scalars(query).all()]

    def get_service(self, service_id: str, user: CurrentUser) -> ServiceOut:
        with self._session_factory() as db:
            row = db.get(Service, service_id)
            if row is None or (user.role == "client" and not row.active):
                raise NotFoundError("service", service_id)
            return service_out(row)

    def create_service(self, payload: ServiceWrite) -> ServiceOut:
        with self._session_factory() as db:
            bookable = False if payload.category == MASAGE else payload.bookableByClient
            allows_single = True if payload.category == MASAGE else payload.allowsSingleSession
            row = Service(
                category=payload.category,
                name=payload.name,
                allows_single_session=allows_single,
                single_session_price=payload.singleSessionPrice,
                duration_minutes=payload.durationMinutes,
                bookable_by_client=bookable,
                active=payload.active,
            )
            db.add(row)
            db.flush()
            return service_out(row)

    def update_service(self, service_id: str, payload: ServiceWrite) -> ServiceOut:
        with self._session_factory() as db:
            row = db.get(Service, service_id)
            if row is None:
                raise NotFoundError("service", service_id)
            row.category = payload.category
            row.name = payload.name
            row.allows_single_session = True if payload.category == MASAGE else payload.allowsSingleSession
            row.single_session_price = payload.singleSessionPrice
            row.duration_minutes = payload.durationMinutes
            row.bookable_by_client = False if payload.category == MASAGE else payload.bookableByClient
            row.active = payload.active
            return service_out(row)

    def delete_service(self, service_id: str) -> None:
        with self._session_factory() as db:
            row = db.get(Service, service_id)
            if row is None:
                raise NotFoundError("service", service_id)
            if db.scalar(select(Appointment.id).where(Appointment.service_id == service_id).limit(1)) or db.scalar(
                select(Bono.id).where(Bono.service_id == service_id).limit(1)
            ):
                raise BusinessError("service.hasRelations")
            db.delete(row)

    def list_bonos(self, service_id: str | None) -> list[BonoOut]:
        with self._session_factory() as db:
            query = select(Bono)
            if service_id:
                query = query.where(Bono.service_id == service_id)
            return [bono_out(row) for row in db.scalars(query).all()]

    def get_bono(self, bono_id: str) -> BonoOut:
        with self._session_factory() as db:
            row = db.get(Bono, bono_id)
            if row is None:
                raise NotFoundError("bono", bono_id)
            return bono_out(row)

    def create_bono(self, payload: BonoWrite) -> BonoOut:
        with self._session_factory() as db:
            service = db.get(Service, payload.serviceId)
            if service is None:
                raise NotFoundError("service", payload.serviceId)
            row = Bono(
                service_id=service.id,
                name=payload.name,
                description=payload.description,
                session_count=payload.sessionCount,
                price=payload.price,
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
            row.service_id = service.id
            row.name = payload.name
            row.description = payload.description
            row.session_count = payload.sessionCount
            row.price = payload.price
            return bono_out(row)

    def delete_bono(self, bono_id: str) -> None:
        with self._session_factory() as db:
            row = db.get(Bono, bono_id)
            if row is None:
                raise NotFoundError("bono", bono_id)
            if db.scalar(select(ClientBono.id).where(ClientBono.bono_id == bono_id).limit(1)):
                raise BusinessError("bono.hasRelations")
            db.delete(row)
