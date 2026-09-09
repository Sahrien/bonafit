from datetime import UTC, datetime
from unittest import mock

from app.schemas import AppointmentOut, AvailabilitySlotOut, BookingSettingsOut, TrainerOut
from app.services.calendar import CalendarService
from tests.api import AUTH, api

TRAINER = TrainerOut(id="trainer-1", name="Alex")
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


def test_delete_appointment() -> None:
    calendar = mock.Mock(spec=CalendarService)
    with api(calendar=calendar) as http:
        response = http.delete("/appointments/apt-1", headers=AUTH)
    assert response.status_code == 204
    calendar.delete_appointment.assert_called_once()
