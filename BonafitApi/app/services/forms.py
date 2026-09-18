import json
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.database import SessionFactory
from app.errors import BusinessError, ForbiddenError, NotFoundError
from app.i18n import DEFAULT_LANGUAGE, merge_i18n
from app.identity import CurrentUser
from app.models import (
    Client,
    Form,
    FormAnswer,
    FormAssignment,
    FormQuestion,
    FormQuestionOption,
)
from app.roles import UserRole
from app.schemas import (
    FORM_HEADING_TYPE,
    FORM_OPTION_TYPES,
    AssignFormIn,
    FormAssignmentOut,
    FormOut,
    FormWrite,
    SubmitFormIn,
)
from app.serializers import assignment_out, form_out, questions_snapshot


def _lang(user: CurrentUser | None = None) -> str:
    return (user.language if user else None) or DEFAULT_LANGUAGE


class FormService:
    def __init__(self, session_factory: SessionFactory) -> None:
        self._session_factory = session_factory

    def list_forms(self, user: CurrentUser | None = None) -> list[FormOut]:
        with self._session_factory() as db:
            rows = db.scalars(_form_query().order_by(Form.title)).all()
            lang = _lang(user)
            return [form_out(row, lang) for row in rows]

    def get_form(self, form_id: str, user: CurrentUser | None = None) -> FormOut:
        with self._session_factory() as db:
            return form_out(_form_or_404(db, form_id), _lang(user))

    def create_form(self, payload: FormWrite) -> FormOut:
        with self._session_factory() as db:
            resolved, i18n = merge_i18n(
                {"title": payload.title.strip(), "description": payload.description},
                payload.i18n,
            )
            form = Form(title=resolved["title"], description=resolved["description"], i18n=i18n)
            _replace_questions(db, form, payload)
            db.add(form)
            db.flush()
            return form_out(_form_or_404(db, form.id))

    def update_form(self, form_id: str, payload: FormWrite) -> FormOut:
        with self._session_factory() as db:
            form = _form_or_404(db, form_id)
            resolved, i18n = merge_i18n(
                {"title": payload.title.strip(), "description": payload.description},
                payload.i18n,
            )
            form.title = resolved["title"]
            form.description = resolved["description"]
            form.i18n = i18n
            _replace_questions(db, form, payload)
            db.flush()
            return form_out(_form_or_404(db, form.id))

    def delete_form(self, form_id: str) -> None:
        with self._session_factory() as db:
            form = _form_or_404(db, form_id)
            if db.scalar(select(FormAssignment.id).where(FormAssignment.form_id == form_id).limit(1)):
                raise BusinessError("form.hasRelations")
            db.delete(form)

    def assign_form(self, payload: AssignFormIn, user: CurrentUser | None = None) -> list[FormAssignmentOut]:
        with self._session_factory() as db:
            form = _form_or_404(db, payload.formId)
            created: list[FormAssignment] = []
            snapshot = questions_snapshot(form)
            now = datetime.now(UTC)
            for client_id in payload.clientIds:
                client = db.get(Client, client_id)
                if client is None:
                    raise NotFoundError("client", client_id)
                pending = db.scalar(
                    select(FormAssignment).where(
                        FormAssignment.form_id == form.id,
                        FormAssignment.client_id == client_id,
                        FormAssignment.status == "pending",
                    )
                )
                if pending:
                    continue
                row = FormAssignment(
                    form_id=form.id,
                    client_id=client_id,
                    title=form.title,
                    questions=snapshot,
                    i18n=getattr(form, "i18n", None) or {},
                    status="pending",
                    assigned_at=now,
                )
                db.add(row)
                created.append(row)
            db.flush()
            return [assignment_out(_assignment_or_404(db, row.id), _lang(user)) for row in created]

    def list_assignments(
        self,
        user: CurrentUser,
        form_id: str | None = None,
        mine: bool = False,
    ) -> list[FormAssignmentOut]:
        with self._session_factory() as db:
            query = _assignment_query()
            if mine or user.role == UserRole.CLIENT:
                if not user.client_id:
                    raise NotFoundError("session", "me")
                query = query.where(FormAssignment.client_id == user.client_id)
            elif user.role != UserRole.ADMIN:
                raise ForbiddenError()
            if form_id and user.role == UserRole.ADMIN and not mine:
                query = query.where(FormAssignment.form_id == form_id)
            rows = db.scalars(query.order_by(FormAssignment.assigned_at.desc())).all()
            return [assignment_out(row, _lang(user)) for row in rows]

    def get_assignment(self, assignment_id: str, user: CurrentUser) -> FormAssignmentOut:
        with self._session_factory() as db:
            row = _assignment_or_404(db, assignment_id)
            if user.role == UserRole.CLIENT and row.client_id != user.client_id:
                raise NotFoundError("form-assignment", assignment_id)
            return assignment_out(row, _lang(user))

    def submit_assignment(
        self,
        assignment_id: str,
        payload: SubmitFormIn,
        user: CurrentUser,
    ) -> FormAssignmentOut:
        with self._session_factory() as db:
            row = _assignment_or_404(db, assignment_id)
            _require_writable_client_assignment(row, user)
            if _missing_required(row.questions, payload.answers):
                raise BusinessError("form-assignment.incomplete")
            _replace_answers(row, payload.answers)
            row.status = "completed"
            row.submitted_at = datetime.now(UTC)
            db.flush()
            return assignment_out(_assignment_or_404(db, row.id), _lang(user))

    def save_assignment_draft(
        self,
        assignment_id: str,
        payload: SubmitFormIn,
        user: CurrentUser,
    ) -> FormAssignmentOut:
        with self._session_factory() as db:
            row = _assignment_or_404(db, assignment_id)
            _require_writable_client_assignment(row, user)
            _replace_answers(row, payload.answers)
            db.flush()
            return assignment_out(_assignment_or_404(db, row.id), _lang(user))


