"use client";

import { useEffect, useRef, useState } from "react";
import {
  ValuationResultView,
  type ValuationSnapshot,
} from "./ValuationResultView";

export interface EvaluationConfig {
  heading: string;
  subheading: string;
  disclaimer: string;
  bookingUrl: string;
  virtualCmaUrl: string;
}

interface GeoFeature { label: string; detail?: string; lat: number | null; lng: number | null; city: string; isAddress: boolean; placeId?: string }
interface SimilarListing {
  address: string; price: number; beds: number | null; baths: number | null;
  sqft: number | null; daysOnMarket: number | null; distanceKm: number;
  key: string | null; image: string | null; url: string | null;
}
interface HpiInfo {
  label: string; covers: string | null; change12m: number | null; momChange: number | null;
  benchmark: number | null; lastUpdated: string; propertyType: string;
}
interface EvalResult {
  estimate: { low: number; high: number; mid: number; median: number; count: number } | null;
  listings: SimilarListing[];
  hpi: HpiInfo | null;
  radiusKm: number;
}

const PROPERTY_TYPES = ["Detached", "Semi-Detached", "Townhouse", "Condo Apartment", "Condo Townhouse"];
const CONDITIONS = ["Excellent — updated", "Good — well maintained", "Fair — needs some work", "Needs major work"];
const RENOVATIONS = ["Kitchen", "Bathrooms", "Roof", "Basement finished", "Addition", "None"];

const ANALYZE_MSGS = [
  "Finding similar homes listed near you",
  "Comparing list prices and days on market…",
  "Reading market direction from the Home Price Index…",
  "Combining it all into your estimate…",
];

