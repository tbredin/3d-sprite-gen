"""SDXL + pixel-art-xl + ControlNet img2img variations (local, free).

See docs/SPIKE-ai-sprite-variations.md.
"""

from __future__ import annotations

import io
import json
import random
import threading
import time
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Literal, Optional

import numpy as np
from PIL import Image, ImageFilter

from . import palette_util

ROOT = Path(__file__).resolve().parents[2]
VARIATIONS_DIR = ROOT / "generations" / "variations"

FreedomMode = Literal["polish", "costume", "soft"]

# Weighted toward Costume (grill decision).
FREEDOM_WEIGHTS: list[tuple[FreedomMode, float]] = [
    ("polish", 0.20),
    ("costume", 0.60),
    ("soft", 0.20),
]

FREEDOM_PARAMS: dict[FreedomMode, dict[str, float]] = {
    # Slightly looser ControlNet + higher denoise so charm can appear
    # (was locking so hard that MPS black frames looked identical).
    "polish": {"controlnet": 0.75, "denoise": 0.42},
    "costume": {"controlnet": 0.58, "denoise": 0.55},
    "soft": {"controlnet": 0.40, "denoise": 0.68},
}

GEN_SIZE = 512
NEGATIVE = (
    "photorealistic, 3d render, blender, smooth shading, blurry, lowres, "
    "noisy, jpeg artifacts, text, watermark, deformed, extra limbs"
)

_pipe_lock = threading.Lock()
_infer_lock = threading.Lock()
_pipe: Any = None
_pipe_error: Optional[str] = None
_device: str = "cpu"


def ensure_dirs() -> None:
    VARIATIONS_DIR.mkdir(parents=True, exist_ok=True)


def pick_freedom() -> FreedomMode:
    r = random.random()
    acc = 0.0
    for mode, w in FREEDOM_WEIGHTS:
        acc += w
        if r <= acc:
            return mode
    return "costume"


def dependencies_available() -> tuple[bool, str]:
    try:
        import torch  # noqa: F401
        import diffusers  # noqa: F401
    except ImportError as exc:
        return False, (
            "Missing ML deps. Install into the server venv: "
            "pip install torch torchvision diffusers transformers "
            f"accelerate safetensors httpx ({exc})"
        )
    return True, "ok"


def device_name() -> str:
    try:
        import torch

        if torch.backends.mps.is_available():
            return "mps"
        if torch.cuda.is_available():
            return "cuda"
    except Exception:  # noqa: BLE001
        pass
    return "cpu"


def status() -> dict[str, Any]:
    ok, msg = dependencies_available()
    loaded = _pipe is not None
    return {
        "ready": ok,
        "loaded": loaded,
        "device": device_name() if ok else None,
        "message": msg
        if not ok
        else (
            "Pipeline loaded."
            if loaded
            else "Deps OK — first generate loads SDXL weights."
        ),
        "gen_size": GEN_SIZE,
        "model": "stabilityai/stable-diffusion-xl-base-1.0",
        "lora": "nerijs/pixel-art-xl",
        "controlnet": "diffusers/controlnet-canny-sdxl-1.0",
    }


def warmup() -> dict[str, Any]:
    """Load SDXL + ControlNet + LoRA into memory (first call is slow)."""
    _load_pipeline()
    return status()


def _canny_image(img: Image.Image) -> Image.Image:
    """Edge map for ControlNet. Prefer OpenCV; fall back to PIL FIND_EDGES."""
    rgb = np.array(img.convert("RGB"))
    try:
        import cv2

        edges = cv2.Canny(rgb, 100, 200)
        return Image.fromarray(edges).convert("RGB")
    except Exception:  # noqa: BLE001
        gray = img.convert("L").filter(ImageFilter.FIND_EDGES)
        arr = np.array(gray)
        arr = np.where(arr > 24, 255, 0).astype(np.uint8)
        return Image.fromarray(arr).convert("RGB")


