export type StatusResponse = {
  mesh_backend: string;
  mesh_ready: boolean;
  message: string;
  sizes: number[];
  default_palette: string;
  sample_model?: string;
  how_it_works?: string;
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
