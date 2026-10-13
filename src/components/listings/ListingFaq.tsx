import type { PropertyListing } from "@/lib/mls";
import { displayValue } from "@/lib/mls";
import { CollapsibleCard } from "./CollapsibleCard";

const text = (v: unknown): string | null => displayValue(v) || null;

type Faq = { q: string; a: string };

/**
 * Generates smart FAQs from listing data — each combines multiple fields
 * into a genuinely useful answer. Skips questions where there's not enough
 * data to say something meaningful.
 */
export function generateListingFaqs(listing: PropertyListing): Faq[] {
  const faqs: Faq[] = [];
  const addr = text(listing.UnparsedAddress) || "this property";
  const city = text(listing.City) || "";
  const beds = text(listing.BedroomsTotal);
  const baths = text(listing.BathroomsTotalInteger);
  const type = text(listing.PropertySubType) || "home";
  const sqft = text(listing.LivingArea);
  const lot = text(listing.LotSizeDimensions);
  const parkingTotal = text(listing.ParkingTotal);
  const parkingFeatures = text(Array.isArray(listing.ParkingFeatures) ? listing.ParkingFeatures.join(", ") : listing.ParkingFeatures);
  const heating = text(listing.Heating);
  const cooling = text(listing.Cooling);
  const basement = text(listing.Basement);
  const pool = text(Array.isArray(listing.PoolFeatures) ? listing.PoolFeatures.join(", ") : listing.PoolFeatures);
  const fireplaces = text(listing.FireplacesTotal);
  const tax = text(listing.TaxAnnualAmount);
  const condoFee = text(listing.AssociationFee);
  const stories = text(listing.Stories);

  // 1. Family fit — combines beds, baths, sqft, stories
  if (beds || baths) {
    const parts: string[] = [];
    if (beds && baths) parts.push(`${beds} bedrooms and ${baths} bathrooms`);
    else if (beds) parts.push(`${beds} bedrooms`);
    else if (baths) parts.push(`${baths} bathrooms`);
    if (stories) parts.push(`across ${stories} ${Number(stories) === 1 ? "storey" : "storeys"}`);
    if (sqft) parts.push(`${sqft} sq ft of living space`);

    let verdict = "";
    const bedNum = Number(beds);
    if (bedNum >= 4) verdict = "plenty of room for a larger family, guests, or a home office.";
    else if (bedNum === 3) verdict = "a solid fit for a growing family — room for kids plus a guest room or office.";
    else if (bedNum <= 2) verdict = "ideal for a couple, small family, or as a low-maintenance investment property.";

    faqs.push({
      q: `Is ${addr} a good fit for a family?`,
      a: `With ${parts.join(", ")}, ${verdict}${lot ? ` The lot measures ${lot}.` : ""}`,
    });
  }

  // 2. Parking — combines total + features
  if (parkingTotal || parkingFeatures) {
    const parts: string[] = [];
    if (parkingTotal) parts.push(`${parkingTotal} total parking ${Number(parkingTotal) === 1 ? "space" : "spaces"}`);
    if (parkingFeatures) parts.push(`(${parkingFeatures})`);
    faqs.push({
      q: "What's the parking situation?",
      a: `This property includes ${parts.join(" ")}.`,
    });
  }

  // 3. Monthly costs — tax, condo fee, heating
  if (tax || condoFee || heating) {
    const parts: string[] = [];
    if (tax) {
      const n = Number(String(tax).replace(/[^0-9.]/g, ""));
      parts.push(!Number.isNaN(n) ? `annual property taxes of $${Math.round(n).toLocaleString("en-CA")}` : `annual property taxes of ${tax}`);
    }
    if (condoFee) parts.push(`a condo/maintenance fee of $${condoFee}/mo`);
    if (heating) parts.push(`heating is ${heating.toLowerCase()}`);
    faqs.push({
      q: "What are the ongoing costs beyond the mortgage?",
      a: `Expect ${parts.join(", ")}. ${!tax && !condoFee ? "Confirm the latest tax and fee figures with your agent before making an offer — these change yearly." : "Always verify the latest figures with your agent before making an offer."}`,
    });
  }

  // 4. Basement
  if (basement) {
    const isFinished = /finish/i.test(basement);
    faqs.push({
      q: "Does it have a basement, and is it finished?",
      a: isFinished
        ? `Yes — ${basement}. A finished basement adds meaningful living space.`
        : `The listing describes the basement as: ${basement}. Ask about finishing status during a showing — it affects both livable space and value.`,
    });
  }

  // 5. Standout features vs considerations
  const standouts: string[] = [];
  const considerations: string[] = [];
  if (baths && Number(baths) >= 3) standouts.push(`${baths} bathrooms`);
  if (heating && /gas/i.test(heating)) standouts.push("gas heating (cost-efficient)");
  if (cooling && !/none/i.test(cooling)) standouts.push(`${cooling} cooling`);
  if (pool && !/none/i.test(pool)) standouts.push(`pool (${pool})`);
  else considerations.push("no pool");
  if (fireplaces && Number(fireplaces) > 0) standouts.push(`${fireplaces} fireplace${Number(fireplaces) === 1 ? "" : "s"}`);
  else considerations.push("no fireplace");

  if (standouts.length || considerations.length) {
    let a = "";
    if (standouts.length) a += `Standouts: ${standouts.join(", ")}. `;
    if (considerations.length) a += `Things to consider: ${considerations.join(", ")}.`;
    faqs.push({ q: "Any standout features or drawbacks?", a: a.trim() });
  }

  return faqs;
}

export function ListingFaq({ listing }: { listing: PropertyListing }) {
  const faqs = generateListingFaqs(listing);
  if (!faqs.length) return null;

  return (
    <CollapsibleCard title={`FAQs About ${text(listing.UnparsedAddress) || "This Property"}`}>
      <div className="flex flex-col">
        {faqs.map((f, i) => (
          <details key={i} className="group border-t border-line px-6 py-4 first:border-t-0">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium text-ink [&::-webkit-details-marker]:hidden">
              {f.q}
              <span className="text-xl text-[#0066cc] transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="pt-2 text-sm leading-relaxed text-muted">{f.a}</p>
          </details>
        ))}
      </div>
    </CollapsibleCard>
  );
}
