from collections.abc import Iterator
from contextlib import ExitStack, contextmanager
from unittest import mock

from fastapi.testclient import TestClient

from app.main import app
from app.services.auth import AuthService

AUTH = {"Authorization": "Bearer t"}


@contextmanager
def api(**overrides: object) -> Iterator[TestClient]:
    providers = {
        "auth": app.container.auth_service,
        "clients": app.container.client_service,
        "catalog": app.container.catalog_service,
        "calendar": app.container.calendar_service,
        "forms": app.container.form_service,
    }
    if "auth" not in overrides:
        overrides = {"auth": mock.Mock(spec=AuthService), **overrides}
    with ExitStack() as stack:
        for name, value in overrides.items():
            stack.enter_context(providers[name].override(value))
        yield TestClient(app)
