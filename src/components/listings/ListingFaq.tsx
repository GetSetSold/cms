import type { PropertyListing } from "@/lib/mls";
import { displayValue } from "@/lib/mls";
import { CollapsibleCard } from "./CollapsibleCard";

const text = (v: unknown): string | null => displayValue(v) || null;
const arr = (v: unknown): string | null => {
  if (Array.isArray(v)) return v.join(", ") || null;
  return text(v);
};
const numOf = (v: unknown): number | null => {
  const n = Number(String(v ?? "").replace(/[^0-9.]/g, ""));
  return Number.isNaN(n) ? null : n;
};

type Faq = { q: string; a: string };
type Ctx = {
  addr: string; city: string; beds: string | null; baths: string | null;
  bedNum: number | null; bathNum: number | null; type: string;
  sqft: string | null; lot: string | null; parkingTotal: string | null;
  parkingFeatures: string | null; heating: string | null; cooling: string | null;
  basement: string | null; pool: string | null; fireplaces: string | null;
  fireNum: number | null; tax: string | null; taxNum: number | null;
  condoFee: string | null; feeIncludes: string | null; stories: string | null;
  yearBuilt: number | null; price: number | null; isSale: boolean;
};

function buildCtx(listing: PropertyListing): Ctx {
  return {
    addr: text(listing.UnparsedAddress) || "this property",
    city: text(listing.City) || "",
    beds: text(listing.BedroomsTotal),
    baths: text(listing.BathroomsTotalInteger),
    bedNum: numOf(listing.BedroomsTotal),
    bathNum: numOf(listing.BathroomsTotalInteger),
    type: text(listing.PropertySubType) || "home",
    sqft: text(listing.LivingArea),
    lot: text(listing.LotSizeDimensions),
    parkingTotal: text(listing.ParkingTotal),
    parkingFeatures: arr(listing.ParkingFeatures),
    heating: text(listing.Heating),
    cooling: text(listing.Cooling),
    basement: text(listing.Basement),
    pool: arr(listing.PoolFeatures),
    fireplaces: text(listing.FireplacesTotal),
    fireNum: numOf(listing.FireplacesTotal),
    tax: text(listing.TaxAnnualAmount),
    taxNum: numOf(listing.TaxAnnualAmount),
    condoFee: text(listing.AssociationFee),
    feeIncludes: arr(listing.AssociationFeeIncludes),
    stories: text(listing.Stories),
    yearBuilt: listing.YearBuilt,
    price: listing.ListPrice,
    isSale: listing.ListPrice != null,
  };
}

type Template = {
  /** Returns true if this question applies to the listing */
  match: (c: Ctx) => boolean;
  /** Generates the Q&A */
  make: (c: Ctx) => Faq;
};

