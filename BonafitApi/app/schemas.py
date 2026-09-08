from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, PlainSerializer

from app.booking import to_utc_iso

ServiceCategory = Literal["entrenamiento-personal", "hipopresivos", "masaje"]
UserRole = Literal["admin", "client"]
AppointmentStatus = Literal["pending", "confirmed", "completed", "cancelled"]
FormQuestionType = Literal["text", "yesno", "singleChoice"]
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


class TrainerWrite(BaseModel):
    model_config = camel_config()
    name: str


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
    currentPassword: str
    newPassword: str = Field(min_length=8)


class ServiceOut(BaseModel):
    model_config = camel_config()
    id: str
    category: ServiceCategory
    name: str
    allowsSingleSession: bool
    singleSessionPrice: float | None = None
    durationMinutes: int
    bookableByClient: bool
    active: bool = True


class ServiceWrite(BaseModel):
    model_config = camel_config()
    category: ServiceCategory
    name: str
    allowsSingleSession: bool = False
    singleSessionPrice: float | None = None
    durationMinutes: int = Field(gt=0)
    bookableByClient: bool = True
    active: bool = True


class BonoOut(BaseModel):
    model_config = camel_config()
    id: str
    serviceId: str
    name: str
    description: str
    sessionCount: int
    price: float


class BonoWrite(BaseModel):
    model_config = camel_config()
    serviceId: str
    name: str
    description: str = ""
    sessionCount: int = Field(gt=0)
    price: float = Field(ge=0)


class ClientBonoOut(BaseModel):
    model_config = camel_config()
    id: str
    clientId: str
    bonoId: str
    remainingSessions: int
    purchasedAt: IsoDateTime
    expiresAt: IsoDateTime | None = None


class ContractBono(BaseModel):
    model_config = camel_config()
    clientId: str
    bonoId: str


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
    startsAt: IsoDateTime
    endsAt: IsoDateTime
    location: str
    status: AppointmentStatus


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


class FormQuestionIn(BaseModel):
    model_config = camel_config()
    id: str | None = None
    prompt: str
    type: FormQuestionType
    required: bool = False
    sortOrder: int
    options: list[FormQuestionOptionIn] | None = None


class FormWrite(BaseModel):
    model_config = camel_config()
    title: str
    description: str = ""
    questions: list[FormQuestionIn]


class FormQuestionOptionOut(BaseModel):
    model_config = camel_config()
    id: str
    label: str
    sortOrder: int


class FormQuestionOut(BaseModel):
    model_config = camel_config()
    id: str
    prompt: str
    type: FormQuestionType
    required: bool
    sortOrder: int
    options: list[FormQuestionOptionOut] | None = None


class FormOut(BaseModel):
    model_config = camel_config()
    id: str
    title: str
    description: str
    questions: list[FormQuestionOut]


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
    questions: list[FormQuestionOut]
    status: FormAssignmentStatus
    assignedAt: IsoDateTime
    submittedAt: IsoDateTime | None = None
    answers: list[FormAnswerOut]


class AssignFormIn(BaseModel):
    model_config = camel_config()
    formId: str
    clientIds: list[str]


class SubmitFormIn(BaseModel):
    model_config = camel_config()
    answers: list[FormAnswerIn]
