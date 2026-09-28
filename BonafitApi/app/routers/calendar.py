from dependency_injector.wiring import inject
from fastapi import APIRouter, Query, Response, status

from app.schemas import (
    AppointmentOut,
    AppointmentWrite,
    AvailabilitySlotOut,
    BookingSettingsOut,
    BookingSettingsWrite,
    PublicHolidayOut,
    PublicHolidayWrite,
    ResolvedDayOut,
    ScheduleAbsenceOut,
    ScheduleAbsenceWrite,
    ScheduleDateWindowOut,
    ScheduleDateWindowWrite,
    ScheduleHoursOut,
    TrainerOut,
    TrainerScheduleOut,
    TrainerScheduleWrite,
    TrainerWrite,
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


@router.put("/trainers/{trainer_id}", response_model=TrainerOut)
@inject
def update_trainer(
    trainer_id: str,
    payload: TrainerWrite,
    calendar_service: CalendarSvc,
    auth_service: AuthSvc,
    authorization: AuthorizationHeader = None,
) -> TrainerOut:
    auth_service.require_admin(authorization)
    return calendar_service.update_trainer(trainer_id, payload)


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


@router.get("/schedule-date-windows", response_model=list[ScheduleDateWindowOut])
@inject
def list_date_windows(
    calendar_service: CalendarSvc,
    auth_service: AuthSvc,
    trainerId: str | None = None,
    from_: str | None = Query(default=None, alias="from"),
    to: str | None = None,
    authorization: AuthorizationHeader = None,
) -> list[ScheduleDateWindowOut]:
    auth_service.require_not_must_change(authorization)
    return calendar_service.list_date_windows(trainerId, from_, to)


@router.post("/schedule-date-windows", response_model=ScheduleDateWindowOut)
@inject
def create_date_window(
    payload: ScheduleDateWindowWrite,
    calendar_service: CalendarSvc,
    auth_service: AuthSvc,
    authorization: AuthorizationHeader = None,
) -> ScheduleDateWindowOut:
    auth_service.require_admin(authorization)
    return calendar_service.create_date_window(payload)


@router.put("/schedule-date-windows/{window_id}", response_model=ScheduleDateWindowOut)
@inject
def update_date_window(
    window_id: str,
    payload: ScheduleDateWindowWrite,
    calendar_service: CalendarSvc,
    auth_service: AuthSvc,
    authorization: AuthorizationHeader = None,
) -> ScheduleDateWindowOut:
    auth_service.require_admin(authorization)
    return calendar_service.update_date_window(window_id, payload)


@router.delete("/schedule-date-windows/{window_id}", status_code=status.HTTP_204_NO_CONTENT)
@inject
def delete_date_window(
    window_id: str,
    calendar_service: CalendarSvc,
    auth_service: AuthSvc,
    authorization: AuthorizationHeader = None,
) -> Response:
    auth_service.require_admin(authorization)
    calendar_service.delete_date_window(window_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/schedule-absences", response_model=list[ScheduleAbsenceOut])
@inject
def list_absences(
    calendar_service: CalendarSvc,
    auth_service: AuthSvc,
    trainerId: str | None = None,
    from_: str | None = Query(default=None, alias="from"),
    to: str | None = None,
    authorization: AuthorizationHeader = None,
) -> list[ScheduleAbsenceOut]:
    auth_service.require_not_must_change(authorization)
    return calendar_service.list_absences(trainerId, from_, to)


@router.post("/schedule-absences", response_model=ScheduleAbsenceOut)
@inject
def create_absence(
    payload: ScheduleAbsenceWrite,
    calendar_service: CalendarSvc,
    auth_service: AuthSvc,
    authorization: AuthorizationHeader = None,
) -> ScheduleAbsenceOut:
    auth_service.require_admin(authorization)
    return calendar_service.create_absence(payload)


@router.put("/schedule-absences/{absence_id}", response_model=ScheduleAbsenceOut)
@inject
def update_absence(
    absence_id: str,
    payload: ScheduleAbsenceWrite,
    calendar_service: CalendarSvc,
    auth_service: AuthSvc,
    authorization: AuthorizationHeader = None,
) -> ScheduleAbsenceOut:
    auth_service.require_admin(authorization)
    return calendar_service.update_absence(absence_id, payload)


@router.delete("/schedule-absences/{absence_id}", status_code=status.HTTP_204_NO_CONTENT)
@inject
def delete_absence(
    absence_id: str,
    calendar_service: CalendarSvc,
    auth_service: AuthSvc,
    authorization: AuthorizationHeader = None,
) -> Response:
    auth_service.require_admin(authorization)
    calendar_service.delete_absence(absence_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/public-holidays", response_model=list[PublicHolidayOut])
@inject
def list_public_holidays(
    calendar_service: CalendarSvc,
    auth_service: AuthSvc,
    from_: str | None = Query(default=None, alias="from"),
    to: str | None = None,
    authorization: AuthorizationHeader = None,
) -> list[PublicHolidayOut]:
    auth_service.require_not_must_change(authorization)
    return calendar_service.list_public_holidays(from_, to)


@router.post("/public-holidays", response_model=PublicHolidayOut)
@inject
def create_public_holiday(
    payload: PublicHolidayWrite,
    calendar_service: CalendarSvc,
    auth_service: AuthSvc,
    authorization: AuthorizationHeader = None,
) -> PublicHolidayOut:
    auth_service.require_admin(authorization)
    return calendar_service.create_public_holiday(payload)


@router.put("/public-holidays/{holiday_id}", response_model=PublicHolidayOut)
@inject
def update_public_holiday(
    holiday_id: str,
    payload: PublicHolidayWrite,
    calendar_service: CalendarSvc,
    auth_service: AuthSvc,
    authorization: AuthorizationHeader = None,
) -> PublicHolidayOut:
    auth_service.require_admin(authorization)
    return calendar_service.update_public_holiday(holiday_id, payload)


@router.delete("/public-holidays/{holiday_id}", status_code=status.HTTP_204_NO_CONTENT)
@inject
def delete_public_holiday(
    holiday_id: str,
    calendar_service: CalendarSvc,
    auth_service: AuthSvc,
    authorization: AuthorizationHeader = None,
) -> Response:
    auth_service.require_admin(authorization)
    calendar_service.delete_public_holiday(holiday_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/schedules/resolved", response_model=list[ResolvedDayOut])
@inject
def list_resolved_schedules(
    calendar_service: CalendarSvc,
    auth_service: AuthSvc,
    from_: str = Query(alias="from"),
    to: str = Query(),
    trainerId: str | None = None,
    authorization: AuthorizationHeader = None,
) -> list[ResolvedDayOut]:
    auth_service.require_not_must_change(authorization)
    return calendar_service.list_resolved(from_, to, trainerId)


@router.get("/schedules/hours", response_model=ScheduleHoursOut)
@inject
def list_schedule_hours(
    calendar_service: CalendarSvc,
    auth_service: AuthSvc,
    from_: str = Query(alias="from"),
    to: str = Query(),
    trainerId: str | None = None,
    authorization: AuthorizationHeader = None,
) -> ScheduleHoursOut:
    auth_service.require_not_must_change(authorization)
    return calendar_service.list_hours(from_, to, trainerId)


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
