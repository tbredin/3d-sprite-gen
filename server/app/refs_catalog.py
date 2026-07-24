"""Training-ref catalog: list frames + caption sidecars under curated-iso."""

from __future__ import annotations

from pathlib import Path
from typing import Any
from urllib.parse import quote

from . import house_lora
from .captions import (
    caption_from_filename,
    load_ref_caption,
    parse_facing_id,
)

TRIGGER = house_lora.TRIGGER


def _safe_ref_path(name: str) -> Path:
    """Resolve a basename inside refs_dir; reject traversal / missing files."""
    folder = house_lora.refs_dir().resolve()
    raw = Path(name).name
    if not raw or raw.startswith(".") or "/" in name or "\\" in name:
        raise FileNotFoundError(name)
    path = (folder / raw).resolve()
    try:
        path.relative_to(folder)
    except ValueError as exc:
        raise FileNotFoundError(name) from exc
    if path.suffix.lower() not in {".png", ".webp"}:
        raise FileNotFoundError(name)
    if not path.is_file():
        raise FileNotFoundError(name)
    return path


def _item_from_path(path: Path) -> dict[str, Any]:
    sidecar = path.with_suffix(".txt")
    has_custom = sidecar.is_file() and bool(sidecar.read_text(encoding="utf-8").strip())
    # UI: raw sidecar / auto without forced trigger. Training still injects it.
    auto = caption_from_filename(path.name, TRIGGER)
    caption = load_ref_caption(path, TRIGGER, ensure_trigger=False)
    enc = quote(path.name, safe="")
    return {
        "name": path.name,
        "stem": path.stem,
        "caption": caption,
        "auto_caption": auto,
        "has_custom": has_custom,
        "facing": parse_facing_id(caption),
        "image": f"/api/refs/{enc}/image",
    }


def list_refs() -> dict[str, Any]:
    folder = house_lora.refs_dir()
    files = house_lora._train_pngs()
    items = [_item_from_path(path) for path in files]
    custom = sum(1 for i in items if i["has_custom"])
    lora = house_lora.refresh_status()
    return {
        "refs_dir": str(folder),
        "trigger": TRIGGER,
        "count": len(items),
        "custom_count": custom,
        "auto_count": len(items) - custom,
        "items": items,
        "lora": lora,
    }


def get_ref(name: str) -> dict[str, Any]:
    path = _safe_ref_path(name)
    item = _item_from_path(path)
    item["trigger"] = TRIGGER
    return item


def image_path(name: str) -> Path:
    return _safe_ref_path(name)


def save_caption(name: str, caption: str) -> dict[str, Any]:
    """Persist caption exactly as edited — no forced trigger prepend."""
    path = _safe_ref_path(name)
    text = (caption or "").strip()
    sidecar = path.with_suffix(".txt")
    if not text:
        if sidecar.exists():
            sidecar.unlink()
    else:
        sidecar.write_text(text + "\n", encoding="utf-8")
    house_lora.mark_refs_changed()
    return get_ref(name)


def clear_caption(name: str) -> dict[str, Any]:
    """Delete sidecar → fall back to filename auto-caption."""
    return save_caption(name, "")


def delete_ref(name: str) -> dict[str, Any]:
    """Permanently remove a training PNG and its caption sidecar."""
    path = _safe_ref_path(name)
    sidecar = path.with_suffix(".txt")
    deleted = [path.name]
    path.unlink()
    if sidecar.is_file():
        sidecar.unlink()
        deleted.append(sidecar.name)
    house_lora.mark_refs_changed()
    return {"deleted": deleted, "name": name}
