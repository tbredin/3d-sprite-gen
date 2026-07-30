# Spike: improve AI pixel-art variations

**Branch:** `feature/pixel-art-ai-improve`  
**Date:** 2026-07-26  
**Goal:** Survey current open practices for SDXL / pixel-art generation and rank
concrete upgrades to our local variations pipeline
(`server/app/sprite_variations.py` + `variationPrompt.ts` + house LoRA).

This is research only — no pipeline code changes in this spike.

## Current stack (baseline)

| Piece | Ours today | Notes |
| --- | --- | --- |
| Base | SDXL 1.0 | Correct for `nerijs/pixel-art-xl` |
| Style LoRA | `nerijs/pixel-art-xl` @ 1.2 | Matches author tip (1.2) |
| House LoRA | `thenvpixel` @ 0.85 | Stacked under pixel adapter |
| Structure | ControlNet Canny SDXL | Always on; strength by freedom band |
| Mode | ControlNet **img2img** | Bake = spatial prior |
| VAE | `madebyollin/sdxl-vae-fp16-fix` | Matches pixel-art-xl “fixed VAE” tip |
| Gen res | 512² | Not the LoRA’s “8× downscale from 1024” path |
| Post | NN down → Lospec quantize → silhouette outline | Strong pixel cage |
| Freedom | polish / costume / soft denoise+CN mix | Tuned from lock rate (~5% keepers earlier) |

Pipeline sketch (unchanged):

```
pre-quantize bake → NN/Lanczos to 512 → Canny + img2img
  → restore alpha → fringe scrub → NN to N×N → palette → outline
```

## What we already get right

Web guidance for pixel SDXL converges on several practices we already ship:

1. **Dedicated pixel LoRA + fixed VAE** — pixel-art-xl card: fixed VAE, no
   refiner, weight ~1.2, light “pixel” language (we keep pixel cues light in
   `STYLE_GUIDELINES`).
2. **Nearest-neighbor downscale + palette lock after diffusion** — consensus
   across sprite tutorials and native pixel DDPMs; AI upscalers destroy grid.
3. **Hard alpha / fringe scrub** — mid-grey composite, matte erode, rim scrub
   address the usual SD halo problem on transparent sprites.
4. **Structure prior from 3D bake + ControlNet** — same pattern as
   “ControlNet for pose/silhouette, LoRA for charm” in sprite-sheet guides.
5. **Local / free only** — stays inside PROPOSAL constraints (no fal/Replicate).

Gaps below are relative to *that* baseline, not a greenfield rewrite.

## Findings → ranked opportunities

### P0 — High leverage, fits the existing stack

#### 1. Dual structure: Canny **+ depth** (multi-ControlNet)

**Why:** Canny alone locks *edges*. Soft shaded iso bakes have few strong
interior edges, so costume mode can still warp volume (fat limbs, lost
weapon thickness). Depth / soft-depth ControlNet is the standard fix for
“keep 3D layout, allow surface redesign.”

**Evidence:** SDXL best-practice guides list depth alongside canny; multi-CN
img2img (e.g. fofr LCM multi-controlnet) is a common sprite pattern; our own
bake already has depth/normal outline machinery
(`docs/SPIKE-depth-normal-edges.md`) that could feed a depth map without a
new 3D pass.

**Experiment:**

- Add `diffusers/controlnet-depth-sdxl-1.0` (or Zoe/Midas preprocessor on the
  same init RGB).
- Freedom bands: e.g. polish CN_canny 0.7 / CN_depth 0.55; costume 0.55 /
  0.45; soft 0.4 / 0.35 — keep **total** guidance from over-constraining.
- Metric: lock rate + “silhouette match” eyeball vs current canny-only.

**Risk:** ~2× ControlNet VRAM/time on MPS. Mitigate with LCM (P1) or
depth-only on soft/costume.

#### 2. IP-Adapter **style** from locked winners / `refs/own`

