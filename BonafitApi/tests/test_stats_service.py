from datetime import UTC, datetime

from app.booking import MADRID
from app.database import Database
from app.errors import BusinessError
from app.services.stats import StatsService, resolve_period
from tests.factories import (
    add_appointment,
    add_bono,
    add_client,
    add_client_bono,
    add_form,
    add_form_assignment,
    add_schedule,
    add_service,
    add_trainer,
)

NOW = datetime(2026, 9, 19, 21, 0, tzinfo=MADRID)


def _catalog(db: Database) -> None:
    add_client(db)
    add_service(db, name="EP")
    add_bono(db, name="10-pack", session_count=10, price=300)
    add_service(db, id="svc-2", name="Masaje")
    add_bono(db, id="bono-single", service_id="svc-2", name="sesion-suelta", session_count=1, price=45)


def test_gifts_are_excluded_from_paid_revenue(stats_service: StatsService, db: Database) -> None:
    _catalog(db)
    add_client_bono(
        db,
        paid_price=280,
        list_price=300,
        purchased_at=datetime(2026, 9, 15, 10, tzinfo=MADRID),
    )
    add_client_bono(
        db,
        id="cb-gift",
        is_gift=True,
        paid_price=300,
        list_price=300,
        purchased_at=datetime(2026, 9, 16, 10, tzinfo=MADRID),
    )

    out = stats_service.get_stats("30d", now=NOW)

    assert out.economy.paidRevenue == 280
    assert out.economy.paidCount == 1
    assert out.economy.mix.gifts.units == 1
    assert out.economy.mix.gifts.paidRevenue == 0
    assert out.economy.mix.packs.units == 1
    assert out.economy.mix.packs.paidRevenue == 280


def test_compares_against_previous_period(stats_service: StatsService, db: Database) -> None:
    _catalog(db)
    add_client_bono(
        db,
        paid_price=100,
        list_price=100,
        purchased_at=datetime(2026, 9, 15, 10, tzinfo=MADRID),
    )
    add_client_bono(
        db,
        id="cb-prev",
        paid_price=80,
        list_price=80,
        purchased_at=datetime(2026, 9, 8, 10, tzinfo=MADRID),
    )

    out = stats_service.get_stats("7d", now=NOW)

    assert out.economy.paidRevenue == 100
    assert out.economy.previousPaidRevenue == 80
    assert out.economy.revenueDelta == 20
    assert out.economy.paidCount == 1
    assert out.economy.previousPaidCount == 1


def test_mix_splits_packs_singles_and_gifts(stats_service: StatsService, db: Database) -> None:
    _catalog(db)
    add_client_bono(
        db,
        paid_price=280,
        list_price=300,
        purchased_at=datetime(2026, 9, 15, 10, tzinfo=MADRID),
    )
    add_client_bono(
        db,
        id="cb-single",
        bono_id="bono-single",
        paid_price=45,
        list_price=45,
        purchased_at=datetime(2026, 9, 16, 10, tzinfo=MADRID),
    )
    add_client_bono(
        db,
        id="cb-gift",
        is_gift=True,
        paid_price=45,
        list_price=45,
        purchased_at=datetime(2026, 9, 17, 10, tzinfo=MADRID),
    )

    out = stats_service.get_stats("30d", now=NOW)
    mix = out.economy.mix
    assert mix.packs.units == 1
    assert mix.packs.paidRevenue == 280
    assert mix.singles.units == 1
    assert mix.singles.paidRevenue == 45
    assert mix.gifts.units == 1
    assert mix.gifts.paidRevenue == 0
    assert out.economy.averageTicket == 162.5
    assert out.economy.discountRate == round(1 - (325 / 345), 4)
    names = {(item.kind, item.name) for item in out.economy.ranking}
    assert ("service", "EP") in names
    assert ("pack", "10-pack") in names
    assert ("service", "Masaje") in names


def test_null_paid_price_counts_as_zero(stats_service: StatsService, db: Database) -> None:
    _catalog(db)
    add_client_bono(db, paid_price=None, list_price=300, purchased_at=datetime(2026, 9, 15, 10, tzinfo=MADRID))

    out = stats_service.get_stats("30d", now=NOW)

    assert out.economy.paidRevenue == 0
    assert out.economy.paidCount == 1
    assert out.economy.averageTicket == 0
    assert out.economy.discountRate == 1


def test_empty_period_has_zero_kpis_and_daily_series(stats_service: StatsService) -> None:
    out = stats_service.get_stats("7d", now=NOW)
    assert out.timezone == "Europe/Madrid"
    assert out.economy.paidRevenue == 0
    assert out.economy.discountRate is None
    assert out.economy.ranking == []
    assert len(out.economy.series) == 7
    assert all(point.paidRevenue == 0 for point in out.economy.series)


def test_month_preset_uses_calendar_month(stats_service: StatsService) -> None:
    window = resolve_period("month", NOW)
    assert window.start == datetime(2026, 9, 1, tzinfo=MADRID)
    assert window.end == datetime(2026, 10, 1, tzinfo=MADRID)
    assert window.previous_start == datetime(2026, 8, 1, tzinfo=MADRID)
    assert window.previous_end == window.start
    out = stats_service.get_stats("month", now=NOW)
    assert out.preset == "month"
    assert len(out.economy.series) == 30


def test_90d_uses_weekly_series(stats_service: StatsService) -> None:
    out = stats_service.get_stats("90d", now=NOW)
    assert len(out.economy.series) >= 13
    assert len(out.economy.series) <= 15