def _load_pipeline() -> Any:
    global _pipe, _pipe_error, _device
    with _pipe_lock:
        if _pipe is not None:
            return _pipe

        ok, msg = dependencies_available()
        if not ok:
            _pipe_error = msg
            raise RuntimeError(msg)

        # Clear prior load failure so installing peft/etc. can recover without restart.
        _pipe_error = None

        import torch
        from diffusers import (
            AutoencoderKL,
            ControlNetModel,
            StableDiffusionXLControlNetImg2ImgPipeline,
        )

        _device = device_name()
        # fp16 on Apple MPS commonly yields solid black/grey frames; use float32 there.
        # CUDA keeps fp16 for speed/VRAM.
        if _device == "cuda":
            dtype = torch.float16
            variant: Optional[str] = "fp16"
        else:
            dtype = torch.float32
            variant = None

        try:
            controlnet = ControlNetModel.from_pretrained(
                "diffusers/controlnet-canny-sdxl-1.0",
                torch_dtype=dtype,
            )
            # fp16-fix VAE still works in float32 and avoids SDXL color cast.
            vae = AutoencoderKL.from_pretrained(
                "madebyollin/sdxl-vae-fp16-fix",
                torch_dtype=dtype,
            )
            pipe = StableDiffusionXLControlNetImg2ImgPipeline.from_pretrained(
                "stabilityai/stable-diffusion-xl-base-1.0",
                controlnet=controlnet,
                vae=vae,
                torch_dtype=dtype,
                variant=variant,
            )
            pipe.load_lora_weights("nerijs/pixel-art-xl", adapter_name="pixel")
            pipe.set_adapters(["pixel"], adapter_weights=[1.2])
            pipe.to(_device)
            # Attention slicing helps unified memory on Apple Silicon.
            try:
                pipe.enable_attention_slicing()
            except Exception:  # noqa: BLE001
                pass
            if _device == "mps":
                # Extra safety: keep VAE in float32 even if upstream changes dtype.
                pipe.vae.to(dtype=torch.float32)
            _pipe = pipe
            return _pipe
        except Exception as exc:  # noqa: BLE001
            _pipe_error = str(exc)
            raise


@dataclass
class GenerateResult:
    id: str
    path: Path
    meta: dict[str, Any]


# Mid grey under the sprite for SDXL. Near-white backdrops smear into bright fringe.
_INIT_BG = (128, 128, 128)


def _edge_touching_transparent(opaque: np.ndarray) -> np.ndarray:
    """8-connected silhouette rim (opaque pixels next to transparent)."""
    h, w = opaque.shape
    edge = np.zeros_like(opaque)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            if dy == 0 and dx == 0:
                continue
            shifted = np.zeros_like(opaque)
            sy0, sy1 = max(0, dy), h + min(0, dy)
            sx0, sx1 = max(0, dx), w + min(0, dx)
            dy0, dy1 = max(0, -dy), h + min(0, -dy)
            dx0, dx1 = max(0, -dx), w + min(0, -dx)
            shifted[sy0:sy1, sx0:sx1] = ~opaque[dy0:dy1, dx0:dx1]
            edge |= opaque & shifted
    return edge


def _prepare_init(
    src: Image.Image,
    gen_size: int,
) -> tuple[Image.Image, Image.Image]:
    """Build SD init RGB + hard alpha matte without transparent-edge fringes.

    Lanczos on RGBA bleeds transparent RGB into the silhouette and softens
    alpha; compositing that onto a light backdrop yields bright edge pixels.
    Fix: hard-matte at native size, composite onto mid-grey, Lanczos *opaque*
    RGB only; NEAREST-upscale the binary alpha.
    """
    rgba = src.convert("RGBA")
    arr = np.array(rgba, dtype=np.uint8)
    hard = arr[:, :, 3] >= 8
    arr[~hard, :3] = 0
    arr[:, :, 3] = np.where(hard, 255, 0).astype(np.uint8)
    clean = Image.fromarray(arr, mode="RGBA")

    bg = Image.new("RGBA", clean.size, (*_INIT_BG, 255))
    flat = Image.alpha_composite(bg, clean).convert("RGB")
    init_rgb = flat.resize((gen_size, gen_size), Image.Resampling.LANCZOS)

    alpha_native = Image.fromarray(np.where(hard, 255, 0).astype(np.uint8), mode="L")
    alpha_up = alpha_native.resize((gen_size, gen_size), Image.Resampling.NEAREST)
    return init_rgb, alpha_up


