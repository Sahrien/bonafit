from pathlib import Path

import pytest
from pydantic import ValidationError

from app.database import Database
from app.errors import BusinessError, ForbiddenError, NotFoundError
from app.schemas import (
    AssignFormIn,
    FORM_HEADING_TYPE,
    FormAnswerIn,
    FormQuestionIn,
    FormQuestionOptionIn,
    FormWrite,
    SubmitFormIn,
)
from app.services.forms import FormService
from tests.factories import add_client, admin_user, client_user


def _form(**overrides: object) -> FormWrite:
    values: dict[str, object] = {
        "title": "Intake",
        "description": "",
        "questions": [FormQuestionIn(prompt="Name?", type="text", required=True, sortOrder=0)],
    }
    values.update(overrides)
    return FormWrite(**values)


def test_create_get_list_form(form_service: FormService) -> None:
    created = form_service.create_form(_form())
    assert created.title == "Intake"
    assert created.questions[0].prompt == "Name?"
    assert form_service.get_form(created.id).id == created.id
    assert len(form_service.list_forms()) == 1


def test_update_form(form_service: FormService) -> None:
    created = form_service.create_form(_form())
    updated = form_service.update_form(created.id, _form(title="Updated"))
    assert updated.title == "Updated"


def test_assign_and_submit(form_service: FormService, db: Database) -> None:
    add_client(db)
    form = form_service.create_form(_form())
    assigned = form_service.assign_form(AssignFormIn(formId=form.id, clientIds=["client-1"]))
    assert len(assigned) == 1
    assert assigned[0].status == "pending"
    question_id = assigned[0].questions[0].id
    submitted = form_service.submit_assignment(
        assigned[0].id,
        SubmitFormIn(answers=[FormAnswerIn(questionId=question_id, value="Marina")]),
        client_user(),
    )
    assert submitted.status == "completed"
    assert submitted.answers[0].value == "Marina"


def test_assign_skips_existing_pending(form_service: FormService, db: Database) -> None:
    add_client(db)
    form = form_service.create_form(_form())
    form_service.assign_form(AssignFormIn(formId=form.id, clientIds=["client-1"]))
    again = form_service.assign_form(AssignFormIn(formId=form.id, clientIds=["client-1"]))
    assert again == []


def test_submit_requires_client(form_service: FormService, db: Database) -> None:
    add_client(db)
    form = form_service.create_form(_form())
    assigned = form_service.assign_form(AssignFormIn(formId=form.id, clientIds=["client-1"]))
    with pytest.raises(ForbiddenError):
        form_service.submit_assignment(
            assigned[0].id,
            SubmitFormIn(answers=[FormAnswerIn(questionId="q", value="x")]),
            admin_user(),
        )


def test_submit_incomplete(form_service: FormService, db: Database) -> None:
    add_client(db)
    form = form_service.create_form(_form())
    assigned = form_service.assign_form(AssignFormIn(formId=form.id, clientIds=["client-1"]))
    with pytest.raises(BusinessError) as exc:
        form_service.submit_assignment(assigned[0].id, SubmitFormIn(answers=[]), client_user())
    assert exc.value.code == "form-assignment.incomplete"


def test_save_draft_incomplete_then_submit(form_service: FormService, db: Database) -> None:
    add_client(db)
    form = form_service.create_form(_form())
    assigned = form_service.assign_form(AssignFormIn(formId=form.id, clientIds=["client-1"]))
    question_id = assigned[0].questions[0].id
    draft = form_service.save_assignment_draft(
        assigned[0].id,
        SubmitFormIn(answers=[]),
        client_user(),
    )
    assert draft.status == "pending"
    assert draft.answers == []
    draft = form_service.save_assignment_draft(
        assigned[0].id,
        SubmitFormIn(answers=[FormAnswerIn(questionId=question_id, value="Marina")]),
        client_user(),
    )
    assert draft.status == "pending"
    assert draft.answers[0].value == "Marina"
    loaded = form_service.get_assignment(assigned[0].id, client_user())
    assert loaded.answers[0].value == "Marina"
    submitted = form_service.submit_assignment(
        assigned[0].id,
        SubmitFormIn(answers=[FormAnswerIn(questionId=question_id, value="Marina")]),
        client_user(),
    )
    assert submitted.status == "completed"
    assert submitted.submittedAt is not None


