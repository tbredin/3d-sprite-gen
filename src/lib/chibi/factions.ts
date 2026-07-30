/**
 * Faction theming for character rolls and AI variation prompts.
 * Primary: solar, royal, nature, demon.
 * Subfactions: machine (royal+demon), goblin (nature+demon), light (solar+nature).
 */

import type { FactionId, HelmetStyle } from "./types";
import { MONSTER_HELMETS } from "./types";

export type FactionKind = "none" | "primary" | "sub";

export type FactionTheme = {
  id: FactionId;
  label: string;
  kind: FactionKind;
  /** Short phrase for AI variation prompts. */
  promptBit: string;
  cloth: readonly string[];
  trim: readonly string[];
  metal: readonly string[];
  eye: readonly string[];
  /** Soft bias: prefer cape when rolling torso accessories. */
  capeBias: number;
  /** Soft bias toward armored torsos (0–1 extra weight). */
  armorBias: number;
  /** Chance a full-character / head roll opens closed knight-style helms. */
  helmetBias: number;
  /** Chance a roll injects animal / monster head replacements. */
  monsterBias: number;
};

/** Closed / royal knight shells favoured when helmet bias fires. */
export const FACTION_ROYAL_HELMETS: readonly HelmetStyle[] = [
  "knight",
  "knightGreat",
  "knightWinged",
  "knightSallet",
  "knightBarbute",
  "knightBascinet",
  "king",
  "crown",
];

export function factionMonsterHelmets(): HelmetStyle[] {
  return [...MONSTER_HELMETS];
}