def test_invalid_preset_is_business_error() -> None:
    try:
        resolve_period("year")
    except BusinessError as exc:
        assert exc.code == "stats.invalidPreset"
        assert exc.status_code == 400
    else:
        raise AssertionError("expected BusinessError")


def test_heatmap_counts_confirmed_and_completed_not_cancelled(
    stats_service: StatsService, db: Database
) -> None:
    add_client(db)
    add_trainer(db)
    add_service(db)
    add_appointment(
        db,
        starts_at=datetime(2026, 9, 16, 8, 0, tzinfo=UTC),
        ends_at=datetime(2026, 9, 16, 9, 0, tzinfo=UTC),
        status="confirmed",
    )
    add_appointment(
        db,
        id="apt-done",
        starts_at=datetime(2026, 9, 16, 9, 0, tzinfo=UTC),
        ends_at=datetime(2026, 9, 16, 10, 0, tzinfo=UTC),
        status="completed",
    )
    add_appointment(
        db,
        id="apt-cancel",
        starts_at=datetime(2026, 9, 16, 10, 0, tzinfo=UTC),
        ends_at=datetime(2026, 9, 16, 11, 0, tzinfo=UTC),
        status="cancelled",
    )

    out = stats_service.get_stats("7d", now=NOW)
    ten = next(cell for cell in out.agenda.heatmap if cell.weekday == 3 and cell.hour == 10)
    eleven = next(cell for cell in out.agenda.heatmap if cell.weekday == 3 and cell.hour == 11)
    twelve = next(cell for cell in out.agenda.heatmap if cell.weekday == 3 and cell.hour == 12)
    assert ten.count == 1
    assert eleven.count == 1
    assert twelve.count == 0
    cancelled = next(item for item in out.agenda.statuses if item.status == "cancelled")
    assert cancelled.count == 1


def test_occupancy_uses_schedule_minutes_and_occupying_appointments(
    stats_service: StatsService, db: Database
) -> None:
    add_client(db)
    add_trainer(db)
    add_service(db)
    add_schedule(db, weekday=3, start_time="10:00", end_time="12:00")
    add_schedule(db, id="sch-2", weekday=2, start_time="10:00", end_time="12:00")
    add_appointment(
        db,
        starts_at=datetime(2026, 9, 16, 8, 0, tzinfo=UTC),
        ends_at=datetime(2026, 9, 16, 9, 0, tzinfo=UTC),
        status="confirmed",
    )

    out = stats_service.get_stats("7d", now=NOW)
    assert out.agenda.occupancyRate == 0.25
    assert out.agenda.trainers[0].scheduleMinutes == 240
    assert out.agenda.trainers[0].bookedMinutes == 60
    assert out.agenda.emptySlots[0].weekday == 2
    assert out.agenda.emptySlots[0].emptyDays == 1


def test_new_clients_need_first_activity_in_period(stats_service: StatsService, db: Database) -> None:
    add_client(db)
    add_client(db, id="client-2", email="pablo@example.com", first_name="Pablo", last_name="Nieto")
    add_trainer(db)
    add_service(db)
    add_bono(db)
    add_client_bono(
        db,
        paid_price=100,
        list_price=100,
        purchased_at=datetime(2026, 8, 1, 10, tzinfo=MADRID),
    )
    add_appointment(
        db,
        client_id="client-2",
        starts_at=datetime(2026, 9, 15, 8, 0, tzinfo=UTC),
        ends_at=datetime(2026, 9, 15, 9, 0, tzinfo=UTC),
        status="confirmed",
    )
    add_client_bono(
        db,
        id="cb-2",
        client_id="client-2",
        paid_price=80,
        list_price=80,
        purchased_at=datetime(2026, 9, 16, 10, tzinfo=MADRID),
    )
    add_client_bono(
        db,
        id="cb-3",
        client_id="client-2",
        paid_price=80,
        list_price=80,
        purchased_at=datetime(2026, 9, 17, 10, tzinfo=MADRID),
    )

    out = stats_service.get_stats("7d", now=NOW)
    assert out.clients.activeCount == 1
    assert out.clients.newCount == 1
    assert out.clients.recurringCount == 1


def test_at_risk_zero_sessions_without_future_appointment(
    stats_service: StatsService, db: Database
) -> None:
    add_client(db)
    add_trainer(db)
    add_service(db)
    add_bono(db)
    add_client_bono(
        db,
        remaining_sessions=0,
        paid_price=100,
        list_price=100,
        purchased_at=datetime(2026, 8, 1, 10, tzinfo=MADRID),
        expires_at=None,
    )

    out = stats_service.get_stats("30d", now=NOW)
    assert out.clients.atRisk[0].reason == "noSessions"
    assert out.clients.atRisk[0].clientId == "client-1"


def test_forms_pending_and_completed_in_period(stats_service: StatsService, db: Database) -> None:
    add_client(db)
    add_form(db)
    add_form_assignment(db, assigned_at=datetime(2026, 9, 15, 10, tzinfo=MADRID), status="pending")
    add_form_assignment(
        db,
        id="asg-2",
        assigned_at=datetime(2026, 9, 10, 10, tzinfo=MADRID),
        submitted_at=datetime(2026, 9, 16, 10, tzinfo=MADRID),
        status="completed",
    )

    out = stats_service.get_stats("7d", now=NOW)
    assert out.clients.formsPending == 1
    assert out.clients.formsCompleted == 1
