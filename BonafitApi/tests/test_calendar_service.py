from datetime import UTC, datetime

import pytest

from app.database import Database
from app.errors import BusinessError, NotFoundError
from app.models import ClientBono
from app.schemas import AppointmentWrite, BookingSettingsWrite, TrainerScheduleWrite, TrainerWrite
from app.services.calendar import CalendarService
from tests.factories import (
    add_appointment,
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
    assert rows[0].concurrentCapacity == 1
    assert calendar_service.get_trainer("trainer-1").id == "trainer-1"
    updated = calendar_service.update_trainer(
        "trainer-1", TrainerWrite(name="Alex Martin", concurrentCapacity=2)
    )
    assert updated.concurrentCapacity == 2
    assert calendar_service.get_trainer("trainer-1").name == "Alex Martin"
    with pytest.raises(NotFoundError):
        calendar_service.get_trainer("missing")
    with pytest.raises(NotFoundError):
        calendar_service.update_trainer("missing", TrainerWrite(name="X", concurrentCapacity=1))


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


def test_admin_masaje_requires_contracted_bono(calendar_service: CalendarService, db: Database) -> None:
    add_trainer(db)
    add_client(db)
    add_settings(db)
    add_service(db, id="svc-masaje", name="Masaje", shares_session_pool=False, allows_single_session=True)
    with pytest.raises(BusinessError) as exc:
        calendar_service.create_appointment(
            AppointmentWrite(
                trainerId="trainer-1",
                clientId="client-1",
                serviceId="svc-masaje",
                startsAt=datetime(2026, 9, 9, 8, 0, tzinfo=UTC),
            ),
            admin_user(),
        )
    assert exc.value.code == "booking.bonoRequired"


def test_admin_explicit_gift_does_not_consume_purchased_masaje(
    calendar_service: CalendarService, db: Database
) -> None:
    add_trainer(db)
    add_client(db)
    add_settings(db)
    add_service(db, id="svc-masaje", name="Masaje", shares_session_pool=False, allows_single_session=True)
    add_bono(db, id="bono-m", service_id="svc-masaje", session_count=1)
    add_client_bono(db, bono_id="bono-m", remaining_sessions=1)
    created = calendar_service.create_appointment(
        AppointmentWrite(
            trainerId="trainer-1",
            clientId="client-1",
            serviceId="svc-masaje",
            clientBonoId=None,
            startsAt=datetime(2026, 9, 9, 8, 0, tzinfo=UTC),
        ),
        admin_user(),
    )
    assert created.clientBonoId is not None
    assert created.clientBonoId != "cb-1"
    with db.session() as session:
        purchased = session.get(ClientBono, "cb-1")
        gifted = session.get(ClientBono, created.clientBonoId)
        assert purchased is not None
        assert purchased.remaining_sessions == 1
        assert purchased.is_gift is False
        assert gifted is not None
        assert gifted.is_gift is True
        assert gifted.remaining_sessions == 0


def test_admin_explicit_bono_id_is_used(calendar_service: CalendarService, db: Database) -> None:
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
            clientBonoId="cb-1",
            startsAt=datetime(2026, 9, 9, 8, 0, tzinfo=UTC),
        ),
        admin_user(),
    )
    assert created.clientBonoId == "cb-1"
    with db.session() as session:
        bono = session.get(ClientBono, "cb-1")
        assert bono is not None
        assert bono.remaining_sessions == 1


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


def test_admin_explicit_single_session_gifts_entrenamiento(
    calendar_service: CalendarService, db: Database
) -> None:
    add_trainer(db)
    add_client(db)
    add_settings(db)
    add_service(db)
    add_bono(db, session_count=10)
    add_client_bono(db, remaining_sessions=0)
    created = calendar_service.create_appointment(
        AppointmentWrite(
            trainerId="trainer-1",
            clientId="client-1",
            serviceId="svc-1",
            clientBonoId=None,
            startsAt=datetime(2026, 9, 9, 8, 0, tzinfo=UTC),
        ),
        admin_user(),
    )
    assert created.clientBonoId is not None
    assert created.clientBonoId != "cb-1"
    assert created.isGift is True
    with db.session() as session:
        gifted = session.get(ClientBono, created.clientBonoId)
        pack = session.get(ClientBono, "cb-1")
        assert gifted is not None
        assert gifted.remaining_sessions == 0
        assert gifted.is_gift is True
        assert pack is not None
        assert pack.remaining_sessions == 0


