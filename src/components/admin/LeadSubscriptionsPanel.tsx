"use client";

import { useEffect, useState } from "react";

type PreconSub = {
  id: string;
  email: string;
  filters: { all_projects?: boolean; cities?: string[]; min_price?: number | null; max_price?: number | null };
  is_active: boolean;
  created_at: string;
};

type Alert = {
  id: string;
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [cities, setCities] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
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
      if (res.ok) { setShowAdd(false); setCities(""); setMinPrice(""); setMaxPrice(""); load(); }
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

  if (loading) return <p className="text-sm text-muted">Loading subscriptions…</p>;

  return (
    <div className="flex flex-col gap-6">
      {/* Pre-con */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Pre-con alerts</h3>
          <button onClick={() => setShowAdd(!showAdd)} className="text-sm text-accent underline">
            {showAdd ? "Cancel" : "+ Add subscription"}
          </button>
        </div>
        {showAdd ? (
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

      {/* Property alerts (read-only here; managed via /property-alerts/manage) */}
      <section>
        <h3 className="mb-3 text-sm font-semibold">Property alerts</h3>
        {alerts.length === 0 ? <p className="text-sm text-muted">No property alerts.</p> : (
          <ul className="flex flex-col gap-2">
            {alerts.map((a) => (
              <li key={a.id} className="rounded-lg border border-line bg-white px-4 py-3">
                <div className="text-sm font-medium">{a.criteria_summary || "Saved search"}</div>
                <div className="text-xs text-muted">{a.is_active ? "Active" : "Paused"}</div>
              </li>
            ))}
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