export const FACTION_THEMES: Record<Exclude<FactionId, "none">, FactionTheme> = {
  solar: {
    id: "solar",
    label: "Solar",
    kind: "primary",
    promptBit:
      "Solar scavenger-scientist look — earthy desert yellows with solar-panel greens and blues, advanced tech gear",
    cloth: ["#c7b446", "#e8a04a", "#f5e07a", "#8b5a2b", "#3d6e70", "#5ad4a0", "#3a9bb5"],
    trim: ["#3d6e70", "#5ad4a0", "#3a9bb5", "#c7cfcc", "#f5e07a"],
    metal: ["#9aa4b0", "#c7cfcc", "#c7b446", "#5a6a7a"],
    eye: ["#3a9bb5", "#5ad4a0", "#f5e07a", "#e8a04a"],
    capeBias: 0.35,
    armorBias: 0.25,
    helmetBias: 0,
    monsterBias: 0,
  },
  royal: {
    id: "royal",
    label: "Royal",
    kind: "primary",
    promptBit:
      "Royal ice knight — cool blues and silvers, gem-encrusted armour, flowing royal cape",
    cloth: ["#3a9bb5", "#5a6a7a", "#9aa4b0", "#c7cfcc", "#433455", "#5a4a7a"],
    trim: ["#c7cfcc", "#f5e07a", "#5ad4a0", "#e83b3b"],
    metal: ["#c7cfcc", "#9aa4b0", "#e8e4d8", "#7a8090"],
    eye: ["#3a9bb5", "#c7cfcc", "#5ad4a0", "#f5e07a"],
    capeBias: 0.85,
    armorBias: 0.7,
    helmetBias: 0.55,
    monsterBias: 0,
  },
  nature: {
    id: "nature",
    label: "Nature",
    kind: "primary",
    promptBit:
      "Nature faction wildling — earthy reds and oranges, animal-touched silhouette, woodland tones",
    cloth: ["#e83b3b", "#e8a04a", "#8b5a2b", "#3d5c40", "#5a4030", "#c98a6a"],
    trim: ["#8b5a2b", "#e8a04a", "#3d5c40", "#c7b446"],
    metal: ["#8b5a2b", "#7a8090", "#5a4030"],
    eye: ["#e83b3b", "#e8a04a", "#3d5c40", "#5ad4a0"],
    capeBias: 0.45,
    armorBias: 0.2,
    helmetBias: 0,
    monsterBias: 0.5,
  },
  demon: {
    id: "demon",
    label: "Demon",
    kind: "primary",
    promptBit:
      "Demon death-themed look — dark purples, reds and blues, chains bones and steel",
    cloth: ["#433455", "#5b3d8a", "#5a4a7a", "#e83b3b", "#3a9bb5", "#2a2035"],
    trim: ["#e83b3b", "#9aa4b0", "#c7cfcc", "#5b3d8a"],
    metal: ["#7a8090", "#9aa4b0", "#5a6a7a", "#433455"],
    eye: ["#e83b3b", "#5b3d8a", "#3a9bb5", "#e8a04a"],
    capeBias: 0.55,
    armorBias: 0.45,
    helmetBias: 0,
    monsterBias: 0.5,
  },
  machine: {
    id: "machine",
    label: "Machine",
    kind: "sub",
    promptBit:
      "Machine undead ice-knight — shredded cloak, skeletal dark armour, sometimes fiery weapon accents (royal turned demon)",
    cloth: ["#433455", "#5a6a7a", "#2a2035", "#7a8090", "#9aa4b0", "#e83b3b"],
    trim: ["#e83b3b", "#e8a04a", "#c7cfcc", "#5b3d8a"],
    metal: ["#9aa4b0", "#7a8090", "#5a6a7a", "#c7cfcc"],
    eye: ["#e83b3b", "#e8a04a", "#c7cfcc", "#3a9bb5"],
    capeBias: 0.75,
    armorBias: 0.8,
    helmetBias: 0.4,
    monsterBias: 0.3,
  },
  goblin: {
    id: "goblin",
    label: "Goblin",
    kind: "sub",
    promptBit:
      "Goblin look — browns and oranges, rusty armour, beady red eyes (nature crossed with demon)",
    cloth: ["#8b5a2b", "#5a4030", "#e8a04a", "#6a5848", "#7a4a50", "#c98a6a"],
    trim: ["#e83b3b", "#e8a04a", "#8b5a2b", "#7a8090"],
    metal: ["#8b5a2b", "#7a8090", "#5a4030", "#6a5848"],
    eye: ["#e83b3b", "#e8a04a", "#8b5a2b"],
    capeBias: 0.3,
    armorBias: 0.4,
    helmetBias: 0,
    monsterBias: 0.55,
  },
  light: {
    id: "light",
    label: "Light",
    kind: "sub",
    promptBit:
      "Light lighthouse cleric — soft sepia yellows and beiges, holy keeper robes (solar crossed with nature)",
    cloth: ["#f5e07a", "#ffe0bd", "#e8e4d8", "#c7b446", "#f0d48a", "#e8b888"],
    trim: ["#c7b446", "#f5e07a", "#c7cfcc", "#e8a04a"],
    metal: ["#c7cfcc", "#e8e4d8", "#f5e07a", "#9aa4b0"],
    eye: ["#f5e07a", "#e8a04a", "#3a9bb5", "#c7cfcc"],
    capeBias: 0.65,
    armorBias: 0.15,
    helmetBias: 0,
    monsterBias: 0,
  },
};

export type FactionGearBias = {
  /** Open closed/replacement helms for this roll. */
  allowHelmets: boolean;
  /** Inject and favour animal / monster heads for this roll. */
  allowMonsters: boolean;
};

/** Roll soft gear gates from faction theme (+ session Helmets preference). */
export function rollFactionGearBias(
  faction: FactionId | undefined,
  sessionAllowHelmets: boolean,
): FactionGearBias {
  const theme = factionTheme(faction);
  return {
    allowHelmets:
      sessionAllowHelmets ||
      (theme != null && Math.random() < theme.helmetBias),
    allowMonsters: theme != null && Math.random() < theme.monsterBias,
  };
}

export function factionTheme(id: FactionId | undefined): FactionTheme | null {
  if (!id || id === "none") return null;
  return FACTION_THEMES[id] ?? null;
}

export function factionPromptBit(id: FactionId | undefined): string | null {
  return factionTheme(id)?.promptBit ?? null;
}

export function pickFactionColor(
  id: FactionId | undefined,
  slot: "cloth" | "trim" | "metal" | "eye",
  fallback: readonly string[],
): string {
  const theme = factionTheme(id);
  const pool = theme?.[slot] ?? fallback;
  return pool[Math.floor(Math.random() * pool.length)] ?? fallback[0]!;
}
