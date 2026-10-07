"use client";

import { useEffect, useRef, useState } from "react";

export interface EvaluationConfig {
  heading: string;
  subheading: string;
  disclaimer: string;
  bookingUrl: string;
  virtualCmaUrl: string;
}

interface GeoFeature { label: string; detail?: string; lat: number; lng: number; city: string }
interface SimilarListing {
  address: string; price: number; beds: number | null; baths: number | null;
  sqft: number | null; daysOnMarket: number | null; distanceKm: number; key: string | null;
}
interface EvalResult {
  estimate: { low: number; high: number; mid: number; median: number; count: number } | null;
  listings: SimilarListing[];
  hpi: { label: string; change12m: number | null; benchmark: number | null; lastUpdated: string } | null;
  radiusKm: number;
}

const PROPERTY_TYPES = ["Detached", "Semi-Detached", "Townhouse", "Condo Apartment", "Condo Townhouse"];
const CONDITIONS = ["Excellent — updated", "Good — well maintained", "Fair — needs some work", "Needs major work"];
const RENOVATIONS = ["Kitchen", "Bathrooms", "Roof", "Basement finished", "Addition", "None"];

const fmt = (n: number) => "$" + Math.round(n).toLocaleString("en-CA");
const ANALYZE_MSGS = [
  "Finding similar homes listed near you",
  "Comparing list prices and days on market…",
  "Reading market direction from the Home Price Index…",
  "Combining it all into your estimate…",
];

