"""Derive per-frame training captions from curated sprite filenames."""

from __future__ import annotations

import re
from pathlib import Path

# Short caption clauses for the 8-way iso facing pad (screen directions).
FACING_CLAUSES: dict[str, str] = {
    "up": "facing top of frame",
    "away-tr": "facing top-right",
    "right": "facing right",
    "toward-br": "facing bottom-right",
    "down": "facing bottom of frame",
    "toward-bl": "facing bottom-left",
    "left": "facing left",
    "away-tl": "facing top-left",
}

# Strip known facing clauses + common freehand variants the UI used to type.
_FACING_STRIP_RE = re.compile(
    r"(?:,\s*)?(?:isometric\s+)?facing\s+"
    r"(?:toward\s+(?:the\s+)?(?:camera\s+(?:at\s+the\s+)?)?)?"
    r"(?:the\s+)?"
    r"(?:"
    r"top-right|top-left|bottom-right|bottom-left|"
    r"top of frame|bottom of frame|"
    r"screen-up|screen-down|screen-right|screen-left|"
    r"top right|top left|bottom right|bottom left|"
    r"top|bottom|right|left|up|down"
    r")"
    r"(?:\s+of\s+(?:the\s+)?frame)?",
    re.IGNORECASE,
)


def _humanize_stem(stem: str) -> str:
    """Turn 'Seraï Cyborg' / 'BriskMan3 Variant' into a readable subject."""
    s = stem.strip()
    s = re.sub(r"\s+", " ", s)
    # Split CamelCase leftovers (BriskMan3 → Brisk Man3)
    s = re.sub(r"([a-z])([A-Z])", r"\1 \2", s)
    s = re.sub(r"([A-Za-z])(\d)", r"\1 \2", s)
    return s.strip()


def caption_from_filename(filename: str, trigger: str = "") -> str:
    """
    Build an SDXL caption for house-style LoRA training.

    Trigger is injected at train time via ``load_ref_caption(..., ensure_trigger=True)``,
    not baked into the editable auto template.
    """
    del trigger  # kept for call-site compatibility
    subject = _humanize_stem(Path(filename).stem)
    parts: list[str] = [
        "isometric pixel art character sprite",
        "SNES-era JRPG",
        "Sea of Stars spirit",
    ]
    if subject:
        parts.append(subject)
    parts.extend(
        [
            "readable silhouette",
            "hand-authored pixel details",
            "limited palette",
            "single isolated character",
            "game sprite",
        ]
    )
    seen: set[str] = set()
    ordered: list[str] = []
    for p in parts:
        key = p.lower()
        if key in seen:
            continue
        seen.add(key)
        ordered.append(p)
    return ", ".join(ordered)


def strip_facing_clause(caption: str) -> str:
    """Remove facing direction phrases so a new pad selection can replace them."""
    text = _FACING_STRIP_RE.sub("", caption or "")
    text = re.sub(r"\s*,\s*,+", ", ", text)
    text = re.sub(r"^\s*,\s*", "", text)
    text = re.sub(r"\s*,\s*$", "", text)
    return re.sub(r"\s{2,}", " ", text).strip(" ,")


def parse_facing_id(caption: str) -> str | None:
    """Return facing id if a known clause is present (longest match wins)."""
    low = (caption or "").lower()
    best: str | None = None
    best_len = -1
    for fid, clause in FACING_CLAUSES.items():
        if clause in low and len(clause) > best_len:
            best = fid
            best_len = len(clause)
    if best:
        return best
    # Freehand aliases
    aliases = [
        ("bottom-right", "toward-br"),
        ("bottom right", "toward-br"),
        ("top-right", "away-tr"),
        ("top right", "away-tr"),
        ("bottom-left", "toward-bl"),
        ("bottom left", "toward-bl"),
        ("top-left", "away-tl"),
        ("top left", "away-tl"),
        ("screen-up", "up"),
        ("screen-down", "down"),
        ("screen-right", "right"),
        ("screen-left", "left"),
    ]
    for needle, fid in aliases:
        if needle in low:
            return fid
    return None


def apply_facing_clause(caption: str, facing_id: str) -> str:
    """Replace any existing facing phrase with the pad selection."""
    clause = FACING_CLAUSES.get(facing_id)
    if not clause:
        return caption
    base = strip_facing_clause(caption)
    if not base:
        return clause
    return f"{base}, {clause}"


def load_ref_caption(
    path: Path,
    trigger: str,
    *,
    ensure_trigger: bool = True,
) -> str:
    """Prefer an optional .txt sidecar; otherwise derive from the filename.

    When ``ensure_trigger`` is True (training), prepend the style token if
    missing. The caption UI saves/displays text without forcing the trigger.
    """
    sidecar = path.with_suffix(".txt")
    if sidecar.is_file():
        text = sidecar.read_text(encoding="utf-8").strip()
        if text:
            if ensure_trigger and trigger and trigger.lower() not in text.lower():
                return f"{trigger}, {text}"
            return text
    auto = caption_from_filename(path.name, trigger)
    if ensure_trigger and trigger and trigger.lower() not in auto.lower():
        return f"{trigger}, {auto}"
    return auto
