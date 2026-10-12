"use client";

import { useEffect, useState } from "react";
import { CityPicker } from "./CityPicker";

type PreconSub = {
  id: string;
  email: string;
  filters: { all_projects?: boolean; cities?: string[]; min_price?: number | null; max_price?: number | null };
  is_active: boolean;
  created_at: string;
};

type Alert = {
  id: string;
  criteria: Record<string, any> | null;
  criteria_summary: string | null;
  is_active: boolean;
  created_at: string;
};

type RateSub = {
  id: string;
  email: string;
  is_active: boolean;
  created_at: string;
};

function alertLabel(a: Alert): string {
  // Prefer showing actual cities from criteria over the stored summary
  const c = a.criteria ?? {};
  const cities = Array.isArray(c.cities) ? c.cities : c.city ? [c.city] : [];
  if (cities.length > 0) {
    const parts = [cities.join(", ")];
    if (c.minPrice || c.maxPrice) {
      const lo = c.minPrice ? `$${Number(c.minPrice).toLocaleString()}` : "";
      const hi = c.maxPrice ? `$${Number(c.maxPrice).toLocaleString()}` : "";
      parts.push(`${lo}–${hi}`.replace(/^–/, "Under "));
    }
    return parts.join(" · ");
  }
  return a.criteria_summary || "Saved search";
}

function typeBadges(c: Alert["criteria"]): string {
  if (!c || !c.type) return "";
  if (c.type === "rent") return "For Rent";
  if (c.type === "sale") return "For Sale";
  return "";
}

function filterLabel(f: PreconSub["filters"]): string {
  if (!f || f.all_projects) return "All projects";
  const parts: string[] = [];
  if (f.cities?.length) parts.push(f.cities.join(", "));
  if (f.min_price || f.max_price) {
    const lo = f.min_price ? `$${f.min_price.toLocaleString()}` : "";
    const hi = f.max_price ? `$${f.max_price.toLocaleString()}` : "";
    parts.push(`${lo}–${hi}`.replace(/^–/, "Under "));
  }
  return parts.length ? parts.join(" · ") : "All projects";
}

