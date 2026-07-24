"""SDXL house-style LoRA training on curated iso sprites.

Trains a UNet LoRA for ``stabilityai/stable-diffusion-xl-base-1.0`` so this
app can load it alongside ``nerijs/pixel-art-xl``. Dataset defaults to
``~/Sites/curated-iso`` (or ``refs/own`` / ``HOUSE_LORA_REFS``).
"""

from __future__ import annotations

import json
import os
import shutil
import threading
import time
from pathlib import Path
from typing import Any, Callable, Optional

ROOT = Path(__file__).resolve().parents[2]
MODELS_DIR = ROOT / "models"
HOUSE_LORA = MODELS_DIR / "house-style-sdxl.safetensors"
HOUSE_LORA_DIR = MODELS_DIR / "house-style-sdxl-lora"
LORA_META = MODELS_DIR / "house-style-sdxl.meta.json"

BASE_MODEL = "stabilityai/stable-diffusion-xl-base-1.0"
VAE_MODEL = "madebyollin/sdxl-vae-fp16-fix"
TRIGGER = "thenvpixel"
TRAIN_SIZE = 512
DEFAULT_STEPS = 500
MIN_REFS = 3

_lock = threading.Lock()
_state: dict[str, Any] = {
    "state": "missing",  # missing | ready | dirty | training | error
    "message": "No SDXL house LoRA yet.",
    "progress": 0.0,
    "refs_count": 0,
    "train_count": 0,
    "step": 0,
    "max_steps": 0,
    "last_error": None,
    "lora_exists": False,
    "dirty": False,
    "trigger": TRIGGER,
    "refs_dir": None,
    "base_model": BASE_MODEL,
}


def refs_dir() -> Path:
    env = os.environ.get("HOUSE_LORA_REFS", "").strip()
    if env:
        return Path(env).expanduser().resolve()
    linked = ROOT / "refs" / "own"
    if linked.exists():
        return linked.resolve()
    curated = Path.home() / "Sites" / "curated-iso"
    if curated.is_dir():
        return curated.resolve()
    return linked


def _train_pngs() -> list[Path]:
    folder = refs_dir()
    if not folder.is_dir():
        return []
    return sorted(
        p
        for p in folder.iterdir()
        if p.is_file()
        and p.suffix.lower() in {".png", ".webp"}
        and not p.name.startswith(".")
        and "-study-" not in p.name.lower()
    )


def _max_refs_mtime(files: list[Path]) -> float:
    """Newest mtime across train PNGs and their caption sidecars."""
    if not files:
        return 0.0
    times: list[float] = []
    for p in files:
        times.append(p.stat().st_mtime)
        side = p.with_suffix(".txt")
        if side.is_file():
            times.append(side.stat().st_mtime)
    return max(times)


def _lora_files_exist() -> bool:
    if HOUSE_LORA.exists():
        return True
    return HOUSE_LORA_DIR.exists() and any(HOUSE_LORA_DIR.glob("*.safetensors"))


def _lora_mtime() -> float:
    times: list[float] = []
    if HOUSE_LORA.exists():
        times.append(HOUSE_LORA.stat().st_mtime)
    if HOUSE_LORA_DIR.exists():
        times.extend(p.stat().st_mtime for p in HOUSE_LORA_DIR.glob("*.safetensors"))
    return max(times) if times else 0.0


def house_lora_path() -> Optional[Path]:
    """Path suitable for ``pipe.load_lora_weights``."""
    if HOUSE_LORA.exists():
        return HOUSE_LORA
    if HOUSE_LORA_DIR.exists():
        weights = sorted(HOUSE_LORA_DIR.glob("*.safetensors"))
        if weights:
            return HOUSE_LORA_DIR
    return None