export function EvaluationFlow({ config }: { config: EvaluationConfig }) {
  const [step, setStep] = useState<"form" | "analyzing" | "result">("form");
  const [analyzeMsg, setAnalyzeMsg] = useState(ANALYZE_MSGS[0]);

  // address picker
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<GeoFeature[]>([]);
  const [dropOpen, setDropOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<GeoFeature | null>(null);
  const [geoError, setGeoError] = useState("");
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

  const pick = (f: GeoFeature) => {
    setPicked(f); setQuery(f.label); setDropOpen(false); setSuggestions([]);
  };

  const toggleReno = (r: string) =>
    setRenos((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));

  const runEvaluation = async () => {
    if (!picked) return;
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
      if (!res.ok) throw new Error(body.error ?? "Evaluation failed.");
      setResult(body);
      setStep("result");
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
    const payload = {
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      phone: String(form.get("phone") ?? ""),
      form_key: "home_evaluation",
      service: "Home Evaluation",
      message: picked
        ? `Home evaluation request for ${picked.label} (${propertyType}, ${beds} bed / ${baths} bath${sqft ? `, ${sqft} sq ft` : ""}, ${condition}).`
        : "Home evaluation request.",
      custom_fields: {
        address: picked?.label ?? null, lat: picked?.lat ?? null, lng: picked?.lng ?? null,
        property_type: propertyType, beds, baths, sqft: sqft || null, condition, renovations: renos,
        estimate_low: result?.estimate?.low ?? null, estimate_high: result?.estimate?.high ?? null,
        estimate_mid: result?.estimate?.mid ?? null, similar_count: result?.listings.length ?? 0,
        hpi_change_12m: result?.hpi?.change12m ?? null,
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

  const inputCls =
    "h-11 w-full rounded-xl border border-[var(--hev-line,#E4E4E7)] bg-white px-3.5 text-[15px] text-[#111418] outline-none focus:border-[#111111]";
  const labelCls = "mb-1.5 block text-[13px] font-semibold text-[#333333]";

  return (
    <div>
      {/* STEP 1 — form */}
      {step === "form" && (
        <section className="mx-auto max-w-6xl px-5 py-14 md:py-20">
          <div className="grid grid-cols-1 items-start gap-10 md:grid-cols-2 md:gap-14">
            <div>
              <div className="mb-3 text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--hev-accent)]">
                Free Home Evaluation
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight text-[#111111] md:text-[44px] md:leading-[1.12]">
                {config.heading}
              </h1>
              <p className="mt-4 max-w-md text-[16px] leading-relaxed text-[#333333]/80">{config.subheading}</p>
              <ul className="mt-8 space-y-5">
                {[
                  ["What similar homes are listed for", "Live listings near you — what other agents are asking for comparable properties."],
                  ["Where the market's been heading", "HPI benchmark data shows the recent direction for your area and home type."],
                  ["Free, under a minute, no obligation", "An estimate to start the conversation — the real number comes from the walkthrough."],
                ].map(([b, s]) => (
                  <li key={b} className="flex items-start gap-3.5">
                    <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-[#111111] text-[13px] font-bold text-white">✓</span>
                    <span><b className="block text-[15px] text-[#111111]">{b}</b><small className="text-[13.5px] text-[#333333]/70">{s}</small></span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-[#E4E4E7] bg-white p-7 shadow-[0_6px_20px_rgba(20,20,43,0.08)] md:p-8">
              <h2 className="text-[21px] font-bold text-[#111111]">Get your evaluation</h2>
              <p className="mb-5 mt-1 text-[14px] text-[#333333]/70">Start by finding your address.</p>

              <label className={labelCls} htmlFor="hev-addr">Street address</label>
              <div className="relative" ref={wrapRef}>
                <input
                  id="hev-addr" type="text" autoComplete="off" placeholder="Type your address…"
                  className={inputCls} value={query}
                  onChange={(e) => onQuery(e.target.value)}
                  onFocus={() => { if (suggestions.length) setDropOpen(true); }}
                />
                {searching && <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] text-[#333333]/50">…</span>}
                {dropOpen && suggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 overflow-hidden rounded-xl border border-[#E4E4E7] bg-white shadow-[0_6px_20px_rgba(20,20,43,0.12)]">
                    {suggestions.map((f, i) => (
                      <button key={i} type="button" onClick={() => pick(f)}
                        className="flex w-full items-start gap-2.5 border-b border-[#f7f7f7] px-3.5 py-3 text-left last:border-0 hover:bg-[#f7f7f7]">
                        <span className="font-bold text-[var(--hev-accent)]">⌖</span>
                        <span className="text-[14px] text-[#111111]">{f.label}
                          {f.detail && <small className="block text-[12.5px] text-[#333333]/60">{f.detail}</small>}
                        </span>
                      </button>
                    ))}
                    <div className="bg-[#f7f7f7] px-3.5 py-2 text-right text-[11px] text-[#333333]/60">
                      Address search by <b className="text-[var(--hev-accent)]">MapTiler</b>
                    </div>
                  </div>
                )}
              </div>
              {geoError && <p className="mt-2 text-[13px] text-red-700">{geoError}</p>}
              {picked && <p className="mt-2 text-[13px] font-medium text-[var(--hev-accent)]">✓ {picked.label}</p>}

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Property type</label>
                  <select className={inputCls} value={propertyType} onChange={(e) => setPropertyType(e.target.value)}>
                    {PROPERTY_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Condition</label>
                  <select className={inputCls} value={condition} onChange={(e) => setCondition(e.target.value)}>
                    {CONDITIONS.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Bedrooms</label>
                  <select className={inputCls} value={beds} onChange={(e) => setBeds(e.target.value)}>
                    {["1", "2", "3", "4", "5", "6+"].map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Bathrooms</label>
                  <select className={inputCls} value={baths} onChange={(e) => setBaths(e.target.value)}>
                    {["1", "2", "3", "4", "5+"].map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <label className={labelCls} htmlFor="hev-sqft">Approx. finished living area (sq ft)</label>
                <input id="hev-sqft" type="text" inputMode="numeric" placeholder="e.g. 2,150" className={inputCls}
                  value={sqft} onChange={(e) => setSqft(e.target.value.replace(/[^0-9,]/g, ""))} />
              </div>

              <div className="mt-4">
                <span className={labelCls}>Major renovations in the last 10 years</span>
                <div className="flex flex-wrap gap-2">
                  {RENOVATIONS.map((r) => (
                    <button key={r} type="button" onClick={() => toggleReno(r)}
                      className={`rounded-full border px-4 py-2 text-[13.5px] font-medium transition ${renos.includes(r)
                        ? "border-[#111111] bg-[#111111] text-white"
                        : "border-[#E4E4E7] bg-white text-[#333333] hover:border-[#111111]"}`}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {evalError && <p className="mt-4 text-[13px] text-red-700">{evalError}</p>}
              <button
                onClick={runEvaluation} disabled={!picked}
                className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-full bg-[#111111] px-6 text-[16px] font-semibold text-white transition hover:brightness-[1.25] disabled:cursor-not-allowed disabled:opacity-40">
                Get my home evaluation
              </button>
              <p className="mt-3.5 text-center text-[12.5px] text-[#333333]/60">
                {picked ? "Takes under a minute · Free · No obligation" : "Pick your address above to continue · Free · No obligation"}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ANALYZING */}
      {step === "analyzing" && (
        <section className="mx-auto max-w-6xl px-5 py-24 text-center">
          <div className="mx-auto mb-5 h-11 w-11 animate-spin rounded-full border-4 border-[#E4E4E7] border-t-[#111111]" />
          <b className="block text-[19px] font-bold text-[#111111]">Putting your estimate together…</b>
          <p className="mt-2 text-[14px] text-[#333333]/70">{analyzeMsg}</p>
        </section>
      )}

      {/* STEP 2+3 — result */}
      {step === "result" && result && (
        <section id="hev-result" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-14">
          <span className="mb-3 inline-block rounded-full bg-[#e8f1fb] px-3.5 py-1.5 text-[12px] font-bold text-[var(--hev-accent)]">
            Your estimate
          </span>
          <h2 className="text-[30px] font-extrabold tracking-tight text-[#111111]">Preliminary estimate</h2>
          <p className="mt-1.5 text-[15px] text-[#333333]/75">Active listings + market direction + your home's details, combined.</p>

          {result.estimate ? (
            <>
              <div className="mt-7 rounded-2xl bg-[#111111] px-8 py-11 text-center text-white">
                <div className="mb-4 text-[14px] text-white/60">{picked?.label}</div>
                <div className="mb-2.5 text-[12px] font-bold uppercase tracking-[0.14em] text-white/50">Estimated market value</div>
                <div className="text-[44px] font-extrabold tracking-tight md:text-[54px]">
                  {fmt(result.estimate.low)} <span className="font-medium text-white/40">–</span> {fmt(result.estimate.high)}
                </div>
                <div className="mt-3 text-[15px] text-white/70">Most likely around <b className="text-white">{fmt(result.estimate.mid)}</b></div>
                <div className="mt-3.5 text-[13px] text-white/45">
                  {result.estimate.count} similar homes currently listed within {result.radiusKm} km
                  {result.hpi?.lastUpdated ? ` · HPI benchmark to ${result.hpi.lastUpdated}` : ""} · Data as of{" "}
                  {new Date().toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric" })}
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-[#E4E4E7] bg-white p-6 shadow-[0_6px_20px_rgba(20,20,43,0.08)]">
                  <div className="text-[27px] font-extrabold text-[#111111]">{result.estimate.count}</div>
                  <b className="mb-1 mt-2 block text-[14.5px] text-[#111111]">Similar homes listed nearby</b>
                  <small className="text-[13px] leading-relaxed text-[#333333]/70">
                    What other agents are asking for comparable properties — median <b>{fmt(result.estimate.median)}</b>.
                  </small>
                </div>
                <div className="rounded-2xl border border-[#E4E4E7] bg-white p-6 shadow-[0_6px_20px_rgba(20,20,43,0.08)]">
                  <div className="text-[27px] font-extrabold text-[var(--hev-accent)]">
                    {result.hpi?.change12m != null ? `${result.hpi.change12m > 0 ? "+" : ""}${result.hpi.change12m}%` : "—"}
                  </div>
                  <b className="mb-1 mt-2 block text-[14.5px] text-[#111111]">Market direction (HPI)</b>
                  <small className="text-[13px] leading-relaxed text-[#333333]/70">
                    {result.hpi
                      ? <>Benchmark for {propertyType.toLowerCase()} homes in {result.hpi.label} — {result.hpi.change12m != null && result.hpi.change12m >= 0 ? "a rising market" : "a softening market"} over the last 12 months.</>
                      : "No HPI benchmark available for this area — the estimate uses listings alone."}
                  </small>
                </div>
                <div className="rounded-2xl border border-[#E4E4E7] bg-white p-6 shadow-[0_6px_20px_rgba(20,20,43,0.08)]">
                  <div className="text-[27px] font-extrabold text-[#111111]">±{Math.round(((result.estimate.high - result.estimate.low) / 2 / result.estimate.mid) * 100)}%</div>
                  <b className="mb-1 mt-2 block text-[14.5px] text-[#111111]">Your home's position</b>
                  <small className="text-[13px] leading-relaxed text-[#333333]/70">
                    {beds} bed / {baths} bath{sqft ? ` / ${sqft} sq ft` : ""}, {condition.split(" — ")[0].toLowerCase()} condition
                    {renos.length > 0 && renos[0] !== "None" ? `, ${renos.join(", ").toLowerCase()} updated` : ""} — placed within the band. The walkthrough confirms it.
                  </small>
                </div>
              </div>

              <h3 className="mb-3.5 mt-10 text-[20px] font-bold text-[#111111]">Similar homes currently listed near you</h3>
              <div className="overflow-x-auto rounded-2xl border border-[#E4E4E7] bg-white shadow-[0_6px_20px_rgba(20,20,43,0.08)]">
                <table className="w-full min-w-[760px] border-collapse text-[14px]">
                  <thead>
                    <tr className="bg-[#f7f7f7] text-left text-[11.5px] font-semibold uppercase tracking-[0.07em] text-[#333333]/60">
                      <th className="px-4 py-3.5">Address</th><th className="px-4 py-3.5">List price</th>
                      <th className="px-4 py-3.5">Beds / Baths</th><th className="px-4 py-3.5">Sq ft</th>
                      <th className="px-4 py-3.5">Days listed</th><th className="px-4 py-3.5">Distance</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-[#E4E4E7] bg-[#e8f1fb] font-semibold">
                      <td className="px-4 py-3.5">Your home</td><td className="px-4 py-3.5">—</td>
                      <td className="px-4 py-3.5">{beds} / {baths}</td><td className="px-4 py-3.5">{sqft || "—"}</td>
                      <td className="px-4 py-3.5">—</td><td className="px-4 py-3.5">—</td>
                    </tr>
                    {result.listings.map((l, i) => (
                      <tr key={i} className="border-t border-[#E4E4E7]">
                        <td className="px-4 py-3.5">{l.address}</td>
                        <td className="px-4 py-3.5 font-semibold">{fmt(l.price)}</td>
                        <td className="px-4 py-3.5">{l.beds ?? "—"} / {l.baths ?? "—"}</td>
                        <td className="px-4 py-3.5">{l.sqft ? l.sqft.toLocaleString("en-CA") : "—"}</td>
                        <td className="px-4 py-3.5">{l.daysOnMarket ?? "—"}</td>
                        <td className="px-4 py-3.5">{l.distanceKm} km</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2.5 text-[13px] text-[#333333]/65">
                List prices are asking prices — homes may sell above or below. Days listed hints at how the market is receiving each price.
              </p>
            </>
          ) : (
            <div className="mt-7 rounded-2xl border border-[#E4E4E7] bg-white p-10 text-center shadow-[0_6px_20px_rgba(20,20,43,0.08)]">
              <h3 className="text-[22px] font-bold text-[#111111]">Not enough nearby listings for an estimate</h3>
              <p className="mx-auto mt-3 max-w-lg text-[15px] text-[#333333]/75">
                We couldn't find enough similar homes currently listed near {picked?.label} to build a
                reliable range. This is exactly where an in-person evaluation earns its keep.
              </p>
              <a href={config.bookingUrl} target="_blank" rel="noreferrer"
                className="mt-6 inline-flex h-12 items-center rounded-full bg-[#111111] px-8 text-[15px] font-semibold text-white hover:brightness-[1.25]">
                Book a free in-person evaluation
              </a>
            </div>
          )}

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-[#E4E4E7] bg-white p-6 shadow-[0_6px_20px_rgba(20,20,43,0.08)]">
              <b className="text-[15px] text-[#111111]">Market direction — HPI benchmark</b>
              <p className="mb-3 mt-1.5 text-[13.5px] text-[#333333]/70">
                {propertyType} homes{result.hpi ? `, ${result.hpi.label}` : ""} · last 12 months
              </p>
              {result.hpi?.change12m != null ? (
                <>
                  <svg viewBox="0 0 300 90" className="h-[90px] w-full" aria-hidden="true">
                    <polyline fill="none" stroke="#0066cc" strokeWidth="3" strokeLinecap="round"
                      points={result.hpi.change12m >= 0
                        ? "0,70 30,66 60,68 90,60 120,62 150,54 180,56 210,46 240,48 270,36 300,30"
                        : "0,30 30,36 60,34 90,44 120,42 150,52 180,50 210,60 240,58 270,68 300,72"} />
                    <circle cx="300" cy={result.hpi.change12m >= 0 ? 30 : 72} r="5" fill="#0066cc" />
                  </svg>
                  <div className="text-[14px]">
                    <b className="text-[var(--hev-accent)]">{result.hpi.change12m > 0 ? "+" : ""}{result.hpi.change12m}%</b>{" "}
                    <span className="text-[#333333]/65">over the last 12 months</span>
                  </div>
                </>
              ) : (
                <p className="text-[14px] text-[#333333]/65">HPI data isn't available for this area yet.</p>
              )}
            </div>
            <div className="rounded-2xl border border-[#E4E4E7] bg-white p-6 shadow-[0_6px_20px_rgba(20,20,43,0.08)]">
              <b className="text-[15px] text-[#111111]">Why a range?</b>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#333333]/75">
                List prices are asking prices, not sold prices — and no estimate has walked through your home.
                Finish quality, layout, lot and upgrades move a property within its band. The in-person
                evaluation is where the real number gets set.
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-[#E4E4E7] bg-[#f7f7f7] px-6 py-5 text-[13px] leading-relaxed text-[#333333]/75">
            <b className="text-[#111111]">Please note:</b> {config.disclaimer}
          </div>

          {/* STEP 3 — convert */}
          <span className="mb-3 mt-12 inline-block rounded-full bg-[#e8f1fb] px-3.5 py-1.5 text-[12px] font-bold text-[var(--hev-accent)]">
            Next step
          </span>
          <h2 className="text-[28px] font-extrabold tracking-tight text-[#111111]">Take it further</h2>
          <p className="mt-1.5 text-[15px] text-[#333333]/75">Your property details are ready — choose how you'd like the full picture.</p>

          <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="rounded-2xl border border-[#E4E4E7] bg-white p-8 shadow-[0_6px_20px_rgba(20,20,43,0.08)]">
              {leadState === "done" ? (
                <div className="py-8 text-center" role="status">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#111111] text-xl font-bold text-white">✓</div>
                  <h3 className="text-[20px] font-bold text-[#111111]">You're on the list</h3>
                  <p className="mt-2 text-[14.5px] text-[#333333]/75">Your detailed breakdown is on its way. Rohit will follow up personally.</p>
                </div>
              ) : (
                <form onSubmit={submitLead}>
                  <h3 className="text-[22px] font-extrabold tracking-tight text-[#111111]">Get the full breakdown</h3>
                  <p className="mb-4 mt-2 text-[14.5px] text-[#333333]/75">
                    We'll email your detailed estimate — the similar listings, the market notes, and where your
                    home sits among them — and keep your property details on file.
                  </p>
                  <label className={labelCls} htmlFor="hev-name">Full name</label>
                  <input id="hev-name" name="name" type="text" required placeholder="Jane Doe" className={inputCls} />
                  <div className="mt-4">
                    <label className={labelCls} htmlFor="hev-email">Email</label>
                    <input id="hev-email" name="email" type="email" required placeholder="jane@email.com" className={inputCls} />
                  </div>
                  <div className="mt-4">
                    <label className={labelCls} htmlFor="hev-phone">Phone <span className="font-normal text-[#333333]/60">(optional)</span></label>
                    <input id="hev-phone" name="phone" type="tel" placeholder="(905) 555-0123" className={inputCls} />
                  </div>
                  {leadState === "error" && <p className="mt-3 text-[13px] text-red-700">{leadError}</p>}
                  <button type="submit" disabled={leadState === "sending"}
                    className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-full bg-[var(--hev-accent)] px-6 text-[16px] font-semibold text-white transition hover:brightness-110 disabled:opacity-60">
                    {leadState === "sending" ? "Sending…" : "Send my report"}
                  </button>
                  <p className="mt-3.5 text-center text-[12.5px] text-[#333333]/60">Free · No spam — just your report and one follow-up.</p>
                </form>
              )}
            </div>

            <div className="rounded-2xl bg-[#111111] p-8 text-white">
              <h3 className="text-[22px] font-extrabold tracking-tight">Want the real number?</h3>
              <p className="mb-2 mt-2 text-[14.5px] text-white/65">
                An estimate can't see your kitchen. A 20-minute walkthrough gives you a valuation you can actually price from.
              </p>
              <div className="mt-5 grid gap-3">
                <a href={config.bookingUrl} target="_blank" rel="noreferrer"
                  className="inline-flex h-12 items-center justify-center rounded-full bg-white px-6 text-[15px] font-semibold text-[#111111] transition hover:bg-white/90">
                  Book a free in-person evaluation
                </a>
                {config.virtualCmaUrl && (
                  <a href={config.virtualCmaUrl} target="_blank" rel="noreferrer"
                    className="inline-flex h-12 items-center justify-center rounded-full border border-white/25 px-6 text-[15px] font-semibold text-white transition hover:bg-white/10">
                    Request a virtual CMA instead
                  </a>
                )}
              </div>
              <p className="mt-4 text-center text-[12.5px] text-white/45">Typically scheduled within 48 hours · Caledonia &amp; area</p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
