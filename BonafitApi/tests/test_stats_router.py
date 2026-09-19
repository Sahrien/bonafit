from datetime import UTC, datetime
from unittest import mock

from app.errors import ForbiddenError
from app.schemas import (
    StatsAgendaOut,
    StatsClientsOut,
    StatsEconomyOut,
    StatsMixOut,
    StatsMixSliceOut,
    StatsOut,
    StatsSeriesPointOut,
    StatsStatusCountOut,
)
from app.services.stats import StatsService
from tests.api import AUTH, api

EMPTY_MIX = StatsMixOut(
    packs=StatsMixSliceOut(units=0, paidRevenue=0),
    singles=StatsMixSliceOut(units=0, paidRevenue=0),
    gifts=StatsMixSliceOut(units=0, paidRevenue=0),
)

EMPTY_AGENDA = StatsAgendaOut(
    appointmentCount=0,
    previousAppointmentCount=0,
    occupancyRate=None,
    previousOccupancyRate=None,
    heatmap=[],
    heatmapHours=[],
    statuses=[
        StatsStatusCountOut(status="pending", count=0, previousCount=0),
        StatsStatusCountOut(status="confirmed", count=0, previousCount=0),
        StatsStatusCountOut(status="completed", count=0, previousCount=0),
        StatsStatusCountOut(status="cancelled", count=0, previousCount=0),
    ],
    trainers=[],
    emptySlots=[],
)
EMPTY_CLIENTS = StatsClientsOut(
    activeCount=0,
    previousActiveCount=0,
    newCount=0,
    previousNewCount=0,
    recurringCount=0,
    previousRecurringCount=0,
    formsPending=0,
    formsCompleted=0,
    previousFormsCompleted=0,
    atRisk=[],
)

STATS = StatsOut.model_validate(
    {
        "timezone": "Europe/Madrid",
        "preset": "30d",
        "from": datetime(2026, 8, 21, tzinfo=UTC),
        "to": datetime(2026, 9, 20, tzinfo=UTC),
        "previousFrom": datetime(2026, 7, 22, tzinfo=UTC),
        "previousTo": datetime(2026, 8, 21, tzinfo=UTC),
        "economy": StatsEconomyOut(
            paidRevenue=280,
            previousPaidRevenue=100,
            revenueDelta=180,
            averageTicket=280,
            discountRate=0.0667,
            paidCount=1,
            previousPaidCount=1,
            series=[StatsSeriesPointOut(bucket="2026-09-15", paidRevenue=280)],
            ranking=[],
            mix=EMPTY_MIX,
        ),
        "agenda": EMPTY_AGENDA,
        "clients": EMPTY_CLIENTS,
    }
)


def test_get_stats_admin() -> None:
    stats = mock.Mock(spec=StatsService)
    stats.get_stats.return_value = STATS
    with api(stats=stats) as http:
        response = http.get("/stats", params={"preset": "30d"}, headers=AUTH)
    assert response.status_code == 200
    body = response.json()
    assert body["preset"] == "30d"
    assert body["economy"]["paidRevenue"] == 280
    assert body["economy"]["mix"]["gifts"]["paidRevenue"] == 0
    stats.get_stats.assert_called_once_with("30d")


def test_get_stats_defaults_to_30d() -> None:
    stats = mock.Mock(spec=StatsService)
    stats.get_stats.return_value = STATS
    with api(stats=stats) as http:
        response = http.get("/stats", headers=AUTH)
    assert response.status_code == 200
    stats.get_stats.assert_called_once_with("30d")


def test_get_stats_forbidden_for_non_admin() -> None:
    stats = mock.Mock(spec=StatsService)
    auth = mock.Mock()
    auth.require_admin.side_effect = ForbiddenError()
    with api(stats=stats, auth=auth) as http:
        response = http.get("/stats", headers=AUTH)
    assert response.status_code == 403
    stats.get_stats.assert_not_called()
