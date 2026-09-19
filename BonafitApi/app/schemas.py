from datetime import datetime
from typing import Annotated, Literal, Self

from pydantic import BaseModel, ConfigDict, EmailStr, Field, PlainSerializer, model_validator

from app.booking import to_utc_iso
from app.roles import UserRole

SaleKind = Literal["none", "percent", "amount"]
DiscountKind = Literal["percent", "amount"]
AppointmentStatus = Literal["pending", "confirmed", "completed", "cancelled"]
FormQuestionType = Literal[
    "text",
    "shortText",
    "fullName",
    "email",
    "phone",
    "date",
    "number",
    "address",
    "yesno",
    "dropdown",
    "singleChoice",
    "multipleChoice",
    "ranking",
    "terms",
    "heading",
]
FORM_HEADING_TYPE = "heading"
FORM_OPTION_TYPES: frozenset[str] = frozenset(
    {"dropdown", "singleChoice", "multipleChoice", "ranking"}
)
FormAssignmentStatus = Literal["pending", "completed"]


IsoDateTime = Annotated[
    datetime,
    PlainSerializer(lambda value: to_utc_iso(value), return_type=str, when_used="json"),
]


def camel_config(**kwargs) -> ConfigDict:
    return ConfigDict(populate_by_name=True, from_attributes=True, **kwargs)


class TrainerOut(BaseModel):
    model_config = camel_config()
    id: str
    name: str
    concurrentCapacity: int = Field(ge=1, default=1)


class TrainerWrite(BaseModel):
    model_config = camel_config()
    name: str
    concurrentCapacity: int = Field(ge=1)


class ClientOut(BaseModel):
    model_config = camel_config()
    id: str
    firstName: str
    lastName: str
    email: EmailStr
    phone: str
    notes: str = ""
    instantConfirm: bool = False
    temporaryPassword: str | None = None


class ClientWrite(BaseModel):
    model_config = camel_config()
    firstName: str = Field(min_length=1)
    lastName: str = Field(min_length=1)
    email: EmailStr
    phone: str = ""
    notes: str = ""
    instantConfirm: bool = False


class AuthUserOut(BaseModel):
    model_config = camel_config()
    id: str
    displayName: str
    role: UserRole
    trainerId: str | None = None
    clientId: str | None = None
    email: str | None = None
    mustChangePassword: bool = False
    language: Literal["es", "en"] = "es"


class AuthSessionOut(BaseModel):
    model_config = camel_config()
    user: AuthUserOut
    token: str


class LoginRequest(BaseModel):
    model_config = camel_config()
    email: EmailStr
    password: str = Field(min_length=1)


class ChangePasswordRequest(BaseModel):
    model_config = camel_config()
    currentPassword: str = ""
    newPassword: str = Field(min_length=8)


class AuthMePatch(BaseModel):
    model_config = camel_config()
    language: Literal["es", "en"]


class LocalizedText(BaseModel):
    model_config = camel_config()
    es: str = ""
    en: str = ""


class ServiceI18n(BaseModel):
    model_config = camel_config()
    name: LocalizedText | None = None


class ServiceOut(BaseModel):
    model_config = camel_config()
    id: str
    name: str
    sharesSessionPool: bool = True
    forcesSingleSession: bool = False
    allowsSingleSession: bool
    singleSessionPrice: float | None = None
    durationMinutes: int
    bookableByClient: bool
    active: bool = True
    saleKind: SaleKind = "none"
    saleValue: float = 0
    i18n: dict[str, dict[str, str]] = Field(default_factory=dict)


class ServiceWrite(BaseModel):
    model_config = camel_config()
    name: str
    sharesSessionPool: bool = True
    forcesSingleSession: bool = False
    allowsSingleSession: bool = False
    singleSessionPrice: float | None = None
    durationMinutes: int = Field(gt=0)
    bookableByClient: bool = True
    active: bool = True
    saleKind: SaleKind = "none"
    saleValue: float = Field(ge=0, default=0)
    i18n: dict[str, dict[str, str]] | None = None

    @model_validator(mode="after")
    def valid_sale(self) -> Self:
        if self.saleKind == "none":
            self.saleValue = 0
            return self
        if self.saleKind == "percent" and self.saleValue > 100:
            raise ValueError("sale percent cannot exceed 100")
        return self


