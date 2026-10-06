"use client";
/**
 * Closing Costs Calculator — itemized closing costs with editable ancillary items.
 * Slug: closing-costs-calculator-canada
 *
 * NOTE: the legacy page injected the "Total Closing Costs" row between every
 * breakdown item (bad array join). This port renders it ONCE at the end.
 */
import { useCallback, useMemo, useState } from "react";
import type { CalculatorSettings } from "@/lib/calculators/types";
import {
  fmtCAD,
  ontarioLTT,
  torontoLTT,
  cmhcPremium,
  todayISO,
} from "@/lib/calculators/math";
import {
  Field,
  Slider,
  Toggle,
  Card,
  ResultHero,
  MetricRow,
} from "../ui";
import { ReportButtons } from "../ReportButtons";
import {
  buildClosingCostsPdf,
  type ClosingCostsReportState,
} from "./pdf";

interface AncillaryItem {
  id: string;
  name: string;
  desc: string;
  amount: number;
  on: boolean;
  removable: boolean;
}

const SEED_ITEMS: AncillaryItem[] = [
  { id: "appraisal", name: "Appraisal", desc: "A professional assessment of the property's market value. Lenders typically require this to verify the home's worth before approving financing. Approximately $300 - $500.", amount: 350, on: true, removable: false },
  { id: "inspection", name: "Home Inspection", desc: "Accredited home inspectors will examine the property to ensure it is up to code and that everything functions properly. Approximately $200 - $500.", amount: 500, on: true, removable: false },
  { id: "title_ins", name: "Title Insurance", desc: "Protects property owners and lenders against losses related to title disputes, forgery, fraud, unpaid utilities, taxes, or zoning violations. Typical cost is $350 - $400. Your lender may require it.", amount: 400, on: true, removable: false },
  { id: "legal", name: "Legal Fees", desc: "Real estate lawyers will submit your offer, take care of registration, and submit your final payment on close. Approximately $800 - $2,500.", amount: 1800, on: true, removable: false },
  { id: "adjustments", name: "Final Adjustments", desc: "Any expenses the seller needs to be reimbursed for after closing (maintenance fees, heat, property tax prepayments, etc.). Approximately $0 - $10,000+.", amount: 0, on: true, removable: false },
  { id: "moving", name: "Moving Costs", desc: "The cost of moving furniture and belongings to the new property. Depending on the size of your home and distance, approximately $350 - $5,000.", amount: 1500, on: false, removable: false },
  { id: "lender_fee", name: "Lender Fee", desc: "The fee that a lender may charge for providing financing. This varies by lender and loan type.", amount: 0, on: false, removable: false },
  { id: "brokerage_fee", name: "Brokerage Fee", desc: "The fee that a brokerage may charge for their services in obtaining financing.", amount: 0, on: false, removable: false },
];

