"use client";
/**
 * Affordability Calculator — ported from the legacy single-file calculators page.
 * All math via src/lib/calculators/math.ts (bit-identical formulas).
 */
import { useEffect, useMemo, useState } from "react";
import {
  Field,
  CurrencyInput,
  Segmented,
  Slider,
  Card,
  ResultHero,
  MetricRow,
  PassFail,
  SimpleTable,
} from "@/components/calculators/ui";
import { ReportButtons } from "@/components/calculators/ReportButtons";
import {
  fmtCAD,
  fmtCADmo,
  monthlyPI,
  qualifyingRate,
  cmhcPremium,
  minDownPayment,
  ontarioLTT,
  gdsTds,
  termLabel,
  todayISO,
} from "@/lib/calculators/math";
import type { CalculatorSettings, RateType } from "@/lib/calculators/types";
import {
  buildAffordabilityPdf,
  type AffordabilityListing,
  type AffordabilityReportState,
} from "./pdf";

const SLUG = "affordability-calculator";
const TITLE = "Affordability Calculator";

const TERM_OPTIONS = [
  { value: "0.5", label: "6 Mo" },
  { value: "1", label: "1 Yr" },
  { value: "2", label: "2 Yr" },
  { value: "3", label: "3 Yr" },
  { value: "5", label: "5 Yr" },
  { value: "7", label: "7 Yr" },
  { value: "10", label: "10 Yr" },
];

interface Tip {
  title: string;
  detail: string;
}

interface AffordResults {
  best: number;
  piM: number;
  ad: number;
  score: number;
  scoreLabel: string;
  pinLeft: number;
  gr: number;
  tr: number;
  ca: number;
  tax: number;
  heat: number;
  tips: Tip[];
}

