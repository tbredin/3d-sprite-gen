from __future__ import annotations

import asyncio
import time
import uuid
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from . import house_lora, image_prep, palette_util, refs_catalog, sprite_variations, sprite_volume

ROOT = Path(__file__).resolve().parents[2]
SERVER = Path(__file__).resolve().parents[1]
MODELS = ROOT / "models"
GENERATIONS = ROOT / "generations"
PALETTES = SERVER / "assets" / "palettes"

MODELS.mkdir(parents=True, exist_ok=True)
GENERATIONS.mkdir(parents=True, exist_ok=True)
sprite_variations.ensure_dirs()

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
    sizes: List[int] = Field(default_factory=lambda: list(range(8, 65, 2)))
    default_palette: str = "endesga-64"
    sample_model: Optional[str] = None
    how_it_works: str = (
        "Upload a character image or spritesheet. "
        "Sheets are detected by 8–64 px cell size; we use the top-left cell. "
        "That frame is inflated into a rounded volumetric mesh (cylindrical limb/head "
        "cross-sections) for isometric pixel baking — local only, no paid APIs."
    )
    variations: Optional[dict] = None


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
        variations=sprite_variations.status(),
        message=(
            "Ready: upload sprite/sheet → volumetric character GLB (free/local)."
            if ready
            else "Mesh backend unavailable."
        ),
    )


@app.get("/api/palette/{slug}")
async def palette(slug: str) -> dict:
    try:
        return await palette_util.load_palette(slug)
    except ValueError as exc:
        raise HTTPException(404, str(exc)) from exc


@app.get("/api/variations/status")
def variations_status() -> dict:
    return sprite_variations.status()


@app.get("/api/lora/status")
def lora_status() -> dict:
    return house_lora.refresh_status()


class LoraRebuildBody(BaseModel):
    captions: dict[str, str] = Field(default_factory=dict)


@app.post("/api/lora/rebuild")
async def lora_rebuild(
    max_steps: int = 500,
    body: Optional[LoraRebuildBody] = None,
) -> dict:
    """Train / rebuild the SDXL house LoRA on curated-iso (background)."""
    steps = max(50, min(2000, int(max_steps)))
    try:
        return house_lora.start_rebuild(
            max_steps=steps,
            caption_overrides=body.captions if body else None,
        )
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(409, str(exc)) from exc


class CaptionBody(BaseModel):
    caption: str = ""


class RefsDirBody(BaseModel):
    path: str


@app.get("/api/refs")
async def refs_list(
    palette_slug: str = "",
    palette_name: str = "",
) -> dict:
    """Training frames + captions under the active refs directory."""
    name = (palette_name or "").strip()
    slug = (palette_slug or "").strip()
    if not name and slug:
        try:
            pal = await palette_util.load_palette(slug)
            name = str(pal.get("name") or slug)
        except Exception:  # noqa: BLE001
            name = slug
    return refs_catalog.list_refs(palette_name=name)


@app.put("/api/refs/dir")
def refs_set_dir(body: RefsDirBody) -> dict:
    """Load images from another directory."""
    try:
        return refs_catalog.set_refs_directory(body.path)
    except FileNotFoundError as exc:
        raise HTTPException(404, str(exc)) from exc


@app.post("/api/refs/browse")
async def refs_browse() -> dict:
    """Open a native folder picker and load its images."""
    try:
        return await asyncio.to_thread(refs_catalog.browse_refs_directory)
    except RuntimeError as exc:
        raise HTTPException(400, str(exc)) from exc


@app.get("/api/refs/{name}/image")
def refs_image(name: str) -> FileResponse:
    try:
        path = refs_catalog.image_path(name)
    except FileNotFoundError as exc:
        raise HTTPException(404, f"unknown ref {name}") from exc
    media = "image/webp" if path.suffix.lower() == ".webp" else "image/png"
    return FileResponse(path, media_type=media, filename=path.name)


@app.post("/api/refs/{name}/remove-background")
def refs_remove_background(name: str) -> dict:
    """Detect the solid backdrop colour and punch it to transparent."""
    try:
        return refs_catalog.remove_background(name)
    except FileNotFoundError as exc:
        raise HTTPException(404, f"unknown ref {name}") from exc
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc


@app.post("/api/refs/{name}/flip-horizontal")
def refs_flip_horizontal(name: str) -> dict:
    """Mirror a training ref left/right."""
    try:
        return refs_catalog.flip_horizontal(name)
    except FileNotFoundError as exc:
        raise HTTPException(404, f"unknown ref {name}") from exc


