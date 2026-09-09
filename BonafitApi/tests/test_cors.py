from fastapi.testclient import TestClient

from app.main import app


def _preflight(origin: str):
    return TestClient(app).options(
        "/auth/login",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )


def test_cors_allows_desk_loopback_origins() -> None:
    for origin in (
        "http://localhost:4200",
        "http://127.0.0.1:4200",
        "http://localhost:4201",
        "http://127.0.0.1:4201",
    ):
        response = _preflight(origin)
        assert response.status_code == 200, origin
        assert response.headers["access-control-allow-origin"] == origin


def test_cors_rejects_unknown_origin() -> None:
    response = _preflight("http://evil.example")
    assert response.status_code == 400
    assert response.text == "Disallowed CORS origin"
