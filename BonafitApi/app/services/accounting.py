from calendar import monthrange
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path
from typing import NamedTuple

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.booking import MADRID, to_madrid
from app.config import settings
from app.database import SessionFactory
from app.errors import BusinessError, NotFoundError
from app.identity import utcnow
from app.models import (
    AccountingCategory,
    AccountingEntry,
    AccountingPeriodLock,
    AccountingSettings,
    Bono,
    Branding,
    Client,
    ClientBono,
)
from app.schemas import (
    AccountingBreakdownOut,
    AccountingCategoryOut,
    AccountingCategoryPatch,
    AccountingCategoryWrite,
    AccountingEntryOut,
    AccountingEntryPatch,
    AccountingEntryWrite,
    AccountingKpisOut,
    AccountingPeriodLockOut,
    AccountingPeriodWrite,
    AccountingPreset,
    AccountingRecurringOut,
    AccountingReportKind,
    AccountingReportOut,
    AccountingSeriesPointOut,
    AccountingSettingsOut,
    AccountingSettingsWrite,
    AccountingSummaryOut,
    AccountingSyncOut,
)

SETTINGS_ID = "accounting-settings"
DISCLAIMER = "Resumen interno. No sustituye a tu gestoría ni a Hacienda."
DOCUMENT_DISCLAIMER = (
    "Documento interno — no válido como factura ni como declaración tributaria."
)
ACCOUNTING_PRESETS = frozenset({"7d", "30d", "month", "quarter", "90d", "year"})
INCOME_PACKS_ID = "income-packs"
INCOME_SINGLES_ID = "income-singles"

CATEGORY_SEED: tuple[tuple[str, str, str, dict[str, dict[str, str]], int], ...] = (
    (INCOME_PACKS_ID, "income", "Bonos y packs", {"en": {"name": "Packs"}}, 10),
    (INCOME_SINGLES_ID, "income", "Sesión suelta", {"en": {"name": "Single session"}}, 20),
    ("income-other", "income", "Otros", {"en": {"name": "Other"}}, 30),
    ("expense-rent", "expense", "Alquiler", {"en": {"name": "Rent"}}, 10),
    ("expense-utilities", "expense", "Suministros (luz/agua/internet)", {"en": {"name": "Utilities"}}, 20),
    ("expense-supplies", "expense", "Material y consumibles", {"en": {"name": "Supplies"}}, 30),
    ("expense-software", "expense", "Software y suscripciones", {"en": {"name": "Software"}}, 40),
    ("expense-marketing", "expense", "Marketing", {"en": {"name": "Marketing"}}, 50),
    ("expense-insurance", "expense", "Seguros", {"en": {"name": "Insurance"}}, 60),
    ("expense-taxes", "expense", "Impuestos y tasas", {"en": {"name": "Taxes"}}, 70),
    ("expense-maintenance", "expense", "Mantenimiento", {"en": {"name": "Maintenance"}}, 80),
    ("expense-training", "expense", "Formación", {"en": {"name": "Training"}}, 90),
    ("expense-other", "expense", "Otros", {"en": {"name": "Other"}}, 100),
)

REPORT_TITLES = {
    "pyg": "Resultado",
    "vat": "IVA del periodo",
    "cash": "Tesorería",
    "income-book": "Libro de ingresos",
    "expense-book": "Libro de gastos",
}


class PeriodWindow(NamedTuple):
    start: datetime
    end: datetime
    previous_start: datetime
    previous_end: datetime


def _money(value: object) -> float:
    if value is None:
        return 0.0
    return round(float(value), 2)


def _split_vat(amount: float, vat_rate: float) -> tuple[float, float, float]:
    total = _money(amount)
    rate = max(0.0, float(vat_rate or 0))
    if rate <= 0 or total <= 0:
        return total, 0.0, total
    net = _money(total / (1 + rate / 100))
    vat = _money(total - net)
    return total, vat, net


def _paid_for(amount: float, status: str, paid_amount: float | None) -> float:
    total = _money(amount)
    if status == "paid":
        return total if paid_amount is None else _money(paid_amount)
    if status == "pending":
        return 0.0 if paid_amount is None else _money(paid_amount)
    if paid_amount is None:
        return 0.0
    return min(total, _money(paid_amount))


