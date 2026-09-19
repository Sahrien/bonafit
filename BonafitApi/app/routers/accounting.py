from dependency_injector.wiring import inject
from fastapi import APIRouter, Query
from fastapi.responses import Response

from app.schemas import (
    AccountingCategoryOut,
    AccountingCategoryPatch,
    AccountingCategoryWrite,
    AccountingEntryOut,
    AccountingEntryPatch,
    AccountingEntryWrite,
    AccountingKind,
    AccountingPaymentMethod,
    AccountingPaymentStatus,
    AccountingPeriodLockOut,
    AccountingPeriodWrite,
    AccountingPreset,
    AccountingRecurringOut,
    AccountingReportKind,
    AccountingReportOut,
    AccountingSettingsOut,
    AccountingSettingsWrite,
    AccountingSummaryOut,
    AccountingSyncOut,
)
from app.wiring import AccountingSvc, AuthSvc, AuthorizationHeader

router = APIRouter(tags=["accounting"])

XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
PDF_TYPE = "application/pdf"


@router.get("/accounting/summary", response_model=AccountingSummaryOut)
@inject
def get_summary(
    accounting_service: AccountingSvc,
    auth_service: AuthSvc,
    preset: AccountingPreset = Query(default="30d"),
    authorization: AuthorizationHeader = None,
) -> AccountingSummaryOut:
    auth_service.require_admin(authorization)
    return accounting_service.get_summary(preset)


@router.get("/accounting/entries", response_model=list[AccountingEntryOut])
@inject
def list_entries(
    accounting_service: AccountingSvc,
    auth_service: AuthSvc,
    type: AccountingKind | None = None,
    preset: AccountingPreset = Query(default="30d"),
    q: str | None = None,
    categoryId: str | None = None,
    status: AccountingPaymentStatus | None = None,
    method: AccountingPaymentMethod | None = None,
    authorization: AuthorizationHeader = None,
) -> list[AccountingEntryOut]:
    auth_service.require_admin(authorization)
    return accounting_service.list_entries(
        type=type,
        preset=preset,
        q=q,
        category_id=categoryId,
        status=status,
        method=method,
    )


@router.post("/accounting/entries", response_model=AccountingEntryOut)
@inject
def create_entry(
    payload: AccountingEntryWrite,
    accounting_service: AccountingSvc,
    auth_service: AuthSvc,
    authorization: AuthorizationHeader = None,
) -> AccountingEntryOut:
    auth_service.require_admin(authorization)
    return accounting_service.create_entry(payload)


@router.patch("/accounting/entries/{entry_id}", response_model=AccountingEntryOut)
@inject
def patch_entry(
    entry_id: str,
    payload: AccountingEntryPatch,
    accounting_service: AccountingSvc,
    auth_service: AuthSvc,
    authorization: AuthorizationHeader = None,
) -> AccountingEntryOut:
    auth_service.require_admin(authorization)
    return accounting_service.patch_entry(entry_id, payload)


@router.delete("/accounting/entries/{entry_id}", status_code=204)
@inject
def delete_entry(
    entry_id: str,
    accounting_service: AccountingSvc,
    auth_service: AuthSvc,
    authorization: AuthorizationHeader = None,
) -> None:
    auth_service.require_admin(authorization)
    accounting_service.delete_entry(entry_id)


@router.post("/accounting/entries/sync-sales", response_model=AccountingSyncOut)
@inject
def sync_sales(
    accounting_service: AccountingSvc,
    auth_service: AuthSvc,
    authorization: AuthorizationHeader = None,
) -> AccountingSyncOut:
    auth_service.require_admin(authorization)
    return accounting_service.sync_sales()


@router.post("/accounting/entries/generate-recurring", response_model=AccountingRecurringOut)
@inject
def generate_recurring(
    accounting_service: AccountingSvc,
    auth_service: AuthSvc,
    year: int = Query(),
    month: int = Query(),
    authorization: AuthorizationHeader = None,
) -> AccountingRecurringOut:
    auth_service.require_admin(authorization)
    return accounting_service.generate_recurring(year, month)


@router.get("/accounting/settings", response_model=AccountingSettingsOut)
@inject
def get_settings(
    accounting_service: AccountingSvc,
    auth_service: AuthSvc,
    authorization: AuthorizationHeader = None,
) -> AccountingSettingsOut:
    auth_service.require_admin(authorization)
    return accounting_service.get_settings()