**Why:** LoRA encodes a *average* house look; IP-Adapter Plus (style-only)
pulls *this* reference’s stroke density, eye ticks, and colour blocking
without another full train. Community pattern: **IP-Adapter = style,
ControlNet = structure** (ICAS-style pipelines; Tencent IP-Adapter + CN
docs).

**Experiment:**

- Diffusers `IPAdapter` / XL Plus on a random locked timeline PNG or curated
  ref (same set as house LoRA).
- `ip_adapter_scale` 0.55–0.75; **never** 1.0 with CN at 1.0.
- Optional: idle-reroll already uses locked images as *init* — also feed one
  as IP style while structure stays on the live bake canny/depth.

**Risk:** Style bleed into pose if scale too high; extra CLIP vision weights.

#### 3. Respect pixel-art-xl’s **8× NN** recipe (optional HQ path)

**Why:** Author tip: generate so that NN downscale by **8×** lands on the
pixel grid (classically 1024 → 128, or 512 → 64). We always gen at 512 and
NN to 32–64 (8×–16×). For **32px** cells that is 16× — aggressive; charm
details may never land on the grid cleanly before quantize.

**Experiment:**

- When `size == 64`: keep 512 (8×). When `size == 32`: either gen **256**
  (8×) *or* gen 512 and NN to 64 intermediate then to 32 with a sharpen /
  “pixel snap” pass — A/B lock rate.
- Roadmap already lists 1024 HQ; couple it explicitly to `size` so
  `GEN_SIZE = size * 8` (clamped).

**Risk:** 1024 on MPS is slow/memory-heavy; gate behind “HQ” toggle.

### P1 — Speed / iteration quality

#### 4. LCM-LoRA for Play stream

**Why:** Official pixel-art-xl card documents stacking
`latent-consistency/lcm-lora-sdxl` + pixel LoRA (weights 1.0 / 1.2),
8 steps, CFG ~1.5. HF Diffusers confirms LCM + ControlNet. Our Play loop
runs 3 concurrent jobs at ~30 steps — LCM could cut latency ~3–4× for
exploration, keep full steps for “final” / locked polish.

**Experiment:**

- Optional `fast` mode: LCMScheduler, steps 6–8, guidance 1.2–2.0, same CN.
- Keep current defaults for polish freedom or when user raises Steps slider.

**Risk:** Quality drop on fine face ticks; measure lock rate separately for
fast vs quality.

#### 5. Prompt hygiene vs pixel-art-xl tips

**Why:** Card: *“No style prompt required / no trigger keyword required”*
for the public LoRA — heavy JRPG name-dropping can fight the adapter. Our
house trigger `thenvpixel` **should** stay (house LoRA needs it). Public
pixel LoRA may prefer shorter prompts: subject + camera + palette size,
less “Sea of Stars / Lufia II / Breath of Fire” laundry list.

**Experiment:**

- A/B: current `STYLE_GUIDELINES` vs minimal
  (`thenvpixel, pixel, isometric chibi sprite, plain backdrop, N×N, palette`).
- Keep character bits + steer; shorten era references.

### P2 — Structure / charm experiments

#### 6. SoftEdge / Lineart instead of (or blended with) Canny

**Why:** SoftEdge (HED/Pidi) and anime lineart CN are recommended when the
source is shaded illustration / 3D toon rather than hard CAD edges. Canny
on a soft iso bake can be sparse or noisy (thresholds 100/200 in
`_canny_image`).

**Experiment:** Swap preprocessor only (same `controlnet-canny-sdxl` is
often trained with lineart mix — xinsir notes canny mixed with lineart).
Or trial `xinsir/controlnet-union-sdxl-1.0` thin-line mode if Diffusers
wiring is acceptable.

**Risk:** Union models are heavier and less “drop-in” than
`diffusers/controlnet-canny-sdxl-1.0`.

#### 7. Tile ControlNet for polish-only

