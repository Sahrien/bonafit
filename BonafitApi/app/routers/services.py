from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_admin, require_not_must_change
from app.errors import BusinessError, NotFoundError
from app.models import Appointment, Bono, ClientBono, Service, User
from app.schemas import BonoOut, BonoWrite, ServiceOut, ServiceWrite
from app.serializers import bono_out, service_out

router = APIRouter(tags=["services"])

MASAGE = "masaje"


@router.get("/services", response_model=list[ServiceOut])
def list_services(
    db: Session = Depends(get_db),
    user: User = Depends(require_not_must_change),
) -> list[ServiceOut]:
    query = select(Service).order_by(Service.name)
    if user.role == "client":
        query = query.where(Service.active.is_(True))
    return [service_out(row) for row in db.scalars(query).all()]


@router.get("/services/{service_id}", response_model=ServiceOut)
def get_service(
    service_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_not_must_change),
) -> ServiceOut:
    row = db.get(Service, service_id)
    if row is None or (user.role == "client" and not row.active):
        raise NotFoundError("service", service_id)
    return service_out(row)


@router.post("/services", response_model=ServiceOut)
def create_service(
    payload: ServiceWrite,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> ServiceOut:
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


@router.put("/services/{service_id}", response_model=ServiceOut)
def update_service(
    service_id: str,
    payload: ServiceWrite,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> ServiceOut:
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


@router.delete("/services/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_service(
    service_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> Response:
    row = db.get(Service, service_id)
    if row is None:
        raise NotFoundError("service", service_id)
    if db.scalar(select(Appointment.id).where(Appointment.service_id == service_id).limit(1)) or db.scalar(
        select(Bono.id).where(Bono.service_id == service_id).limit(1)
    ):
        raise BusinessError("service.hasRelations")
    db.delete(row)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/bonos", response_model=list[BonoOut])
def list_bonos(
    serviceId: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_not_must_change),
) -> list[BonoOut]:
    query = select(Bono)
    if serviceId:
        query = query.where(Bono.service_id == serviceId)
    return [bono_out(row) for row in db.scalars(query).all()]


@router.get("/bonos/{bono_id}", response_model=BonoOut)
def get_bono(
    bono_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_not_must_change),
) -> BonoOut:
    row = db.get(Bono, bono_id)
    if row is None:
        raise NotFoundError("bono", bono_id)
    return bono_out(row)


@router.post("/bonos", response_model=BonoOut)
def create_bono(
    payload: BonoWrite,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> BonoOut:
    service = db.get(Service, payload.serviceId)
    if service is None:
        raise NotFoundError("service", payload.serviceId)
    if service.category == MASAGE:
        raise BusinessError("bono.notAllowed")
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


@router.put("/bonos/{bono_id}", response_model=BonoOut)
def update_bono(
    bono_id: str,
    payload: BonoWrite,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> BonoOut:
    row = db.get(Bono, bono_id)
    if row is None:
        raise NotFoundError("bono", bono_id)
    service = db.get(Service, payload.serviceId)
    if service is None:
        raise NotFoundError("service", payload.serviceId)
    if service.category == MASAGE:
        raise BusinessError("bono.notAllowed")
    row.service_id = service.id
    row.name = payload.name
    row.description = payload.description
    row.session_count = payload.sessionCount
    row.price = payload.price
    return bono_out(row)


@router.delete("/bonos/{bono_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_bono(
    bono_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> Response:
    row = db.get(Bono, bono_id)
    if row is None:
        raise NotFoundError("bono", bono_id)
    if db.scalar(select(ClientBono.id).where(ClientBono.bono_id == bono_id).limit(1)):
        raise BusinessError("bono.hasRelations")
    db.delete(row)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
