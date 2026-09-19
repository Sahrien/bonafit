from collections import defaultdict
from datetime import datetime, timedelta
from typing import NamedTuple

from sqlalchemy import or_, select

from app.booking import MADRID, parse_time_parts, to_madrid
from app.config import settings
from app.database import SessionFactory
from app.errors import BusinessError
from app.models import (
    Appointment,
    Bono,
    Client,
    ClientBono,
    FormAssignment,
    Service,
    Trainer,
    TrainerSchedule,
)
from app.schemas import (
    StatsAgendaOut,
    StatsAtRiskOut,
    StatsClientsOut,
    StatsEconomyOut,
    StatsEmptySlotOut,
    StatsHeatCellOut,
    StatsMixOut,
    StatsMixSliceOut,
    StatsOut,
    StatsPreset,
    StatsRankItemOut,
    StatsSeriesPointOut,
    StatsStatusCountOut,
    StatsTrainerOccupancyOut,
)

RANKING_LIMIT = 8
EMPTY_SLOT_LIMIT = 5
AT_RISK_LIMIT = 8
RISK_DAYS = 14
HEATMAP_HOURS = list(range(7, 22))
STATS_PRESETS = frozenset({"7d", "30d", "month", "90d"})
DEMAND_STATUSES = frozenset({"confirmed", "completed"})
OCCUPY_STATUSES = frozenset({"pending", "confirmed", "completed"})
ACTIVITY_STATUSES = frozenset({"pending", "confirmed", "completed"})
FUTURE_STATUSES = frozenset({"pending", "confirmed"})
APPOINTMENT_STATUSES = ("pending", "confirmed", "completed", "cancelled")


class PeriodWindow(NamedTuple):
    start: datetime
    end: datetime
    previous_start: datetime
    previous_end: datetime


class _Purchase(NamedTuple):
    purchased_at: datetime
    paid: float
    listed: float
    is_gift: bool
    session_count: int
    bono_id: str
    bono_name: str
    service_id: str
    service_name: str
    client_id: str


class _Appointment(NamedTuple):
    starts_at: datetime
    ends_at: datetime
    status: str
    trainer_id: str
    client_id: str


class _Schedule(NamedTuple):
    trainer_id: str
    weekday: int
    start_time: str
    end_time: str


class _BonoState(NamedTuple):
    client_id: str
    remaining_sessions: int
    expires_at: datetime | None


def _money(value: object) -> float:
    if value is None:
        return 0.0
    return round(float(value), 2)


def resolve_period(preset: str, now: datetime | None = None) -> PeriodWindow:
    if preset not in STATS_PRESETS:
        raise BusinessError("stats.invalidPreset", status_code=400)
    local_now = to_madrid(now or datetime.now(MADRID))
    today = local_now.date()
    if preset == "month":
        start = datetime(today.year, today.month, 1, tzinfo=MADRID)
        if today.month == 12:
            end = datetime(today.year + 1, 1, 1, tzinfo=MADRID)
        else:
            end = datetime(today.year, today.month + 1, 1, tzinfo=MADRID)
        if start.month == 1:
            previous_start = datetime(start.year - 1, 12, 1, tzinfo=MADRID)
        else:
            previous_start = datetime(start.year, start.month - 1, 1, tzinfo=MADRID)
        return PeriodWindow(start, end, previous_start, start)

    days = {"7d": 7, "30d": 30, "90d": 90}[preset]
    end = datetime.combine(today + timedelta(days=1), datetime.min.time(), tzinfo=MADRID)
    start = end - timedelta(days=days)
    previous_end = start
    previous_start = start - timedelta(days=days)
    return PeriodWindow(start, end, previous_start, previous_end)


def _in_window(value: datetime, start: datetime, end: datetime) -> bool:
    return start <= to_madrid(value) < end


