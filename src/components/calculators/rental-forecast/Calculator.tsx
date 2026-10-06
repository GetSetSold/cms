"use client";
/**
 * Rental Investment Forecast Calculator.
 * Year-by-year cash-flow / equity forecast with an optional sale scenario.
 * The heavy yearly table lives in a <details> block; the PDF gets all rows.
 */
import { useMemo, useState } from "react";
import { fmtCAD, fmtCADmo, todayISO } from "@/lib/calculators/math";
import type { CalculatorSettings } from "@/lib/calculators/types";
import {
  Card,
  CurrencyInput,
  Field,
  NumberInput,
  ResultHero,
  SimpleTable,
  Slider,
  Toggle,
} from "../ui";
import { ReportButtons } from "../ReportButtons";
import {
  buildRentalForecastPdf,
  computeRentalForecast,
  type RentalCustomItem,
} from "./pdf";

function MetricBox({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  const color = tone === "good" ? "text-emerald-600" : tone === "bad" ? "text-red-600" : "text-ink";
  return (
    <div className="rounded-[var(--radius-sm)] border border-line bg-white px-3 py-3 shadow-[var(--shadow)]">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className={`mt-1 text-[16px] font-bold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}

function MiniSwitch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="shrink-0"
    >
      <span className={`relative block h-6 w-11 rounded-[var(--radius-label)] transition ${checked ? "bg-accent" : "bg-neutral-300"}`}>
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-[22px]" : "left-0.5"}`}
        />
      </span>
    </button>
  );
}

export function RentalForecastCalculator({ settings }: { settings: CalculatorSettings }) {
  void settings;
  const [price, setPrice] = useState(600000);
  const [downPct, setDownPct] = useState(20);
  const [rate, setRate] = useState(5.5);
  const [term, setTerm] = useState(5);
  const [amort, setAmort] = useState(25);
  const [rent, setRent] = useState(2500);
  const [rentInc, setRentInc] = useState(2);
  const [tax, setTax] = useState(3500);
  const [ins, setIns] = useState(1800);
  const [mgmtPct, setMgmtPct] = useState(8);
  const [maint, setMaint] = useState(200);
  const [vacPct, setVacPct] = useState(3);
  const [condoOn, setCondoOn] = useState(false);
  const [condoAmt, setCondoAmt] = useState(0);
  const [customItems, setCustomItems] = useState<RentalCustomItem[]>([]);
  const [addName, setAddName] = useState("");
  const [addAmt, setAddAmt] = useState(0);
  const [addError, setAddError] = useState(false);
  const [apprec, setApprec] = useState(4);
  const [sellEnabled, setSellEnabled] = useState(false);
  const [sellYear, setSellYear] = useState(10);
  const [sellCostPct, setSellCostPct] = useState(6);
  const [years, setYears] = useState(10);

  const s = useMemo(
    () =>
      computeRentalForecast({
        price, downPct, rate, term, amort, rent, rentInc, tax, ins, mgmtPct, maint,
        vacPct, condoOn, condoAmt, customItems, apprec, sellEnabled, sellYear,
        sellCostPct, years,
      }),
    [price, downPct, rate, term, amort, rent, rentInc, tax, ins, mgmtPct, maint, vacPct, condoOn, condoAmt, customItems, apprec, sellEnabled, sellYear, sellCostPct, years],
  );

  const addCustom = () => {
    if (!addName.trim()) {
      setAddError(true);
      setTimeout(() => setAddError(false), 1500);
      return;
    }
    setCustomItems((prev) => [
      ...prev,
      { id: `rfc_${Date.now()}`, name: addName.trim(), amt: Math.max(0, addAmt) },
    ]);
    setAddName("");
    setAddAmt(0);
  };
  const removeCustom = (id: string) => setCustomItems((prev) => prev.filter((c) => c.id !== id));
  const updateCustom = (id: string, v: number) =>
    setCustomItems((prev) => prev.map((c) => (c.id === id ? { ...c, amt: Math.max(0, v) } : c)));

  const y1 = s.rows[0];
  const last = s.rows[s.rows.length - 1];
  const maxVal = Math.max(1, ...s.rows.flatMap((r) => [r.rent, r.totalExp]));

  const tableCols = ["Year", "Rent", "Mortgage", "Principal", "Expenses", "Net CF", "Cumulative", "Prop Value", "Equity"];
  if (s.sellEnabled) tableCols.push("Sale");
  const tableRows = s.rows.map((r) => {
    const row: (string | number)[] = [
      `Yr ${r.year}`,
      fmtCAD(r.rent),
      fmtCAD(r.mort),
      fmtCAD(r.prin),
      fmtCAD(r.totalExp - r.mort),
      `${r.netCf >= 0 ? "+" : ""}${fmtCAD(r.netCf)}`,
      `${r.cumCf >= 0 ? "+" : ""}${fmtCAD(r.cumCf)}`,
      fmtCAD(r.propVal),
      fmtCAD(r.equity),
    ];
    if (s.sellEnabled) {
      row.push(
        r.isSell && r.netProceeds !== undefined
          ? `${r.netProceeds >= 0 ? "+" : ""}${fmtCAD(r.netProceeds)}`
          : "—",
      );
    }
    return row;
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        <div className="space-y-6">
          <Card title="Property & Mortgage">
            <div className="space-y-4">
              <Field label="Purchase Price">
                <CurrencyInput value={price} onChange={setPrice} />
              </Field>
              <Field label={`Down Payment — ${fmtCAD(s.down)} (${downPct}%)`} hint="Minimum 5% for properties under $500K. 20% avoids mortgage default insurance.">
                <Slider value={downPct} onChange={setDownPct} min={5} max={50} step={1} />
              </Field>
              <div className="rounded-[var(--radius-sm)] bg-soft px-3 py-2.5">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="font-bold text-ink">Mortgage Amount</span>
                  <span className="font-bold tabular-nums text-ink">{fmtCAD(s.mortgage)}</span>
                </div>
              </div>
              <Field label={`Mortgage Rate — ${rate.toFixed(1)}%`}>
                <Slider value={rate} onChange={setRate} min={0.5} max={12} step={0.1} />
              </Field>
              <Field
                label={`Mortgage Term — ${term} year${term > 1 ? "s" : ""}`}
                hint="The length of your mortgage contract (1-10 years). Rate is locked for this period. At renewal, rates may change."
              >
                <Slider value={term} onChange={setTerm} min={1} max={10} step={1} />
              </Field>
              <Field label={`Amortization — ${amort} years`}>
                <Slider value={amort} onChange={setAmort} min={5} max={30} step={5} />
              </Field>
              <div className="rounded-[var(--radius-sm)] bg-soft px-3 py-2.5">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="font-bold text-ink">Principal Paid During Term</span>
                  <span className="font-bold tabular-nums text-ink">{fmtCAD(s.termPrin)}</span>
                </div>
                <div className="mt-1 text-[12px] text-muted">
                  Principal paid off over the {s.term}-year term. Remaining balance at renewal: {fmtCAD(s.termBal)}.
                </div>
              </div>
            </div>
          </Card>

          <Card title="Rental Income">
            <div className="space-y-4">
              <Field label={`Monthly Rent — ${fmtCAD(rent)}`}>
                <Slider value={rent} onChange={setRent} min={500} max={15000} step={100} />
              </Field>
              <Field
                label={`Annual Rent Increase — ${rentInc.toFixed(1)}%`}
                hint="Typical rent increases in Ontario are 1-3% per year under the Rent Increase Guideline."
              >
                <Slider value={rentInc} onChange={setRentInc} min={0} max={8} step={0.5} />
              </Field>
            </div>
          </Card>

          <Card title="Operating Expenses">
            <div className="space-y-4">
              <Field label={`Property Tax / Year — ${fmtCAD(tax)}`}>
                <Slider value={tax} onChange={setTax} min={0} max={20000} step={100} />
              </Field>
              <Field label={`Home Insurance / Year — ${fmtCAD(ins)}`}>
                <Slider value={ins} onChange={setIns} min={0} max={10000} step={100} />
              </Field>
              <Field
                label={`Property Management Fee — ${mgmtPct.toFixed(1)}% (${fmtCAD((rent * 12 * mgmtPct) / 100)}/yr)`}
                hint="Typical management fee is 6-10% of gross rent. Set to 0% if self-managing."
              >
                <Slider value={mgmtPct} onChange={setMgmtPct} min={0} max={15} step={0.5} />
              </Field>
              <Field
                label={`Maintenance Reserve / Month — ${fmtCAD(maint)}`}
                hint="Budget 1% of property value per year for repairs."
              >
                <Slider value={maint} onChange={setMaint} min={0} max={1500} step={25} />
              </Field>
              <Field
                label={`Vacancy Allowance — ${vacPct.toFixed(1)}% (${fmtCAD((rent * 12 * vacPct) / 100)}/yr)`}
                hint="Ontario vacancy rate averages 2-4%. Accounts for turnover and non-payment."
              >
                <Slider value={vacPct} onChange={setVacPct} min={0} max={15} step={0.5} />
              </Field>
              <div className="rounded-[var(--radius-sm)] border border-line p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[13.5px] font-semibold text-ink">Condo / HOA Fees</div>
                    <div className="mt-0.5 text-[12px] text-muted">Monthly condo or homeowners association fees. Toggle on if applicable.</div>
                  </div>
                  <MiniSwitch checked={condoOn} onChange={setCondoOn} label="Condo / HOA Fees" />
                </div>
                {condoOn && (
                  <div className="mt-2 w-36">
                    <NumberInput value={condoAmt} onChange={setCondoAmt} />
                  </div>
                )}
              </div>
              {customItems.map((c) => (
                <div key={c.id} className="rounded-[var(--radius-sm)] border border-line p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-[13.5px] font-semibold text-ink">{c.name}</div>
                      <div className="text-[12px] text-muted">Custom expense ({fmtCAD(c.amt)}/mo)</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeCustom(c.id)}
                      aria-label={`Remove ${c.name}`}
                      className="rounded-[var(--radius-sm)] border border-line px-2.5 py-2 text-[13px] font-semibold text-muted hover:text-red-600"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="mt-2 w-36">
                    <NumberInput value={c.amt} onChange={(v) => updateCustom(c.id, v)} />
                  </div>
                </div>
              ))}
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="Add custom expense..."
                  className={`flex-1 rounded-[var(--radius-sm)] border bg-white px-3 py-2.5 text-[14px] outline-none focus:border-accent ${addError ? "border-red-500" : "border-line"}`}
                />
                <div className="w-28">
                  <NumberInput value={addAmt} onChange={setAddAmt} />
                </div>
                <button
                  type="button"
                  onClick={addCustom}
                  className="rounded-[var(--radius-sm)] bg-primary px-4 py-2.5 text-[14px] font-semibold text-white hover:opacity-90"
                >
                  + Add
                </button>
              </div>
            </div>
          </Card>

          <Card title="Appreciation & Sale Scenario">
            <div className="space-y-4">
              <Field label={`Annual Appreciation Rate — ${apprec.toFixed(1)}%`}>
                <Slider value={apprec} onChange={setApprec} min={0} max={12} step={0.5} />
              </Field>
              <Toggle checked={sellEnabled} onChange={setSellEnabled} label="Include Sale Scenario" />
              <div className={sellEnabled ? "" : "pointer-events-none opacity-40"}>
                <div className="space-y-4">
                  <Field label={`Sell in Year — ${sellYear}`}>
                    <Slider value={sellYear} onChange={(v) => setSellYear(Math.min(v, years))} min={1} max={years} step={1} />
                  </Field>
                  <Field
                    label={`Selling Costs — ${sellCostPct.toFixed(1)}%`}
                    hint="Realtor commission + legal fees + other closing costs. Typical 5-7%."
                  >
                    <Slider value={sellCostPct} onChange={setSellCostPct} min={1} max={12} step={0.5} />
                  </Field>
                </div>
              </div>
            </div>
          </Card>

          <Card title="Forecast Period">
            <Field label={`Number of Years to Forecast — ${years} year${years > 1 ? "s" : ""}`}>
              <Slider value={years} onChange={setYears} min={1} max={25} step={1} />
            </Field>
          </Card>
        </div>

        <div className="space-y-6">
          {y1 && (
            <ResultHero
              label="Year 1 Monthly Cash Flow"
              value={`${fmtCAD(y1.netCf / 12)}/mo`}
              sub={y1.netCf >= 0 ? `Year 1 annual cash flow: ${fmtCAD(y1.netCf)}` : `Year 1 negative cash flow: ${fmtCAD(Math.abs(y1.netCf))}/yr`}
            />
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <MetricBox label="Cap Rate" value={`${s.capRate.toFixed(2)}%`} />
            <MetricBox label="Cash-on-Cash" value={`${s.cocReturn.toFixed(1)}%`} />
            <MetricBox label="Total Cash Flow" value={fmtCAD(s.cumCf)} tone={s.cumCf >= 0 ? "good" : "bad"} />
            {last && (
              <>
                <MetricBox label="Property Value" value={fmtCAD(last.propVal)} />
                <MetricBox label="Total Equity" value={fmtCAD(last.equity)} />
                <MetricBox label={s.m6Label} value={fmtCAD(s.m6Value)} tone={s.m6Value >= 0 ? "good" : "bad"} />
              </>
            )}
          </div>

          <Card title="Forecast">
            <div className="mb-3 flex gap-4 text-[11px] font-medium text-muted">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Income
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-400" /> Expenses
              </span>
            </div>
            <div className="space-y-1.5">
              {s.rows.map((r) => (
                <div key={r.year} className="flex items-center gap-2">
                  <span className="w-10 shrink-0 text-[11px] font-semibold text-muted">Yr {r.year}</span>
                  <div className="relative h-4 flex-1 overflow-hidden rounded-sm bg-soft">
                    <div
                      className="absolute left-0 top-0 h-1/2 bg-emerald-500"
                      style={{ width: `${Math.round((r.rent / maxVal) * 100)}%` }}
                    />
                    <div
                      className="absolute bottom-0 left-0 h-1/2 bg-red-400"
                      style={{ width: `${Math.round((r.totalExp / maxVal) * 100)}%` }}
                    />
                  </div>
                  <span
                    className={`w-28 shrink-0 text-right text-[11.5px] font-bold tabular-nums ${r.netCf >= 0 ? "text-emerald-600" : "text-red-600"}`}
                  >
                    {r.isSell ? "SALE " : ""}
                    {r.netCf >= 0 ? "+" : ""}
                    {fmtCAD(r.netCf)}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 sm:grid-cols-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Total Income</div>
                <div className="mt-1 text-[15px] font-bold tabular-nums text-emerald-600">{fmtCAD(s.totRent)}</div>
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Total Expenses</div>
                <div className="mt-1 text-[15px] font-bold tabular-nums text-red-600">{fmtCAD(s.totExp)}</div>
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Avg Monthly CF</div>
                <div className={`mt-1 text-[15px] font-bold tabular-nums ${s.avgMonthlyCf >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {fmtCADmo(s.avgMonthlyCf)}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Mortgage Paid</div>
                <div className="mt-1 text-[15px] font-bold tabular-nums text-ink">{fmtCAD(s.totPrin)}</div>
              </div>
            </div>
          </Card>

          <details className="rounded-[var(--radius-md)] border border-line bg-white p-5 shadow-[var(--shadow)]">
            <summary className="cursor-pointer text-[15px] font-bold text-ink">
              Year-by-Year Breakdown
            </summary>
            <div className="mt-4">
              <SimpleTable cols={tableCols} rows={tableRows} />
            </div>
          </details>
        </div>
      </div>

      <ReportButtons
        slug="rental-investment-forecast-calculator"
        title="Rental Investment Forecast Report"
        buildPdf={() => buildRentalForecastPdf({ state: s, settings, reportDate: todayISO() })}
      />
    </div>
  );
}
