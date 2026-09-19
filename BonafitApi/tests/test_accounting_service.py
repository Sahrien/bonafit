from datetime import UTC, datetime

from app.errors import BusinessError
from app.models import AccountingEntry
from app.schemas import AccountingEntryPatch, AccountingEntryWrite, AccountingPeriodWrite
from app.services.accounting import AccountingService
from tests.factories import add_bono, add_client, add_client_bono, add_service


def _seed_sale(db, **overrides: object) -> None:
    add_client(db)
    add_service(db)
    add_bono(db)
    values: dict[str, object] = {"paid_price": 280, "list_price": 300}
    values.update(overrides)
    add_client_bono(db, **values)


def test_settings_defaults(accounting_service: AccountingService) -> None:
    settings = accounting_service.get_settings()
    assert settings.legalName
    assert settings.vatRegime == "unknown"
    assert settings.defaultVatRate == 0
    assert settings.currency == "EUR"
    assert accounting_service.list_categories()


def test_gift_does_not_create_income(db, accounting_service: AccountingService) -> None:
    _seed_sale(db, is_gift=True, paid_price=0)
    result = accounting_service.sync_sales()
    assert result.created == 0
    with db.session() as session:
        assert session.query(AccountingEntry).count() == 0


def test_sync_sales_idempotent(db, accounting_service: AccountingService) -> None:
    _seed_sale(db, purchased_at=datetime(2026, 9, 10, 10, tzinfo=UTC))
    first = accounting_service.sync_sales()
    second = accounting_service.sync_sales()
    assert first.created == 1
    assert second.created == 0
    assert second.skippedExisting == 1
    with db.session() as session:
        assert session.query(AccountingEntry).count() == 1


def test_lock_blocks_patch(db, accounting_service: AccountingService) -> None:

    _seed_sale(db, purchased_at=datetime(2026, 9, 10, 10, tzinfo=UTC))
    accounting_service.sync_sales()
    accounting_service.lock_period(AccountingPeriodWrite(year=2026, month=9))
    with db.session() as session:
        entry_id = session.query(AccountingEntry).one().id
    try:
        accounting_service.patch_entry(entry_id, AccountingEntryPatch(concept="nuevo"))
        raise AssertionError("expected lock")
    except BusinessError as error:
        assert error.code == "accounting.periodLocked"


def test_recurring_does_not_duplicate_month(accounting_service: AccountingService) -> None:
    created = accounting_service.create_entry(
        AccountingEntryWrite(
            type="expense",
            date=datetime(2026, 8, 5, 12, tzinfo=UTC),
            concept="Alquiler local",
            categoryId="expense-rent",
            amount=900,
            recurring=True,
            recurringDay=5,
        )
    )
    assert created.recurring is True
    first = accounting_service.generate_recurring(2026, 9)
    second = accounting_service.generate_recurring(2026, 9)
    assert first.created == 1
    assert second.created == 0
    assert second.skippedExisting >= 1


def test_summary_result_is_income_minus_expense(db, accounting_service: AccountingService) -> None:
    _seed_sale(db, purchased_at=datetime(2026, 9, 10, 10, tzinfo=UTC))
    accounting_service.sync_sales()
    accounting_service.create_entry(
        AccountingEntryWrite(
            type="expense",
            date=datetime(2026, 9, 12, 12, tzinfo=UTC),
            concept="Luz",
            categoryId="expense-utilities",
            amount=80,
        )
    )
    summary = accounting_service.get_summary("year", now=datetime(2026, 9, 19, 12, tzinfo=UTC))
    assert summary.kpis.income == 280
    assert summary.kpis.expense == 80
    assert summary.kpis.result == 200
    assert summary.disclaimer


def test_xlsx_bytes_are_workbook(accounting_service: AccountingService) -> None:
    data = accounting_service.report_xlsx("pyg", "year")
    assert data[:2] == b"PK"


def test_zero_paid_skips_income(db, accounting_service: AccountingService) -> None:
    _seed_sale(db, is_gift=False, paid_price=0)
    result = accounting_service.sync_sales()
    assert result.created == 0
