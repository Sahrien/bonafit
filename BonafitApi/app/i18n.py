from __future__ import annotations

from typing import Any, Mapping

SUPPORTED_LANGUAGES = ("es", "en")
DEFAULT_LANGUAGE = "es"
LanguageCode = str

I18nMap = dict[str, dict[str, str]]


def normalize_language(value: str | None) -> LanguageCode:
    if not value:
        return DEFAULT_LANGUAGE
    code = value.split(",")[0].strip().split(";")[0].strip().replace("_", "-")
    primary = code.split("-")[0].lower()
    return primary if primary in SUPPORTED_LANGUAGES else DEFAULT_LANGUAGE


def parse_accept_language(header: str | None) -> LanguageCode:
    if not header:
        return DEFAULT_LANGUAGE
    ranked: list[tuple[float, str]] = []
    for part in header.split(","):
        raw = part.strip()
        if not raw:
            continue
        lang, _, rest = raw.partition(";")
        quality = 1.0
        if rest.strip().lower().startswith("q="):
            try:
                quality = float(rest.strip()[2:])
            except ValueError:
                quality = 0.0
        ranked.append((quality, lang))
    ranked.sort(key=lambda item: item[0], reverse=True)
    for _, lang in ranked:
        code = normalize_language(lang)
        if lang.strip() and code in SUPPORTED_LANGUAGES:
            primary = lang.split(",")[0].strip().split("-")[0].lower()
            if primary in SUPPORTED_LANGUAGES:
                return primary
    return DEFAULT_LANGUAGE


def locale_for(user_language: str | None, accept_language: str | None = None) -> LanguageCode:
    if user_language:
        return normalize_language(user_language)
    return parse_accept_language(accept_language)


def _field_map(i18n: Mapping[str, Any] | None, field: str, fallback: str) -> dict[str, str]:
    raw = {}
    if isinstance(i18n, Mapping):
        candidate = i18n.get(field)
        if isinstance(candidate, Mapping):
            raw = {str(key): str(value) for key, value in candidate.items() if value is not None}
    mapping = {DEFAULT_LANGUAGE: (raw.get(DEFAULT_LANGUAGE) or fallback or "").strip()}
    english = (raw.get("en") or "").strip()
    if english:
        mapping["en"] = english
    return mapping


def resolve_text(fallback: str, i18n: Mapping[str, Any] | None, field: str, language: str) -> str:
    mapping = _field_map(i18n, field, fallback)
    lang = normalize_language(language)
    return mapping.get(lang) or mapping.get(DEFAULT_LANGUAGE) or fallback


def merge_field_i18n(
    fallback: str,
    incoming: Mapping[str, Any] | None,
    field: str,
) -> tuple[str, I18nMap]:
    mapping = _field_map(incoming, field, fallback)
    spanish = mapping.get(DEFAULT_LANGUAGE) or fallback
    mapping[DEFAULT_LANGUAGE] = spanish
    return spanish, {field: mapping}


def merge_i18n(fallback_fields: Mapping[str, str], incoming: Mapping[str, Any] | None) -> tuple[dict[str, str], I18nMap]:
    resolved: dict[str, str] = {}
    bundled: I18nMap = {}
    source = incoming if isinstance(incoming, Mapping) else {}
    for field, fallback in fallback_fields.items():
        value, piece = merge_field_i18n(fallback, source, field)
        resolved[field] = value
        bundled.update(piece)
    return resolved, bundled
