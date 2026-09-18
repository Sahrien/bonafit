from io import BytesIO

from fastapi import UploadFile

from app.errors import BusinessError
from app.schemas import BrandingWrite
from app.services.branding import BrandingService


def test_get_creates_default_branding(branding_service: BrandingService) -> None:
    branding = branding_service.get_branding()
    assert branding.id == "branding"
    assert branding.studioName == "Bonafit"
    assert branding.slogan == "Wellness & Longevity"
    assert branding.primaryHex == "#0f766e"
    assert branding.logoUrl is None


def test_update_branding(branding_service: BrandingService) -> None:
    updated = branding_service.update_branding(
        BrandingWrite(
            studioName=" Studio Norte ",
            slogan="Fuerza",
            primaryHex="#112233",
            accentHex="#AABBCC",
            surfaceHex="#F5F3F0",
            colorScheme="dark",
        )
    )
    assert updated.studioName == "Studio Norte"
    assert updated.primaryHex == "#112233"
    assert updated.colorScheme == "dark"
    assert branding_service.get_branding().studioName == "Studio Norte"


def test_save_logo(branding_service: BrandingService) -> None:
    upload = UploadFile(filename="mark.png", file=BytesIO(b"\x89PNG"), headers={"content-type": "image/png"})
    updated = branding_service.save_asset("logo", upload)
    assert updated.logoUrl == "/uploads/branding/logo.png"


def test_rejects_large_and_unknown_files(branding_service: BrandingService) -> None:
    huge = UploadFile(
        filename="mark.png",
        file=BytesIO(b"x" * (512 * 1024 + 2)),
        headers={"content-type": "image/png"},
    )
    try:
        branding_service.save_asset("logo", huge)
        raise AssertionError("expected BusinessError")
    except BusinessError as exc:
        assert exc.code == "branding.fileTooLarge"

    bad = UploadFile(filename="note.txt", file=BytesIO(b"hello"), headers={"content-type": "text/plain"})
    try:
        branding_service.save_asset("logo", bad)
        raise AssertionError("expected BusinessError")
    except BusinessError as exc:
        assert exc.code == "branding.invalidFileType"
