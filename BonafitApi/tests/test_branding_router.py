from datetime import UTC, datetime
from unittest import mock

from app.schemas import BrandingOut, BrandingWrite
from app.services.branding import BrandingService
from tests.api import AUTH, api

BRANDING = BrandingOut(
    id="branding",
    studioName="Bonafit",
    slogan="Wellness & Longevity",
    primaryHex="#0f766e",
    accentHex="#c2410c",
    surfaceHex="#f5f3f0",
    colorScheme="light",
    logoUrl=None,
    faviconUrl=None,
    updatedAt=datetime(2026, 9, 18, tzinfo=UTC),
)


def test_get_branding_is_public() -> None:
    branding = mock.Mock(spec=BrandingService)
    branding.get_branding.return_value = BRANDING
    with api(branding=branding) as http:
        response = http.get("/branding")
    assert response.status_code == 200
    assert response.json()["studioName"] == "Bonafit"
    branding.get_branding.assert_called_once()


def test_put_branding_requires_admin() -> None:
    branding = mock.Mock(spec=BrandingService)
    branding.update_branding.return_value = BRANDING.model_copy(update={"studioName": "Norte"})
    with api(branding=branding) as http:
        response = http.put(
            "/branding",
            json={
                "studioName": "Norte",
                "slogan": "Fuerza",
                "primaryHex": "#112233",
                "accentHex": "#aabbcc",
                "surfaceHex": "#f5f3f0",
                "colorScheme": "system",
            },
            headers=AUTH,
        )
    assert response.status_code == 200
    branding.update_branding.assert_called_once()
    payload = branding.update_branding.call_args.args[0]
    assert isinstance(payload, BrandingWrite)
    assert payload.studioName == "Norte"


def test_upload_logo() -> None:
    branding = mock.Mock(spec=BrandingService)
    branding.save_asset.return_value = BRANDING.model_copy(update={"logoUrl": "/uploads/branding/logo.png"})
    with api(branding=branding) as http:
        response = http.post(
            "/branding/logo",
            files={"file": ("logo.png", b"png-bytes", "image/png")},
            headers=AUTH,
        )
    assert response.status_code == 200
    assert response.json()["logoUrl"] == "/uploads/branding/logo.png"
    branding.save_asset.assert_called_once()
    assert branding.save_asset.call_args.args[0] == "logo"


def test_delete_logo() -> None:
    branding = mock.Mock(spec=BrandingService)
    branding.delete_asset.return_value = BRANDING
    with api(branding=branding) as http:
        response = http.delete("/branding/logo", headers=AUTH)
    assert response.status_code == 200
    assert response.json()["logoUrl"] is None
    branding.delete_asset.assert_called_once_with("logo")


def test_delete_favicon() -> None:
    branding = mock.Mock(spec=BrandingService)
    branding.delete_asset.return_value = BRANDING
    with api(branding=branding) as http:
        response = http.delete("/branding/favicon", headers=AUTH)
    assert response.status_code == 200
    assert response.json()["faviconUrl"] is None
    branding.delete_asset.assert_called_once_with("favicon")
