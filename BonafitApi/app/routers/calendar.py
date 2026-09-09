from dependency_injector.wiring import inject
from fastapi import APIRouter, Query, Response, status

from app.schemas import (
    AppointmentOut,
    AppointmentWrite,
    AvailabilitySlotOut,
    BookingSettingsOut,
    BookingSettingsWrite,
    TrainerOut,
    TrainerScheduleOut,
    TrainerScheduleWrite,
)
from app.wiring import AuthSvc, AuthorizationHeader, CalendarSvc

router = APIRouter(tags=["calendar"])


@router.get("/trainers", response_model=list[TrainerOut])
@inject
def list_trainers(
    calendar_service: CalendarSvc,
    auth_service: AuthSvc,
    authorization: AuthorizationHeader = None,
) -> list[TrainerOut]:
    auth_service.require_not_must_change(authorization)
    return calendar_service.list_trainers()


@router.get("/trainers/{trainer_id}", response_model=TrainerOut)
@inject
def get_trainer(
    trainer_id: str,
    calendar_service: CalendarSvc,
    auth_service: AuthSvc,
    authorization: AuthorizationHeader = None,
) -> TrainerOut:
    auth_service.require_not_must_change(authorization)
    return calendar_service.get_trainer(trainer_id)


@router.get("/booking-settings", response_model=BookingSettingsOut)
@inject
def get_booking_settings(
    calendar_service: CalendarSvc,
    auth_service: AuthSvc,
    authorization: AuthorizationHeader = None,
) -> BookingSettingsOut:
    auth_service.require_not_must_change(authorization)
    return calendar_service.get_booking_settings()


@router.put("/booking-settings", response_model=BookingSettingsOut)
@inject
def update_booking_settings(
    payload: BookingSettingsWrite,
    calendar_service: CalendarSvc,
    auth_service: AuthSvc,
    authorization: AuthorizationHeader = None,
) -> BookingSettingsOut:
    auth_service.require_admin(authorization)
    return calendar_service.update_booking_settings(payload)


@router.get("/trainer-schedules", response_model=list[TrainerScheduleOut])
@inject
def list_trainer_schedules(
    calendar_service: CalendarSvc,
    auth_service: AuthSvc,
    trainerId: str | None = None,
    authorization: AuthorizationHeader = None,
) -> list[TrainerScheduleOut]:
    auth_service.require_not_must_change(authorization)
    return calendar_service.list_trainer_schedules(trainerId)


@router.post("/trainer-schedules", response_model=TrainerScheduleOut)
@inject
def create_trainer_schedule(
    payload: TrainerScheduleWrite,
    calendar_service: CalendarSvc,
    auth_service: AuthSvc,
    authorization: AuthorizationHeader = None,
) -> TrainerScheduleOut:
    auth_service.require_admin(authorization)
    return calendar_service.create_trainer_schedule(payload)


@router.put("/trainer-schedules/{schedule_id}", response_model=TrainerScheduleOut)
@inject
def update_trainer_schedule(
    schedule_id: str,
    payload: TrainerScheduleWrite,
    calendar_service: CalendarSvc,
    auth_service: AuthSvc,
    authorization: AuthorizationHeader = None,
) -> TrainerScheduleOut:
    auth_service.require_admin(authorization)
    return calendar_service.update_trainer_schedule(schedule_id, payload)


@router.delete("/trainer-schedules/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
@inject
def delete_trainer_schedule(
    schedule_id: str,
    calendar_service: CalendarSvc,
    auth_service: AuthSvc,
    authorization: AuthorizationHeader = None,
) -> Response:
    auth_service.require_admin(authorization)
    calendar_service.delete_trainer_schedule(schedule_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/appointments", response_model=list[AppointmentOut])
@inject
def list_appointments(
    calendar_service: CalendarSvc,
    auth_service: AuthSvc,
    trainerId: str | None = None,
    clientId: str | None = None,
    from_: str | None = Query(default=None, alias="from"),
    to: str | None = None,
    authorization: AuthorizationHeader = None,
) -> list[AppointmentOut]:
    user = auth_service.require_not_must_change(authorization)
    return calendar_service.list_appointments(
        user,
        trainer_id=trainerId,
        client_id=clientId,
        from_=from_,
        to=to,
    )


@router.get("/appointments/availability", response_model=list[AvailabilitySlotOut])
@inject
def get_availability(
    serviceId: str,
    calendar_service: CalendarSvc,
    auth_service: AuthSvc,
    from_: str = Query(alias="from"),
    to: str = Query(),
    trainerId: str | None = None,
    ignoreAppointmentId: str | None = None,
    authorization: AuthorizationHeader = None,
) -> list[AvailabilitySlotOut]:
    user = auth_service.require_not_must_change(authorization)
    return calendar_service.get_availability(
        user,
        service_id=serviceId,
        from_=from_,
        to=to,
        trainer_id=trainerId,
        ignore_appointment_id=ignoreAppointmentId,
    )


@router.get("/appointments/{appointment_id}", response_model=AppointmentOut)
@inject
def get_appointment(
    appointment_id: str,
    calendar_service: CalendarSvc,
    auth_service: AuthSvc,
    authorization: AuthorizationHeader = None,
) -> AppointmentOut:
    user = auth_service.require_not_must_change(authorization)
    return calendar_service.get_appointment(appointment_id, user)


@router.post("/appointments", response_model=AppointmentOut)
@inject
def create_appointment(
    payload: AppointmentWrite,
    calendar_service: CalendarSvc,
    auth_service: AuthSvc,
    authorization: AuthorizationHeader = None,
) -> AppointmentOut:
    user = auth_service.require_not_must_change(authorization)
    return calendar_service.create_appointment(payload, user)


@router.put("/appointments/{appointment_id}", response_model=AppointmentOut)
@inject
def update_appointment(
    appointment_id: str,
    payload: AppointmentWrite,
    calendar_service: CalendarSvc,
    auth_service: AuthSvc,
    authorization: AuthorizationHeader = None,
) -> AppointmentOut:
    user = auth_service.require_not_must_change(authorization)
    return calendar_service.update_appointment(appointment_id, payload, user)


@router.delete("/appointments/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
@inject
def delete_appointment(
    appointment_id: str,
    calendar_service: CalendarSvc,
    auth_service: AuthSvc,
    authorization: AuthorizationHeader = None,
) -> Response:
    user = auth_service.require_not_must_change(authorization)
    calendar_service.delete_appointment(appointment_id, user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
