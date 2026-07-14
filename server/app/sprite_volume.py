"""
Build a volumetric character mesh from a 2D sprite.

TripoSR reconstructs flat relief from pixel art. For chibi/human sprites we instead
inflate the silhouette with a cylindrical depth profile: medial-axis distance →
half-ellipse cross-section so heads read round and limbs read tube-like.
"""

from __future__ import annotations

import uuid
from pathlib import Path
from typing import Optional

import numpy as np
import trimesh
from PIL import Image
from scipy.ndimage import binary_fill_holes, distance_transform_edt, gaussian_filter

from . import mesh_normalize

ROOT = Path(__file__).resolve().parents[2]
MODELS = ROOT / "models"

MESH_MAX_EDGE = 96
# Peak thickness as a fraction of character height (chibi torso depth).
DEPTH_FRAC_OF_HEIGHT = 0.42
RIM_EPS = 0.04


def available() -> bool:
    return True


def _load_rgba(path: Path) -> Image.Image:
    img = Image.open(path).convert("RGBA")
    w, h = img.size
    edge = max(w, h)
    if edge > MESH_MAX_EDGE:
        scale = MESH_MAX_EDGE / edge
        img = img.resize(
            (max(1, int(w * scale)), max(1, int(h * scale))),
            Image.Resampling.NEAREST,
        )
    return img


def _foreground_mask(rgba: np.ndarray) -> np.ndarray:
    alpha = rgba[:, :, 3]
    if (alpha < 16).any() and (alpha > 200).any():
        mask = alpha > 32
    else:
        rgb = rgba[:, :, :3].astype(np.float32)
        dist_gray = np.linalg.norm(rgb - 127.0, axis=-1)
        dist_white = np.linalg.norm(rgb - 255.0, axis=-1)
        mask = (dist_gray > 28) & (dist_white > 28)
    return binary_fill_holes(mask).astype(bool)


def _cylindrical_depth(mask: np.ndarray) -> np.ndarray:
    """
    Depth in [0, 1]. Half-ellipse from Euclidean distance to background:
    z = sqrt(2 R d - d^2) / R  → roughly circular/cylindrical cross-sections.
    """
    dist = distance_transform_edt(mask)
    if not mask.any():
        return np.zeros_like(dist, dtype=np.float32)
    r = float(dist[mask].max())
    if r < 1e-6:
        return mask.astype(np.float32)

    depth = np.sqrt(np.maximum(0.0, 2.0 * r * dist - dist * dist)) / r
    depth = gaussian_filter(depth, sigma=0.9)
    depth = np.where(mask, depth, 0.0)
    peak = float(depth.max())
    if peak > 1e-6:
        depth /= peak
    return depth.astype(np.float32)


def _build_pillow_mesh(
    rgb: np.ndarray,
    mask: np.ndarray,
    depth: np.ndarray,
    depth_world: float,
) -> trimesh.Trimesh:
    """
    Front + back heightfields. Rim pixels (near-zero depth) share a single vertex
    so the shell seals without explicit side walls.
    """
    h, w = mask.shape
    front_id = -np.ones((h, w), dtype=np.int32)
    back_id = -np.ones((h, w), dtype=np.int32)

    verts: list[list[float]] = []
    colors: list[list[float]] = []

    ys, xs = np.where(mask)
    for y, x in zip(ys.tolist(), xs.tolist()):
        d = float(depth[y, x])
        z = d * depth_world
        px = float(x)
        py = float(-y)
        c = (rgb[y, x].astype(np.float64) / 255.0).tolist() + [1.0]

        if d <= RIM_EPS:
            vid = len(verts)
            verts.append([px, py, 0.0])
            colors.append(c)
            front_id[y, x] = vid
            back_id[y, x] = vid
        else:
            front_id[y, x] = len(verts)
            verts.append([px, py, z])
            colors.append(c)
            back_id[y, x] = len(verts)
            verts.append([px, py, -z])
            colors.append(c)

    faces: list[list[int]] = []

    def add_quad(a: int, b: int, c: int, d: int) -> None:
        if a == b or b == c or c == d or d == a:
            return
        faces.append([a, b, c])
        faces.append([a, c, d])

    for y in range(h - 1):
        for x in range(w - 1):
            if not (
                mask[y, x]
                and mask[y, x + 1]
                and mask[y + 1, x]
                and mask[y + 1, x + 1]
            ):
                continue
            a = int(front_id[y, x])
            b = int(front_id[y, x + 1])
            c = int(front_id[y + 1, x + 1])
            d = int(front_id[y + 1, x])
            add_quad(a, b, c, d)

            a = int(back_id[y, x])
            b = int(back_id[y, x + 1])
            c = int(back_id[y + 1, x + 1])
            d = int(back_id[y + 1, x])
            add_quad(a, d, c, b)

    if not faces:
        raise RuntimeError("no mesh faces — empty silhouette?")

    mesh = trimesh.Trimesh(
        vertices=np.asarray(verts, dtype=np.float64),
        faces=np.asarray(faces, dtype=np.int64),
        vertex_colors=np.asarray(colors, dtype=np.float64),
        process=False,
    )
    mesh.merge_vertices()
    mesh.remove_unreferenced_vertices()
    try:
        trimesh.repair.fix_normals(mesh)
    except Exception:
        pass
    return mesh


def build_volume_mesh(image_path: Path) -> trimesh.Trimesh:
    rgba_img = _load_rgba(image_path)
    rgba = np.asarray(rgba_img)
    rgb = rgba[:, :, :3]
    mask = _foreground_mask(rgba)
    if not mask.any():
        raise RuntimeError("no foreground pixels to inflate")

    depth = _cylindrical_depth(mask)
    ys, _xs = np.where(mask)
    height_px = float(ys.max() - ys.min() + 1)
    depth_world = max(1.0, height_px * DEPTH_FRAC_OF_HEIGHT)

    return _build_pillow_mesh(rgb, mask, depth, depth_world)


def image_to_glb(image_path: Path, stem: Optional[str] = None) -> Path:
    """Sprite → volumetric character GLB under models/."""
    image_path = Path(image_path).resolve()
    if not image_path.exists():
        raise FileNotFoundError(image_path)

    job = stem or uuid.uuid4().hex[:12]
    mesh = build_volume_mesh(image_path)
    mesh_normalize.plant_on_ground(mesh, target_height=1.15)

    MODELS.mkdir(parents=True, exist_ok=True)
    dest = MODELS / f"{job}.glb"
    mesh.export(dest)
    return dest
