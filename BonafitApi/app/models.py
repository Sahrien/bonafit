from datetime import datetime
from uuid import uuid4

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.roles import UserRole


def new_id() -> str:
    return str(uuid4())


class Trainer(Base):
    __tablename__ = "trainers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    concurrent_capacity: Mapped[int] = mapped_column(Integer, nullable=False, default=1, server_default="1")

    schedules: Mapped[list["TrainerSchedule"]] = relationship(back_populates="trainer")
    appointments: Mapped[list["Appointment"]] = relationship(back_populates="trainer")
    user: Mapped["User | None"] = relationship(back_populates="trainer", uselist=False)


class Client(Base):
    __tablename__ = "clients"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    first_name: Mapped[str] = mapped_column(String(120), nullable=False)
    last_name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)
    phone: Mapped[str] = mapped_column(String(40), nullable=False)
    notes: Mapped[str] = mapped_column(Text, default="", nullable=False)
    instant_confirm: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    user: Mapped["User | None"] = relationship(back_populates="client", uselist=False)
    bonos: Mapped[list["ClientBono"]] = relationship(back_populates="client")
    coupons: Mapped[list["ClientCoupon"]] = relationship(back_populates="client")
    appointments: Mapped[list["Appointment"]] = relationship(back_populates="client")
    form_assignments: Mapped[list["FormAssignment"]] = relationship(back_populates="client")


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    email: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(200), nullable=False)
    display_name: Mapped[str] = mapped_column(String(200), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(
            UserRole,
            native_enum=False,
            length=20,
            values_callable=lambda roles: [role.value for role in roles],
            create_constraint=True,
            name="user_role",
        ),
        nullable=False,
    )
    trainer_id: Mapped[str | None] = mapped_column(ForeignKey("trainers.id"))
    client_id: Mapped[str | None] = mapped_column(ForeignKey("clients.id"))
    must_change_password: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    language: Mapped[str] = mapped_column(String(8), default="es", nullable=False, server_default="es")

    trainer: Mapped[Trainer | None] = relationship(back_populates="user")
    client: Mapped[Client | None] = relationship(back_populates="user")


class Service(Base):
    __tablename__ = "services"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    shares_session_pool: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    forces_single_session: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    allows_single_session: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    single_session_price: Mapped[float | None] = mapped_column(Numeric(10, 2))
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    bookable_by_client: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sale_kind: Mapped[str] = mapped_column(String(20), nullable=False, default="none", server_default="none")
    sale_value: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0, server_default="0")
    i18n: Mapped[dict] = mapped_column(JSON().with_variant(JSONB(), "postgresql"), default=dict, nullable=False)

    bonos: Mapped[list["Bono"]] = relationship(back_populates="service")
    appointments: Mapped[list["Appointment"]] = relationship(back_populates="service")


