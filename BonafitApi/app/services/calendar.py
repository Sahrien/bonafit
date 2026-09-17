import re
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.booking import (
    add_minutes,
    can_admin_cancel_appointment,
    can_cancel_appointment,
    is_active_client_appointment,
    is_bono_usable,
    is_gift_credit,
    list_availability_slots,
    occupies_trainer_slot,
    parse_iso,
    pick_preferred_bono,
    ranges_overlap,
    session_delta,
    slot_matches,
    status_on_client_reschedule,
    status_on_create,
    to_madrid,
)
from app.database import SessionFactory
from app.errors import BOOKING_ERROR_CODES, BusinessError, NotFoundError
from app.identity import CurrentUser, actor_of, utcnow
from app.models import (
    Appointment,
    BookingSettings,
    Client,
    ClientBono,
    Service,
    Trainer,
    TrainerSchedule,
)
from app.services.clients import catalog_bono_for_service
from app.roles import UserRole
from app.schemas import (
    AppointmentOut,
    AppointmentWrite,
    AvailabilitySlotOut,
    BookingSettingsOut,
    BookingSettingsWrite,
    TrainerOut,
    TrainerScheduleOut,
    TrainerScheduleWrite,
)
from app.serializers import appointment_out, ensure_aware, schedule_out, settings_out, trainer_out

HHMM = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")
E = BOOKING_ERROR_CODES
SETTINGS_ID = "booking-settings"


