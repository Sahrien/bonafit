"""Load demo trainers, clients, services, and appointments if the database is empty."""

from __future__ import annotations

import argparse
import json
import sys
from collections.abc import Callable
from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.containers import Container
from app.database import Database
from app.models import (
    Appointment,
    Bono,
    BookingSettings,
    Branding,
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
from app.roles import UserRole
from app.schemas import FORM_HEADING_TYPE, FORM_OPTION_TYPES, FormWrite
from app.security import hash_password
from app.serializers import questions_snapshot
from app.services.branding import default_branding

INTAKE_FORM_PATH = Path(__file__).with_name("_intake_form.json")
INTAKE_FORM_EN_PATH = Path(__file__).with_name("_intake_form_en.json")


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
                email="lucia@bonafit.com",
                password_hash=password_hash,
                display_name="Alex Martin",
                role=UserRole.ADMIN,
                trainer_id="trainer-1",
                must_change_password=False,
            ),
            User(
                id="user-trainer-2",
                email="sam.ortega@bonafit.com",
                password_hash=password_hash,
                display_name="Sam Ortega",
                role=UserRole.ADMIN,
                trainer_id="trainer-2",
                must_change_password=False,
            ),
            User(
                id="user-client-1",
                email="marina.lopez@example.com",
                password_hash=password_hash,
                display_name="Marina Lopez",
                role=UserRole.CLIENT,
                client_id="client-1",
                must_change_password=False,
            ),
            User(
                id="user-client-2",
                email="pablo.nieto@example.com",
                password_hash=password_hash,
                display_name="Pablo Nieto",
                role=UserRole.CLIENT,
                client_id="client-2",
                must_change_password=False,
            ),
            User(
                id="user-client-3",
                email="iris.vega@example.com",
                password_hash=password_hash,
                display_name="Iris Vega",
                role=UserRole.CLIENT,
                client_id="client-3",
                must_change_password=False,
            ),
        ]
    )

    ep = Service(
        id="svc-ep",
        name="Entrenamiento personal",
        shares_session_pool=True,
        forces_single_session=False,
        allows_single_session=False,
        duration_minutes=60,
        bookable_by_client=True,
        active=True,
        i18n={"name": {"es": "Entrenamiento personal", "en": "Personal training"}},
    )
    hipo = Service(
        id="svc-hipo",
        name="Hipopresivos",
        shares_session_pool=True,
        forces_single_session=False,
        allows_single_session=False,
        duration_minutes=45,
        bookable_by_client=True,
        active=True,
        i18n={"name": {"es": "Hipopresivos", "en": "Hypopressives"}},
    )
    masaje = Service(
        id="svc-masaje",
        name="Masaje",
        shares_session_pool=True,
        forces_single_session=True,
        allows_single_session=True,
        single_session_price=45,
        duration_minutes=60,
        bookable_by_client=False,
        active=True,
        i18n={"name": {"es": "Masaje", "en": "Massage"}},
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
                i18n={
                    "name": {"es": "pack-10", "en": "10-session pack"},
                    "description": {"es": "sessions-10", "en": "10 sessions"},
                },
            ),
            Bono(
                id="bono-ep-5",
                service_id="svc-ep",
                name="pack-5",
                description="sessions-5",
                session_count=5,
                price=220,
                i18n={
                    "name": {"es": "pack-5", "en": "5-session pack"},
                    "description": {"es": "sessions-5", "en": "5 sessions"},
                },
            ),
            Bono(
                id="bono-hipo-8",
                service_id="svc-hipo",
                name="pack-8",
                description="sessions-8",
                session_count=8,
                price=240,
                i18n={
                    "name": {"es": "pack-8", "en": "8-session pack"},
                    "description": {"es": "sessions-8", "en": "8 sessions"},
                },
            ),
            Bono(
                id="bono-masaje-1",
                service_id="svc-masaje",
                name="sesion-suelta",
                description="sessions-1",
                session_count=1,
                price=45,
                i18n={
                    "name": {"es": "sesion-suelta", "en": "Single session"},
                    "description": {"es": "sessions-1", "en": "1 session"},
                },
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
    db.add(default_branding())

    form = _seed_intake_form(db)
    snapshot = questions_snapshot(form)
    pending = FormAssignment(
        id="fa-1",
        form_id="form-1",
        client_id="client-1",
        title=form.title,
        questions=snapshot,
        i18n=getattr(form, "i18n", None) or {},
        status="pending",
        assigned_at=datetime(2026, 9, 1, 10, 0, tzinfo=UTC),
    )
    completed = FormAssignment(
        id="fa-2",
        form_id="form-1",
        client_id="client-2",
        title=form.title,
        questions=snapshot,
        i18n=getattr(form, "i18n", None) or {},
        status="completed",
        assigned_at=datetime(2026, 8, 20, 10, 0, tzinfo=UTC),
        submitted_at=datetime(2026, 8, 21, 9, 15, tzinfo=UTC),
    )
    completed.answers.extend(_demo_intake_answers(form))
    db.add_all([pending, completed])


def _seed_intake_form(db: Session) -> Form:
    payload = _intake_write()
    english = json.loads(INTAKE_FORM_EN_PATH.read_text(encoding="utf-8"))
    form = Form(
        id="form-1",
        title=payload.title,
        description=payload.description,
        i18n={
            "title": {"es": payload.title, "en": english["title"]},
            "description": {"es": payload.description, "en": english["description"]},
        },
    )
    _append_intake_questions(form, payload, english)
    db.add(form)
    db.flush()
    return form


def _intake_write() -> FormWrite:
    return FormWrite.model_validate_json(INTAKE_FORM_PATH.read_text(encoding="utf-8"))


def _append_intake_questions(form: Form, payload: FormWrite, english: dict) -> None:
    en_by_order = {item["sortOrder"]: item for item in english.get("questions", [])}
    for item in payload.questions:
        question_id = f"q-{item.sortOrder}"
        en_item = en_by_order.get(item.sortOrder, {})
        question = FormQuestion(
            id=question_id,
            prompt=item.prompt.strip(),
            type=item.type,
            required=False if item.type == FORM_HEADING_TYPE else item.required,
            sort_order=item.sortOrder,
            i18n={"prompt": {"es": item.prompt.strip(), "en": en_item.get("prompt", item.prompt.strip())}},
        )
        if item.type in FORM_OPTION_TYPES:
            en_options = {opt["sortOrder"]: opt for opt in en_item.get("options") or []}
            for option in item.options or []:
                en_label = (en_options.get(option.sortOrder) or {}).get("label", option.label.strip())
                question.options.append(
                    FormQuestionOption(
                        id=f"{question_id}-opt-{option.sortOrder}",
                        label=option.label.strip(),
                        sort_order=option.sortOrder,
                        i18n={"label": {"es": option.label.strip(), "en": en_label}},
                    )
                )
        form.questions.append(question)


def _demo_intake_answers(form: Form) -> list[FormAnswer]:
    return [
        FormAnswer(question_id=question.id, value=value)
        for question in form.questions
        if (value := _demo_intake_value(question))
    ]


def _demo_intake_value(question: FormQuestion) -> str:
    if question.type == FORM_HEADING_TYPE:
        return ""
    prompt = question.prompt.lower()
    if question.type == "fullName":
        return json.dumps({"firstName": "Pablo", "lastName": "Nieto"}, ensure_ascii=False)
    if question.type == "email":
        return "pablo.nieto@example.com"
    if question.type == "phone":
        return "+34600111222" if "emergencia" in prompt else "+34600999888"
    if question.type == "date":
        return "1992-04-12" if "nacimiento" in prompt else "2026-08-21"
    if question.type == "address":
        return "Calle Mayor 1, Madrid"
    if question.type == "number":
        if "peso" in prompt:
            return "74"
        if "altura" in prompt:
            return "178"
        if "sueño" in prompt or "sueno" in prompt:
            return "7"
        if "semana" in prompt:
            return "3"
        return "1"
    if question.type == "singleChoice":
        wanted = ""
        if "sexo" in prompt:
            wanted = "Hombre"
        elif "tabaco" in prompt:
            wanted = "No"
        elif "alcohol" in prompt:
            wanted = "Ocasional"
        elif "actividad" in prompt:
            wanted = "Regular"
        elif "dieta" in prompt:
            wanted = "Mejorable"
        elif "estrés" in prompt or "estres" in prompt:
            wanted = "Moderado"
        options = sorted(question.options, key=lambda option: option.sort_order)
        match = next((option for option in options if option.label == wanted), None)
        if match is not None:
            return match.id
        return options[0].id if options else ""
    if question.type == "terms":
        return "yes"
    if question.type == "shortText":
        if "parentesco" in prompt:
            return "Hermana"
        if "emergencia" in prompt:
            return "Laura Nieto"
        return "Pablo Nieto"
    if question.type == "text":
        if "alergia" in prompt:
            return "Ninguna"
        if "lesión" in prompt or "lesion" in prompt:
            return "Molestia de rodilla"
        if "medicación" in prompt or "medicacion" in prompt:
            return "Ninguna"
        if "ejercicio o movimiento" in prompt:
            return "No"
        if "operación" in prompt or "operacion" in prompt or "embarazo" in prompt:
            return "No"
        if "semana típica" in prompt or "semana tipica" in prompt:
            return "Caminatas de 40 minutos tres días por semana."
        if "entrenado previamente" in prompt:
            return "Sala de musculación de forma intermitente."
        if "comes al día" in prompt or "comes al dia" in prompt:
            return "Cuatro comidas: desayuno, comida, merienda y cena."
        if "objetivos" in prompt:
            return "1. Fuerza. 2. Salud general."
        if "días" in prompt or "dias" in prompt:
            return "Lunes y miércoles a las 18:00."
        if "material" in prompt:
            return "Esterilla y mancuernas ligeras."
        if "algo más" in prompt or "algo mas" in prompt:
            return ""
        return "Sin comentarios."
    return "ok"


def already_seeded(db: Session) -> bool:
    return db.scalar(select(Trainer.id).where(Trainer.id == "trainer-1")) is not None


def ensure_demo_service_names(db: Session) -> None:
    for service_id, name, shares_session_pool, forces_single_session in (
        ("svc-ep", "Entrenamiento personal", True, False),
        ("svc-hipo", "Hipopresivos", True, False),
        ("svc-masaje", "Masaje", True, True),
    ):
        row = db.get(Service, service_id)
        if row is None:
            continue
        row.name = name
        row.shares_session_pool = shares_session_pool
        row.forces_single_session = forces_single_session
        if forces_single_session:
            row.allows_single_session = True
            row.bookable_by_client = False


def ensure_masaje_single_session_bono(db: Session) -> None:
    if db.get(Bono, "bono-masaje-1") is not None:
        return
    if db.get(Service, "svc-masaje") is None:
        return
    db.add(
        Bono(
            id="bono-masaje-1",
            service_id="svc-masaje",
            name="sesion-suelta",
            description="sessions-1",
            session_count=1,
            price=45,
            i18n={
                "name": {"es": "sesion-suelta", "en": "Single session"},
                "description": {"es": "sessions-1", "en": "1 session"},
            },
        )
    )


def ensure_intake_form(db: Session) -> None:
    form = db.get(Form, "form-1")
    if form is None:
        return
    if any(question.type == FORM_HEADING_TYPE for question in form.questions):
        return
    payload = _intake_write()
    english = json.loads(INTAKE_FORM_EN_PATH.read_text(encoding="utf-8"))
    form.title = payload.title
    form.description = payload.description
    form.i18n = {
        "title": {"es": payload.title, "en": english["title"]},
        "description": {"es": payload.description, "en": english["description"]},
    }
    form.questions.clear()
    db.flush()
    _append_intake_questions(form, payload, english)
    db.flush()
    snapshot = questions_snapshot(form)
    pending = db.get(FormAssignment, "fa-1")
    if pending is not None:
        pending.title = form.title
        pending.questions = snapshot
        pending.status = "pending"
        pending.submitted_at = None
        pending.answers.clear()
    completed = db.get(FormAssignment, "fa-2")
    if completed is not None:
        completed.title = form.title
        completed.questions = snapshot
        completed.status = "completed"
        completed.answers.clear()
        completed.answers.extend(_demo_intake_answers(form))


def ensure_demo_trainer_emails(db: Session) -> None:
    mapping = {
        "user-trainer-1": "lucia@bonafit.com",
        "user-trainer-2": "sam.ortega@bonafit.com",
    }
    for user_id, email in mapping.items():
        user = db.get(User, user_id)
        if user is not None and user.email != email:
            user.email = email


def ensure_branding(db: Session) -> None:
    if db.get(Branding, "branding") is None:
        db.add(default_branding())


CONFIRM_PHRASE = "RESET"


def prompt_force_confirmation(read_line: Callable[[str], str] = input) -> bool:
    print("This will DELETE all data in the database and load demo seed data.")
    try:
        typed = read_line(f"Type {CONFIRM_PHRASE} to continue: ")
    except EOFError:
        return False
    return typed.strip() == CONFIRM_PHRASE


def seed_database(database: Database) -> str:
    with database.session() as db:
        if already_seeded(db):
            ensure_demo_service_names(db)
            ensure_masaje_single_session_bono(db)
            ensure_demo_trainer_emails(db)
            ensure_intake_form(db)
            ensure_branding(db)
            return "Database already seeded."
        seed_if_empty(db)
    return "Seeded demo data."


def main(
    argv: list[str] | None = None,
    *,
    database: Database | None = None,
    read_line: Callable[[str], str] = input,
) -> None:
    parser = argparse.ArgumentParser(
        description="Load demo data if the database is empty. Use --force to wipe and reseed.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help=f"Delete all rows and reseed after typing {CONFIRM_PHRASE}",
    )
    args = parser.parse_args(argv)

    db = database or Container().db()
    if args.force:
        if not prompt_force_confirmation(read_line):
            print("Aborted.", file=sys.stderr)
            raise SystemExit(1)
        db.clear_tables()
        print("Cleared database.")

    print(seed_database(db))


if __name__ == "__main__":
    main()
