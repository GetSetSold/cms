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
 * - "I want to…" chips switch the offer shown below them and re-write the
 *   WhatsApp message for that service. No page reload.
 * - Details (address, hours) sit in a <details> element at the bottom.
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

      {/* I want to… */}
      <div className="flex flex-col gap-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">I want to…</p>
        <div className="flex flex-wrap gap-2">
          {list.map((s, i) => (
            <button
              key={s.label}
              type="button"
              onClick={() => setActive(i)}
              aria-pressed={active === i}
              className={`rounded-[var(--radius-btn)] border px-4 py-2.5 text-sm font-semibold ${
                active === i ? "border-ink bg-ink text-white" : "border-line bg-white text-ink"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className={`${cardCls} flex flex-col gap-3 p-6`}>
          <h2 className="text-xl font-semibold md:text-[22px]">{current.title}</h2>
          <p className="text-[15px] leading-relaxed text-muted">{current.body}</p>
          <a
            href={waHref(current.whatsapp_message)}
            target="_blank"
            rel="noreferrer"
            className={`${pill} bg-primary text-white`}
          >
            WhatsApp about {current.label.toLowerCase()}
          </a>
        </div>
      </div>

      {/* Details, tucked away */}
      {address || hours || phone ? (
        <details className={`${cardCls} p-5 text-[15px] leading-relaxed text-muted`}>
          <summary className="cursor-pointer font-semibold text-ink">
            Details · Address, hours &amp; brokerage
          </summary>
          <p className="mt-3">
            {address ? (
              <>
                {address}
                <br />
              </>
            ) : null}
            {phone ? (
              <>
                Phone: {phone}
                <br />
              </>
            ) : null}
            {hours ? <>Hours: {hours}</> : null}
          </p>
        </details>
      ) : null}
    </div>
  );
}
