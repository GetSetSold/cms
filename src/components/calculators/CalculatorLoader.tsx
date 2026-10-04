"use client";
/**
 * Client wrapper that resolves the per-calculator dynamic loader.
 * The server page cannot call loadCalculator() directly because
 * next/dynamic loaders live in a client module.
 */
import type { CalculatorSettings } from "@/lib/calculators/types";
import { loadCalculator } from "./loaders";

export function CalculatorLoader({
  slug,
  settings,
}: {
  slug: string;
  settings: CalculatorSettings;
}) {
  const Calc = loadCalculator(slug);
  if (!Calc) return null;
  return <Calc settings={settings} />;
}
