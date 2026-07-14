"""Post-process TripoSR meshes into bake-friendly character GLBs."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict

import numpy as np
import trimesh


def _as_mesh(obj: Any) -> trimesh.Trimesh:
    if isinstance(obj, trimesh.Trimesh):
        return obj
    if isinstance(obj, trimesh.Scene):
        geoms = [g for g in obj.geometry.values() if isinstance(g, trimesh.Trimesh)]
        if not geoms:
            raise RuntimeError("GLB has no mesh geometry")
        return trimesh.util.concatenate(geoms)
    raise RuntimeError(f"unsupported mesh type: {type(obj)}")


def to_y_up_facing_camera(mesh: trimesh.Trimesh) -> trimesh.Trimesh:
    """Match TripoSR Gradio export orientation (Y-up, facing roughly +Z/−Z)."""
    mesh.apply_transform(trimesh.transformations.rotation_matrix(-np.pi / 2, [1, 0, 0]))
    mesh.apply_transform(trimesh.transformations.rotation_matrix(np.pi / 2, [0, 1, 0]))
    return mesh


def inflate_if_flat(
    mesh: trimesh.Trimesh,
    *,
    flat_threshold: float = 0.25,
    depth_ratio: float = 0.36,
) -> bool:
    """
    TripoSR often returns sprite-like relief (cardboard). Stretch the thin axis
    so iso views have usable volume. Returns whether inflation ran.
    """
    extents = mesh.extents.astype(float)
    max_e = float(extents.max())
    min_e = float(extents.min())
    if max_e <= 1e-8 or (min_e / max_e) >= flat_threshold:
        return False
    thin = int(np.argmin(extents))
    target = max_e * depth_ratio
    if extents[thin] >= target:
        return False
    scale = np.ones(3, dtype=float)
    scale[thin] = target / extents[thin]
    mesh.apply_scale(scale.tolist())
    return True


def plant_on_ground(mesh: trimesh.Trimesh, *, target_height: float = 1.15) -> None:
    """Center XZ, scale height, put feet on y=0 (matches placeholder chibi)."""
    mesh.apply_translation(
        [-float(mesh.centroid[0]), -float(mesh.bounds[0][1]), -float(mesh.centroid[2])]
    )
    height = float(mesh.extents[1])
    if height > 1e-8:
        mesh.apply_scale(target_height / height)
        mesh.apply_translation([0.0, -float(mesh.bounds[0][1]), 0.0])


def normalize_character_glb(path: Path) -> Dict[str, Any]:
    """
    Orient, optionally inflate cardboard meshes, plant on ground, overwrite GLB.
    """
    path = Path(path)
    mesh = _as_mesh(trimesh.load(path, force="mesh"))
    raw_extents = mesh.extents.astype(float).tolist()

    mesh = to_y_up_facing_camera(mesh)
    inflated = inflate_if_flat(mesh)
    plant_on_ground(mesh)

    mesh.export(path)
    return {
        "raw_extents": raw_extents,
        "final_extents": mesh.extents.astype(float).tolist(),
        "inflated": inflated,
    }
