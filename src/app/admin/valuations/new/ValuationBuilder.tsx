"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type ActiveComp = {
  ListingKey: string; ListPrice: number | null; UnparsedAddress: string | null; City: string | null;
  BedroomsTotal: number | null; BathroomsTotalInteger: number | null; AboveGradeFinishedArea: number | null;
  OriginalEntryTimestamp: string | null; Media: string | null; _distKm?: number;
};
type SoldComp = { address: string; price: number | null; date: string; beds: string; baths: string; sqft: string };

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
    return { address, price, date, beds, baths, sqft };
  });
}

export default function ValuationBuilder() {
  const router = useRouter();
  const qs = useSearchParams();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

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
  const [upgrades, setUpgrades] = useState("");
  const [geocoding, setGeocoding] = useState(false);

  // Active comps
  const [actives, setActives] = useState<ActiveComp[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [loadingActives, setLoadingActives] = useState(false);

  // Sold comps
  const [soldText, setSoldText] = useState("");
  const solds = parseSold(soldText);

  // Pricing
  const [priceLow, setPriceLow] = useState("");
  const [priceHigh, setPriceHigh] = useState("");
  const [priceRec, setPriceRec] = useState("");
  const [pricingNotes, setPricingNotes] = useState("");

  async function geocode() {
    if (!address.trim()) return;
    setGeocoding(true);
    try {
      const r = await fetch(`/api/geocode?q=${encodeURIComponent(address + (city ? ", " + city : ""))}`);
      const j = await r.json();
      const hit = j.results?.[0] ?? j;
      if (hit?.lat && hit?.lng) {
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
      const list: ActiveComp[] = j.listings ?? j.similar ?? [];
      setActives(list);
      setPicked(new Set(list.slice(0, 6).map((l) => l.ListingKey)));
    } finally { setLoadingActives(false); }
  }

  function suggestPricing() {
    const ap = actives.filter((a) => picked.has(a.ListingKey) && a.ListPrice).map((a) => a.ListPrice!);
    const sp = solds.filter((s) => s.price).map((s) => s.price!);
    const all = [...ap, ...sp].sort((a, b) => a - b);
    if (!all.length) return;
    const med = all[Math.floor(all.length / 2)];
    const lo = Math.round((med * 0.97) / 1000) * 1000;
    const hi = Math.round((med * 1.03) / 1000) * 1000;
    setPriceLow(String(lo)); setPriceHigh(String(hi)); setPriceRec(String(med));
  }

  function toggle(k: string) {
    setPicked((p) => { const n = new Set(p); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  }

  async function save() {
    setSaving(true);
    try {
      const r = await fetch("/api/valuation-reports", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id: qs.get("lead_id") || null,
          address, city, lat: lat ? Number(lat) : null, lng: lng ? Number(lng) : null,
          property_type: propertyType, beds: beds ? Number(beds) : null, baths: baths ? Number(baths) : null,
          sqft, lot_size: lotSize, year_built: yearBuilt, upgrades,
          active_comps: actives.filter((a) => picked.has(a.ListingKey)),
          sold_comps: solds,
          price_low: priceLow ? Number(priceLow) : null,
          price_high: priceHigh ? Number(priceHigh) : null,
          recommended_price: priceRec ? Number(priceRec) : null,
          pricing_notes: pricingNotes,
        }),
      });
      const j = await r.json();
      if (j.id) router.push(`/admin/valuations/${j.id}`);
    } finally { setSaving(false); }
  }

  const input = "w-full rounded-lg border border-line px-3 py-2 text-sm";
  const label = "block text-xs font-semibold text-muted mb-1";

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold mb-1">New valuation report</h1>
      <div className="flex gap-2 mb-6 text-sm">
        {[1, 2, 3, 4].map((n) => (
          <button key={n} onClick={() => setStep(n)}
            className={`px-3 py-1.5 rounded-full font-semibold ${step === n ? "bg-black text-white" : "bg-gray-100 text-muted"}`}>
            {["Property", "Active comps", "Sold comps", "Pricing"][n - 1]}
          </button>
        ))}
      </div>

      {step === 1 && (
        <div className="flex flex-col gap-4">
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
          <div><label className={label}>Upgrades / notes</label><textarea className={input} rows={3} value={upgrades} onChange={(e) => setUpgrades(e.target.value)} /></div>
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
                <div className="font-semibold">{a.UnparsedAddress}, {a.City} — {money(a.ListPrice)}</div>
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
            <label className={label}>Paste sold comparables (one per line)</label>
            <textarea className={input} rows={8} value={soldText} onChange={(e) => setSoldText(e.target.value)}
              placeholder={"123 Main St, Caledonia | $685,000 | 2026-08-14 | 4bd 3ba 2200sqft"} />
          </div>
          {!!solds.length && (
            <div className="rounded-lg border border-line overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 text-left text-xs text-muted">
                  <th className="p-2">Address</th><th className="p-2">Sold</th><th className="p-2">Date</th><th className="p-2">Beds/Baths/Sqft</th>
                </tr></thead>
                <tbody>{solds.map((s, i) => (
                  <tr key={i} className="border-t border-line"><td className="p-2">{s.address}</td><td className="p-2 font-semibold">{money(s.price)}</td><td className="p-2">{s.date}</td><td className="p-2">{[s.beds && s.beds + "bd", s.baths && s.baths + "ba", s.sqft && s.sqft + "sf"].filter(Boolean).join(" · ")}</td></tr>
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
          <div><label className={label}>Pricing notes</label><textarea className={input} rows={3} value={pricingNotes} onChange={(e) => setPricingNotes(e.target.value)} placeholder="Why this price — condition, upgrades, market…" /></div>
          <div className="text-sm text-muted">{picked.size} active comps · {solds.length} sold comps selected</div>
          <div className="flex gap-2">
            <button onClick={() => setStep(3)} className="rounded-lg border border-line px-4 py-2 text-sm">← Back</button>
            <button onClick={save} disabled={saving || !address.trim()} className="rounded-lg bg-black px-6 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {saving ? "Saving…" : "Save report"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
