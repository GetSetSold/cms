"use client";

import { useState } from "react";

/**
 * Property alert signup form (client component).
 */
export function PropertyAlertsForm() {
  const [form, setForm] = useState({
    email: "",
    city: "",
    beds: "",
    baths: "",
    minPrice: "",
    maxPrice: "",
    homeType: "",
    type: "sale",
  });
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setMessage("");

    const criteria: Record<string, string> = {};
    if (form.city) criteria.city = form.city;
    if (form.beds) criteria.beds = form.beds;
    if (form.baths) criteria.baths = form.baths;
    if (form.minPrice) criteria.minPrice = form.minPrice;
    if (form.maxPrice) criteria.maxPrice = form.maxPrice;
    if (form.homeType) criteria.homeType = form.homeType;
    if (form.type) criteria.type = form.type;

    const parts: string[] = [];
    if (form.beds) parts.push(`${form.beds} bed`);
    if (form.homeType) parts.push(form.homeType);
    if (form.city) parts.push(form.city);
    if (form.maxPrice) parts.push(`under $${Number(form.maxPrice).toLocaleString()}`);
    if (form.minPrice) parts.push(`over $${Number(form.minPrice).toLocaleString()}`);

    try {
      const res = await fetch("/api/property-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          criteria,
          criteriaSummary: parts.join(" · "),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setStatus("done");
      setMessage(
        data.alreadyExists
          ? "You're already signed up for this search — we've reactivated it."
          : "You're signed up! We'll email you when matching listings appear."
      );
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  const inputCls =
    "w-full rounded-lg border border-line bg-white px-4 py-2.5 text-sm text-ink focus:border-accent focus:outline-none";

  if (status === "done") {
    return (
      <div className="mx-auto w-full max-w-xl px-5 py-16 text-center">
        <div className="text-4xl mb-4">✓</div>
        <h1 className="text-2xl font-bold mb-3">You're on the list!</h1>
        <p className="text-muted mb-8">{message}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a href="/property-alerts/manage" className="rounded-lg bg-ink px-6 py-3 text-sm font-semibold text-white">
            Manage your alerts
          </a>
          <a href="/listings" className="rounded-lg border border-line px-6 py-3 text-sm font-semibold hover:bg-gray-50">
            Browse listings
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-xl px-5 py-10 md:py-16">
      <h1 className="text-3xl font-bold mb-2">Get notified of new listings</h1>
      <p className="text-muted mb-8">
        Tell us what you're looking for. We'll email you the moment matching listings hit the market.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-1.5">Email</label>
          <input type="email" required value={form.email} onChange={set("email")} placeholder="you@example.com" className={inputCls} />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">City</label>
          <input type="text" value={form.city} onChange={set("city")} placeholder="e.g. Hamilton" className={inputCls} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Bedrooms</label>
            <select value={form.beds} onChange={set("beds")} className={inputCls}>
              <option value="">Any</option>
              <option value="1">1+</option>
              <option value="2">2+</option>
              <option value="3">3+</option>
              <option value="4">4+</option>
              <option value="5">5+</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Bathrooms</label>
            <select value={form.baths} onChange={set("baths")} className={inputCls}>
              <option value="">Any</option>
              <option value="1">1+</option>
              <option value="2">2+</option>
              <option value="3">3+</option>
              <option value="4">4+</option>
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
            <input type="number" value={form.maxPrice} onChange={set("maxPrice")} placeholder="e.g. 700000" className={inputCls} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Property type</label>
            <select value={form.homeType} onChange={set("homeType")} className={inputCls}>
              <option value="">Any</option>
              <option value="detached">Detached</option>
              <option value="semi-detached">Semi-detached</option>
              <option value="townhouse">Townhouse</option>
              <option value="condo">Condo</option>
              <option value="apartment">Apartment</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">For sale or rent</label>
            <select value={form.type} onChange={set("type")} className={inputCls}>
              <option value="sale">For sale</option>
              <option value="rent">For rent</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={status === "saving"}
          className="w-full rounded-lg bg-ink py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {status === "saving" ? "Saving..." : "Notify me of new listings"}
        </button>

        {status === "error" && <p className="text-sm text-red-600">{message}</p>}

        <p className="text-xs text-muted text-center">
          No spam. Unsubscribe anytime with one click.
        </p>
      </form>
    </div>
  );
}
