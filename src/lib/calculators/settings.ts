/**
 * Calculator regulatory/default settings.
 * Stored in site_settings.calculators (JSONB). One row read — getSettings()
 * already selects *, so this adds zero extra queries.
 */
import type { CalculatorSettings } from "./types";

/** Matches the legacy CFG_DEFAULTS so math is identical out of the box. */
export const DEFAULT_CALCULATOR_SETTINGS: CalculatorSettings = {
  stressBuffer: 2,
  stressFloor: 5.25,
  gdsLimit: 32,
  tdsLimit: 40,
  dp1pct: 5,
  dp1max: 500000,
  dp2pct: 10,
  dp2max: 1000000,
  dp3pct: 20,
  cmhcTiers: [
    { upTo: 0.65, rate: 0 },
    { upTo: 0.75, rate: 0.024 },
    { upTo: 0.8, rate: 0.0315 },
    { upTo: 0.85, rate: 0.04 },
    { upTo: 0.9, rate: 0.0525 },
    { upTo: 0.95, rate: 0.06 },
    { upTo: 1, rate: 0.068 },
  ],
  onRebate: 4000,
  toRebate: 4475,
  effectiveDate: "2026-01-01",
};

/**
 * Merge stored settings over the defaults. Unknown/missing keys fall back to
 * defaults so an empty or partial JSONB column never breaks the calculators.
 */
export function getCalculatorSettings(stored: unknown): CalculatorSettings {
  const s = (stored ?? {}) as Partial<CalculatorSettings>;
  const merged: CalculatorSettings = {
    ...DEFAULT_CALCULATOR_SETTINGS,
    ...s,
    cmhcTiers:
      Array.isArray(s.cmhcTiers) && s.cmhcTiers.length > 0
        ? s.cmhcTiers
            .filter((t) => typeof t?.upTo === "number" && typeof t?.rate === "number")
            .sort((a, b) => a.upTo - b.upTo)
        : DEFAULT_CALCULATOR_SETTINGS.cmhcTiers,
  };
  // Guard numeric fields against bad admin input
  for (const k of [
    "stressBuffer",
    "stressFloor",
    "gdsLimit",
    "tdsLimit",
    "dp1pct",
    "dp1max",
    "dp2pct",
    "dp2max",
    "dp3pct",
    "onRebate",
    "toRebate",
  ] as const) {
    const v = Number(merged[k]);
    merged[k] = Number.isFinite(v) && v >= 0 ? v : DEFAULT_CALCULATOR_SETTINGS[k];
  }
  if (typeof merged.effectiveDate !== "string" || !merged.effectiveDate) {
    merged.effectiveDate = DEFAULT_CALCULATOR_SETTINGS.effectiveDate;
  }
  return merged;
}

/** Shape-check a settings object before saving from admin. Returns error or null. */
export function validateCalculatorSettings(s: CalculatorSettings): string | null {
  if (s.stressFloor < 0 || s.stressFloor > 20) return "Stress-test floor must be between 0 and 20.";
  if (s.gdsLimit <= 0 || s.gdsLimit > 60) return "GDS limit looks wrong (expected 1–60).";
  if (s.tdsLimit <= 0 || s.tdsLimit > 60) return "TDS limit looks wrong (expected 1–60).";
  if (s.dp1max >= s.dp2max) return "Down-payment bracket 1 max must be below bracket 2 max.";
  if (s.cmhcTiers.length === 0) return "At least one CMHC tier is required.";
  return null;
}
