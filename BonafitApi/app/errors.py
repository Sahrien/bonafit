from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse


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


def register_exception_handlers(app) -> None:
    @app.exception_handler(NotFoundError)
    async def not_found_handler(_request: Request, exc: NotFoundError) -> JSONResponse:
        return JSONResponse(
            status_code=404,
            content={"resource": exc.resource, "id": exc.id, "code": f"{exc.resource}.notFound"},
        )

    @app.exception_handler(BusinessError)
    async def business_handler(_request: Request, exc: BusinessError) -> JSONResponse:
        return JSONResponse(status_code=exc.status_code, content={"code": exc.code})
