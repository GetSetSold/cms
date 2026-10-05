"use client";
/**
 * Client wrapper that resolves the per-calculator dynamic loader.
 * The server page cannot call loadCalculator() directly because
 * next/dynamic loaders live in a client module.
 */
import type { CalculatorSettings } from "@/lib/calculators/types";
import type { AffordabilityListing } from "./affordability/pdf";
import { loadCalculator } from "./loaders";

export function CalculatorLoader({
  slug,
  settings,
  initialMls,
  initialListing,
}: {
  slug: string;
  settings: CalculatorSettings;
  initialMls?: string;
  initialListing?: AffordabilityListing | null;
}) {
  const Calc = loadCalculator(slug);
  if (!Calc) return null;
  return <Calc settings={settings} initialMls={initialMls} initialListing={initialListing} />;
}
