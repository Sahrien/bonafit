from typing import Annotated

from fastapi import Depends, Header
from dependency_injector.wiring import Provide

from app.containers import Container
from app.services.auth import AuthService
from app.services.calendar import CalendarService
from app.services.catalog import CatalogService
from app.services.clients import ClientService
from app.services.forms import FormService

AuthSvc = Annotated[AuthService, Depends(Provide[Container.auth_service])]
ClientSvc = Annotated[ClientService, Depends(Provide[Container.client_service])]
CatalogSvc = Annotated[CatalogService, Depends(Provide[Container.catalog_service])]
CalendarSvc = Annotated[CalendarService, Depends(Provide[Container.calendar_service])]
FormSvc = Annotated[FormService, Depends(Provide[Container.form_service])]
AuthorizationHeader = Annotated[str | None, Header()]
