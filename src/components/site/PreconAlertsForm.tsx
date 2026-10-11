"use client";

import { useState } from "react";

export function PreconAlertsForm() {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving"); setMessage("");
    try {
      const res = await fetch("/api/precon-alerts/subscribe", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, firstName }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed");
      setStatus("done");
      setMessage(d.alreadyExists ? "You're already on the list." : "You're on the list — we'll email you about new pre-con launches.");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-[var(--radius-lg)] border-[length:var(--border-card-width)] border-line bg-white p-8 text-center shadow-[var(--shadow-card)]" role="status">
        <p className="font-display text-xl font-bold">{message}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-[var(--radius-lg)] border-[length:var(--border-card-width)] border-line bg-white p-6 shadow-[var(--shadow-card)] md:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">First name<input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Sam" autoComplete="given-name" className="input h-12 text-base" /></label>
        </div>
        <div>
          <label className="label">Email *<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" className="input h-12 text-base" /></label>
        </div>
      </div>
      <button type="submit" disabled={status === "saving"}
        className="mt-5 flex h-13 w-full items-center justify-center rounded-[var(--radius-btn)] bg-ink py-3.5 text-base font-bold text-white disabled:opacity-50">
        {status === "saving" ? "Signing up…" : "Notify me about new launches"}
      </button>
      {status === "error" && <p className="mt-3 text-sm text-red-600" role="alert">{message}</p>}
      <p className="mt-4 text-center text-xs text-muted">Get an email when new pre-construction projects launch — with pricing, incentives, and floor plans. Unsubscribe anytime.</p>
    </form>
  );
}