def resolve_period(preset: str, now: datetime | None = None) -> PeriodWindow:
    if preset not in ACCOUNTING_PRESETS:
        raise BusinessError("accounting.invalidPreset", status_code=400)
    local_now = to_madrid(now or datetime.now(MADRID))
    today = local_now.date()
    if preset == "month":
        start = datetime(today.year, today.month, 1, tzinfo=MADRID)
        end = _add_months(start, 1)
        previous_start = _add_months(start, -1)
        return PeriodWindow(start, end, previous_start, start)
    if preset == "quarter":
        quarter = (today.month - 1) // 3
        start = datetime(today.year, quarter * 3 + 1, 1, tzinfo=MADRID)
        end = _add_months(start, 3)
        previous_start = _add_months(start, -3)
        return PeriodWindow(start, end, previous_start, start)
    if preset == "year":
        start = datetime(today.year, 1, 1, tzinfo=MADRID)
        end = datetime(today.year + 1, 1, 1, tzinfo=MADRID)
        previous_start = datetime(today.year - 1, 1, 1, tzinfo=MADRID)
        return PeriodWindow(start, end, previous_start, start)
    days = {"7d": 7, "30d": 30, "90d": 90}[preset]
    end = datetime.combine(today + timedelta(days=1), datetime.min.time(), tzinfo=MADRID)
    start = end - timedelta(days=days)
    return PeriodWindow(start, end, start - timedelta(days=days), start)


def _add_months(value: datetime, months: int) -> datetime:
    month_index = value.year * 12 + (value.month - 1) + months
    year, month = divmod(month_index, 12)
    return value.replace(year=year, month=month + 1, day=1)


def _in_window(value: datetime, start: datetime, end: datetime) -> bool:
    return start <= to_madrid(value) < end