const TEMPLATES: Template[] = [
  // 1. Family fit — 3+ beds
  {
    match: (c) => (c.bedNum ?? 0) >= 3,
    make: (c) => ({
      q: `Is ${c.addr} a good fit for a growing family?`,
      a: `With ${c.beds} bedrooms${c.baths ? ` and ${c.baths} bathrooms` : ""}${c.sqft ? ` (${c.sqft} sq ft)` : ""}, there's room for kids plus a guest room or home office.${c.stories && Number(c.stories) > 1 ? ` The ${c.stories}-storey layout keeps living and sleeping areas separated.` : ""}`,
    }),
  },
  // 2. Couple/small family — 1-2 beds
  {
    match: (c) => (c.bedNum ?? 99) <= 2 && c.bedNum !== null,
    make: (c) => ({
      q: `Who is ${c.addr} best suited for?`,
      a: `With ${c.beds} bedroom${c.bedNum === 1 ? "" : "s"}${c.baths ? ` and ${c.baths} bathroom${c.bathNum === 1 ? "" : "s"}` : ""}, this is ideal for a couple, a small family, or as a low-maintenance ${c.isSale ? "investment property" : "rental"}.`,
    }),
  },
  // 3. Parking
  {
    match: (c) => !!c.parkingTotal || !!c.parkingFeatures,
    make: (c) => {
      const parts: string[] = [];
      if (c.parkingTotal) parts.push(`${c.parkingTotal} space${Number(c.parkingTotal) === 1 ? "" : "s"}`);
      if (c.parkingFeatures) parts.push(c.parkingFeatures);
      return {
        q: "What's the parking situation?",
        a: `This property includes ${parts.join(" — ")}.`,
      };
    },
  },
  // 4. Monthly costs
  {
    match: (c) => !!c.tax || !!c.condoFee || !!c.heating,
    make: (c) => {
      const parts: string[] = [];
      if (c.taxNum) parts.push(`annual property taxes of $${c.taxNum.toLocaleString("en-CA")}`);
      if (c.condoFee) parts.push(`a condo/maintenance fee of $${c.condoFee}/mo`);
      if (c.heating) parts.push(`heating is ${c.heating.toLowerCase()}`);
      return {
        q: "What are the ongoing costs beyond the mortgage?",
        a: `Budget for ${parts.join(", ")}. Always verify the latest figures with your agent before making an offer — these change yearly.`,
      };
    },
  },
  // 5. Condo fees detail
  {
    match: (c) => !!c.condoFee,
    make: (c) => ({
      q: "What do the condo/maintenance fees cover?",
      a: c.feeIncludes
        ? `The $${c.condoFee}/mo fee covers: ${c.feeIncludes}.`
        : `The condo/maintenance fee is $${c.condoFee}/mo. Ask the listing agent for a breakdown of exactly what's included — coverage varies widely.`,
    }),
  },
  // 6. Basement
  {
    match: (c) => !!c.basement,
    make: (c) => {
      const finished = /finish/i.test(c.basement!);
      return {
        q: "Does it have a basement, and is it finished?",
        a: finished
          ? `Yes — ${c.basement}. A finished basement adds meaningful living space beyond the listed square footage.`
          : `The listing describes the basement as: ${c.basement}. Confirm the finishing status during a showing — it affects both livable space and resale value.`,
      };
    },
  },
  // 7. Pool — has one
  {
    match: (c) => !!c.pool && !/none/i.test(c.pool),
    make: (c) => ({
      q: "Tell me about the pool.",
      a: `This property has a pool: ${c.pool}. Ask whether it's open year-round or seasonal, and factor in maintenance costs when budgeting.`,
    }),
  },
  // 8. No pool — detached with lot
  {
    match: (c) => (!c.pool || /none/i.test(c.pool)) && !!c.lot && /detached/i.test(c.type),
    make: () => ({
      q: "Is there room to add a pool later?",
      a: `No pool currently, but the lot size suggests there may be room for one. Check municipal setback rules and get a quote before assuming — installation typically runs $50,000–$100,000+ in Ontario.`,
    }),
  },
  // 9. Fireplace
  {
    match: (c) => (c.fireNum ?? 0) > 0,
    make: (c) => ({
      q: `How many fireplaces are there, and what type?`,
      a: `This home has ${c.fireNum} fireplace${c.fireNum === 1 ? "" : "s"}. Confirm the fuel type (wood, gas, or electric) and have it inspected — especially wood-burning, which needs a WETT certification for insurance.`,
    }),
  },
  // 10. Heating efficiency
  {
    match: (c) => !!c.heating,
    make: (c) => {
      const gas = /gas/i.test(c.heating!);
      const electric = /electric/i.test(c.heating!);
      const tip = gas ? "Gas heating is generally the most cost-efficient option in Ontario winters."
        : electric ? "Electric heating can mean higher winter bills — ask for past utility statements."
        : "Ask for past utility bills to understand real heating costs.";
      return {
        q: "How is the home heated? Is it efficient?",
        a: `Heating is ${c.heating!.toLowerCase()}. ${tip}`,
      };
    },
  },
  // 11. Cooling
  {
    match: (c) => !!c.cooling && !/none/i.test(c.cooling),
    make: (c) => ({
      q: "Is there air conditioning?",
      a: `Yes — ${c.cooling!.toLowerCase()} cooling is in place.`,
    }),
  },
  // 12. No cooling
  {
    match: (c) => !c.cooling || /none/i.test(c.cooling),
    make: () => ({
      q: "Is there air conditioning?",
      a: `No central cooling is listed. Budget for portable or window units, or get a quote for adding central air — typically $5,000–$10,000 installed.`,
    }),
  },
  // 13. Lot size — detached
  {
    match: (c) => !!c.lot && /detached/i.test(c.type),
    make: (c) => ({
      q: "How big is the lot?",
      a: `The lot measures ${c.lot}. ${c.city ? `For ${c.city}, check whether the yard is fenced — important if you have kids or pets.` : ""}`,
    }),
  },
  // 14. Year built — older home
  {
    match: (c) => !!c.yearBuilt && c.yearBuilt < 1990,
    make: (c) => ({
      q: `This home was built in ${c.yearBuilt} — what should I watch for?`,
      a: `Homes from this era may have original wiring, plumbing, or insulation. Key checks: electrical panel (100 vs 200 amp), roof age, furnace age, and whether the basement has ever had water issues. A thorough home inspection is essential.`,
    }),
  },
  // 15. Year built — newer home
  {
    match: (c) => !!c.yearBuilt && c.yearBuilt >= 2000,
    make: (c) => ({
      q: `Built in ${c.yearBuilt} — is this considered new?`,
      a: `A ${c.yearBuilt} build means modern building codes, likely better insulation and wiring than older homes. Ask if any major systems (roof, furnace, windows) have been replaced — even newer homes need maintenance.`,
    }),
  },
  // 16. Multi-storey layout
  {
    match: (c) => !!c.stories && Number(c.stories) >= 2,
    make: (c) => ({
      q: "How is the space laid out across floors?",
      a: `This is a ${c.stories}-storey ${c.type.toLowerCase()}.${c.beds && c.baths ? ` The ${c.beds} bedrooms and ${c.baths} bathrooms are typically split with living areas on the main floor and bedrooms above — confirm the exact layout during a showing.` : ""}`,
    }),
  },
  // 17. Starter home — price under 600k
  {
    match: (c) => c.isSale && !!c.price && c.price < 600000,
    make: (c) => ({
      q: "Is this a good starter home?",
      a: `At $${c.price!.toLocaleString("en-CA")}, this is priced in starter-home territory for ${c.city || "the area"}. ${c.bedNum && c.bedNum >= 2 ? "With multiple bedrooms, it has room to grow into." : ""} Factor in ${c.condoFee ? "condo fees" : "property taxes"} when calculating your true monthly cost.`,
    }),
  },
  // 18. Luxury — price over 1M
  {
    match: (c) => c.isSale && !!c.price && c.price >= 1000000,
    make: (c) => {
      const lux: string[] = [];
      if (c.sqft) lux.push(`${c.sqft} sq ft`);
      if ((c.bathNum ?? 0) >= 3) lux.push(`${c.baths} bathrooms`);
      if (c.pool && !/none/i.test(c.pool)) lux.push("a pool");
      if ((c.fireNum ?? 0) > 0) lux.push(`${c.fireNum} fireplace${c.fireNum === 1 ? "" : "s"}`);
      return {
        q: "What makes this a luxury property?",
        a: `At $${c.price!.toLocaleString("en-CA")}, ${lux.length ? `standout features include ${lux.join(", ")}.` : "the premium reflects location, finishes, and lot."} In this price range, expect higher-end finishes — verify during a showing.`,
      };
    },
  },
  // 19. Rental — monthly cost clarity
  {
    match: (c) => !c.isSale,
    make: (c) => ({
      q: "What's included in the rent?",
      a: c.feeIncludes
        ? `The listing notes: ${c.feeIncludes}. Confirm with the landlord exactly which utilities are included vs. tenant-paid before signing.`
        : `The listing doesn't specify what's included. Always confirm with the landlord which utilities (heat, hydro, water, internet) are covered vs. paid separately — this can add hundreds per month.`,
    }),
  },
  // 20. Investment potential — basement or multi-unit signs
  {
    match: (c) => !!c.basement && /separate|in-law|apartment/i.test(c.basement),
    make: (c) => ({
      q: "Could this work as an investment property?",
      a: `The basement description mentions: ${c.basement}. If it has a separate entrance, there may be rental income potential — but verify zoning and whether a legal second unit is permitted in ${c.city || "this municipality"} before counting on it.`,
    }),
  },
];

/**
 * Picks 5-6 matching questions, prioritizing the most specific ones.
 * Each listing gets a different mix based on its data.
 */
export function generateListingFaqs(listing: PropertyListing): Faq[] {
  const ctx = buildCtx(listing);
  const matched = TEMPLATES.filter((t) => {
    try { return t.match(ctx); } catch { return false; }
  });

  // Shuffle deterministically by listing key so it's stable per listing
  // but different across listings
  const key = String(listing.ListingKey || "");
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = ((hash << 5) - hash + key.charCodeAt(i)) | 0;

  const shuffled = [...matched].sort(() => {
    hash = ((hash << 5) - hash + 0x6D2B79F5) | 0;
    return ((hash >>> 0) % 100) / 100 - 0.5;
  });

  return shuffled.slice(0, 6).map((t) => t.make(ctx));
}

export function ListingFaq({ listing }: { listing: PropertyListing }) {
  const faqs = generateListingFaqs(listing);
  if (!faqs.length) return null;

  return (
    <CollapsibleCard title={`FAQs About ${buildCtx(listing).addr}`}>
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
