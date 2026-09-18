from datetime import datetime
from typing import Annotated, Literal, Self

from pydantic import BaseModel, ConfigDict, EmailStr, Field, PlainSerializer, model_validator

from app.booking import to_utc_iso
from app.roles import UserRole

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
    phone: str = Field(min_length=1)
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
    sharesSessionPool: bool = False
    forcesSingleSession: bool = False
    allowsSingleSession: bool
    singleSessionPrice: float | None = None
    durationMinutes: int
    bookableByClient: bool
    active: bool = True
    i18n: dict[str, dict[str, str]] = Field(default_factory=dict)


class ServiceWrite(BaseModel):
    model_config = camel_config()
    name: str
    sharesSessionPool: bool = False
    forcesSingleSession: bool = False
    allowsSingleSession: bool = False
    singleSessionPrice: float | None = None
    durationMinutes: int = Field(gt=0)
    bookableByClient: bool = True
    active: bool = True
    i18n: dict[str, dict[str, str]] | None = None


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


class ContractBono(BaseModel):
    model_config = camel_config()
    clientId: str
    bonoId: str | None = None
    serviceId: str | None = None
    remainingSessions: int | None = Field(default=None, ge=1)
    isGift: bool = False


class ClientBonoPatch(BaseModel):
    model_config = camel_config()
    remainingSessions: int = Field(ge=0)
    expiresAt: datetime | None = None


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
