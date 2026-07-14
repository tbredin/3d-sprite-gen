from __future__ import annotations

import uuid
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from . import image_prep, sprite_volume

ROOT = Path(__file__).resolve().parents[2]
SERVER = Path(__file__).resolve().parents[1]
MODELS = ROOT / "models"
GENERATIONS = ROOT / "generations"
PALETTES = SERVER / "assets" / "palettes"

MODELS.mkdir(parents=True, exist_ok=True)
GENERATIONS.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="3D Sprite Gen", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class StatusResponse(BaseModel):
    mesh_backend: str
    mesh_ready: bool
    message: str
    sizes: List[int] = Field(default_factory=lambda: [32, 48, 64])
    default_palette: str = "endesga-64"
    sample_model: Optional[str] = None
    how_it_works: str = (
        "Upload a character image or spritesheet. "
        "Sheets are detected by 32 / 48 / 64 px cell size; we use the top-left cell. "
        "That frame is inflated into a rounded volumetric mesh (cylindrical limb/head "
        "cross-sections) for isometric pixel baking — local only, no paid APIs."
    )


class GenerateMeshResponse(BaseModel):
    status: str
    model_url: Optional[str] = None
    concept_url: Optional[str] = None
    message: str
    from_spritesheet: bool = False
    source_size: Optional[List[int]] = None


def _sample_model_url() -> Optional[str]:
    chair = MODELS / "chair.glb"
    if chair.exists() and chair.stat().st_size > 0:
        return "/api/models/chair.glb"
    return None


@app.get("/api/status", response_model=StatusResponse)
def status() -> StatusResponse:
    sample = _sample_model_url()
    ready = sprite_volume.available()
    return StatusResponse(
        mesh_backend="sprite-volume",
        mesh_ready=ready,
        sample_model=sample,
        message=(
            "Ready: upload sprite/sheet → volumetric character GLB (free/local)."
            if ready
            else "Mesh backend unavailable."
        ),
    )


@app.get("/api/palette/{slug}")
def palette(slug: str) -> dict:
    import json

    path = PALETTES / f"{slug}.json"
    if not path.exists():
        raise HTTPException(404, f"palette {slug} not found")
    return json.loads(path.read_text())


@app.post("/api/mesh-from-image", response_model=GenerateMeshResponse)
async def mesh_from_image(file: UploadFile = File(...)) -> GenerateMeshResponse:
    """Crop frame if needed, then inflate silhouette into a volumetric GLB."""
    if not sprite_volume.available():
        raise HTTPException(503, "mesh backend not available")

    raw = await file.read()
    if not raw:
        raise HTTPException(400, "empty file")

    try:
        concept, from_sheet, (ow, oh), cell = image_prep.prepare_concept_image(raw)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(400, f"could not read image: {exc}") from exc

    MODELS.mkdir(parents=True, exist_ok=True)
    stem = Path(file.filename or "upload").stem[:40] or "upload"
    job = f"{stem}-{uuid.uuid4().hex[:8]}"
    src = MODELS / f"{job}-concept.png"
    concept.save(src)

    try:
        glb = sprite_volume.image_to_glb(src, stem=job)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(500, str(exc)) from exc

    if from_sheet:
        msg = (
            f"Spritesheet ({ow}×{oh}) → top-left {cell}×{cell} → "
            "volumetric mesh (cylindrical inflate). Ready."
        )
    else:
        msg = f"Frame ({ow}×{oh}) → volumetric mesh (cylindrical inflate). Ready."

    return GenerateMeshResponse(
        status="ready",
        model_url=f"/api/models/{glb.name}",
        concept_url=f"/api/models/{src.name}",
        message=msg,
        from_spritesheet=from_sheet,
        source_size=[ow, oh],
    )


app.mount("/api/models", StaticFiles(directory=str(MODELS)), name="models")
