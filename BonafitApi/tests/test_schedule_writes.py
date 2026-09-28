from datetime import UTC, date, datetime

import pytest

from app.database import Database
from app.errors import BusinessError
from app.schemas import (
    PublicHolidayWrite,
    ScheduleAbsenceWrite,
    ScheduleDateWindowWrite,
    TrainerScheduleWrite,
)
from app.services.calendar import CalendarService
from tests.factories import (
    add_appointment,
    add_client,
    add_date_window,
    add_holiday,
    add_schedule,
    add_service,
    add_settings,
    add_trainer,
    admin_user,
)


FUTURE = datetime(2026, 9, 23, 8, 0, tzinfo=UTC)


def _patch_now(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("app.services.calendar.utcnow", lambda: datetime(2026, 9, 20, 8, 0, tzinfo=UTC))


def test_date_window_replaces_template_in_resolved(
    calendar_service: CalendarService, db: Database
) -> None:
    add_trainer(db)
    add_schedule(db, weekday=3, start_time="08:00", end_time="18:00")
    created = calendar_service.create_date_window(
        ScheduleDateWindowWrite(
            trainerId="trainer-1",
            date=date(2026, 9, 23),
            startTime="10:00",
            endTime="12:00",
            note="Comida",
        )
    )
    assert created.note == "Comida"
    days = calendar_service.list_resolved("2026-09-23", "2026-09-23", "trainer-1")
    assert days[0].source == "override"
    assert days[0].windows[0].startTime == "10:00"


def test_absence_conflicts_with_date_window(calendar_service: CalendarService, db: Database) -> None:
    add_trainer(db)
    add_date_window(db, date=date(2026, 9, 23), start_time="10:00", end_time="12:00")
    with pytest.raises(BusinessError) as exc:
        calendar_service.create_absence(
            ScheduleAbsenceWrite(
                trainerId="trainer-1",
                startsOn=date(2026, 9, 23),
                endsOn=date(2026, 9, 24),
                reason="vacation",
            )
        )
    assert exc.value.code == "booking.scheduleConflict"


def test_overlapping_date_windows_are_taken(calendar_service: CalendarService, db: Database) -> None:
    add_trainer(db)
    calendar_service.create_date_window(
        ScheduleDateWindowWrite(
            trainerId="trainer-1",
            date=date(2026, 9, 23),
            startTime="10:00",
            endTime="12:00",
        )
    )
    with pytest.raises(BusinessError) as exc:
        calendar_service.create_date_window(
            ScheduleDateWindowWrite(
                trainerId="trainer-1",
                date=date(2026, 9, 23),
                startTime="11:00",
                endTime="13:00",
            )
        )
    assert exc.value.code == "booking.scheduleTaken"


def test_absence_blocks_when_appointment_in_template(
    calendar_service: CalendarService, db: Database, monkeypatch: pytest.MonkeyPatch
) -> None:
    _patch_now(monkeypatch)
    add_trainer(db)
    add_client(db)
    add_service(db)
    add_settings(db)
    add_schedule(db, weekday=3, start_time="08:00", end_time="18:00")
    add_appointment(db, starts_at=FUTURE, ends_at=datetime(2026, 9, 23, 9, 0, tzinfo=UTC), status="confirmed")
    with pytest.raises(BusinessError) as exc:
        calendar_service.create_absence(
            ScheduleAbsenceWrite(
                trainerId="trainer-1",
                startsOn=date(2026, 9, 23),
                endsOn=date(2026, 9, 23),
                reason="personal",
            )
        )
    assert exc.value.code == "booking.scheduleHasAppointments"


def test_holiday_blocks_when_appointment_in_window(
    calendar_service: CalendarService, db: Database, monkeypatch: pytest.MonkeyPatch
) -> None:
    _patch_now(monkeypatch)
    add_trainer(db)
    add_client(db)
    add_service(db)
    add_schedule(db, weekday=3, start_time="08:00", end_time="18:00")
    add_appointment(db, starts_at=FUTURE, ends_at=datetime(2026, 9, 23, 9, 0, tzinfo=UTC), status="pending")
    with pytest.raises(BusinessError) as exc:
        calendar_service.create_public_holiday(PublicHolidayWrite(date=date(2026, 9, 23), name="Fiesta"))
    assert exc.value.code == "booking.scheduleHasAppointments"


def test_template_delete_blocks_future_occupying(
    calendar_service: CalendarService, db: Database, monkeypatch: pytest.MonkeyPatch
) -> None:
    _patch_now(monkeypatch)
    add_trainer(db)
    add_client(db)
    add_service(db)
    add_schedule(db, weekday=3, start_time="08:00", end_time="18:00")
    add_appointment(db, starts_at=FUTURE, ends_at=datetime(2026, 9, 23, 9, 0, tzinfo=UTC))
    with pytest.raises(BusinessError) as exc:
        calendar_service.delete_trainer_schedule("sch-1")
    assert exc.value.code == "booking.scheduleHasAppointments"


def test_template_delete_allowed_when_day_has_override(
    calendar_service: CalendarService, db: Database, monkeypatch: pytest.MonkeyPatch
) -> None:
    _patch_now(monkeypatch)
    add_trainer(db)
    add_client(db)
    add_service(db)
    add_schedule(db, weekday=3, start_time="08:00", end_time="18:00")
    add_date_window(db, date=date(2026, 9, 23), start_time="08:00", end_time="18:00")
    add_appointment(db, starts_at=FUTURE, ends_at=datetime(2026, 9, 23, 9, 0, tzinfo=UTC))
    calendar_service.delete_trainer_schedule("sch-1")
    assert calendar_service.list_trainer_schedules("trainer-1") == []


def test_hours_counts_resolved_minutes(calendar_service: CalendarService, db: Database) -> None:
    add_trainer(db)
    add_schedule(db, weekday=3, start_time="08:00", end_time="18:00")
    add_holiday(db, date=date(2026, 9, 23), name="Fiesta")
    hours = calendar_service.list_hours("2026-09-23", "2026-09-23", "trainer-1")
    assert hours.days[0].minutes == 0
    assert hours.totalMinutes == 0
    open_day = calendar_service.list_hours("2026-09-16", "2026-09-16", "trainer-1")
    assert open_day.days[0].minutes == 600


def test_availability_skips_holiday(
    calendar_service: CalendarService, db: Database, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr("app.services.calendar.utcnow", lambda: datetime(2026, 9, 23, 6, 0, tzinfo=UTC))
    add_trainer(db)
    add_settings(db)
    add_schedule(db, weekday=3, start_time="08:00", end_time="10:00")
    add_holiday(db, date=date(2026, 9, 23), name="Fiesta")
    add_service(db, duration_minutes=60)
    slots = calendar_service.get_availability(
        admin_user(),
        service_id="svc-1",
        from_="2026-09-23T00:00:00.000Z",
        to="2026-09-23T23:59:59.000Z",
    )
    assert slots == []
