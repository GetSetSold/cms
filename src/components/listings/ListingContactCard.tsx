"use client";
import { useState } from "react";
import type { PropertyListing } from "@/lib/mls";
import { priceDisplay } from "@/lib/mls";

export function ListingContactCard({ listing }: { listing: PropertyListing }) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");
    const form = new FormData(e.currentTarget);
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/submit-lead`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        ...Object.fromEntries(form),
        form_key: "listing_inquiry",
        path: window.location.pathname,
        custom_fields: { listing_key: listing.ListingKey, address: listing.UnparsedAddress },
      }),
    }).catch(() => null);
    const body = await res?.json().catch(() => ({}));
    if (res?.ok) setState("done");
    else { setState("error"); setError(body?.error ?? "Something went wrong. Please try again."); }
  }

  if (state === "done") {
    return <div className="card text-center"><p className="text-lg font-medium">Thanks — we&rsquo;ll be in touch shortly.</p></div>;
  }

  return (
    <div className="card flex flex-col gap-4">
      <div className="text-2xl font-semibold">{priceDisplay(listing)}</div>
      {listing.OfficeName ? <div className="text-sm text-muted">{listing.OfficeName}</div> : null}
      <form onSubmit={onSubmit} className="flex flex-col gap-2.5">
        <input type="hidden" name="message" value={`I'm interested in ${listing.UnparsedAddress ?? "this property"}.`} />
        <input name="name" placeholder="Name" required className="input h-11" />
        <input name="email" type="email" placeholder="Email" required className="input h-11" />
        <input name="phone" type="tel" placeholder="Phone" required className="input h-11" />
        {state === "error" ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}
        <button disabled={state === "sending"} className="btn-primary h-12">
          {state === "sending" ? "Sending…" : "Request info"}
        </button>
      </form>
      <a href="tel:+14166057488" className="btn h-11 justify-center">Call now</a>
    </div>
  );
}
