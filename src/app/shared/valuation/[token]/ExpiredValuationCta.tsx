"use client";
/** Refresh CTA shown when a shared valuation link has expired — turns a dead link into a lead. */
import { useState } from "react";

export function ExpiredValuationCta({ address, clientName }: { address: string; clientName: string }) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state === "sending") return;
    setState("sending");
    setError("");
    const form = new FormData(e.currentTarget);
    const payload = {
      ...Object.fromEntries(form),
      form_key: "valuation_refresh",
      path: window.location.pathname,
      custom_fields: { property_address: address, source: "expired_valuation_link" },
    };
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/submit-lead`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""}`,
      },
      body: JSON.stringify(payload),
    }).catch(() => null);
    if (res?.ok) setState("done");
    else {
      const body = await res?.json().catch(() => ({}));
      setState("error");
      setError(body?.error ?? "Something went wrong. Please try again.");
    }
  }

  return (
    <div className="evc">
      <div className="evc-card">
        <div className="evc-brand">GETSETSOLD<span>.ca</span></div>
        <h1>This market analysis has expired</h1>
        <p className="evc-sub">
          Markets move every month{address ? <> — get fresh numbers for <strong>{address}</strong></> : null}.
        </p>
        {state === "done" ? (
          <div className="evc-done" role="status">
            <div className="evc-check">✓</div>
            <p><strong>You're on the list.</strong><br />Rohit will send your updated market analysis shortly.</p>
          </div>
        ) : (
          <form onSubmit={onSubmit}>
            <label className="evc-field">Name
              <input name="name" required autoComplete="name" defaultValue={clientName} placeholder="Your full name" />
            </label>
            <div className="evc-row">
              <label className="evc-field">Phone
                <input name="phone" type="tel" autoComplete="tel" placeholder="416-555-0100" />
              </label>
              <label className="evc-field">Email
                <input name="email" type="email" required autoComplete="email" placeholder="you@email.com" />
              </label>
            </div>
            <label className="evc-field">Property address
              <input name="property_address" defaultValue={address} placeholder="123 Main St, Caledonia" />
            </label>
            <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="evc-honey" />
            {state === "error" && <p className="evc-err">{error}</p>}
            <button type="submit" disabled={state === "sending"} className="evc-btn">
              {state === "sending" ? "Sending…" : <>Get my fresh analysis <span aria-hidden="true">→</span></>}
            </button>
          </form>
        )}
        <p className="evc-alt">Prefer to talk? Call Rohit at <a href="tel:+14166057488">(416)-605-7488</a></p>
      </div>
      <style>{`
        .evc { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f5f5f5; padding: 24px 16px; font-family: -apple-system, 'Segoe UI', sans-serif; }
        .evc-card { background: #fff; border: 1px solid #e2e2e2; border-radius: 16px; padding: 36px 32px; width: 100%; max-width: 480px; text-align: center; color: #111; }
        .evc-brand { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 18px; }
        .evc-brand span { color: #0066cc; }
        .evc-card h1 { font-size: 24px; font-weight: 800; margin: 0 0 10px; }
        .evc-sub { font-size: 14px; color: #555; line-height: 1.6; margin: 0 0 22px; }
        .evc-field { display: block; text-align: left; font-size: 13px; font-weight: 600; margin-bottom: 12px; }
        .evc-field input { display: block; width: 100%; margin-top: 6px; border: 1px solid #ddd; border-radius: 10px; padding: 11px 14px; font-size: 15px; font-weight: 400; font-family: inherit; box-sizing: border-box; }
        .evc-field input:focus { outline: 2px solid #0066cc; border-color: #0066cc; }
        .evc-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .evc-honey { position: absolute; left: -9999px; }
        .evc-err { color: #dc2626; font-size: 13px; margin: 0 0 10px; }
        .evc-btn { display: inline-flex; align-items: center; gap: 8px; background: #111; color: #fff; border: none; border-radius: 30px; padding: 14px 32px; font-size: 16px; font-weight: 700; cursor: pointer; margin-top: 6px; width: 100%; justify-content: center; }
        .evc-btn:hover { background: #0066cc; }
        .evc-btn:disabled { opacity: 0.6; cursor: default; }
        .evc-alt { font-size: 13px; color: #777; margin: 18px 0 0; }
        .evc-alt a { color: #0066cc; font-weight: 600; text-decoration: none; }
        .evc-done p { font-size: 15px; line-height: 1.6; color: #333; }
        .evc-check { width: 56px; height: 56px; border-radius: 50%; background: #16a34a; color: #fff; font-size: 28px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; }
        @media (max-width: 640px) {
          .evc-card { padding: 28px 20px; }
          .evc-row { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
