"use client";

import { useState, useEffect } from "react";

/**
 * Admin: manually create a property alert for a client.
 */
export function AdminAlertCreator() {
  const [form, setForm] = useState({
    email: "",
    firstName: "",
    cities: [] as string[],
    beds: "",
    baths: "",
    minPrice: "",
    maxPrice: "",
    homeType: "",
    type: "sale",
  });
  const [allCities, setAllCities] = useState<string[]>([]);
  const [citySearch, setCitySearch] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/property-alerts/cities")
      .then((r) => r.json())
      .then((d) => setAllCities(d.cities ?? []))
      .catch(() => {});
  }, []);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  function toggleCity(city: string) {
    setForm((f) => ({
      ...f,
      cities: f.cities.includes(city) ? f.cities.filter((c) => c !== city) : [...f.cities, city],
    }));
  }

  const filteredCities = allCities.filter((c) =>
    c.toLowerCase().includes(citySearch.toLowerCase())
  ).slice(0, 50);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setMessage("");

    const criteria: Record<string, any> = {};
    if (form.cities.length) criteria.cities = form.cities;
    if (form.beds) criteria.beds = form.beds;
    if (form.baths) criteria.baths = form.baths;
    if (form.minPrice) criteria.minPrice = form.minPrice;
    if (form.maxPrice) criteria.maxPrice = form.maxPrice;
    if (form.homeType) criteria.homeType = form.homeType;
    if (form.type) criteria.type = form.type;

    const parts: string[] = [];
    if (form.beds) parts.push(`${form.beds} bed`);
    if (form.homeType) parts.push(form.homeType);
    if (form.cities.length) parts.push(form.cities.join(", "));
    if (form.maxPrice) parts.push(`under $${Number(form.maxPrice).toLocaleString()}`);
    if (form.minPrice) parts.push(`over $${Number(form.minPrice).toLocaleString()}`);

    try {
      const res = await fetch("/api/admin/property-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          firstName: form.firstName,
          criteria,
          criteriaSummary: parts.join(" · ") || "Custom search",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setStatus("done");
      setMessage(`Alert created for ${form.email}`);
      setForm({ email: "", firstName: "", cities: [], beds: "", baths: "", minPrice: "", maxPrice: "", homeType: "", type: "sale" });
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed");
    }
  }

  const inputCls = "w-full rounded-lg border border-line bg-white px-4 py-2.5 text-sm focus:border-accent focus:outline-none";

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Client email *</label>
          <input type="email" required value={form.email} onChange={set("email")} placeholder="client@example.com" className={inputCls} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">First name</label>
          <input type="text" value={form.firstName} onChange={set("firstName")} placeholder="Sam" className={inputCls} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Cities {form.cities.length > 0 && `(${form.cities.length})`}</label>
        <input type="text" value={citySearch} onChange={(e) => setCitySearch(e.target.value)} placeholder="Search cities..." className={inputCls} />
        {form.cities.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {form.cities.map((c) => (
              <span key={c} className="inline-flex items-center gap-1 rounded-full bg-ink px-2.5 py-1 text-xs text-white">
                {c}
                <button type="button" onClick={() => toggleCity(c)} className="hover:opacity-70">×</button>
              </span>
            ))}
          </div>
        )}
        {citySearch && (
          <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-line bg-white shadow-lg">
            {filteredCities.map((c) => (
              <button key={c} type="button" onClick={() => { toggleCity(c); setCitySearch(""); }}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50">
                {form.cities.includes(c) ? "✓ " : ""}{c}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Beds</label>
          <select value={form.beds} onChange={set("beds")} className={inputCls}>
            <option value="">Any</option>
            <option value="1">1+</option><option value="2">2+</option>
            <option value="3">3+</option><option value="4">4+</option><option value="5">5+</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Baths</label>
          <select value={form.baths} onChange={set("baths")} className={inputCls}>
            <option value="">Any</option>
            <option value="1">1+</option><option value="2">2+</option>
            <option value="3">3+</option><option value="4">4+</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Min price</label>
          <input type="number" value={form.minPrice} onChange={set("minPrice")} placeholder="e.g. 500000" className={inputCls} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Max price</label>
          <input type="number" value={form.maxPrice} onChange={set("maxPrice")} placeholder="e.g. 800000" className={inputCls} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Home type</label>
          <select value={form.homeType} onChange={set("homeType")} className={inputCls}>
            <option value="">Any</option>
            <option value="detached">Detached</option>
            <option value="semi-detached">Semi-detached</option>
            <option value="townhouse">Townhouse</option>
            <option value="condo">Condo</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Sale/Rent</label>
          <select value={form.type} onChange={set("type")} className={inputCls}>
            <option value="sale">For sale</option>
            <option value="rent">For rent</option>
          </select>
        </div>
      </div>

      <button type="submit" disabled={status === "saving" || !form.email}
        className="rounded-lg bg-ink px-6 py-3 text-sm font-semibold text-white disabled:opacity-50">
        {status === "saving" ? "Creating..." : "Create alert"}
      </button>

      {message && (
        <p className={`text-sm ${status === "done" ? "text-green-700" : "text-red-600"}`}>{message}</p>
      )}
    </form>
  );
}
