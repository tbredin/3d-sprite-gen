"""Lospec palette load + quantize + silhouette outline (iso-sprite-gen parity)."""

from __future__ import annotations

import json
from pathlib import Path

import httpx
import numpy as np
from PIL import Image

SERVER = Path(__file__).resolve().parents[1]
ROOT = Path(__file__).resolve().parents[2]
PALETTE_DIR = SERVER / "assets" / "palettes"
PALETTE_CACHE = ROOT / "refs" / "palette-cache"


def ensure_palette_dirs() -> None:
    PALETTE_DIR.mkdir(parents=True, exist_ok=True)
    PALETTE_CACHE.mkdir(parents=True, exist_ok=True)


def hex_to_rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


async def load_palette(slug: str) -> dict:
    """Bundled JSON, then disk cache, then Lospec fetch (same as iso-sprite-gen)."""
    ensure_palette_dirs()
    slug = (slug or "endesga-64").strip().lower()
    bundled = PALETTE_DIR / f"{slug}.json"
    if bundled.exists():
        return json.loads(bundled.read_text())

    cached = PALETTE_CACHE / f"{slug}.json"
    if cached.exists():
        return json.loads(cached.read_text())

    url = f"https://lospec.com/palette-list/{slug}.json"
    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.get(url)
        if resp.status_code != 200:
            raise ValueError(f"Lospec palette not found: {slug}")
        data = resp.json()
        if "error" in data:
            raise ValueError(f"Lospec palette not found: {slug}")
        cached.write_text(json.dumps(data, indent=2))
        return data


# Classic 4×4 Bayer (0…15) — matches src/lib/palette.ts / docs/SPIKE-bayer-dither.md.
BAYER_4 = np.array(
    [
        [0, 8, 2, 10],
        [12, 4, 14, 6],
        [3, 11, 1, 9],
        [15, 7, 13, 5],
    ],
    dtype=np.float32,
)
BAYER_BIAS_SCALE = 40.0
DEFAULT_BAYER_STRENGTH = 0.175


def quantize_to_palette(
    img: Image.Image,
    colors: list[str],
    *,
    bayer_strength: float = 0.0,
) -> Image.Image:
    """Nearest-colour palette lock. Optional Bayer bias before the lock."""
    palette = np.array([hex_to_rgb(c) for c in colors], dtype=np.float32)
    arr = np.array(img.convert("RGBA"), dtype=np.uint8)
    rgb = arr[:, :, :3].astype(np.float32)
    alpha = arr[:, :, 3]
    hard = alpha >= 8
    h, w, _ = rgb.shape

    strength = float(bayer_strength)
    if strength > 0:
        amp = strength * BAYER_BIAS_SCALE
        ys = np.arange(h, dtype=np.int32)[:, None]
        xs = np.arange(w, dtype=np.int32)[None, :]
        t = (BAYER_4[ys & 3, xs & 3] + 0.5) / 16.0 - 0.5
        bias = (t * 2.0 * amp).astype(np.float32)
        rgb = np.clip(rgb + bias[:, :, None], 0, 255)

    flat = rgb.reshape(-1, 3)
    dists = ((flat[:, None, :] - palette[None, :, :]) ** 2).sum(axis=2)
    nearest = palette[dists.argmin(axis=1)].astype(np.uint8)
    out = nearest.reshape(h, w, 3)
    result = np.dstack([out, np.where(hard, 255, 0).astype(np.uint8)])
    result[~hard] = 0
    return Image.fromarray(result, mode="RGBA")


def apply_silhouette_outline(img: Image.Image, outline_hex: str) -> Image.Image:
    """1px outward silhouette ring — mirrors client `applyPixelOutline`."""
    arr = np.array(img.convert("RGBA"), dtype=np.uint8)
    h, w, _ = arr.shape
    opaque = arr[:, :, 3] >= 8
    or_, og, ob = hex_to_rgb(outline_hex)
    ring = np.zeros((h, w), dtype=bool)
    for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
        shifted = np.zeros_like(opaque)
        sy0, sy1 = max(0, dy), h + min(0, dy)
        sx0, sx1 = max(0, dx), w + min(0, dx)
        dy0, dy1 = max(0, -dy), h + min(0, -dy)
        dx0, dx1 = max(0, -dx), w + min(0, -dx)
        shifted[sy0:sy1, sx0:sx1] = opaque[dy0:dy1, dx0:dx1]
        ring |= (~opaque) & shifted
    arr[ring, 0] = or_
    arr[ring, 1] = og
    arr[ring, 2] = ob
    arr[ring, 3] = 255
    return Image.fromarray(arr, mode="RGBA")


def nearest_neighbor_resize(img: Image.Image, size: int) -> Image.Image:
    return img.resize((size, size), Image.Resampling.NEAREST)
