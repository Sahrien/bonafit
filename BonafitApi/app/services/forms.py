from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.database import SessionFactory
from app.errors import BusinessError, ForbiddenError, NotFoundError
from app.identity import CurrentUser
from app.models import (
    Client,
    Form,
    FormAnswer,
    FormAssignment,
    FormQuestion,
    FormQuestionOption,
)
from app.schemas import AssignFormIn, FormAssignmentOut, FormOut, FormWrite, SubmitFormIn
from app.serializers import assignment_out, form_out, questions_snapshot


class FormService:
    def __init__(self, session_factory: SessionFactory) -> None:
        self._session_factory = session_factory

    def list_forms(self) -> list[FormOut]:
        with self._session_factory() as db:
            rows = db.scalars(_form_query().order_by(Form.title)).all()
            return [form_out(row) for row in rows]

    def get_form(self, form_id: str) -> FormOut:
        with self._session_factory() as db:
            return form_out(_form_or_404(db, form_id))

    def create_form(self, payload: FormWrite) -> FormOut:
        with self._session_factory() as db:
            form = Form(title=payload.title.strip(), description=payload.description)
            _replace_questions(db, form, payload)
            db.add(form)
            db.flush()
            return form_out(_form_or_404(db, form.id))

    def update_form(self, form_id: str, payload: FormWrite) -> FormOut:
        with self._session_factory() as db:
            form = _form_or_404(db, form_id)
            form.title = payload.title.strip()
            form.description = payload.description
            _replace_questions(db, form, payload)
            db.flush()
            return form_out(_form_or_404(db, form.id))

    def delete_form(self, form_id: str) -> None:
        with self._session_factory() as db:
            form = _form_or_404(db, form_id)
            if db.scalar(select(FormAssignment.id).where(FormAssignment.form_id == form_id).limit(1)):
                raise BusinessError("form.hasRelations")
            db.delete(form)

    def assign_form(self, payload: AssignFormIn) -> list[FormAssignmentOut]:
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
                    status="pending",
                    assigned_at=now,
                )
                db.add(row)
                created.append(row)
            db.flush()
            return [assignment_out(_assignment_or_404(db, row.id)) for row in created]

    def list_assignments(
        self,
        user: CurrentUser,
        form_id: str | None = None,
        mine: bool = False,
    ) -> list[FormAssignmentOut]:
        with self._session_factory() as db:
            query = _assignment_query()
            if mine or user.role == "client":
                if not user.client_id:
                    raise NotFoundError("session", "me")
                query = query.where(FormAssignment.client_id == user.client_id)
            elif user.role != "admin":
                raise ForbiddenError()
            if form_id and user.role == "admin" and not mine:
                query = query.where(FormAssignment.form_id == form_id)
            rows = db.scalars(query.order_by(FormAssignment.assigned_at.desc())).all()
            return [assignment_out(row) for row in rows]

    def get_assignment(self, assignment_id: str, user: CurrentUser) -> FormAssignmentOut:
        with self._session_factory() as db:
            row = _assignment_or_404(db, assignment_id)
            if user.role == "client" and row.client_id != user.client_id:
                raise NotFoundError("form-assignment", assignment_id)
            return assignment_out(row)

    def submit_assignment(
        self,
        assignment_id: str,
        payload: SubmitFormIn,
        user: CurrentUser,
    ) -> FormAssignmentOut:
        with self._session_factory() as db:
            row = _assignment_or_404(db, assignment_id)
            if user.role == "client" and row.client_id != user.client_id:
                raise NotFoundError("form-assignment", assignment_id)
            if user.role != "client":
                raise ForbiddenError()
            if row.status == "completed":
                raise BusinessError("form-assignment.alreadyCompleted")
            if _missing_required(row.questions, payload.answers):
                raise BusinessError("form-assignment.incomplete")
            row.answers.clear()
            for answer in payload.answers:
                value = answer.value.strip()
                if not value:
                    continue
                row.answers.append(FormAnswer(question_id=answer.questionId, value=value))
            row.status = "completed"
            row.submitted_at = datetime.now(UTC)
            db.flush()
            return assignment_out(_assignment_or_404(db, row.id))


def _form_query():
    return select(Form).options(selectinload(Form.questions).selectinload(FormQuestion.options))


def _assignment_query():
    return select(FormAssignment).options(selectinload(FormAssignment.answers))


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


def _missing_required(questions: list, answers: list) -> list[str]:
    values = {item.questionId: (item.value or "").strip() for item in answers}
    missing = []
    for question in questions:
        required = question.get("required") if isinstance(question, dict) else question.required
        question_id = question.get("id") if isinstance(question, dict) else question.id
        if required and not values.get(question_id, "").strip():
            missing.append(question_id)
    return missing


def _replace_questions(db: Session, form: Form, payload: FormWrite) -> None:
    form.questions.clear()
    db.flush()
    for item in payload.questions:
        question = FormQuestion(
            prompt=item.prompt.strip(),
            type=item.type,
            required=item.required,
            sort_order=item.sortOrder,
        )
        if item.id:
            question.id = item.id
        if item.type == "singleChoice":
            for option in item.options or []:
                row = FormQuestionOption(label=option.label.strip(), sort_order=option.sortOrder)
                if option.id:
                    row.id = option.id
                question.options.append(row)
        form.questions.append(question)