def _restore_alpha(rgb: Image.Image, alpha_guide: Image.Image) -> Image.Image:
    """Re-apply a hard binary matte (no soft fringe)."""
    a = alpha_guide
    if a.size != rgb.size:
        a = a.resize(rgb.size, Image.Resampling.NEAREST)
    arr = np.array(rgb.convert("RGBA"), dtype=np.uint8)
    alpha = np.array(a.convert("L"), dtype=np.uint8)
    opaque = alpha >= 128
    arr[:, :, 3] = np.where(opaque, 255, 0).astype(np.uint8)
    arr[~opaque, :3] = 0
    return Image.fromarray(arr, mode="RGBA")


def _erode_matte(img: Image.Image, iterations: int = 1) -> Image.Image:
    """Shrink opaque region to discard the outermost diffusion halo ring."""
    if iterations <= 0:
        return img
    from scipy import ndimage

    arr = np.array(img.convert("RGBA"), dtype=np.uint8)
    opaque = arr[:, :, 3] >= 8
    struct = ndimage.generate_binary_structure(2, 1)
    shrunk = ndimage.binary_erosion(opaque, structure=struct, iterations=iterations)
    arr[~shrunk] = 0
    arr[shrunk, 3] = 255
    return Image.fromarray(arr, mode="RGBA")


