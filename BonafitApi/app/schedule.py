from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Literal

from app.booking import MADRID, at_local_time, parse_time_parts, to_madrid

ResolvedSource = Literal["template", "override", "absence", "holiday"]
AbsenceReason = Literal["vacation", "personal", "sick", "unknown"]
ClosedReason = Literal["vacation", "personal", "sick", "unknown", "publicHoliday"]

ABSENCE_REASONS = frozenset({"vacation", "personal", "sick", "unknown"})


@dataclass(frozen=True)
class TimeWindow:
    start_time: str
    end_time: str


@dataclass(frozen=True)
class ResolvedDay:
    trainer_id: str
    date: date
    windows: list[TimeWindow]
    source: ResolvedSource
    reason: ClosedReason | None = None


@dataclass
class ScheduleRules:
    templates: list
    date_windows: list
    absences: list
    holidays: list


def as_date(value: date | datetime) -> date:
    if isinstance(value, datetime):
        return to_madrid(value).date()
    return value


def hhmm_minutes(value: str) -> int:
    hours, minutes = parse_time_parts(value)
    return hours * 60 + minutes


def windows_overlap(windows: list[TimeWindow]) -> bool:
    ranges = sorted((hhmm_minutes(window.start_time), hhmm_minutes(window.end_time)) for window in windows)
    for index in range(len(ranges) - 1):
        if ranges[index][1] > ranges[index + 1][0]:
            return True
    return False


def windows_minutes(windows: list[TimeWindow]) -> int:
    return sum(hhmm_minutes(window.end_time) - hhmm_minutes(window.start_time) for window in windows)


def day_at_madrid(day: date) -> datetime:
    return datetime(day.year, day.month, day.day, tzinfo=MADRID)


def appointment_in_windows(starts_at: datetime, ends_at: datetime, day: date, windows: list[TimeWindow]) -> bool:
    start = to_madrid(starts_at)
    end = to_madrid(ends_at)
    if start.date() != day:
        return False
    local_day = day_at_madrid(day)
    return any(
        at_local_time(local_day, window.start_time) <= start and end <= at_local_time(local_day, window.end_time)
        for window in windows
    )


def holiday_on(day: date, holidays: list) -> object | None:
    for row in holidays:
        if as_date(row.date) == day:
            return row
    return None


def absence_on(trainer_id: str, day: date, absences: list) -> object | None:
    for row in absences:
        if row.trainer_id != trainer_id:
            continue
        if as_date(row.starts_on) <= day <= as_date(row.ends_on):
            return row
    return None


def absence_overlaps_windows(trainer_id: str, starts_on: date, ends_on: date, date_windows: list) -> bool:
    return any(
        row.trainer_id == trainer_id and starts_on <= as_date(row.date) <= ends_on for row in date_windows
    )


def absences_overlap(starts_on: date, ends_on: date, other_starts: date, other_ends: date) -> bool:
    return starts_on <= other_ends and other_starts <= ends_on


def resolve_day(trainer_id: str, day: date, rules: ScheduleRules) -> ResolvedDay:
    if holiday_on(day, rules.holidays) is not None:
        return ResolvedDay(trainer_id, day, [], "holiday", "publicHoliday")
    absence = absence_on(trainer_id, day, rules.absences)
    if absence is not None:
        reason = getattr(absence, "reason", "unknown")
        closed: ClosedReason = reason if reason in ABSENCE_REASONS else "unknown"
        return ResolvedDay(trainer_id, day, [], "absence", closed)
    dated = [
        TimeWindow(row.start_time, row.end_time)
        for row in rules.date_windows
        if row.trainer_id == trainer_id and as_date(row.date) == day
    ]
    if dated:
        dated.sort(key=lambda window: window.start_time)
        return ResolvedDay(trainer_id, day, dated, "override")
    weekday = day.isoweekday()
    templates = [
        TimeWindow(row.start_time, row.end_time)
        for row in rules.templates
        if row.trainer_id == trainer_id and row.weekday == weekday
    ]
    templates.sort(key=lambda window: window.start_time)
    return ResolvedDay(trainer_id, day, templates, "template")


def resolve_range(
    trainer_ids: list[str],
    start: date,
    end: date,
    rules: ScheduleRules,
) -> list[ResolvedDay]:
    days: list[ResolvedDay] = []
    cursor = start
    while cursor <= end:
        for trainer_id in trainer_ids:
            days.append(resolve_day(trainer_id, cursor, rules))
        cursor = cursor + timedelta(days=1)
    return days


def occupying_lost(
    appointments: list,
    trainer_id: str,
    day: date,
    old_windows: list[TimeWindow],
    new_windows: list[TimeWindow],
) -> bool:
    for row in appointments:
        if getattr(row, "trainer_id", None) != trainer_id:
            continue
        if row.status not in {"pending", "confirmed"}:
            continue
        if to_madrid(row.starts_at).date() != day:
            continue
        if appointment_in_windows(row.starts_at, row.ends_at, day, old_windows) and not appointment_in_windows(
            row.starts_at, row.ends_at, day, new_windows
        ):
            return True
    return False


def has_lost_occupying(
    appointments: list,
    trainer_ids: set[str] | None,
    from_day: date,
    old_rules: ScheduleRules,
    new_rules: ScheduleRules,
) -> bool:
    days: set[date] = set()
    relevant: list = []
    for row in appointments:
        if row.status not in {"pending", "confirmed"}:
            continue
        trainer_id = row.trainer_id
        if trainer_ids is not None and trainer_id not in trainer_ids:
            continue
        day = to_madrid(row.starts_at).date()
        if day < from_day:
            continue
        relevant.append(row)
        days.add(day)
    for day in days:
        ids = trainer_ids if trainer_ids is not None else {row.trainer_id for row in relevant}
        for trainer_id in ids:
            old = resolve_day(trainer_id, day, old_rules)
            new = resolve_day(trainer_id, day, new_rules)
            if occupying_lost(relevant, trainer_id, day, old.windows, new.windows):
                return True
    return False
