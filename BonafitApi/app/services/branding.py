from pathlib import Path

from fastapi import UploadFile

from app.database import SessionFactory
from app.errors import BusinessError
from app.identity import utcnow
from app.models import Branding
from app.schemas import BrandingOut, BrandingWrite
from app.serializers import branding_out

BRANDING_ID = "branding"
DEFAULT_STUDIO_NAME = "Bonafit"
DEFAULT_SLOGAN = "Wellness & Longevity"
DEFAULT_PRIMARY_HEX = "#0f766e"
DEFAULT_ACCENT_HEX = "#c2410c"
DEFAULT_SURFACE_HEX = "#f5f3f0"
DEFAULT_COLOR_SCHEME = "light"
MAX_ASSET_BYTES = 512 * 1024
ALLOWED_ASSET_TYPES = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "image/svg+xml": ".svg",
}
ASSET_KINDS = frozenset({"logo", "favicon"})


class BrandingService:
    def __init__(self, session_factory: SessionFactory, uploads_dir: str) -> None:
        self._session_factory = session_factory
        self._uploads_dir = Path(uploads_dir)

    def get_branding(self) -> BrandingOut:
        with self._session_factory() as db:
            return branding_out(_branding(db))

    def update_branding(self, payload: BrandingWrite) -> BrandingOut:
        with self._session_factory() as db:
            row = _branding(db)
            row.studio_name = payload.studioName.strip()
            row.slogan = payload.slogan.strip()
            row.primary_hex = payload.primaryHex.lower()
            row.accent_hex = payload.accentHex.lower()
            row.surface_hex = payload.surfaceHex.lower()
            row.color_scheme = payload.colorScheme
            row.updated_at = utcnow()
            if not row.studio_name:
                raise BusinessError("branding.invalidName")
            return branding_out(row)

    def save_asset(self, kind: str, upload: UploadFile) -> BrandingOut:
        if kind not in ASSET_KINDS:
            raise BusinessError("branding.invalidAsset", 400)
        extension = ALLOWED_ASSET_TYPES.get((upload.content_type or "").lower())
        if extension is None:
            raise BusinessError("branding.invalidFileType", 400)
        data = upload.file.read(MAX_ASSET_BYTES + 1)
        if len(data) > MAX_ASSET_BYTES:
            raise BusinessError("branding.fileTooLarge", 400)
        if not data:
            raise BusinessError("branding.invalidFileType", 400)

        relative = f"branding/{kind}{extension}"
        destination = self._uploads_dir / relative
        destination.parent.mkdir(parents=True, exist_ok=True)

        with self._session_factory() as db:
            row = _branding(db)
            previous = row.logo_path if kind == "logo" else row.favicon_path
            destination.write_bytes(data)
            if previous and previous != relative:
                old = self._uploads_dir / previous
                if old.is_file():
                    old.unlink()
            if kind == "logo":
                row.logo_path = relative
            else:
                row.favicon_path = relative
            row.updated_at = utcnow()
            return branding_out(row)


def default_branding() -> Branding:
    return Branding(
        id=BRANDING_ID,
        studio_name=DEFAULT_STUDIO_NAME,
        slogan=DEFAULT_SLOGAN,
        primary_hex=DEFAULT_PRIMARY_HEX,
        accent_hex=DEFAULT_ACCENT_HEX,
        surface_hex=DEFAULT_SURFACE_HEX,
        color_scheme=DEFAULT_COLOR_SCHEME,
        logo_path=None,
        favicon_path=None,
        updated_at=utcnow(),
    )


def _branding(db) -> Branding:
    row = db.get(Branding, BRANDING_ID)
    if row is None:
        row = default_branding()
        db.add(row)
        db.flush()
    return row
