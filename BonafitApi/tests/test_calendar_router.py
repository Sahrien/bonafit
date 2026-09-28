from datetime import UTC, date, datetime
from unittest import mock

from app.errors import BusinessError
from app.schemas import (
    AppointmentOut,
    AvailabilitySlotOut,
    BookingSettingsOut,
    PublicHolidayOut,
    ResolvedDayOut,
    ScheduleHoursDayOut,
    ScheduleHoursOut,
    ScheduleHoursTrainerOut,
    TrainerOut,
    TrainerWrite,
)
from app.services.calendar import CalendarService
from tests.api import AUTH, api

TRAINER = TrainerOut(id="trainer-1", name="Alex", concurrentCapacity=1)
APPOINTMENT = AppointmentOut(
    id="apt-1",
    trainerId="trainer-1",
    clientId="client-1",
    serviceId="svc-1",
    startsAt=datetime(2026, 9, 9, 8, 0, tzinfo=UTC),
    endsAt=datetime(2026, 9, 9, 9, 0, tzinfo=UTC),
    location="Studio",
    status="confirmed",
)


def test_list_trainers() -> None:
    calendar = mock.Mock(spec=CalendarService)
    calendar.list_trainers.return_value = [TRAINER]
    with api(calendar=calendar) as http:
        response = http.get("/trainers", headers=AUTH)
    assert response.status_code == 200
    assert response.json()[0]["name"] == "Alex"
    assert response.json()[0]["concurrentCapacity"] == 1


def test_update_trainer() -> None:
    calendar = mock.Mock(spec=CalendarService)
    calendar.update_trainer.return_value = TrainerOut(
        id="trainer-1", name="Alex", concurrentCapacity=2
    )
    with api(calendar=calendar) as http:
        response = http.put(
            "/trainers/trainer-1",
            json={"name": "Alex", "concurrentCapacity": 2},
            headers=AUTH,
        )
    assert response.status_code == 200
    assert response.json()["concurrentCapacity"] == 2
    calendar.update_trainer.assert_called_once()
    payload = calendar.update_trainer.call_args.args[1]
    assert isinstance(payload, TrainerWrite)
    assert payload.concurrentCapacity == 2


def test_get_booking_settings() -> None:
    calendar = mock.Mock(spec=CalendarService)
    calendar.get_booking_settings.return_value = BookingSettingsOut(
        id="booking-settings",
        nextDayCutoffTime="18:00",
        defaultLocation="Studio",
    )
    with api(calendar=calendar) as http:
        response = http.get("/booking-settings", headers=AUTH)
    assert response.status_code == 200
    assert response.json()["defaultLocation"] == "Studio"


def test_create_appointment() -> None:
    calendar = mock.Mock(spec=CalendarService)
    calendar.create_appointment.return_value = APPOINTMENT
    with api(calendar=calendar) as http:
        response = http.post(
            "/appointments",
            json={
                "trainerId": "trainer-1",
                "clientId": "client-1",
                "serviceId": "svc-1",
                "startsAt": "2026-09-09T08:00:00.000Z",
            },
            headers=AUTH,
        )
    assert response.status_code == 200
    assert response.json()["status"] == "confirmed"
    calendar.create_appointment.assert_called_once()


def test_availability() -> None:
    calendar = mock.Mock(spec=CalendarService)
    calendar.get_availability.return_value = [
        AvailabilitySlotOut(
            trainerId="trainer-1",
            startsAt="2026-09-09T08:00:00.000Z",
            endsAt="2026-09-09T09:00:00.000Z",
        )
    ]
    with api(calendar=calendar) as http:
        response = http.get(
            "/appointments/availability",
            params={"serviceId": "svc-1", "from": "2026-09-09T00:00:00.000Z", "to": "2026-09-09T23:59:59.000Z"},
            headers=AUTH,
        )
    assert response.status_code == 200
    assert response.json()[0]["trainerId"] == "trainer-1"


def test_list_resolved_schedules() -> None:
    calendar = mock.Mock(spec=CalendarService)
    calendar.list_resolved.return_value = [
        ResolvedDayOut(
            trainerId="trainer-1",
            date=date(2026, 9, 23),
            windows=[],
            source="holiday",
            reason="publicHoliday",
        )
    ]
    with api(calendar=calendar) as http:
        response = http.get(
            "/schedules/resolved",
            params={"from": "2026-09-23", "to": "2026-09-23", "trainerId": "trainer-1"},
            headers=AUTH,
        )
    assert response.status_code == 200
    assert response.json()[0]["source"] == "holiday"
    assert response.json()[0]["reason"] == "publicHoliday"
    calendar.list_resolved.assert_called_once_with("2026-09-23", "2026-09-23", "trainer-1")


def test_list_schedule_hours() -> None:
    calendar = mock.Mock(spec=CalendarService)
    calendar.list_hours.return_value = ScheduleHoursOut(
        days=[ScheduleHoursDayOut(trainerId="trainer-1", date=date(2026, 9, 23), minutes=0)],
        totals=[ScheduleHoursTrainerOut(trainerId="trainer-1", totalMinutes=0, averageMinutesPerDay=0)],
        totalMinutes=0,
        averageMinutesPerDay=0,
    )
    with api(calendar=calendar) as http:
        response = http.get(
            "/schedules/hours",
            params={"from": "2026-09-23", "to": "2026-09-23"},
            headers=AUTH,
        )
    assert response.status_code == 200
    assert response.json()["totalMinutes"] == 0


def test_create_public_holiday() -> None:
    calendar = mock.Mock(spec=CalendarService)
    calendar.create_public_holiday.return_value = PublicHolidayOut(
        id="hol-1", date=date(2026, 12, 25), name="Navidad"
    )
    with api(calendar=calendar) as http:
        response = http.post("/public-holidays", json={"date": "2026-12-25", "name": "Navidad"}, headers=AUTH)
    assert response.status_code == 200
    assert response.json()["name"] == "Navidad"
    calendar.create_public_holiday.assert_called_once()


def test_create_absence_conflict() -> None:
    calendar = mock.Mock(spec=CalendarService)
    calendar.create_absence.side_effect = BusinessError("booking.scheduleHasAppointments")
    with api(calendar=calendar) as http:
        response = http.post(
            "/schedule-absences",
            json={
                "trainerId": "trainer-1",
                "startsOn": "2026-09-23",
                "endsOn": "2026-09-23",
                "reason": "vacation",
            },
            headers=AUTH,
        )
    assert response.status_code == 409
    assert response.json() == {"code": "booking.scheduleHasAppointments"}