class Bono(Base):
    __tablename__ = "bonos"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    service_id: Mapped[str] = mapped_column(ForeignKey("services.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    session_count: Mapped[int] = mapped_column(Integer, nullable=False)
    price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    i18n: Mapped[dict] = mapped_column(JSON().with_variant(JSONB(), "postgresql"), default=dict, nullable=False)

    service: Mapped[Service] = relationship(back_populates="bonos")
    client_bonos: Mapped[list["ClientBono"]] = relationship(back_populates="bono")


class ClientBono(Base):
    __tablename__ = "client_bonos"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    client_id: Mapped[str] = mapped_column(ForeignKey("clients.id"), nullable=False)
    bono_id: Mapped[str] = mapped_column(ForeignKey("bonos.id"), nullable=False)
    remaining_sessions: Mapped[int] = mapped_column(Integer, nullable=False)
    is_gift: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    purchased_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    list_price: Mapped[float | None] = mapped_column(Numeric(10, 2))
    paid_price: Mapped[float | None] = mapped_column(Numeric(10, 2))
    coupon_id: Mapped[str | None] = mapped_column(ForeignKey("client_coupons.id"))

    client: Mapped[Client] = relationship(back_populates="bonos")
    bono: Mapped[Bono] = relationship(back_populates="client_bonos")
    coupon: Mapped["ClientCoupon | None"] = relationship()
    appointments: Mapped[list["Appointment"]] = relationship(back_populates="client_bono")


class ClientCoupon(Base):
    __tablename__ = "client_coupons"
    __table_args__ = (
        CheckConstraint(
            "(service_id IS NULL) OR (bono_id IS NULL)",
            name="client_coupon_one_scope",
        ),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    client_id: Mapped[str] = mapped_column(ForeignKey("clients.id"), nullable=False)
    kind: Mapped[str] = mapped_column(String(20), nullable=False)
    value: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    service_id: Mapped[str | None] = mapped_column(ForeignKey("services.id"))
    bono_id: Mapped[str | None] = mapped_column(ForeignKey("bonos.id"))
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    client: Mapped[Client] = relationship(back_populates="coupons")


class TrainerSchedule(Base):
    __tablename__ = "trainer_schedules"
    __table_args__ = (UniqueConstraint("trainer_id", "weekday", "start_time", "end_time"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    trainer_id: Mapped[str] = mapped_column(ForeignKey("trainers.id"), nullable=False)
    weekday: Mapped[int] = mapped_column(Integer, nullable=False)
    start_time: Mapped[str] = mapped_column(String(5), nullable=False)
    end_time: Mapped[str] = mapped_column(String(5), nullable=False)

    trainer: Mapped[Trainer] = relationship(back_populates="schedules")


class BookingSettings(Base):
    __tablename__ = "booking_settings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    next_day_cutoff_time: Mapped[str] = mapped_column(String(5), nullable=False)
    default_location: Mapped[str] = mapped_column(String(120), nullable=False)


class Branding(Base):
    __tablename__ = "branding"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    studio_name: Mapped[str] = mapped_column(String(120), nullable=False)
    slogan: Mapped[str] = mapped_column(String(200), nullable=False)
    primary_hex: Mapped[str] = mapped_column(String(7), nullable=False)
    accent_hex: Mapped[str] = mapped_column(String(7), nullable=False)
    surface_hex: Mapped[str] = mapped_column(String(7), nullable=False)
    color_scheme: Mapped[str] = mapped_column(String(20), nullable=False)
    logo_path: Mapped[str | None] = mapped_column(String(500))
    favicon_path: Mapped[str | None] = mapped_column(String(500))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class Appointment(Base):
    __tablename__ = "appointments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    trainer_id: Mapped[str] = mapped_column(ForeignKey("trainers.id"), nullable=False)
    client_id: Mapped[str] = mapped_column(ForeignKey("clients.id"), nullable=False)
    service_id: Mapped[str] = mapped_column(ForeignKey("services.id"), nullable=False)
    client_bono_id: Mapped[str | None] = mapped_column(ForeignKey("client_bonos.id"))
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    location: Mapped[str] = mapped_column(String(120), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    notes: Mapped[str] = mapped_column(Text, default="", nullable=False)

    trainer: Mapped[Trainer] = relationship(back_populates="appointments")
    client: Mapped[Client] = relationship(back_populates="appointments")
    service: Mapped[Service] = relationship(back_populates="appointments")
    client_bono: Mapped[ClientBono | None] = relationship(back_populates="appointments")


class Form(Base):
    __tablename__ = "forms"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    i18n: Mapped[dict] = mapped_column(JSON().with_variant(JSONB(), "postgresql"), default=dict, nullable=False)

    questions: Mapped[list["FormQuestion"]] = relationship(
        back_populates="form",
        cascade="all, delete-orphan",
        order_by="FormQuestion.sort_order",
    )
    assignments: Mapped[list["FormAssignment"]] = relationship(back_populates="form")


class FormQuestion(Base):
    __tablename__ = "form_questions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    form_id: Mapped[str] = mapped_column(ForeignKey("forms.id"), nullable=False)
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[str] = mapped_column(String(20), nullable=False)
    required: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False)
    i18n: Mapped[dict] = mapped_column(JSON().with_variant(JSONB(), "postgresql"), default=dict, nullable=False)

    form: Mapped[Form] = relationship(back_populates="questions")
    options: Mapped[list["FormQuestionOption"]] = relationship(
        back_populates="question",
        cascade="all, delete-orphan",
        order_by="FormQuestionOption.sort_order",
    )


class FormQuestionOption(Base):
    __tablename__ = "form_question_options"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    question_id: Mapped[str] = mapped_column(ForeignKey("form_questions.id"), nullable=False)
    label: Mapped[str] = mapped_column(String(200), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False)
    i18n: Mapped[dict] = mapped_column(JSON().with_variant(JSONB(), "postgresql"), default=dict, nullable=False)

    question: Mapped[FormQuestion] = relationship(back_populates="options")


class FormAssignment(Base):
    __tablename__ = "form_assignments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    form_id: Mapped[str] = mapped_column(ForeignKey("forms.id"), nullable=False)
    client_id: Mapped[str] = mapped_column(ForeignKey("clients.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    questions: Mapped[list] = mapped_column(JSON().with_variant(JSONB(), "postgresql"), nullable=False)
    i18n: Mapped[dict] = mapped_column(JSON().with_variant(JSONB(), "postgresql"), default=dict, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    assigned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    form: Mapped[Form] = relationship(back_populates="assignments")
    client: Mapped[Client] = relationship(back_populates="form_assignments")
    answers: Mapped[list["FormAnswer"]] = relationship(
        back_populates="assignment",
        cascade="all, delete-orphan",
    )


class FormAnswer(Base):
    __tablename__ = "form_answers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    assignment_id: Mapped[str] = mapped_column(ForeignKey("form_assignments.id"), nullable=False)
    question_id: Mapped[str] = mapped_column(String(36), nullable=False)
    value: Mapped[str] = mapped_column(Text, nullable=False)

    assignment: Mapped[FormAssignment] = relationship(back_populates="answers")


class AccountingSettings(Base):
    __tablename__ = "accounting_settings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    legal_name: Mapped[str] = mapped_column(String(200), nullable=False)
    tax_id: Mapped[str | None] = mapped_column(String(40))
    address: Mapped[str | None] = mapped_column(String(400))
    vat_regime: Mapped[str] = mapped_column(String(20), nullable=False, default="unknown")
    default_vat_rate: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    fiscal_year_start_month: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    default_recurring_day: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    currency: Mapped[str] = mapped_column(String(8), nullable=False, default="EUR")
    notes: Mapped[str | None] = mapped_column(Text)


class AccountingCategory(Base):
    __tablename__ = "accounting_categories"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    kind: Mapped[str] = mapped_column(String(20), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    i18n: Mapped[dict] = mapped_column(JSON().with_variant(JSONB(), "postgresql"), default=dict, nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    system: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    entries: Mapped[list["AccountingEntry"]] = relationship(back_populates="category")


class AccountingEntry(Base):
    __tablename__ = "accounting_entries"
    __table_args__ = (UniqueConstraint("source_id", name="accounting_entry_source_id"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    type: Mapped[str] = mapped_column(String(20), nullable=False)
    date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    concept: Mapped[str] = mapped_column(String(300), nullable=False)
    notes: Mapped[str] = mapped_column(Text, default="", nullable=False)
    category_id: Mapped[str] = mapped_column(ForeignKey("accounting_categories.id"), nullable=False)
    counterparty_name: Mapped[str] = mapped_column(String(200), default="", nullable=False)
    client_id: Mapped[str | None] = mapped_column(ForeignKey("clients.id"))
    source: Mapped[str] = mapped_column(String(20), nullable=False, default="manual")
    source_id: Mapped[str | None] = mapped_column(String(36))
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    vat_rate: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    vat_amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    net_amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    payment_status: Mapped[str] = mapped_column(String(20), nullable=False, default="paid")
    paid_amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    payment_method: Mapped[str] = mapped_column(String(20), nullable=False, default="other")
    recurring: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    recurring_day: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    category: Mapped[AccountingCategory] = relationship(back_populates="entries")
    client: Mapped[Client | None] = relationship()


class AccountingPeriodLock(Base):
    __tablename__ = "accounting_period_locks"
    __table_args__ = (UniqueConstraint("year", "month", name="accounting_period_lock_year_month"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    month: Mapped[int] = mapped_column(Integer, nullable=False)
