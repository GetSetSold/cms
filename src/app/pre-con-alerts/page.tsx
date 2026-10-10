"use client";

import { useState } from "react";

export default function PreconAlertsPage() {
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

  return (
    <div className="mx-auto w-full max-w-7xl px-5 md:px-10 py-12">
      <div className="max-w-xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Pre-con Updates</h1>
        <p className="text-muted mb-8">Get an email when new pre-construction projects launch — with pricing, incentives, and floor plans.</p>
        {status === "done" ? (
          <div className="rounded-xl border border-line bg-white p-6 text-center">
            <p className="font-medium">{message}</p>
          </div>
        ) : (
          <form onSubmit={submit} className="rounded-xl border border-line bg-white p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Email *</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-line bg-white px-4 py-2.5 text-sm focus:border-accent focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">First name</label>
              <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)}
                placeholder="Sam"
                className="w-full rounded-lg border border-line bg-white px-4 py-2.5 text-sm focus:border-accent focus:outline-none" />
            </div>
            <button type="submit" disabled={status === "saving"}
              className="w-full rounded-lg bg-ink py-3 text-sm font-semibold text-white disabled:opacity-50">
              {status === "saving" ? "Signing up…" : "Notify me about new launches"}
            </button>
            {status === "error" && <p className="text-sm text-red-600">{message}</p>}
          </form>
        )}
      </div>
    </div>
  );
}