def test_save_draft_blocked_when_completed(form_service: FormService, db: Database) -> None:
    add_client(db)
    form = form_service.create_form(_form())
    assigned = form_service.assign_form(AssignFormIn(formId=form.id, clientIds=["client-1"]))
    question_id = assigned[0].questions[0].id
    form_service.submit_assignment(
        assigned[0].id,
        SubmitFormIn(answers=[FormAnswerIn(questionId=question_id, value="Marina")]),
        client_user(),
    )
    with pytest.raises(BusinessError) as exc:
        form_service.save_assignment_draft(
            assigned[0].id,
            SubmitFormIn(answers=[FormAnswerIn(questionId=question_id, value="Ana")]),
            client_user(),
        )
    assert exc.value.code == "form-assignment.alreadyCompleted"


def test_client_cannot_see_other_assignment(form_service: FormService, db: Database) -> None:
    add_client(db)
    add_client(db, id="client-2", email="pablo@example.com")
    form = form_service.create_form(_form())
    assigned = form_service.assign_form(AssignFormIn(formId=form.id, clientIds=["client-1"]))
    with pytest.raises(NotFoundError):
        form_service.get_assignment(assigned[0].id, client_user("client-2"))


def test_delete_form_blocked_when_assigned(form_service: FormService, db: Database) -> None:
    add_client(db)
    form = form_service.create_form(_form())
    form_service.assign_form(AssignFormIn(formId=form.id, clientIds=["client-1"]))
    with pytest.raises(BusinessError) as exc:
        form_service.delete_form(form.id)
    assert exc.value.code == "form.hasRelations"


def test_delete_form(form_service: FormService) -> None:
    form = form_service.create_form(_form())
    form_service.delete_form(form.id)
    with pytest.raises(NotFoundError):
        form_service.get_form(form.id)


def test_create_form_with_email_and_multiple_choice(form_service: FormService) -> None:
    created = form_service.create_form(
        FormWrite(
            title="Intake extra",
            description="",
            questions=[
                FormQuestionIn(prompt="Email?", type="email", required=True, sortOrder=0),
                FormQuestionIn(
                    prompt="Goals?",
                    type="multipleChoice",
                    required=True,
                    sortOrder=1,
                    options=[
                        FormQuestionOptionIn(label="Fuerza", sortOrder=0),
                        FormQuestionOptionIn(label="Movilidad", sortOrder=1),
                    ],
                ),
            ],
        )
    )
    assert created.questions[0].type == "email"
    assert created.questions[0].options is None
    assert created.questions[1].type == "multipleChoice"
    assert [option.label for option in created.questions[1].options or []] == ["Fuerza", "Movilidad"]

    loaded = form_service.get_form(created.id)
    assert loaded.questions[1].options is not None
    assert len(loaded.questions[1].options) == 2


def test_option_type_requires_two_choices() -> None:
    with pytest.raises(ValidationError):
        FormQuestionIn(
            prompt="Goals?",
            type="multipleChoice",
            required=True,
            sortOrder=0,
            options=[FormQuestionOptionIn(label="Only", sortOrder=0)],
        )


def test_heading_is_optional_and_is_not_submitted(form_service: FormService, db: Database) -> None:
    add_client(db)
    heading = FormQuestionIn(prompt="Salud", type="heading", required=True, sortOrder=0)
    assert heading.required is False
    form = form_service.create_form(
        FormWrite(
            title="Intake",
            description="",
            questions=[
                heading,
                FormQuestionIn(prompt="Name?", type="text", required=True, sortOrder=1),
            ],
        )
    )
    assigned = form_service.assign_form(AssignFormIn(formId=form.id, clientIds=["client-1"]))
    heading_id = assigned[0].questions[0].id
    name_id = assigned[0].questions[1].id
    submitted = form_service.submit_assignment(
        assigned[0].id,
        SubmitFormIn(
            answers=[
                FormAnswerIn(questionId=heading_id, value="should-skip"),
                FormAnswerIn(questionId=name_id, value="Marina"),
            ]
        ),
        client_user(),
    )
    assert submitted.status == "completed"
    assert [answer.questionId for answer in submitted.answers] == [name_id]
    assert submitted.answers[0].value == "Marina"


def test_intake_seed_json_is_valid() -> None:
    path = Path(__file__).resolve().parents[1] / "scripts" / "_intake_form.json"
    payload = FormWrite.model_validate_json(path.read_text(encoding="utf-8"))
    assert payload.title == "Cuestionario inicial"
    headings = [question for question in payload.questions if question.type == FORM_HEADING_TYPE]
    assert len(headings) >= 5
    assert any(question.type == "terms" for question in payload.questions)
