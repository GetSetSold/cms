"use client";
/**
 * Calculator block — one block, two calculators (listing fee savings / buyer
 * cash back), three styles (brand / dark / minimal). Icon comes from the SVG
 * library via the block's icon_svg_id field. All numbers (fee %, cash-back
 * rate + cap, slider range/defaults) come from Admin → Calculators →
 * "Marketing Blocks" — nothing is hardcoded.
 */
import { useState } from "react";
import { Svg } from "@/components/site/Svg";
import type { SvgAsset } from "@/lib/types";
import type { MarketingCalculatorSettings } from "@/lib/calculators/types";

export type CalcType = "listing" | "buyer";
export type CalcStyle = "brand" | "dark" | "minimal";

const fmt = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
const accent = "var(--c-accent, #0099cc)";

export function CalculatorBlockClient({
  calcType,
  style,
  icon,
  heading,
  description,
  cfg,
}: {
  calcType: CalcType;
  style: CalcStyle;
  icon?: SvgAsset | null;
  heading?: string;
  description?: string;
  cfg: MarketingCalculatorSettings;
}) {
  const isListing = calcType === "listing";
  const [price, setPrice] = useState(isListing ? cfg.listingDefault : cfg.buyerDefault);

  const trad = (price * cfg.listingTraditionalPct) / 100;
  const ours = (price * cfg.listingOurPct) / 100;
  const savings = trad - ours;
  const cashback = Math.min((price * cfg.cashbackRatePct) / 100, cfg.cashbackCap);

  const title =
    heading || (isListing ? "Listing Fee Savings Calculator" : "Buyer Cash Back Calculator");
  const desc =
    description ||
    (isListing
      ? `Compare a traditional ${cfg.listingTraditionalPct}% listing fee vs our ${cfg.listingOurPct}% fee — same great service, thousands saved.`
      : `Find out how much cash back you'll receive — up to ${fmt(cfg.cashbackCap)} on your next home purchase.`);
  const sliderLabel = isListing ? "Slide to adjust home selling price" : "Slide to adjust home buying price";
  const priceLabel = isListing ? "Home Price" : "Purchase Price";

  const slider = (
    <>
      <p className="text-center text-[13px]">{sliderLabel}</p>
      <input
        type="range"
        min={cfg.sliderMin}
        max={cfg.sliderMax}
        step={10000}
        value={price}
        onChange={(e) => setPrice(Number(e.target.value))}
        className="calc-slider"
        aria-label={sliderLabel}
      />
    </>
  );

  const iconChip = icon ? (
    <div
      className="mb-[18px] flex h-[52px] w-[52px] items-center justify-center rounded-[var(--radius-md)] p-2.5"
      style={{ background: style === "dark" ? accent : "#0e0e13" }}
    >
      <Svg asset={icon} label={icon.name} className="h-full w-full [&_svg]:h-full [&_svg]:w-full" colorOverride="#ffffff" />
    </div>
  ) : null;

  if (style === "minimal") {
    return (
      <div>
        <p className="mb-[10px] text-[12px] font-bold uppercase tracking-[1.5px]" style={{ color: accent }}>
          {isListing ? "Seller Savings" : "Buyer Reward"}
        </p>
        <h3 className="mb-[6px] text-[26px] font-bold tracking-tight">{title}</h3>
        <p className="mb-[6px] text-[14px] text-muted">{desc}</p>
        <p className="text-[13px] text-muted">
          {priceLabel}: <b className="text-ink">{fmt(price)}</b>
        </p>
        {slider}
        <div className="my-[14px] text-[52px] font-extrabold leading-none tracking-tight" style={{ color: accent }}>
          {fmt(isListing ? savings : cashback)}
        </div>
        <p className="mb-[16px] text-[14px] text-muted">
          {isListing
            ? `your savings vs a traditional ${cfg.listingTraditionalPct}% listing fee`
            : "estimated cash back at closing"}
        </p>
        {isListing ? (
          <p className="text-[14px] text-muted">
            Traditional ({cfg.listingTraditionalPct}%): <b className="text-ink">{fmt(trad)}</b>
            {" · "}With us ({cfg.listingOurPct}%): <b className="text-ink">{fmt(ours)}</b>
          </p>
        ) : null}
      </div>
    );
  }

  const dark = style === "dark";
  return (
    <div
      className={`rounded-[var(--radius-lg)] p-[28px] md:p-[32px] ${
        dark ? "text-ground" : "border-[length:var(--border-card-width)] border-line bg-white shadow-[var(--shadow-card)]"
      }`}
      style={dark ? { background: "#0e0e13" } : undefined}
    >
      {iconChip}
      <h3 className="mb-[8px] text-[24px] font-bold tracking-tight">{title}</h3>
      <p className={`mb-[8px] text-[14px] leading-[1.6] ${dark ? "text-ground/65" : "text-muted"}`}>{desc}</p>
      <div className={dark ? "text-ground/60" : "text-muted"}>{slider}</div>
      <p className="my-[10px] mb-[18px] text-[17px] font-bold">
        {priceLabel}: <span style={{ color: dark ? "#7db9ff" : accent }}>{fmt(price)}</span>
      </p>
      <div
        className={`mb-[16px] rounded-[var(--radius-md)] p-[18px_20px] ${dark ? "bg-white/[0.06]" : "bg-soft"}`}
      >
        {isListing ? (
          <>
            <div className="flex items-baseline justify-between py-[8px] text-[14.5px]">
              <span className={dark ? "text-ground/60" : "text-muted"}>
                Typical Listing Fee ({cfg.listingTraditionalPct}%)
              </span>
              <b className="text-[18px]">{fmt(trad)}</b>
            </div>
            <div
              className={`flex items-baseline justify-between border-t py-[8px] text-[14.5px] ${
                dark ? "border-white/10" : "border-line"
              }`}
            >
              <span className={dark ? "text-ground/60" : "text-muted"}>
                With Us You Pay ({cfg.listingOurPct}%)
              </span>
              <b className="text-[18px]">{fmt(ours)}</b>
            </div>
          </>
        ) : (
          <div className="flex items-baseline justify-between py-[8px] text-[14.5px]">
            <span className={dark ? "text-ground/60" : "text-muted"}>Estimated Cash Back</span>
            <b className="text-[18px]">{fmt(cashback)}</b>
          </div>
        )}
      </div>
      <div
        className="rounded-[var(--radius-md)] p-[16px_20px] text-center text-[16px] font-bold text-white"
        style={{ background: dark ? "#ffffff" : accent, color: dark ? "#0e0e13" : "#ffffff" }}
      >
        {isListing ? (
          <>Your Savings: {fmt(savings)}</>
        ) : (
          <>Buyer Cash Back Reward: {fmt(cashback)}</>
        )}
      </div>
    </div>
  );
}
