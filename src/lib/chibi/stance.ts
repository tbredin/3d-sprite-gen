/**
 * Silhouette fighting stance (reads at 42–48px bake).
 *
 * Language (all combat poses stay inside this envelope):
 * 1. Torso yawed ~45° off character facing (+Z) — 3/4 body, lead shoulder forward.
 * 2. Lead arm forward (often weapon); trail arm back + lower (often shield).
 * 3. Ipsilateral feet: same foot forward as the forward hand.
 * 4. Ready A-frame plant (width > depth, not a split) — both feet clear the
 *    torso in iso; trail slightly wider/back. Legs take a partial share of
 *    torso yaw so the plant tracks the ¾ body without spinning planted feet.
 *
 * Character root still faces +Z; BakeCanvas `rotationY` turns the whole sprite.
 * Torso yaw lives on the upper-body group only — head/face stay on root so
 * `applySpriteFaceCheat(bodyRotationY)` keeps matching iso facing, not torso twist.
 *
 * Default lead = right. Left-lead mirrors the same silhouette intent.
 */

export type LeadSide = "left" | "right";

/** Default ipsilateral lead for presets / unspecified specs. */
export const DEFAULT_LEAD: LeadSide = "right";

/** ~45° torso yaw magnitude (radians). */
export const TORSO_YAW = Math.PI / 4;

/**
 * Fraction of torso yaw applied to the legs group.
 * Enough to track the ¾ upper body; well below 1 so feet stay planted.
 */
export const LEGS_YAW_FRAC = 0.4;

/** +1 right, −1 left — matches arm/leg `side` loops. */
export function leadSign(lead: LeadSide = DEFAULT_LEAD): 1 | -1 {
  return lead === "left" ? -1 : 1;
}

/**
 * Upper-body yaw relative to facing (+Z).
 * Right-lead → negative Y (clockwise from above) so the right shoulder swings toward +Z.
 */
export function torsoYawForLead(lead: LeadSide = DEFAULT_LEAD): number {
  return -leadSign(lead) * TORSO_YAW;
}

/** Shared legs-group yaw — partial toward `torsoYawForLead`. */
export function legsYawForLead(lead: LeadSide = DEFAULT_LEAD): number {
  return torsoYawForLead(lead) * LEGS_YAW_FRAC;
}

export function resolveLeadSide(lead?: LeadSide): LeadSide {
  return lead ?? DEFAULT_LEAD;
}
