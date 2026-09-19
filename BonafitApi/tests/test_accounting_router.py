from unittest import mock

from app.errors import ForbiddenError
from app.schemas import AccountingKpisOut, AccountingSummaryOut
from app.services.accounting import AccountingService, DISCLAIMER
from tests.api import AUTH, api
from datetime import UTC, datetime

KPIS = AccountingKpisOut(
    income=280,
    expense=80,
    result=200,
    paidIncome=280,
    pendingIncome=0,
    previousIncome=0,
    previousExpense=0,
    previousResult=0,
    incomeDelta=280,
    expenseDelta=80,
    resultDelta=200,
    vatCollected=0,
    vatDeductible=0,
    vatNet=0,
)

SUMMARY = AccountingSummaryOut.model_validate(
    {
        "timezone": "Europe/Madrid",
        "preset": "30d",
        "from": datetime(2026, 8, 21, tzinfo=UTC),
        "to": datetime(2026, 9, 20, tzinfo=UTC),
        "previousFrom": datetime(2026, 7, 22, tzinfo=UTC),
        "previousTo": datetime(2026, 8, 21, tzinfo=UTC),
        "disclaimer": DISCLAIMER,
        "kpis": KPIS,
        "series": [],
        "breakdown": [],
    }
)


def test_summary_admin() -> None:
    accounting = mock.Mock(spec=AccountingService)
    accounting.get_summary.return_value = SUMMARY
    with api(accounting=accounting) as http:
        response = http.get("/accounting/summary", params={"preset": "30d"}, headers=AUTH)
    assert response.status_code == 200
    assert response.json()["kpis"]["result"] == 200
    accounting.get_summary.assert_called_once_with("30d")


def test_summary_forbidden() -> None:
    accounting = mock.Mock(spec=AccountingService)
    auth = mock.Mock()
    auth.require_admin.side_effect = ForbiddenError()
    with api(accounting=accounting, auth=auth) as http:
        response = http.get("/accounting/summary", headers=AUTH)
    assert response.status_code == 403
    accounting.get_summary.assert_not_called()


def test_xlsx_content_type() -> None:
    accounting = mock.Mock(spec=AccountingService)
    accounting.report_xlsx.return_value = b"PK\x03\x04fake"
    with api(accounting=accounting) as http:
        response = http.get("/accounting/reports/pyg.xlsx", params={"preset": "month"}, headers=AUTH)
    assert response.status_code == 200
    assert response.headers["content-type"].startswith(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    accounting.report_xlsx.assert_called_once_with("pyg", "month")
