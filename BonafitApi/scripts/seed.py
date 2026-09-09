"""Load demo trainers, clients, services, and appointments if the database is empty."""

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from scripts.session import session_scope
from app.models import (
    Appointment,
    Bono,
    BookingSettings,
    Client,
    ClientBono,
    Form,
    FormAnswer,
    FormAssignment,
    FormQuestion,
    FormQuestionOption,
    Service,
    Trainer,
    TrainerSchedule,
    User,
)
from app.security import hash_password
from app.serializers import questions_snapshot


def seed_if_empty(db: Session) -> None:
    if db.get(Trainer, "trainer-1") is not None:
        return

    password_hash = hash_password(settings.bootstrap_password)

    alex = Trainer(id="trainer-1", name="Alex Martin")
    sam = Trainer(id="trainer-2", name="Sam Ortega")
    db.add_all([alex, sam])

    marina = Client(
        id="client-1",
        first_name="Marina",
        last_name="Lopez",
        email="marina.lopez@example.com",
        phone="+34000000001",
        notes="",
        instant_confirm=True,
    )
    pablo = Client(
        id="client-2",
        first_name="Pablo",
        last_name="Nieto",
        email="pablo.nieto@example.com",
        phone="+34000000002",
        notes="knee",
        instant_confirm=False,
    )
    iris = Client(
        id="client-3",
        first_name="Iris",
        last_name="Vega",
        email="iris.vega@example.com",
        phone="+34000000003",
        notes="",
        instant_confirm=False,
    )
    db.add_all([marina, pablo, iris])

    db.add_all(
        [
            User(
                id="user-trainer-1",
                email="alex.martin@bonafit.local",
                password_hash=password_hash,
                display_name="Alex Martin",
                role="admin",
                trainer_id="trainer-1",
                must_change_password=False,
            ),
            User(
                id="user-trainer-2",
                email="sam.ortega@bonafit.local",
                password_hash=password_hash,
                display_name="Sam Ortega",
                role="admin",
                trainer_id="trainer-2",
                must_change_password=False,
            ),
            User(
                id="user-client-1",
                email="marina.lopez@example.com",
                password_hash=password_hash,
                display_name="Marina Lopez",
                role="client",
                client_id="client-1",
                must_change_password=False,
            ),
            User(
                id="user-client-2",
                email="pablo.nieto@example.com",
                password_hash=password_hash,
                display_name="Pablo Nieto",
                role="client",
                client_id="client-2",
                must_change_password=False,
            ),
            User(
                id="user-client-3",
                email="iris.vega@example.com",
                password_hash=password_hash,
                display_name="Iris Vega",
                role="client",
                client_id="client-3",
                must_change_password=False,
            ),
        ]
    )

    ep = Service(
        id="svc-ep",
        category="entrenamiento-personal",
        name="entrenamiento-personal",
        allows_single_session=False,
        duration_minutes=60,
        bookable_by_client=True,
        active=True,
    )
    hipo = Service(
        id="svc-hipo",
        category="hipopresivos",
        name="hipopresivos",
        allows_single_session=False,
        duration_minutes=45,
        bookable_by_client=True,
        active=True,
    )
    masaje = Service(
        id="svc-masaje",
        category="masaje",
        name="masaje",
        allows_single_session=True,
        single_session_price=45,
        duration_minutes=60,
        bookable_by_client=False,
        active=True,
    )
    db.add_all([ep, hipo, masaje])

    db.add_all(
        [
            Bono(
                id="bono-ep-10",
                service_id="svc-ep",
                name="pack-10",
                description="sessions-10",
                session_count=10,
                price=400,
            ),
            Bono(
                id="bono-ep-5",
                service_id="svc-ep",
                name="pack-5",
                description="sessions-5",
                session_count=5,
                price=220,
            ),
            Bono(
                id="bono-hipo-8",
                service_id="svc-hipo",
                name="pack-8",
                description="sessions-8",
                session_count=8,
                price=240,
            ),
        ]
    )

    db.add_all(
        [
            ClientBono(
                id="cb-1",
                client_id="client-1",
                bono_id="bono-ep-10",
                remaining_sessions=7,
                purchased_at=datetime(2026, 6, 1, 10, 0, tzinfo=UTC),
                expires_at=datetime(2026, 12, 1, 10, 0, tzinfo=UTC),
            ),
            ClientBono(
                id="cb-2",
                client_id="client-2",
                bono_id="bono-hipo-8",
                remaining_sessions=3,
                purchased_at=datetime(2026, 7, 15, 10, 0, tzinfo=UTC),
                expires_at=None,
            ),
        ]
    )

    db.add_all(
        [
            Appointment(
                id="apt-1",
                trainer_id="trainer-1",
                client_id="client-1",
                service_id="svc-ep",
                client_bono_id="cb-1",
                starts_at=datetime(2026, 9, 7, 8, 0, tzinfo=UTC),
                ends_at=datetime(2026, 9, 7, 9, 0, tzinfo=UTC),
                location="studio-1",
                status="completed",
            ),
            Appointment(
                id="apt-2",
                trainer_id="trainer-2",
                client_id="client-2",
                service_id="svc-hipo",
                client_bono_id="cb-2",
                starts_at=datetime(2026, 9, 7, 9, 30, tzinfo=UTC),
                ends_at=datetime(2026, 9, 7, 10, 15, tzinfo=UTC),
                location="studio-2",
                status="completed",
            ),
            Appointment(
                id="apt-3",
                trainer_id="trainer-1",
                client_id="client-3",
                service_id="svc-masaje",
                starts_at=datetime(2026, 9, 8, 16, 0, tzinfo=UTC),
                ends_at=datetime(2026, 9, 8, 17, 0, tzinfo=UTC),
                location="studio-1",
                status="confirmed",
            ),
        ]
    )

    schedules: list[TrainerSchedule] = []
    for trainer_id, prefix in (("trainer-1", "sch-1"), ("trainer-2", "sch-2")):
        for weekday in range(1, 6):
            schedules.append(
                TrainerSchedule(
                    id=f"{prefix}-{weekday}",
                    trainer_id=trainer_id,
                    weekday=weekday,
                    start_time="08:00",
                    end_time="18:00",
                )
            )
    db.add_all(schedules)

    db.add(
        BookingSettings(
            id="booking-settings",
            next_day_cutoff_time="18:00",
            default_location="studio-1",
        )
    )

    form = Form(
        id="form-1",
        title="Cuestionario inicial",
        description="Datos de salud y objetivos para el primer mes.",
    )
    q1 = FormQuestion(
        id="q-1",
        prompt="¿Tienes alguna lesión o molestia actual?",
        type="yesno",
        required=True,
        sort_order=0,
    )
    q2 = FormQuestion(
        id="q-2",
        prompt="Describe la lesión o indica ninguna",
        type="text",
        required=False,
        sort_order=1,
    )
    q3 = FormQuestion(
        id="q-3",
        prompt="¿Cuál es tu objetivo principal?",
        type="singleChoice",
        required=True,
        sort_order=2,
    )
    q3.options.extend(
        [
            FormQuestionOption(id="opt-strength", label="Fuerza", sort_order=0),
            FormQuestionOption(id="opt-weight", label="Pérdida de peso", sort_order=1),
            FormQuestionOption(id="opt-health", label="Salud general", sort_order=2),
        ]
    )
    form.questions.extend([q1, q2, q3])
    db.add(form)
    db.flush()

    snapshot = questions_snapshot(form)
    pending = FormAssignment(
        id="fa-1",
        form_id="form-1",
        client_id="client-1",
        title=form.title,
        questions=snapshot,
        status="pending",
        assigned_at=datetime(2026, 9, 1, 10, 0, tzinfo=UTC),
    )
    completed = FormAssignment(
        id="fa-2",
        form_id="form-1",
        client_id="client-2",
        title=form.title,
        questions=snapshot,
        status="completed",
        assigned_at=datetime(2026, 8, 20, 10, 0, tzinfo=UTC),
        submitted_at=datetime(2026, 8, 21, 9, 15, tzinfo=UTC),
    )
    completed.answers.extend(
        [
            FormAnswer(question_id="q-1", value="yes"),
            FormAnswer(question_id="q-2", value="Molestia de rodilla"),
            FormAnswer(question_id="q-3", value="opt-health"),
        ]
    )
    db.add_all([pending, completed])


def already_seeded(db: Session) -> bool:
    return db.scalar(select(Trainer.id).where(Trainer.id == "trainer-1")) is not None


def main() -> None:
    with session_scope() as db:
        if already_seeded(db):
            print("Database already seeded.")
            return
        seed_if_empty(db)
    print("Seeded demo data.")


if __name__ == "__main__":
    main()