class AccountingService:
    def __init__(self, session_factory: SessionFactory, uploads_dir: str = "uploads") -> None:
        self._session_factory = session_factory
        self._uploads_dir = Path(uploads_dir)

    def get_settings(self) -> AccountingSettingsOut:
        with self._session_factory() as db:
            return _settings_out(_ensure_ready(db))

    def update_settings(self, payload: AccountingSettingsWrite) -> AccountingSettingsOut:
        with self._session_factory() as db:
            row = _ensure_ready(db)
            name = payload.legalName.strip()
            if not name:
                raise BusinessError("accounting.invalidName", status_code=400)
            day = payload.defaultRecurringDay
            if day < 1 or day > 28:
                raise BusinessError("accounting.invalidRecurringDay", status_code=400)
            month = payload.fiscalYearStartMonth
            if month < 1 or month > 12:
                raise BusinessError("accounting.invalidFiscalMonth", status_code=400)
            row.legal_name = name
            row.tax_id = (payload.taxId or "").strip() or None
            row.address = (payload.address or "").strip() or None
            row.vat_regime = payload.vatRegime
            row.default_vat_rate = _money(payload.defaultVatRate)
            row.fiscal_year_start_month = month
            row.default_recurring_day = day
            row.notes = (payload.notes or "").strip() or None
            return _settings_out(row)

    def list_categories(self, kind: str | None = None) -> list[AccountingCategoryOut]:
        with self._session_factory() as db:
            _ensure_ready(db)
            query = select(AccountingCategory).order_by(AccountingCategory.kind, AccountingCategory.sort_order)
            if kind:
                query = query.where(AccountingCategory.kind == kind)
            return [_category_out(row) for row in db.scalars(query).all()]

    def create_category(self, payload: AccountingCategoryWrite) -> AccountingCategoryOut:
        with self._session_factory() as db:
            _ensure_ready(db)
            name = payload.name.strip()
            if not name:
                raise BusinessError("accounting.invalidName", status_code=400)
            max_order = db.scalars(
                select(AccountingCategory.sort_order).where(AccountingCategory.kind == payload.kind)
            ).all()
            row = AccountingCategory(
                kind=payload.kind,
                name=name,
                i18n=payload.i18n or {},
                active=True,
                sort_order=(max(max_order) if max_order else 100) + 10,
                system=False,
            )
            db.add(row)
            db.flush()
            return _category_out(row)

    def patch_category(self, category_id: str, payload: AccountingCategoryPatch) -> AccountingCategoryOut:
        with self._session_factory() as db:
            row = db.get(AccountingCategory, category_id)
            if row is None:
                raise NotFoundError("accounting-category", category_id)
            if payload.name is not None:
                name = payload.name.strip()
                if not name:
                    raise BusinessError("accounting.invalidName", status_code=400)
                row.name = name
            if payload.active is not None:
                row.active = payload.active
            if payload.i18n is not None:
                row.i18n = payload.i18n
            return _category_out(row)

    def delete_category(self, category_id: str) -> None:
        with self._session_factory() as db:
            row = db.get(AccountingCategory, category_id)
            if row is None:
                raise NotFoundError("accounting-category", category_id)
            used = db.scalar(select(AccountingEntry.id).where(AccountingEntry.category_id == category_id).limit(1))
            if row.system or used:
                row.active = False
                return
            db.delete(row)

    def list_entries(
        self,
        *,
        type: str | None = None,
        preset: str = "30d",
        q: str | None = None,
        category_id: str | None = None,
        status: str | None = None,
        method: str | None = None,
    ) -> list[AccountingEntryOut]:
        window = resolve_period(preset)
        with self._session_factory() as db:
            _ensure_ready(db)
            rows = _filtered_entries(
                db,
                window.start,
                window.end,
                type=type,
                q=q,
                category_id=category_id,
                status=status,
                method=method,
            )
            return [_entry_out(row) for row in rows]

    def create_entry(self, payload: AccountingEntryWrite) -> AccountingEntryOut:
        with self._session_factory() as db:
            settings_row = _ensure_ready(db)
            _assert_unlocked(db, payload.date)
            row = _build_entry(db, payload, settings_row)
            db.add(row)
            db.flush()
            db.refresh(row, attribute_names=["category"])
            return _entry_out(row)

    def patch_entry(self, entry_id: str, payload: AccountingEntryPatch) -> AccountingEntryOut:
        with self._session_factory() as db:
            row = _entry_or_404(db, entry_id)
            _assert_unlocked(db, row.date)
            if payload.date is not None:
                _assert_unlocked(db, payload.date)
                row.date = payload.date
            if payload.concept is not None:
                row.concept = payload.concept.strip()
            if payload.notes is not None:
                row.notes = payload.notes
            if payload.categoryId is not None:
                row.category_id = _category_or_404(db, payload.categoryId, row.type).id
            if payload.counterpartyName is not None:
                row.counterparty_name = payload.counterpartyName.strip()
            if payload.clientId is not None:
                row.client_id = payload.clientId or None
            amount = float(row.amount) if payload.amount is None else payload.amount
            vat_rate = float(row.vat_rate) if payload.vatRate is None else payload.vatRate
            status = row.payment_status if payload.paymentStatus is None else payload.paymentStatus
            paid = payload.paidAmount
            if payload.amount is not None or payload.vatRate is not None:
                total, vat, net = _split_vat(amount, vat_rate)
                row.amount = total
                row.vat_rate = _money(vat_rate)
                row.vat_amount = vat
                row.net_amount = net
            if payload.paymentStatus is not None or payload.paidAmount is not None:
                row.payment_status = status
                row.paid_amount = _paid_for(float(row.amount), status, paid)
            if payload.paymentMethod is not None:
                row.payment_method = payload.paymentMethod
            if payload.recurring is not None:
                if row.type != "expense" and payload.recurring:
                    raise BusinessError("accounting.recurringIncome", status_code=400)
                row.recurring = payload.recurring
            if payload.recurringDay is not None:
                row.recurring_day = payload.recurringDay
            row.updated_at = utcnow()
            db.flush()
            db.refresh(row, attribute_names=["category"])
            return _entry_out(row)

    def delete_entry(self, entry_id: str) -> None:
        with self._session_factory() as db:
            row = _entry_or_404(db, entry_id)
            _assert_unlocked(db, row.date)
            db.delete(row)

    def record_sale(self, db: Session, client_bono: ClientBono) -> AccountingEntry | None:
        _ensure_ready(db)
        if client_bono.is_gift or _money(client_bono.paid_price) <= 0:
            return None
        existing = db.scalar(select(AccountingEntry).where(AccountingEntry.source_id == client_bono.id))
        if existing is not None:
            return existing
        try:
            _assert_unlocked(db, client_bono.purchased_at)
        except BusinessError:
            return None
        return _insert_sale(db, client_bono)

    def sync_sales(self) -> AccountingSyncOut:
        created = 0
        skipped_existing = 0
        skipped_locked = 0
        with self._session_factory() as db:
            _ensure_ready(db)
            rows = db.scalars(
                select(ClientBono).options(selectinload(ClientBono.bono), selectinload(ClientBono.client))
            ).all()
            linked = {
                value
                for value in db.scalars(
                    select(AccountingEntry.source_id).where(AccountingEntry.source == "client_bono")
                ).all()
                if value
            }
            for bono in rows:
                if bono.is_gift or _money(bono.paid_price) <= 0:
                    continue
                if bono.id in linked:
                    skipped_existing += 1
                    continue
                if _is_locked(db, bono.purchased_at):
                    skipped_locked += 1
                    continue
                _insert_sale(db, bono)
                created += 1
        return AccountingSyncOut(created=created, skippedExisting=skipped_existing, skippedLocked=skipped_locked)

    def generate_recurring(self, year: int, month: int) -> AccountingRecurringOut:
        if month < 1 or month > 12:
            raise BusinessError("accounting.invalidMonth", status_code=400)
        probe = datetime(year, month, 1, tzinfo=MADRID)
        with self._session_factory() as db:
            _ensure_ready(db)
            _assert_unlocked(db, probe)
            templates = db.scalars(
                select(AccountingEntry)
                .options(selectinload(AccountingEntry.category))
                .where(AccountingEntry.type == "expense", AccountingEntry.recurring.is_(True))
            ).all()
            created = 0
            skipped = 0
            last_day = monthrange(year, month)[1]
            for template in templates:
                day = min(template.recurring_day or 1, last_day, 28)
                stamp = datetime(year, month, day, 12, 0, tzinfo=MADRID)
                exists = db.scalar(
                    select(AccountingEntry.id).where(
                        AccountingEntry.type == "expense",
                        AccountingEntry.category_id == template.category_id,
                        AccountingEntry.concept == template.concept,
                        AccountingEntry.date >= datetime(year, month, 1, tzinfo=MADRID),
                        AccountingEntry.date < _add_months(datetime(year, month, 1, tzinfo=MADRID), 1),
                    )
                )
                if exists:
                    skipped += 1
                    continue
                clone = AccountingEntry(
                    type="expense",
                    date=stamp,
                    concept=template.concept,
                    notes=template.notes,
                    category_id=template.category_id,
                    counterparty_name=template.counterparty_name,
                    client_id=None,
                    source="manual",
                    source_id=None,
                    amount=template.amount,
                    vat_rate=template.vat_rate,
                    vat_amount=template.vat_amount,
                    net_amount=template.net_amount,
                    payment_status="paid",
                    paid_amount=template.amount,
                    payment_method=template.payment_method,
                    recurring=True,
                    recurring_day=template.recurring_day,
                    created_at=utcnow(),
                    updated_at=utcnow(),
                )
                db.add(clone)
                created += 1
            return AccountingRecurringOut(created=created, skippedExisting=skipped)

    def lock_period(self, payload: AccountingPeriodWrite) -> list[AccountingPeriodLockOut]:
        months = _period_months(payload)
        with self._session_factory() as db:
            _ensure_ready(db)
            for year, month in months:
                exists = db.scalar(
                    select(AccountingPeriodLock).where(
                        AccountingPeriodLock.year == year, AccountingPeriodLock.month == month
                    )
                )
                if exists is None:
                    db.add(AccountingPeriodLock(year=year, month=month))
            return _locks_out(db)

    def unlock_period(self, payload: AccountingPeriodWrite) -> list[AccountingPeriodLockOut]:
        months = _period_months(payload)
        with self._session_factory() as db:
            _ensure_ready(db)
            for year, month in months:
                row = db.scalar(
                    select(AccountingPeriodLock).where(
                        AccountingPeriodLock.year == year, AccountingPeriodLock.month == month
                    )
                )
                if row is not None:
                    db.delete(row)
            return _locks_out(db)

    def get_summary(self, preset: str = "30d", now: datetime | None = None) -> AccountingSummaryOut:
        window = resolve_period(preset, now)
        with self._session_factory() as db:
            _ensure_ready(db)
            current = _load_entries(db, window.start, window.end)
            previous = _load_entries(db, window.previous_start, window.previous_end)
            kpis = _kpis(current, previous)
            return AccountingSummaryOut(
                timezone=settings.timezone,
                preset=preset,  # type: ignore[arg-type]
                from_=window.start,
                to=window.end,
                previousFrom=window.previous_start,
                previousTo=window.previous_end,
                disclaimer=DISCLAIMER,
                kpis=kpis,
                series=_series(current, window, preset),
                breakdown=_breakdown(current),
            )

    def get_report(self, kind: AccountingReportKind, preset: str = "30d") -> AccountingReportOut:
        if kind not in REPORT_TITLES:
            raise BusinessError("accounting.invalidReport", status_code=400)
        summary = self.get_summary(preset)
        with self._session_factory() as db:
            settings_row = _ensure_ready(db)
            window = resolve_period(preset)
            type_filter = None
            if kind == "income-book":
                type_filter = "income"
            elif kind == "expense-book":
                type_filter = "expense"
            entries = _filtered_entries(db, window.start, window.end, type=type_filter)
            return AccountingReportOut(
                kind=kind,
                preset=preset,  # type: ignore[arg-type]
                from_=window.start,
                to=window.end,
                title=REPORT_TITLES[kind],
                disclaimer=DOCUMENT_DISCLAIMER,
                legalName=settings_row.legal_name,
                kpis=summary.kpis,
                breakdown=summary.breakdown,
                entries=[_entry_out(row) for row in entries],
            )

    def report_xlsx(self, kind: AccountingReportKind, preset: str = "30d") -> bytes:
        from app.services.accounting_reports import build_xlsx

        pyg = self.get_report("pyg", preset)
        income = self.get_report("income-book", preset)
        expense = self.get_report("expense-book", preset)
        vat = self.get_report("vat", preset)
        return build_xlsx(pyg, income, expense, vat)

    def report_pdf(self, kind: AccountingReportKind, preset: str = "30d") -> bytes:
        from app.services.accounting_reports import build_pdf

        report = self.get_report(kind, preset)
        with self._session_factory() as db:
            branding = db.get(Branding, "branding")
        logo = None
        if branding and branding.logo_path:
            candidate = Path(branding.logo_path)
            if not candidate.is_absolute():
                candidate = self._uploads_dir / candidate.name
            if candidate.is_file():
                logo = candidate
        colors = None
        if branding:
            colors = (branding.primary_hex, branding.accent_hex)
        return build_pdf(report, logo_path=logo, colors=colors)