/** Bisection search for the max affordable price — mirrors legacy calcAfford. */
function computeAffordability(
  income: number,
  dn: number,
  rate: number,
  debt: number,
  taxAnnual: number,
  heat: number,
  condo: number,
  amort: number,
  settings: CalculatorSettings,
  listingPrice: number,
  askPrice: number,
): AffordResults {
  const zero: AffordResults = {
    best: 0, piM: 0, ad: 0, score: 0, scoreLabel: "—", pinLeft: 0,
    gr: 0, tr: 0, ca: 0, tax: taxAnnual / 12, heat, tips: [],
  };
  const tax = taxAnnual / 12;
  const mi = income / 12;
  const hc = condo * 0.5;
  const qr = qualifyingRate(rate, settings);
  const maxH = Math.max(0, Math.min((mi * settings.gdsLimit) / 100, (mi * settings.tdsLimit) / 100 - debt));
  let maxPI = maxH - tax - heat - hc;
  if (maxPI < 0) maxPI = 0;
  const r = qr / 100 / 12;
  const n = amort * 12;
  let mm = 0;
  if (r > 0 && maxPI > 0) {
    const c = Math.pow(1 + r, n);
    mm = (maxPI * (c - 1)) / (r * c);
  }
  let lo = 0, hi = mm + dn + 500000, best = 0;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const md = Math.min(dn, mid);
    const ml = mid - md;
    if (ml < 0) { hi = mid; continue; }
    const cm = cmhcPremium(ml, mid, settings);
    const tm = ml + cm;
    const pi = monthlyPI(tm, qr, amort);
    const gc = pi + tax + heat + hc;
    const tc = gc + debt;
    const gr = mi > 0 ? (gc / mi) * 100 : 999;
    const tr = mi > 0 ? (tc / mi) * 100 : 999;
    if (gr <= settings.gdsLimit && tr <= settings.tdsLimit && mid > 0) { best = mid; lo = mid; }
    else { hi = mid; }
  }
  if (best <= 0) return zero;

  const ad = Math.min(dn, best);
  const al = best - ad;
  const ca = cmhcPremium(al, best, settings);
  const tm = al + ca;
  const piM = monthlyPI(tm, rate, amort);
  const gc = piM + tax + heat + hc;
  const tc = gc + debt;
  const { gds: gr, tds: tr } = gdsTds(income, gc, debt);

  // Afford Score — same formula as the legacy page
  const gdsRatio = gr / settings.gdsLimit;
  const tdsRatio = tr / settings.tdsLimit;
  const worstRatio = Math.max(gdsRatio, tdsRatio);
  let sc: number;
  if (worstRatio <= 0.5) sc = 95 + Math.round((0.5 - worstRatio) * 10);
  else if (worstRatio <= 0.7) sc = 80 + Math.round((0.7 - worstRatio) * 75);
  else if (worstRatio <= 0.85) sc = 60 + Math.round((0.85 - worstRatio) * 133);
  else if (worstRatio <= 1.0) sc = 30 + Math.round((1.0 - worstRatio) * 200);
  else sc = Math.max(0, 30 - Math.round((worstRatio - 1.0) * 60));
  if (ad / best >= 0.2) sc = Math.min(100, sc + 3);
  if (debt <= 0) sc = Math.min(100, sc + 2);
  sc = Math.max(0, Math.min(100, sc));

  let pinLeft: number;
  if (sc <= 25) pinLeft = (sc / 25) * 16;
  else if (sc <= 50) pinLeft = 16 + ((sc - 25) / 25) * 34;
  else pinLeft = 50 + ((sc - 50) / 50) * 50;

  let scoreLabel: string;
  if (sc >= 67) scoreLabel = "Affordable";
  else if (sc >= 40) scoreLabel = "Stretching";
  else scoreLabel = "Aggressive";

  // Coach tips — scenario-aware, mirrors legacy
  const tips: Tip[] = [];
  const hasListing = listingPrice > 0;
  const comparePrice = hasListing ? listingPrice : askPrice;
  const gap = comparePrice > 0 ? best - comparePrice : 0;
  if (hasListing && gap < 0) {
    tips.push({
      title: "Increase down payment or reduce debts",
      detail: `to bridge the ${fmtCAD(Math.abs(gap))} gap on the listing at ${fmtCAD(listingPrice)}. Even a 5% income increase could help.`,
    });
  }
  if (!hasListing && gap < 0) {
    tips.push({
      title: `You need ${fmtCAD(Math.abs(gap))} more`,
      detail: "to afford the asking price. Consider adjusting the asking price, increasing your down payment, or reducing monthly debts.",
    });
  }
  if (hasListing && gap >= 0) {
    tips.push({
      title: "Great news!",
      detail: `The listing at ${fmtCAD(listingPrice)} is within your budget. Speak with a mortgage broker to get pre-approved and lock in your rate.`,
    });
  }
  if (ca > 0) {
    const nd = Math.ceil((best * 0.2) / 1000) * 1000;
    if (nd > dn) {
      tips.push({
        title: `Increase down payment to ${fmtCAD(best * 0.2)}`,
        detail: `to eliminate ${fmtCAD(ca)} CMHC insurance and lower your monthly payment.`,
      });
    }
  }
  if (debt > 0) {
    tips.push({
      title: "Pay down existing debts",
      detail: `— reducing your ${fmtCADmo(debt)} obligations will improve your TDS ratio and qualify for a higher price.`,
    });
  }
  if (tips.length === 0) {
    tips.push({
      title: "Your finances look solid!",
      detail: "Speak with a mortgage broker to get pre-approved and explore your options.",
    });
  }

  return { best, piM, ad, score: sc, scoreLabel, pinLeft, gr, tr, ca, tax, heat, tips };
}

type LookupState = "idle" | "loading" | "found" | "notfound" | "error";

