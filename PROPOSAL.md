# Proposal: 3D → Isometric Pixel Sprite Generator

**Status:** research / proposal (amended)  
**Date:** 2026-07-14  
**Related project:** [`../iso-sprite-gen`](../iso-sprite-gen) (local SD1.5 + LoRA on Apple M4 Pro — style targets still apply)

## Goal

Produce **SNES-era isometric chibi character sprites** from a text prompt by:

1. Generating a **simple low-poly 3D character** on a **local, free** model stack
2. Framing it with a **fixed isometric / low-top-down camera** (Sea of Stars / Lufia II / Breath of Fire DNA — character facing away / toward the top-right)
3. Rendering with **toon lighting** and **low-res pixelation + palette lock**
4. Exporting a **transparent PNG** (MVP: single frame; later: spritesheet / animation)

Frontend stack preference: **React + Vite** (plus React Three Fiber for WebGL).

---

## Hard constraint: free + local only (strict)

**No paid services — period.** Generation must support rapid free iteration. Credit-metered or subscription tools kill that loop.

| Allowed | Forbidden |
| --- | --- |
| Open-weight models run on this machine | Per-generation SaaS APIs / credit metering (Meshy, Tripo cloud, fal, Replicate, Rodin, …) |
| Reusing `iso-sprite-gen`’s local Diffusers server | Paid bake apps as *product* dependencies (SpriteEx, PixlyBakery, PixelOver, …) |
| Hugging Face **weight downloads** (one-time, free) | Cloud GPU rentals as a product dependency |
| Free OSS tools (TripoSR, GodotPixelRenderer, MagicaVoxel, Spotvox) as optional Labs | Any pay-to-export or pay-per-gen step in the happy path |

Electricity / hardware we already own is fine. “Free” means **$0 per sprite gen**, including zero paid tooling in the critical path. Paid desktop bakers may be mentioned only as *feature references* (what knobs to copy), never as required installs.

---

## Why leave pure 2D image generation?

`iso-sprite-gen` already solves “prompt → pixel PNG” with local SD + LoRA. The pain is consistency: face/silhouette drift, weak 3⁄4 lock, and expensive iteration when you need many poses per character.

A **shared 3D mesh + locked camera** gives:

| Strength | Why it matters |
| --- | --- |
| Pose / angle consistency | Same model, same camera → stable facing for every still |
| Future animation for free | Idle / walk / attack once the model is rigged |
| Controllable silhouette | Geometry + lighting are editable; not a black-box latent |
| Readable chibi at 32–64px | Designed silhouette beats high-frequency AI noise |

Risk: local AI meshes often look “modern low-poly,” not SNES. The **render stack** (toon + pixelate + palette) is what sells the era — not the mesh alone.

---

## Research finding: there is no one “pixel-art 3D lib”

Nothing turnkey does **prompt → low-poly chibi → SNES isometric PNG** end-to-end.

What exists are **composable layers** (all free / local):

```
[Local prompt → concept image]   ← reuse iso-sprite-gen Diffusers (optional)
        ↓
[Local image → GLB]              ← TripoSR / Hunyuan3D / InstantMesh / …
        ↓
[Three.js / R3F scene]
  Orthographic isometric camera
  MeshToonMaterial / cel shading
  Soft directional light
        ↓
[Pixel / retro post-process]
  Low-res buffer + nearest upscale
  Optional outline edges
  Colour quantise / Lospec palette
        ↓
[Canvas capture] → transparent PNG / spritesheet
```

Libraries that sound related but are **wrong-fit** for this MVP:

