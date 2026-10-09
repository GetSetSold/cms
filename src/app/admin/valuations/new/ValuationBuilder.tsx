"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type ActiveComp = {
  ListingKey: string; ListPrice: number | null; UnparsedAddress: string | null; City: string | null;
  BedroomsTotal: number | null; BathroomsTotalInteger: number | null; AboveGradeFinishedArea: number | null;
  OriginalEntryTimestamp: string | null; Media: string | null; _distKm?: number; _dom?: number | null;
};
type SoldComp = { address: string; price: number | null; date: string; beds: string; baths: string; sqft: string; dom: string };
type UpgradeItem = { description: string; amount: string };

const money = (n: number | null | undefined) => (n ? "$" + Math.round(n).toLocaleString() : "—");

/** Parse pasted sold comps: "123 Main St, Caledonia | $685,000 | 2026-08-14 | 4bd 3ba 2200sqft" */
function parseSold(text: string): SoldComp[] {
  return text.split("\n").map((l) => l.trim()).filter(Boolean).map((line) => {
    const parts = line.split("|").map((p) => p.trim());
    const address = parts[0] ?? line;
    const priceDigits = (parts[1] ?? "").replace(/[^0-9]/g, "");
    const price = priceDigits ? parseInt(priceDigits, 10) : null;
    const date = parts[2] ?? "";
    const specs = parts[3] ?? "";
    const beds = (/(\d+)\s*bd/i.exec(specs)?.[1]) ?? "";
    const baths = (/(\d+(?:\.\d+)?)\s*ba/i.exec(specs)?.[1]) ?? "";
    const sqft = (/([\d,]+)\s*(?:sqft|sf)/i.exec(specs)?.[1]) ?? "";
    const dom = (/^(\d+)\s*(?:dom)?$/i.exec((parts[4] ?? "").trim())?.[1]) ?? "";
    return { address, price, date, beds, baths, sqft, dom };
  });
}

const PRESENTATION_SECTIONS = [
  { key: "agent", label: "Meet the agent" },
  { key: "why", label: "Why list with me" },
  { key: "comparison", label: "Value comparison" },
  { key: "marketing", label: "Marketing strategy" },
  { key: "reasons", label: "20 reasons to list with me" },
  { key: "reviews", label: "Client reviews" },
  { key: "cta", label: "Contact / next steps" },
];

const DEFAULT_AGENT = {
  name: "Rohit Sharma",
  phone: "416-605-7488",
  email: "rohit@getsetsold.com",
  brokerage: "Lombard Group Real Estate Inc., Brokerage",
  tagline: "Your Trusted Partner in Real Estate",
  photo: "",
  bio: "With over a decade of experience in the Greater Toronto Area's dynamic real estate market, Rohit Sharma has established himself as a trusted advisor for both buyers and sellers. Specializing in residential properties, Rohit combines deep market knowledge with cutting-edge technology to deliver exceptional results. His client-first approach and innovative 1% commission model have saved homeowners over $2 million in commission fees while maintaining full-service quality. Rohit is committed to transparent pricing, honest communication, and ensuring every client feels confident throughout their real estate journey.",
};

const STEP_NAMES = ["Property", "Active comps", "Sold comps", "Pricing", "Presentation"];

/** Parse a price like $640,000 / $635K / 640000 */
function parsePrice(s: string): number | null {
  const t = s.trim().replace(/\$/g, "").replace(/,/g, "");
  const km = /^([\d.]+)\s*K$/i.exec(t);
  if (km) return Math.round(parseFloat(km[1]) * 1000);
  const nm = /^[\d.]+/.exec(t);
  if (nm) { const v = parseFloat(nm[0]); return v >= 1000 ? Math.round(v) : null; }
  return null;
}