def _ensure_ready(db: Session) -> AccountingSettings:
    _seed_categories(db)
    row = db.get(AccountingSettings, SETTINGS_ID)
    if row is not None:
        return row
    branding = db.get(Branding, "branding")
    legal = branding.studio_name if branding and branding.studio_name else "Bonafit"
    row = AccountingSettings(
        id=SETTINGS_ID,
        legal_name=legal,
        tax_id=None,
        address=None,
        vat_regime="unknown",
        default_vat_rate=0,
        fiscal_year_start_month=1,
        default_recurring_day=1,
        currency="EUR",
        notes=None,
    )
    db.add(row)
    db.flush()
    return row


def _seed_categories(db: Session) -> None:
    existing = {row.id for row in db.scalars(select(AccountingCategory)).all()}
    for category_id, kind, name, i18n, sort_order in CATEGORY_SEED:
        if category_id in existing:
            continue
        db.add(
            AccountingCategory(
                id=category_id,
                kind=kind,
                name=name,
                i18n=i18n,
                active=True,
                sort_order=sort_order,
                system=True,
            )
        )
    db.flush()


def _settings_out(row: AccountingSettings) -> AccountingSettingsOut:
    db = Session.object_session(row)
    locks = _locks_out(db) if db is not None else []
    return AccountingSettingsOut(
        legalName=row.legal_name,
        taxId=row.tax_id,
        address=row.address,
        vatRegime=row.vat_regime,  # type: ignore[arg-type]
        defaultVatRate=_money(row.default_vat_rate),
        fiscalYearStartMonth=row.fiscal_year_start_month,
        defaultRecurringDay=row.default_recurring_day,
        currency=row.currency,
        notes=row.notes,
        locks=locks,
    )


