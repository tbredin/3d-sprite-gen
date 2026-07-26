/**
 * Persist AI variation timeline Steps / CFG so a refresh keeps the last
 * slider values instead of snapping back to server (or hardcoded) defaults.
 */

const STORAGE_KEY = "3d-sprite-gen:variation-settings-v1";

export const VARIATION_STEPS_MIN = 16;
export const VARIATION_STEPS_MAX = 40;
export const VARIATION_GUIDANCE_MIN = 4;
export const VARIATION_GUIDANCE_MAX = 10;
export const VARIATION_GUIDANCE_STEP = 0.5;

export type VariationSettingsPersist = {
  steps: number;
  guidance: number;
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function sanitizeSteps(v: unknown): number | undefined {
  if (typeof v !== "number" || !Number.isFinite(v)) return undefined;
  return Math.round(clamp(v, VARIATION_STEPS_MIN, VARIATION_STEPS_MAX));
}

function sanitizeGuidance(v: unknown): number | undefined {
  if (typeof v !== "number" || !Number.isFinite(v)) return undefined;
  const clamped = clamp(v, VARIATION_GUIDANCE_MIN, VARIATION_GUIDANCE_MAX);
  // Snap to the UI step so reload doesn't drift off the slider ticks.
  const steps = Math.round(
    (clamped - VARIATION_GUIDANCE_MIN) / VARIATION_GUIDANCE_STEP,
  );
  return VARIATION_GUIDANCE_MIN + steps * VARIATION_GUIDANCE_STEP;
}

/** `null` when nothing usable is stored — caller keeps defaults / server values. */
export function loadVariationSettings(): VariationSettingsPersist | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<VariationSettingsPersist>;
    if (parsed == null || typeof parsed !== "object") return null;
    const steps = sanitizeSteps(parsed.steps);
    const guidance = sanitizeGuidance(parsed.guidance);
    if (steps == null || guidance == null) return null;
    return { steps, guidance };
  } catch {
    return null;
  }
}

export function saveVariationSettings(state: VariationSettingsPersist) {
  const steps = sanitizeSteps(state.steps);
  const guidance = sanitizeGuidance(state.guidance);
  if (steps == null || guidance == null) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ steps, guidance }));
  } catch {
    /* ignore quota / private mode */
  }
}
