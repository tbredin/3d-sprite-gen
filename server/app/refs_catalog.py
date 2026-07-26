"""Training-ref catalog: list frames + caption sidecars under curated-iso."""

from __future__ import annotations

import subprocess
from collections import Counter
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

# Colour distance for chroma-key matches (RGB Euclidean, 0–441).
_BG_TOLERANCE = 28


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


def remove_background(name: str) -> dict[str, Any]:
    """Detect the solid backdrop colour and punch it to transparent."""
    path = _safe_ref_path(name)
    from PIL import Image

    img = Image.open(path).convert("RGBA")
    pixels = img.load()
    width, height = img.size
    if width == 0 or height == 0:
        raise ValueError("Image is empty.")

    bg = _detect_background_colour(pixels, width, height)
    if bg is None:
        raise ValueError("No opaque background colour found on the edges.")

    cleared = _flood_clear_background(pixels, width, height, bg, _BG_TOLERANCE)
    if cleared == 0:
        raise ValueError(
            f"Detected background rgb{bg} but no matching edge pixels were cleared."
        )

    # Always write PNG so alpha is preserved even if the source was opaque JPG-like.
    out = path if path.suffix.lower() == ".png" else path.with_suffix(".png")
    img.save(out, format="PNG")
    if out != path and path.exists():
        path.unlink()
        # Point catalog at the new basename when format changed.
        name = out.name

    house_lora.mark_refs_changed()
    item = get_ref(name)
    item["background_removed"] = {
        "rgb": list(bg),
        "cleared": cleared,
        "tolerance": _BG_TOLERANCE,
    }
    # Cache-bust the preview URL after rewriting the file.
    item["image"] = f"{item['image']}?v={int(out.stat().st_mtime)}"
    return item


def flip_horizontal(name: str) -> dict[str, Any]:
    """Mirror the sprite left/right on disk."""
    path = _safe_ref_path(name)
    from PIL import Image

    img = Image.open(path).convert("RGBA").transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    out = path if path.suffix.lower() == ".png" else path.with_suffix(".png")
    img.save(out, format="PNG")
    if out != path and path.exists():
        path.unlink()
        name = out.name

    house_lora.mark_refs_changed()
    item = get_ref(name)
    item["flipped"] = "horizontal"
    item["image"] = f"{item['image']}?v={int(out.stat().st_mtime)}"
    return item


def _colour_dist(a: tuple[int, int, int], b: tuple[int, int, int]) -> float:
    return (
        (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2
    ) ** 0.5


def _detect_background_colour(
    pixels: Any,
    width: int,
    height: int,
) -> tuple[int, int, int] | None:
    """Pick a solid backdrop colour from the image border.

    Requires the candidate to dominate the opaque edge samples so black
    silhouette outlines on already-transparent sprites are not treated as BG.
    """
    samples: list[tuple[int, int, int]] = []
    for x in range(width):
        for y in (0, height - 1):
            r, g, b, a = pixels[x, y]
            if a >= 200:
                samples.append((r, g, b))
    for y in range(height):
        for x in (0, width - 1):
            r, g, b, a = pixels[x, y]
            if a >= 200:
                samples.append((r, g, b))

    if not samples:
        return None

    colour, count = Counter(samples).most_common(1)[0]
    # Need a real backdrop, not a few outline pixels on the rim.
    if count < max(24, int(len(samples) * 0.35)):
        return None
    return colour


def _flood_clear_background(
    pixels: Any,
    width: int,
    height: int,
    bg: tuple[int, int, int],
    tolerance: float,
) -> int:
    """Clear edge-connected pixels matching the background colour."""
    visited = [[False] * width for _ in range(height)]
    stack: list[tuple[int, int]] = []

    def maybe_push(x: int, y: int) -> None:
        if x < 0 or y < 0 or x >= width or y >= height or visited[y][x]:
            return
        r, g, b, a = pixels[x, y]
        if a < 8:
            visited[y][x] = True
            return
        if _colour_dist((r, g, b), bg) <= tolerance:
            stack.append((x, y))
            visited[y][x] = True

    for x in range(width):
        maybe_push(x, 0)
        maybe_push(x, height - 1)
    for y in range(height):
        maybe_push(0, y)
        maybe_push(width - 1, y)

    cleared = 0
    while stack:
        x, y = stack.pop()
        pixels[x, y] = (0, 0, 0, 0)
        cleared += 1
        for nx, ny in (
            (x - 1, y),
            (x + 1, y),
            (x, y - 1),
            (x, y + 1),
        ):
            maybe_push(nx, ny)
    return cleared


def set_refs_directory(path: str) -> dict[str, Any]:
    """Point the catalog at another image folder."""
    house_lora.set_refs_dir(path)
    return list_refs()


def browse_refs_directory() -> dict[str, Any]:
    """Open a native folder picker and load the selected directory."""
    current = house_lora.refs_dir()
    start = str(current if current.is_dir() else Path.home())
    safe_start = start.replace("\\", "\\\\").replace('"', '\\"')
    script = (
        'set theFolder to choose folder with prompt "Select AI variations source" '
        f'default location POSIX file "{safe_start}"\n'
        "POSIX path of theFolder"
    )
    try:
        result = subprocess.run(
            ["osascript", "-e", script],
            check=False,
            capture_output=True,
            text=True,
            timeout=300,
        )
    except (FileNotFoundError, subprocess.TimeoutExpired, OSError) as exc:
        raise RuntimeError("Native folder picker is unavailable.") from exc
    if result.returncode != 0:
        raise RuntimeError("Folder selection cancelled.")
    chosen = (result.stdout or "").strip()
    if not chosen:
        raise RuntimeError("Folder selection cancelled.")
    return set_refs_directory(chosen)
