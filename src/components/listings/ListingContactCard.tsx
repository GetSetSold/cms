"use client";
import { useState } from "react";
import type { PropertyListing } from "@/lib/mls";
import { priceDisplay } from "@/lib/mls";
import { CmsFormRenderer } from "@/components/blocks/CmsFormRenderer";
import type { CmsForm, SiteSettings, SvgAsset } from "@/lib/types";

type AgentInfo = NonNullable<SiteSettings["agent"]>;

/** Round agent photo (30px radius): SVG asset if set, otherwise initials placeholder. */
function AgentPhoto({ agent, photoSvg }: { agent: AgentInfo; photoSvg: SvgAsset | null }) {
  const size = 60; // 30px radius
  if (photoSvg?.markup) {
    return (
      <span
        className="inline-flex items-center justify-center overflow-hidden rounded-full bg-gray-100"
        style={{ width: size, height: size }}
        dangerouslySetInnerHTML={{ __html: photoSvg.markup }}
        aria-label={agent.name ?? "Agent photo"}
      />
    );
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

export function ListingContactCard({ listing, form, agent, photoSvg }: { listing: PropertyListing; form: CmsForm | null; agent?: AgentInfo; photoSvg?: SvgAsset | null }) {
  const [open, setOpen] = useState(false);
  const phone = agent?.phone;
  const showAgent = agent && (agent.name || agent.brokerage);

  return (
    <>
      <div className="card flex flex-col gap-4">
        <div className="text-2xl font-semibold">{priceDisplay(listing)}</div>

        {showAgent ? (
          <div className="flex items-center gap-3">
            <AgentPhoto agent={agent} photoSvg={photoSvg ?? null} />
            <div className="min-w-0">
              {agent.name ? <div className="font-semibold leading-tight">{agent.name}</div> : null}
              {agent.title ? <div className="text-[12px] text-muted leading-tight">{agent.title}</div> : null}
              {agent.brokerage ? <div className="text-[12px] text-muted leading-tight">{agent.brokerage}</div> : null}
              {phone ? <a href={`tel:${phone.replace(/[^+\d]/g, "")}`} className="text-[13px] font-medium hover:underline">{phone}</a> : null}
            </div>
          </div>
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
