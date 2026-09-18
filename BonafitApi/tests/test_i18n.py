from app.i18n import normalize_language, parse_accept_language, resolve_text
from app.identity import CurrentUser
from app.roles import UserRole
from app.schemas import AuthMePatch, FormQuestionIn, FormWrite, LoginRequest, ServiceWrite
from app.services.auth import AuthService
from app.services.catalog import CatalogService
from app.services.forms import FormService
from tests.test_auth_service import PASSWORD, _add_user, _bearer


def test_normalize_and_accept_language() -> None:
    assert normalize_language("en-GB") == "en"
    assert parse_accept_language("en-US,en;q=0.9,es;q=0.8") == "en"
    assert parse_accept_language("fr") == "es"


def test_resolve_falls_back_to_spanish() -> None:
    i18n = {"name": {"es": "Masaje", "en": "Massage"}}
    assert resolve_text("Masaje", i18n, "name", "en") == "Massage"
    assert resolve_text("Masaje", {"name": {"es": "Masaje"}}, "name", "en") == "Masaje"


def test_user_language_roundtrip(auth_service: AuthService, db, security, password_hash) -> None:
    _add_user(db, password_hash)
    session = auth_service.login(LoginRequest(email="lucia@bonafit.com", password=PASSWORD))
    assert session.user.language == "es"
    updated = auth_service.update_me(_bearer(security), AuthMePatch(language="en"))
    assert updated.user.language == "en"
    me = auth_service.me(_bearer(security))
    assert me is not None
    assert me.user.language == "en"


def test_service_name_resolves_by_user_language(catalog_service: CatalogService) -> None:
    created = catalog_service.create_service(
        ServiceWrite(
            name="Masaje",
            durationMinutes=60,
            allowsSingleSession=True,
            i18n={"name": {"es": "Masaje", "en": "Massage"}},
        )
    )
    assert created.name == "Masaje"
    assert created.i18n["name"]["en"] == "Massage"
    english_admin = CurrentUser(
        id="user-1",
        role=UserRole.ADMIN,
        client_id=None,
        trainer_id="trainer-1",
        email="lucia@bonafit.com",
        display_name="Alex",
        must_change_password=False,
        language="en",
    )
    listed = catalog_service.list_services(english_admin)
    assert listed[0].name == "Massage"


def test_form_assignment_snapshot_keeps_i18n(form_service: FormService) -> None:
    created = form_service.create_form(
        FormWrite(
            title="Inicio",
            description="Salud",
            i18n={
                "title": {"es": "Inicio", "en": "Intake"},
                "description": {"es": "Salud", "en": "Health"},
            },
            questions=[
                FormQuestionIn(
                    prompt="Nombre",
                    type="shortText",
                    required=True,
                    sortOrder=0,
                    i18n={"prompt": {"es": "Nombre", "en": "Name"}},
                )
            ],
        )
    )
    english = CurrentUser(
        id="user-1",
        role=UserRole.ADMIN,
        client_id=None,
        trainer_id="trainer-1",
        email="lucia@bonafit.com",
        display_name="Alex",
        must_change_password=False,
        language="en",
    )
    loaded = form_service.get_form(created.id, english)
    assert loaded.title == "Intake"
    assert loaded.questions[0].prompt == "Name"