export function EvaluationFlow({ config }: { config: EvaluationConfig }) {
  const [step, setStep] = useState<"form" | "analyzing" | "result">("form");
  const [formStep, setFormStep] = useState<1 | 2>(1);
  const [analyzeMsg, setAnalyzeMsg] = useState(ANALYZE_MSGS[0]);

  // address picker
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<GeoFeature[]>([]);
  const [dropOpen, setDropOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<GeoFeature | null>(null);
  const [geoError, setGeoError] = useState("");
  // house-number refinement for street-level picks
  const [houseNum, setHouseNum] = useState("");
  const [refining, setRefining] = useState(false);
  const [refineError, setRefineError] = useState("");
  const [locating, setLocating] = useState(false);
  const debounce = useRef<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // property details
  const [propertyType, setPropertyType] = useState(PROPERTY_TYPES[0]);
  const [condition, setCondition] = useState(CONDITIONS[1]);
  const [beds, setBeds] = useState("4");
  const [baths, setBaths] = useState("3");
  const [sqft, setSqft] = useState("");
  const [renos, setRenos] = useState<string[]>([]);

  const [result, setResult] = useState<EvalResult | null>(null);
  const [evalError, setEvalError] = useState("");

  // shareable valuation link
  const [valuationPublicId, setValuationPublicId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // lead capture
  const started = useRef(Date.now());
  const [leadState, setLeadState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [leadError, setLeadError] = useState("");

  useEffect(() => {
    const close = (e: MouseEvent) => { if (!wrapRef.current?.contains(e.target as Node)) setDropOpen(false); };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  const onQuery = (v: string) => {
    setQuery(v); setPicked(null); setGeoError("");
    if (debounce.current) window.clearTimeout(debounce.current);
    if (v.trim().length < 3) { setSuggestions([]); setDropOpen(false); return; }
    debounce.current = window.setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(v.trim())}`);
        const body = await res.json();
        if (!res.ok) { setGeoError(body.error ?? "Address search failed."); setSuggestions([]); }
        else setSuggestions(body.features ?? []);
        setDropOpen(true);
      } catch { setGeoError("Address search failed. Please try again."); }
      setSearching(false);
    }, 350);
  };

  const pick = async (f: GeoFeature) => {
    setDropOpen(false);
    setSuggestions([]);
    setRefineError("");
    // Google predictions carry no geometry — resolve via Place Details first.
    if (f.placeId && (f.lat == null || f.lng == null)) {
      setLocating(true);
      try {
        const res = await fetch(`/api/geocode?placeId=${encodeURIComponent(f.placeId)}`);
        const body = await res.json();
        const d = body.feature as GeoFeature | undefined;
        if (res.ok && d && d.lat != null && d.lng != null) {
          setPicked(d);
          setQuery(d.label);
          if (!d.isAddress) {
            const m = query.match(/^\s*(\d+[a-zA-Z]?)/);
            setHouseNum(m ? m[1] : "");
          }
        } else {
          setGeoError(body.error ?? "Couldn't locate that address. Try another.");
        }
      } catch {
        setGeoError("Couldn't locate that address. Try another.");
      }
      setLocating(false);
      return;
    }
    setPicked(f);
    setQuery(f.label);
    if (!f.isAddress) {
      const m = query.match(/^\s*(\d+[a-zA-Z]?)/);
      setHouseNum(m ? m[1] : "");
    }
  };

  /** Re-geocode with the house number + full street name to get rooftop accuracy. */
  const refineAddress = async () => {
    if (!picked || !houseNum.trim()) return;
    setRefining(true);
    setRefineError("");
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(`${houseNum.trim()} ${picked.label}`)}`);
      const body = await res.json();
      let best = (body.features ?? []).find((f: GeoFeature) => f.isAddress) as GeoFeature | undefined;
      if (!best) {
        // Google suggestions resolve geometry via Place Details.
        const withId = (body.features ?? []).find((f: GeoFeature) => f.placeId) as GeoFeature | undefined;
        if (withId?.placeId) {
          const dres = await fetch(`/api/geocode?placeId=${encodeURIComponent(withId.placeId)}`);
          const dbody = await dres.json();
          if (dres.ok && dbody.feature?.lat != null) best = dbody.feature as GeoFeature;
        }
      }
      if (best) {
        setPicked(best);
        setQuery(best.label);
      } else {
        setRefineError("Couldn't pinpoint that house number — we'll use the street location, which still works.");
      }
    } catch {
      setRefineError("Couldn't pinpoint that house number — we'll use the street location, which still works.");
    }
    setRefining(false);
  };

  const toggleReno = (r: string) =>
    setRenos((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));

  /** Assembles everything the result view (and the share link) needs. */
  const buildSnapshot = (r: EvalResult, geo: GeoFeature): ValuationSnapshot => ({
    addressLabel: geo.label,
    city: geo.city ?? null,
    lat: geo.lat,
    lng: geo.lng,
    propertyType,
    condition,
    beds,
    baths,
    sqft,
    renovations: renos,
    estimate: r.estimate,
    listings: r.listings.map((l) => ({ ...l })),
    hpi: r.hpi ? { ...r.hpi } : null,
    radiusKm: r.radiusKm,
    rangePct:
      r.estimate && r.estimate.mid > 0
        ? Math.round(((r.estimate.high - r.estimate.low) / 2 / r.estimate.mid) * 100)
        : 5,
    dataAsOf: new Date().toISOString().slice(0, 10),
    disclaimer: config.disclaimer,
    bookingUrl: config.bookingUrl,
  });

  /** Persists the valuation and mints its shareable link (fire-and-forget). */
  const saveValuation = async (r: EvalResult, geo: GeoFeature) => {
    if (!r.estimate) return;
    try {
      const res = await fetch("/api/valuations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildSnapshot(r, geo)),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.publicId) setValuationPublicId(body.publicId);
    } catch {
      /* share bar stays hidden — the valuation itself still works */
    }
  };

  const copyValuationLink = async () => {
    if (!valuationPublicId) return;
    const url = `${window.location.origin}/valuation/${valuationPublicId}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const bookingHref = valuationPublicId
    ? `${config.bookingUrl}${config.bookingUrl.includes("?") ? "&" : "?"}valuation=${valuationPublicId}`
    : config.bookingUrl;

  const runEvaluation = async () => {
    if (!picked || picked.lat == null || picked.lng == null) return;
    setStep("analyzing"); setEvalError("");
    let i = 0;
    setAnalyzeMsg(ANALYZE_MSGS[0]);
    const t = window.setInterval(() => { i = (i + 1) % ANALYZE_MSGS.length; setAnalyzeMsg(ANALYZE_MSGS[i]); }, 800);
    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: picked.lat, lng: picked.lng, city: picked.city,
          propertyType, beds, baths, sqft, condition, renovations: renos,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Valuation failed.");
      setResult(body);
      setStep("result");
      saveValuation(body, picked);
      window.setTimeout(() => document.getElementById("hev-result")?.scrollIntoView({ behavior: "smooth" }), 60);
    } catch (e: any) {
      setEvalError(e.message ?? "Something went wrong.");
      setStep("form");
    } finally { window.clearInterval(t); }
  };

  const submitLead = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLeadState("sending"); setLeadError("");
    const form = new FormData(e.currentTarget);
    const firstName = String(form.get("first_name") ?? "").trim();
    const lastName = String(form.get("last_name") ?? "").trim();
    const payload = {
      name: `${firstName} ${lastName}`.trim(),
      first_name: firstName, last_name: lastName,
      email: String(form.get("email") ?? ""),
      phone: String(form.get("phone") ?? ""),
      form_key: "home_evaluation",
      service: "Home Valuation",
      message: picked
        ? `Home valuation request for ${picked.label} (${propertyType}, ${beds} bed / ${baths} bath${sqft ? `, ${sqft} sq ft` : ""}, ${condition}).`
        : "Home valuation request.",
      custom_fields: {
        address: picked?.label ?? null, lat: picked?.lat ?? null, lng: picked?.lng ?? null,
        property_type: propertyType, beds, baths, sqft: sqft || null, condition, renovations: renos,
        estimate_low: result?.estimate?.low ?? null, estimate_high: result?.estimate?.high ?? null,
        estimate_mid: result?.estimate?.mid ?? null, similar_count: result?.listings.length ?? 0,
        hpi_market: result?.hpi?.label ?? null, hpi_change_12m: result?.hpi?.change12m ?? null,
        valuation_id: valuationPublicId,
        valuation_url: valuationPublicId ? `/valuation/${valuationPublicId}` : null,
      },
      path: window.location.pathname,
      elapsed_ms: Date.now() - started.current,
      website: "",
      sms_opt_in: form.get("sms_opt_in") === "on",
    };
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/submit-lead`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""}`,
        },
        body: JSON.stringify(payload),
      }).catch(() => null);
      const body = await res?.json().catch(() => ({}));
      if (res?.ok) setLeadState("done");
      else { setLeadState("error"); setLeadError(body?.error ?? "Something went wrong. Please try again."); }
    } catch { setLeadState("error"); setLeadError("Something went wrong. Please try again."); }
  };

  // Shape follows the site's Branding → Shape tokens; colours follow this page's palette
  const inputCls =
    "h-11 w-full min-w-0 rounded-[var(--radius-btn)] border border-[#E4E4E7] bg-white px-4 text-[15px] text-[#111418] outline-none focus:border-[#111111]";
  const labelCls = "mb-1.5 block text-[13px] font-semibold text-[#333333]";
  const darkLabelCls = "mb-1.5 block text-[13px] font-semibold text-white";
  const btnPrimary = "inline-flex h-12 items-center justify-center rounded-[var(--radius-btn)] bg-[#111111] px-6 text-[16px] font-semibold text-white transition hover:brightness-[1.25] disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div>
      {/* STEP 1 — form */}
      {step === "form" && (
        <section className="mx-auto max-w-7xl px-5 py-14 md:py-20">
          <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-2 md:gap-14">
            <div className="order-1 md:col-start-1 md:row-start-1">
              <div className="mb-3 text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--hev-accent)]">
                Free Home Valuation
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight text-[#111111] md:text-[44px] md:leading-[1.12]">
                {config.heading}
              </h1>
              <p className="mt-4 max-w-md text-[16px] leading-relaxed text-[#333333]/80">{config.subheading}</p>
            </div>

            <div id="hev-form-card" className="order-2 min-w-0 scroll-mt-24 self-center rounded-[var(--radius-lg)] bg-[var(--hev-accent)] p-7 shadow-[var(--shadow-card)] md:order-2 md:col-start-2 md:row-span-2 md:row-start-1 md:self-center md:p-8">
              {/* Wizard progress */}
              <div className="mb-6">
                <div className="mb-2 flex items-center justify-between text-[12px] font-semibold text-white/80">
                  <span>Step {formStep} of 2</span>
                  <span>{formStep === 1 ? "Your address" : "Property details"}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/20">
                  <div className="h-full rounded-full bg-white transition-all duration-300" style={{ width: formStep === 1 ? "50%" : "100%" }} />
                </div>
              </div>

              {formStep === 1 ? (
                <>
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/15">
                    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M3 11l9-8 9 8" /><path d="M5 10v10h5v-6h4v6h5V10" />
                    </svg>
                  </div>
                  <h2 className="text-[21px] font-bold text-white">Where's your home?</h2>
                  <p className="mb-5 mt-1 text-[14px] text-white/75">Type your address and pick it from the list.</p>

                  <label className="mb-1.5 block text-[13px] font-semibold text-white" htmlFor="hev-addr">Street address</label>
              <div className="relative" ref={wrapRef}>
                <input
                  id="hev-addr" type="text" autoComplete="off" placeholder="Type your address…"
                  className={inputCls} value={query}
                  onChange={(e) => onQuery(e.target.value)}
                  onFocus={() => { if (suggestions.length) setDropOpen(true); }}
                />
                {searching && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[13px] text-[#333333]/50">…</span>}
                {dropOpen && suggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 overflow-hidden rounded-[var(--radius-lg)] border border-[#E4E4E7] bg-white shadow-[var(--shadow-card)]">
                    {suggestions.map((f, i) => (
                      <button key={i} type="button" onClick={() => pick(f)}
                        className="flex w-full items-start gap-2.5 border-b border-[#f7f7f7] px-4 py-3 text-left last:border-0 hover:bg-[#f7f7f7]">
                        <span className="font-bold text-[var(--hev-accent)]">⌖</span>
                        <span className="text-[14px] text-[#111111]">{f.label}
                          {f.detail && <small className="block text-[12.5px] text-[#333333]/60">{f.detail}</small>}
                        </span>
                      </button>
                    ))}
                    <div className="bg-[#f7f7f7] px-4 py-2 text-right text-[11px] text-[#333333]/60">
                      Address search by <b className="text-[var(--hev-accent)]">MapTiler</b>
                    </div>
                  </div>
                )}
              </div>
              {geoError && <p className="mt-2 text-[13px] font-medium text-[#ffe1e1]">{geoError}</p>}
              {locating && <p className="mt-2 text-[13px] font-medium text-white/80">Locating address…</p>}
              {picked && !locating && <p className="mt-2 text-[13px] font-medium text-white">✓ {picked.label}</p>}

              {picked && !picked.isAddress && (
                <div className="mt-3 rounded-[var(--radius-btn)] bg-white/10 p-4">
                  <p className="text-[13.5px] font-semibold text-white">Add your house number for an accurate pinpoint</p>
                  <p className="mt-0.5 text-[12.5px] leading-relaxed text-white/70">
                    We found {picked.detail ?? picked.label} — a street-level match. Your house number gets us to your door.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <input
                      value={houseNum}
                      onChange={(e) => setHouseNum(e.target.value)}
                      inputMode="numeric"
                      placeholder="e.g. 11"
                      aria-label="House number"
                      className="h-11 w-28 min-w-0 shrink-0 rounded-[var(--radius-btn)] border border-white/25 bg-white px-4 text-[15px] text-[#111418] outline-none"
                    />
                    <button
                      onClick={refineAddress}
                      disabled={refining || !houseNum.trim()}
                      className="inline-flex h-11 min-w-0 flex-1 items-center justify-center rounded-[var(--radius-btn)] bg-white px-4 text-[14.5px] font-semibold text-[var(--hev-accent)] transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {refining ? "Finding…" : "Pinpoint my address"}
                    </button>
                  </div>
                  {refineError && <p className="mt-2 text-[12.5px] text-[#ffe1e1]">{refineError}</p>}
                </div>
              )}

              <button
                onClick={() => { setFormStep(2); document.getElementById("hev-form-card")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
                disabled={!picked || locating}
                className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-[var(--radius-btn)] bg-white px-6 text-[16px] font-semibold text-[var(--hev-accent)] transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40">
                Continue
              </button>
              <p className="mt-3.5 text-center text-[12.5px] text-white/70">Free · No obligation</p>
                </>
              ) : (
                <>
                  <button onClick={() => setFormStep(1)}
                    className="mb-4 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-white/85 transition hover:text-white">
                    ← Back
                  </button>
                  <h2 className="text-[21px] font-bold text-white">Tell us about your home</h2>
                  <p className="mb-5 mt-1 text-[14px] text-white/75">A few details sharpen your valuation.</p>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 [&>*]:min-w-0">
                <div>
                  <label className="mb-1.5 block text-[13px] font-semibold text-white">Property type</label>
                  <select className={inputCls} value={propertyType} onChange={(e) => setPropertyType(e.target.value)}>
                    {PROPERTY_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-semibold text-white">Condition</label>
                  <select className={inputCls} value={condition} onChange={(e) => setCondition(e.target.value)}>
                    {CONDITIONS.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-semibold text-white">Bedrooms</label>
                  <select className={inputCls} value={beds} onChange={(e) => setBeds(e.target.value)}>
                    {["1", "2", "3", "4", "5", "6+"].map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-semibold text-white">Bathrooms</label>
                  <select className={inputCls} value={baths} onChange={(e) => setBaths(e.target.value)}>
                    {["1", "2", "3", "4", "5+"].map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <label className="mb-1.5 block text-[13px] font-semibold text-white" htmlFor="hev-sqft">Approx. finished living area (sq ft)</label>
                <input id="hev-sqft" type="text" inputMode="numeric" placeholder="e.g. 2,150" className={inputCls}
                  value={sqft} onChange={(e) => setSqft(e.target.value.replace(/[^0-9,]/g, ""))} />
              </div>

              <div className="mt-4">
                <span className="mb-1.5 block text-[13px] font-semibold text-white">Major renovations in the last 10 years</span>
                <div className="flex flex-wrap gap-2">
                  {RENOVATIONS.map((r) => (
                    <button key={r} type="button" onClick={() => toggleReno(r)}
                      className={`rounded-[var(--radius-btn)] border px-4 py-2 text-[13.5px] font-medium transition ${renos.includes(r)
                        ? "border-white bg-white text-[var(--hev-accent)]"
                        : "border-white/40 bg-white/10 text-white hover:bg-white/20"}`}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {evalError && <p className="mt-4 text-[13px] font-medium text-[#ffe1e1]">{evalError}</p>}
              <button onClick={runEvaluation}
                className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-[var(--radius-btn)] bg-white px-6 text-[16px] font-semibold text-[var(--hev-accent)] transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40">
                Get my valuation
              </button>
              <p className="mt-3.5 text-center text-[12.5px] text-white/70">
                Takes under a minute · Free · No obligation
              </p>
                </>
              )}
            </div>
            <div className="order-3 md:col-start-1 md:row-start-2">
              <ul className="space-y-5">
                {[
                  ["What similar homes are listed for", "Live listings near you — what other agents are asking for comparable properties."],
                  ["Where the market's been heading", "HPI benchmark data shows the recent direction for your area and home type."],
                  ["Free, under a minute, no obligation", "An estimate to start the conversation — the real number comes from the walkthrough."],
                ].map(([b, s]) => (
                  <li key={b} className="flex items-start gap-3.5">
                    <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-[#111111] text-[13px] font-bold text-white">✓</span>
                    <span className="min-w-0"><b className="block text-[15px] text-[#111111]">{b}</b><small className="text-[13.5px] text-[#333333]/70">{s}</small></span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* ANALYZING */}
      {step === "analyzing" && (
        <section className="mx-auto max-w-7xl px-5 py-24 text-center">
          <div className="mx-auto mb-5 h-11 w-11 animate-spin rounded-full border-4 border-[#E4E4E7] border-t-[#111111]" />
          <b className="block text-[19px] font-bold text-[#111111]">Putting your estimate together…</b>
          <p className="mt-2 text-[14px] text-[#333333]/70">{analyzeMsg}</p>
        </section>
      )}

      {/* STEP 2+3 — result */}
      {step === "result" && result && (
        <section id="hev-result" className="mx-auto max-w-7xl scroll-mt-24 px-5 py-14">
          {result && picked && (
            <ValuationResultView snapshot={buildSnapshot(result, picked)} />
          )}

          {/* Shareable link for this valuation */}
          {valuationPublicId && (
            <div className="mt-6 flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[#E4E4E7] bg-white p-5 shadow-[var(--shadow-card)] sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <b className="block text-[14.5px] text-[#111111]">Share your valuation</b>
                <span className="block truncate text-[13px] text-[#333333]/65">
                  {typeof window !== "undefined" ? `${window.location.origin}/valuation/${valuationPublicId}` : `/valuation/${valuationPublicId}`}
                </span>
              </div>
              <button
                onClick={copyValuationLink}
                className={`${btnPrimary} shrink-0 px-6 text-[14px]`}
              >
                {copied ? "Copied ✓" : "Copy link"}
              </button>
            </div>
          )}

          {/* STEP 3 — convert (combined block, Option A) */}
          <div className="mt-12 rounded-[var(--radius-lg)] bg-[#111111] p-7 text-white shadow-[var(--shadow-card)] md:p-11">
            <div className="grid grid-cols-1 gap-10 md:grid-cols-2 md:gap-0">
              <div className="flex flex-col justify-center md:pr-10">
                <span className="mb-3 text-[12px] font-bold uppercase tracking-[0.14em] text-white/50">Next step</span>
                <h3 className="text-[24px] font-extrabold tracking-tight">Want the real number?</h3>
                <p className="mt-2.5 text-[14.5px] leading-relaxed text-white/65">
                  An estimate can't see your kitchen. A 20-minute walkthrough gives you a valuation you can actually price from.
                </p>
                <a href={bookingHref} target="_blank" rel="noreferrer"
                  className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-[var(--radius-btn)] bg-white px-6 text-[16px] font-semibold text-[#111111] transition hover:bg-white/90">
                  Book a free in-person valuation
                </a>
                {config.virtualCmaUrl && (
                  <a href={config.virtualCmaUrl} target="_blank" rel="noreferrer"
                    className="mt-3 inline-flex h-12 w-full items-center justify-center rounded-[var(--radius-btn)] border border-white/25 px-6 text-[15px] font-semibold text-white transition hover:bg-white/10">
                    Request a virtual CMA instead
                  </a>
                )}
                <p className="mt-3.5 text-center text-[12.5px] text-white/45">Typically scheduled within 48 hours · Caledonia &amp; area</p>
              </div>
              <div className="border-t border-white/15 pt-10 md:border-l md:border-t-0 md:pl-10 md:pt-0">
              {leadState === "done" ? (
                <div className="flex h-full flex-col items-center justify-center py-8 text-center" role="status">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--hev-accent)] text-xl font-bold text-white">✓</div>
                  <h3 className="text-[20px] font-bold">You're on the list</h3>
                  <p className="mt-2 max-w-sm text-[14.5px] text-white/65">Your detailed breakdown is on its way. Rohit will follow up personally.</p>
                </div>
              ) : (
                <form onSubmit={submitLead}>
                  <h3 className="text-[24px] font-extrabold tracking-tight">Get the full breakdown</h3>
                  <p className="mb-4 mt-2 text-[14.5px] text-white/65">
                    We'll email your detailed estimate — the similar listings, the market notes, and where your
                    home sits among them — and keep your property details on file.
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 [&>*]:min-w-0">
                    <div>
                      <label className={darkLabelCls} htmlFor="hev-fname">First name</label>
                      <input id="hev-fname" name="first_name" type="text" required placeholder="First name" className={inputCls} />
                    </div>
                    <div>
                      <label className={darkLabelCls} htmlFor="hev-lname">Last name</label>
                      <input id="hev-lname" name="last_name" type="text" required placeholder="Last name" className={inputCls} />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className={darkLabelCls} htmlFor="hev-email">Email</label>
                    <input id="hev-email" name="email" type="email" required placeholder="Email address" className={inputCls} />
                  </div>
                  <div className="mt-4">
                    <label className={darkLabelCls} htmlFor="hev-phone">Phone <span className="font-normal text-white/50">(optional)</span></label>
                    <input id="hev-phone" name="phone" type="tel" placeholder="Phone number" className={inputCls} />
                  </div>
                  {leadState === "error" && <p className="mt-3 text-[13px] font-medium text-[#ffe1e1]">{leadError}</p>}
                  <button type="submit" disabled={leadState === "sending"}
                    className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-[var(--radius-btn)] bg-[var(--hev-accent)] px-6 text-[16px] font-semibold text-white transition hover:brightness-110 disabled:opacity-60">
                    {leadState === "sending" ? "Sending…" : "Send my report"}
                  </button>
                  <p className="mt-3.5 text-center text-[12.5px] text-white/45">Free · No spam — just your report and one follow-up.</p>
                </form>
              )}
            </div>

            </div>
          </div>
        </section>
      )}
    </div>
  );
}
