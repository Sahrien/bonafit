from datetime import UTC, datetime
from unittest import mock

from app.schemas import FormAssignmentOut, FormOut, FormQuestionOut
from app.services.forms import FormService
from tests.api import AUTH, api

FORM = FormOut(
    id="form-1",
    title="Intake",
    description="",
    questions=[
        FormQuestionOut(id="q-1", prompt="Name?", type="text", required=True, sortOrder=0),
    ],
)
ASSIGNMENT = FormAssignmentOut(
    id="asg-1",
    formId="form-1",
    clientId="client-1",
    title="Intake",
    questions=FORM.questions,
    status="pending",
    assignedAt=datetime(2026, 9, 9, 8, 0, tzinfo=UTC),
    submittedAt=None,
    answers=[],
)


def test_list_forms() -> None:
    forms = mock.Mock(spec=FormService)
    forms.list_forms.return_value = [FORM]
    with api(forms=forms) as http:
        response = http.get("/forms", headers=AUTH)
    assert response.status_code == 200
    assert response.json()[0]["title"] == "Intake"


def test_create_form() -> None:
    forms = mock.Mock(spec=FormService)
    forms.create_form.return_value = FORM
    with api(forms=forms) as http:
        response = http.post(
            "/forms",
            json={"title": "Intake", "questions": [{"prompt": "Name?", "type": "text", "required": True, "sortOrder": 0}]},
            headers=AUTH,
        )
    assert response.status_code == 200
    forms.create_form.assert_called_once()


def test_assign_form() -> None:
    forms = mock.Mock(spec=FormService)
    forms.assign_form.return_value = [ASSIGNMENT]
    with api(forms=forms) as http:
        response = http.post(
            "/form-assignments",
            json={"formId": "form-1", "clientIds": ["client-1"]},
            headers=AUTH,
        )
    assert response.status_code == 200
    assert response.json()[0]["status"] == "pending"


def test_submit_assignment() -> None:
    forms = mock.Mock(spec=FormService)
    completed = ASSIGNMENT.model_copy(update={"status": "completed"})
    forms.submit_assignment.return_value = completed
    with api(forms=forms) as http:
        response = http.post(
            "/form-assignments/asg-1/submit",
            json={"answers": [{"questionId": "q-1", "value": "Marina"}]},
            headers=AUTH,
        )
    assert response.status_code == 200
    assert response.json()["status"] == "completed"
    forms.submit_assignment.assert_called_once()


def test_delete_form() -> None:
    forms = mock.Mock(spec=FormService)
    with api(forms=forms) as http:
        response = http.delete("/forms/form-1", headers=AUTH)
    assert response.status_code == 204
    forms.delete_form.assert_called_once()