def _locks_out(db: Session) -> list[AccountingPeriodLockOut]:
    rows = db.scalars(
        select(AccountingPeriodLock).order_by(AccountingPeriodLock.year, AccountingPeriodLock.month)
    ).all()
    return [AccountingPeriodLockOut(year=row.year, month=row.month) for row in rows]


def _category_out(row: AccountingCategory) -> AccountingCategoryOut:
    return AccountingCategoryOut(
        id=row.id,
        kind=row.kind,  # type: ignore[arg-type]
        name=row.name,
        i18n=row.i18n or {},
        active=row.active,
        sortOrder=row.sort_order,
        system=row.system,
    )


def _entry_out(row: AccountingEntry) -> AccountingEntryOut:
    origin = None
    if row.source == "client_bono":
        origin = f"{row.counterparty_name} · {row.concept}"
    return AccountingEntryOut(
        id=row.id,
        type=row.type,  # type: ignore[arg-type]
        date=row.date,
        concept=row.concept,
        notes=row.notes or "",
        categoryId=row.category_id,
        categoryName=row.category.name if row.category else "",
        counterpartyName=row.counterparty_name or "",
        clientId=row.client_id,
        source=row.source,  # type: ignore[arg-type]
        sourceId=row.source_id,
        amount=_money(row.amount),
        vatRate=_money(row.vat_rate),
        vatAmount=_money(row.vat_amount),
        netAmount=_money(row.net_amount),
        paymentStatus=row.payment_status,  # type: ignore[arg-type]
        paidAmount=_money(row.paid_amount),
        paymentMethod=row.payment_method,  # type: ignore[arg-type]
        recurring=row.recurring,
        recurringDay=row.recurring_day,
        originLabel=origin,
    )