class CalendarService:
    def __init__(self, session_factory: SessionFactory) -> None:
        self._session_factory = session_factory

    def list_trainers(self) -> list[TrainerOut]:
        with self._session_factory() as db:
            rows = db.scalars(select(Trainer).order_by(Trainer.name)).all()
            return [trainer_out(row) for row in rows]

    def get_trainer(self, trainer_id: str) -> TrainerOut:
        with self._session_factory() as db:
            row = db.get(Trainer, trainer_id)
            if row is None:
                raise NotFoundError("trainer", trainer_id)
            return trainer_out(row)

    def get_booking_settings(self) -> BookingSettingsOut:
        with self._session_factory() as db:
            return settings_out(_settings(db))

    def update_booking_settings(self, payload: BookingSettingsWrite) -> BookingSettingsOut:
        with self._session_factory() as db:
            row = _settings(db)
            row.next_day_cutoff_time = _hhmm(payload.nextDayCutoffTime, "Cutoff")
            row.default_location = payload.defaultLocation.strip()
            return settings_out(row)

    def list_trainer_schedules(self, trainer_id: str | None) -> list[TrainerScheduleOut]:
        with self._session_factory() as db:
            query = select(TrainerSchedule)
            if trainer_id:
                query = query.where(TrainerSchedule.trainer_id == trainer_id)
            rows = db.scalars(query.order_by(TrainerSchedule.trainer_id, TrainerSchedule.weekday)).all()
            return [schedule_out(row) for row in rows]

    def create_trainer_schedule(self, payload: TrainerScheduleWrite) -> TrainerScheduleOut:
        with self._session_factory() as db:
            if db.get(Trainer, payload.trainerId) is None:
                raise NotFoundError("trainer", payload.trainerId)
            start = _hhmm(payload.startTime, "Start")
            end = _hhmm(payload.endTime, "End")
            if start >= end:
                raise BusinessError("booking.invalidSchedule")
            row = TrainerSchedule(
                trainer_id=payload.trainerId,
                weekday=payload.weekday,
                start_time=start,
                end_time=end,
            )
            db.add(row)
            try:
                db.flush()
            except IntegrityError as exc:
                raise BusinessError("booking.scheduleTaken") from exc
            return schedule_out(row)

    def update_trainer_schedule(self, schedule_id: str, payload: TrainerScheduleWrite) -> TrainerScheduleOut:
        with self._session_factory() as db:
            row = db.get(TrainerSchedule, schedule_id)
            if row is None:
                raise NotFoundError("trainer-schedule", schedule_id)
            if db.get(Trainer, payload.trainerId) is None:
                raise NotFoundError("trainer", payload.trainerId)
            start = _hhmm(payload.startTime, "Start")
            end = _hhmm(payload.endTime, "End")
            if start >= end:
                raise BusinessError("booking.invalidSchedule")
            row.trainer_id = payload.trainerId
            row.weekday = payload.weekday
            row.start_time = start
            row.end_time = end
            try:
                db.flush()
            except IntegrityError as exc:
                raise BusinessError("booking.scheduleTaken") from exc
            return schedule_out(row)

    def delete_trainer_schedule(self, schedule_id: str) -> None:
        with self._session_factory() as db:
            row = db.get(TrainerSchedule, schedule_id)
            if row is None:
                raise NotFoundError("trainer-schedule", schedule_id)
            db.delete(row)

    def list_appointments(
        self,
        user: CurrentUser,
        trainer_id: str | None = None,
        client_id: str | None = None,
        from_: str | None = None,
        to: str | None = None,
    ) -> list[AppointmentOut]:
        with self._session_factory() as db:
            query = select(Appointment).options(selectinload(Appointment.client_bono))
            if user.role == UserRole.CLIENT:
                query = query.where(Appointment.client_id == user.client_id)
            elif client_id:
                query = query.where(Appointment.client_id == client_id)
            if trainer_id:
                query = query.where(Appointment.trainer_id == trainer_id)
            if from_:
                query = query.where(Appointment.starts_at >= parse_iso(from_))
            if to:
                query = query.where(Appointment.starts_at <= parse_iso(to))
            rows = db.scalars(query.order_by(Appointment.starts_at)).all()
            hide_notes = user.role == UserRole.CLIENT
            return [appointment_out(row, hide_notes=hide_notes) for row in rows]

    def get_availability(
        self,
        user: CurrentUser,
        service_id: str,
        from_: str,
        to: str,
        trainer_id: str | None = None,
        ignore_appointment_id: str | None = None,
    ) -> list[AvailabilitySlotOut]:
        with self._session_factory() as db:
            service = db.get(Service, service_id)
            if service is None:
                raise NotFoundError("service", service_id)
            if user.role == UserRole.CLIENT and (not service.active or not service.bookable_by_client):
                raise BusinessError(E["serviceNotBookable"])
            if not service.active:
                return []
            slots = list_availability_slots(
                duration_minutes=service.duration_minutes,
                schedules=db.scalars(select(TrainerSchedule)).all(),
                appointments=db.scalars(select(Appointment)).all(),
                cutoff_time=_settings(db).next_day_cutoff_time,
                now=utcnow(),
                from_dt=parse_iso(from_),
                to_dt=parse_iso(to),
                actor=actor_of(user),
                trainer_id=trainer_id,
                ignore_appointment_id=ignore_appointment_id,
            )
            return [AvailabilitySlotOut.model_validate(slot) for slot in slots]

    def get_appointment(self, appointment_id: str, user: CurrentUser) -> AppointmentOut:
        with self._session_factory() as db:
            row = db.get(Appointment, appointment_id, options=(selectinload(Appointment.client_bono),))
            if row is None:
                raise NotFoundError("appointment", appointment_id)
            if user.role == UserRole.CLIENT and row.client_id != user.client_id:
                raise NotFoundError("appointment", appointment_id)
            return appointment_out(row, hide_notes=user.role == UserRole.CLIENT)

    def create_appointment(self, payload: AppointmentWrite, user: CurrentUser) -> AppointmentOut:
        with self._session_factory() as db:
            created = _write_appointment(db, user, None, payload)
            _apply_session_delta(db, None, created)
            db.add(created)
            db.flush()
            return appointment_out(created, hide_notes=user.role == UserRole.CLIENT)

    def update_appointment(
        self,
        appointment_id: str,
        payload: AppointmentWrite,
        user: CurrentUser,
    ) -> AppointmentOut:
        with self._session_factory() as db:
            previous = db.get(Appointment, appointment_id)
            if previous is None:
                raise NotFoundError("appointment", appointment_id)
            if user.role == UserRole.CLIENT and previous.client_id != user.client_id:
                raise NotFoundError("appointment", appointment_id)
            snapshot = _snapshot(previous)
            updated = _write_appointment(db, user, previous, payload)
            _apply_session_delta(db, snapshot, updated)
            db.flush()
            return appointment_out(updated, hide_notes=user.role == UserRole.CLIENT)


class _AppointmentView:
    def __init__(self, row: Appointment):
        self.id = row.id
        self.client_bono_id = row.client_bono_id
        self.status = row.status


def _settings(db: Session) -> BookingSettings:
    row = db.get(BookingSettings, SETTINGS_ID)
    if row is None:
        raise NotFoundError("booking-settings", SETTINGS_ID)
    return row


def _hhmm(value: str, field: str) -> str:
    if not HHMM.match(value):
        raise BusinessError(f"booking.invalid{field}")
    return value


def _snapshot(row: Appointment) -> _AppointmentView:
    return _AppointmentView(row)