@app.get("/api/refs/{name}")
def refs_get(name: str) -> dict:
    try:
        return refs_catalog.get_ref(name)
    except FileNotFoundError as exc:
        raise HTTPException(404, f"unknown ref {name}") from exc


@app.put("/api/refs/{name}/caption")
def refs_save_caption(name: str, body: CaptionBody) -> dict:
    try:
        return refs_catalog.save_caption(name, body.caption)
    except FileNotFoundError as exc:
        raise HTTPException(404, f"unknown ref {name}") from exc


@app.delete("/api/refs/{name}/caption")
def refs_clear_caption(name: str) -> dict:
    try:
        return refs_catalog.clear_caption(name)
    except FileNotFoundError as exc:
        raise HTTPException(404, f"unknown ref {name}") from exc


@app.delete("/api/refs/{name}")
def refs_delete(name: str) -> dict:
    """Permanently delete a training image (+ caption sidecar) from disk."""
    try:
        return refs_catalog.delete_ref(name)
    except FileNotFoundError as exc:
        raise HTTPException(404, f"unknown ref {name}") from exc


@app.post("/api/variations/warmup")
async def variations_warmup() -> dict:
    """Download/load SDXL weights into memory. Slow the first time."""
    try:
        return await asyncio.to_thread(sprite_variations.warmup)
    except RuntimeError as exc:
        raise HTTPException(503, str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(500, str(exc)) from exc


@app.get("/api/variations")
def variations_list() -> dict:
    return {"items": sprite_variations.list_variations()}


# Declared before the /{job_id} routes so "locked.zip" is never read as an id.
@app.get("/api/variations/locked.zip")
async def variations_locked_zip() -> Response:
    data, count = await asyncio.to_thread(sprite_variations.locked_zip_bytes)
    if count == 0:
        raise HTTPException(404, "no locked variations to download")
    filename = f"locked-sprites-{count}-{time.strftime('%Y%m%d-%H%M%S')}.zip"
    return Response(
        content=data,
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "X-Locked-Count": str(count),
        },
    )


@app.post("/api/variations/generate")
async def variations_generate(
    file: UploadFile = File(...),
    size: int = Form(48),
    palette_slug: str = Form("endesga-64"),
    prompt: str = Form(""),
    outline_hex: str = Form("1a1932"),
    freedom: Optional[str] = Form(None),
    seed: Optional[int] = Form(None),
    steps: int = Form(sprite_variations.DEFAULT_STEPS),
    guidance_scale: float = Form(sprite_variations.DEFAULT_GUIDANCE),
) -> dict:
    raw = await file.read()
    if not raw:
        raise HTTPException(400, "empty file")
    try:
        palette = await palette_util.load_palette(palette_slug)
    except ValueError as exc:
        raise HTTPException(404, str(exc)) from exc

    colors = palette.get("colors") or []
    if not colors:
        raise HTTPException(400, "palette has no colors")

    mode = freedom if freedom in ("polish", "costume", "soft") else None
    try:
        result = await asyncio.to_thread(
            sprite_variations.generate_variation,
            raw,
            palette_slug=palette_slug,
            palette_colors=colors,
            size=size,
            prompt=prompt or "isometric chibi character sprite, retro pixel art",
            outline_hex=outline_hex,
            freedom=mode,
            seed=seed,
            steps=steps,
            guidance_scale=guidance_scale,
        )
    except RuntimeError as exc:
        raise HTTPException(503, str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(500, str(exc)) from exc

    return result.meta


@app.post("/api/variations/{job_id}/lock")
def variations_lock(job_id: str, locked: bool = Form(True)) -> dict:
    try:
        return sprite_variations.set_locked(job_id, locked)
    except FileNotFoundError as exc:
        raise HTTPException(404, f"unknown variation {job_id}") from exc


@app.delete("/api/variations/clear")
def variations_clear() -> dict:
    n = sprite_variations.clear_unlocked()
    return {"deleted": n}


@app.delete("/api/variations/{job_id}")
def variations_delete(job_id: str) -> dict:
    try:
        ok = sprite_variations.delete_variation(job_id)
    except PermissionError as exc:
        raise HTTPException(409, "variation is locked") from exc
    if not ok:
        raise HTTPException(404, f"unknown variation {job_id}")
    return {"deleted": job_id}


@app.get("/api/variations/{job_id}/image")
def variations_image(job_id: str) -> FileResponse:
    path = sprite_variations.image_path(job_id)
    if path is None:
        raise HTTPException(404, f"unknown variation {job_id}")
    return FileResponse(path, media_type="image/png", filename=f"{job_id}.png")


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
