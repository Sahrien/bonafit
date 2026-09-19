from dependency_injector.wiring import inject
from fastapi import APIRouter, Query

from app.schemas import StatsOut, StatsPreset
from app.wiring import AuthSvc, AuthorizationHeader, StatsSvc

router = APIRouter(tags=["stats"])


@router.get("/stats", response_model=StatsOut)
@inject
def get_stats(
    stats_service: StatsSvc,
    auth_service: AuthSvc,
    preset: StatsPreset = Query(default="30d"),
    authorization: AuthorizationHeader = None,
) -> StatsOut:
    auth_service.require_admin(authorization)
    return stats_service.get_stats(preset)
