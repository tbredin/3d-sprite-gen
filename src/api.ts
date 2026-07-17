export type StatusResponse = {
  mesh_backend: string;
  mesh_ready: boolean;
  message: string;
  sizes: number[];
  default_palette: string;
  sample_model?: string;
  how_it_works?: string;
  variations?: VariationStatus;
};

export type VariationStatus = {
  ready: boolean;
  loaded: boolean;
  device?: string | null;
  message: string;
  gen_size?: number;
  model?: string;
  lora?: string;
  controlnet?: string;
};

export type VariationMeta = {
  id: string;
  locked: boolean;
  freedom: "polish" | "costume" | "soft";
  seed: number;
  size: number;
  palette: string;
  outline: string;
  prompt: string;
  controlnet: number;
  denoise: number;
  steps: number;
  elapsed_s: number;
  created_at: number;
  image: string;
};

export type GenerateMeshResponse = {
  status: "ready" | "stub" | "error";
  model_url?: string;
  concept_url?: string;
  message: string;
  from_spritesheet?: boolean;
  source_size?: number[];
};

export async function fetchStatus(): Promise<StatusResponse> {
  const res = await fetch("/api/status");
  if (!res.ok) throw new Error(`status ${res.status}`);
  return res.json();
}

export async function meshFromImage(file: File): Promise<GenerateMeshResponse> {
  const body = new FormData();
  body.append("file", file);
  const res = await fetch("/api/mesh-from-image", { method: "POST", body });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `mesh-from-image ${res.status}`);
  }
  return res.json();
}

export async function fetchVariationStatus(): Promise<VariationStatus> {
  const res = await fetch("/api/variations/status");
  if (!res.ok) throw new Error(`variations status ${res.status}`);
  return res.json();
}

export async function warmupVariations(): Promise<VariationStatus> {
  const res = await fetch("/api/variations/warmup", { method: "POST" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `warmup ${res.status}`);
  }
  return res.json();
}

export async function listVariations(): Promise<VariationMeta[]> {
  const res = await fetch("/api/variations");
  if (!res.ok) throw new Error(`variations list ${res.status}`);
  const data = (await res.json()) as { items: VariationMeta[] };
  return data.items ?? [];
}

export async function generateVariation(opts: {
  /** Data URL from the live bake or a variation image URL for idle rerolls. */
  sourceDataUrl: string;
  size: number;
  paletteSlug: string;
  prompt: string;
  outlineHex: string;
}): Promise<VariationMeta> {
  const blob = await (await fetch(opts.sourceDataUrl)).blob();
  const body = new FormData();
  body.append("file", blob, "source.png");
  body.append("size", String(opts.size));
  body.append("palette_slug", opts.paletteSlug);
  body.append("prompt", opts.prompt);
  body.append("outline_hex", opts.outlineHex.replace("#", ""));
  const res = await fetch("/api/variations/generate", { method: "POST", body });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `generate ${res.status}`);
  }
  return res.json();
}

export async function setVariationLocked(
  id: string,
  locked: boolean,
): Promise<VariationMeta> {
  const body = new FormData();
  body.append("locked", locked ? "true" : "false");
  const res = await fetch(`/api/variations/${id}/lock`, {
    method: "POST",
    body,
  });
  if (!res.ok) throw new Error(`lock ${res.status}`);
  return res.json();
}

export async function deleteVariation(id: string): Promise<void> {
  const res = await fetch(`/api/variations/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `delete ${res.status}`);
  }
}

export async function clearUnlockedVariations(): Promise<number> {
  const res = await fetch("/api/variations/clear", { method: "DELETE" });
  if (!res.ok) throw new Error(`clear ${res.status}`);
  const data = (await res.json()) as { deleted: number };
  return data.deleted;
}

export async function fetchPaletteFromApi(slug: string): Promise<{
  name: string;
  author?: string;
  colors: string[];
}> {
  const res = await fetch(`/api/palette/${encodeURIComponent(slug)}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `palette ${res.status}`);
  }
  return res.json();
}
