# Local 3D mesh generation (free only)

**Hard rule:** no paid services. Mesh gen runs on this machine for rapid free iteration.

## How mesh generation works

**TripoSR does not invent geometry from a text prompt.** It is an **image → 3D** model: given a picture of an object/character, it reconstructs a mesh.

So our free local pipeline is:

1. **SD1.5 (local)** invents a full-body chibi concept on a white background from your prompt (no reference sheet required — the LLM/diffuser *does* “problem-solve” the look).
2. **TripoSR (local)** lifts that concept image into a GLB.
3. **R3F iso bake** turns the GLB into a pixel PNG.

Optional: **Upload concept → mesh** skips SD and only runs TripoSR.

```bash
# Full prompt→mesh (uses TripoSR venv — has torch + diffusers + TripoSR)
vendor/TripoSR/.venv/bin/python server/scripts/prompt_to_mesh.py \
  --prompt "chibi mage in a blue robe" --seed 1 --job test1
```

First SD load downloads weights into the Hugging Face cache (shares with other projects if already present).

| Piece | Status |
| --- | --- |
| Vite + R3F iso bake + Endesga-64 + PNG download | Working |
| Placeholder chibi bake | Working |
| TripoSR checkout + venv | Working on Apple Silicon |
| TripoSR image→GLB smoke test | Working (`models/chair.glb` from `examples/chair.png`) |
| Prompt → SD concept → TripoSR | Not wired yet |
| Paid APIs | Forbidden |

## Run the app

```bash
# API
npm run dev:server   # :8788

# UI
npm run dev          # :5174
```

UI: **Bake frame** → **Download PNG**. **Load sample GLB** loads `/api/models/chair.glb`.

## TripoSR install (done once on this machine)

```bash
mkdir -p vendor
git clone --depth 1 https://github.com/VAST-AI-Research/TripoSR.git vendor/TripoSR
cd vendor/TripoSR
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip setuptools wheel
pip install torch torchvision
# Prefer newer xatlas wheel (0.0.9 source build needs cmake/ninja):
pip install omegaconf==2.3.0 'Pillow==10.1.0' einops==0.7.0 \
  'git+https://github.com/tatsy/torchmcubes.git' transformers==4.35.0 \
  rembg huggingface-hub 'imageio[ffmpeg]' moderngl==5.10.0 \
  onnxruntime 'xatlas>=0.0.11' 'numpy<2' 'trimesh>=4.4'
```

Notes:
- Pin **`numpy<2`** or GLB export via trimesh breaks (`ndarray.ptp` removed).
- Skip pinned `xatlas==0.0.9` from upstream requirements; use `>=0.0.11` wheel.
- First run downloads ~1.7GB weights + rembg `u2net.onnx`.

Smoke test:

```bash
cd vendor/TripoSR
.venv/bin/python run.py examples/chair.png \
  --output-dir ../../models/triposr-glb \
  --model-save-format glb
cp ../../models/triposr-glb/0/mesh.glb ../../models/chair.glb
```

Timing observed on M4 Pro (after weights cached): ~20s end-to-end for the chair sample.

## Helper module

`server/app/mesh_triposr.py` → `image_to_glb(path)` shells out to the TripoSR venv.
`GET /api/status` reports `mesh_ready: true` when that venv exists.

## Next

1. Reuse `iso-sprite-gen` Diffusers for concept PNG (chibi, white bg)
2. `POST /api/generate-mesh` → SD → `mesh_triposr.image_to_glb` → `/api/models/{id}.glb`
3. Auto-load GLB into the baker

## Not allowed

Meshy, Tripo cloud, fal, Replicate, Rodin, or any pay-per-gen / pay-to-export step.
