from datetime import UTC

from app.models import (
    Appointment,
    Bono,
    BookingSettings,
    Client,
    ClientBono,
    Form,
    FormAssignment,
    FormQuestion,
    Service,
    Trainer,
    TrainerSchedule,
    User,
)
from app.schemas import (
    AppointmentOut,
    AuthUserOut,
    BonoOut,
    BookingSettingsOut,
    ClientBonoOut,
    ClientOut,
    FormAnswerOut,
    FormAssignmentOut,
    FormOut,
    FormQuestionOptionOut,
    FormQuestionOut,
    ServiceOut,
    TrainerOut,
    TrainerScheduleOut,
)


def user_out(user: User) -> AuthUserOut:
    return AuthUserOut(
        id=user.id,
        displayName=user.display_name,
        role=user.role,  # type: ignore[arg-type]
        trainerId=user.trainer_id,
        clientId=user.client_id,
        email=user.email,
        mustChangePassword=user.must_change_password,
    )


def trainer_out(row: Trainer) -> TrainerOut:
    return TrainerOut(id=row.id, name=row.name)


def client_out(
    row: Client,
    *,
    hide_notes: bool = False,
    temporary_password: str | None = None,
) -> ClientOut:
    return ClientOut(
        id=row.id,
        firstName=row.first_name,
        lastName=row.last_name,
        email=row.email,
        phone=row.phone,
        notes="" if hide_notes else row.notes,
        instantConfirm=row.instant_confirm,
        temporaryPassword=temporary_password,
    )


def service_out(row: Service) -> ServiceOut:
    price = float(row.single_session_price) if row.single_session_price is not None else None
    return ServiceOut(
        id=row.id,
        category=row.category,  # type: ignore[arg-type]
        name=row.name,
        allowsSingleSession=row.allows_single_session,
        singleSessionPrice=price,
        durationMinutes=row.duration_minutes,
        bookableByClient=row.bookable_by_client,
        active=row.active,
    )


def bono_out(row: Bono) -> BonoOut:
    return BonoOut(
        id=row.id,
        serviceId=row.service_id,
        name=row.name,
        description=row.description,
        sessionCount=row.session_count,
        price=float(row.price),
    )


def client_bono_out(row: ClientBono) -> ClientBonoOut:
    return ClientBonoOut(
        id=row.id,
        clientId=row.client_id,
        bonoId=row.bono_id,
        remainingSessions=row.remaining_sessions,
        purchasedAt=row.purchased_at,
        expiresAt=row.expires_at,
    )


def appointment_out(row: Appointment) -> AppointmentOut:
    return AppointmentOut(
        id=row.id,
        trainerId=row.trainer_id,
        clientId=row.client_id,
        serviceId=row.service_id,
        clientBonoId=row.client_bono_id,
        startsAt=row.starts_at,
        endsAt=row.ends_at,
        location=row.location,
        status=row.status,  # type: ignore[arg-type]
    )


def settings_out(row: BookingSettings) -> BookingSettingsOut:
    return BookingSettingsOut(
        id=row.id,
        nextDayCutoffTime=row.next_day_cutoff_time,
        defaultLocation=row.default_location,
    )


def schedule_out(row: TrainerSchedule) -> TrainerScheduleOut:
    return TrainerScheduleOut(
        id=row.id,
        trainerId=row.trainer_id,
        weekday=row.weekday,
        startTime=row.start_time,
        endTime=row.end_time,
    )


def question_out(row: FormQuestion) -> FormQuestionOut:
    options = None
    if row.type == "singleChoice":
        options = [
            FormQuestionOptionOut(id=option.id, label=option.label, sortOrder=option.sort_order)
            for option in sorted(row.options, key=lambda item: item.sort_order)
        ]
    return FormQuestionOut(
        id=row.id,
        prompt=row.prompt,
        type=row.type,  # type: ignore[arg-type]
        required=row.required,
        sortOrder=row.sort_order,
        options=options,
    )


def form_out(row: Form) -> FormOut:
    questions = [question_out(item) for item in sorted(row.questions, key=lambda q: q.sort_order)]
    return FormOut(id=row.id, title=row.title, description=row.description, questions=questions)


def questions_snapshot(row: Form) -> list[dict]:
    payload = []
    for question in sorted(row.questions, key=lambda item: item.sort_order):
        item = {
            "id": question.id,
            "prompt": question.prompt,
            "type": question.type,
            "required": question.required,
            "sortOrder": question.sort_order,
        }
        if question.type == "singleChoice":
            item["options"] = [
                {"id": option.id, "label": option.label, "sortOrder": option.sort_order}
                for option in sorted(question.options, key=lambda opt: opt.sort_order)
            ]
        payload.append(item)
    return payload


def assignment_out(row: FormAssignment) -> FormAssignmentOut:
    questions = [FormQuestionOut.model_validate(item) for item in row.questions]
    answers = [
        FormAnswerOut(questionId=answer.question_id, value=answer.value) for answer in row.answers
    ]
    return FormAssignmentOut(
        id=row.id,
        formId=row.form_id,
        clientId=row.client_id,
        title=row.title,
        questions=questions,
        status=row.status,  # type: ignore[arg-type]
        assignedAt=row.assigned_at,
        submittedAt=row.submitted_at,
        answers=answers,
    )


def ensure_aware(value):
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value
