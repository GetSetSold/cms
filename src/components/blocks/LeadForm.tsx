"use client";
import { useEffect, useRef, useState } from "react";

type Props = {
  data: {
    heading?: string; text?: string; form_key?: string; submit_label?: string; success_message?: string;
    show_email?: boolean; show_message?: boolean; show_sms_opt_in?: boolean;
  };
  pageId?: string;
  siteName: string;
};

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid"];

export function LeadForm({ data, pageId, siteName }: Props) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const started = useRef(Date.now());

  // Remember UTM params for the session so they survive navigation
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const found = Object.fromEntries(UTM_KEYS.flatMap((k) => (params.get(k) ? [[k, params.get(k)!]] : [])));
    if (Object.keys(found).length) sessionStorage.setItem("utm", JSON.stringify(found));
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");
    setError("");
    const form = new FormData(e.currentTarget);
    let utm = {};
    try { utm = JSON.parse(sessionStorage.getItem("utm") ?? "{}"); } catch {}

    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/submit-lead`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        ...Object.fromEntries(form),
        sms_opt_in: form.get("sms_opt_in") === "on",
        form_key: data.form_key ?? "contact",
        page_id: pageId,
        path: window.location.pathname,
        utm,
        elapsed_ms: Date.now() - started.current,
      }),
    }).catch(() => null);

    const body = await res?.json().catch(() => ({}));
    if (res?.ok) setState("done");
    else { setState("error"); setError(body?.error ?? "Something went wrong. Please try again."); }
  }

  if (state === "done") {
    return (
      <div className="rounded-2xl bg-white p-8 text-center" role="status">
        <p className="font-display text-3xl">{data.success_message || "Thanks — we'll be in touch."}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
      {/* Honeypot: hidden from people, bots fill it in */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <label className="label">Name<input name="name" required autoComplete="name" className="input h-12 text-base" /></label>
      <label className="label">Phone<input name="phone" type="tel" autoComplete="tel" className="input h-12 text-base" /></label>
      {data.show_email !== false ? (
        <label className="label sm:col-span-2">Email<input name="email" type="email" autoComplete="email" className="input h-12 text-base" /></label>
      ) : null}
      {data.show_message !== false ? (
        <label className="label sm:col-span-2">How can we help?<textarea name="message" rows={4} className="textarea text-base" /></label>
      ) : null}
      {data.show_sms_opt_in !== false ? (
        <label className="flex items-start gap-2 text-[13px] leading-snug text-muted sm:col-span-2">
          <input type="checkbox" name="sms_opt_in" className="mt-0.5" />
          I agree to receive text messages from {siteName} about my request. Message &amp; data rates may apply. Reply STOP to opt out.
        </label>
      ) : null}
      {state === "error" ? <p className="text-sm text-red-700 sm:col-span-2" role="alert">{error}</p> : null}
      <button disabled={state === "sending"} className="h-13 rounded-full bg-ink py-3.5 text-base font-medium text-white disabled:opacity-60 sm:col-span-2">
        {state === "sending" ? "Sending…" : data.submit_label || "Send"}
      </button>
    </form>
  );
}