class BonoOut(BaseModel):
    model_config = camel_config()
    id: str
    serviceId: str
    name: str
    description: str
    sessionCount: int
    price: float
    i18n: dict[str, dict[str, str]] = Field(default_factory=dict)


class BonoWrite(BaseModel):
    model_config = camel_config()
    serviceId: str
    name: str
    description: str = ""
    sessionCount: int = Field(gt=0)
    price: float = Field(ge=0)
    i18n: dict[str, dict[str, str]] | None = None


class ClientBonoOut(BaseModel):
    model_config = camel_config()
    id: str
    clientId: str
    bonoId: str
    remainingSessions: int
    isGift: bool = False
    purchasedAt: IsoDateTime
    expiresAt: IsoDateTime | None = None
    listPrice: float | None = None
    paidPrice: float | None = None
    couponId: str | None = None


class ContractBono(BaseModel):
    model_config = camel_config()
    clientId: str
    bonoId: str | None = None
    serviceId: str | None = None
    remainingSessions: int | None = Field(default=None, ge=1)
    isGift: bool = False
    couponId: str | None = None


class ClientBonoPatch(BaseModel):
    model_config = camel_config()
    remainingSessions: int = Field(ge=0)
    expiresAt: datetime | None = None


class ClientCouponOut(BaseModel):
    model_config = camel_config()
    id: str
    clientId: str
    kind: DiscountKind
    value: float
    serviceId: str | None = None
    bonoId: str | None = None
    usedAt: IsoDateTime | None = None


class ClientCouponWrite(BaseModel):
    model_config = camel_config()
    kind: DiscountKind
    value: float = Field(gt=0)
    serviceId: str | None = None
    bonoId: str | None = None

    @model_validator(mode="after")
    def valid_coupon(self) -> Self:
        if self.serviceId and self.bonoId:
            raise ValueError("coupon cannot target both a service and a pack")
        if self.kind == "percent" and self.value > 100:
            raise ValueError("coupon percent cannot exceed 100")
        return self


class SessionBalanceOut(BaseModel):
    model_config = camel_config()
    serviceId: str
    remainingSessions: int


class AppointmentOut(BaseModel):
    model_config = camel_config()
    id: str
    trainerId: str
    clientId: str
    serviceId: str
    clientBonoId: str | None = None
    isGift: bool = False
    startsAt: IsoDateTime
    endsAt: IsoDateTime
    location: str
    status: AppointmentStatus
    notes: str = ""


class AppointmentWrite(BaseModel):
    model_config = camel_config()
    trainerId: str
    clientId: str
    serviceId: str
    clientBonoId: str | None = None
    startsAt: datetime
    endsAt: datetime | None = None
    location: str | None = None
    status: AppointmentStatus | None = None
    notes: str | None = None


class AvailabilitySlotOut(BaseModel):
    model_config = camel_config()
    trainerId: str
    startsAt: str
    endsAt: str


class BookingSettingsOut(BaseModel):
    model_config = camel_config()
    id: str
    nextDayCutoffTime: str
    defaultLocation: str


class BookingSettingsWrite(BaseModel):
    model_config = camel_config()
    nextDayCutoffTime: str
    defaultLocation: str


ColorScheme = Literal["light", "dark", "system"]


class BrandingOut(BaseModel):
    model_config = camel_config()
    id: str
    studioName: str
    slogan: str
    primaryHex: str
    accentHex: str
    surfaceHex: str
    colorScheme: ColorScheme
    logoUrl: str | None = None
    faviconUrl: str | None = None
    updatedAt: IsoDateTime