def refresh_status() -> dict[str, Any]:
    with _lock:
        if _state["state"] == "training":
            return dict(_state)

        files = _train_pngs()
        folder = refs_dir()
        _state["refs_dir"] = str(folder)
        _state["refs_count"] = len(files)
        _state["train_count"] = len(files)
        _state["trigger"] = TRIGGER
        exists = _lora_files_exist()
        _state["lora_exists"] = exists

        if not exists:
            _state["state"] = "missing"
            _state["dirty"] = len(files) > 0
            _state["progress"] = 0.0
            _state["message"] = (
                f"No SDXL house LoRA yet. {len(files)} frame(s) in {folder}."
                if files
                else f"Add sprites to {folder} (or set HOUSE_LORA_REFS), then rebuild."
            )
            return dict(_state)

        dirty = bool(files) and _max_refs_mtime(files) > _lora_mtime() + 0.5
        if LORA_META.exists() and files:
            try:
                meta = json.loads(LORA_META.read_text())
                prev = set(meta.get("refs") or [])
                cur = {p.name for p in files}
                if prev != cur:
                    dirty = True
            except (json.JSONDecodeError, TypeError, ValueError):
                pass

        _state["dirty"] = dirty
        if dirty:
            _state["state"] = "dirty"
            _state["message"] = (
                f"SDXL house LoRA outdated — {len(files)} frame(s) changed. Rebuild."
            )
        else:
            _state["state"] = "ready"
            _state["progress"] = 1.0
            _state["message"] = f"SDXL house LoRA ready ({len(files)} frames)."
        return dict(_state)


def mark_refs_changed() -> None:
    """Caption / ref edits — mark LoRA dirty unless a train is running."""
    with _lock:
        if _state["state"] == "training":
            return
        _state["dirty"] = True
        if _lora_files_exist():
            _state["state"] = "dirty"
            _state["message"] = "Captions or refs changed — rebuild LoRA to apply."
        else:
            _state["state"] = "missing"
            _state["message"] = "Refs ready — rebuild LoRA to create house style."


def start_rebuild(max_steps: int = DEFAULT_STEPS) -> dict[str, Any]:
    files = _train_pngs()
    if len(files) < MIN_REFS:
        raise ValueError(
            f"Need at least {MIN_REFS} frames in {refs_dir()} (have {len(files)})."
        )

    with _lock:
        if _state["state"] == "training":
            raise RuntimeError("Rebuild already in progress.")
        _state.update(
            {
                "state": "training",
                "message": "Starting SDXL house LoRA rebuild…",
                "progress": 0.0,
                "step": 0,
                "max_steps": max_steps,
                "last_error": None,
                "refs_count": len(files),
                "train_count": len(files),
                "refs_dir": str(refs_dir()),
                "dirty": True,
            }
        )
        snapshot = dict(_state)

    thread = threading.Thread(
        target=_train_worker,
        kwargs={"files": files, "max_steps": max_steps},
        daemon=True,
        name="house-lora-sdxl",
    )
    thread.start()
    return snapshot


def _set_progress(step: int, max_steps: int, message: str) -> None:
    with _lock:
        _state["step"] = step
        _state["max_steps"] = max_steps
        _state["progress"] = min(1.0, step / max(max_steps, 1))
        _state["message"] = message
        _state["state"] = "training"


