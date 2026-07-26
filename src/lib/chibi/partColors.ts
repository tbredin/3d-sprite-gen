import type { CharacterSpec } from "./types";
import type { PartId } from "./random";

export type PartColorSlot = {
  id: string;
  label: string;
  value: string;
};

/**
 * Upper bound of colour slots a part can expose.
 * Used to keep the swatch stack a constant width across rerolls.
 */
export function maxPartColorSlots(part: PartId): number {
  switch (part) {
    case "head":
      return 4; // skin, hair, helmet, visor
    case "torso":
      return 7; // cloth, trim, details, hem, cape, pouch, back
    case "arms":
      return 4; // sleeve, hand, weapon, offhand
    case "legs":
      return 2; // pants, boots
  }
}

/** Colour channels owned by a part (mirrors `rerollPartColors` coverage). */
export function listPartColorSlots(
  spec: CharacterSpec,
  part: PartId,
): PartColorSlot[] {
  if (part === "head") {
    const slots: PartColorSlot[] = [
      { id: "skin", label: "Skin", value: spec.skin },
    ];
    if (spec.hair) {
      slots.push({ id: "hair", label: "Hair", value: spec.hair.color });
    }
    if (spec.helmet && spec.helmet.style !== "none") {
      slots.push({ id: "helmet", label: "Helmet", value: spec.helmet.color });
      if (spec.helmet.visor) {
        slots.push({ id: "visor", label: "Visor", value: spec.helmet.visor });
      }
    }
    return slots;
  }

  if (part === "torso") {
    const slots: PartColorSlot[] = [
      { id: "torso", label: "Cloth", value: spec.torso.color },
    ];
    if (spec.torso.trim) {
      slots.push({ id: "trim", label: "Trim", value: spec.torso.trim });
    }
    if (
      (spec.torso.detailStyle ?? "classic") !== "none" &&
      spec.torso.detailColor
    ) {
      slots.push({
        id: "details",
        label: "Details",
        value: spec.torso.detailColor,
      });
    }
    const a = spec.accessories;
    if (a?.hem && a.hem !== "none" && a.hemColor) {
      slots.push({ id: "hem", label: "Hem", value: a.hemColor });
    }
    if (a?.cape && a.capeColor) {
      slots.push({ id: "cape", label: "Cape", value: a.capeColor });
    }
    if (a?.pouches && a.pouchColor) {
      slots.push({ id: "pouch", label: "Pouch", value: a.pouchColor });
    }
    if (a?.backLoadout && a.backLoadout !== "none" && a.backLoadoutColor) {
      slots.push({ id: "back", label: "Back", value: a.backLoadoutColor });
    }
    return slots;
  }

  if (part === "arms") {
    const slots: PartColorSlot[] = [
      {
        id: "sleeve",
        label: "Sleeve",
        value: spec.arms.sleeveColor ?? spec.torso.color,
      },
      {
        id: "hand",
        label: "Hands",
        value: spec.arms.handColor ?? spec.skin,
      },
    ];
    if (spec.weapon && spec.weapon.type !== "none") {
      slots.push({ id: "weapon", label: "Weapon", value: spec.weapon.color });
    }
    if (spec.offhand && spec.offhand.type !== "none") {
      slots.push({ id: "offhand", label: "Offhand", value: spec.offhand.color });
    }
    return slots;
  }

  return [
    { id: "pants", label: "Pants", value: spec.legs.pantColor },
    { id: "boots", label: "Boots", value: spec.legs.bootColor },
  ];
}

/** Apply a hex (`#rrggbb` or bare) to one part colour slot. */
export function setPartColorSlot(
  spec: CharacterSpec,
  part: PartId,
  slotId: string,
  hex: string,
): CharacterSpec {
  const color = hex.startsWith("#") ? hex : `#${hex}`;
  const next = structuredClone(spec);

  if (part === "head") {
    if (slotId === "skin") next.skin = color;
    else if (slotId === "hair" && next.hair) next.hair.color = color;
    else if (slotId === "eyes") {
      next.face = { ...next.face, eyeColor: color };
    } else if (slotId === "helmet" && next.helmet) {
      next.helmet.color = color;
    } else if (slotId === "visor" && next.helmet) {
      next.helmet.visor = color;
    }
    return next;
  }

  if (part === "torso") {
    if (slotId === "torso") next.torso.color = color;
    else if (slotId === "trim") next.torso.trim = color;
    else if (slotId === "details") next.torso.detailColor = color;
    else if (slotId === "hem") {
      next.accessories = { ...next.accessories, hemColor: color };
    } else if (slotId === "cape") {
      next.accessories = { ...next.accessories, capeColor: color };
    } else if (slotId === "pouch") {
      next.accessories = { ...next.accessories, pouchColor: color };
    } else if (slotId === "back") {
      next.accessories = { ...next.accessories, backLoadoutColor: color };
    }
    return next;
  }

  if (part === "arms") {
    if (slotId === "sleeve") {
      next.arms = { ...next.arms, sleeveColor: color };
    } else if (slotId === "hand") {
      next.arms = { ...next.arms, handColor: color };
    } else if (slotId === "weapon" && next.weapon) {
      next.weapon = { ...next.weapon, color };
    } else if (slotId === "offhand" && next.offhand) {
      next.offhand = { ...next.offhand, color };
    }
    return next;
  }

  if (slotId === "pants") next.legs.pantColor = color;
  else if (slotId === "boots") next.legs.bootColor = color;
  return next;
}
