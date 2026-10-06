"use client";
import { useEffect, useState } from "react";
import type { PropertyListing } from "@/lib/mls";
import { priceDisplay, isSale } from "@/lib/mls";
import { CmsFormRenderer } from "@/components/blocks/CmsFormRenderer";
import type { CmsForm, SiteSettings, SvgAsset } from "@/lib/types";

type AgentInfo = NonNullable<SiteSettings["agent"]>;

/** Round agent photo (30px radius): SVG asset if set, otherwise initials placeholder. */
function AgentPhoto({ agent, photoSvg }: { agent: AgentInfo; photoSvg: SvgAsset | null }) {
  const size = 60; // 30px radius
  if (photoSvg?.markup) {
    return (
      <span
        className="inline-flex items-center justify-center overflow-hidden rounded-full"
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

/** Tiny listing summary blended with the ask button (two-column). */
function ListingSummaryCompact({ listing }: { listing: PropertyListing }) {
  const sale = isSale(listing);
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white ${sale ? "bg-ink" : "bg-accent"}`}>
          {sale ? "For Sale" : "For Rent"}
        </span>
        <span className="truncate text-[13px] font-semibold">{priceDisplay(listing)}</span>
      </div>
      <div className="mt-0.5 truncate text-[11px] text-muted">
        {listing.UnparsedAddress}
        {listing.City ? `, ${listing.City}` : ""}
      </div>
    </div>
  );
}

/** Full listing summary for the modal. */
function ListingSummary({ listing }: { listing: PropertyListing }) {
  const sale = isSale(listing);
  const hood = ((listing.CityRegion || listing.SubdivisionName) ?? "").trim();
  return (
    <div className="flex flex-col gap-1.5">
      <span className={`w-fit rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white ${sale ? "bg-ink" : "bg-accent"}`}>
        {sale ? "For Sale" : "For Rent"}
      </span>
      <div className="text-xl font-semibold leading-tight">{priceDisplay(listing)}</div>
      <div className="text-[11px] leading-snug text-muted">
        {listing.UnparsedAddress}
        {listing.City ? `, ${listing.City}` : ""}
        {hood ? ` (${hood})` : ""}
        {listing.Province ? `, ${listing.Province}` : ""}
      </div>
    </div>
  );
}

export function ListingContactCard({ listing, form, agent, photoSvg }: { listing: PropertyListing; form: CmsForm | null; agent?: AgentInfo; photoSvg?: SvgAsset | null }) {
  const [open, setOpen] = useState(false);
  // Promo banners dispatch this to open the inquiry modal.
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("open-inquiry", handler);
    return () => window.removeEventListener("open-inquiry", handler);
  }, []);
  const phone = agent?.phone;
  const email = agent?.email;
  const showAgent = agent && (agent.name || agent.brokerage);

  return (
    <>
      <div className="card flex flex-col gap-4">
        <h3 className="border-b border-line pb-3 font-display text-lg">Ask About This Property</h3>
        {showAgent ? (
          <div className="flex items-center gap-3">
            <AgentPhoto agent={agent} photoSvg={photoSvg ?? null} />
            <div className="min-w-0">
              {agent.name ? <div className="font-semibold leading-tight">{agent.name}</div> : null}
              {agent.title ? <div className="text-[12px] text-muted leading-tight">{agent.title}</div> : null}
              {agent.brokerage ? <div className="text-[12px] text-muted leading-tight">{agent.brokerage}</div> : null}
              {phone ? <a href={`tel:${phone.replace(/[^+\d]/g, "")}`} className="block text-[13px] font-medium hover:underline">{phone}</a> : null}
              {email ? <a href={`mailto:${email}`} className="block truncate text-[13px] font-medium hover:underline">{email}</a> : null}
            </div>
          </div>
        ) : null}

        {form ? (
          <div className="flex items-center gap-3 border-t border-line pt-3">
            <div className="min-w-0 flex-1"><ListingSummaryCompact listing={listing} /></div>
            <button type="button" onClick={() => setOpen(true)} className="btn h-9 shrink-0 px-4 text-[13px]">
              Send Message
            </button>
          </div>
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
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[var(--radius-lg)] bg-white p-6">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="font-display text-xl">Ask about this property</h3>
                <div className="mt-2"><ListingSummary listing={listing} /></div>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close dialog" className="rounded-[var(--radius-btn)] p-1.5 hover:bg-gray-100 text-xl leading-none">
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