def _write_appointment(
    db: Session,
    user: CurrentUser,
    previous: Appointment | None,
    payload: AppointmentWrite,
) -> Appointment:
    actor = actor_of(user)
    now = utcnow()
    service = db.get(Service, payload.serviceId)
    if service is None:
        raise NotFoundError("service", payload.serviceId)
    client = db.get(Client, payload.clientId)
    if client is None:
        raise NotFoundError("client", payload.clientId)
    trainer = db.get(Trainer, payload.trainerId)
    if trainer is None:
        raise NotFoundError("trainer", payload.trainerId)

    starts_at = ensure_aware(payload.startsAt)
    if actor == "client" or payload.endsAt is None:
        ends_at = add_minutes(starts_at, service.duration_minutes)
    else:
        ends_at = ensure_aware(payload.endsAt)
    location = (payload.location or "").strip() or _settings(db).default_location

    if previous is None and not service.active:
        raise BusinessError(E["serviceInactive"])

    if actor == "client":
        _assert_client_write(db, user, previous, payload, service, now, starts_at, ends_at)

    held_id = previous.client_bono_id if previous else None
    client_bono = _resolve_bono(
        db,
        actor,
        payload.clientId,
        service,
        now,
        payload.clientBonoId,
        explicit="clientBonoId" in payload.model_fields_set,
        held_id=held_id,
    )
    status_value = _resolve_status(actor, previous, payload, client.instant_confirm)
    if status_value == "cancelled":
        if previous is None:
            raise BusinessError(E["invalidStatus"])
        if actor == "client":
            if previous.status not in {"pending", "confirmed"}:
                raise BusinessError(E["invalidStatus"])
            cutoff = _settings(db).next_day_cutoff_time
            if not can_cancel_appointment(previous.status, previous.starts_at, now, cutoff):
                raise BusinessError(E["cutoff"])
        elif not can_admin_cancel_appointment(previous.status):
            raise BusinessError(E["invalidStatus"])
    if actor == "admin" and "notes" in payload.model_fields_set and payload.notes is not None:
        notes = payload.notes.strip()
    elif previous is not None:
        notes = previous.notes or ""
    else:
        notes = ""

    if previous is None:
        row = Appointment(
            trainer_id=payload.trainerId,
            client_id=payload.clientId,
            service_id=payload.serviceId,
            client_bono_id=client_bono.id if client_bono else None,
            client_bono=client_bono,
            starts_at=starts_at,
            ends_at=ends_at,
            location=location,
            status=status_value,
            notes=notes,
        )
    else:
        row = previous
        row.trainer_id = payload.trainerId
        row.client_id = payload.clientId
        row.service_id = payload.serviceId
        row.client_bono_id = client_bono.id if client_bono else None
        row.client_bono = client_bono
        row.starts_at = starts_at
        row.ends_at = ends_at
        row.location = location
        row.status = status_value
        row.notes = notes

    _assert_slot_free(db, row, previous.id if previous else None)
    return row


def _assert_client_write(
    db: Session,
    user: CurrentUser,
    previous: Appointment | None,
    payload: AppointmentWrite,
    service: Service,
    now: datetime,
    starts_at: datetime,
    ends_at: datetime,
) -> None:
    client_id = user.client_id or payload.clientId
    if payload.clientId != client_id or (previous and previous.client_id != client_id):
        raise BusinessError(E["invalidStatus"])
    if payload.status == "cancelled":
        return
    if not service.bookable_by_client or not service.active:
        raise BusinessError(E["serviceNotBookable"])
    if previous and previous.status in {"completed", "cancelled"}:
        raise BusinessError(E["invalidStatus"])
    slots = list_availability_slots(
        duration_minutes=service.duration_minutes,
        schedules=db.scalars(select(TrainerSchedule)).all(),
        appointments=db.scalars(select(Appointment)).all(),
        cutoff_time=_settings(db).next_day_cutoff_time,
        now=now,
        from_dt=starts_at,
        to_dt=starts_at,
        actor="client",
        trainer_id=payload.trainerId,
        ignore_appointment_id=previous.id if previous else None,
    )
    if not slot_matches(slots, payload.trainerId, starts_at, ends_at):
        raise BusinessError(E["cutoff"])
    has_other = db.scalars(
        select(Appointment).where(
            Appointment.client_id == payload.clientId,
            Appointment.id != (previous.id if previous else ""),
        )
    ).all()
    if any(is_active_client_appointment(row.status) for row in has_other):
        raise BusinessError(E["oneAppointment"])


