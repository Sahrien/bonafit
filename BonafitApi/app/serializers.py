from datetime import UTC

from app.i18n import DEFAULT_LANGUAGE, resolve_text
from app.models import (
    Appointment,
    Bono,
    BookingSettings,
    Branding,
    Client,
    ClientBono,
    ClientCoupon,
    Form,
    FormAssignment,
    FormQuestion,
    Service,
    Trainer,
    TrainerSchedule,
    User,
)
from app.schemas import (
    FORM_OPTION_TYPES,
    AppointmentOut,
    AuthUserOut,
    BonoOut,
    BookingSettingsOut,
    BrandingOut,
    ClientBonoOut,
    ClientCouponOut,
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
    language = getattr(user, "language", None) or DEFAULT_LANGUAGE
    if language not in ("es", "en"):
        language = DEFAULT_LANGUAGE
    return AuthUserOut(
        id=user.id,
        displayName=user.display_name,
        role=user.role,
        trainerId=user.trainer_id,
        clientId=user.client_id,
        email=user.email,
        mustChangePassword=user.must_change_password,
        language=language,  # type: ignore[arg-type]
    )


def trainer_out(row: Trainer) -> TrainerOut:
    return TrainerOut(id=row.id, name=row.name, concurrentCapacity=row.concurrent_capacity)


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


def service_out(row: Service, language: str = DEFAULT_LANGUAGE) -> ServiceOut:
    price = float(row.single_session_price) if row.single_session_price is not None else None
    i18n = getattr(row, "i18n", None) or {}
    return ServiceOut(
        id=row.id,
        name=resolve_text(row.name, i18n, "name", language),
        sharesSessionPool=row.shares_session_pool,
        forcesSingleSession=row.forces_single_session,
        allowsSingleSession=row.allows_single_session,
        singleSessionPrice=price,
        durationMinutes=row.duration_minutes,
        bookableByClient=row.bookable_by_client,
        active=row.active,
        saleKind=getattr(row, "sale_kind", None) or "none",  # type: ignore[arg-type]
        saleValue=float(getattr(row, "sale_value", 0) or 0),
        i18n=i18n if isinstance(i18n, dict) else {},
    )


def bono_out(row: Bono, language: str = DEFAULT_LANGUAGE) -> BonoOut:
    i18n = getattr(row, "i18n", None) or {}
    return BonoOut(
        id=row.id,
        serviceId=row.service_id,
        name=resolve_text(row.name, i18n, "name", language),
        description=resolve_text(row.description, i18n, "description", language),
        sessionCount=row.session_count,
        price=float(row.price),
        i18n=i18n if isinstance(i18n, dict) else {},
    )


def client_bono_out(row: ClientBono) -> ClientBonoOut:
    return ClientBonoOut(
        id=row.id,
        clientId=row.client_id,
        bonoId=row.bono_id,
        remainingSessions=row.remaining_sessions,
        isGift=row.is_gift,
        purchasedAt=row.purchased_at,
        expiresAt=row.expires_at,
        listPrice=float(row.list_price) if row.list_price is not None else None,
        paidPrice=float(row.paid_price) if row.paid_price is not None else None,
        couponId=row.coupon_id,
    )


def client_coupon_out(row: ClientCoupon) -> ClientCouponOut:
    return ClientCouponOut(
        id=row.id,
        clientId=row.client_id,
        kind=row.kind,  # type: ignore[arg-type]
        value=float(row.value),
        serviceId=row.service_id,
        bonoId=row.bono_id,
        usedAt=row.used_at,
    )


def appointment_out(row: Appointment, hide_notes: bool = False) -> AppointmentOut:
    bono = row.client_bono
    return AppointmentOut(
        id=row.id,
        trainerId=row.trainer_id,
        clientId=row.client_id,
        serviceId=row.service_id,
        clientBonoId=row.client_bono_id,
        isGift=bool(bono.is_gift) if bono is not None else False,
        startsAt=row.starts_at,
        endsAt=row.ends_at,
        location=row.location,
        status=row.status,  # type: ignore[arg-type]
        notes="" if hide_notes else (row.notes or ""),
    )


def settings_out(row: BookingSettings) -> BookingSettingsOut:
    return BookingSettingsOut(
        id=row.id,
        nextDayCutoffTime=row.next_day_cutoff_time,
        defaultLocation=row.default_location,
    )


def _public_upload_url(path: str | None) -> str | None:
    if not path:
        return None
    return f"/uploads/{path.lstrip('/')}"


def branding_out(row: Branding) -> BrandingOut:
    return BrandingOut(
        id=row.id,
        studioName=row.studio_name,
        slogan=row.slogan,
        primaryHex=row.primary_hex,
        accentHex=row.accent_hex,
        surfaceHex=row.surface_hex,
        colorScheme=row.color_scheme,  # type: ignore[arg-type]
        logoUrl=_public_upload_url(row.logo_path),
        faviconUrl=_public_upload_url(row.favicon_path),
        updatedAt=row.updated_at,
    )


def schedule_out(row: TrainerSchedule) -> TrainerScheduleOut:
    return TrainerScheduleOut(
        id=row.id,
        trainerId=row.trainer_id,
        weekday=row.weekday,
        startTime=row.start_time,
        endTime=row.end_time,
    )


def question_out(row: FormQuestion, language: str = DEFAULT_LANGUAGE) -> FormQuestionOut:
    options = None
    i18n = getattr(row, "i18n", None) or {}
    if row.type in FORM_OPTION_TYPES:
        options = [
            FormQuestionOptionOut(
                id=option.id,
                label=resolve_text(option.label, getattr(option, "i18n", None) or {}, "label", language),
                sortOrder=option.sort_order,
                i18n=getattr(option, "i18n", None) or {},
            )
            for option in sorted(row.options, key=lambda item: item.sort_order)
        ]
    return FormQuestionOut(
        id=row.id,
        prompt=resolve_text(row.prompt, i18n, "prompt", language),
        type=row.type,  # type: ignore[arg-type]
        required=row.required,
        sortOrder=row.sort_order,
        options=options,
        i18n=i18n if isinstance(i18n, dict) else {},
    )


def form_out(row: Form, language: str = DEFAULT_LANGUAGE) -> FormOut:
    i18n = getattr(row, "i18n", None) or {}
    questions = [question_out(item, language) for item in sorted(row.questions, key=lambda q: q.sort_order)]
    return FormOut(
        id=row.id,
        title=resolve_text(row.title, i18n, "title", language),
        description=resolve_text(row.description, i18n, "description", language),
        questions=questions,
        i18n=i18n if isinstance(i18n, dict) else {},
    )


def questions_snapshot(row: Form) -> list[dict]:
    payload = []
    for question in sorted(row.questions, key=lambda item: item.sort_order):
        item = {
            "id": question.id,
            "prompt": question.prompt,
            "type": question.type,
            "required": question.required,
            "sortOrder": question.sort_order,
            "i18n": getattr(question, "i18n", None) or {},
        }
        if question.type in FORM_OPTION_TYPES:
            item["options"] = [
                {
                    "id": option.id,
                    "label": option.label,
                    "sortOrder": option.sort_order,
                    "i18n": getattr(option, "i18n", None) or {},
                }
                for option in sorted(question.options, key=lambda opt: opt.sort_order)
            ]
        payload.append(item)
    return payload


def _snapshot_question_out(item: dict, language: str) -> FormQuestionOut:
    options = None
    raw_options = item.get("options")
    if raw_options:
        options = [
            FormQuestionOptionOut(
                id=option["id"],
                label=resolve_text(option.get("label", ""), option.get("i18n"), "label", language),
                sortOrder=option.get("sortOrder", 0),
                i18n=option.get("i18n") or {},
            )
            for option in raw_options
        ]
    return FormQuestionOut(
        id=item["id"],
        prompt=resolve_text(item.get("prompt", ""), item.get("i18n"), "prompt", language),
        type=item["type"],
        required=bool(item.get("required")),
        sortOrder=item.get("sortOrder", 0),
        options=options,
        i18n=item.get("i18n") or {},
    )


def assignment_out(row: FormAssignment, language: str = DEFAULT_LANGUAGE) -> FormAssignmentOut:
    questions = [_snapshot_question_out(item, language) for item in row.questions]
    answers = [
        FormAnswerOut(questionId=answer.question_id, value=answer.value) for answer in row.answers
    ]
    form_i18n = getattr(row.form, "i18n", None) or {} if row.form is not None else {}
    assignment_i18n = getattr(row, "i18n", None) or {}
    bundled = assignment_i18n or {
        "title": (form_i18n.get("title") if isinstance(form_i18n, dict) else None) or {"es": row.title},
        "description": (form_i18n.get("description") if isinstance(form_i18n, dict) else None)
        or {"es": row.form.description if row.form is not None else ""},
    }
    description_fallback = row.form.description if row.form is not None else ""
    return FormAssignmentOut(
        id=row.id,
        formId=row.form_id,
        clientId=row.client_id,
        title=resolve_text(row.title, bundled, "title", language),
        description=resolve_text(description_fallback, bundled, "description", language),
        questions=questions,
        status=row.status,  # type: ignore[arg-type]
        assignedAt=row.assigned_at,
        submittedAt=row.submitted_at,
        answers=answers,
        i18n=bundled if isinstance(bundled, dict) else {},
    )


def ensure_aware(value):
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value