def test_admin_explicit_single_session_reuses_gift(
    calendar_service: CalendarService, db: Database
) -> None:
    add_trainer(db)
    add_client(db)
    add_settings(db)
    add_service(db)
    add_bono(db, session_count=10)
    add_client_bono(db, remaining_sessions=1, is_gift=True)
    created = calendar_service.create_appointment(
        AppointmentWrite(
            trainerId="trainer-1",
            clientId="client-1",
            serviceId="svc-1",
            clientBonoId=None,
            startsAt=datetime(2026, 9, 9, 8, 0, tzinfo=UTC),
        ),
        admin_user(),
    )
    assert created.clientBonoId == "cb-1"
    assert created.isGift is True
    with db.session() as session:
        gifted = session.get(ClientBono, "cb-1")
        assert gifted is not None
        assert gifted.remaining_sessions == 0
        assert gifted.is_gift is True


def test_admin_gift_does_not_consume_last_purchased_session(
    calendar_service: CalendarService, db: Database
) -> None:
    add_trainer(db)
    add_client(db)
    add_settings(db)
    add_service(db)
    add_bono(db, session_count=10)
    add_client_bono(db, remaining_sessions=1)
    created = calendar_service.create_appointment(
        AppointmentWrite(
            trainerId="trainer-1",
            clientId="client-1",
            serviceId="svc-1",
            clientBonoId=None,
            startsAt=datetime(2026, 9, 9, 8, 0, tzinfo=UTC),
        ),
        admin_user(),
    )
    assert created.clientBonoId != "cb-1"
    with db.session() as session:
        pack = session.get(ClientBono, "cb-1")
        gifted = session.get(ClientBono, created.clientBonoId)
        assert pack is not None
        assert pack.remaining_sessions == 1
        assert gifted is not None
        assert gifted.is_gift is True
        assert gifted.remaining_sessions == 0


def test_admin_explicit_single_session_does_not_consume_pack(
    calendar_service: CalendarService, db: Database
) -> None:
    add_trainer(db)
    add_client(db)
    add_settings(db)
    add_service(db)
    add_bono(db, session_count=10)
    add_client_bono(db, remaining_sessions=7)
    created = calendar_service.create_appointment(
        AppointmentWrite(
            trainerId="trainer-1",
            clientId="client-1",
            serviceId="svc-1",
            clientBonoId=None,
            startsAt=datetime(2026, 9, 9, 8, 0, tzinfo=UTC),
        ),
        admin_user(),
    )
    assert created.clientBonoId != "cb-1"
    with db.session() as session:
        pack = session.get(ClientBono, "cb-1")
        gifted = session.get(ClientBono, created.clientBonoId)
        assert pack is not None
        assert pack.remaining_sessions == 7
        assert gifted is not None
        assert gifted.remaining_sessions == 0
        assert gifted.is_gift is True


def test_admin_explicit_single_session_requires_catalog_bono(
    calendar_service: CalendarService, db: Database
) -> None:
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
                clientBonoId=None,
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


def test_update_keeps_consumed_gift_when_changing_date(
    calendar_service: CalendarService, db: Database
) -> None:
    add_trainer(db)
    add_client(db)
    add_settings(db)
    add_service(db)
    add_bono(db, session_count=10)
    add_client_bono(db, remaining_sessions=1, is_gift=True)
    created = calendar_service.create_appointment(
        AppointmentWrite(
            trainerId="trainer-1",
            clientId="client-1",
            serviceId="svc-1",
            clientBonoId="cb-1",
            startsAt=datetime(2026, 9, 9, 8, 0, tzinfo=UTC),
        ),
        admin_user(),
    )
    assert created.isGift is True
    updated = calendar_service.update_appointment(
        created.id,
        AppointmentWrite(
            trainerId="trainer-1",
            clientId="client-1",
            serviceId="svc-1",
            clientBonoId="cb-1",
            startsAt=datetime(2026, 9, 10, 8, 0, tzinfo=UTC),
            status="confirmed",
        ),
        admin_user(),
    )
    assert updated.startsAt == datetime(2026, 9, 10, 8, 0, tzinfo=UTC)
    assert updated.clientBonoId == "cb-1"
    with db.session() as session:
        gifted = session.get(ClientBono, "cb-1")
        assert gifted is not None
        assert gifted.remaining_sessions == 0


