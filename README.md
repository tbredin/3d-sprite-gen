# 3d Sprite Gen

Local **procedural low-poly chibi → isometric pixel sprite** tool. Free iteration only — no paid APIs.

## Approach

No suitable off-the-shelf “LLM-callable chibi primitive kit” exists (existing tools are GLB part-swappers, robot seed gens, or mannequins). We build our own:

- **Units:** 1 head = world unit. Head 1 + torso ~⅔ + legs ½ (≈2.17 heads tall).
- **Parts API:** `generateHair`, `generateHelmet`, `generateTorso`, `generateArms`, `generateLegs`, `generateWeapon`, … in `src/lib/chibi/`
- **Assembly:** `assembleCharacter(spec)` builds a Three.js group from a declarative `CharacterSpec`
- **LLM path (next):** emit tool calls / JSON spec → same assembler
- **Bake:** ortho iso at **native sprite size** (32/48/64) with nearest-neighbour display upscale + 1px outline + Endesga-64 lock

## Quick start

```bash
npm install
python3 -m venv .venv
.venv/bin/pip install -r server/requirements.txt   # palette API optional

npm run dev:server   # :8788 (palette)
npm run dev          # :5174
```

1. Pick a **preset** (mage / knight / soldier / rogue / scientist)
2. Drag-rotate iso preview · set size 32/48/64
3. **Bake frame** → **Download PNG**

## Stack

| Layer | Choice |
| --- | --- |
| UI | Vite + React |
| Character | Procedural primitives (`src/lib/chibi`) |
| Bake | R3F ortho iso + toon + NN pixel buffer + outline |
