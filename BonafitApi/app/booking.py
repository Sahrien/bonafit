from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

from app.config import settings

MADRID = ZoneInfo(settings.timezone)

OCCUPIES_SLOT = {"pending", "confirmed"}
CONSUMES_SESSION = {"confirmed", "completed"}
POOL_CATEGORIES = {"entrenamiento-personal", "hipopresivos"}


def to_madrid(value: datetime) -> datetime:
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return value.astimezone(MADRID)


def iso_weekday(value: datetime) -> int:
    return to_madrid(value).isoweekday()


def parse_time_parts(value: str) -> tuple[int, int]:
    hours_s, minutes_s = value.split(":")
    return int(hours_s), int(minutes_s)


def at_local_time(day: datetime, hhmm: str) -> datetime:
    local_day = to_madrid(day).replace(hour=0, minute=0, second=0, microsecond=0)
    hours, minutes = parse_time_parts(hhmm)
    return local_day.replace(hour=hours, minute=minutes)


def add_minutes(value: datetime, minutes: int) -> datetime:
    return value + timedelta(minutes=minutes)


def start_of_local_day(value: datetime) -> datetime:
    return to_madrid(value).replace(hour=0, minute=0, second=0, microsecond=0)


def earliest_bookable_local_date(now: datetime, cutoff_time: str) -> datetime:
    cutoff = at_local_time(now, cutoff_time)
    day = start_of_local_day(now)
    if to_madrid(now) < cutoff:
        day = day + timedelta(days=1)
    else:
        day = day + timedelta(days=2)
    return day


def ranges_overlap(a_start: datetime, a_end: datetime, b_start: datetime, b_end: datetime) -> bool:
    return a_start < b_end and a_end > b_start


def occupies_trainer_slot(status: str) -> bool:
    return status in OCCUPIES_SLOT


def is_active_client_appointment(status: str) -> bool:
    return status in OCCUPIES_SLOT


def consumes_session(status: str) -> bool:
    return status in CONSUMES_SESSION


def session_delta(previous_status: str | None, next_status: str) -> int:
    before = 1 if previous_status and consumes_session(previous_status) else 0
    after = 1 if consumes_session(next_status) else 0
    return before - after


def is_bono_expired(expires_at: datetime | None, now: datetime) -> bool:
    if expires_at is None:
        return False
    exp = expires_at if expires_at.tzinfo else expires_at.replace(tzinfo=UTC)
    current = now if now.tzinfo else now.replace(tzinfo=UTC)
    return exp <= current


def is_bono_usable(remaining: int, expires_at: datetime | None, now: datetime) -> bool:
    return remaining > 0 and not is_bono_expired(expires_at, now)


def pick_preferred_bono(rows: list, now: datetime):
    usable = [row for row in rows if is_bono_usable(row.remaining_sessions, row.expires_at, now)]
    if not usable:
        return None

    def sort_key(row):
        exp = row.expires_at.timestamp() if row.expires_at else float("inf")
        return (exp, row.remaining_sessions)

    return sorted(usable, key=sort_key)[0]


def status_on_create(actor: str, instant_confirm: bool) -> str:
    if actor == "admin" or instant_confirm:
        return "confirmed"
    return "pending"


def status_on_client_reschedule(instant_confirm: bool) -> str:
    return "confirmed" if instant_confirm else "pending"


def list_availability_slots(
    *,
    duration_minutes: int,
    schedules: list,
    appointments: list,
    cutoff_time: str,
    now: datetime,
    from_dt: datetime,
    to_dt: datetime,
    actor: str,
    trainer_id: str | None = None,
    ignore_appointment_id: str | None = None,
) -> list[dict]:
    if duration_minutes <= 0:
        return []
    earliest = earliest_bookable_local_date(now, cutoff_time) if actor == "client" else None
    busy = [
        row
        for row in appointments
        if occupies_trainer_slot(row.status) and row.id != ignore_appointment_id
    ]
    days: list[datetime] = []
    cursor = start_of_local_day(from_dt)
    last = start_of_local_day(to_dt)
    while cursor <= last:
        days.append(cursor)
        cursor = cursor + timedelta(days=1)

    slots: list[dict] = []
    for day in days:
        if earliest and day < earliest:
            continue
        weekday = day.isoweekday()
        for schedule in schedules:
            if schedule.weekday != weekday:
                continue
            if trainer_id and schedule.trainer_id != trainer_id:
                continue
            window_start = at_local_time(day, schedule.start_time)
            window_end = at_local_time(day, schedule.end_time)
            slot_start = window_start
            while add_minutes(slot_start, duration_minutes) <= window_end:
                slot_end = add_minutes(slot_start, duration_minutes)
                taken = any(
                    row.trainer_id == schedule.trainer_id
                    and ranges_overlap(slot_start, slot_end, to_madrid(row.starts_at), to_madrid(row.ends_at))
                    for row in busy
                )
                if not taken:
                    slots.append(
                        {
                            "trainerId": schedule.trainer_id,
                            "startsAt": to_utc_iso(slot_start),
                            "endsAt": to_utc_iso(slot_end),
                        }
                    )
                slot_start = slot_end
    return slots


def slot_matches(slots: list[dict], trainer_id: str, starts_at: datetime, ends_at: datetime) -> bool:
    start_iso = to_utc_iso(starts_at)
    end_iso = to_utc_iso(ends_at)
    return any(
        slot["trainerId"] == trainer_id and slot["startsAt"] == start_iso and slot["endsAt"] == end_iso
        for slot in slots
    )


def to_utc_iso(value: datetime) -> str:
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    utc = value.astimezone(UTC)
    millis = utc.microsecond // 1000
    return utc.strftime("%Y-%m-%dT%H:%M:%S") + f".{millis:03d}Z"


def parse_iso(value: str) -> datetime:
    normalized = value.replace("Z", "+00:00")
    parsed = datetime.fromisoformat(normalized)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=UTC)
    return parsed
