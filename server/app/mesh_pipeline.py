"""
Orchestrate free local mesh generation:

  prompt → SD1.5 concept (white bg) → TripoSR → GLB

TripoSR is an *image-to-3D* model — it does not invent a mesh from text alone.
The SD step invents the look; TripoSR lifts that picture into geometry.
No reference sheet is required; optional sample GLBs are only for bake testing.
"""

from __future__ import annotations

import json
import subprocess
import uuid
from pathlib import Path
from typing import Any, Dict, Optional

from . import mesh_triposr

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "prompt_to_mesh.py"
MODELS = ROOT / "models"


def available() -> bool:
    return mesh_triposr.available() and SCRIPT.exists()


def prompt_to_mesh(
    prompt: str,
    seed: int,
    steps: int = 28,
    facing: str = "away-tr",
    timeout_s: int = 900,
) -> Dict[str, Any]:
    if not mesh_triposr.available():
        raise RuntimeError("TripoSR not available — see docs/LOCAL_3D.md")

    job = uuid.uuid4().hex[:12]
    cmd = [
        str(mesh_triposr.TRIPOSR_PY),
        str(SCRIPT),
        "--prompt",
        prompt,
        "--seed",
        str(int(seed)),
        "--job",
        job,
        "--steps",
        str(int(steps)),
        "--facing",
        facing,
    ]
    proc = subprocess.run(
        cmd,
        cwd=str(ROOT),
        capture_output=True,
        text=True,
        check=False,
        timeout=timeout_s,
    )
    if proc.returncode != 0:
        err = (proc.stderr or proc.stdout or "")[-3000:]
        raise RuntimeError(f"prompt→mesh failed ({proc.returncode}): {err}")

    meta_path = MODELS / f"{job}.json"
    if meta_path.exists():
        return json.loads(meta_path.read_text())

    # Fallback parse last JSON line
    last: Optional[dict] = None
    for line in (proc.stdout or "").splitlines():
        line = line.strip()
        if line.startswith("{") and '"stage": "done"' in line:
            last = json.loads(line)
    if not last:
        raise RuntimeError("prompt→mesh finished without metadata")
    return last
