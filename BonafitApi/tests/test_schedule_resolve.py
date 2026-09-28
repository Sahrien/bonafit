from datetime import date
from types import SimpleNamespace

from app.schedule import (
    ScheduleRules,
    TimeWindow,
    resolve_day,
    windows_minutes,
)


def _rules(**overrides: object) -> ScheduleRules:
    values: dict[str, object] = {
        "templates": [
            SimpleNamespace(trainer_id="trainer-1", weekday=3, start_time="08:00", end_time="18:00"),
        ],
        "date_windows": [],
        "absences": [],
        "holidays": [],
    }
    values.update(overrides)
    return ScheduleRules(**values)  # type: ignore[arg-type]


def test_resolve_uses_weekday_template() -> None:
    resolved = resolve_day("trainer-1", date(2026, 9, 9), _rules())
    assert resolved.source == "template"
    assert resolved.windows == [TimeWindow("08:00", "18:00")]
    assert resolved.reason is None


def test_resolve_override_replaces_template() -> None:
    rules = _rules(
        date_windows=[
            SimpleNamespace(trainer_id="trainer-1", date=date(2026, 9, 9), start_time="10:00", end_time="12:00"),
        ]
    )
    resolved = resolve_day("trainer-1", date(2026, 9, 9), rules)
    assert resolved.source == "override"
    assert resolved.windows == [TimeWindow("10:00", "12:00")]


def test_resolve_absence_closes_day() -> None:
    rules = _rules(
        date_windows=[
            SimpleNamespace(trainer_id="trainer-1", date=date(2026, 9, 9), start_time="10:00", end_time="12:00"),
        ],
        absences=[
            SimpleNamespace(
                trainer_id="trainer-1",
                starts_on=date(2026, 9, 8),
                ends_on=date(2026, 9, 10),
                reason="vacation",
            )
        ],
    )
    resolved = resolve_day("trainer-1", date(2026, 9, 9), rules)
    assert resolved.source == "absence"
    assert resolved.windows == []
    assert resolved.reason == "vacation"


def test_resolve_holiday_wins_over_absence_and_override() -> None:
    rules = _rules(
        date_windows=[
            SimpleNamespace(trainer_id="trainer-1", date=date(2026, 9, 9), start_time="10:00", end_time="12:00"),
        ],
        absences=[
            SimpleNamespace(
                trainer_id="trainer-1",
                starts_on=date(2026, 9, 9),
                ends_on=date(2026, 9, 9),
                reason="personal",
            )
        ],
        holidays=[SimpleNamespace(date=date(2026, 9, 9), name="Fiesta")],
    )
    resolved = resolve_day("trainer-1", date(2026, 9, 9), rules)
    assert resolved.source == "holiday"
    assert resolved.windows == []
    assert resolved.reason == "publicHoliday"
    assert windows_minutes(resolved.windows) == 0


def test_resolve_weekend_without_template_is_empty() -> None:
    resolved = resolve_day("trainer-1", date(2026, 9, 12), _rules())
    assert resolved.source == "template"
    assert resolved.windows == []
