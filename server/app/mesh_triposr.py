"""
Local TripoSR image → GLB helper.
"""

from __future__ import annotations

import subprocess
import uuid
from pathlib import Path
from typing import Optional

from . import mesh_normalize

ROOT = Path(__file__).resolve().parents[2]
TRIPOSR = ROOT / "vendor" / "TripoSR"
TRIPOSR_PY = TRIPOSR / ".venv" / "bin" / "python"
RUN_PY = TRIPOSR / "run.py"
MODELS = ROOT / "models"


def available() -> bool:
    return RUN_PY.exists() and TRIPOSR_PY.exists()


def image_to_glb(
    image_path: Path,
    stem: Optional[str] = None,
    *,
    skip_rembg: bool = False,
) -> Path:
    """
    Run TripoSR CLI on a PNG/JPG and return a bake-normalized GLB under models/.
    Free / local only.
    """
    if not available():
        raise RuntimeError("TripoSR venv or run.py missing — see docs/LOCAL_3D.md")

    image_path = image_path.resolve()
    if not image_path.exists():
        raise FileNotFoundError(image_path)

    job = stem or uuid.uuid4().hex[:12]
    out_dir = MODELS / f"triposr-{job}"
    # TripoSR only mkdir's this when rembg runs; --no-remove-bg skips it and export fails.
    (out_dir / "0").mkdir(parents=True, exist_ok=True)

    cmd = [
        str(TRIPOSR_PY),
        str(RUN_PY),
        str(image_path),
        "--output-dir",
        str(out_dir),
        "--model-save-format",
        "glb",
        "--foreground-ratio",
        "0.85",
    ]
    if skip_rembg:
        cmd.append("--no-remove-bg")

    proc = subprocess.run(
        cmd,
        cwd=str(TRIPOSR),
        capture_output=True,
        text=True,
        check=False,
    )
    if proc.returncode != 0:
        raise RuntimeError(
            f"TripoSR failed ({proc.returncode}): {proc.stderr[-2000:] or proc.stdout[-2000:]}"
        )

    glb = out_dir / "0" / "mesh.glb"
    if not glb.exists() or glb.stat().st_size == 0:
        raise RuntimeError(f"TripoSR produced no GLB at {glb}")

    dest = MODELS / f"{job}.glb"
    dest.write_bytes(glb.read_bytes())
    mesh_normalize.normalize_character_glb(dest)
    return dest