def _train_worker(files: list[Path], max_steps: int) -> None:
    try:
        from . import sprite_variations as variations

        _set_progress(0, max_steps, "Unloading variation pipeline…")
        variations.unload_pipeline()

        _set_progress(0, max_steps, f"Training SDXL LoRA on {len(files)} frames…")
        train_house_lora(files=files, max_steps=max_steps, progress_cb=_set_progress)

        from .captions import load_ref_caption

        meta = {
            "trigger": TRIGGER,
            "base_model": BASE_MODEL,
            "vae": VAE_MODEL,
            "refs_count": len(files),
            "train_count": len(files),
            "train_size": TRAIN_SIZE,
            "captioning": "per-filename",
            "refs_dir": str(refs_dir()),
            "refs": [p.name for p in files],
            "sample_captions": {
                p.name: load_ref_caption(p, TRIGGER) for p in files[:8]
            },
            "steps": max_steps,
            "trained_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
        MODELS_DIR.mkdir(parents=True, exist_ok=True)
        LORA_META.write_text(json.dumps(meta, indent=2))

        with _lock:
            _state.update(
                {
                    "state": "ready",
                    "dirty": False,
                    "lora_exists": True,
                    "progress": 1.0,
                    "message": f"Rebuild complete — SDXL house LoRA ready ({len(files)} frames).",
                    "last_error": None,
                }
            )
    except Exception as exc:  # noqa: BLE001
        with _lock:
            _state.update(
                {
                    "state": "error",
                    "message": f"Rebuild failed: {exc}",
                    "last_error": str(exc),
                    "dirty": True,
                }
            )


def _max_image_size(paths: list[Path]) -> tuple[int, int]:
    from PIL import Image

    max_w = max_h = 1
    for path in paths:
        with Image.open(path) as im:
            max_w = max(max_w, im.width)
            max_h = max(max_h, im.height)
    return max_w, max_h


def _pad_to_size(img: Any, width: int, height: int) -> Any:
    from PIL import Image

    sprite = img.convert("RGBA")
    if sprite.size == (width, height):
        return sprite
    canvas = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    x = (width - sprite.width) // 2
    y = (height - sprite.height) // 2
    canvas.paste(sprite, (x, y), sprite)
    return canvas


def _composite_on_canvas(
    init: Any,
    size: int,
    *,
    pad_size: tuple[int, int],
    fill: float = 0.7,
) -> Any:
    """Place sprite on mid-grey (matches variation init backdrop)."""
    from PIL import Image

    sprite = _pad_to_size(init.convert("RGBA"), pad_size[0], pad_size[1])
    # Match sprite_variations._INIT_BG mid-grey so train/infer agree.
    canvas = Image.new("RGB", (size, size), (128, 128, 128))
    target = max(1, int(size * fill))
    sw, sh = sprite.size
    scale = min(target / max(sw, 1), target / max(sh, 1))
    nw = max(1, int(round(sw * scale)))
    nh = max(1, int(round(sh * scale)))
    resized = sprite.resize((nw, nh), Image.Resampling.NEAREST)
    x = (size - nw) // 2
    y = (size - nh) // 2
    canvas.paste(resized, (x, y), resized)
    return canvas


def _encode_prompt(
    text_encoders: list[Any],
    tokenizers: list[Any],
    prompt: str,
    device: str,
) -> tuple[Any, Any]:
    import torch

    prompt_embeds_list = []
    pooled_prompt_embeds = None
    for tokenizer, text_encoder in zip(tokenizers, text_encoders):
        text_inputs = tokenizer(
            prompt,
            padding="max_length",
            max_length=tokenizer.model_max_length,
            truncation=True,
            return_tensors="pt",
        )
        prompt_embeds = text_encoder(
            text_inputs.input_ids.to(device),
            output_hidden_states=True,
            return_dict=False,
        )
        pooled_prompt_embeds = prompt_embeds[0]
        prompt_embeds = prompt_embeds[-1][-2]
        bs_embed, seq_len, _ = prompt_embeds.shape
        prompt_embeds = prompt_embeds.view(bs_embed, seq_len, -1)
        prompt_embeds_list.append(prompt_embeds)

    prompt_embeds = torch.concat(prompt_embeds_list, dim=-1)
    assert pooled_prompt_embeds is not None
    pooled_prompt_embeds = pooled_prompt_embeds.view(bs_embed, -1)
    return prompt_embeds, pooled_prompt_embeds


def train_house_lora(
    files: list[Path],
    max_steps: int = DEFAULT_STEPS,
    progress_cb: Optional[Callable[[int, int, str], None]] = None,
) -> Path:
    """Train a small SDXL UNet LoRA on curated frames."""
    import numpy as np
    import torch
    import torch.nn.functional as F
    from diffusers import AutoencoderKL, DDPMScheduler, UNet2DConditionModel
    from diffusers.optimization import get_scheduler
    from diffusers.utils import convert_state_dict_to_diffusers
    from peft import LoraConfig
    from peft.utils import get_peft_model_state_dict
    from PIL import Image
    from safetensors.torch import save_file
    from torch.utils.data import DataLoader, Dataset
    from transformers import CLIPTextModel, CLIPTextModelWithProjection, CLIPTokenizer

    from .captions import load_ref_caption
    from .sprite_variations import device_name

    device = device_name()
    dtype = torch.float32  # MPS-safe
    pad_size = _max_image_size(files)

    class RefDataset(Dataset):
        def __init__(self, paths: list[Path], pad: tuple[int, int], size: int):
            self.paths = paths
            self.pad = pad
            self.size = size
            self.captions = [load_ref_caption(p, TRIGGER) for p in paths]

        def __len__(self) -> int:
            return len(self.paths)

        def __getitem__(self, idx: int) -> dict:
            path = self.paths[idx % len(self.paths)]
            caption = self.captions[idx % len(self.captions)]
            img = Image.open(path).convert("RGBA")
            canvas = _composite_on_canvas(img, self.size, pad_size=self.pad)
            arr = np.array(canvas).astype("float32") / 255.0
            arr = (arr * 2.0) - 1.0
            tensor = torch.from_numpy(arr).permute(2, 0, 1)
            return {"pixel_values": tensor, "caption": caption}

    if progress_cb:
        progress_cb(0, max_steps, "Loading SDXL tokenizer / text encoders…")

    tokenizer_one = CLIPTokenizer.from_pretrained(BASE_MODEL, subfolder="tokenizer")
    tokenizer_two = CLIPTokenizer.from_pretrained(BASE_MODEL, subfolder="tokenizer_2")
    text_encoder_one = CLIPTextModel.from_pretrained(
        BASE_MODEL, subfolder="text_encoder"
    ).to(device, dtype)
    text_encoder_two = CLIPTextModelWithProjection.from_pretrained(
        BASE_MODEL, subfolder="text_encoder_2"
    ).to(device, dtype)
    text_encoder_one.requires_grad_(False)
    text_encoder_two.requires_grad_(False)
    text_encoder_one.eval()
    text_encoder_two.eval()

    if progress_cb:
        progress_cb(0, max_steps, "Loading SDXL VAE + UNet…")

    vae = AutoencoderKL.from_pretrained(VAE_MODEL, torch_dtype=dtype).to(device, dtype)
    unet = UNet2DConditionModel.from_pretrained(BASE_MODEL, subfolder="unet").to(
        device, dtype
    )
    vae.requires_grad_(False)
    unet.requires_grad_(False)
    vae.eval()

    lora_config = LoraConfig(
        r=8,
        lora_alpha=16,
        init_lora_weights="gaussian",
        target_modules=["to_k", "to_q", "to_v", "to_out.0"],
    )
    unet.add_adapter(lora_config)
    unet.train()

    noise_scheduler = DDPMScheduler.from_pretrained(BASE_MODEL, subfolder="scheduler")
    dataset = RefDataset(files, pad=pad_size, size=TRAIN_SIZE)
    loader = DataLoader(dataset, batch_size=1, shuffle=True)

    # Precompute captions → embeds (text encoders stay frozen).
    if progress_cb:
        progress_cb(0, max_steps, "Encoding captions…")
    caption_cache: dict[str, tuple[torch.Tensor, torch.Tensor]] = {}
    with torch.no_grad():
        for cap in dict.fromkeys(dataset.captions):
            pe, ppe = _encode_prompt(
                [text_encoder_one, text_encoder_two],
                [tokenizer_one, tokenizer_two],
                cap,
                device,
            )
            caption_cache[cap] = (pe.detach(), ppe.detach())

    # Free text encoders before the train loop (MPS memory).
    del text_encoder_one, text_encoder_two, tokenizer_one, tokenizer_two
    if device == "mps":
        torch.mps.empty_cache()

    params = [p for p in unet.parameters() if p.requires_grad]
    optimizer = torch.optim.AdamW(params, lr=1e-4)
    lr_scheduler = get_scheduler(
        "cosine",
        optimizer=optimizer,
        num_warmup_steps=20,
        num_training_steps=max_steps,
    )

    add_time_ids = torch.tensor(
        [[TRAIN_SIZE, TRAIN_SIZE, 0, 0, TRAIN_SIZE, TRAIN_SIZE]],
        device=device,
        dtype=dtype,
    )

    step = 0
    data_iter = iter(loader)
    while step < max_steps:
        try:
            batch = next(data_iter)
        except StopIteration:
            data_iter = iter(loader)
            batch = next(data_iter)

        pixel_values = batch["pixel_values"].to(device=device, dtype=dtype)
        caption = batch["caption"][0]
        prompt_embeds, pooled = caption_cache[caption]
        prompt_embeds = prompt_embeds.to(device=device, dtype=dtype)
        pooled = pooled.to(device=device, dtype=dtype)

        with torch.no_grad():
            latents = vae.encode(pixel_values).latent_dist.sample()
            latents = latents * vae.config.scaling_factor

        noise = torch.randn_like(latents)
        timesteps = torch.randint(
            0,
            noise_scheduler.config.num_train_timesteps,
            (latents.shape[0],),
            device=device,
        ).long()
        noisy = noise_scheduler.add_noise(latents, noise, timesteps)

        model_pred = unet(
            noisy,
            timesteps,
            prompt_embeds,
            added_cond_kwargs={
                "time_ids": add_time_ids.repeat(latents.shape[0], 1),
                "text_embeds": pooled,
            },
            return_dict=False,
        )[0]

        if noise_scheduler.config.prediction_type == "epsilon":
            target = noise
        elif noise_scheduler.config.prediction_type == "v_prediction":
            target = noise_scheduler.get_velocity(latents, noise, timesteps)
        else:
            raise ValueError(
                f"Unknown prediction type {noise_scheduler.config.prediction_type}"
            )

        loss = F.mse_loss(model_pred.float(), target.float(), reduction="mean")
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()
        lr_scheduler.step()

        step += 1
        if progress_cb and (step % 5 == 0 or step == max_steps):
            progress_cb(
                step,
                max_steps,
                f"Training step {step}/{max_steps} (loss {loss.item():.4f})",
            )

    if progress_cb:
        progress_cb(max_steps, max_steps, "Saving SDXL house LoRA…")

    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    from diffusers import StableDiffusionXLPipeline

    unet_lora_state = convert_state_dict_to_diffusers(get_peft_model_state_dict(unet))

    if HOUSE_LORA_DIR.exists():
        shutil.rmtree(HOUSE_LORA_DIR)
    HOUSE_LORA_DIR.mkdir(parents=True, exist_ok=True)

    StableDiffusionXLPipeline.save_lora_weights(
        save_directory=str(HOUSE_LORA_DIR),
        unet_lora_layers=unet_lora_state,
        safe_serialization=True,
    )

    # Flat single-file copy for easy load_lora_weights(path_to_file).
    weights = sorted(HOUSE_LORA_DIR.glob("*.safetensors"))
    if weights:
        shutil.copy2(weights[0], HOUSE_LORA)
    else:
        save_file(unet_lora_state, str(HOUSE_LORA))

    del unet, vae, optimizer, caption_cache
    if device == "mps":
        torch.mps.empty_cache()
    elif device == "cuda":
        torch.cuda.empty_cache()

    return HOUSE_LORA