def _entry_or_404(db: Session, entry_id: str) -> AccountingEntry:
    row = db.scalar(
        select(AccountingEntry)
        .options(selectinload(AccountingEntry.category))
        .where(AccountingEntry.id == entry_id)
    )
    if row is None:
        raise NotFoundError("accounting-entry", entry_id)
    return row


def _category_or_404(db: Session, category_id: str, kind: str) -> AccountingCategory:
    row = db.get(AccountingCategory, category_id)
    if row is None:
        raise NotFoundError("accounting-category", category_id)
    if row.kind != kind:
        raise BusinessError("accounting.categoryKind", status_code=400)
    if not row.active:
        raise BusinessError("accounting.categoryInactive", status_code=400)
    return row


def _assert_unlocked(db: Session, when: datetime) -> None:
    if _is_locked(db, when):
        raise BusinessError("accounting.periodLocked")


def _is_locked(db: Session, when: datetime) -> bool:
    local = to_madrid(when)
    row = db.scalar(
        select(AccountingPeriodLock).where(
            AccountingPeriodLock.year == local.year, AccountingPeriodLock.month == local.month
        )
    )
    return row is not None


def _period_months(payload: AccountingPeriodWrite) -> list[tuple[int, int]]:
    if payload.quarter is not None:
        if payload.quarter < 1 or payload.quarter > 4:
            raise BusinessError("accounting.invalidQuarter", status_code=400)
        start = (payload.quarter - 1) * 3 + 1
        return [(payload.year, start + offset) for offset in range(3)]
    if payload.month is None or payload.month < 1 or payload.month > 12:
        raise BusinessError("accounting.invalidMonth", status_code=400)
    return [(payload.year, payload.month)]


