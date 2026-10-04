"use client";
/**
 * Admin → Calculators settings form. Structured fields only — no raw JSON.
 * Saves to site_settings.calculators (JSONB), merged over code defaults.
 */
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  DEFAULT_CALCULATOR_SETTINGS,
  getCalculatorSettings,
  validateCalculatorSettings,
} from "@/lib/calculators/settings";
import type { CalculatorSettings } from "@/lib/calculators/types";

const TABS = [
  "Qualification & Stress Test",
  "Down Payment",
  "CMHC Premiums",
  "Land Transfer Tax & Rebates",
  "Assumptions",
] as const;

function Num({
  label, hint, value, onChange, step = 1, prefix, suffix,
}: {
  label: string; hint?: string; value: number; onChange: (v: number) => void;
  step?: number; prefix?: string; suffix?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[13px] font-semibold text-ink">{label}</span>
      <div className="relative max-w-xs">
        {prefix && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">{prefix}</span>}
        <input
          type="number" step={step} min={0} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className={`w-full rounded-[var(--radius-sm)] border border-line bg-white px-3 py-2 text-[14px] outline-none focus:border-accent ${prefix ? "pl-7" : ""} ${suffix ? "pr-10" : ""}`}
        />
        {suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">{suffix}</span>}
      </div>
      {hint && <span className="mt-1 block text-[12px] text-muted">{hint}</span>}
    </label>
  );
}

export function CalculatorSettingsForm({ initial }: { initial: unknown }) {
  const supabase = useMemo(() => createClient(), []);
  const [form, setForm] = useState<CalculatorSettings>(() => getCalculatorSettings(initial));
  const [tab, setTab] = useState<(typeof TABS)[number]>(TABS[0]);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof CalculatorSettings>(k: K, v: CalculatorSettings[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    const err = validateCalculatorSettings(form);
    if (err) {
      setMsg(err);
      return;
    }
    setSaving(true);
    setMsg(null);
    const payload = { ...form, lastUpdated: new Date().toISOString() };
    const { error } = await supabase.from("site_settings").update({ calculators: payload }).eq("id", 1);
    setSaving(false);
    if (error) setMsg(error.message);
    else {
      setForm(payload);
      setMsg("Saved. Calculator pages pick up the new assumptions immediately.");
    }
  }

  function resetDefaults() {
    if (!confirm("Reset all calculator settings to defaults?")) return;
    setForm({ ...DEFAULT_CALCULATOR_SETTINGS });
    setMsg("Reset to defaults — press Save to apply.");
  }

  const setTier = (i: number, k: "upTo" | "rate", v: number) =>
    setForm((f) => ({
      ...f,
      cmhcTiers: f.cmhcTiers.map((t, j) => (j === i ? { ...t, [k]: v } : t)),
    }));
  const addTier = () =>
    setForm((f) => ({ ...f, cmhcTiers: [...f.cmhcTiers, { upTo: 1, rate: 0 }] }));
  const removeTier = (i: number) =>
    setForm((f) => ({ ...f, cmhcTiers: f.cmhcTiers.filter((_, j) => j !== i) }));

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2 border-b border-line pb-1">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-t px-3 py-2 text-[13.5px] font-semibold transition ${
              tab === t ? "border-b-2 border-primary text-ink" : "text-muted hover:text-ink"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Qualification & Stress Test" && (
        <div className="grid max-w-2xl gap-5">
          <Num label="Stress-test buffer" hint="Added to the contract rate for the qualifying rate (e.g. contract + 2%)." value={form.stressBuffer} onChange={(v) => set("stressBuffer", v)} step={0.25} suffix="%" />
          <Num label="Stress-test floor" hint="Minimum qualifying rate, even if contract + buffer is lower." value={form.stressFloor} onChange={(v) => set("stressFloor", v)} step={0.05} suffix="%" />
          <Num label="GDS limit" hint="Max gross debt service ratio." value={form.gdsLimit} onChange={(v) => set("gdsLimit", v)} step={1} suffix="%" />
          <Num label="TDS limit" hint="Max total debt service ratio." value={form.tdsLimit} onChange={(v) => set("tdsLimit", v)} step={1} suffix="%" />
        </div>
      )}

      {tab === "Down Payment" && (
        <div className="grid max-w-2xl gap-5">
          <div className="grid grid-cols-2 gap-4">
            <Num label="Bracket 1 rate" value={form.dp1pct} onChange={(v) => set("dp1pct", v)} step={1} suffix="%" />
            <Num label="Bracket 1 max price" value={form.dp1max} onChange={(v) => set("dp1max", v)} prefix="$" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Num label="Bracket 2 rate" value={form.dp2pct} onChange={(v) => set("dp2pct", v)} step={1} suffix="%" />
            <Num label="Bracket 2 max price" value={form.dp2max} onChange={(v) => set("dp2max", v)} prefix="$" />
          </div>
          <Num label="Bracket 3 rate (above bracket 2 max)" value={form.dp3pct} onChange={(v) => set("dp3pct", v)} step={1} suffix="%" />
          <p className="text-[12px] text-muted">Canadian minimums today: {form.dp1pct}% to ${form.dp1max.toLocaleString()}, {form.dp2pct}% to ${form.dp2max.toLocaleString()}, {form.dp3pct}% above.</p>
        </div>
      )}

      {tab === "CMHC Premiums" && (
        <div className="max-w-2xl">
          <p className="mb-3 text-[13px] text-muted">Premium tiers by loan-to-value. No insurance is charged at or below 80% LTV.</p>
          <div className="overflow-hidden rounded-[var(--radius-sm)] border border-line">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-soft text-left">
                  <th className="px-4 py-2 text-xs uppercase text-muted">LTV up to</th>
                  <th className="px-4 py-2 text-xs uppercase text-muted">Premium rate</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {form.cmhcTiers.map((t, i) => (
                  <tr key={i} className="border-b border-line last:border-0">
                    <td className="px-4 py-2">
                      <input type="number" step={0.01} min={0} max={1} value={t.upTo}
                        onChange={(e) => setTier(i, "upTo", Number(e.target.value))}
                        className="w-24 rounded border border-line px-2 py-1 text-[13px]" />
                    </td>
                    <td className="px-4 py-2">
                      <input type="number" step={0.0005} min={0} max={1} value={t.rate}
                        onChange={(e) => setTier(i, "rate", Number(e.target.value))}
                        className="w-24 rounded border border-line px-2 py-1 text-[13px]" />
                      <span className="ml-2 text-[12px] text-muted">{(t.rate * 100).toFixed(2)}%</span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button type="button" onClick={() => removeTier(i)} className="text-[13px] font-medium text-red-600 hover:underline">Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" onClick={addTier} className="mt-3 rounded-[var(--radius-sm)] border border-line px-4 py-2 text-[13px] font-semibold hover:border-accent">+ Add tier</button>
        </div>
      )}

      {tab === "Land Transfer Tax & Rebates" && (
        <div className="grid max-w-2xl gap-5">
          <Num label="Ontario first-time buyer rebate" hint="Max rebate against Ontario land transfer tax." value={form.onRebate} onChange={(v) => set("onRebate", v)} prefix="$" />
          <Num label="Toronto first-time buyer rebate" hint="Max rebate against Toronto MLTT." value={form.toRebate} onChange={(v) => set("toRebate", v)} prefix="$" />
          <p className="text-[12px] text-muted">Bracket rates (0.5%–2.5%) follow the standard Ontario schedule and are baked into the calculation code.</p>
        </div>
      )}

      {tab === "Assumptions" && (
        <div className="grid max-w-2xl gap-5">
          <label className="block">
            <span className="mb-1 block text-[13px] font-semibold text-ink">Effective date</span>
            <input type="date" value={form.effectiveDate} onChange={(e) => set("effectiveDate", e.target.value)}
              className="max-w-xs rounded-[var(--radius-sm)] border border-line bg-white px-3 py-2 text-[14px] outline-none focus:border-accent" />
            <span className="mt-1 block text-[12px] text-muted">Shown on calculator pages under the results ("Assumptions effective …"). Update when rules change.</span>
          </label>
          {form.lastUpdated && (
            <p className="text-[12px] text-muted">Last saved {new Date(form.lastUpdated).toLocaleString("en-CA")}.</p>
          )}
          <div className="rounded-[var(--radius-sm)] border border-line bg-soft p-4 text-[13px] leading-6 text-muted">
            These settings drive every calculator's math (stress-test rate, GDS/TDS limits, down-payment
            brackets, CMHC tiers, rebates). Changes apply immediately — no deploy needed. PDF reports
            stamp the effective date on the assumptions note.
          </div>
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-line pt-5">
        <button type="button" onClick={save} disabled={saving}
          className="rounded-[var(--radius-sm)] bg-primary px-6 py-2.5 text-[14px] font-semibold text-white hover:opacity-90 disabled:opacity-60">
          {saving ? "Saving…" : "Save changes"}
        </button>
        <button type="button" onClick={resetDefaults} className="rounded-[var(--radius-sm)] border border-line px-4 py-2.5 text-[13.5px] font-semibold text-muted hover:text-ink">
          Reset to defaults
        </button>
        {msg && <span className={`text-[13.5px] font-medium ${msg.startsWith("Saved") ? "text-emerald-600" : "text-red-600"}`}>{msg}</span>}
      </div>
    </div>
  );
}
