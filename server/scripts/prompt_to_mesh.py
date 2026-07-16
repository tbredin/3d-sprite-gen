#!/usr/bin/env python3
"""
prompt → SD1.5 concept PNG (white bg) → TripoSR GLB

Run with the TripoSR venv so torch / rembg / TripoSR share one env:
  vendor/TripoSR/.venv/bin/python server/scripts/prompt_to_mesh.py ...
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TRIPOSR = ROOT / "vendor" / "TripoSR"
sys.path.insert(0, str(TRIPOSR))


def device_name() -> str:
    import torch

    if torch.backends.mps.is_available():
        return "mps"
    if torch.cuda.is_available():
        return "cuda"
    return "cpu"


FACING_HINTS = {
    "up": (
        "isometric low-top-down view, character facing toward the top of the frame "
        "(screen-up), back view, Sea of Stars / SNES JRPG angle"
    ),
    "away-tr": (
        "isometric low-top-down view, character facing away from camera toward the "
        "top-right of the frame, back three-quarter, Sea of Stars / SNES JRPG angle"
    ),
    "right": (
        "isometric low-top-down view, character facing toward the right of the frame "
        "(screen-right), profile, Sea of Stars / SNES JRPG angle"
    ),
    "toward-br": (
        "isometric low-top-down view, character facing toward the camera at the "
        "bottom-right of the frame, front three-quarter, Sea of Stars / SNES JRPG angle"
    ),
    "down": (
        "isometric low-top-down view, character facing toward the bottom of the frame "
        "(screen-down), front view, Sea of Stars / SNES JRPG angle"
    ),
    "toward-bl": (
        "isometric low-top-down view, character facing toward the camera at the "
        "bottom-left of the frame, front three-quarter, Sea of Stars / SNES JRPG angle"
    ),
    "left": (
        "isometric low-top-down view, character facing toward the left of the frame "
        "(screen-left), profile, Sea of Stars / SNES JRPG angle"
    ),
    "away-tl": (
        "isometric low-top-down view, character facing away from camera toward the "
        "top-left of the frame, back three-quarter, Sea of Stars / SNES JRPG angle"
    ),
}


def build_prompts(user_prompt: str, facing: str = "away-tr") -> tuple[str, str]:
    hint = FACING_HINTS.get(facing, FACING_HINTS["away-tr"])
    base = user_prompt.strip().rstrip(", ")
    # If the client already appended the hint, don't duplicate it.
    if hint[:40].lower() in base.lower():
        character = base
    else:
        character = f"{base}, {hint}"
    prompt = (
        f"{character}, full-body, chibi proportions, oversized head, "
        "short limbs, simple geometric shapes, flat colour regions, "
        "clean silhouette, white background, studio lighting, game-ready concept art, no scenery"
    )
    negative = (
        "blurry, photo, realistic skin pores, busy background, landscape, ground plane, "
        "multiple characters, text, watermark, cropped, close-up portrait only, "
        "extreme perspective, dark scene, orthographic front portrait"
    )
    return prompt, negative


def generate_concept(
    prompt: str,
    seed: int,
    out_png: Path,
    steps: int = 28,
    facing: str = "away-tr",
) -> Path:
    import torch
    from diffusers import StableDiffusionPipeline
    from rembg import remove
    from PIL import Image

    out_png.parent.mkdir(parents=True, exist_ok=True)
    full, negative = build_prompts(prompt, facing=facing)
    device = device_name()
    dtype = torch.float16 if device == "cuda" else torch.float32

    pipe = StableDiffusionPipeline.from_pretrained(
        "runwayml/stable-diffusion-v1-5",
        torch_dtype=dtype,
        safety_checker=None,
        requires_safety_checker=False,
    )
    pipe = pipe.to(device)
    if hasattr(pipe, "enable_attention_slicing"):
        pipe.enable_attention_slicing()

    generator = torch.Generator(device="cpu").manual_seed(int(seed))
    result = pipe(
        prompt=full,
        negative_prompt=negative,
        width=512,
        height=512,
        guidance_scale=7.5,
        num_inference_steps=steps,
        generator=generator,
    )
    img = result.images[0].convert("RGBA")
    # Free SD weights before TripoSR runs in-process helpers / subprocess.
    del pipe
    del result
    try:
        import gc

        gc.collect()
        if device == "mps":
            torch.mps.empty_cache()
        elif device == "cuda":
            torch.cuda.empty_cache()
    except Exception:
        pass

    # White plate + rembg → clean subject for TripoSR
    plate = Image.new("RGBA", img.size, (255, 255, 255, 255))
    plate.alpha_composite(img)
    cut = remove(plate.convert("RGBA"))
    # Composite back onto pure white so TripoSR gets a hard subject
    final = Image.new("RGBA", cut.size, (255, 255, 255, 255))
    final.alpha_composite(cut)
    final.convert("RGB").save(out_png)
    return out_png


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--prompt", required=True)
    parser.add_argument("--seed", type=int, default=0)
    parser.add_argument("--job", required=True, help="job id / output stem")
    parser.add_argument("--steps", type=int, default=28)
    parser.add_argument(
        "--facing",
        default="away-tr",
        choices=list(FACING_HINTS.keys()),
        help="Iso facing for concept prompt (default: away toward top-right)",
    )
    args = parser.parse_args()

    models = ROOT / "models"
    models.mkdir(parents=True, exist_ok=True)
    concept = models / f"{args.job}-concept.png"
    meta_path = models / f"{args.job}.json"

    print(json.dumps({"stage": "concept", "device": device_name(), "facing": args.facing}), flush=True)
    generate_concept(
        args.prompt,
        args.seed,
        concept,
        steps=args.steps,
        facing=args.facing,
    )

    # Reuse mesh_triposr via import from repo server package
    sys.path.insert(0, str(ROOT / "server"))
    from app.mesh_triposr import image_to_glb  # noqa: E402

    print(json.dumps({"stage": "mesh", "concept": str(concept)}), flush=True)
    glb = image_to_glb(concept, stem=args.job)
    meta = {
        "prompt": args.prompt,
        "seed": args.seed,
        "facing": args.facing,
        "concept": f"/api/models/{concept.name}",
        "model_url": f"/api/models/{glb.name}",
        "glb": str(glb),
    }
    meta_path.write_text(json.dumps(meta, indent=2))
    print(json.dumps({"stage": "done", **meta}), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
