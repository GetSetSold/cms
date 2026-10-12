"use client";

import { useState } from "react";

export function RateAlertSignup() {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/rate-alerts/subscribe", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, firstName }),
      });
      const d = await res.json();
      if (d.ok) {
        setStatus("done");
        setMessage(d.alreadyExists ? "You're already on the list — preferences updated." : "You're on the list! We'll email you when rates change.");
      } else {
        setStatus("error");
        setMessage(d.error || "Something went wrong.");
      }
    } catch {
      setStatus("error");
      setMessage("Something went wrong.");
    }
  }

  if (status === "done") {
    return <p className="rounded-lg bg-green-50 p-4 text-sm text-green-800">{message}</p>;
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name"
          className="rounded border border-line px-4 py-3 text-sm" />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" type="email" required
          className="rounded border border-line px-4 py-3 text-sm" />
      </div>
      <button type="submit" disabled={status === "sending"}
        className="rounded bg-[#111] px-6 py-3 text-sm font-medium text-white disabled:opacity-50">
        {status === "sending" ? "Subscribing…" : "Notify me on rate changes"}
      </button>
      {status === "error" ? <p className="text-sm text-red-600">{message}</p> : null}
    </form>
  );
}
