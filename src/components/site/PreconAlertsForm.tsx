"use client";

import { useState } from "react";

export function PreconAlertsForm() {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [scope, setScope] = useState<"all" | "filtered">("all");
  const [cities, setCities] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving"); setMessage("");
    try {
      const filters = scope === "all" ? { all_projects: true } : {
        all_projects: false,
        cities: cities.split(",").map((c) => c.trim()).filter(Boolean),
        max_price: maxPrice ? Number(maxPrice) : undefined,
      };
      const res = await fetch("/api/precon-alerts/subscribe", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, firstName, filters }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed");
      setStatus("done");
      setMessage(d.alreadyExists ? "You're already on the list — preferences updated." : "You're on the list — we'll email you about new pre-con launches.");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  if (status === "done") {
    return (
      <div className="py-6 text-center" role="status">
        <p className="font-display text-xl font-bold">{message}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">First name<input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Sam" autoComplete="given-name" className="input h-12 text-base" /></label>
        </div>
        <div>
          <label className="label">Email *<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" className="input h-12 text-base" /></label>
        </div>
      </div>

      <div className="mt-4">
        <p className="label mb-2">What do you want to hear about?</p>
        <div className="flex gap-2">
          <button type="button" onClick={() => setScope("all")}
            className={`flex-1 rounded-[var(--radius-btn)] border px-4 py-2.5 text-sm font-medium ${scope === "all" ? "border-ink bg-ink text-white" : "border-line bg-white text-ink"}`}>
            All pre-con launches
          </button>
          <button type="button" onClick={() => setScope("filtered")}
            className={`flex-1 rounded-[var(--radius-btn)] border px-4 py-2.5 text-sm font-medium ${scope === "filtered" ? "border-ink bg-ink text-white" : "border-line bg-white text-ink"}`}>
            Only what matches me
          </button>
        </div>
      </div>

      {scope === "filtered" ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Cities<input type="text" value={cities} onChange={(e) => setCities(e.target.value)} placeholder="Caledonia, Hamilton" className="input h-12 text-base" /></label>
          </div>
          <div>
            <label className="label">Max budget<input type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="800000" className="input h-12 text-base" /></label>
          </div>
        </div>
      ) : null}

      <button type="submit" disabled={status === "saving"}
        className="mt-5 flex h-13 w-full items-center justify-center rounded-[var(--radius-btn)] bg-ink py-3.5 text-base font-bold text-white disabled:opacity-50">
        {status === "saving" ? "Signing up…" : "Notify me about new launches"}
      </button>
      {status === "error" && <p className="mt-3 text-sm text-red-600" role="alert">{message}</p>}
      <p className="mt-4 text-center text-xs text-muted">Get an email when new pre-construction projects launch — with pricing, incentives, and floor plans. Unsubscribe anytime.</p>
    </form>
  );
}
