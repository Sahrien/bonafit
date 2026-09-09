from datetime import UTC, datetime

import pytest

from app.database import Database
from app.errors import BusinessError, NotFoundError
from app.models import ClientBono
from app.schemas import AppointmentWrite, BookingSettingsWrite, TrainerScheduleWrite
from app.services.calendar import CalendarService
from tests.factories import (
    add_bono,
    add_client,
    add_client_bono,
    add_schedule,
    add_service,
    add_settings,
    add_trainer,
    admin_user,
    client_user,
)


def test_trainers(calendar_service: CalendarService, db: Database) -> None:
    add_trainer(db)
    rows = calendar_service.list_trainers()
    assert rows[0].name == "Alex"
    assert calendar_service.get_trainer("trainer-1").id == "trainer-1"
    with pytest.raises(NotFoundError):
        calendar_service.get_trainer("missing")


def test_booking_settings(calendar_service: CalendarService, db: Database) -> None:
    add_settings(db)
    settings = calendar_service.get_booking_settings()
    assert settings.defaultLocation == "Studio"
    updated = calendar_service.update_booking_settings(
        BookingSettingsWrite(nextDayCutoffTime="17:00", defaultLocation="Sala 2")
    )
    assert updated.nextDayCutoffTime == "17:00"
    with pytest.raises(BusinessError):
        calendar_service.update_booking_settings(
            BookingSettingsWrite(nextDayCutoffTime="25:00", defaultLocation="Sala 2")
        )


def test_schedule_crud(calendar_service: CalendarService, db: Database) -> None:
    add_trainer(db)
    created = calendar_service.create_trainer_schedule(
        TrainerScheduleWrite(trainerId="trainer-1", weekday=3, startTime="10:00", endTime="12:00")
    )
    assert created.startTime == "10:00"
    with pytest.raises(BusinessError) as exc:
        calendar_service.create_trainer_schedule(
            TrainerScheduleWrite(trainerId="trainer-1", weekday=3, startTime="12:00", endTime="10:00")
        )
    assert exc.value.code == "booking.invalidSchedule"
    calendar_service.delete_trainer_schedule(created.id)
    assert calendar_service.list_trainer_schedules("trainer-1") == []


def test_admin_masaje_walk_in(calendar_service: CalendarService, db: Database) -> None:
    add_trainer(db)
    add_client(db)
    add_settings(db)
    add_service(db, id="svc-masaje", category="masaje", name="Masaje", allows_single_session=True)
    created = calendar_service.create_appointment(
        AppointmentWrite(
            trainerId="trainer-1",
            clientId="client-1",
            serviceId="svc-masaje",
            startsAt=datetime(2026, 9, 9, 8, 0, tzinfo=UTC),
        ),
        admin_user(),
    )
    assert created.status == "confirmed"
    assert created.clientBonoId is None
    assert created.location == "Studio"


def test_entrenamiento_requires_bono(calendar_service: CalendarService, db: Database) -> None:
    add_trainer(db)
    add_client(db)
    add_settings(db)
    add_service(db)
    with pytest.raises(BusinessError) as exc:
        calendar_service.create_appointment(
            AppointmentWrite(
                trainerId="trainer-1",
                clientId="client-1",
                serviceId="svc-1",
                startsAt=datetime(2026, 9, 9, 8, 0, tzinfo=UTC),
            ),
            admin_user(),
        )
    assert exc.value.code == "booking.bonoRequired"


def test_confirmed_appointment_consumes_bono(calendar_service: CalendarService, db: Database) -> None:
    add_trainer(db)
    add_client(db)
    add_settings(db)
    add_service(db)
    add_bono(db)
    add_client_bono(db, remaining_sessions=2)
    created = calendar_service.create_appointment(
        AppointmentWrite(
            trainerId="trainer-1",
            clientId="client-1",
            serviceId="svc-1",
            startsAt=datetime(2026, 9, 9, 8, 0, tzinfo=UTC),
        ),
        admin_user(),
    )
    assert created.clientBonoId == "cb-1"
    with db.session() as session:
        bono = session.get(ClientBono, "cb-1")
        assert bono is not None
        assert bono.remaining_sessions == 1


def test_slot_taken(calendar_service: CalendarService, db: Database) -> None:
    add_trainer(db)
    add_client(db)
    add_client(db, id="client-2", email="pablo@example.com")
    add_settings(db)
    add_service(db, id="svc-masaje", category="masaje", name="Masaje", allows_single_session=True)
    payload = AppointmentWrite(
        trainerId="trainer-1",
        clientId="client-1",
        serviceId="svc-masaje",
        startsAt=datetime(2026, 9, 9, 8, 0, tzinfo=UTC),
        endsAt=datetime(2026, 9, 9, 9, 0, tzinfo=UTC),
    )
    calendar_service.create_appointment(payload, admin_user())
    with pytest.raises(BusinessError) as exc:
        calendar_service.create_appointment(
            AppointmentWrite(
                trainerId="trainer-1",
                clientId="client-2",
                serviceId="svc-masaje",
                startsAt=datetime(2026, 9, 9, 8, 30, tzinfo=UTC),
                endsAt=datetime(2026, 9, 9, 9, 30, tzinfo=UTC),
            ),
            admin_user(),
        )
    assert exc.value.code == "booking.slotTaken"


def test_list_appointments_scoped_to_client(calendar_service: CalendarService, db: Database) -> None:
    add_trainer(db)
    add_client(db)
    add_client(db, id="client-2", email="pablo@example.com")
    add_settings(db)
    add_service(db, id="svc-masaje", category="masaje", name="Masaje", allows_single_session=True)
    calendar_service.create_appointment(
        AppointmentWrite(
            trainerId="trainer-1",
            clientId="client-1",
            serviceId="svc-masaje",
            startsAt=datetime(2026, 9, 9, 8, 0, tzinfo=UTC),
        ),
        admin_user(),
    )
    other = calendar_service.create_appointment(
        AppointmentWrite(
            trainerId="trainer-1",
            clientId="client-2",
            serviceId="svc-masaje",
            startsAt=datetime(2026, 9, 9, 10, 0, tzinfo=UTC),
        ),
        admin_user(),
    )
    mine = calendar_service.list_appointments(client_user())
    assert len(mine) == 1
    assert mine[0].clientId == "client-1"
    with pytest.raises(NotFoundError):
        calendar_service.get_appointment(other.id, client_user())


def test_availability(calendar_service: CalendarService, db: Database, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        "app.services.calendar.utcnow",
        lambda: datetime(2026, 9, 9, 6, 0, tzinfo=UTC),
    )
    add_trainer(db)
    add_settings(db)
    add_schedule(db)
    add_service(db, duration_minutes=60)
    slots = calendar_service.get_availability(
        admin_user(),
        service_id="svc-1",
        from_="2026-09-09T00:00:00.000Z",
        to="2026-09-09T23:59:59.000Z",
    )
    assert slots
    assert slots[0].trainerId == "trainer-1"
