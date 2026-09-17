from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from app.errors import BusinessError, NotFoundError
from app.services.calendar import _resolve_bono

NOW = datetime(2026, 9, 9, tzinfo=UTC)


def _service(**kwargs: object) -> SimpleNamespace:
    values: dict[str, object] = {
        "id": "svc-masaje",
        "allows_single_session": True,
        "shares_session_pool": False,
    }
    values.update(kwargs)
    return SimpleNamespace(**values)


def _client_bono(service_id: str = "svc-masaje", remaining: int = 1) -> SimpleNamespace:
    return SimpleNamespace(
        id="cb-m",
        client_id="client-1",
        remaining_sessions=remaining,
        expires_at=None,
        bono=SimpleNamespace(service_id=service_id),
    )


def _db(rows: list[SimpleNamespace]) -> MagicMock:
    db = MagicMock()
    db.scalars.return_value.all.return_value = rows
    by_id = {row.id: row for row in rows}

    def get(_model: object, ident: object, **_kwargs: object) -> SimpleNamespace | None:
        return by_id.get(str(ident))

    db.get.side_effect = get
    return db


def test_picks_usable_masaje_bono() -> None:
    row = _client_bono()
    picked = _resolve_bono(_db([row]), "admin", "client-1", _service(), NOW)
    assert picked is row


def test_admin_walk_in_without_masaje_voucher() -> None:
    picked = _resolve_bono(_db([]), "admin", "client-1", _service(), NOW)
    assert picked is None


def test_client_requires_masaje_bono() -> None:
    with pytest.raises(BusinessError) as exc:
        _resolve_bono(_db([]), "client", "client-1", _service(), NOW)
    assert exc.value.code == "booking.bonoRequired"


def test_admin_walk_in_when_masaje_bono_has_no_sessions() -> None:
    picked = _resolve_bono(_db([_client_bono(remaining=0)]), "admin", "client-1", _service(), NOW)
    assert picked is None


def test_client_no_sessions_when_masaje_bono_empty() -> None:
    with pytest.raises(BusinessError) as exc:
        _resolve_bono(_db([_client_bono(remaining=0)]), "client", "client-1", _service(), NOW)
    assert exc.value.code == "booking.noSessions"


def test_admin_explicit_walk_in_skips_usable_bono() -> None:
    row = _client_bono()
    picked = _resolve_bono(
        _db([row]),
        "admin",
        "client-1",
        _service(),
        NOW,
        None,
        explicit=True,
    )
    assert picked is None


def test_admin_explicit_bono_id() -> None:
    row = _client_bono()
    picked = _resolve_bono(
        _db([row]),
        "admin",
        "client-1",
        _service(),
        NOW,
        "cb-m",
        explicit=True,
    )
    assert picked is row


def test_admin_explicit_missing_bono() -> None:
    with pytest.raises(NotFoundError):
        _resolve_bono(
            _db([]),
            "admin",
            "client-1",
            _service(),
            NOW,
            "cb-missing",
            explicit=True,
        )
