# Spike: AI sprite variations timeline

**Branch:** `feature/ai-sprite-variations`  
**Goal:** Add a third UI surface — a full-width **timeline** under Character | Bake — that streams local AI “finish passes” from the procedural iso bake into charming, palette-locked retro sprites.

## Problem

Pure txt2img produced loosely identifiable silhouettes with **no charm**.  
Pure 3D primitives bake readable pose/silhouette but miss **pixel-authored polish** (eyes, costume ticks, outline rhythm).

We need the bake as a **strong spatial prior** and diffusion + a pixel LoRA as the **charm layer**, then force the same Lospec palette cage the engine already uses.

## Non-goals (v1)

- Paid / cloud generation APIs
- Custom LoRA **training** (download public weights only)
- Local LLM prompt rewriting (template + optional steer only)
- Browser WebGPU inference
- Replacing the Character or Bake panels
- 1024² “HQ” mode (roadmap)

## Decisions (grilled)

| Topic | Decision |
| --- | --- |
| Meaning of “variation” | Finish a rough 3D pose into a more finished retro sprite (charm), not random costume lottery alone |
| Freedom band | Polish + Costume + Soft redesign — exposed as a **weighted mix** in the stream (mostly Costume), **no strength knobs** in UI |
| Prompt | Hybrid: deterministic template from character state + optional steer text; **no LLM in v1** |
| Palette | One page-level Lospec slug dropdown; **bake and AI both quantize** to it (same source pattern as `../iso-sprite-gen`) |
| AI conditioning image | **Pre-quantize** iso render (before palette crush / outline) |
| Structure lock | **ControlNet Canny always on**; hidden strengths vary per job |
| Stack | **SDXL + `nerijs/pixel-art-xl` + ControlNet** via Diffusers on FastAPI (MPS/CUDA). Closest open “retro pixel” standard |
| Gen resolution | **512²** for Play stream; optional 1024 HQ later |
| Post | NN downscale → palette quantize → **re-apply 1px silhouette outline** |
| Layout | Character \| Bake on top; **full-width timeline** below |
| Stream UX | Play/Pause; **3 concurrent** jobs; each completion queues the next while playing |
| Live updates | New jobs use **latest** pre-quantize + palette + steer |
| Pause | Enter **idle reroll** if locked timeline images exist: keep generating from random locked images instead of the live 3D bake; Play resumes live-bake sources; idle stops after 60 minutes |
| Timeline tile | Download PNG + **Lock** (survives clear) |
| Clear | Deletes **unlocked only** (on disk + UI) |
| Training | **Not v1.** Revisit after ~20–40 locked “good” gens if house style still drifts |

### Freedom weighting (hidden)

| Mode | Approx share | ControlNet strength | img2img denoise |
| --- | --- | --- | --- |
| Polish | ~20% | high (~0.85–0.95) | low (~0.30–0.40) |
| Costume | ~60% | mid (~0.65–0.80) | mid (~0.45–0.55) |
| Soft | ~20% | lower (~0.40–0.55) | higher (~0.60–0.70) |

### Why not train first?

Training (Kohya / Diffusers LoRA) is free and local, but needs a **curated** target set. Training on failed AI or muddy 32px bakes encodes failure. v1 downloads SDXL + pixel-art-xl + ControlNet; train a house LoRA only after the timeline has locked winners.

## Pipeline

```
pre-quantize bake PNG (size×size, RGBA)
        │
        ▼
NN upscale → 512×512
        │
        ├─► Canny edges ──► ControlNet
        │
        └─► img2img init ─► SDXL + pixel-art-xl + prompt/steer
                                │
                                ▼
                    NN downscale → size×size
                                │
                                ▼
                    Lospec nearest-colour quantize
                                │
                                ▼
                    1px silhouette outline (palette-safe)
                                │
                                ▼
                    generations/variations/{id}.png + meta.json
```

## UI

- **Palette slug** control shared by bake + AI (default `endesga-64`; Lospec fetch + cache for other slugs).
- Timeline panel: Play ⇄ Pause, Clear unlocked, scrollable grid of results.
- Steer text field (optional) in the timeline header.
- Each tile: pixel preview, mode tag (polish/costume/soft), lock toggle, download.

## API (FastAPI)

| Method | Path | Role |
| --- | --- | --- |
| GET | `/api/palette/{slug}` | Bundled or Lospec-fetched palette JSON |
| GET | `/api/variations/status` | Model load readiness / device |
| POST | `/api/variations/generate` | One job (source PNG + params) → saved gen |
| GET | `/api/variations` | List gens (newest first) |
| POST | `/api/variations/{id}/lock` | Toggle lock |
| DELETE | `/api/variations/clear` | Remove unlocked from disk |
| DELETE | `/api/variations/{id}` | Delete one (if unlocked) |
| GET | `/api/variations/{id}/image` | PNG bytes |

Client owns the Play loop (concurrency 3); server is stateless per job aside from disk.

## Dependencies (local, free)

Base API (`server/requirements.txt`) now includes `httpx` for Lospec fetch.

Optional ML extras — install into the project venv used by `npm run dev:server`
(primary checkout `.venv`):

```bash
# from primary repo root (or any checkout that shares the venv)
.venv/bin/pip install -r server/requirements-variations.txt
```

First Play downloads SDXL / ControlNet / LoRA into the Hugging Face cache ($0).

## Verification

1. Pick palette `endesga-64`; confirm bake snaps to it.
2. Confirm pre-quantize callback updates while rotating the character.
3. Hit Play — up to 3 jobs in flight; tiles appear as they finish.
4. Change pose mid-stream — later tiles follow the new bake.
5. Lock a favorite, then Pause — new jobs keep streaming from random locked images rather than the live 3D bake.
6. Hit Play again — later jobs resume using the current live 3D bake.
7. Clear — locked remains; unlocked gone from disk.
8. Download a tile — PNG is `size×size`, palette-locked, outlined.
9. If models missing — status shows not ready; UI explains install (no crash).

## Roadmap

- Local LLM prompt polish
- 1024 HQ generate mode
- House style LoRA trained on locked timeline winners
- Optional part-seam outlines on AI results (v1 = silhouette only)
