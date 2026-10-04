"use client";
/** Legacy #<tabId> hash URLs (e.g. /calculators#afford) → canonical calculator URLs. */
import { useEffect } from "react";
import { LEGACY_TAB_SLUGS, CALCULATOR_MAP } from "@/lib/calculators/registry";

export function LegacyHashRedirect() {
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;
    const slug = LEGACY_TAB_SLUGS[hash] ?? (CALCULATOR_MAP[hash] ? hash : null);
    if (slug) window.location.replace(`/calculators/${slug}`);
  }, []);
  return null;
}