export function LeadSubscriptionsPanel({ leadId }: { leadId: string }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [precon, setPrecon] = useState<PreconSub[]>([]);
  const [rates, setRates] = useState<RateSub[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addType, setAddType] = useState<"picker" | "precon" | "property" | "rate" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingAlertId, setEditingAlertId] = useState<string | null>(null);
  const [cities, setCities] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  // Property alert form fields
  const [paCities, setPaCities] = useState<string[]>([]);
  const [paType, setPaType] = useState("sale");
  const [paMin, setPaMin] = useState("");
  const [paMax, setPaMax] = useState("");
  const [paBeds, setPaBeds] = useState("");
  const [paBaths, setPaBaths] = useState("");
  const [paHomeType, setPaHomeType] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/leads/${leadId}/subscriptions`);
      const d = await res.json();
      setAlerts(d.propertyAlerts ?? []);
      setPrecon(d.precon ?? []);
      setRates(d.rates ?? []);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [leadId]);

  async function addPrecon() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/leads/${leadId}/subscriptions`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          all_projects: !cities.trim() && !minPrice && !maxPrice,
          cities: cities.split(",").map((c) => c.trim()).filter(Boolean),
          min_price: minPrice ? Number(minPrice) : undefined,
          max_price: maxPrice ? Number(maxPrice) : undefined,
        }),
      });
      if (res.ok) { setShowAdd(false); setAddType(null); setCities(""); setMinPrice(""); setMaxPrice(""); load(); }
    } finally { setSaving(false); }
  }

  async function startEdit(s: PreconSub) {
    setEditingId(s.id);
    setShowAdd(false);
    setCities((s.filters.cities ?? []).join(", "));
    setMinPrice(s.filters.min_price ? String(s.filters.min_price) : "");
    setMaxPrice(s.filters.max_price ? String(s.filters.max_price) : "");
  }

  function cancelEdit() {
    setEditingId(null);
    setCities(""); setMinPrice(""); setMaxPrice("");
  }

  async function saveEdit() {
    if (!editingId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/leads/${leadId}/subscriptions`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription_id: editingId,
          filters: {
            all_projects: !cities.trim() && !minPrice && !maxPrice,
            cities: cities.split(",").map((c) => c.trim()).filter(Boolean),
            min_price: minPrice ? Number(minPrice) : undefined,
            max_price: maxPrice ? Number(maxPrice) : undefined,
          },
        }),
      });
      if (res.ok) { cancelEdit(); load(); }
    } finally { setSaving(false); }
  }

  async function toggle(id: string, is_active: boolean) {
    await fetch(`/api/admin/leads/${leadId}/subscriptions`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription_id: id, is_active: !is_active }),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm("Remove this pre-con subscription?")) return;
    await fetch(`/api/admin/leads/${leadId}/subscriptions?subscription_id=${id}`, { method: "DELETE" });
    load();
  }

  async function toggleRate(id: string, is_active: boolean) {
    await fetch(`/api/admin/leads/${leadId}/rate-subscription`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription_id: id, is_active: !is_active }),
    });
    load();
  }

  async function addRate() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/leads/${leadId}/rate-subscription`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
      });
      if (res.ok) load();
    } finally { setSaving(false); }
  }

  async function removeRate(id: string) {
    if (!confirm("Remove this rate subscription?")) return;
    await fetch(`/api/admin/leads/${leadId}/rate-subscription?subscription_id=${id}`, { method: "DELETE" });
    load();
  }

  // Property alert CRUD
  function resetPaForm() {
    setPaCities([]); setPaType("sale"); setPaMin(""); setPaMax(""); setPaBeds(""); setPaBaths(""); setPaHomeType("");
  }

  function startEditAlert(a: Alert) {
    const c = a.criteria ?? {};
    setEditingAlertId(a.id);
    setPaCities(Array.isArray(c.cities) ? c.cities : (c.city ? [c.city] : []));
    setPaType(c.type === "rent" ? "rent" : c.type === "sale" ? "sale" : "all");
    setPaMin(c.minPrice ? String(c.minPrice) : "");
    setPaMax(c.maxPrice ? String(c.maxPrice) : "");
    setPaBeds(c.beds || "");
    setPaBaths(c.baths || "");
    setPaHomeType(c.homeType || "");
  }

  async function savePropertyAlert() {
    setSaving(true);
    try {
      const payload = {
        cities: paCities,
        type: paType === "all" ? undefined : paType,
        minPrice: paMin ? Number(paMin) : undefined,
        maxPrice: paMax ? Number(paMax) : undefined,
        beds: paBeds || undefined,
        baths: paBaths || undefined,
        homeType: paHomeType || undefined,
      };
      let res;
      if (editingAlertId) {
        res = await fetch(`/api/admin/leads/${leadId}/property-alert`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ search_id: editingAlertId, ...payload }),
        });
      } else {
        res = await fetch(`/api/admin/leads/${leadId}/property-alert`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      if (res.ok) { setEditingAlertId(null); setAddType(null); resetPaForm(); load(); }
    } finally { setSaving(false); }
  }

  async function toggleAlert(id: string, is_active: boolean) {
    await fetch(`/api/admin/leads/${leadId}/property-alert`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ search_id: id, is_active: !is_active }),
    });
    load();
  }

  async function removeAlert(id: string) {
    if (!confirm("Remove this property alert?")) return;
    await fetch(`/api/admin/leads/${leadId}/property-alert?search_id=${id}`, { method: "DELETE" });
    load();
  }

  function paForm() {
    const inputCls = "rounded border border-line px-3 py-2 text-sm";
    const selectCls = "rounded border border-line px-3 py-2 text-sm bg-white";
    return (
      <div className="mb-3 flex flex-col gap-3 rounded-lg border border-line bg-white p-4">
        <p className="text-xs text-muted">{editingAlertId ? "Edit property alert:" : "New property alert:"}</p>

        {/* All / For Sale / For Rent segmented */}
        <div className="flex rounded-lg border border-line bg-white p-1">
          <button type="button" onClick={() => setPaType("all")}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium ${paType === "all" ? "bg-[#111] text-white" : ""}`}>
            All
          </button>
          <button type="button" onClick={() => setPaType("sale")}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium ${paType === "sale" ? "bg-[#111] text-white" : ""}`}>
            For Sale
          </button>
          <button type="button" onClick={() => setPaType("rent")}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium ${paType === "rent" ? "bg-[#111] text-white" : ""}`}>
            For Rent
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <CityPicker selected={paCities} onChange={setPaCities} />

          <select value={paMin} onChange={(e) => setPaMin(e.target.value)} className={selectCls}>
            <option value="">Min Price ▾</option>
            <option value="100000">$100k</option>
            <option value="200000">$200k</option>
            <option value="300000">$300k</option>
            <option value="400000">$400k</option>
            <option value="500000">$500k</option>
            <option value="600000">$600k</option>
            <option value="750000">$750k</option>
            <option value="1000000">$1M</option>
            <option value="1500000">$1.5M</option>
          </select>
          <select value={paMax} onChange={(e) => setPaMax(e.target.value)} className={selectCls}>
            <option value="">Max Price ▾</option>
            <option value="200000">$200k</option>
            <option value="300000">$300k</option>
            <option value="400000">$400k</option>
            <option value="500000">$500k</option>
            <option value="600000">$600k</option>
            <option value="750000">$750k</option>
            <option value="1000000">$1M</option>
            <option value="1500000">$1.5M</option>
            <option value="2000000">$2M</option>
          </select>

          <select value={paBeds} onChange={(e) => setPaBeds(e.target.value)} className={selectCls}>
            <option value="">Any Beds ▾</option>
            <option value="1">1+ beds</option>
            <option value="2">2+ beds</option>
            <option value="3">3+ beds</option>
            <option value="4">4+ beds</option>
            <option value="5">5+ beds</option>
          </select>
          <select value={paBaths} onChange={(e) => setPaBaths(e.target.value)} className={selectCls}>
            <option value="">Any Baths ▾</option>
            <option value="1">1+ baths</option>
            <option value="2">2+ baths</option>
            <option value="3">3+ baths</option>
            <option value="4">4+ baths</option>
          </select>

          <select value={paHomeType} onChange={(e) => setPaHomeType(e.target.value)} className={`${selectCls} col-span-2`}>
            <option value="">Home Type ▾</option>
            <option value="Detached">Detached</option>
            <option value="Semi-Detached">Semi-Detached</option>
            <option value="Townhouse">Townhouse</option>
            <option value="Condo">Condo / Apartment</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button onClick={savePropertyAlert} disabled={saving}
            className="w-fit rounded bg-[#111] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
            {saving ? "Saving…" : editingAlertId ? "Save changes" : "Add alert"}
          </button>
          <button onClick={() => { setEditingAlertId(null); setAddType(null); resetPaForm(); }} className="text-sm text-muted underline">Cancel</button>
        </div>
      </div>
    );
  }

  if (loading) return <p className="text-sm text-muted">Loading subscriptions…</p>;

  return (
    <div className="flex flex-col gap-6">
      {/* Pre-con */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Pre-con alerts</h3>
          <button onClick={() => { setAddType(addType ? null : "picker"); setShowAdd(false); }} className="text-sm text-accent underline">
            {addType ? "Cancel" : "+ Add subscription"}
          </button>
        </div>
        {addType === "picker" ? (
          <div className="mb-3 flex flex-col gap-2 rounded-lg border border-line bg-white p-4">
            <p className="text-xs text-muted">What type of subscription?</p>
            <div className="flex flex-col gap-2">
              <button onClick={() => { setAddType("precon"); setShowAdd(true); }}
                className="rounded-lg border border-line px-4 py-3 text-left text-sm font-medium hover:bg-gray-50">
                Pre-con alerts <span className="block text-xs font-normal text-muted">New project launches</span>
              </button>
              <button onClick={() => { setAddType("property"); }}
                className="rounded-lg border border-line px-4 py-3 text-left text-sm font-medium hover:bg-gray-50">
                Property alert <span className="block text-xs font-normal text-muted">For Sale / For Rent listings</span>
              </button>
              <button onClick={() => { setAddType("rate"); }}
                className="rounded-lg border border-line px-4 py-3 text-left text-sm font-medium hover:bg-gray-50">
                BoC rate alerts <span className="block text-xs font-normal text-muted">Bank of Canada rate changes</span>
              </button>
            </div>
          </div>
        ) : null}
        {addType === "property" ? paForm() : null}
        {addType === "rate" ? (
          <div className="mb-3 rounded-lg border border-line bg-white p-4">
            <p className="text-sm">Subscribe this lead to BoC rate updates?</p>
            <div className="mt-2 flex gap-2">
              <button onClick={() => { addRate(); setAddType(null); }} disabled={saving}
                className="w-fit rounded bg-[#111] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                {saving ? "Adding…" : "Subscribe"}
              </button>
              <button onClick={() => setAddType(null)} className="text-sm text-muted underline">Cancel</button>
            </div>
          </div>
        ) : null}
        {showAdd && addType === "precon" ? (
          <div className="mb-3 flex flex-col gap-2 rounded-lg border border-line bg-white p-4">
            <p className="text-xs text-muted">Leave blank for all projects, or set filters:</p>
            <input value={cities} onChange={(e) => setCities(e.target.value)} placeholder="Cities (comma separated, e.g. Caledonia, Hamilton)"
              className="rounded border border-line px-3 py-2 text-sm" />
            <div className="flex gap-2">
              <input value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="Min price" type="number"
                className="w-1/2 rounded border border-line px-3 py-2 text-sm" />
              <input value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="Max price" type="number"
                className="w-1/2 rounded border border-line px-3 py-2 text-sm" />
            </div>
            <button onClick={addPrecon} disabled={saving}
              className="w-fit rounded bg-[#111] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              {saving ? "Adding…" : "Add subscription"}
            </button>
          </div>
        ) : null}
        {precon.length === 0 ? <p className="text-sm text-muted">No pre-con subscriptions.</p> : (
          <ul className="flex flex-col gap-2">
            {precon.map((s) => (
              <li key={s.id} className="rounded-lg border border-line bg-white px-4 py-3">
                {editingId === s.id ? (
                  <div className="flex flex-col gap-2">
                    <p className="text-xs text-muted">Edit filters (blank for all projects):</p>
                    <input value={cities} onChange={(e) => setCities(e.target.value)} placeholder="Cities (comma separated)"
                      className="rounded border border-line px-3 py-2 text-sm" />
                    <div className="flex gap-2">
                      <input value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="Min price" type="number"
                        className="w-1/2 rounded border border-line px-3 py-2 text-sm" />
                      <input value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="Max price" type="number"
                        className="w-1/2 rounded border border-line px-3 py-2 text-sm" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={saveEdit} disabled={saving}
                        className="w-fit rounded bg-[#111] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                        {saving ? "Saving…" : "Save"}
                      </button>
                      <button onClick={cancelEdit} className="text-sm text-muted underline">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">{filterLabel(s.filters)}</div>
                      <div className="text-xs text-muted">{s.email} · {s.is_active ? "Active" : "Paused"}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(s)} className="text-xs text-accent underline">Edit</button>
                      <button onClick={() => toggle(s.id, s.is_active)} className="text-xs text-accent underline">
                        {s.is_active ? "Pause" : "Resume"}
                      </button>
                      <button onClick={() => remove(s.id)} className="text-xs text-red-600 underline">Remove</button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Property alerts */}
      <section>
        <h3 className="mb-3 text-sm font-semibold">Property alerts</h3>
        {editingAlertId ? paForm() : null}
        {alerts.length === 0 && !editingAlertId ? <p className="text-sm text-muted">No property alerts.</p> : (
          <ul className="flex flex-col gap-2">
            {alerts.map((a) => {
              const badges = typeBadges(a.criteria);
              return (
                <li key={a.id} className="flex items-center justify-between rounded-lg border border-line bg-white px-4 py-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium">{alertLabel(a)}</div>
                      {badges ? (
                        <span className="rounded-full bg-[#f0f4fa] px-2 py-0.5 text-[11px] font-medium text-[#0066cc]">{badges}</span>
                      ) : null}
                    </div>
                    <div className="text-xs text-muted">{a.is_active ? "Active" : "Paused"}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => startEditAlert(a)} className="text-xs text-accent underline">Edit</button>
                    <button onClick={() => toggleAlert(a.id, a.is_active)} className="text-xs text-accent underline">
                      {a.is_active ? "Pause" : "Resume"}
                    </button>
                    <button onClick={() => removeAlert(a.id)} className="text-xs text-red-600 underline">Remove</button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Bank of Canada rate alerts */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Bank of Canada rate alerts</h3>
          {rates.length === 0 ? (
            <button onClick={addRate} disabled={saving} className="text-sm text-accent underline disabled:opacity-50">
              + Subscribe
            </button>
          ) : null}
        </div>
        {rates.length === 0 ? <p className="text-sm text-muted">Not subscribed.</p> : (
          <ul className="flex flex-col gap-2">
            {rates.map((r) => (
              <li key={r.id} className="flex items-center justify-between rounded-lg border border-line bg-white px-4 py-3">
                <div>
                  <div className="text-sm font-medium">Rate updates</div>
                  <div className="text-xs text-muted">{r.email} · {r.is_active ? "Active" : "Paused"}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => toggleRate(r.id, r.is_active)} className="text-xs text-accent underline">
                    {r.is_active ? "Pause" : "Resume"}
                  </button>
                  <button onClick={() => removeRate(r.id)} className="text-xs text-red-600 underline">Remove</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