function AncillaryRow({
  item,
  onToggle,
  onAmount,
  onRemove,
}: {
  item: AncillaryItem;
  onToggle: () => void;
  onAmount: (v: number) => void;
  onRemove?: () => void;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-line py-3 last:border-0">
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-semibold text-ink">{item.name}</div>
        <div className="mt-0.5 text-[12px] leading-5 text-muted">{item.desc}</div>
      </div>
      <input
        type="text"
        inputMode="numeric"
        aria-label={`${item.name} amount`}
        value={item.amount === 0 ? "" : String(item.amount)}
        placeholder="0"
        onChange={(e) => {
          const n = parseFloat(e.target.value.replace(/[^0-9.]/g, ""));
          onAmount(Number.isFinite(n) && n >= 0 ? n : 0);
        }}
        className="w-24 shrink-0 rounded-[var(--radius-sm)] border border-line bg-white px-2 py-1.5 text-right text-[14px] font-medium text-ink outline-none focus:border-accent"
      />
      <button
        type="button"
        role="switch"
        aria-checked={item.on}
        aria-label={`Toggle ${item.name}`}
        onClick={onToggle}
        className="mt-1 shrink-0"
      >
        <span className={`relative block h-6 w-11 rounded-[var(--radius-label)] transition ${item.on ? "bg-accent" : "bg-neutral-300"}`}>
          <span className={`absolute top-0.5 h-5 w-5 rounded-[var(--radius-label)] bg-white shadow transition-all ${item.on ? "left-[22px]" : "left-0.5"}`} />
        </span>
      </button>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${item.name}`}
          className="mt-1.5 shrink-0 text-[16px] leading-none text-muted hover:text-red-600"
        >
          ×
        </button>
      )}
    </div>
  );
}

export function ClosingCostsCalculator({ settings }: { settings: CalculatorSettings }) {
  const [price, setPrice] = useState(600000);
  const [down, setDown] = useState(60000);
  const [ftb, setFtb] = useState(false);
  const [toronto, setToronto] = useState(false);
  const [items, setItems] = useState<AncillaryItem[]>(SEED_ITEMS);
  const [newName, setNewName] = useState("");
  const [newAmt, setNewAmt] = useState("");

  const state: ClosingCostsReportState = useMemo(() => {
    const loan = price - down;
    const cmhc = cmhcPremium(loan, price, settings);
    const ltt = ontarioLTT(price);
    const toLtt = toronto ? torontoLTT(price) : 0;
    const rebates = ftb ? settings.onRebate + (toronto ? settings.toRebate : 0) : 0;
    const ancillary = items
      .filter((i) => i.on && i.amount > 0)
      .map((i) => ({ name: i.name, amount: i.amount }));
    const total = ltt + toLtt - rebates + cmhc + ancillary.reduce((s, i) => s + i.amount, 0);
    return {
      price,
      down,
      ftb,
      toronto,
      ltt,
      toLtt,
      rebates,
      cmhc,
      ancillary,
      total,
      cashNeeded: down + total,
    };
  }, [price, down, ftb, toronto, items, settings]);

  const breakdown: { label: string; value: string; tone?: "good" | "muted" }[] = [
    { label: "Land Transfer Tax", value: fmtCAD(state.ltt) },
    { label: "Toronto LTT (MBTT)", value: fmtCAD(state.toLtt), tone: state.toLtt === 0 ? "muted" : undefined },
    {
      label: "First-Time Buyer Rebate",
      value: state.ftb ? `-${fmtCAD(state.rebates)}` : "$0",
      tone: state.ftb ? "good" : "muted",
    },
    { label: "CMHC Mortgage Insurance", value: fmtCAD(state.cmhc), tone: state.cmhc === 0 ? "muted" : undefined },
    ...state.ancillary.map((i) => ({ label: i.name, value: fmtCAD(i.amount) })),
  ];

  const buildPdf = useCallback(
    () => buildClosingCostsPdf({ state, settings, reportDate: todayISO() }),
    [state, settings],
  );

  const addItem = () => {
    const name = newName.trim();
    if (!name) return;
    const amt = parseFloat(newAmt.replace(/[^0-9.]/g, "")) || 0;
    setItems((prev) => [
      ...prev,
      { id: `custom_${Date.now()}`, name, desc: "Custom closing cost added by user.", amount: Math.max(0, amt), on: true, removable: true },
    ]);
    setNewName("");
    setNewAmt("");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
      <div className="space-y-6">
        <Card title="Purchase Details">
          <div className="space-y-5">
            <Field label={`Purchase Price — ${fmtCAD(price)}`}>
              <Slider value={price} onChange={setPrice} min={100000} max={3000000} step={10000} />
            </Field>
            <Field label={`Down Payment — ${fmtCAD(down)}`}>
              <Slider value={down} onChange={setDown} min={0} max={1500000} step={5000} />
            </Field>
            <Toggle checked={ftb} onChange={setFtb} label="First-Time Home Buyer" />
            <Toggle checked={toronto} onChange={setToronto} label="Property is in Toronto" />
          </div>
        </Card>
        <Card title="Ancillary Costs">
          <p className="mb-2 text-[12px] leading-5 text-muted">
            Ancillary costs are additional costs that are often overlooked. Toggle items on/off and
            edit amounts to customize your estimate.
          </p>
          <div>
            {items.map((item) => (
              <AncillaryRow
                key={item.id}
                item={item}
                onToggle={() =>
                  setItems((prev) => prev.map((p) => (p.id === item.id ? { ...p, on: !p.on } : p)))
                }
                onAmount={(v) =>
                  setItems((prev) => prev.map((p) => (p.id === item.id ? { ...p, amount: v } : p)))
                }
                onRemove={
                  item.removable
                    ? () => setItems((prev) => prev.filter((p) => p.id !== item.id))
                    : undefined
                }
              />
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Add custom cost (e.g. Staging…)"
              className="min-w-0 flex-1 rounded-[var(--radius-sm)] border border-line bg-white px-3 py-2 text-[13.5px] text-ink outline-none focus:border-accent"
            />
            <input
              type="text"
              inputMode="numeric"
              value={newAmt}
              onChange={(e) => setNewAmt(e.target.value)}
              placeholder="$0"
              className="w-20 shrink-0 rounded-[var(--radius-sm)] border border-line bg-white px-3 py-2 text-[13.5px] text-ink outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={addItem}
              className="shrink-0 rounded-[var(--radius-sm)] bg-primary px-4 py-2 text-[13.5px] font-semibold text-white transition hover:opacity-90"
            >
              Add
            </button>
          </div>
        </Card>
      </div>
      <div className="space-y-6">
        <ResultHero
          label="Estimated Total Closing Costs"
          value={fmtCAD(state.total)}
          sub={`Total cash needed: ${fmtCAD(state.cashNeeded)} (down payment + closing costs)`}
        />
        <Card title="Cost Breakdown">
          {breakdown.map((b) => (
            <MetricRow key={b.label} label={b.label} value={b.value} tone={b.tone} />
          ))}
          <div className="mt-2 border-t-2 border-primary pt-3">
            <MetricRow label="Total Closing Costs" value={fmtCAD(state.total)} strong />
          </div>
        </Card>
        <ReportButtons
          slug="closing-costs-calculator-canada"
          title="Closing Costs Calculator"
          buildPdf={buildPdf}
        />
      </div>
    </div>
  );
}