def test_update_without_client_bono_id_keeps_held_pack(
    calendar_service: CalendarService, db: Database
) -> None:
    add_trainer(db)
    add_client(db)
    add_settings(db)
    add_service(db)
    add_bono(db)
    add_client_bono(db, remaining_sessions=1)
    created = calendar_service.create_appointment(
        AppointmentWrite(
            trainerId="trainer-1",
            clientId="client-1",
            serviceId="svc-1",
            startsAt=datetime(2026, 9, 9, 8, 0, tzinfo=UTC),
        ),
        admin_user(),
    )
    updated = calendar_service.update_appointment(
        created.id,
        AppointmentWrite(
            trainerId="trainer-1",
            clientId="client-1",
            serviceId="svc-1",
            startsAt=datetime(2026, 9, 10, 8, 0, tzinfo=UTC),
            status="confirmed",
        ),
        admin_user(),
    )
    assert updated.clientBonoId == "cb-1"
    with db.session() as session:
        pack = session.get(ClientBono, "cb-1")
        assert pack is not None
        assert pack.remaining_sessions == 0


def test_slot_taken(calendar_service: CalendarService, db: Database) -> None:
    add_trainer(db)
    add_client(db)
    add_client(db, id="client-2", email="pablo@example.com")
    add_settings(db)
    add_service(db, id="svc-masaje", name="Masaje", shares_session_pool=False, allows_single_session=True)
    add_bono(db, id="bono-m", service_id="svc-masaje", session_count=1)
    payload = AppointmentWrite(
        trainerId="trainer-1",
        clientId="client-1",
        serviceId="svc-masaje",
        clientBonoId=None,
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
                clientBonoId=None,
                startsAt=datetime(2026, 9, 9, 8, 30, tzinfo=UTC),
                endsAt=datetime(2026, 9, 9, 9, 30, tzinfo=UTC),
            ),
            admin_user(),
        )
    assert exc.value.code == "booking.slotTaken"


def test_slot_taken_allows_second_client_when_capacity_is_two(
    calendar_service: CalendarService, db: Database
) -> None:
    add_trainer(db, concurrent_capacity=2)
    add_trainer(db, id="trainer-2", name="Sam")
    add_client(db)
    add_client(db, id="client-2", email="pablo@example.com")
    add_client(db, id="client-3", email="iris@example.com")
    add_settings(db)
    add_service(db, id="svc-masaje", name="Masaje", shares_session_pool=False, allows_single_session=True)
    add_bono(db, id="bono-m", service_id="svc-masaje", session_count=1)
    start = datetime(2026, 9, 9, 8, 0, tzinfo=UTC)
    end = datetime(2026, 9, 9, 9, 0, tzinfo=UTC)
    first = AppointmentWrite(
        trainerId="trainer-1",
        clientId="client-1",
        serviceId="svc-masaje",
        clientBonoId=None,
        startsAt=start,
        endsAt=end,
    )
    calendar_service.create_appointment(first, admin_user())
    second = calendar_service.create_appointment(
        AppointmentWrite(
            trainerId="trainer-1",
            clientId="client-2",
            serviceId="svc-masaje",
            clientBonoId=None,
            startsAt=start,
            endsAt=end,
        ),
        admin_user(),
    )
    assert second.clientId == "client-2"
    with pytest.raises(BusinessError) as third_exc:
        calendar_service.create_appointment(
            AppointmentWrite(
                trainerId="trainer-1",
                clientId="client-3",
                serviceId="svc-masaje",
                clientBonoId=None,
                startsAt=start,
                endsAt=end,
            ),
            admin_user(),
        )
    assert third_exc.value.code == "booking.slotTaken"
    other = calendar_service.create_appointment(
        AppointmentWrite(
            trainerId="trainer-2",
            clientId="client-3",
            serviceId="svc-masaje",
            clientBonoId=None,
            startsAt=start,
            endsAt=end,
        ),
        admin_user(),
    )
    assert other.trainerId == "trainer-2"
    with pytest.raises(BusinessError) as other_full:
        calendar_service.create_appointment(
            AppointmentWrite(
                trainerId="trainer-2",
                clientId="client-1",
                serviceId="svc-masaje",
                clientBonoId=None,
                startsAt=start,
                endsAt=end,
            ),
            admin_user(),
        )
    assert other_full.value.code == "booking.slotTaken"


