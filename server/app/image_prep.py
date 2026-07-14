"""Prepare uploaded images for volumetric sprite meshing."""

from __future__ import annotations

import io
from typing import Tuple

from PIL import Image

# Common pixel-art frame sizes (largest first for preference).
CELL_CANDIDATES = (64, 48, 32)
# Upscale tiny cells so distance-transform depth has enough resolution.
MIN_CONCEPT_EDGE = 128


def detect_cell_size(width: int, height: int) -> Tuple[int, bool]:
    """
    Infer cell size among 32 / 48 / 64 and whether this is a multi-frame sheet.

    Prefers the largest candidate that evenly tiles both axes with 2+ cells.
    Exact 32² / 48² / 64² images are treated as a single frame.
    """
    if width == height and width in CELL_CANDIDATES:
        return width, False

    for size in CELL_CANDIDATES:
        if width % size == 0 and height % size == 0:
            cells = (width // size) * (height // size)
            if cells >= 2:
                return size, True

    short = min(width, height)
    for size in CELL_CANDIDATES:
        if size <= short and (width > size or height > size):
            return size, True

    return short, False


def prepare_concept_image(raw: bytes) -> Tuple[Image.Image, bool, Tuple[int, int], int]:
    """
    Load upload → if spritesheet, take top-left cell at detected 32/48/64 size.

    Returns RGBA (alpha preserved for silhouette inflate), cropped_from_sheet,
    original_size, cell_px.
    """
    img = Image.open(io.BytesIO(raw)).convert("RGBA")
    ow, oh = img.size
    cell, sheet = detect_cell_size(ow, oh)

    if sheet:
        frame = img.crop((0, 0, min(cell, ow), min(cell, oh)))
    else:
        frame = img

    w, h = frame.size
    if w < MIN_CONCEPT_EDGE or h < MIN_CONCEPT_EDGE:
        scale = max(MIN_CONCEPT_EDGE / w, MIN_CONCEPT_EDGE / h)
        frame = frame.resize(
            (max(1, int(w * scale)), max(1, int(h * scale))),
            Image.Resampling.NEAREST,
        )

    return frame, sheet, (ow, oh), cell
