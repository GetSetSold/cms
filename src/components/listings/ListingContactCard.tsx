"use client";
import { useState } from "react";
import type { PropertyListing } from "@/lib/mls";
import { priceDisplay } from "@/lib/mls";
import { CmsFormRenderer } from "@/components/blocks/CmsFormRenderer";
import type { CmsForm, SiteSettings } from "@/lib/types";

type AgentInfo = NonNullable<SiteSettings["agent"]>;

/** Round agent photo: photo URL if set, otherwise SVG initials placeholder. */
function AgentPhoto({ agent, size = 56 }: { agent: AgentInfo; size?: number }) {
  if (agent.photo_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={agent.photo_url} alt={agent.name ?? "Agent"} width={size} height={size} className="rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  const initials = (agent.name ?? "R")
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      className="inline-flex items-center justify-center rounded-full bg-ink text-white font-semibold"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

export function ListingContactCard({ listing, form, agent }: { listing: PropertyListing; form: CmsForm | null; agent?: AgentInfo }) {
  const [open, setOpen] = useState(false);
  const phone = agent?.phone;
  const showAgent = agent && (agent.name || agent.brokerage);

  return (
    <>
      <div className="card flex flex-col gap-4">
        <div className="text-2xl font-semibold">{priceDisplay(listing)}</div>

        {showAgent ? (
          <div className="flex items-center gap-3">
            <AgentPhoto agent={agent} size={56} />
            <div className="min-w-0">
              {agent.name ? <div className="font-semibold leading-tight">{agent.name}</div> : null}
              {agent.title ? <div className="text-[12px] text-muted leading-tight">{agent.title}</div> : null}
              {agent.brokerage ? <div className="text-[12px] text-muted leading-tight">{agent.brokerage}</div> : null}
              {phone ? <a href={`tel:${phone.replace(/[^+\d]/g, "")}`} className="text-[13px] font-medium hover:underline">{phone}</a> : null}
            </div>
          </div>
        ) : listing.OfficeName ? (
          <div className="text-sm text-muted">{listing.OfficeName}</div>
        ) : null}

        {form ? (
          <button type="button" onClick={() => setOpen(true)} className="btn h-11 justify-center">
            Ask about this property
          </button>
        ) : (
          <>
            <p className="text-sm text-muted">Contact us directly to ask about this listing.</p>
            {phone ? <a href={`tel:${phone.replace(/[^+\d]/g, "")}`} className="btn h-11 justify-center">Call now</a> : null}
          </>
        )}
      </div>

      {open && form ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Ask about this property">
          <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/55" />
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="font-display text-xl">Ask about this property</h3>
                {listing.UnparsedAddress ? <p className="mt-1 text-sm text-muted">{listing.UnparsedAddress}</p> : null}
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close dialog" className="rounded-full p-1.5 hover:bg-gray-100 text-xl leading-none">
                ×
              </button>
            </div>
            <CmsFormRenderer
              form={form}
              extraFields={{ listing_key: listing.ListingKey, address: listing.UnparsedAddress }}
              secondaryAction={phone ? { label: "Call now", href: `tel:${phone.replace(/[^+\d]/g, "")}` } : undefined}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