def test_availability_respects_concurrent_capacity(
    calendar_service: CalendarService, db: Database, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        "app.services.calendar.utcnow",
        lambda: datetime(2026, 9, 9, 6, 0, tzinfo=UTC),
    )
    add_trainer(db, concurrent_capacity=2)
    add_client(db)
    add_client(db, id="client-2", email="pablo@example.com")
    add_settings(db)
    add_schedule(db)
    add_service(db, id="svc-masaje", name="Masaje", shares_session_pool=False, allows_single_session=True)
    add_bono(db, id="bono-m", service_id="svc-masaje", session_count=1)
    start = datetime(2026, 9, 9, 8, 0, tzinfo=UTC)
    calendar_service.create_appointment(
        AppointmentWrite(
            trainerId="trainer-1",
            clientId="client-1",
            serviceId="svc-masaje",
            clientBonoId=None,
            startsAt=start,
        ),
        admin_user(),
    )
    slots_with_room = calendar_service.get_availability(
        admin_user(),
        service_id="svc-masaje",
        from_="2026-09-09T00:00:00.000Z",
        to="2026-09-09T23:59:59.000Z",
    )
    assert any(
        slot.startsAt == "2026-09-09T08:00:00.000Z" and slot.trainerId == "trainer-1"
        for slot in slots_with_room
    )
    calendar_service.create_appointment(
        AppointmentWrite(
            trainerId="trainer-1",
            clientId="client-2",
            serviceId="svc-masaje",
            clientBonoId=None,
            startsAt=start,
        ),
        admin_user(),
    )
    slots_full = calendar_service.get_availability(
        admin_user(),
        service_id="svc-masaje",
        from_="2026-09-09T00:00:00.000Z",
        to="2026-09-09T23:59:59.000Z",
    )
    assert not any(
        slot.startsAt == "2026-09-09T08:00:00.000Z" and slot.trainerId == "trainer-1"
        for slot in slots_full
    )


def test_list_appointments_scoped_to_client(calendar_service: CalendarService, db: Database) -> None:
    add_trainer(db)
    add_client(db)
    add_client(db, id="client-2", email="pablo@example.com")
    add_settings(db)
    add_service(db, id="svc-masaje", name="Masaje", shares_session_pool=False, allows_single_session=True)
    add_bono(db, id="bono-m", service_id="svc-masaje", session_count=1)
    calendar_service.create_appointment(
        AppointmentWrite(
            trainerId="trainer-1",
            clientId="client-1",
            serviceId="svc-masaje",
            clientBonoId=None,
            startsAt=datetime(2026, 9, 9, 8, 0, tzinfo=UTC),
        ),
        admin_user(),
    )
    other = calendar_service.create_appointment(
        AppointmentWrite(
            trainerId="trainer-1",
            clientId="client-2",
            serviceId="svc-masaje",
            clientBonoId=None,
            startsAt=datetime(2026, 9, 9, 10, 0, tzinfo=UTC),
        ),
        admin_user(),
    )
    mine = calendar_service.list_appointments(client_user())
    assert len(mine) == 1
    assert mine[0].clientId == "client-1"
    with pytest.raises(NotFoundError):
        calendar_service.get_appointment(other.id, client_user())


def test_appointment_notes_admin_only(calendar_service: CalendarService, db: Database) -> None:
    add_trainer(db)
    add_client(db)
    add_settings(db)
    add_service(db, id="svc-masaje", name="Masaje", shares_session_pool=False, allows_single_session=True)
    add_bono(db, id="bono-m", service_id="svc-masaje", session_count=1)
    created = calendar_service.create_appointment(
        AppointmentWrite(
            trainerId="trainer-1",
            clientId="client-1",
            serviceId="svc-masaje",
            clientBonoId=None,
            startsAt=datetime(2026, 9, 9, 8, 0, tzinfo=UTC),
            notes="Trabajó movilidad de cadera.",
        ),
        admin_user(),
    )
    assert created.notes == "Trabajó movilidad de cadera."
    listed = calendar_service.list_appointments(client_user())
    assert listed[0].notes == ""
    fetched = calendar_service.get_appointment(created.id, client_user())
    assert fetched.notes == ""
    updated = calendar_service.update_appointment(
        created.id,
        AppointmentWrite(
            trainerId="trainer-1",
            clientId="client-1",
            serviceId="svc-masaje",
            clientBonoId=None,
            startsAt=datetime(2026, 9, 9, 8, 0, tzinfo=UTC),
            notes="Mejoró la sentadilla.",
        ),
        admin_user(),
    )
    assert updated.notes == "Mejoró la sentadilla."
    hidden = calendar_service.get_appointment(created.id, client_user())
    assert hidden.notes == ""


def test_admin_can_cancel_confirmed_appointment(calendar_service: CalendarService, db: Database) -> None:
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
    assert created.status == "confirmed"
    updated = calendar_service.update_appointment(
        created.id,
        AppointmentWrite(
            trainerId="trainer-1",
            clientId="client-1",
            serviceId="svc-1",
            startsAt=datetime(2026, 9, 9, 8, 0, tzinfo=UTC),
            status="cancelled",
        ),
        admin_user(),
    )
    assert updated.status == "cancelled"