class BrandingWrite(BaseModel):
    model_config = camel_config()
    studioName: str = Field(min_length=1, max_length=120)
    slogan: str = Field(max_length=200)
    primaryHex: str = Field(pattern=r"^#[0-9A-Fa-f]{6}$")
    accentHex: str = Field(pattern=r"^#[0-9A-Fa-f]{6}$")
    surfaceHex: str = Field(pattern=r"^#[0-9A-Fa-f]{6}$")
    colorScheme: ColorScheme


class TrainerScheduleOut(BaseModel):
    model_config = camel_config()
    id: str
    trainerId: str
    weekday: int
    startTime: str
    endTime: str


class TrainerScheduleWrite(BaseModel):
    model_config = camel_config()
    trainerId: str
    weekday: int = Field(ge=1, le=7)
    startTime: str
    endTime: str


class FormQuestionOptionIn(BaseModel):
    model_config = camel_config()
    id: str | None = None
    label: str
    sortOrder: int
    i18n: dict[str, dict[str, str]] | None = None


class FormQuestionIn(BaseModel):
    model_config = camel_config()
    id: str | None = None
    prompt: str
    type: FormQuestionType
    required: bool = False
    sortOrder: int
    options: list[FormQuestionOptionIn] | None = None
    i18n: dict[str, dict[str, str]] | None = None

    @model_validator(mode="after")
    def option_types_need_choices(self) -> Self:
        if self.type == FORM_HEADING_TYPE:
            self.required = False
            self.options = None
            return self
        if self.type in FORM_OPTION_TYPES:
            filled = [option for option in (self.options or []) if option.label.strip()]
            if len(filled) < 2:
                raise ValueError("choice questions need at least two options")
        return self


class FormWrite(BaseModel):
    model_config = camel_config()
    title: str
    description: str = ""
    questions: list[FormQuestionIn]
    i18n: dict[str, dict[str, str]] | None = None


class FormQuestionOptionOut(BaseModel):
    model_config = camel_config()
    id: str
    label: str
    sortOrder: int
    i18n: dict[str, dict[str, str]] = Field(default_factory=dict)


class FormQuestionOut(BaseModel):
    model_config = camel_config()
    id: str
    prompt: str
    type: FormQuestionType
    required: bool
    sortOrder: int
    options: list[FormQuestionOptionOut] | None = None
    i18n: dict[str, dict[str, str]] = Field(default_factory=dict)


class FormOut(BaseModel):
    model_config = camel_config()
    id: str
    title: str
    description: str
    questions: list[FormQuestionOut]
    i18n: dict[str, dict[str, str]] = Field(default_factory=dict)


class FormAnswerIn(BaseModel):
    model_config = camel_config()
    questionId: str
    value: str


class FormAnswerOut(BaseModel):
    model_config = camel_config()
    questionId: str
    value: str


class FormAssignmentOut(BaseModel):
    model_config = camel_config()
    id: str
    formId: str
    clientId: str
    title: str
    description: str = ""
    questions: list[FormQuestionOut]
    status: FormAssignmentStatus
    assignedAt: IsoDateTime
    submittedAt: IsoDateTime | None = None
    answers: list[FormAnswerOut]
    i18n: dict[str, dict[str, str]] = Field(default_factory=dict)


class AssignFormIn(BaseModel):
    model_config = camel_config()
    formId: str
    clientIds: list[str]


class SubmitFormIn(BaseModel):
    model_config = camel_config()
    answers: list[FormAnswerIn]


AccountingPreset = Literal["7d", "30d", "month", "quarter", "90d", "year"]
AccountingKind = Literal["income", "expense"]
AccountingVatRegime = Literal["unknown", "taxable", "exempt"]
AccountingPaymentStatus = Literal["paid", "pending", "partial"]
AccountingPaymentMethod = Literal["cash", "transfer", "bizum", "pos", "other"]
AccountingSource = Literal["manual", "client_bono"]
AccountingReportKind = Literal["pyg", "vat", "cash", "income-book", "expense-book"]
StatsPreset = Literal["7d", "30d", "month", "90d"]
StatsRankKind = Literal["service", "pack"]