def _form_query():
    return select(Form).options(selectinload(Form.questions).selectinload(FormQuestion.options))


def _assignment_query():
    return select(FormAssignment).options(
        selectinload(FormAssignment.answers),
        selectinload(FormAssignment.form),
    )


def _form_or_404(db: Session, form_id: str) -> Form:
    form = db.scalar(_form_query().where(Form.id == form_id))
    if form is None:
        raise NotFoundError("form", form_id)
    return form


def _assignment_or_404(db: Session, assignment_id: str) -> FormAssignment:
    row = db.scalar(_assignment_query().where(FormAssignment.id == assignment_id))
    if row is None:
        raise NotFoundError("form-assignment", assignment_id)
    return row


def _require_writable_client_assignment(row: FormAssignment, user: CurrentUser) -> None:
    if user.role == UserRole.CLIENT and row.client_id != user.client_id:
        raise NotFoundError("form-assignment", row.id)
    if user.role != UserRole.CLIENT:
        raise ForbiddenError()
    if row.status == "completed":
        raise BusinessError("form-assignment.alreadyCompleted")


def _replace_answers(row: FormAssignment, answers: list) -> None:
    row.answers.clear()
    heading_ids = {
        str(_question_field(question, "id"))
        for question in row.questions
        if _question_field(question, "type") == FORM_HEADING_TYPE
    }
    for answer in answers:
        if answer.questionId in heading_ids:
            continue
        value = answer.value.strip()
        if not value:
            continue
        row.answers.append(FormAnswer(question_id=answer.questionId, value=value))


def _question_field(question: object, name: str):
    if isinstance(question, dict):
        return question.get(name)
    return getattr(question, name, None)


def _option_ids(question: object) -> list[str]:
    options = _question_field(question, "options") or []
    ids: list[str] = []
    for option in options:
        option_id = option.get("id") if isinstance(option, dict) else getattr(option, "id", None)
        if option_id:
            ids.append(option_id)
    return ids


def _full_name_complete(raw: str) -> bool:
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return False
    if not isinstance(data, dict):
        return False
    first = str(data.get("firstName", "")).strip()
    last = str(data.get("lastName", "")).strip()
    return bool(first and last)


def _ranking_complete(question: object, raw: str) -> bool:
    ids = _option_ids(question)
    given = [part for part in raw.split(",") if part]
    return len(given) == len(ids) and sorted(given) == sorted(ids)


def _missing_required(questions: list, answers: list) -> list[str]:
    values = {item.questionId: (item.value or "").strip() for item in answers}
    missing = []
    for question in questions:
        required = _question_field(question, "required")
        question_id = _question_field(question, "id")
        if not required:
            continue
        raw = values.get(question_id, "").strip()
        qtype = _question_field(question, "type")
        if qtype == FORM_HEADING_TYPE:
            continue
        if qtype == "ranking":
            if not _ranking_complete(question, raw):
                missing.append(question_id)
        elif qtype == "fullName":
            if not _full_name_complete(raw):
                missing.append(question_id)
        elif qtype == "terms":
            if raw != "yes":
                missing.append(question_id)
        elif not raw:
            missing.append(question_id)
    return missing


def _replace_questions(db: Session, form: Form, payload: FormWrite) -> None:
    form.questions.clear()
    db.flush()
    for item in payload.questions:
        resolved, prompt_i18n = merge_i18n({"prompt": item.prompt.strip()}, item.i18n)
        question = FormQuestion(
            prompt=resolved["prompt"],
            type=item.type,
            required=False if item.type == FORM_HEADING_TYPE else item.required,
            sort_order=item.sortOrder,
            i18n=prompt_i18n,
        )
        if item.id:
            question.id = item.id
        if item.type in FORM_OPTION_TYPES:
            for option in item.options or []:
                option_resolved, option_i18n = merge_i18n({"label": option.label.strip()}, option.i18n)
                row = FormQuestionOption(
                    label=option_resolved["label"],
                    sort_order=option.sortOrder,
                    i18n=option_i18n,
                )
                if option.id:
                    row.id = option.id
                question.options.append(row)
        form.questions.append(question)