def _scrub_matte_fringe(img: Image.Image, bg_rgb: tuple[int, int, int] = _INIT_BG) -> Image.Image:
    """Remove bright / backdrop-tinted pixels on the silhouette rim.

    Catches raw SD halos and Endesga snaps into light greys (#c7cfdd, #b4b4b4…).
    """
    arr = np.array(img.convert("RGBA"), dtype=np.uint8)
    opaque = arr[:, :, 3] >= 8
    if not opaque.any():
        return img

    edge = _edge_touching_transparent(opaque)
    if not edge.any():
        return img

    rgb = arr[:, :, :3].astype(np.int16)
    lum = rgb.mean(axis=2)

    br, bgc, bb = bg_rgb
    near_bg = (
        (np.abs(rgb[:, :, 0] - br) <= 40)
        & (np.abs(rgb[:, :, 1] - bgc) <= 40)
        & (np.abs(rgb[:, :, 2] - bb) <= 40)
    )
    chroma = rgb.max(axis=2) - rgb.min(axis=2)
    bright_grey = (lum >= 165) & (chroma <= 50)
    near_white = (rgb[:, :, 0] >= 200) & (rgb[:, :, 1] >= 200) & (rgb[:, :, 2] >= 200)

    interior = opaque & ~edge
    rel_bright = np.zeros_like(edge)
    if interior.any():
        med = float(np.median(lum[interior]))
        rel_bright = edge & (lum >= max(150.0, med + 35.0))

    kill = edge & (near_bg | bright_grey | near_white | rel_bright)
    if not kill.any():
        return img

    out = arr.copy()
    ys, xs = np.where(kill)
    for y, x in zip(ys.tolist(), xs.tolist()):
        samples: list[np.ndarray] = []
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            ny, nx = y + dy, x + dx
            if ny < 0 or nx < 0 or ny >= arr.shape[0] or nx >= arr.shape[1]:
                continue
            if opaque[ny, nx] and not edge[ny, nx] and not kill[ny, nx]:
                samples.append(arr[ny, nx, :3])
        if samples:
            out[y, x, :3] = samples[len(samples) // 2]
            out[y, x, 3] = 255
        else:
            out[y, x] = 0
    return Image.fromarray(out, mode="RGBA")


def generate_variation(
    source_png: bytes,
    *,
    palette_slug: str,
    palette_colors: list[str],
    size: int,
    prompt: str,
    outline_hex: str = "1a1932",
    freedom: Optional[FreedomMode] = None,
    seed: Optional[int] = None,
    steps: int = 24,
) -> GenerateResult:
    ensure_dirs()
    if size not in (8, 16, 24, 32, 40, 48, 56, 64):
        raise ValueError(f"unsupported size {size}")
    if not palette_colors:
        raise ValueError("palette_colors required")

    mode = freedom or pick_freedom()
    params = FREEDOM_PARAMS[mode]
    seed = int(seed if seed is not None else random.randint(0, 2**31 - 1))
    slug = (palette_slug or "endesga-64").strip().lower()

    src = Image.open(io.BytesIO(source_png)).convert("RGBA")
    init_rgb, alpha = _prepare_init(src, GEN_SIZE)
    canny = _canny_image(init_rgb)

    pipe = _load_pipeline()
    import torch

    generator = torch.Generator(device="cpu").manual_seed(seed)

    with _infer_lock:
        t0 = time.perf_counter()
        out = pipe(
            prompt=prompt,
            negative_prompt=NEGATIVE,
            image=init_rgb,
            control_image=canny,
            strength=float(params["denoise"]),
            controlnet_conditioning_scale=float(params["controlnet"]),
            num_inference_steps=int(steps),
            guidance_scale=5.0,
            generator=generator,
            width=GEN_SIZE,
            height=GEN_SIZE,
        ).images[0]
        elapsed = time.perf_counter() - t0

        # Guard: if MPS still returns a near-black frame, fail loudly instead of
        # shipping identical Endesga silhouettes.
        out_arr = np.array(out.convert("RGB"), dtype=np.float32)
        if float(out_arr.mean()) < 8.0:
            raise RuntimeError(
                "Diffusion returned a near-black image (mean "
                f"{out_arr.mean():.1f}). On Apple Silicon try restarting the "
                "API after the float32 MPS fix, or lower ControlNet strength."
            )

    rgba = _restore_alpha(out, alpha)
    # Drop the outermost generated ring (where backdrop halo lives), then scrub.
    rgba = _erode_matte(rgba, iterations=1)
    rgba = _scrub_matte_fringe(rgba)
    down = palette_util.nearest_neighbor_resize(rgba, size)
    down = _scrub_matte_fringe(down)
    quantized = palette_util.quantize_to_palette(down, palette_colors)
    quantized = _scrub_matte_fringe(quantized)
    final = palette_util.apply_silhouette_outline(quantized, outline_hex)

    job_id = uuid.uuid4().hex[:12]
    img_path = VARIATIONS_DIR / f"{job_id}.png"
    meta_path = VARIATIONS_DIR / f"{job_id}.json"
    final.save(img_path)

    meta = {
        "id": job_id,
        "locked": False,
        "freedom": mode,
        "seed": seed,
        "size": size,
        "palette": slug,
        "outline": outline_hex.lstrip("#").lower(),
        "prompt": prompt,
        "controlnet": params["controlnet"],
        "denoise": params["denoise"],
        "steps": steps,
        "elapsed_s": round(elapsed, 2),
        "created_at": time.time(),
        "image": f"/api/variations/{job_id}/image",
    }
    meta_path.write_text(json.dumps(meta, indent=2))
    return GenerateResult(id=job_id, path=img_path, meta=meta)


def list_variations() -> list[dict[str, Any]]:
    ensure_dirs()
    items: list[dict[str, Any]] = []
    for meta_path in VARIATIONS_DIR.glob("*.json"):
        try:
            items.append(json.loads(meta_path.read_text()))
        except Exception:  # noqa: BLE001
            continue
    items.sort(key=lambda m: m.get("created_at", 0), reverse=True)
    return items


def get_meta(job_id: str) -> Optional[dict[str, Any]]:
    path = VARIATIONS_DIR / f"{job_id}.json"
    if not path.exists():
        return None
    return json.loads(path.read_text())


def set_locked(job_id: str, locked: bool) -> dict[str, Any]:
    meta = get_meta(job_id)
    if meta is None:
        raise FileNotFoundError(job_id)
    meta["locked"] = bool(locked)
    (VARIATIONS_DIR / f"{job_id}.json").write_text(json.dumps(meta, indent=2))
    return meta


def delete_variation(job_id: str, *, force: bool = False) -> bool:
    meta = get_meta(job_id)
    if meta is None:
        return False
    if meta.get("locked") and not force:
        raise PermissionError("locked")
    for ext in (".png", ".json"):
        p = VARIATIONS_DIR / f"{job_id}{ext}"
        if p.exists():
            p.unlink()
    return True


def clear_unlocked() -> int:
    n = 0
    for meta in list_variations():
        if meta.get("locked"):
            continue
        if delete_variation(meta["id"], force=False):
            n += 1
    return n


def image_path(job_id: str) -> Optional[Path]:
    p = VARIATIONS_DIR / f"{job_id}.png"
    return p if p.exists() else None