@router.put("/accounting/settings", response_model=AccountingSettingsOut)
@inject
def update_settings(
    payload: AccountingSettingsWrite,
    accounting_service: AccountingSvc,
    auth_service: AuthSvc,
    authorization: AuthorizationHeader = None,
) -> AccountingSettingsOut:
    auth_service.require_admin(authorization)
    return accounting_service.update_settings(payload)


@router.get("/accounting/categories", response_model=list[AccountingCategoryOut])
@inject
def list_categories(
    accounting_service: AccountingSvc,
    auth_service: AuthSvc,
    kind: AccountingKind | None = None,
    authorization: AuthorizationHeader = None,
) -> list[AccountingCategoryOut]:
    auth_service.require_admin(authorization)
    return accounting_service.list_categories(kind)


@router.post("/accounting/categories", response_model=AccountingCategoryOut)
@inject
def create_category(
    payload: AccountingCategoryWrite,
    accounting_service: AccountingSvc,
    auth_service: AuthSvc,
    authorization: AuthorizationHeader = None,
) -> AccountingCategoryOut:
    auth_service.require_admin(authorization)
    return accounting_service.create_category(payload)


@router.patch("/accounting/categories/{category_id}", response_model=AccountingCategoryOut)
@inject
def patch_category(
    category_id: str,
    payload: AccountingCategoryPatch,
    accounting_service: AccountingSvc,
    auth_service: AuthSvc,
    authorization: AuthorizationHeader = None,
) -> AccountingCategoryOut:
    auth_service.require_admin(authorization)
    return accounting_service.patch_category(category_id, payload)


@router.delete("/accounting/categories/{category_id}", status_code=204)
@inject
def delete_category(
    category_id: str,
    accounting_service: AccountingSvc,
    auth_service: AuthSvc,
    authorization: AuthorizationHeader = None,
) -> None:
    auth_service.require_admin(authorization)
    accounting_service.delete_category(category_id)


@router.post("/accounting/periods/lock", response_model=list[AccountingPeriodLockOut])
@inject
def lock_period(
    payload: AccountingPeriodWrite,
    accounting_service: AccountingSvc,
    auth_service: AuthSvc,
    authorization: AuthorizationHeader = None,
) -> list[AccountingPeriodLockOut]:
    auth_service.require_admin(authorization)
    return accounting_service.lock_period(payload)


@router.post("/accounting/periods/unlock", response_model=list[AccountingPeriodLockOut])
@inject
def unlock_period(
    payload: AccountingPeriodWrite,
    accounting_service: AccountingSvc,
    auth_service: AuthSvc,
    authorization: AuthorizationHeader = None,
) -> list[AccountingPeriodLockOut]:
    auth_service.require_admin(authorization)
    return accounting_service.unlock_period(payload)


@router.get("/accounting/reports/{kind}.xlsx")
@inject
def get_report_xlsx(
    kind: AccountingReportKind,
    accounting_service: AccountingSvc,
    auth_service: AuthSvc,
    preset: AccountingPreset = Query(default="30d"),
    authorization: AuthorizationHeader = None,
) -> Response:
    auth_service.require_admin(authorization)
    data = accounting_service.report_xlsx(kind, preset)
    return Response(
        content=data,
        media_type=XLSX_TYPE,
        headers={"Content-Disposition": 'attachment; filename="contabilidad.xlsx"'},
    )


@router.get("/accounting/reports/{kind}.pdf")
@inject
def get_report_pdf(
    kind: AccountingReportKind,
    accounting_service: AccountingSvc,
    auth_service: AuthSvc,
    preset: AccountingPreset = Query(default="30d"),
    authorization: AuthorizationHeader = None,
) -> Response:
    auth_service.require_admin(authorization)
    data = accounting_service.report_pdf(kind, preset)
    return Response(
        content=data,
        media_type=PDF_TYPE,
        headers={"Content-Disposition": 'attachment; filename="contabilidad.pdf"'},
    )


@router.get("/accounting/reports/{kind}", response_model=AccountingReportOut)
@inject
def get_report(
    kind: AccountingReportKind,
    accounting_service: AccountingSvc,
    auth_service: AuthSvc,
    preset: AccountingPreset = Query(default="30d"),
    authorization: AuthorizationHeader = None,
) -> AccountingReportOut:
    auth_service.require_admin(authorization)
    return accounting_service.get_report(kind, preset)
