import logging
from typing import Any

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

logger = logging.getLogger("bonafit")

_SECRET_FIELD_MARKERS = ("password", "token", "authorization", "secret")


class NotFoundError(Exception):
    def __init__(self, resource: str, id: str):
        self.resource = resource
        self.id = id
        super().__init__(f"{resource}:{id}")


class BusinessError(Exception):
    def __init__(self, code: str, status_code: int = 409):
        self.code = code
        self.status_code = status_code
        super().__init__(code)


class UnauthorizedError(Exception):
    def __init__(self, detail: str = "unauthorized"):
        self.detail = detail
        super().__init__(detail)


class ForbiddenError(Exception):
    def __init__(self, detail: str = "forbidden"):
        self.detail = detail
        super().__init__(detail)


BOOKING_ERROR_CODES = {
    "cutoff": "booking.cutoff",
    "slotTaken": "booking.slotTaken",
    "oneAppointment": "booking.oneAppointment",
    "serviceNotBookable": "booking.serviceNotBookable",
    "bonoRequired": "booking.bonoRequired",
    "expiredBono": "booking.expiredBono",
    "noSessions": "booking.noSessions",
    "invalidStatus": "booking.invalidStatus",
    "serviceInactive": "booking.serviceInactive",
    "mustChangePassword": "auth.mustChangePassword",
}


def _is_secret_name(name: str) -> bool:
    lowered = name.lower()
    return any(marker in lowered for marker in _SECRET_FIELD_MARKERS)


def _redact_value(value: Any) -> Any:
    if isinstance(value, dict):
        return {
            key: "[redacted]" if _is_secret_name(str(key)) else _redact_value(item)
            for key, item in value.items()
        }
    if isinstance(value, list):
        return [_redact_value(item) for item in value]
    return value


def public_validation_errors(errors: list[dict[str, Any]]) -> list[dict[str, Any]]:
    sanitized: list[dict[str, Any]] = []
    for error in errors:
        item = dict(error)
        loc = item.get("loc", ())
        if any(_is_secret_name(str(part)) for part in loc):
            item["input"] = "[redacted]"
        elif "input" in item:
            item["input"] = _redact_value(item["input"])
        sanitized.append(item)
    return sanitized


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(NotFoundError)
    async def not_found_handler(_request: Request, exc: NotFoundError) -> JSONResponse:
        return JSONResponse(
            status_code=404,
            content={"resource": exc.resource, "id": exc.id, "code": f"{exc.resource}.notFound"},
        )

    @app.exception_handler(BusinessError)
    async def business_handler(_request: Request, exc: BusinessError) -> JSONResponse:
        return JSONResponse(status_code=exc.status_code, content={"code": exc.code})

    @app.exception_handler(UnauthorizedError)
    async def unauthorized_handler(_request: Request, exc: UnauthorizedError) -> JSONResponse:
        return JSONResponse(status_code=401, content={"detail": exc.detail})

    @app.exception_handler(ForbiddenError)
    async def forbidden_handler(_request: Request, exc: ForbiddenError) -> JSONResponse:
        return JSONResponse(status_code=403, content={"detail": exc.detail})

    @app.exception_handler(RequestValidationError)
    async def validation_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        errors = jsonable_encoder(exc.errors())
        logger.warning(
            "Request validation failed %s %s %s",
            request.method,
            request.url.path,
            public_validation_errors(errors),
        )
        return JSONResponse(status_code=422, content={"detail": errors})
