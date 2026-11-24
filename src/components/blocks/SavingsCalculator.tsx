"use client";
/**
 * Savings calculator block — the 1% Seller Success Program lead tool.
 * Total-commission comparison (not listing-fee only): traditional 5% vs
 * GetSetSold 1% listing + buyer's brokerage co-op (2% under $1M, 2.5% at
 * $1M+). The CTA opens a short name/email/phone form that submits through
 * the same submit-lead edge function as every other site form, with the
 * visitor's price + savings attached to the lead message.
 */
import { useRef, useState } from "react";

const fmt = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
const accent = "var(--c-accent, #0099cc)";
const MILLION = 1_000_000;

export function coopPct(price: number) {
  return price >= MILLION ? 2.5 : 2;
}

export function SavingsCalculatorClient({
  heading,
  description,
  buttonLabel,
  successMessage,
  pageId,
}: {
  heading?: string;
  description?: string;
  buttonLabel?: string;
  successMessage?: string;
  pageId?: string;
}) {
  const [price, setPrice] = useState(650_000);
  const [formOpen, setFormOpen] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const started = useRef(Date.now());

  const coop = coopPct(price);
  const trad = price * 0.05;
  const ours = price * (0.01 + coop / 100);
  const savings = trad - ours;
  const oursPct = (1 + coop).toFixed(1).replace(/\.0$/, "");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");
    setError("");
    const form = new FormData(e.currentTarget);
    const payload = JSON.stringify({
      name: form.get("name"),
      email: form.get("email"),
      phone: form.get("phone"),
      website: form.get("website"), // honeypot, mirrors LeadForm
      message:
        `Savings calculator: home price ${fmt(price)} — traditional 5% ${fmt(trad)} vs ` +
        `GetSetSold ${oursPct}% ${fmt(ours)} — estimated savings ${fmt(savings)}. ` +
        `Please send my exact savings and free home valuation.`,
      form_key: "savings_calculator",
      page_id: pageId,
      path: window.location.pathname,
      elapsed_ms: Date.now() - started.current,
    });
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/submit-lead`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: payload,
    }).catch(() => null);
    const body = await res?.json().catch(() => ({}));
    if (res?.ok) setState("done");
    else {
      setState("error");
      setError(body?.error ?? "Something went wrong. Please try again.");
    }
  }

  return (
    <div className="mx-auto w-full max-w-[560px] rounded-[var(--radius-lg)] border-[length:var(--border-card-width)] border-line bg-white p-[24px] shadow-[var(--shadow-card)] md:p-[32px]">
      <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: accent }}>
        Seller Success Program
      </p>
      <h3 className="mt-[6px] text-xl font-bold tracking-tight md:text-[22px]">
        {heading || "See how much you save selling with Get Set Sold"}
      </h3>
      <p className="mt-[4px] text-[15px] leading-relaxed text-muted">
        {description || "Slide to your home's price — most sellers pay 5% commission. We list for 1%."}
      </p>

      <p className="mt-[20px] text-[13px] font-semibold text-muted">Your home's selling price</p>
      <p className="text-[34px] font-extrabold leading-tight tracking-tight">{fmt(price)}</p>
      <input
        type="range"
        min={300_000}
        max={2_000_000}
        step={5_000}
        value={price}
        onChange={(e) => setPrice(Number(e.target.value))}
        className="calc-slider"
        aria-label="Selling price"
      />
      <div className="flex justify-between text-[12px] text-muted">
        <span>$300,000</span>
        <span>$2,000,000</span>
      </div>

      <div className="mt-[10px] flex items-baseline justify-between border-t border-line py-[10px]">
        <span className="text-[15px] font-semibold">
          Traditional brokerage
          <span className="block text-[12.5px] font-normal text-muted">5% total commission</span>
        </span>
        <b className="text-[17px]">{fmt(trad)}</b>
      </div>
      <div className="flex items-baseline justify-between border-t border-line py-[10px]">
        <span className="text-[15px] font-semibold">
          Get Set Sold
          <span className="block text-[12.5px] font-normal text-muted">
            1% listing fee + {coop}% buyer's brokerage = {oursPct}%
          </span>
        </span>
        <b className="text-[17px]">{fmt(ours)}</b>
      </div>

      <div
        className="mt-[16px] flex items-center justify-between rounded-[var(--radius-md)] p-[14px_16px] text-white"
        style={{ background: accent }}
      >
        <span className="text-[14px] font-semibold leading-snug">
          You keep
          <br />
          in your pocket
        </span>
        <span className="text-[26px] font-extrabold tracking-tight">{fmt(savings)}</span>
      </div>

      {state === "done" ? (
        <p className="mt-[16px] rounded-[var(--radius-md)] bg-soft p-[14px_16px] text-[14.5px] leading-relaxed" role="status">
          {successMessage || "Thanks — your savings breakdown is on its way, and Rohit will follow up with your free home valuation."}
        </p>
      ) : formOpen ? (
        <form onSubmit={onSubmit} className="mt-[16px] grid gap-3">
          <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
          <label className="label">
            Name
            <input name="name" required autoComplete="name" className="input h-12 text-base" />
          </label>
          <label className="label">
            Email
            <input name="email" type="email" required autoComplete="email" className="input h-12 text-base" />
          </label>
          <label className="label">
            Phone (optional)
            <input name="phone" type="tel" autoComplete="tel" className="input h-12 text-base" />
          </label>
          {state === "error" ? (
            <p className="text-sm text-red-700" role="alert">{error}</p>
          ) : null}
          <button
            disabled={state === "sending"}
            className="rounded-[var(--radius-btn)] bg-ink py-3.5 text-base font-medium text-white disabled:opacity-60"
          >
            {state === "sending" ? "Sending…" : "Send my savings"}
          </button>
        </form>
      ) : (
        <button
          onClick={() => setFormOpen(true)}
          className="mt-[16px] w-full rounded-[var(--radius-btn)] bg-ink py-3.5 text-base font-medium text-white"
        >
          {buttonLabel || "Get my exact savings + free home valuation"}
        </button>
      )}

      <p className="mt-[12px] text-[12px] leading-relaxed text-muted">
        Commission plus HST. Buyer's brokerage co-op is 2% on homes under $1M and 2.5% at $1M+.
        Cancel anytime — $499 + HST if cancelled before 90 days.
      </p>
    </div>
  );
}