/** Organize pasted raw comp data (MLS copy, PDF text, spreadsheet rows) into structured comps. */
function parseRawComps(text: string): SoldComp[] {
  // MLS-style tab-separated table: use column positions, skip header/subject/active rows.
  if (text.includes("\t")) {
    const lines = text.split("\n");
    let i = 0;
    while (i < lines.length && !/^\s*#\s*\t.*ADDRESS/i.test(lines[i])) i++;
    i++; // skip header
    while (i < lines.length && !/^\s*\d+\s*\t/.test(lines[i])) i++; // skip subject block
    const recs: string[][] = [];
    let buf = "";
    for (; i < lines.length; i++) {
      buf += (buf ? "\n" : "") + lines[i];
      if (/X\d{5,}/.test(buf)) {
        const toks = buf.split(/[\t\n]+/).map((t) => t.trim()).filter(Boolean);
        if (toks.length >= 10) recs.push(toks);
        buf = "";
      }
    }
    return recs
      .map((t) => ({
        address: t[1] ?? "",
        price: parsePrice(t[7] ?? ""),
        date: /^\d{1,2}\/\d{1,2}\//.test(t[9] ?? "") ? t[9] : "",
        beds: (t[5] ?? "").replace(/\s+/g, ""),
        baths: t[6] ?? "",
        sqft: "",
        dom: /^\d+$/.test(t[10] ?? "") ? t[10] : "",
        _status: t[2] ?? "",
      }))
      .filter((r) => /sold/i.test(r._status) && r.address && r.price)
      .map(({ _status, ...rest }) => rest);
  }
  // Fallback: one comp per line, freeform.
  return text.split("\n").map((l) => l.trim()).filter(Boolean).map((line) => {
    const s = line.replace(/^\d+[\.\)]\s+/, ""); // strip leading "1." / "1)"
    const pm = /\$\s*([\d,]+)/.exec(s);
    const price = pm ? parsePrice(pm[0]) : null;
    const dm = /(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2})/.exec(s);
    const date = dm ? dm[1] : "";
    const addrEnd = pm ? (pm.index ?? s.length) : (dm ? (dm.index ?? s.length) : s.length);
    const address = s.slice(0, addrEnd).replace(/[\t|,;]+$/, "").trim()
      .replace(/\s+(sold|active|new|conditional|for sale)$/i, "").trim();
    const beds = (/(\d+)\s*bd/i.exec(s)?.[1]) ?? "";
    const baths = (/(\d+(?:\.\d+)?)\s*ba/i.exec(s)?.[1]) ?? "";
    const sqft = (/([\d,]+)\s*(?:sqft|sf)/i.exec(s)?.[1]) ?? "";
    return { address, price, date, beds, baths, sqft, dom: "" };
  }).filter((c) => c.address || c.price);
}

