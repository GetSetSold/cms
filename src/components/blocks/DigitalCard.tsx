"use client";

import { Svg } from "@/components/site/Svg";
import type { SvgAsset } from "@/lib/types";
/**
 * Digital card block — the one-screen agent card for /rohit-sharma-realtor
 * (short share link /rohit redirects to it).
 *
 * This is the card shell only. Everything below it on the page (Featured,
 * Sold, Google Reviews via custom_code, contact details) stays as separate
 * CMS blocks, edited in Page Builder — this block does not duplicate them.
 *
 * Behaviour, all client-side, no new tables or edge functions:
 * - Top: photo, name, role, brokerage, tagline, proof strip (3 max).
 * - Actions: Call (tel:), WhatsApp (wa.me, pre-filled for the chosen
 *   service), Save Contact (vCard generated in the browser and downloaded),
 *   Share (navigator.share, falling back to copying the share link),
 *   Email (mailto:).
 * - "I want to…" tiles (3×2 icon grid) switch the offer shown below them
 *   and re-write the WhatsApp message for that service. No page reload.
 *   Each service has an editable button label and optional highlight chips.
 * - Contact is a dark card: big tap-to-call number, a message button with
 *   an editable label, and icon-only detail rows (no Address:/Hours: labels).
 *
 * Content comes from the block's own fields, falling back to
 * Settings → Contact (phone, email, address, hours) where a field is blank,
 * and to the defaults below where both are blank — so the block renders
 * sensibly on first add, and every word is editable in Page Builder.
 * Photo: a plain image URL field (the agent photo uploaded / hosted
 * elsewhere). No Supabase Storage upload is added here.
 */
import { useState } from "react";

export type DigitalCardService = {
  label: string;
  title: string;
  body: string;
  whatsapp_message: string;
  /** Destination: "whatsapp" (default) or "custom" (link_href). Blank = WhatsApp. */
  link_type?: string;
  link_href?: string;
  link_label?: string;
  /** Short highlight chips shown under the offer title (3 max). */
  highlights?: { text: string }[];
};

export type DigitalCardProof = { value: string; label: string };

type Props = {
  name?: string;
  role?: string;
  brokerage?: string;
  tagline?: string;
  handle?: string;
  photoUrl?: string;
  /** Library SVG photo (picked in Page Builder) — wins over photoUrl. */
  photoSvg?: SvgAsset | null;
  phone?: string;
  email?: string;
  address?: string;
  hours?: string;
  shareUrl?: string;
  canonicalUrl?: string;
  proofPoints?: DigitalCardProof[];
  services?: DigitalCardService[];
  /** Contact-card message button label. Blank = "WhatsApp me". */
  contactButtonLabel?: string;
};

const DEFAULT_PROOF: DigitalCardProof[] = [
  { value: "5.0★", label: "65 reviews" },
  { value: "1%", label: "to sell" },
  { value: "$5,000", label: "back to buy" },
];

// Zoho profile copy, kept verbatim, as the first-add defaults. Every body
// is editable in Page Builder via the services list.
const DEFAULT_SERVICES: DigitalCardService[] = [
  {
    label: "Buy",
    title: "Buying A Home?",
    body: "Join our VIP Buyer Program to get up to $5,000 cash back at closing, priority showings that fit your schedule, and a complimentary 1-on-1 free buyer consultation.",
    whatsapp_message: "Hi Rohit, I'm looking to buy a home.",
  },
  {
    label: "Sell",
    title: "Selling Your Home?",
    body: "Seller Success Program full-service with professional home marketing, and skilled negotiation — all for just a 1% listing fee.",
    whatsapp_message: "Hi Rohit, I'm looking to sell my home.",
  },
  {
    label: "Lease out",
    title: "Rent Your Property?",
    body: "Rent out your property with confidence. We help landlords find reliable tenants, handle marketing, and manage showings—so you can lease faster and smarter.",
    whatsapp_message: "Hi Rohit, I'm looking to lease out my property.",
  },
  {
    label: "Rent",
    title: "Tenant Rental Services",
    body: "Our Full Rental Assistance From Showings To Paperwork Is Completely Free For Tenants. You Don’t Pay Us A Cent; We’re Compensated By The Landlord",
    whatsapp_message: "Hi Rohit, I'm looking to rent a home.",
  },
  {
    label: "Invest",
    title: "Real Estate Investments",
    body: "Explore a wide range of investment options, including residential, commercial, and rental properties, tailored to your investment preferences.",
    whatsapp_message: "Hi Rohit, I'm looking at investment properties.",
  },
  {
    label: "Refer",
    title: "Refer A Friend",
    body: "Earn Up To $500 In Referral Rewards. Trusted Real Estate Service With A Referral Program Designed To Say Thank You. Great Connections Deserve Great Rewards.",
    whatsapp_message: "Hi Rohit, I'd like to refer someone.",
  },
];

