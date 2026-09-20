import pytest

from app.config import Settings


def test_port_defaults_to_8080(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("PORT", raising=False)
    assert Settings(_env_file=None).port == 8080


def test_port_reads_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("PORT", "8000")
    assert Settings(_env_file=None).port == 8000
