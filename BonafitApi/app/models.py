from datetime import datetime
from uuid import uuid4

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
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


def new_id() -> str:
    return str(uuid4())


class Trainer(Base):
    __tablename__ = "trainers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(200), nullable=False)

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
    appointments: Mapped[list["Appointment"]] = relationship(back_populates="client")
    form_assignments: Mapped[list["FormAssignment"]] = relationship(back_populates="client")


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    email: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(200), nullable=False)
    display_name: Mapped[str] = mapped_column(String(200), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    trainer_id: Mapped[str | None] = mapped_column(ForeignKey("trainers.id"))
    client_id: Mapped[str | None] = mapped_column(ForeignKey("clients.id"))
    must_change_password: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    trainer: Mapped[Trainer | None] = relationship(back_populates="user")
    client: Mapped[Client | None] = relationship(back_populates="user")


class Service(Base):
    __tablename__ = "services"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    category: Mapped[str] = mapped_column(String(40), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    allows_single_session: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    single_session_price: Mapped[float | None] = mapped_column(Numeric(10, 2))
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    bookable_by_client: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

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

    service: Mapped[Service] = relationship(back_populates="bonos")
    client_bonos: Mapped[list["ClientBono"]] = relationship(back_populates="bono")


class ClientBono(Base):
    __tablename__ = "client_bonos"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    client_id: Mapped[str] = mapped_column(ForeignKey("clients.id"), nullable=False)
    bono_id: Mapped[str] = mapped_column(ForeignKey("bonos.id"), nullable=False)
    remaining_sessions: Mapped[int] = mapped_column(Integer, nullable=False)
    purchased_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    client: Mapped[Client] = relationship(back_populates="bonos")
    bono: Mapped[Bono] = relationship(back_populates="client_bonos")
    appointments: Mapped[list["Appointment"]] = relationship(back_populates="client_bono")


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

    trainer: Mapped[Trainer] = relationship(back_populates="appointments")
    client: Mapped[Client] = relationship(back_populates="appointments")
    service: Mapped[Service] = relationship(back_populates="appointments")
    client_bono: Mapped[ClientBono | None] = relationship(back_populates="appointments")


class Form(Base):
    __tablename__ = "forms"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)

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

    question: Mapped[FormQuestion] = relationship(back_populates="options")


class FormAssignment(Base):
    __tablename__ = "form_assignments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    form_id: Mapped[str] = mapped_column(ForeignKey("forms.id"), nullable=False)
    client_id: Mapped[str] = mapped_column(ForeignKey("clients.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    questions: Mapped[list] = mapped_column(JSON().with_variant(JSONB(), "postgresql"), nullable=False)
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