**Why:** Tile CN preserves local colour/texture while allowing detail
invention — closer to “finish pass” than edge lock. Good for **polish**
band (low denoise) where we want charm without silhouette lottery.

**Experiment:** Freedom `polish` → Tile @ ~0.6 + low denoise; costume/soft
keep Canny/depth.

#### 8. Palette-aware training / loss (research horizon)

**Why:** Recent work (PixDiff-PIG; DDPM pixelart with palette loss +
post-step soft quantize) shows **discrete palette as a first-class
training signal**, not only post-process. Our house LoRA trains on curated
PNGs that may already be palette-limited — make that explicit:

- Quantize train refs to Endesga-64 (or active slug) before Kohya/Diffusers.
- Caption with palette name + `thenvpixel`.
- Longer term: SNR-gated palette loss is research-grade; not v1.

### P3 — Defer / avoid for now

| Idea | Verdict |
| --- | --- |
| Switch base to Flux / Z-Image Turbo pixel LoRAs | Breaks SDXL ControlNet + house LoRA; revisit only if charm plateaus |
| Native 16×16 DDPM sprite models | Wrong res / no bake conditioning |
| SDXL refiner | pixel-art-xl: don’t use |
| Cloud APIs | Forbidden by PROPOSAL |
| Raising denoise on soft again | Already burned lock rate; prefer better conditioning over more noise |
| CFG > ~8 with pixel LoRA | Guides suggest 5–7 for SDXL; we default 7 — don’t push higher for “more pixel” |

## Suggested experiment order

1. **Prompt A/B** (cheap) — shorten style sentence; keep house trigger.
2. **GEN_SIZE = f(size)** for 32 vs 64 — measure grid snap before quantize.
3. **LCM fast mode** — unblock Play iteration while testing (1)/(2).
4. **Depth ControlNet** (or bake depth export) — biggest structure win.
5. **IP-Adapter from locked / refs** — biggest style win without retrain.
6. **Retune freedom table** once (4)+(5) land — current 0.78/0.38 etc. may
   be compensating for weak conditioning.
7. **House LoRA retrain** on palette-quantized keepers only after lock rate
   improves (avoid encoding muddy failures — same rule as original spike).

## Success metrics

Reuse the timeline as the lab:

| Metric | How |
| --- | --- |
| Lock rate | locked / generated over a fixed Play session (~100 gens) |
| Silhouette fidelity | side-by-side bake vs variation (binary keep/reject) |
| Charm | subjective: eyes, costume ticks, outline rhythm |
| Latency | p50 `elapsed_s` in variation meta (esp. LCM vs full) |

Target: lift lock rate well above the earlier ~5% costume/soft era without
sacrificing costume diversity (don’t solve by forcing polish-only).

## Key sources

- [nerijs/pixel-art-xl](https://huggingface.co/nerijs/pixel-art-xl) — VAE, 8× NN, LCM stack, LoRA weight 1.2
- [HF: inference with LCM-LoRA](https://huggingface.co/docs/diffusers/main/using-diffusers/inference_with_lcm_lora) — ControlNet + few-step
- [latent-consistency/lcm-lora-sdxl](https://huggingface.co/latent-consistency/lcm-lora-sdxl)
- [xinsir/controlnet-union-sdxl-1.0](https://huggingface.co/xinsir/controlnet-union-sdxl-1.0) / ControlNetPlus — multi-condition CN
- IP-Adapter + ControlNet pattern (Tencent IP-Adapter docs; style vs structure split)
- PixDiff-PIG (palette-informed diffusion, 2026) — palette as training signal
- Internal: `docs/SPIKE-ai-sprite-variations.md`, `sprite_variations.py`, `house_lora.py`

## Non-goals (this spike)

- Implementing any of the P0–P2 experiments
- Opening a PR / merging to main (land separately after review)
- Changing freedom weights or UI knobs without an A/B pass