def _resolve_bono(
    db: Session,
    actor: str,
    client_id: str,
    service: Service,
    now: datetime,
    requested_id: str | None = None,
    *,
    explicit: bool = False,
    held_id: str | None = None,
) -> ClientBono | None:
    if requested_id == "":
        requested_id = None
        explicit = True
    if explicit and requested_id:
        row = db.get(ClientBono, requested_id, options=(selectinload(ClientBono.bono),))
        if row is None or row.client_id != client_id or row.bono.service_id != service.id:
            raise NotFoundError("client-bono", requested_id)
        if actor == "client" and is_gift_credit(row) and requested_id != held_id:
            raise NotFoundError("client-bono", requested_id)
        if requested_id != held_id and not is_bono_usable(row.remaining_sessions, row.expires_at, now):
            if row.remaining_sessions <= 0:
                raise BusinessError(E["noSessions"])
            raise BusinessError(E["expiredBono"])
        return row
    rows = db.scalars(
        select(ClientBono)
        .options(selectinload(ClientBono.bono))
        .where(ClientBono.client_id == client_id)
    ).all()
    matching = [row for row in rows if row.bono.service_id == service.id]
    if explicit and actor == "admin" and not requested_id:
        held = _held_bono(matching, held_id)
        if held is not None:
            return held
        return _admin_gift_session(db, client_id, service, now, matching)
    pool = matching if actor == "admin" else [row for row in matching if not is_gift_credit(row)]
    picked = pick_preferred_bono(pool, now)
    if picked:
        return picked
    held = _held_bono(matching, held_id)
    if held is not None:
        return held
    if not pool:
        raise BusinessError(E["bonoRequired"])
    if any(row.remaining_sessions > 0 for row in pool):
        raise BusinessError(E["expiredBono"])
    raise BusinessError(E["noSessions"])


def _held_bono(matching: list[ClientBono], held_id: str | None) -> ClientBono | None:
    if not held_id:
        return None
    return next((row for row in matching if row.id == held_id), None)


def _admin_gift_session(
    db: Session,
    client_id: str,
    service: Service,
    now: datetime,
    matching: list[ClientBono],
) -> ClientBono:
    gifts = [
        row
        for row in matching
        if is_gift_credit(row) and is_bono_usable(row.remaining_sessions, row.expires_at, now)
    ]
    picked = pick_preferred_bono(gifts, now)
    if picked:
        return picked
    catalog = catalog_bono_for_service(db, service.id)
    row = ClientBono(
        client_id=client_id,
        bono_id=catalog.id,
        remaining_sessions=1,
        is_gift=True,
        purchased_at=now,
        expires_at=None,
    )
    db.add(row)
    db.flush()
    return row


def _resolve_status(
    actor: str,
    previous: Appointment | None,
    payload: AppointmentWrite,
    instant_confirm: bool,
) -> str:
    if actor == "client":
        if payload.status == "cancelled":
            return "cancelled"
        if previous and (
            ensure_aware(payload.startsAt) != ensure_aware(previous.starts_at)
            or payload.trainerId != previous.trainer_id
        ):
            return status_on_client_reschedule(instant_confirm)
        if previous and previous.status == "confirmed" and instant_confirm:
            return "confirmed"
        return status_on_create(actor, instant_confirm)
    if payload.status:
        return payload.status
    return previous.status if previous else status_on_create(actor, instant_confirm)


def _assert_slot_free(db: Session, appointment: Appointment, ignore_id: str | None) -> None:
    if not occupies_trainer_slot(appointment.status):
        return
    start = ensure_aware(appointment.starts_at)
    end = ensure_aware(appointment.ends_at)
    busy = db.scalars(
        select(Appointment).where(
            Appointment.trainer_id == appointment.trainer_id,
            Appointment.id != (ignore_id or ""),
        )
    ).all()
    taken = any(
        occupies_trainer_slot(row.status)
        and ranges_overlap(start, end, to_madrid(row.starts_at), to_madrid(row.ends_at))
        for row in busy
    )
    if taken:
        raise BusinessError(E["slotTaken"])


def _apply_session_delta(
    db: Session,
    previous: Appointment | _AppointmentView | None,
    nxt: Appointment | _AppointmentView,
) -> None:
    bono_id = nxt.client_bono_id or (previous.client_bono_id if previous else None)
    if not bono_id:
        return
    delta = session_delta(previous.status if previous else None, nxt.status)
    if delta == 0:
        return
    row = db.get(ClientBono, bono_id)
    if row is None:
        return
    next_remaining = row.remaining_sessions + delta
    if next_remaining < 0:
        raise BusinessError(E["noSessions"])
    row.remaining_sessions = next_remaining