export default function ValuationBuilder() {
  const router = useRouter();
  const qs = useSearchParams();
  const editId = qs.get("id");
  const leadId = qs.get("lead_id");
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!editId);

  // Property
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [propertyType, setPropertyType] = useState("Detached");
  const [beds, setBeds] = useState("");
  const [baths, setBaths] = useState("");
  const [sqft, setSqft] = useState("");
  const [lotSize, setLotSize] = useState("");
  const [yearBuilt, setYearBuilt] = useState("");
  const [upgrades, setUpgrades] = useState<UpgradeItem[]>([]);
  const [notes, setNotes] = useState("");
  const [clientName, setClientName] = useState("");
  const [geocoding, setGeocoding] = useState(false);

  // Active comps
  const [actives, setActives] = useState<ActiveComp[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [loadingActives, setLoadingActives] = useState(false);

  // Sold comps
  const [soldText, setSoldText] = useState("");
  const [rawText, setRawText] = useState("");
  const solds = parseSold(soldText);

  function organizeRaw() {
    const parsed = parseRawComps(rawText);
    if (!parsed.length) return;
    const lines = parsed.map((s) =>
      [s.address, s.price ? "$" + s.price.toLocaleString() : "", s.date,
       [s.beds && s.beds + "bd", s.baths && s.baths + "ba", s.sqft && s.sqft + "sf"].filter(Boolean).join(" "),
       s.dom || ""
      ].join(" | "));
    setSoldText((prev) => (prev.trim() ? prev.trim() + "\n" : "") + lines.join("\n"));
    setRawText("");
  }

  // Pricing
  const [priceLow, setPriceLow] = useState("");
  const [priceHigh, setPriceHigh] = useState("");
  const [priceRec, setPriceRec] = useState("");
  const [pricingNotes, setPricingNotes] = useState("");

  // Presentation
  const [includeSections, setIncludeSections] = useState<string[]>(PRESENTATION_SECTIONS.map((s) => s.key));
  const [reviewsSource, setReviewsSource] = useState("elfsight");
  const [agent, setAgent] = useState(DEFAULT_AGENT);

  // Edit mode: load existing report. Otherwise prefill from lead.
  useEffect(() => {
    if (editId) {
      fetch(`/api/valuation-reports/${editId}`).then((r) => r.json()).then((j) => {
        const r = j.report;
        if (r) {
          setAddress(r.address ?? ""); setCity(r.city ?? "");
          setLat(r.lat != null ? String(r.lat) : ""); setLng(r.lng != null ? String(r.lng) : "");
          setPropertyType(r.property_type ?? "Detached");
          setBeds(r.beds != null ? String(r.beds) : ""); setBaths(r.baths != null ? String(r.baths) : "");
          setSqft(r.sqft ?? ""); setLotSize(r.lot_size ?? ""); setYearBuilt(r.year_built ?? "");
          setNotes(r.upgrades ?? "");
          setUpgrades((r.upgrade_items ?? []).map((u: any) => ({ description: u.description ?? "", amount: u.amount ? String(u.amount) : "" })));
          const ac: ActiveComp[] = r.active_comps ?? [];
          setActives(ac); setPicked(new Set(ac.map((a) => a.ListingKey)));
          setSoldText((r.sold_comps ?? []).map((s: any) =>
            [s.address, s.price != null ? "$" + Number(s.price).toLocaleString() : "", s.date || "",
             [s.beds && s.beds + "bd", s.baths && s.baths + "ba", s.sqft && s.sqft + "sf"].filter(Boolean).join(" ")
            ].join(" | ")).join("\n"));
          setPriceLow(r.price_low != null ? String(r.price_low) : "");
          setPriceHigh(r.price_high != null ? String(r.price_high) : "");
          setPriceRec(r.recommended_price != null ? String(r.recommended_price) : "");
          setPricingNotes(r.pricing_notes ?? "");
          const p = r.presentation ?? {};
          if (Array.isArray(p.include)) setIncludeSections(p.include);
          if (p.reviews_source) setReviewsSource(p.reviews_source);
          if (p.agent) setAgent({ ...DEFAULT_AGENT, ...p.agent });
          if (p.client_name) setClientName(p.client_name);
        }
        setLoading(false);
      }).catch(() => setLoading(false));
    } else if (leadId) {
      fetch(`/api/admin/leads/${leadId}`).then((r) => r.json()).then((j) => {
        const l = j.lead;
        if (l) {
          setClientName(`${l.first_name ?? ""} ${l.last_name ?? ""}`.trim());
          const cf = l.custom_fields ?? {};
          const addr = cf.property_address || cf.address || cf.propertyAddress || "";
          if (addr) {
            const m = /^(.+?),\s*([^,]+)$/.exec(String(addr));
            setAddress(m ? m[1].trim() : String(addr));
            if (m) setCity(m[2].trim());
          }
        }
      }).catch(() => {});
    }
  }, []);

  const upgradeTotal = upgrades.reduce((s, u) => s + (Number(u.amount) || 0), 0);

  async function geocode() {
    if (!address.trim()) return;
    setGeocoding(true);
    try {
      const r = await fetch(`/api/geocode?q=${encodeURIComponent(address + (city ? ", " + city : ""))}`);
      const j = await r.json();
      let hit = j.features?.[0];
      // Google predictions carry no geometry — resolve via Place Details.
      if (hit?.placeId && (hit.lat == null || hit.lng == null)) {
        const dr = await fetch(`/api/geocode?placeId=${encodeURIComponent(hit.placeId)}`);
        const dj = await dr.json();
        if (dr.ok && dj.feature?.lat != null && dj.feature?.lng != null) hit = dj.feature;
      }
      if (hit?.lat != null && hit?.lng != null) {
        setLat(String(hit.lat)); setLng(String(hit.lng));
        if (!city && hit.city) setCity(hit.city);
      }
    } finally { setGeocoding(false); }
  }

  async function loadActives() {
    if (!lat || !lng) return;
    setLoadingActives(true);
    try {
      const r = await fetch("/api/evaluate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: Number(lat), lng: Number(lng), propertyType, beds: Number(beds) || undefined, sqft: sqft || undefined }),
      });
      const j = await r.json();
      // /api/evaluate returns transformed rows { address, price, beds, baths, sqft,
      // daysOnMarket, distanceKm, key, image, url } — map to the ActiveComp shape.
      const list: ActiveComp[] = (j.listings ?? []).map((l: any, i: number) => ({
        ListingKey: String(l.key ?? `${l.address ?? "listing"}-${i}`),
        ListPrice: l.price != null ? Number(l.price) : null,
        UnparsedAddress: l.address ?? null,
        City: "",
        BedroomsTotal: l.beds ?? null,
        BathroomsTotalInteger: l.baths ?? null,
        AboveGradeFinishedArea: l.sqft ?? null,
        OriginalEntryTimestamp: null,
        Media: l.image ?? null,
        _distKm: l.distanceKm ?? undefined,
        _dom: l.daysOnMarket ?? null,
      }));
      setActives(list);
      setPicked(new Set(list.slice(0, 6).map((l) => l.ListingKey)));
    } finally { setLoadingActives(false); }
  }

  function suggestPricing() {
    const ap = actives.filter((a) => picked.has(a.ListingKey) && a.ListPrice).map((a) => a.ListPrice!);
    const sp = solds.filter((s) => s.price).map((s) => s.price!);
    const all = [...ap, ...sp].sort((a, b) => a - b);
    if (!all.length) return;
    const med = all[Math.floor(all.length / 2)] + upgradeTotal;
    const lo = Math.round((med * 0.97) / 1000) * 1000;
    const hi = Math.round((med * 1.03) / 1000) * 1000;
    setPriceLow(String(lo)); setPriceHigh(String(hi)); setPriceRec(String(med));
  }

  function toggle(k: string) {
    setPicked((p) => { const n = new Set(p); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  }

  function toggleSection(k: string) {
    setIncludeSections((prev) => prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]);
  }

  async function save() {
    setSaving(true);
    try {
      const body = {
        lead_id: leadId || null,
        address, city, lat: lat ? Number(lat) : null, lng: lng ? Number(lng) : null,
        property_type: propertyType, beds: beds ? Number(beds) : null, baths: baths ? Number(baths) : null,
        sqft, lot_size: lotSize, year_built: yearBuilt, upgrades: notes,
        upgrade_items: upgrades
          .filter((u) => u.description.trim() || Number(u.amount))
          .map((u) => ({ description: u.description.trim(), amount: Number(u.amount) || 0 })),
        active_comps: actives.filter((a) => picked.has(a.ListingKey)),
        sold_comps: solds,
        price_low: priceLow ? Number(priceLow) : null,
        price_high: priceHigh ? Number(priceHigh) : null,
        recommended_price: priceRec ? Number(priceRec) : null,
        pricing_notes: pricingNotes,
        presentation: { include: includeSections, reviews_source: reviewsSource, agent, client_name: clientName || undefined },
      };
      const url = editId ? `/api/valuation-reports/${editId}` : "/api/valuation-reports";
      const r = await fetch(url, {
        method: editId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      const id = editId || j.id;
      if (id) router.push(`/admin/valuations/${id}`);
    } finally { setSaving(false); }
  }

  const input = "w-full rounded-lg border border-line px-3 py-2 text-sm";
  const label = "block text-xs font-semibold text-muted mb-1";

  if (loading) return <div className="p-6">Loading report…</div>;

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold mb-1">{editId ? "Edit valuation report" : "New valuation report"}</h1>
      <div className="flex gap-2 mb-6 text-sm flex-wrap">
        {STEP_NAMES.map((name, i) => (
          <button key={name} onClick={() => setStep(i + 1)}
            className={`px-3 py-1.5 rounded-full font-semibold ${step === i + 1 ? "bg-black text-white" : "bg-gray-100 text-muted"}`}>
            {name}
          </button>
        ))}
      </div>

      {step === 1 && (
        <div className="flex flex-col gap-4">
          <div>
            <label className={label}>Prepared for (client name)</label>
            <input className={input} value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Client name" />
          </div>
          <div>
            <label className={label}>Property address *</label>
            <div className="flex gap-2">
              <input className={input} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St" />
              <button onClick={geocode} disabled={geocoding} className="px-4 rounded-lg border border-line text-sm font-semibold whitespace-nowrap">
                {geocoding ? "…" : "Locate"}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={label}>City</label><input className={input} value={city} onChange={(e) => setCity(e.target.value)} /></div>
            <div><label className={label}>Type</label>
              <select className={input} value={propertyType} onChange={(e) => setPropertyType(e.target.value)}>
                {["Detached", "Semi-Detached", "Townhouse", "Condo Apartment", "Condo Townhouse"].map((t) => <option key={t}>{t}</option>)}
              </select></div>
            <div><label className={label}>Beds</label><input className={input} value={beds} onChange={(e) => setBeds(e.target.value)} inputMode="numeric" /></div>
            <div><label className={label}>Baths</label><input className={input} value={baths} onChange={(e) => setBaths(e.target.value)} inputMode="numeric" /></div>
            <div><label className={label}>Sqft</label><input className={input} value={sqft} onChange={(e) => setSqft(e.target.value)} /></div>
            <div><label className={label}>Lot size</label><input className={input} value={lotSize} onChange={(e) => setLotSize(e.target.value)} /></div>
            <div><label className={label}>Year built</label><input className={input} value={yearBuilt} onChange={(e) => setYearBuilt(e.target.value)} /></div>
            <div><label className={label}>Lat / Lng {lat && lng ? "✓" : ""}</label><input className={input} value={lat && lng ? `${lat}, ${lng}` : ""} readOnly placeholder="Click Locate" /></div>
          </div>
          <div>
            <label className={label}>Upgrades — value adjustments</label>
            {upgrades.map((u, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input className={input} value={u.description} placeholder="e.g. Kitchen renovation"
                  onChange={(e) => setUpgrades((prev) => prev.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} />
                <input className={`${input} !w-32`} value={u.amount} placeholder="$" inputMode="numeric"
                  onChange={(e) => setUpgrades((prev) => prev.map((x, j) => j === i ? { ...x, amount: e.target.value } : x))} />
                <button onClick={() => setUpgrades((prev) => prev.filter((_, j) => j !== i))}
                  className="px-3 rounded-lg border border-line text-muted" aria-label="Remove upgrade">×</button>
              </div>
            ))}
            <button onClick={() => setUpgrades((prev) => [...prev, { description: "", amount: "" }])}
              className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold">+ Add upgrade</button>
            {upgradeTotal > 0 && (
              <p className="text-sm text-muted mt-2">+{money(upgradeTotal)} will be added to the suggested price.</p>
            )}
          </div>
          <div><label className={label}>Notes</label><textarea className={input} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          <button onClick={() => setStep(2)} className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white self-start">Continue →</button>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-4">
          <button onClick={loadActives} disabled={loadingActives || !lat} className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white self-start disabled:opacity-50">
            {loadingActives ? "Loading…" : actives.length ? "Reload active comps" : "Load active comps"}
          </button>
          {!lat && <p className="text-sm text-muted">Locate the property first (step 1) to pull nearby active listings.</p>}
          {actives.map((a) => (
            <label key={a.ListingKey} className="flex items-start gap-3 rounded-lg border border-line p-3 cursor-pointer hover:bg-gray-50">
              <input type="checkbox" checked={picked.has(a.ListingKey)} onChange={() => toggle(a.ListingKey)} className="mt-1" />
              <div className="text-sm">
                <div className="font-semibold">{a.UnparsedAddress}{a.City ? `, ${a.City}` : ""} — {money(a.ListPrice)}</div>
                <div className="text-muted">{a.BedroomsTotal}bd · {a.BathroomsTotalInteger}ba · {a.AboveGradeFinishedArea ? Number(a.AboveGradeFinishedArea).toLocaleString() + " sqft" : "—"}{a._distKm ? ` · ${a._distKm.toFixed(1)} km` : ""}</div>
              </div>
            </label>
          ))}
          <div className="flex gap-2">
            <button onClick={() => setStep(1)} className="rounded-lg border border-line px-4 py-2 text-sm">← Back</button>
            <button onClick={() => setStep(3)} className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white">Continue →</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-4">
          <div>
            <label className={label}>Paste raw comp data — we'll organize it</label>
            <textarea className={input} rows={4} value={rawText} onChange={(e) => setRawText(e.target.value)}
              placeholder={"Paste from MLS, a PDF, or a spreadsheet — e.g.\n20 Oak Cres, Hagersville Sold $660,000 11/15/25"} />
            <button onClick={organizeRaw} disabled={!rawText.trim()}
              className="mt-2 rounded-lg border border-line px-4 py-2 text-sm font-semibold disabled:opacity-40">Organize ↓</button>
          </div>
          <div>
            <label className={label}>Sold comparables (one per line — edit as needed)</label>
            <textarea className={input} rows={8} value={soldText} onChange={(e) => setSoldText(e.target.value)}
              placeholder={"123 Main St, Caledonia | $685,000 | 2026-08-14 | 4bd 3ba 2200sqft"} />
          </div>
          {!!solds.length && (
            <div className="rounded-lg border border-line overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 text-left text-xs text-muted">
                  <th className="p-2">Address</th><th className="p-2">Sold</th><th className="p-2">Date</th><th className="p-2">Beds/Baths/Sqft</th><th className="p-2">DOM</th>
                </tr></thead>
                <tbody>{solds.map((s, i) => (
                  <tr key={i} className="border-t border-line"><td className="p-2">{s.address}</td><td className="p-2 font-semibold">{money(s.price)}</td><td className="p-2">{s.date}</td><td className="p-2">{[s.beds && s.beds + "bd", s.baths && s.baths + "ba", s.sqft && s.sqft + "sf"].filter(Boolean).join(" · ")}</td><td className="p-2">{s.dom || "—"}</td></tr>
                ))}</tbody>
              </table>
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={() => setStep(2)} className="rounded-lg border border-line px-4 py-2 text-sm">← Back</button>
            <button onClick={() => setStep(4)} className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white">Continue →</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="flex flex-col gap-4">
          <button onClick={suggestPricing} className="rounded-lg border border-line px-4 py-2 text-sm font-semibold self-start">Suggest from comps</button>
          <div className="grid grid-cols-3 gap-4">
            <div><label className={label}>Range low ($)</label><input className={input} value={priceLow} onChange={(e) => setPriceLow(e.target.value)} inputMode="numeric" /></div>
            <div><label className={label}>Range high ($)</label><input className={input} value={priceHigh} onChange={(e) => setPriceHigh(e.target.value)} inputMode="numeric" /></div>
            <div><label className={label}>Recommended ($)</label><input className={input} value={priceRec} onChange={(e) => setPriceRec(e.target.value)} inputMode="numeric" /></div>
          </div>
          {upgradeTotal > 0 && <p className="text-sm text-muted">Includes +{money(upgradeTotal)} in upgrade adjustments.</p>}
          <div><label className={label}>Pricing notes</label><textarea className={input} rows={3} value={pricingNotes} onChange={(e) => setPricingNotes(e.target.value)} placeholder="Why this price — condition, upgrades, market…" /></div>
          <div className="text-sm text-muted">{picked.size} active comps · {solds.length} sold comps selected</div>
          <div className="flex gap-2">
            <button onClick={() => setStep(3)} className="rounded-lg border border-line px-4 py-2 text-sm">← Back</button>
            <button onClick={() => setStep(5)} className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white">Continue →</button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="flex flex-col gap-4">
          <div>
            <label className={label}>Include in presentation</label>
            <div className="flex flex-col gap-2">
              {PRESENTATION_SECTIONS.map((s) => (
                <label key={s.key} className="flex items-center gap-3 rounded-lg border border-line p-3 cursor-pointer hover:bg-gray-50 text-sm">
                  <input type="checkbox" checked={includeSections.includes(s.key)} onChange={() => toggleSection(s.key)} />
                  <span className="font-medium">{s.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className={label}>Reviews display</label>
            <select className={input} value={reviewsSource} onChange={(e) => setReviewsSource(e.target.value)}>
              <option value="elfsight">Live Google reviews (Elfsight)</option>
              <option value="static">Static review cards</option>
            </select>
          </div>
          <div>
            <label className={label}>Agent name</label>
            <input className={input} value={agent.name} onChange={(e) => setAgent({ ...agent, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={label}>Phone</label><input className={input} value={agent.phone} onChange={(e) => setAgent({ ...agent, phone: e.target.value })} /></div>
            <div><label className={label}>Email</label><input className={input} value={agent.email} onChange={(e) => setAgent({ ...agent, email: e.target.value })} /></div>
          </div>
          <div><label className={label}>Brokerage</label><input className={input} value={agent.brokerage} onChange={(e) => setAgent({ ...agent, brokerage: e.target.value })} /></div>
          <div><label className={label}>Agent photo URL</label><input className={input} value={agent.photo} onChange={(e) => setAgent({ ...agent, photo: e.target.value })} placeholder="https://…" /></div>
          <div><label className={label}>Tagline</label><input className={input} value={agent.tagline} onChange={(e) => setAgent({ ...agent, tagline: e.target.value })} /></div>
          <div><label className={label}>Bio</label><textarea className={input} rows={5} value={agent.bio} onChange={(e) => setAgent({ ...agent, bio: e.target.value })} /></div>
          <div className="flex gap-2">
            <button onClick={() => setStep(4)} className="rounded-lg border border-line px-4 py-2 text-sm">← Back</button>
            <button onClick={save} disabled={saving || !address.trim()} className="rounded-lg bg-black px-6 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {saving ? "Saving…" : editId ? "Save changes" : "Save report"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