def _build_entry(db: Session, payload: AccountingEntryWrite, settings_row: AccountingSettings) -> AccountingEntry:
    concept = payload.concept.strip()
    if not concept:
        raise BusinessError("accounting.invalidConcept", status_code=400)
    if payload.amount < 0:
        raise BusinessError("accounting.invalidAmount", status_code=400)
    if payload.type == "expense" and payload.amount <= 0:
        raise BusinessError("accounting.invalidAmount", status_code=400)
    category = _category_or_404(db, payload.categoryId, payload.type)
    vat_rate = payload.vatRate
    if vat_rate is None:
        vat_rate = (
            float(settings_row.default_vat_rate)
            if settings_row.vat_regime == "taxable"
            else 0.0
        )
    total, vat, net = _split_vat(payload.amount, vat_rate)
    status = payload.paymentStatus
    paid = _paid_for(total, status, payload.paidAmount)
    recurring = payload.recurring if payload.type == "expense" else False
    day = payload.recurringDay
    if recurring:
        if not day:
            day = settings_row.default_recurring_day
        if day < 1 or day > 28:
            raise BusinessError("accounting.invalidRecurringDay", status_code=400)
    return AccountingEntry(
        type=payload.type,
        date=payload.date,
        concept=concept,
        notes=payload.notes or "",
        category_id=category.id,
        counterparty_name=payload.counterpartyName.strip(),
        client_id=payload.clientId,
        source="manual",
        source_id=None,
        amount=total,
        vat_rate=_money(vat_rate),
        vat_amount=vat,
        net_amount=net,
        payment_status=status,
        paid_amount=paid,
        payment_method=payload.paymentMethod,
        recurring=recurring,
        recurring_day=day if recurring else None,
        created_at=utcnow(),
        updated_at=utcnow(),
    )


def _insert_sale(db: Session, client_bono: ClientBono) -> AccountingEntry:
    bono = client_bono.bono or db.get(Bono, client_bono.bono_id)
    client = client_bono.client or db.get(Client, client_bono.client_id)
    session_count = bono.session_count if bono else 10
    category_id = INCOME_SINGLES_ID if session_count == 1 else INCOME_PACKS_ID
    category = db.get(AccountingCategory, category_id)
    if category is None:
        _seed_categories(db)
        category = db.get(AccountingCategory, category_id)
    name = f"{client.first_name} {client.last_name}".strip() if client else ""
    concept = bono.name if bono else "Bono"
    total, vat, net = _split_vat(_money(client_bono.paid_price), 0)
    row = AccountingEntry(
        type="income",
        date=client_bono.purchased_at,
        concept=concept,
        notes="",
        category_id=category.id if category else category_id,
        counterparty_name=name,
        client_id=client_bono.client_id,
        source="client_bono",
        source_id=client_bono.id,
        amount=total,
        vat_rate=0,
        vat_amount=vat,
        net_amount=net,
        payment_status="paid",
        paid_amount=total,
        payment_method="other",
        recurring=False,
        recurring_day=None,
        created_at=utcnow(),
        updated_at=utcnow(),
    )
    db.add(row)
    db.flush()
    return row


def _load_entries(db: Session, start: datetime, end: datetime) -> list[AccountingEntry]:
    return list(
        db.scalars(
            select(AccountingEntry)
            .options(selectinload(AccountingEntry.category))
            .where(AccountingEntry.date >= start, AccountingEntry.date < end)
            .order_by(AccountingEntry.date.desc())
        ).all()
    )


def _filtered_entries(
    db: Session,
    start: datetime,
    end: datetime,
    *,
    type: str | None = None,
    q: str | None = None,
    category_id: str | None = None,
    status: str | None = None,
    method: str | None = None,
) -> list[AccountingEntry]:
    rows = _load_entries(db, start, end)
    needle = (q or "").strip().lower()
    result: list[AccountingEntry] = []
    for row in rows:
        if type and row.type != type:
            continue
        if category_id and row.category_id != category_id:
            continue
        if status and row.payment_status != status:
            continue
        if method and row.payment_method != method:
            continue
        if needle:
            haystack = f"{row.concept} {row.counterparty_name} {row.notes}".lower()
            if needle not in haystack:
                continue
        result.append(row)
    return result