| Library | What it actually is | Fit |
| --- | --- | --- |
| [@spearwolf/twopoint5d](https://github.com/spearwolf/twopoint5d) | Fast **2D sprites in 3D** (billboards, atlases) | Wrong direction — we need 3D→2D bake |
| [thr2pxl](https://github.com/d3p1/thr2pxl) | Mesh → animated **particle** pixels | Art demo, not game sprite bake |
| [@jolly-pixel/voxel.renderer](https://www.npmjs.com/package/@jolly-pixel/voxel.renderer) | Chunked voxel worlds | Useful later if we go voxel-native, not MVP |

---

## Option A — WebGL render stack (recommended MVP core)

React Three Fiber owns the scene; pixel look is post-process + materials. **This stage is free/local by definition** (browser WebGL).

### A1. Three.js `RenderPixelatedPass` (built-in)

- Docs: [RenderPixelatedPass](https://threejs.org/docs/pages/RenderPixelatedPass.html)
- Official example uses an **OrthographicCamera** and configurable `pixelSize`
- Optional depth/normal **edge outlines** (helps SNES readability)
- Proven, maintained, zero extra dependency beyond `three`

**Pros:** Official, stable, iso-friendly.  
**Cons:** Pixelation only — no palette quantisation; we still need a palette pass or canvas post.

### A2. [`three-retropass`](https://github.com/mesmotronic/three-retropass) (RetroPass)

- Pixelation + **colour count / custom palette** + dithering
- Works with Three `EffectComposer` (WebGL and WebGPU paths)

**Pros:** Closest npm package to “make this look like a retro game.” Natural home for an **ENDESGA-64 / Lospec** lock (same idea as `iso-sprite-gen`).  
**Cons:** Small / younger project; verify API stability and R3F wiring.

### A3. DIY low-res render target + `NearestFilter`

Classic approach: render scene into e.g. 64×64 / 96×96 `WebGLRenderTarget` with nearest filtering, upscale for preview, blit for download.

**Pros:** Maximum control, transparent PNG capture is trivial, no addon risk.  
**Cons:** We own palette + outline shaders ourselves.

### A4. Toon / cel shading (essential for SNES, not optional garnish)

- Built-in [`MeshToonMaterial`](https://threejs.org/docs/pages/MeshToonMaterial.html) + small `gradientMap` with `NearestFilter` (2–4 shade bands)
- Essays / recipes: [PS1-style Three.js](https://romanliutikov.com/blog/ps1-style-graphics-in-threejs), [dithering / retro shading (R3F)](https://blog.maximeheckel.com/posts/the-art-of-dithering-and-retro-shading-web/), [toon + depth/normal outlines](https://github.com/buggzeth/three-js-toon-shader)

**Pros:** Soft PBR → flat bands that read at tiny sizes.  
**Cons:** AI textures may need desaturation / remapping so gradients don’t fight the toon bands.

### Recommended composition for MVP

| Layer | Choice |
| --- | --- |
| App shell | Vite + React |
| 3D | `@react-three/fiber` + `@react-three/drei` |
| Camera | Orthographic, fixed **dimetric / quasi-iso** angle (tune to match BoF / Sea of Stars refs — not necessarily true 35.264°) |
| Material | `MeshToonMaterial` (or convert GLB materials on load) |
| Pixelation | Start with **DIY low-res RT** *or* `RenderPixelatedPass`; add **RetroPass / custom palette** for colour lock |
| Export | `renderer.domElement.toDataURL('image/png')` or readpixels from the pixel buffer (preserve alpha) |

**Verdict:** Best path for a frontend developer. We implement the look ourselves; we do not wait on a specialty “pixel 3D engine.”

---

## Option B — Voxel / MagicaVoxel path (strong style, weak prompt)

MagicaVoxel can export **ISO PNG sprites** natively. [Spotvox](https://github.com/tommyettinger/spotvox) batch-renders `.vox` → multi-angle pixel art with outline styles. Fully offline / free.

**Pros:** Instant SNES-adjacent read; industry-proven for isometric sprites.  
**Cons:** Prompt → voxel character is a weaker / separate AI problem; not a React-native pipeline.

**Verdict:** Excellent **fallback / style Lab** if mesh→pixel looks wrong. Not primary MVP unless we later add AI→vox.

---

## Option D — Existing low-poly → pixel-art bake tools (follow-up research)

These tools solve the **render / sprite-bake half** of the pipeline (GLB/FBX/VOX → PNG sheets). None generate chibi models from prompts. They are still useful as: (1) style targets for our R3F bake, (2) a temporary Lab while AI meshes improve, or (3) a phase-2 offline exporter if we decide not to own the pixel shaders ourselves.

### Comparison matrix

| Tool | Cost | Mac? | Iso? | Palette? | Anim sheets? | Embed in React? |
| --- | --- | --- | --- | --- | --- | --- |
| [SpriteEx](https://xionworld.itch.io/spriteex) | ~$10 one-time | ❌ Windows | ✅ | Endesga32 + presets | ✅ | ❌ |
| [PixlyBakery](https://snappyworks.itch.io/pixlybakery) | ~$8–13 | ❌ Win (Linux soon) | ✅ ISO mode | 90+ palettes | ✅ GLB anim | ❌ |
| [PixelSprite FX](https://pixelspritefx.com/) | Web (browser) | ✅ | ✅ | Posterize / dither | Sheet export | ❌ (hosted) |
| [PixelOver](https://pixelover.io/) | ~$30 (trial) | ✅ Win/Mac/Linux | ✅ via camera | Indexation / dither | ✅ | ❌ |
| [GodotPixelRenderer](https://github.com/thegreatsai/GodotPixelRenderer) | Free / OSS | Build yourself | Custom cam | Quantize + 8-col | PNG sequence | ❌ (could sidecar) |
| [Palette Studio](https://dietinghippo.itch.io/palette-studio) | Name-your-price Blender add-on | ✅ (via Blender) | Multi-angle rig | Fixed palettes + dither | Multi-angle stills | ❌ |
| Blender add-ons ([True Pixel Art Generator](https://byte-bard.itch.io/3d-to-2d-blender-addon), [Pixel Sprite Renderer](https://efeitos-visuais-brasil.itch.io/blender-pixel-sprite-renderer)) | Paid / free scripts | ✅ | Configurable | Via compositor | ✅ | ❌ |
| [SpriteStack](https://spritestack.io/) | Free web / paid desktop | ✅ web | Retro renderer | Voxel aesthetic | ✅ | ❌ |
| MagicaVoxel ISO + [Spotvox](https://github.com/tommyettinger/spotvox) | Free | Spotvox = Java | ✅ | Voxel palette | Multi-angle | ❌ |
| [Sorceress 3D→2D](https://sorceress.games/pages/3d-to-2d) | Product / studio tool | Unclear | ✅ | Unclear | ✅ + engine metadata | ❌ |
| Our R3F + Three post (Option A) | Free | ✅ | ✅ locked | Lospec DIY | Phase 2 | ✅ product |

---

### D1. SpriteEx (itch.io, ~$10)

Desktop: drop GLB/FBX/OBJ → isometric or custom cam → 8 compass directions → Endesga32 / NES / PICO-8 / etc. → ZIP of sheets + `metadata.json`. Mixamo animation sampling built in. Output sizes **16 / 32 / 64 / 128**.

| Pros | Cons |
| --- | --- |
| Almost exactly our bake UX (iso + palette + sheet) | **Windows only** — awkward on this Mac |
| Endesga32 already in palette list | Paid (small); not scriptable in our Vite app |
| Dither, silhouette outline, AA removal | No prompt→mesh; no React embed |

**Fit:** Excellent **offline Lab** and UI/feature checklist for our bake page. Not the product runtime.

---

### D2. PixlyBakery (itch.io, ~$8–13)

Godot-ish pipeline for obj/fbx/glb/vox: texture pixelate, Bayer dither, 90+ palettes, **ISO + side** cameras, 4/8/16/36-direction sheets, GLB animation timeline.

| Pros | Cons |
| --- | --- |
| Deepest “game sprite bakery” feature set we found | Windows-first; Linux “coming soon”; **no Mac** |
| Handles VOX and low-poly; part hierarchy hide/show | Paid; closed; not embeddable |
| Live pixeliser / outline / posterize | Overkill if we only need one locked iso angle |

**Fit:** Best commercial feature reference. Skip as dependency (platform + cost).

---

### D3. PixelSprite FX (browser)

Online GLB/GLTF → rotate → isometric pixel sprite + Bayer dither / posterize / shadows → sheet export.

| Pros | Cons |
| --- | --- |
| Zero install; works on Mac in browser | Hosted dependency; privacy / uptime / pricing drift |
| Quick A/B of whether a given AI GLB “pixelates well” | Not automatable for our FastAPI flow |
| Validates that WebGL 3D→pixel is viable | Less control than desktop bakers |

**Fit:** Use as a **free spit-check** on TripoSR/Hunyuan meshes before we invest in shader work. Do not build the product around it.

---

### D4. PixelOver (~$30, native Mac)

Pixel-art animation app with **3D import**, pixel shaders, indexation/dither, multi-direction auto-rotate export. Win/Mac/Linux.

| Pros | Cons |
| --- | --- |
| **Runs on this Mac**; mature 3D→pixel workflow | Paid (one-time); demo blocks export |
| Strong for polishing / animating once we have a mesh | Separate GUI from our React app |
| Deterministic (non-AI) filters — good house style control | Heavier than “just bake one still” |

**Fit:** Strongest **paid Lab tool for Mac**. Optional if R3F bake quality is hard and we want golden reference sprites.

---

### D5. GodotPixelRenderer / “Godot Pixel Studio” (free OSS)

Godot app: load GLB → pixelation, colour steps, dither, outlines → export PNG frame sequences. Standalone once built; engine not required at runtime.

| Pros | Cons |
| --- | --- |
| **Free / open**; inspectable shaders | Young / low stars — treat as experimental |
| Closest free analogue to SpriteEx | Build step (Godot); not a React component |
| Could run as a **local CLI sidecar** next to FastAPI | Camera presets / iso UX less polished than SpriteEx |

**Fit:** Best free bake alternative to DIY R3F. Steal shader ideas (Bayer, Sobel outline) even if we keep Three.js. Optional sidecar if we want batch sheets without owning export code.

---

### D6. Blender: Palette Studio + pixel sprite add-ons

[Palette Studio](https://dietinghippo.itch.io/palette-studio): multi-angle camera rig, palette lock, dither — Doom/RPG oriented. Others pack sheets and set compositor pixel looks.

| Pros | Cons |
| --- | --- |
| Free–cheap; Mac via Blender; scripts automatable | Leaves React universe; Blender as runtime dependency |
| High ceiling for lighting / remesh polish | Worse UX for “type prompt, get sprite” |
| Good for one-off hero assets | Overkill for MVP volume generation |

**Fit:** Offline hero / comparison path only.

---

### D7. SpriteStack (voxel / retro renderer)

Voxel / sprite-stack editor with a distinctive retro spritesheet exporter; MagicaVoxel import.

| Pros | Cons |
| --- | --- |
| SNES-adjacent look out of the box | Wrong authoring model for AI low-poly meshes |
| Inspiration for lighting / outline | Prompt→vox still unsolved |

**Fit:** Style reference, not pipeline core (same bucket as MagicaVoxel + Spotvox).

---

### D8. Sorceress “3D to 2D”

Studio/product for animated model → transparent sheets + Godot/Phaser/Unity metadata, arbitrary camera including isometric.

| Pros | Cons |
| --- | --- |
| Engine metadata exports are thoughtful | Not free local; product/platform coupling |
| Direction sets map to later overworld needs | Opaque vs our OSS bake goal |

**Fit:** Feature inspiration (metadata.json) more than a dependency.

---

### How Option D changes the plan

| Question | Answer |
| --- | --- |
| Did we miss a free React npm that does SNES iso bake? | **No.** Closest stacks are desktop apps or Godot. |
| Should we buy SpriteEx/PixlyBakery for MVP? | **No** (Windows / closed). Use as visual QA checklist only. |
| Should we buy PixelOver? | Optional Lab on Mac if DIY shaders stall. |
| Should we use GodotPixelRenderer? | Optional free Lab / shader reference / sidecar. |
| Does this replace Option A (R3F)? | **No for the product.** These tools prove demand and desired knobs (iso preset, Endesga, outline, 32/64). We still embed bake in Vite for one-click prompt→PNG. |
| Hybrid worth considering? | Local TripoSR → GLB → **either** in-app R3F bake **or** drop into PixelSprite FX / PixelOver for a style bake-off. |

**Verdict:** Existing tools strongly validate the bake stage and give us a feature checklist (iso camera, Endesga-class palette, outline, 32/64, sheet metadata). For a free, Mac-native, prompt-driven app, **still own the bake in R3F**, and optionally mirror GodotPixelRenderer / PixelOver results during the quality spike.

---

## Option C — Local mesh generation (amended: free only)

Most strong open models are **image → 3D**, not pure text → 3D. That fits us well: we already run a **local SD1.5** stack on **Apple M4 Pro (MPS)** in `iso-sprite-gen`.

### Recommended pipeline: two-stage local

```
prompt
  → local SD (iso-sprite-gen Diffusers / FastAPI)
      flat chibi concept, white/grey bg, front or 3⁄4
  → rembg / key bg
  → local image-to-3D → GLB
  → R3F isometric pixel bake → PNG
```

**Why two-stage:** Chibi proportions and wardrobe are easier to lock in 2D (and we already have pixel LoRAs). Image-to-3D then becomes a geometry lift, not a fashion designer.

Prompt bias for the concept stage:

> “Low-poly chibi RPG character, oversized head, short limbs, simple flat colour armour, white background, full body, facing camera, no scenery”

Then image-to-3D; then the **iso camera** does the Sea of Stars facing — we do **not** need the concept image to already be isometric.

---

### C1. TripoSR — lightest local spike (default first try)

- Repo: [VAST-AI-Research/TripoSR](https://github.com/VAST-AI-Research/TripoSR) (MIT)
- **Image → mesh**, feed-forward, ~sub-second on big NVIDIA; slower on MPS
- ~**6–8 GB** class model — friendliest for consumer / Mac experimental setups
- Community reports of Mac installs (some friction around `torchmcubes`)

**Pros:** Free, MIT, simplest install target, fast iteration once running.  
**Cons:** Weaker fidelity than Hunyuan/TRELLIS; textures/geometry can be soft; may need remesh / simplify before pixel bake.

### C2. Hunyuan3D 2.1 — best open quality (if hardware/time allows)

- Repo: [Tencent-Hunyuan/Hunyuan3D-2.1](https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1)
- Image → shape (+ optional paint/textures); official path is CUDA-heavy (~10 GB shape / high for textures; `--low_vram_mode` helps)
- Gradio flag `--enable_t23d` can do text→image→3D in one app (still local)
- Apple Silicon: community ports exist, e.g. [hunyuan3d-2.1-mac](https://github.com/VladimirTalyzin/hunyuan3d-2.1-mac) (MPS; expect minutes per gen; prefer 24 GB+ unified memory)

**Pros:** Strongest open mesh + texture quality among practical local options.  
**Cons:** Heavier install (custom CUDA/Metal pieces); **check Tencent community licence** before any redistribution of outputs/tools; slower on Mac.

### C3. InstantMesh — mid quality / mid VRAM

- Repo: [TencentARC/InstantMesh](https://github.com/TencentARC/InstantMesh)
- Multi-view diffusion + sparse recon; ~1 min class on NVIDIA 12–16 GB+
- Better structure than TripoSR for some subjects

**Pros:** Free local quality step-up without full Hunyuan pain.  
**Cons:** More moving parts; Mac support less “turnkey” than TripoSR / Hunyuan Mac ports.

### C4. TRELLIS.2 — quality ceiling (heavy)

- Repo: [microsoft/TRELLIS.2](https://github.com/microsoft/TRELLIS.2) (MIT weights/code)
- Image → high-fidelity textured mesh; official: Linux + **≥24 GB NVIDIA**
- Community Apple Silicon MPS ports exist (HN / forks) — minutes per gen, high unified memory

**Pros:** MIT, excellent image fidelity.  
**Cons:** Overkill for 32–64px sprites; painful Mac install; slow. Keep as stretch goal, not MVP.

### C5. Pure text-to-3D locals (downgrade)

Older OpenAI **Shap-E** / **Point-E** can run locally and accept text, but quality lags modern image-to-3D. Prefer **SD concept → TripoSR/Hunyuan** over Shap-E for characters.

### C6. Manual / modular libraries (long-term quality ceiling)

Kitbash: few base body meshes + LLM-picked colours / accessory slots. Highest consistency, highest authoring cost. Defer until AI mesh quality is the bottleneck.

### Local model bake-off order (revised)

1. **TripoSR** from a hand-picked chibi PNG (fastest path to *any* GLB)  
2. Same PNG through **Hunyuan3D 2.1** (Mac port or CUDA box) for quality delta  
3. Only if needed: InstantMesh / TRELLIS.2  
4. Wire SD concept generation last (we already know that works)

**Verdict for MVP mesh source:** **Local SD concept → TripoSR GLB**, with Hunyuan3D as the quality upgrade if TripoSR silhouettes fail the SNES test.

---

## Hardware note (this workstation)

`iso-sprite-gen` is validated on **Apple M4 Pro + MPS**. Implications:

| Piece | Expectation |
| --- | --- |
| Vite + R3F bake | Fine on Mac |
| Local SD concept | Already working |
| TripoSR / Hunyuan / TRELLIS | Possible on Apple Silicon via MPS ports, but **slower and fiddlier** than CUDA |
| Ideal later | Optional Linux/NVIDIA box as a local inference sibling — still free, still ours |

MVP should not assume cloud GPUs. Spike on this Mac first; document wall-clock times.

---

## Camera & art direction (locked contract)

Target references (same family as `iso-sprite-gen` docs / Sea of Stars):

- Small **chibi** body (~½–⅔ “realistic” proportions)
- **Back / three-quarter from behind**, facing **top-right** of screen
- Low **top-down isometric** (combat or overworld angle), orthographic
- Hard-ish light from upper-left or upper-right so volumes read after pixelation
- Character height in final sprite: **32 / 48 / 64 px** (match prior app)

Implementation notes:

- Freeze camera; only allow zoom for preview, not free orbit in produce mode  
- Ground plane optional (transparent bake — discard ground in alpha or disable)  
- Snap model to origin; auto-fit bounding box so all gens share a consistent footer/baseline  
- Later animation: same camera, sampled frames → horizontal strip spritesheet

---

## Proposed MVP product

### In scope

| Feature | Detail |
| --- | --- |
| Prompt → 3D | Local: SD concept → image-to-3D → textured/untextured GLB |
| Live preview | R3F canvas with locked iso camera + toon + pixel look |
| Style knobs | Pixel size, shade bands, palette (Lospec slug), outline strength, light angle |
| Generate still | Capture one transparent PNG at chosen cell size |
| Download | Single PNG |
| History | Store prompt + seed + local GLB path |

### Out of scope for MVP

- Any paid 3D generation API
- Walk cycles / Mixamo-quality animation (phase 2)
- Full multi-pose action sheets (attack, die, …)
- Shipping commercial SNES rip refs (same rule as sister project)

### Phase 2 (animation)

1. Offline auto-rig if available locally, or a fixed humanoid skeleton + Mixamo-style free tooling  
2. Drive a short idle / walk clip in R3F (`useAnimations`)  
3. Sample N frames at fixed timestep into a PNG strip  
4. Outline + palette applied per frame identically

---

## Architecture sketch

```
┌──────────────────────────────────────────────┐
│  Vite + React UI                             │
│  prompt · size · palette · generate · download│
└───────────────┬──────────────────────────────┘
                │
     ┌──────────▼──────────────────────────────┐
     │  Local Python API (FastAPI)             │
     │  1) SD1.5 concept (reuse iso-sprite-gen │
     │     Diffusers pattern / shared server)  │
     │  2) TripoSR / Hunyuan → GLB on disk     │
     └──────────┬──────────────────────────────┘
                │ file:// or /assets/{id}.glb
     ┌──────────▼──────────────────────────────┐
     │  R3F Scene                              │
     │  · OrthographicCamera (locked)          │
     │  · useGLTF → toon-ise materials         │
     │  · lights                               │
     │  · pixel + palette post                 │
     │  · capture → PNG                        │
     └─────────────────────────────────────────┘
```

No API keys for generation. One Lean local server (or two if we keep SD and 3D in separate processes) mirrors `iso-sprite-gen`.

---

## Bake-off plan (1–2 days before building much)

1. Hardcode one chibi GLB (or MagicaVoxel export) → prove R3F iso + toon + pixel + palette PNG  
2. Spit-check the same GLB in PixelSprite FX / PixelOver trial / GodotPixelRenderer — save reference PNGs  
3. Export a clean concept PNG (hand-drawn or one SD gen with white bg)  
4. Run **TripoSR** locally → GLB → bake; score silhouette at 64px  
5. Run **Hunyuan3D 2.1** (Mac port if CUDA unavailable) on the same PNG → compare  
6. Pick default image-to-3D backend; then wire prompt→SD→3D  

Success criteria for “good enough MVP still”:

- Era match to Sea of Stars / BoF at a glance (not mushy SD smear, not shiny PBR hero render)  
- Transparent BG, consistent framing  
- **$0 per generation**, reproducible from prompt + seed on this machine  

---

## Recommendation

| Decision | Choice |
| --- | --- |
| Cost model | **Free / local only** — no Meshy, Tripo cloud, fal, etc. |
| Frontend | **Vite + React + R3F** |
| Pixel rendering | **Own bake in Three.js** (toon + low-res / `RenderPixelatedPass` + Lospec). Desktop bakers (SpriteEx, PixlyBakery, PixelOver, GodotPixelRenderer) are Lab / feature checklist, not runtime deps |
| Concept image | **Reuse local SD1.5** stack from `iso-sprite-gen` |
| Mesh generation | **TripoSR first**; **Hunyuan3D 2.1** if quality demands it |
| Style insurance | Chibi concept prompts + toon + **Lospec palette** |
| Voxel path | Style Lab (MagicaVoxel / Spotvox / SpriteStack) if mesh→pixel fails the SNES test |
| Animation | Phase 2 after single-frame quality is trusted |

**Bottom line:** Dedicated low-poly→pixel apps exist and map closely to our bake stage — especially SpriteEx / PixlyBakery / PixelOver / GodotPixelRenderer — but none are free + Mac-native + embeddable in a React prompt app. Keep generating meshes locally (SD → TripoSR), bake inside R3F, and use those tools as quality targets during the spike.

---

## Suggested next steps

1. Approve amended free/local constraint  
2. Scaffold Vite + R3F with a hardcoded GLB bake  
3. (Optional) Spit-check the same GLB in [PixelSprite FX](https://pixelspritefx.com/) or PixelOver trial for a style reference PNG  
4. Spike **TripoSR on this Mac**; record install notes + timing in `docs/LOCAL_3D.md`  
5. Compare one Hunyuan3D bake if TripoSR fails SNES readability  
6. Wire FastAPI: prompt → SD concept → image-to-3D → GLB URL → UI bake → PNG download  

---

## Sources (research)

- [Three.js RenderPixelatedPass](https://threejs.org/docs/pages/RenderPixelatedPass.html) / [pixel example](https://github.com/mrdoob/three.js/blob/dev/examples/webgl_postprocessing_pixel.html)
- [three-retropass](https://github.com/mesmotronic/three-retropass)
- [MeshToonMaterial](https://threejs.org/docs/pages/MeshToonMaterial.html)
- [PS1-style graphics in Three.js](https://romanliutikov.com/blog/ps1-style-graphics-in-threejs)
- [Dithering & retro shading for the web](https://blog.maximeheckel.com/posts/the-art-of-dithering-and-retro-shading-web/)
- [SpriteEx](https://xionworld.itch.io/spriteex) — desktop 3D→sprite sheets (iso, Endesga32)
- [PixlyBakery](https://snappyworks.itch.io/pixlybakery) — 3D/vox→pixel sheets
- [PixelSprite FX](https://pixelspritefx.com/) — browser GLB→iso pixel
- [PixelOver](https://pixelover.io/) — Mac-capable 3D→pixel animation
- [GodotPixelRenderer](https://github.com/thegreatsai/GodotPixelRenderer) — free OSS 3D→pixel
- [Palette Studio](https://dietinghippo.itch.io/palette-studio) — Blender multi-angle palette sprites
- [SpriteStack](https://spritestack.io/) — voxel / retro spritesheet renderer
- [Sorceress 3D to 2D](https://sorceress.games/pages/3d-to-2d)
- [TripoSR](https://github.com/VAST-AI-Research/TripoSR) (MIT, image→3D, low VRAM)
- [Hunyuan3D 2.1](https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1) / [Mac MPS port](https://github.com/VladimirTalyzin/hunyuan3d-2.1-mac)
- [InstantMesh](https://github.com/TencentARC/InstantMesh)
- [TRELLIS.2](https://github.com/microsoft/TRELLIS.2) (MIT; heavy; community MPS ports)
- [Spotvox](https://github.com/tommyettinger/spotvox) / MagicaVoxel ISO export
- Sister project: `iso-sprite-gen` `docs/LOCAL_MODELS.md` (SD1.5 + MPS on M4 Pro)
