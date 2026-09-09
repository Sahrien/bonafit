import pytest

from app.database import Database
from app.errors import BusinessError, ForbiddenError, NotFoundError
from app.schemas import AssignFormIn, FormQuestionIn, FormWrite, SubmitFormIn, FormAnswerIn
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