const digits = (s: string) => s.replace(/\D/g, "");

/** Tile icons for the "I want to…" grid, matched by service-label keyword. */
const TILE_ICONS: [RegExp, React.ReactNode][] = [
  [/buy/i, <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></>],
  [/sell/i, <><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" /><path d="M4 6v12c0 1.1.9 2 2 2h14v-4" /><path d="M18 12a2 2 0 0 0 0 4h4v-4Z" /></>],
  [/lease/i, <><circle cx="8" cy="15" r="4" /><path d="m10.9 12.1 8.6-8.6" /><path d="m18 5 2 2m-2-6 3 3" /></>],
  [/rent/i, <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M9 9v11" /></>],
  [/invest/i, <><path d="m3 17 6-6 4 4 8-8" /><path d="M14 7h7v7" /></>],
  [/refer/i, <><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M12 8v13M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" /><path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5" /></>],
];

function TileIcon({ label }: { label: string }) {
  const found = TILE_ICONS.find(([re]) => re.test(label));
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
      {found ? found[1] : <path d="M12 5v14M5 12h14" />}
    </svg>
  );
}

function DetailIcon({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0 text-[#0099cc]" aria-hidden="true">
      {children}
    </svg>
  );
}

export function DigitalCardClient({
  name,
  role,
  brokerage,
  tagline,
  handle,
  photoUrl,
  photoSvg,
  phone,
  email,
  address,
  hours,
  shareUrl,
  canonicalUrl,
  proofPoints,
  services,
  contactButtonLabel,
}: Props) {
  const displayName = name || "Rohit Sharma";
  const displayRole = role || "REALTOR® · Caledonia & Haldimand County";
  const displayBrokerage = brokerage || "Lombard Group Real Estate Brokerage Inc.";
  const displayTagline = tagline || "Local Roots. Global Reach.";
  const proof = (proofPoints ?? []).filter((p) => p.value).slice(0, 3);
  const proofList = proof.length ? proof : DEFAULT_PROOF;
  const serviceList = (services ?? []).filter((s) => s.label && s.title);
  const list = serviceList.length ? serviceList : DEFAULT_SERVICES;
  const [active, setActive] = useState(0);
  const [shared, setShared] = useState(false);
  const current = list[Math.min(active, list.length - 1)];

  const tel = phone ? `tel:${phone.replace(/\s/g, "")}` : null;
  const waNumber = phone ? digits(phone) : "";
  const waHref = (msg: string) =>
    waNumber
      ? `https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
  const shareLink = shareUrl || "https://www.getsetsold.ca/rohit";
  const vcardUrl = canonicalUrl || "https://www.getsetsold.ca/rohit-sharma-realtor";

  function saveContact() {
    const lines = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${displayName}`,
      `ORG:${displayBrokerage}`,
      `TITLE:REALTOR`,
      phone ? `TEL;TYPE=CELL:${phone}` : null,
      email ? `EMAIL:${email}` : null,
      address ? `ADR:;;${address}` : null,
      `URL:${vcardUrl}`,
      "END:VCARD",
    ].filter(Boolean);
    const blob = new Blob([lines.join("\n")], { type: "text/vcard" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${displayName.replace(/\s+/g, "-")}.vcf`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function share() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: `${displayName} — REALTOR`, url: shareLink });
        return;
      } catch {
        // User dismissed the share sheet — fall through to copy.
      }
    }
    try {
      await navigator.clipboard.writeText(shareLink);
      setShared(true);
      setTimeout(() => setShared(false), 2500);
    } catch {
      window.prompt("Copy this link:", shareLink);
    }
  }

  const pill =
    "flex h-12 items-center justify-center rounded-[var(--radius-btn)] px-4 text-[15px] font-semibold";
  const cardCls =
    "rounded-[var(--radius-lg)] border-[length:var(--border-card-width)] border-line bg-white shadow-[var(--shadow-card)]";

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5 px-5 py-8 md:px-0">
      {/* Top card — dark, one screen to act. Narrow by design: this is a
          card, not a section, so it does not use the site-wide max-w-7xl
          section width. */}
      <div className="flex flex-col items-center gap-2 rounded-[var(--radius-lg)] bg-ink px-6 py-8 text-center text-white">
        {photoSvg ? (
          <Svg asset={photoSvg} label={displayName} fill className="mb-2 h-28 w-28 overflow-hidden rounded-[999px] border-[3px] border-white" />
        ) : photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt={displayName}
            className="mb-2 h-28 w-28 rounded-[999px] border-[3px] border-white object-cover"
          />
        ) : null}
        {handle ? <p className="text-sm text-white/70">{handle}</p> : null}
        <h1 className="font-display text-[26px] font-bold leading-tight tracking-tight md:text-[32px]">
          {displayName}
        </h1>
        <p className="text-sm font-semibold">{displayRole}</p>
        <p className="text-sm text-white/75">{displayBrokerage}</p>
        <p className="text-[15px] font-semibold">{displayTagline}</p>
        <div className="mt-4 grid w-full grid-cols-3 gap-2">
          {proofList.map((p, i) => (
            <div
              key={i}
              className="rounded-[var(--radius-md)] border border-white/15 bg-white/10 px-2 py-2.5"
            >
              <p className="text-base font-bold">{p.value}</p>
              <p className="text-xs text-white/70">{p.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2.5">
        {tel ? (
          <a href={tel} className={`${pill} bg-ink text-white`}>
            Call Now
          </a>
        ) : null}
        <a
          href={waHref(`Hi ${displayName.split(" ")[0] || "Rohit"}, I found your card and would like to chat.`)}
          target="_blank"
          rel="noreferrer"
          className={`${pill} bg-primary text-white`}
        >
          WhatsApp
        </a>
        <button type="button" onClick={saveContact} className={`${pill} border border-line bg-white text-ink`}>
          Save Contact
        </button>
        <button type="button" onClick={share} className={`${pill} border border-line bg-white text-ink`}>
          {shared ? "Link copied!" : "Share"}
        </button>
        {email ? (
          <a href={`mailto:${email}`} className={`${pill} col-span-2 border border-line bg-white text-ink`}>
            Email · {email}
          </a>
        ) : null}
      </div>

      {/* I want to… — 3×2 icon tile grid + offer card */}
      <div className="flex flex-col gap-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">I want to…</p>
        <div className="grid grid-cols-3 gap-2.5">
          {list.map((s, i) => (
            <button
              key={s.label}
              type="button"
              onClick={() => setActive(i)}
              aria-pressed={active === i}
              className={`flex flex-col items-center gap-2 rounded-[var(--radius-md)] border px-2 py-4 text-[13px] font-medium ${
                active === i ? "border-ink bg-ink text-white" : "border-line bg-white text-ink"
              }`}
            >
              <TileIcon label={s.label} />
              {s.label}
            </button>
          ))}
        </div>
        <div className={`${cardCls} flex flex-col gap-3 p-6`} style={{ borderTop: "3px solid #0099cc" }}>
          <h2 className="text-xl font-semibold md:text-[22px]">{current.title}</h2>
          {(() => {
            const chips = (current.highlights ?? []).map((h) => h.text).filter(Boolean).slice(0, 3);
            return chips.length ? (
              <div className="flex flex-wrap gap-2">
                {chips.map((c, i) => (
                  <span key={i} className="rounded-[var(--radius-label)] bg-[#e6f6fc] px-3 py-1.5 text-xs font-semibold text-[#007aa3]">
                    {c}
                  </span>
                ))}
              </div>
            ) : null;
          })()}
          <p className="text-[15px] leading-relaxed text-muted">{current.body}</p>
          {(() => {
            const isCustom = current.link_type === "custom" && !!current.link_href;
            const href = isCustom ? current.link_href! : waHref(current.whatsapp_message);
            const label = current.link_label || (isCustom ? "Learn more" : `WhatsApp about ${current.label.toLowerCase()}`);
            const external = /^https?:\/\//.test(href);
            return (
              <a
                href={href}
                {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
                className={`${pill} bg-primary text-white`}
              >
                {label}
              </a>
            );
          })()}
        </div>
      </div>

      {/* Contact — dark card: big tap-to-call, message button, icon-only rows. */}
      {address || hours || phone ? (
        <div className="flex flex-col gap-4 rounded-[var(--radius-lg)] bg-ink p-6 text-white">
          {phone && tel ? (
            <div>
              <a href={tel} className="text-[27px] font-bold leading-tight tracking-tight text-white no-underline">
                {phone}
              </a>
              <p className="mt-1 text-[13px] text-white/60">Tap to call</p>
            </div>
          ) : null}
          <a
            href={waHref(`Hi ${displayName.split(" ")[0] || "Rohit"}, I found your card and would like to chat.`)}
            target="_blank"
            rel="noreferrer"
            className={`${pill} bg-primary text-white`}
          >
            {contactButtonLabel || "WhatsApp me"}
          </a>
          <div className="flex flex-col gap-2.5 text-sm text-white/80">
            {address ? (
              <div className="flex items-center gap-2.5">
                <DetailIcon><path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" /></DetailIcon>
                {address}
              </div>
            ) : null}
            {hours ? (
              <div className="flex items-center gap-2.5">
                <DetailIcon><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></DetailIcon>
                {hours}
              </div>
            ) : null}
            <div className="flex items-center gap-2.5">
              <DetailIcon><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></DetailIcon>
              {displayBrokerage}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