def _kpis(current: list[AccountingEntry], previous: list[AccountingEntry]) -> AccountingKpisOut:
    income = _sum_amount(current, "income")
    expense = _sum_amount(current, "expense")
    previous_income = _sum_amount(previous, "income")
    previous_expense = _sum_amount(previous, "expense")
    paid_income = sum(_money(row.paid_amount) for row in current if row.type == "income")
    pending_income = _money(income - paid_income)
    vat_collected = sum(_money(row.vat_amount) for row in current if row.type == "income")
    vat_deductible = sum(_money(row.vat_amount) for row in current if row.type == "expense")
    result = _money(income - expense)
    previous_result = _money(previous_income - previous_expense)
    return AccountingKpisOut(
        income=income,
        expense=expense,
        result=result,
        paidIncome=_money(paid_income),
        pendingIncome=max(0.0, pending_income),
        previousIncome=previous_income,
        previousExpense=previous_expense,
        previousResult=previous_result,
        incomeDelta=_money(income - previous_income),
        expenseDelta=_money(expense - previous_expense),
        resultDelta=_money(result - previous_result),
        vatCollected=_money(vat_collected),
        vatDeductible=_money(vat_deductible),
        vatNet=_money(vat_collected - vat_deductible),
    )


def _sum_amount(rows: list[AccountingEntry], kind: str) -> float:
    return _money(sum(_money(row.amount) for row in rows if row.type == kind))


def _breakdown(rows: list[AccountingEntry]) -> list[AccountingBreakdownOut]:
    totals: dict[str, tuple[str, str, float]] = {}
    for row in rows:
        name = row.category.name if row.category else row.category_id
        current = totals.get(row.category_id, (name, row.type, 0.0))
        totals[row.category_id] = (current[0], row.type, current[2] + _money(row.amount))
    items = [
        AccountingBreakdownOut(categoryId=key, name=name, kind=kind, amount=_money(amount))  # type: ignore[arg-type]
        for key, (name, kind, amount) in totals.items()
    ]
    items.sort(key=lambda item: item.amount, reverse=True)
    return items


def _series(rows: list[AccountingEntry], window: PeriodWindow, preset: str) -> list[AccountingSeriesPointOut]:
    buckets: dict[str, list[float]] = defaultdict(lambda: [0.0, 0.0])
    for row in rows:
        local = to_madrid(row.date)
        key = _bucket_key(local, preset)
        if row.type == "income":
            buckets[key][0] += _money(row.amount)
        else:
            buckets[key][1] += _money(row.amount)
    keys = _bucket_range(window, preset)
    return [
        AccountingSeriesPointOut(
            bucket=key,
            income=_money(buckets[key][0]),
            expense=_money(buckets[key][1]),
            result=_money(buckets[key][0] - buckets[key][1]),
        )
        for key in keys
    ]


def _bucket_key(local: datetime, preset: str) -> str:
    if preset in {"quarter", "year"}:
        return f"{local.year:04d}-{local.month:02d}"
    if preset == "90d":
        iso = local.isocalendar()
        return f"{iso.year:04d}-W{iso.week:02d}"
    return local.date().isoformat()


def _bucket_range(window: PeriodWindow, preset: str) -> list[str]:
    keys: list[str] = []
    cursor = window.start
    while cursor < window.end:
        keys.append(_bucket_key(cursor, preset))
        if preset in {"quarter", "year"}:
            cursor = _add_months(cursor.replace(day=1), 1)
        elif preset == "90d":
            cursor = cursor + timedelta(days=7)
        else:
            cursor = cursor + timedelta(days=1)
    unique: list[str] = []
    seen: set[str] = set()
    for key in keys:
        if key in seen:
            continue
        seen.add(key)
        unique.append(key)
    return unique
