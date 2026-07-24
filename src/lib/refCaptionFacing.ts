/** 8-way iso facing clauses for training-ref captions. */

export type RefFacingId =
  | "up"
  | "away-tr"
  | "right"
  | "toward-br"
  | "down"
  | "toward-bl"
  | "left"
  | "away-tl";

export type RefFacingOption = {
  id: RefFacingId;
  /** Compact pad glyph */
  glyph: string;
  title: string;
  clause: string;
  /** CSS grid cell 1-based */
  row: number;
  col: number;
};

/** Pad layout matches screen directions (N at top). */
export const REF_FACING_OPTIONS: RefFacingOption[] = [
  {
    id: "away-tl",
    glyph: "↖",
    title: "Top-left",
    clause: "facing top-left",
    row: 1,
    col: 1,
  },
  {
    id: "up",
    glyph: "↑",
    title: "Top",
    clause: "facing top of frame",
    row: 1,
    col: 2,
  },
  {
    id: "away-tr",
    glyph: "↗",
    title: "Top-right",
    clause: "facing top-right",
    row: 1,
    col: 3,
  },
  {
    id: "left",
    glyph: "←",
    title: "Left",
    clause: "facing left",
    row: 2,
    col: 1,
  },
  {
    id: "right",
    glyph: "→",
    title: "Right",
    clause: "facing right",
    row: 2,
    col: 3,
  },
  {
    id: "toward-bl",
    glyph: "↙",
    title: "Bottom-left",
    clause: "facing bottom-left",
    row: 3,
    col: 1,
  },
  {
    id: "down",
    glyph: "↓",
    title: "Bottom",
    clause: "facing bottom of frame",
    row: 3,
    col: 2,
  },
  {
    id: "toward-br",
    glyph: "↘",
    title: "Bottom-right",
    clause: "facing bottom-right",
    row: 3,
    col: 3,
  },
];

const FACING_STRIP_RE =
  /(?:,\s*)?(?:isometric\s+)?facing\s+(?:toward\s+(?:the\s+)?(?:camera\s+(?:at\s+the\s+)?)?)?(?:the\s+)?(?:top-right|top-left|bottom-right|bottom-left|top of frame|bottom of frame|screen-up|screen-down|screen-right|screen-left|top right|top left|bottom right|bottom left|top|bottom|right|left|up|down)(?:\s+of\s+(?:the\s+)?frame)?/gi;

export function stripFacingClause(caption: string): string {
  let text = (caption || "").replace(FACING_STRIP_RE, "");
  text = text.replace(/\s*,\s*,+/g, ", ");
  text = text.replace(/^\s*,\s*/, "").replace(/\s*,\s*$/, "");
  return text.replace(/\s{2,}/g, " ").trim().replace(/^,+|,+$/g, "").trim();
}

export function parseFacingId(caption: string): RefFacingId | null {
  const low = (caption || "").toLowerCase();
  let best: RefFacingId | null = null;
  let bestLen = -1;
  for (const opt of REF_FACING_OPTIONS) {
    if (low.includes(opt.clause) && opt.clause.length > bestLen) {
      best = opt.id;
      bestLen = opt.clause.length;
    }
  }
  if (best) return best;
  const aliases: [string, RefFacingId][] = [
    ["bottom-right", "toward-br"],
    ["bottom right", "toward-br"],
    ["top-right", "away-tr"],
    ["top right", "away-tr"],
    ["bottom-left", "toward-bl"],
    ["bottom left", "toward-bl"],
    ["top-left", "away-tl"],
    ["top left", "away-tl"],
    ["screen-up", "up"],
    ["screen-down", "down"],
    ["screen-right", "right"],
    ["screen-left", "left"],
  ];
  for (const [needle, id] of aliases) {
    if (low.includes(needle)) return id;
  }
  return null;
}

export function applyFacingClause(
  caption: string,
  facingId: RefFacingId,
): string {
  const opt = REF_FACING_OPTIONS.find((o) => o.id === facingId);
  if (!opt) return caption;
  const base = stripFacingClause(caption);
  if (!base) return opt.clause;
  return `${base}, ${opt.clause}`;
}
