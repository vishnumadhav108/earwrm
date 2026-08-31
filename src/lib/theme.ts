/** Colour + type tokens lifted from the Claude Design prototype. */
export const C = {
  bg: "#0a0a0b",
  sheet: "#131316",
  modal: "#17171b",
  accent: "#8f6bf0",
  accentLt: "#a88bf5",
  danger: "#e06b6b",
  dangerFg: "#1a0d0d",

  /** white alpha ramp — the prototype's only greys */
  w92: "rgba(255,255,255,.92)",
  w88: "rgba(255,255,255,.88)",
  w82: "rgba(255,255,255,.82)",
  w80: "rgba(255,255,255,.8)",
  w78: "rgba(255,255,255,.78)",
  w75: "rgba(255,255,255,.75)",
  w72: "rgba(255,255,255,.72)",
  w66: "rgba(255,255,255,.66)",
  w62: "rgba(255,255,255,.62)",
  w60: "rgba(255,255,255,.6)",
  w55: "rgba(255,255,255,.55)",
  w50: "rgba(255,255,255,.5)",
  w48: "rgba(255,255,255,.48)",
  w45: "rgba(255,255,255,.45)",
  w42: "rgba(255,255,255,.42)",
  w40: "rgba(255,255,255,.4)",
  w38: "rgba(255,255,255,.38)",
  w36: "rgba(255,255,255,.36)",
  w34: "rgba(255,255,255,.34)",
  w32: "rgba(255,255,255,.32)",
  w30: "rgba(255,255,255,.3)",
  w28: "rgba(255,255,255,.28)",
  w24: "rgba(255,255,255,.24)",
  w22: "rgba(255,255,255,.22)",
  w16: "rgba(255,255,255,.16)",
  w15: "rgba(255,255,255,.15)",
  w14: "rgba(255,255,255,.14)",
  w12: "rgba(255,255,255,.12)",
  w11: "rgba(255,255,255,.11)",
  w10: "rgba(255,255,255,.1)",
  w08: "rgba(255,255,255,.08)",
  w07: "rgba(255,255,255,.07)",
  w06: "rgba(255,255,255,.06)",
  w055: "rgba(255,255,255,.055)",
  w05: "rgba(255,255,255,.05)",
  w045: "rgba(255,255,255,.045)",
  w04: "rgba(255,255,255,.04)",
  w035: "rgba(255,255,255,.035)",
  w03: "rgba(255,255,255,.03)",

  /** on/off/active used by the segmented control + tab bar */
  on: "#fff",
  off: "rgba(255,255,255,.42)",
  segActive: "rgba(255,255,255,.12)",

  purBg: "rgba(143,107,240,.13)",
  purBorder: "rgba(168,139,245,.45)",
  dangerBorder: "rgba(224,107,107,.32)",
  dangerBorderSoft: "rgba(224,107,107,.28)",
} as const;

/** Screens clear the status bar with a fixed inset in the prototype's frame. */
export const TOP = 56;
export const TOP_LOG = 58;

export const label = (size = 10) =>
  ({ font: `500 ${size}px/1 var(--font-archivo), Archivo, sans-serif`, letterSpacing: ".2em", color: C.w30 }) as const;