def _minutes_between(start: datetime, end: datetime) -> int:
    return max(0, int((end - start).total_seconds() // 60))


def _window_minutes(start: datetime, end: datetime, window_start: datetime, window_end: datetime) -> int:
    overlap_start = max(start, window_start)
    overlap_end = min(end, window_end)
    return _minutes_between(overlap_start, overlap_end)


def _local_slot(day, hhmm: str) -> datetime:
    hours, minutes = parse_time_parts(hhmm)
    return datetime(day.year, day.month, day.day, hours, minutes, tzinfo=MADRID)


def _load_purchases(session_factory: SessionFactory, start: datetime, end: datetime) -> list[_Purchase]:
    with session_factory() as db:
        rows = db.execute(
            select(ClientBono, Bono, Service)
            .join(Bono, ClientBono.bono_id == Bono.id)
            .join(Service, Bono.service_id == Service.id)
            .where(ClientBono.purchased_at >= start, ClientBono.purchased_at < end)
        ).all()
        return [
            _Purchase(
                purchased_at=client_bono.purchased_at,
                paid=_money(client_bono.paid_price),
                listed=_money(client_bono.list_price),
                is_gift=bool(client_bono.is_gift),
                session_count=int(bono.session_count),
                bono_id=bono.id,
                bono_name=bono.name,
                service_id=service.id,
                service_name=service.name,
                client_id=client_bono.client_id,
            )
            for client_bono, bono, service in rows
        ]


def _paid_totals(purchases: list[_Purchase]) -> tuple[float, int]:
    paid = [item for item in purchases if not item.is_gift]
    return round(sum(item.paid for item in paid), 2), len(paid)


def _discount_rate(purchases: list[_Purchase]) -> float | None:
    eligible = [item for item in purchases if not item.is_gift and item.listed > 0]
    if not eligible:
        return None
    listed = sum(item.listed for item in eligible)
    paid = sum(item.paid for item in eligible)
    return round(1 - (paid / listed), 4)


def _mix(purchases: list[_Purchase]) -> StatsMixOut:
    packs = StatsMixSliceOut(units=0, paidRevenue=0)
    singles = StatsMixSliceOut(units=0, paidRevenue=0)
    gifts = StatsMixSliceOut(units=0, paidRevenue=0)
    for item in purchases:
        if item.is_gift:
            gifts = StatsMixSliceOut(units=gifts.units + 1, paidRevenue=0)
        elif item.session_count <= 1:
            singles = StatsMixSliceOut(
                units=singles.units + 1,
                paidRevenue=round(singles.paidRevenue + item.paid, 2),
            )
        else:
            packs = StatsMixSliceOut(
                units=packs.units + 1,
                paidRevenue=round(packs.paidRevenue + item.paid, 2),
            )
    return StatsMixOut(packs=packs, singles=singles, gifts=gifts)


def _ranking(purchases: list[_Purchase]) -> list[StatsRankItemOut]:
    services: dict[str, StatsRankItemOut] = {}
    packs: dict[str, StatsRankItemOut] = {}
    for item in purchases:
        if item.is_gift:
            continue
        service = services.get(item.service_id)
        if service is None:
            service = StatsRankItemOut(
                kind="service",
                id=item.service_id,
                name=item.service_name,
                paidRevenue=0,
                units=0,
            )
        services[item.service_id] = StatsRankItemOut(
            kind="service",
            id=item.service_id,
            name=item.service_name,
            paidRevenue=round(service.paidRevenue + item.paid, 2),
            units=service.units + 1,
        )
        if item.session_count > 1:
            pack = packs.get(item.bono_id)
            if pack is None:
                pack = StatsRankItemOut(
                    kind="pack",
                    id=item.bono_id,
                    name=item.bono_name,
                    paidRevenue=0,
                    units=0,
                )
            packs[item.bono_id] = StatsRankItemOut(
                kind="pack",
                id=item.bono_id,
                name=item.bono_name,
                paidRevenue=round(pack.paidRevenue + item.paid, 2),
                units=pack.units + 1,
            )
    ranked = [item for item in [*services.values(), *packs.values()] if item.paidRevenue > 0]
    ranked.sort(key=lambda item: (-item.paidRevenue, item.kind, item.name))
    return ranked[:RANKING_LIMIT]


def _series(purchases: list[_Purchase], start: datetime, end: datetime) -> list[StatsSeriesPointOut]:
    duration_days = (end - start).days
    paid = [item for item in purchases if not item.is_gift]
    if duration_days > 31:
        return _weekly_series(paid, start, end)
    return _daily_series(paid, start, end)


def _daily_series(purchases: list[_Purchase], start: datetime, end: datetime) -> list[StatsSeriesPointOut]:
    totals: dict[str, float] = defaultdict(float)
    for item in purchases:
        bucket = to_madrid(item.purchased_at).date().isoformat()
        totals[bucket] += item.paid
    points: list[StatsSeriesPointOut] = []
    day = to_madrid(start).date()
    last = (to_madrid(end) - timedelta(seconds=1)).date()
    while day <= last:
        key = day.isoformat()
        points.append(StatsSeriesPointOut(bucket=key, paidRevenue=round(totals.get(key, 0), 2)))
        day += timedelta(days=1)
    return points


def _weekly_series(purchases: list[_Purchase], start: datetime, end: datetime) -> list[StatsSeriesPointOut]:
    totals: dict[str, float] = defaultdict(float)
    for item in purchases:
        local = to_madrid(item.purchased_at)
        monday = local.date() - timedelta(days=local.weekday())
        totals[monday.isoformat()] += item.paid
    points: list[StatsSeriesPointOut] = []
    local_start = to_madrid(start)
    cursor = local_start.date() - timedelta(days=local_start.weekday())
    last = to_madrid(end)
    while cursor < last.date():
        key = cursor.isoformat()
        points.append(StatsSeriesPointOut(bucket=key, paidRevenue=round(totals.get(key, 0), 2)))
        cursor += timedelta(days=7)
    return points


def _economy(current: list[_Purchase], previous: list[_Purchase], start: datetime, end: datetime) -> StatsEconomyOut:
    paid_revenue, paid_count = _paid_totals(current)
    previous_revenue, previous_count = _paid_totals(previous)
    average = round(paid_revenue / paid_count, 2) if paid_count else 0.0
    return StatsEconomyOut(
        paidRevenue=paid_revenue,
        previousPaidRevenue=previous_revenue,
        revenueDelta=round(paid_revenue - previous_revenue, 2),
        averageTicket=average,
        discountRate=_discount_rate(current),
        paidCount=paid_count,
        previousPaidCount=previous_count,
        series=_series(current, start, end),
        ranking=_ranking(current),
        mix=_mix(current),
    )


def _period_days(start: datetime, end: datetime):
    day = to_madrid(start).date()
    last = (to_madrid(end) - timedelta(seconds=1)).date()
    while day <= last:
        yield day
        day += timedelta(days=1)


def _occupancy(
    appointments: list[_Appointment],
    schedules: list[_Schedule],
    trainers: dict[str, str],
    start: datetime,
    end: datetime,
) -> tuple[float | None, list[StatsTrainerOccupancyOut]]:
    booked: dict[str, int] = defaultdict(int)
    for item in appointments:
        if item.status not in OCCUPY_STATUSES:
            continue
        minutes = _window_minutes(to_madrid(item.starts_at), to_madrid(item.ends_at), start, end)
        if minutes:
            booked[item.trainer_id] += minutes
    scheduled: dict[str, int] = defaultdict(int)
    for day in _period_days(start, end):
        weekday = day.isoweekday()
        for slot in schedules:
            if slot.weekday != weekday:
                continue
            slot_start = _local_slot(day, slot.start_time)
            slot_end = _local_slot(day, slot.end_time)
            scheduled[slot.trainer_id] += _minutes_between(slot_start, slot_end)
    rows: list[StatsTrainerOccupancyOut] = []
    trainer_ids = sorted({*booked, *scheduled, *trainers}, key=lambda trainer_id: trainers.get(trainer_id, trainer_id))
    total_booked = 0
    total_scheduled = 0
    for trainer_id in trainer_ids:
        booked_minutes = booked.get(trainer_id, 0)
        schedule_minutes = scheduled.get(trainer_id, 0)
        total_booked += booked_minutes
        total_scheduled += schedule_minutes
        rate = round(booked_minutes / schedule_minutes, 4) if schedule_minutes else None
        rows.append(
            StatsTrainerOccupancyOut(
                trainerId=trainer_id,
                name=trainers.get(trainer_id, trainer_id),
                bookedMinutes=booked_minutes,
                scheduleMinutes=schedule_minutes,
                occupancyRate=rate,
            )
        )
    overall = round(total_booked / total_scheduled, 4) if total_scheduled else None
    return overall, rows


def _heatmap(appointments: list[_Appointment]) -> list[StatsHeatCellOut]:
    counts: dict[tuple[int, int], int] = defaultdict(int)
    for item in appointments:
        if item.status not in DEMAND_STATUSES:
            continue
        local = to_madrid(item.starts_at)
        hour = local.hour
        if hour not in HEATMAP_HOURS:
            continue
        counts[(local.isoweekday(), hour)] += 1
    return [
        StatsHeatCellOut(weekday=weekday, hour=hour, count=counts.get((weekday, hour), 0))
        for weekday in range(1, 8)
        for hour in HEATMAP_HOURS
    ]


def _statuses(current: list[_Appointment], previous: list[_Appointment]) -> list[StatsStatusCountOut]:
    current_counts = defaultdict(int)
    previous_counts = defaultdict(int)
    for item in current:
        current_counts[item.status] += 1
    for item in previous:
        previous_counts[item.status] += 1
    return [
        StatsStatusCountOut(
            status=status,  # type: ignore[arg-type]
            count=current_counts[status],
            previousCount=previous_counts[status],
        )
        for status in APPOINTMENT_STATUSES
    ]


def _empty_slots(
    appointments: list[_Appointment],
    schedules: list[_Schedule],
    start: datetime,
    end: datetime,
) -> list[StatsEmptySlotOut]:
    occupying = [item for item in appointments if item.status in OCCUPY_STATUSES]
    grouped: dict[tuple[str, int, str, str], list[int]] = defaultdict(lambda: [0, 0])
    for day in _period_days(start, end):
        weekday = day.isoweekday()
        for slot in schedules:
            if slot.weekday != weekday:
                continue
            slot_start = _local_slot(day, slot.start_time)
            slot_end = _local_slot(day, slot.end_time)
            key = (slot.trainer_id, slot.weekday, slot.start_time, slot.end_time)
            grouped[key][1] += 1
            busy = any(
                item.trainer_id == slot.trainer_id
                and to_madrid(item.starts_at) < slot_end
                and to_madrid(item.ends_at) > slot_start
                for item in occupying
            )
            if not busy:
                grouped[key][0] += 1
    rows = [
        StatsEmptySlotOut(
            weekday=weekday,
            startTime=start_time,
            endTime=end_time,
            emptyDays=empty,
            scheduledDays=scheduled,
        )
        for (_trainer, weekday, start_time, end_time), (empty, scheduled) in grouped.items()
        if scheduled and empty
    ]
    rows.sort(key=lambda item: (-item.emptyDays, item.weekday, item.startTime))
    return rows[:EMPTY_SLOT_LIMIT]


def _agenda(
    current: list[_Appointment],
    previous: list[_Appointment],
    schedules: list[_Schedule],
    trainers: dict[str, str],
    start: datetime,
    end: datetime,
    previous_start: datetime,
    previous_end: datetime,
) -> StatsAgendaOut:
    occupancy, trainer_rows = _occupancy(current, schedules, trainers, start, end)
    previous_occupancy, _ = _occupancy(previous, schedules, trainers, previous_start, previous_end)
    demand = [item for item in current if item.status in DEMAND_STATUSES]
    previous_demand = [item for item in previous if item.status in DEMAND_STATUSES]
    return StatsAgendaOut(
        appointmentCount=len(demand),
        previousAppointmentCount=len(previous_demand),
        occupancyRate=occupancy,
        previousOccupancyRate=previous_occupancy,
        heatmap=_heatmap(current),
        heatmapHours=HEATMAP_HOURS,
        statuses=_statuses(current, previous),
        trainers=trainer_rows,
        emptySlots=_empty_slots(current, schedules, start, end),
    )


def _first_activity(purchases: list[_Purchase], appointments: list[_Appointment]) -> dict[str, datetime]:
    first: dict[str, datetime] = {}
    for item in purchases:
        current = first.get(item.client_id)
        if current is None or to_madrid(item.purchased_at) < to_madrid(current):
            first[item.client_id] = item.purchased_at
    for item in appointments:
        if item.status not in ACTIVITY_STATUSES:
            continue
        current = first.get(item.client_id)
        if current is None or to_madrid(item.starts_at) < to_madrid(current):
            first[item.client_id] = item.starts_at
    return first


def _active_ids(purchases: list[_Purchase], appointments: list[_Appointment]) -> set[str]:
    ids = {item.client_id for item in purchases}
    ids.update(item.client_id for item in appointments if item.status in ACTIVITY_STATUSES)
    return ids


def _recurring_count(purchases: list[_Purchase], end: datetime) -> int:
    counts: dict[str, int] = defaultdict(int)
    for item in purchases:
        if item.is_gift or not to_madrid(item.purchased_at) < end:
            continue
        counts[item.client_id] += 1
    return sum(1 for count in counts.values() if count >= 2)


def _at_risk(
    bonos: list[_BonoState],
    appointments: list[_Appointment],
    names: dict[str, str],
    now: datetime,
) -> list[StatsAtRiskOut]:
    future = {
        item.client_id
        for item in appointments
        if item.status in FUTURE_STATUSES and to_madrid(item.starts_at) >= now
    }
    horizon = now + timedelta(days=RISK_DAYS)
    latest: dict[str, _BonoState] = {}
    for item in bonos:
        current = latest.get(item.client_id)
        if current is None:
            latest[item.client_id] = item
            continue
        if item.remaining_sessions > current.remaining_sessions:
            latest[item.client_id] = item
        elif item.remaining_sessions == current.remaining_sessions:
            expires = to_madrid(item.expires_at) if item.expires_at else datetime.max.replace(tzinfo=MADRID)
            current_expires = (
                to_madrid(current.expires_at) if current.expires_at else datetime.max.replace(tzinfo=MADRID)
            )
            if expires < current_expires:
                latest[item.client_id] = item
    rows: list[StatsAtRiskOut] = []
    for client_id, item in latest.items():
        expires = to_madrid(item.expires_at) if item.expires_at else None
        if item.remaining_sessions <= 0 and client_id not in future:
            rows.append(
                StatsAtRiskOut(
                    clientId=client_id,
                    name=names.get(client_id, client_id),
                    reason="noSessions",
                    remainingSessions=item.remaining_sessions,
                    expiresAt=expires,
                )
            )
        elif (
            item.remaining_sessions > 0
            and expires is not None
            and now <= expires < horizon
        ):
            rows.append(
                StatsAtRiskOut(
                    clientId=client_id,
                    name=names.get(client_id, client_id),
                    reason="expiring",
                    remainingSessions=item.remaining_sessions,
                    expiresAt=expires,
                )
            )
    rows.sort(key=lambda item: (item.reason != "noSessions", item.name))
    return rows[:AT_RISK_LIMIT]


def _clients_block(
    current_purchases: list[_Purchase],
    previous_purchases: list[_Purchase],
    history_purchases: list[_Purchase],
    current_appointments: list[_Appointment],
    previous_appointments: list[_Appointment],
    all_appointments: list[_Appointment],
    bonos: list[_BonoState],
    names: dict[str, str],
    assignments: list[tuple[str, datetime, datetime | None]],
    start: datetime,
    end: datetime,
    previous_start: datetime,
    previous_end: datetime,
    now: datetime,
) -> StatsClientsOut:
    active = _active_ids(current_purchases, current_appointments)
    previous_active = _active_ids(previous_purchases, previous_appointments)
    first = _first_activity(history_purchases, all_appointments)
    new_count = sum(1 for client_id, moment in first.items() if _in_window(moment, start, end))
    previous_new = sum(1 for client_id, moment in first.items() if _in_window(moment, previous_start, previous_end))
    pending = 0
    completed = 0
    previous_completed = 0
    for status, assigned_at, submitted_at in assignments:
        if status == "pending" and _in_window(assigned_at, start, end):
            pending += 1
        if submitted_at is not None and _in_window(submitted_at, start, end):
            completed += 1
        if submitted_at is not None and _in_window(submitted_at, previous_start, previous_end):
            previous_completed += 1
    return StatsClientsOut(
        activeCount=len(active),
        previousActiveCount=len(previous_active),
        newCount=new_count,
        previousNewCount=previous_new,
        recurringCount=_recurring_count(history_purchases, end),
        previousRecurringCount=_recurring_count(history_purchases, previous_end),
        formsPending=pending,
        formsCompleted=completed,
        previousFormsCompleted=previous_completed,
        atRisk=_at_risk(bonos, all_appointments, names, now),
    )


class StatsService:
    def __init__(self, session_factory: SessionFactory) -> None:
        self._session_factory = session_factory

    def get_stats(self, preset: StatsPreset, now: datetime | None = None) -> StatsOut:
        local_now = to_madrid(now or datetime.now(MADRID))
        window = resolve_period(preset, local_now)
        history = _load_purchases(self._session_factory, datetime(1970, 1, 1, tzinfo=MADRID), window.end)
        current = [item for item in history if _in_window(item.purchased_at, window.start, window.end)]
        previous = [
            item for item in history if _in_window(item.purchased_at, window.previous_start, window.previous_end)
        ]
        appointments, schedules, trainers, names, bonos, assignments = self._load_ops(window.previous_start)
        current_apts = [item for item in appointments if _in_window(item.starts_at, window.start, window.end)]
        previous_apts = [
            item for item in appointments if _in_window(item.starts_at, window.previous_start, window.previous_end)
        ]
        return StatsOut.model_validate(
            {
                "timezone": settings.timezone,
                "preset": preset,
                "from": window.start,
                "to": window.end,
                "previousFrom": window.previous_start,
                "previousTo": window.previous_end,
                "economy": _economy(current, previous, window.start, window.end),
                "agenda": _agenda(
                    current_apts,
                    previous_apts,
                    schedules,
                    trainers,
                    window.start,
                    window.end,
                    window.previous_start,
                    window.previous_end,
                ),
                "clients": _clients_block(
                    current,
                    previous,
                    history,
                    current_apts,
                    previous_apts,
                    appointments,
                    bonos,
                    names,
                    assignments,
                    window.start,
                    window.end,
                    window.previous_start,
                    window.previous_end,
                    local_now,
                ),
            }
        )

    def _load_ops(
        self, since: datetime
    ) -> tuple[
        list[_Appointment],
        list[_Schedule],
        dict[str, str],
        dict[str, str],
        list[_BonoState],
        list[tuple[str, datetime, datetime | None]],
    ]:
        with self._session_factory() as db:
            appointments = [
                _Appointment(
                    starts_at=row.starts_at,
                    ends_at=row.ends_at,
                    status=row.status,
                    trainer_id=row.trainer_id,
                    client_id=row.client_id,
                )
                for row in db.scalars(select(Appointment).where(Appointment.starts_at >= since)).all()
            ]
            schedules = [
                _Schedule(
                    trainer_id=row.trainer_id,
                    weekday=row.weekday,
                    start_time=row.start_time,
                    end_time=row.end_time,
                )
                for row in db.scalars(select(TrainerSchedule)).all()
            ]
            trainers = {row.id: row.name for row in db.scalars(select(Trainer)).all()}
            names = {
                row.id: f"{row.first_name} {row.last_name}".strip()
                for row in db.scalars(select(Client)).all()
            }
            bonos = [
                _BonoState(
                    client_id=row.client_id,
                    remaining_sessions=row.remaining_sessions,
                    expires_at=row.expires_at,
                )
                for row in db.scalars(select(ClientBono)).all()
            ]
            assignments = [
                (row.status, row.assigned_at, row.submitted_at)
                for row in db.scalars(
                    select(FormAssignment).where(
                        or_(
                            FormAssignment.assigned_at >= since,
                            FormAssignment.submitted_at >= since,
                        )
                    )
                ).all()
            ]
        return appointments, schedules, trainers, names, bonos, assignments