class StatsSeriesPointOut(BaseModel):
    model_config = camel_config()
    bucket: str
    paidRevenue: float


class StatsRankItemOut(BaseModel):
    model_config = camel_config()
    kind: StatsRankKind
    id: str
    name: str
    paidRevenue: float
    units: int


class StatsMixSliceOut(BaseModel):
    model_config = camel_config()
    units: int
    paidRevenue: float


class StatsMixOut(BaseModel):
    model_config = camel_config()
    packs: StatsMixSliceOut
    singles: StatsMixSliceOut
    gifts: StatsMixSliceOut


class StatsEconomyOut(BaseModel):
    model_config = camel_config()
    paidRevenue: float
    previousPaidRevenue: float
    revenueDelta: float
    averageTicket: float
    discountRate: float | None
    paidCount: int
    previousPaidCount: int
    series: list[StatsSeriesPointOut]
    ranking: list[StatsRankItemOut]
    mix: StatsMixOut


class StatsHeatCellOut(BaseModel):
    model_config = camel_config()
    weekday: int
    hour: int
    count: int


class StatsStatusCountOut(BaseModel):
    model_config = camel_config()
    status: AppointmentStatus
    count: int
    previousCount: int


class StatsTrainerOccupancyOut(BaseModel):
    model_config = camel_config()
    trainerId: str
    name: str
    bookedMinutes: int
    scheduleMinutes: int
    occupancyRate: float | None


class StatsEmptySlotOut(BaseModel):
    model_config = camel_config()
    weekday: int
    startTime: str
    endTime: str
    emptyDays: int
    scheduledDays: int


class StatsAgendaOut(BaseModel):
    model_config = camel_config()
    appointmentCount: int
    previousAppointmentCount: int
    occupancyRate: float | None
    previousOccupancyRate: float | None
    heatmap: list[StatsHeatCellOut]
    heatmapHours: list[int]
    statuses: list[StatsStatusCountOut]
    trainers: list[StatsTrainerOccupancyOut]
    emptySlots: list[StatsEmptySlotOut]


class StatsAtRiskOut(BaseModel):
    model_config = camel_config()
    clientId: str
    name: str
    reason: Literal["expiring", "noSessions"]
    remainingSessions: int
    expiresAt: IsoDateTime | None = None


class StatsClientsOut(BaseModel):
    model_config = camel_config()
    activeCount: int
    previousActiveCount: int
    newCount: int
    previousNewCount: int
    recurringCount: int
    previousRecurringCount: int
    formsPending: int
    formsCompleted: int
    previousFormsCompleted: int
    atRisk: list[StatsAtRiskOut]


class StatsOut(BaseModel):
    model_config = camel_config()
    timezone: str
    preset: StatsPreset
    from_: IsoDateTime = Field(alias="from", serialization_alias="from")
    to: IsoDateTime
    previousFrom: IsoDateTime
    previousTo: IsoDateTime
    economy: StatsEconomyOut
    agenda: StatsAgendaOut
    clients: StatsClientsOut


class AccountingPeriodLockOut(BaseModel):
    model_config = camel_config()
    year: int
    month: int


class AccountingSettingsOut(BaseModel):
    model_config = camel_config()
    legalName: str
    taxId: str | None = None
    address: str | None = None
    vatRegime: AccountingVatRegime
    defaultVatRate: float
    fiscalYearStartMonth: int
    defaultRecurringDay: int
    currency: str
    notes: str | None = None
    locks: list[AccountingPeriodLockOut]


class AccountingSettingsWrite(BaseModel):
    model_config = camel_config()
    legalName: str
    taxId: str | None = None
    address: str | None = None
    vatRegime: AccountingVatRegime = "unknown"
    defaultVatRate: float = 0
    fiscalYearStartMonth: int = 1
    defaultRecurringDay: int = 1
    notes: str | None = None


class AccountingCategoryOut(BaseModel):
    model_config = camel_config()
    id: str
    kind: AccountingKind
    name: str
    i18n: dict[str, dict[str, str]] = Field(default_factory=dict)
    active: bool
    sortOrder: int
    system: bool


