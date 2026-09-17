from datetime import UTC, datetime
from types import SimpleNamespace

from app.booking import list_availability_slots, slot_taken_for_trainer, to_madrid


def _busy(**overrides: object) -> SimpleNamespace:
    values: dict[str, object] = {
        "id": "apt-1",
        "trainer_id": "trainer-1",
        "status": "confirmed",
        "starts_at": datetime(2026, 9, 9, 6, 0, tzinfo=UTC),
        "ends_at": datetime(2026, 9, 9, 7, 0, tzinfo=UTC),
    }
    values.update(overrides)
    return SimpleNamespace(**values)


def test_slot_taken_for_trainer_capacity_one() -> None:
    start = to_madrid(datetime(2026, 9, 9, 6, 0, tzinfo=UTC))
    end = to_madrid(datetime(2026, 9, 9, 7, 0, tzinfo=UTC))
    busy = [_busy()]
    assert slot_taken_for_trainer(busy, "trainer-1", start, end, 1)
    assert not slot_taken_for_trainer(busy, "trainer-2", start, end, 1)


def test_slot_taken_for_trainer_capacity_two() -> None:
    start = to_madrid(datetime(2026, 9, 9, 6, 0, tzinfo=UTC))
    end = to_madrid(datetime(2026, 9, 9, 7, 0, tzinfo=UTC))
    one = [_busy()]
    two = [_busy(), _busy(id="apt-2")]
    assert not slot_taken_for_trainer(one, "trainer-1", start, end, 2)
    assert slot_taken_for_trainer(two, "trainer-1", start, end, 2)
    assert not slot_taken_for_trainer(
        one + [_busy(id="apt-3", status="cancelled")],
        "trainer-1",
        start,
        end,
        2,
    )


def test_list_availability_slots_keeps_seat_until_capacity() -> None:
    schedule = SimpleNamespace(
        trainer_id="trainer-1",
        weekday=3,
        start_time="08:00",
        end_time="10:00",
    )
    appointments = [_busy()]
    kwargs = {
        "duration_minutes": 60,
        "schedules": [schedule],
        "appointments": appointments,
        "cutoff_time": "18:00",
        "now": datetime(2026, 9, 9, 6, 0, tzinfo=UTC),
        "from_dt": datetime(2026, 9, 9, 0, 0, tzinfo=UTC),
        "to_dt": datetime(2026, 9, 9, 23, 0, tzinfo=UTC),
        "actor": "admin",
    }
    open_slots = list_availability_slots(
        **kwargs,
        trainer_capacities={"trainer-1": 2},
    )
    assert any(slot["startsAt"] == "2026-09-09T06:00:00.000Z" for slot in open_slots)
    full = list_availability_slots(
        duration_minutes=60,
        schedules=[schedule],
        appointments=[_busy(), _busy(id="apt-2")],
        cutoff_time="18:00",
        now=datetime(2026, 9, 9, 6, 0, tzinfo=UTC),
        from_dt=datetime(2026, 9, 9, 0, 0, tzinfo=UTC),
        to_dt=datetime(2026, 9, 9, 23, 0, tzinfo=UTC),
        actor="admin",
        trainer_capacities={"trainer-1": 2},
    )
    assert not any(slot["startsAt"] == "2026-09-09T06:00:00.000Z" for slot in full)
    default_capacity = list_availability_slots(**kwargs)
    assert not any(slot["startsAt"] == "2026-09-09T06:00:00.000Z" for slot in default_capacity)