export function AffordabilityCalculator({ settings, initialListing, initialMls }: { settings: CalculatorSettings; initialListing?: AffordabilityListing | null; initialMls?: string }) {
  // Inputs — defaults match the legacy page
  const [income, setIncome] = useState(120000);
  const [down, setDown] = useState(60000);
  const [rateType, setRateType] = useState<RateType>("fixed");
  const [rate, setRate] = useState(4.84);
  const [term, setTerm] = useState("5");
  const [amort, setAmort] = useState(30);
  const [debts, setDebts] = useState(500);
  const [taxAnnual, setTaxAnnual] = useState(4000);
  const [heat, setHeat] = useState(120);
  const [condo, setCondo] = useState(0);
  const [askPrice, setAskPrice] = useState(0);
  const [address, setAddress] = useState("");

  // Property lookup
  const [query, setQuery] = useState(initialMls ?? "");
  const [listing, setListing] = useState<AffordabilityListing | null>(initialListing ?? null);
  const [lookupState, setLookupState] = useState<LookupState>(initialListing ? "found" : "idle");
  const [searchNonce, setSearchNonce] = useState(0);

  // Sync initialMls param to query (e.g. ?mls= from listing banner).
  useEffect(() => {
    if (initialMls && !query) setQuery(initialMls);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMls]);

  // Pre-fill from the subject property (e.g. opened from a listing page).
  useEffect(() => {
    if (initialListing && initialListing.price > 0) {
      setAskPrice(Math.min(initialListing.price, 3000000));
      const fullAddr = [initialListing.address, initialListing.city].filter(Boolean).join(", ");
      if (fullAddr) setAddress(fullAddr);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setLookupState("idle");
      return;
    }
    setLookupState("loading");
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/calculators/mls-lookup?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (data?.ok && data.listing) {
          const l = data.listing;
          const found: AffordabilityListing = {
            mlsNumber: String(l.mlsNumber ?? ""),
            price: Number(l.price) || 0,
            address: String(l.address ?? ""),
            city: String(l.city ?? ""),
            beds: String(l.beds ?? ""),
            baths: String(l.baths ?? ""),
            sqft: String(l.sqft ?? ""),
            propertyType: String(l.propertyType ?? ""),
            photo: String(l.photo ?? ""),
          };
          setListing(found);
          if (found.price > 0) setAskPrice(Math.min(found.price, 3000000));
          const fullAddr = [found.address, found.city].filter(Boolean).join(", ");
          if (fullAddr) setAddress(fullAddr);
          setLookupState("found");
        } else if (data?.ok) {
          setLookupState("notfound");
        } else {
          setLookupState("error");
        }
      } catch {
        setLookupState("error");
      }
    }, 400);
    return () => clearTimeout(t);
  }, [query, searchNonce]);

  const clearLookup = () => {
    setQuery("");
    setListing(null);
    setLookupState("idle");
  };

  const termNum = Number(term);
  const listingPrice = listing && listing.price > 0 ? listing.price : 0;
  const hasListing = listingPrice > 0;

  const res = useMemo(
    () => computeAffordability(income, down, rate, debts, taxAnnual, heat, condo, amort, settings, listingPrice, askPrice),
    [income, down, rate, debts, taxAnnual, heat, condo, amort, settings, listingPrice, askPrice],
  );

  // ── Subject property comparison (mirrors calcAffordWithAsk) ──
  const cmp = useMemo(() => {
    const displayPrice = hasListing ? listingPrice : askPrice;
    const showAskCol = !hasListing || (hasListing && askPrice !== listingPrice);
    const hasAnyPrice = hasListing || askPrice > 0;
    const downFor = (price: number) => {
      const d = Math.max(minDownPayment(price, settings), Math.min(down, price));
      const loan = price - d;
      const cm = cmhcPremium(loan, price, settings);
      return { d, loan, cm, tm: loan + cm, pi: monthlyPI(loan + cm, rate, amort), ltt: ontarioLTT(price) };
    };
    const sp = hasListing ? downFor(listingPrice) : null;
    const ap = showAskCol && askPrice > 0 ? downFor(askPrice) : null;
    const spGap = sp ? res.best - listingPrice : null;
    const apGap = ap ? res.best - askPrice : null;
    return { displayPrice, showAskCol, hasAnyPrice, sp, ap, spGap, apGap };
  }, [hasListing, listingPrice, askPrice, down, rate, amort, settings, res.best]);

  const scoreColor =
    res.score >= 67 ? "text-emerald-600" : res.score >= 40 ? "text-amber-500" : "text-red-600";

  const buildState = (): AffordabilityReportState => ({
    income, downPayment: down, rateType, rate, term: termNum, amort,
    debts, taxAnnual, heat, condo, askingPrice: askPrice, address, listing,
    maxPrice: res.best, maxMonthlyPI: res.piM,
    affordScore: res.score, scoreLabel: res.scoreLabel,
    gds: res.gr, tds: res.tr, cmhc: res.ca,
    monthlyPI: res.piM, monthlyTax: res.tax, monthlyHeat: res.heat,
    totalMonthly: res.piM + res.tax + res.heat,
    tips: res.tips,
  });

  const scenarioTone = (gap: number | null): "over" | "equal" | "under" => {
    if (gap === null) return "equal";
    if (gap < 0) return "over";
    if (Math.abs(gap) < 100) return "equal";
    return "under";
  };
  const toneCls = (tone: "over" | "equal" | "under") =>
    tone === "over"
      ? "border-l-red-500 bg-red-50"
      : tone === "equal"
        ? "border-l-sky-600 bg-sky-50"
        : "border-l-emerald-500 bg-emerald-50";

  const scenarios: { tone: "over" | "equal" | "under"; label: string; text: string }[] = [];
  if (hasListing && cmp.spGap !== null) {
    const tone = scenarioTone(cmp.spGap);
    const shortAddr = address.length > 55 ? address.substring(0, 52) + "..." : address;
    scenarios.push({
      tone,
      label: "Subject Property Comparison",
      text:
        tone === "over"
          ? `${shortAddr} at ${fmtCAD(listingPrice)} would cost ${fmtCADmo(cmp.sp!.pi)} — you need ${fmtCAD(Math.abs(cmp.spGap))} more to afford it. Your max is ${fmtCAD(res.best)}.`
          : tone === "equal"
            ? `${shortAddr} at ${fmtCAD(listingPrice)} is a perfect match — ${fmtCADmo(cmp.sp!.pi)} within your affordable budget of ${fmtCAD(res.best)}.`
            : `${shortAddr} at ${fmtCAD(listingPrice)} is ${fmtCADmo(cmp.sp!.pi)} — well within your affordable budget. You have ${fmtCAD(cmp.spGap)} extra capacity above the listing price.`,
    });
  }
  if (cmp.showAskCol && askPrice > 0 && cmp.apGap !== null) {
    const tone = scenarioTone(cmp.apGap);
    scenarios.push({
      tone,
      label: "Asking Price Comparison",
      text:
        tone === "over"
          ? `You need ${fmtCAD(Math.abs(cmp.apGap))} more to afford the asking price of ${fmtCAD(askPrice)}. Your monthly payment would be ${fmtCADmo(cmp.ap!.pi)} and your max affordable is ${fmtCAD(res.best)}.`
          : tone === "equal"
            ? `The asking price of ${fmtCAD(askPrice)} is a perfect match — your monthly payment would be ${fmtCADmo(cmp.ap!.pi)}.`
            : `The asking price of ${fmtCAD(askPrice)} is within your budget! Your monthly payment would be ${fmtCADmo(cmp.ap!.pi)} with ${fmtCAD(cmp.apGap)} extra capacity.`,
    });
  }

  return (
    <div>
      {/* Property lookup — full width */}
      <Card title="Property Lookup (Optional)">
        <div className="flex gap-0">
          <div className="relative min-w-0 flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") clearLookup(); }}
              placeholder="e.g. 29627799, 123 Main St, or N3W 2G6"
              autoComplete="off"
              className="w-full rounded-l-[var(--radius-sm)] rounded-r-none border border-r-0 border-line bg-white px-3 py-2.5 pr-9 text-[15px] text-ink outline-none focus:border-accent"
            />
            {query && (
              <button
                type="button"
                onClick={clearLookup}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 px-1 text-[20px] leading-none text-muted hover:text-ink"
              >
                ×
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setSearchNonce((n) => n + 1)}
            className="shrink-0 rounded-l-none rounded-r-[var(--radius-sm)] bg-primary px-5 text-[14px] font-semibold text-white hover:opacity-90"
          >
            Search
          </button>
        </div>
        <p className="mt-1.5 text-[12px] text-muted">Enter a Listing ID, street address, or postal code to auto-fill property details</p>
        {lookupState === "loading" && <p className="mt-2 text-[13px] text-muted">Searching listings…</p>}
        {lookupState === "notfound" && (
          <p className="mt-2 rounded-[var(--radius-sm)] border border-line bg-soft px-3 py-2.5 text-[13px] text-muted">
            No listing found for “{query.trim()}”. Enter an address and asking price manually below.
          </p>
        )}
        {lookupState === "error" && (
          <p className="mt-2 rounded-[var(--radius-sm)] border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] text-red-700">
            Lookup failed. Check your connection and try again, or enter details manually below.
          </p>
        )}
        {lookupState === "found" && listing && (
          <div className="mt-3 flex items-center gap-3 rounded-[var(--radius-sm)] border border-line bg-soft p-3">
            {listing.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={listing.photo} alt="Listing" className="h-14 w-14 shrink-0 rounded-[var(--radius-sm)] object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            ) : null}
            <div className="min-w-0 flex-1">
              <div className="text-[16px] font-bold text-ink">{fmtCAD(listing.price)}</div>
              <div className="truncate text-[12.5px] text-muted">{[listing.address, listing.city].filter(Boolean).join(", ")}</div>
              <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11.5px] text-muted">
                {listing.beds && <span>{listing.beds} Bed</span>}
                {listing.baths && <span>{listing.baths} Bath</span>}
                {listing.sqft && <span>{Number(listing.sqft).toLocaleString("en-CA")} sqft</span>}
                {listing.mlsNumber && <span>ID: {listing.mlsNumber}</span>}
                {listing.propertyType && <span>{listing.propertyType}</span>}
              </div>
            </div>
            <button type="button" onClick={clearLookup} className="shrink-0 text-[12.5px] font-medium text-muted underline underline-offset-2 hover:text-ink">
              Clear
            </button>
          </div>
        )}
      </Card>

      <div className="mt-5 grid gap-5 lg:grid-cols-[400px_1fr]">
        {/* LEFT: subject property + financial details */}
        <div className="flex flex-col gap-5">
          <Card title="Subject Property">
            {cmp.displayPrice > 0 ? (
              <div>
                {listing?.photo && hasListing ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={listing.photo}
                    alt="Subject property"
                    className="mb-3 h-40 w-full rounded-[var(--radius-sm)] object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                ) : null}
                <div className="text-[22px] font-bold text-ink">{fmtCAD(cmp.displayPrice)}</div>
                {address && <div className="mt-0.5 text-[13px] text-muted">{address}</div>}
                {hasListing && (
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[12px] text-muted">
                    {listing!.beds && <span>{listing!.beds} Bed</span>}
                    {listing!.baths && <span>{listing!.baths} Bath</span>}
                    {listing!.sqft && <span>{Number(listing!.sqft).toLocaleString("en-CA")} sqft</span>}
                    {listing!.mlsNumber && <span>ID: {listing!.mlsNumber}</span>}
                  </div>
                )}
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {(() => {
                    const m = hasListing ? cmp.sp! : cmp.ap!;
                    const rows: [string, string][] = [
                      ["Down Payment", fmtCAD(m.d)],
                      ["Monthly P&I", fmtCADmo(m.pi)],
                      ["CMHC Insurance", m.cm > 0 ? fmtCAD(m.cm) : "Waived"],
                      ["Land Transfer Tax", fmtCAD(m.ltt)],
                    ];
                    return rows.map(([l, v]) => (
                      <div key={l} className="rounded-[var(--radius-sm)] bg-soft px-3 py-2.5">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">{l}</div>
                        <div className={`mt-0.5 text-[15px] font-bold ${l === "CMHC Insurance" && m.cm === 0 ? "text-emerald-600" : "text-ink"}`}>{v}</div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            ) : (
              <div className="px-2 py-7 text-center">
                <div className="mb-1 text-[13px] font-semibold text-muted">No Property Selected</div>
                <div className="text-[12px] text-muted">Use the Property Lookup above or enter an asking price to see a detailed comparison.</div>
              </div>
            )}
            <div className="mt-4">
              <Field label="Property Address (Manual)">
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Optional — e.g. 123 Main St, Toronto"
                  className="w-full rounded-[var(--radius-sm)] border border-line bg-white px-3 py-2.5 text-[15px] text-ink outline-none focus:border-accent"
                />
              </Field>
            </div>
            <div className="mt-4">
              <Field label={hasListing ? "Listing Price" : "Asking Price"} hint="Enter the listing or asking price to compare with affordability">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <Slider value={askPrice} onChange={setAskPrice} min={0} max={3000000} step={10000} />
                  </div>
                  <span className="w-24 shrink-0 text-right text-[14px] font-semibold text-ink">{fmtCAD(askPrice)}</span>
                </div>
              </Field>
            </div>
          </Card>

          <Card title="Your Financial Details">
            <div className="flex flex-col gap-4">
              <Field label="Annual Household Income" hint="Combined before-tax income for all applicants">
                <CurrencyInput value={income} onChange={setIncome} />
              </Field>
              <Field
                label="Down Payment"
                hint={res.best > 0 ? `${((res.ad / res.best) * 100).toFixed(0)}% of max price (min ${fmtCAD(minDownPayment(res.best, settings))})` : undefined}
              >
                <CurrencyInput value={down} onChange={setDown} />
              </Field>
              <Field label="Rate Type">
                <Segmented<RateType>
                  value={rateType}
                  onChange={setRateType}
                  options={[{ value: "fixed", label: "Fixed" }, { value: "variable", label: "Variable" }]}
                />
              </Field>
              <Field label={rateType === "fixed" ? "Fixed Rate" : "Variable Rate"}>
                <div className="flex items-center gap-3">
                  <div className="flex-1"><Slider value={rate} onChange={setRate} min={1} max={12} step={0.05} /></div>
                  <span className="w-16 shrink-0 text-right text-[14px] font-semibold text-ink">{rate.toFixed(2)}%</span>
                </div>
              </Field>
              <Field label="Mortgage Term" hint="Term is your rate lock period; amortization is total payoff time">
                <Segmented value={term} onChange={setTerm} options={TERM_OPTIONS} />
              </Field>
              <Field label="Amortization">
                <div className="flex items-center gap-3">
                  <div className="flex-1"><Slider value={amort} onChange={setAmort} min={5} max={35} step={1} /></div>
                  <span className="w-20 shrink-0 text-right text-[14px] font-semibold text-ink">{amort} years</span>
                </div>
              </Field>
              <Field label="Monthly Debts" hint="Car loans, credit cards, student loans">
                <CurrencyInput value={debts} onChange={setDebts} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Annual Property Tax"><CurrencyInput value={taxAnnual} onChange={setTaxAnnual} /></Field>
                <Field label="Monthly Heating"><CurrencyInput value={heat} onChange={setHeat} /></Field>
              </div>
              <Field label="Monthly Condo Fees"><CurrencyInput value={condo} onChange={setCondo} /></Field>
            </div>
          </Card>
        </div>

        {/* RIGHT: results */}
        <div className="flex flex-col gap-5">
          <ResultHero label="You Can Afford a Home Up To" value={fmtCAD(res.best)} sub={fmtCADmo(res.piM)} />

          {/* Afford Score gauge */}
          <Card>
            <div className="text-center">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.08em] text-muted">Your Afford Score</div>
              <div className="relative mx-auto max-w-md">
                <div className="flex h-2.5 overflow-hidden rounded-full">
                  <div className="bg-red-500" style={{ width: "16%" }} />
                  <div className="bg-amber-400" style={{ width: "34%" }} />
                  <div className="bg-emerald-500" style={{ width: "50%" }} />
                </div>
                <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: `${Math.min(97, res.pinLeft)}%` }}>
                  <div className="h-4 w-4 rounded-full border-2 border-white bg-ink shadow" />
                </div>
              </div>
              <div className="mx-auto mt-1.5 flex max-w-md justify-between text-[11px] font-semibold">
                <span className="text-red-600">Aggressive</span>
                <span className="text-amber-500">Stretching</span>
                <span className="text-emerald-600">Affordable</span>
              </div>
              <div className={`mt-2 text-[26px] font-bold ${scoreColor}`}>{res.best > 0 ? res.score : "—"}</div>
              <div className={`text-[13px] font-semibold ${scoreColor}`}>{res.scoreLabel}</div>
            </div>
          </Card>

          {/* Scenario comparison */}
          {scenarios.map((sc, i) => (
            <div key={i} className={`rounded-[var(--radius-sm)] border-l-4 px-4 py-3 ${toneCls(sc.tone)}`}>
              <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted">{sc.label}</div>
              <div className="text-[13.5px] leading-6 text-ink">{sc.text}</div>
            </div>
          ))}
          {cmp.hasAnyPrice && res.best > 0 && (
            <Card title="Detailed Comparison">
              <SimpleTable
                cols={
                  hasListing && cmp.showAskCol
                    ? ["Metric", "Subject Property", "Asking Price", "You Can Afford"]
                    : hasListing
                      ? ["Metric", "Subject Property", "You Can Afford"]
                      : ["Metric", "Asking Price", "You Can Afford"]
                }
                rows={(() => {
                  const caBest = cmhcPremium(res.best - res.ad, res.best, settings);
                  const tmBest = res.ad + caBest;
                  const affordCol = [fmtCAD(res.best), fmtCAD(res.ad), fmtCAD(tmBest), fmtCADmo(monthlyPI(tmBest, rate, amort)), fmtCAD(ontarioLTT(res.best))];
                  const diffText = (gap: number | null) =>
                    gap === null ? "—" : gap < 0 ? `${fmtCAD(Math.abs(gap))} more` : `${fmtCAD(gap)} under`;
                  if (hasListing && cmp.showAskCol) {
                    return [
                      ["Price", fmtCAD(listingPrice), fmtCAD(askPrice), affordCol[0]],
                      ["Down Payment", fmtCAD(cmp.sp!.d), fmtCAD(cmp.ap!.d), affordCol[1]],
                      ["Mortgage Amount", fmtCAD(cmp.sp!.tm), fmtCAD(cmp.ap!.tm), affordCol[2]],
                      ["Monthly Payment", fmtCADmo(cmp.sp!.pi), fmtCADmo(cmp.ap!.pi), affordCol[3]],
                      ["Land Transfer Tax", fmtCAD(cmp.sp!.ltt), fmtCAD(cmp.ap!.ltt), affordCol[4]],
                      ["Difference", diffText(cmp.spGap), diffText(cmp.apGap), ""],
                    ];
                  }
                  if (hasListing) {
                    return [
                      ["Price", fmtCAD(listingPrice), affordCol[0]],
                      ["Down Payment", fmtCAD(cmp.sp!.d), affordCol[1]],
                      ["Mortgage Amount", fmtCAD(cmp.sp!.tm), affordCol[2]],
                      ["Monthly Payment", fmtCADmo(cmp.sp!.pi), affordCol[3]],
                      ["Land Transfer Tax", fmtCAD(cmp.sp!.ltt), affordCol[4]],
                      ["Difference", diffText(cmp.spGap), ""],
                    ];
                  }
                  return [
                    ["Price", fmtCAD(askPrice), affordCol[0]],
                    ["Down Payment", fmtCAD(cmp.ap!.d), affordCol[1]],
                    ["Mortgage Amount", fmtCAD(cmp.ap!.tm), affordCol[2]],
                    ["Monthly Payment", fmtCADmo(cmp.ap!.pi), affordCol[3]],
                    ["Land Transfer Tax", fmtCAD(cmp.ap!.ltt), affordCol[4]],
                    ["Difference", diffText(cmp.apGap), ""],
                  ];
                })()}
              />
            </Card>
          )}

          <Card title="Qualification Check">
            <div className="flex flex-col gap-4">
              <div>
                <div className="mb-1 flex items-center justify-between text-[13.5px]">
                  <span className="font-semibold text-ink">GDS Ratio</span>
                  <span className="text-muted"><strong className="text-ink">{res.gr.toFixed(1)}%</strong> / {settings.gdsLimit}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-soft">
                  <div className={`h-full rounded-full ${res.gr <= settings.gdsLimit ? "bg-emerald-500" : "bg-red-500"}`} style={{ width: `${Math.min((res.gr / 40) * 100, 100)}%` }} />
                </div>
                <div className="mt-1.5"><PassFail pass={res.gr <= settings.gdsLimit} label={`max ${settings.gdsLimit}%`} /></div>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between text-[13.5px]">
                  <span className="font-semibold text-ink">TDS Ratio</span>
                  <span className="text-muted"><strong className="text-ink">{res.tr.toFixed(1)}%</strong> / {settings.tdsLimit}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-soft">
                  <div className={`h-full rounded-full ${res.tr <= settings.tdsLimit ? "bg-emerald-500" : "bg-red-500"}`} style={{ width: `${Math.min((res.tr / 50) * 100, 100)}%` }} />
                </div>
                <div className="mt-1.5"><PassFail pass={res.tr <= settings.tdsLimit} label={`max ${settings.tdsLimit}%`} /></div>
              </div>
            </div>
          </Card>

          <Card title="Monthly Payment Breakdown">
            <MetricRow label="Mortgage P&I" value={fmtCADmo(res.piM)} strong />
            <MetricRow label="Property Tax" value={fmtCADmo(res.tax)} />
            <MetricRow label="Heating" value={fmtCADmo(res.heat)} />
            <MetricRow label="Total Monthly Housing" value={fmtCADmo(res.piM + res.tax + res.heat)} strong />
            <div className="mt-3 border-t border-line pt-3">
              <MetricRow
                label="CMHC Insurance"
                value={res.ca > 0 ? fmtCAD(res.ca) : "Waived"}
                strong
                tone={res.ca > 0 ? undefined : "good"}
              />
            </div>
          </Card>

          <Card title="Affordability Coach">
            <div className="flex flex-col gap-3">
              {res.tips.map((t, i) => (
                <div key={i} className="flex gap-2.5">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0 text-accent" aria-hidden>
                    <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.7 1 1.5 1 2.5h6c0-1 .2-1.8 1-2.5A6 6 0 0 0 12 3z" />
                  </svg>
                  <p className="text-[13.5px] leading-6 text-ink">
                    <strong>{t.title}</strong> <span className="text-muted">{t.detail}</span>
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <div className="flex items-center gap-2 text-[12px] text-muted">
            <span>Rate: {rateType === "fixed" ? "Fixed" : "Variable"} at {rate.toFixed(2)}%</span>
            <span aria-hidden>·</span>
            <span>Term: {termLabel(termNum)}</span>
            <span aria-hidden>·</span>
            <span>Amortization: {amort} years</span>
            <span aria-hidden>·</span>
            <span>Qualifying rate: {qualifyingRate(rate, settings).toFixed(2)}%</span>
          </div>

          <ReportButtons
            slug={SLUG}
            title={TITLE}
            buildPdf={() => buildAffordabilityPdf({ state: buildState(), settings, reportDate: todayISO() })}
          />
        </div>
      </div>

    </div>
  );
}