class AccountingCategoryWrite(BaseModel):
    model_config = camel_config()
    kind: AccountingKind
    name: str
    i18n: dict[str, dict[str, str]] = Field(default_factory=dict)


class AccountingCategoryPatch(BaseModel):
    model_config = camel_config()
    name: str | None = None
    active: bool | None = None
    i18n: dict[str, dict[str, str]] | None = None


class AccountingEntryOut(BaseModel):
    model_config = camel_config()
    id: str
    type: AccountingKind
    date: IsoDateTime
    concept: str
    notes: str
    categoryId: str
    categoryName: str
    counterpartyName: str
    clientId: str | None = None
    source: AccountingSource
    sourceId: str | None = None
    amount: float
    vatRate: float
    vatAmount: float
    netAmount: float
    paymentStatus: AccountingPaymentStatus
    paidAmount: float
    paymentMethod: AccountingPaymentMethod
    recurring: bool
    recurringDay: int | None = None
    originLabel: str | None = None


class AccountingEntryWrite(BaseModel):
    model_config = camel_config()
    type: AccountingKind
    date: IsoDateTime
    concept: str
    notes: str = ""
    categoryId: str
    counterpartyName: str = ""
    clientId: str | None = None
    amount: float
    vatRate: float | None = None
    paymentStatus: AccountingPaymentStatus = "paid"
    paidAmount: float | None = None
    paymentMethod: AccountingPaymentMethod = "other"
    recurring: bool = False
    recurringDay: int | None = None


class AccountingEntryPatch(BaseModel):
    model_config = camel_config()
    date: IsoDateTime | None = None
    concept: str | None = None
    notes: str | None = None
    categoryId: str | None = None
    counterpartyName: str | None = None
    clientId: str | None = None
    amount: float | None = None
    vatRate: float | None = None
    paymentStatus: AccountingPaymentStatus | None = None
    paidAmount: float | None = None
    paymentMethod: AccountingPaymentMethod | None = None
    recurring: bool | None = None
    recurringDay: int | None = None


class AccountingSeriesPointOut(BaseModel):
    model_config = camel_config()
    bucket: str
    income: float
    expense: float
    result: float


class AccountingBreakdownOut(BaseModel):
    model_config = camel_config()
    categoryId: str
    name: str
    kind: AccountingKind
    amount: float


class AccountingKpisOut(BaseModel):
    model_config = camel_config()
    income: float
    expense: float
    result: float
    paidIncome: float
    pendingIncome: float
    previousIncome: float
    previousExpense: float
    previousResult: float
    incomeDelta: float
    expenseDelta: float
    resultDelta: float
    vatCollected: float
    vatDeductible: float
    vatNet: float


class AccountingSummaryOut(BaseModel):
    model_config = camel_config()
    timezone: str
    preset: AccountingPreset
    from_: IsoDateTime = Field(alias="from", serialization_alias="from")
    to: IsoDateTime
    previousFrom: IsoDateTime
    previousTo: IsoDateTime
    disclaimer: str
    kpis: AccountingKpisOut
    series: list[AccountingSeriesPointOut]
    breakdown: list[AccountingBreakdownOut]


class AccountingSyncOut(BaseModel):
    model_config = camel_config()
    created: int
    skippedExisting: int
    skippedLocked: int


class AccountingRecurringOut(BaseModel):
    model_config = camel_config()
    created: int
    skippedExisting: int


class AccountingPeriodWrite(BaseModel):
    model_config = camel_config()
    year: int
    month: int | None = None
    quarter: int | None = None


class AccountingReportOut(BaseModel):
    model_config = camel_config()
    kind: AccountingReportKind
    preset: AccountingPreset
    from_: IsoDateTime = Field(alias="from", serialization_alias="from")
    to: IsoDateTime
    title: str
    disclaimer: str
    legalName: str
    kpis: AccountingKpisOut
    breakdown: list[AccountingBreakdownOut]
    entries: list[AccountingEntryOut]