def _seed_confirmed_appointment(calendar_service: CalendarService, db: Database, starts_at: datetime):
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
            startsAt=starts_at,
        ),
        admin_user(),
    )
    assert created.status == "confirmed"
    return created


def test_client_can_cancel_confirmed_appointment_before_cutoff(
    calendar_service: CalendarService, db: Database, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        "app.services.calendar.utcnow",
        lambda: datetime(2026, 9, 8, 15, 59, tzinfo=UTC),
    )
    created = _seed_confirmed_appointment(calendar_service, db, datetime(2026, 9, 9, 8, 0, tzinfo=UTC))
    updated = calendar_service.update_appointment(
        created.id,
        AppointmentWrite(
            trainerId="trainer-1",
            clientId="client-1",
            serviceId="svc-1",
            startsAt=datetime(2026, 9, 9, 8, 0, tzinfo=UTC),
            status="cancelled",
        ),
        client_user(),
    )
    assert updated.status == "cancelled"


def test_client_cannot_cancel_confirmed_appointment_after_cutoff(
    calendar_service: CalendarService, db: Database, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        "app.services.calendar.utcnow",
        lambda: datetime(2026, 9, 8, 16, 0, tzinfo=UTC),
    )
    created = _seed_confirmed_appointment(calendar_service, db, datetime(2026, 9, 9, 8, 0, tzinfo=UTC))
    with pytest.raises(BusinessError) as exc:
        calendar_service.update_appointment(
            created.id,
            AppointmentWrite(
                trainerId="trainer-1",
                clientId="client-1",
                serviceId="svc-1",
                startsAt=datetime(2026, 9, 9, 8, 0, tzinfo=UTC),
                status="cancelled",
            ),
            client_user(),
        )
    assert exc.value.code == "booking.cutoff"


def test_client_cannot_cancel_today_appointment(
    calendar_service: CalendarService, db: Database, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        "app.services.calendar.utcnow",
        lambda: datetime(2026, 9, 8, 8, 0, tzinfo=UTC),
    )
    created = _seed_confirmed_appointment(calendar_service, db, datetime(2026, 9, 8, 10, 0, tzinfo=UTC))
    with pytest.raises(BusinessError) as exc:
        calendar_service.update_appointment(
            created.id,
            AppointmentWrite(
                trainerId="trainer-1",
                clientId="client-1",
                serviceId="svc-1",
                startsAt=datetime(2026, 9, 8, 10, 0, tzinfo=UTC),
                status="cancelled",
            ),
            client_user(),
        )
    assert exc.value.code == "booking.cutoff"


def test_cancel_pending_appointment(calendar_service: CalendarService, db: Database) -> None:
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
            status="pending",
        ),
        admin_user(),
    )
    updated = calendar_service.update_appointment(
        created.id,
        AppointmentWrite(
            trainerId="trainer-1",
            clientId="client-1",
            serviceId="svc-1",
            startsAt=datetime(2026, 9, 9, 8, 0, tzinfo=UTC),
            status="cancelled",
        ),
        admin_user(),
    )
    assert updated.status == "cancelled"
    rows = calendar_service.list_appointments(admin_user())
    assert len(rows) == 1
    assert rows[0].status == "cancelled"


def test_cancelled_slot_can_be_rebooked(calendar_service: CalendarService, db: Database) -> None:
    add_trainer(db)
    add_client(db)
    add_client(db, id="client-2", email="pablo@example.com")
    add_settings(db)
    add_service(db)
    add_bono(db)
    add_client_bono(db, remaining_sessions=2)
    add_client_bono(db, id="cb-2", client_id="client-2", remaining_sessions=2)
    created = calendar_service.create_appointment(
        AppointmentWrite(
            trainerId="trainer-1",
            clientId="client-1",
            serviceId="svc-1",
            startsAt=datetime(2026, 9, 9, 8, 0, tzinfo=UTC),
            status="pending",
        ),
        admin_user(),
    )
    calendar_service.update_appointment(
        created.id,
        AppointmentWrite(
            trainerId="trainer-1",
            clientId="client-1",
            serviceId="svc-1",
            startsAt=datetime(2026, 9, 9, 8, 0, tzinfo=UTC),
            status="cancelled",
        ),
        admin_user(),
    )
    booked = calendar_service.create_appointment(
        AppointmentWrite(
            trainerId="trainer-1",
            clientId="client-2",
            serviceId="svc-1",
            startsAt=datetime(2026, 9, 9, 8, 0, tzinfo=UTC),
        ),
        admin_user(),
    )
    assert booked.status == "confirmed"
    assert booked.clientId == "client-2"


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
