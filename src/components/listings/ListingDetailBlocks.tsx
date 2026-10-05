import { displayValue, type PropertyListing } from "@/lib/mls";

const currency = (v: unknown): string | null => {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(/[^0-9.\-]/g, ""));
  if (Number.isNaN(n)) return displayValue(v) || null;
  return "$" + Math.round(n).toLocaleString("en-CA");
};

const num = (v: unknown): string | null => {
  const raw = displayValue(v);
  if (!raw) return null;
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isNaN(n) ? raw : n.toLocaleString("en-CA");
};

const dateFmt = (v: unknown): string | null => {
  const raw = displayValue(v);
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};

const text = (v: unknown): string | null => displayValue(v) || null;

export type DetailField = { label: string; value: string | null };

/** Split an array into chunks of `size`. */
export function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Renders fields as a basic table: the top row defines 4 columns and every
 * row below follows the same divisions — short rows are padded with empty
 * cells so the dividers continue through, even when a row has fewer values.
 * No outer border; row dividers always span the full card width.
 */
export function DetailBlock({ title, fields }: { title: string; fields: DetailField[] }) {
  const visible = fields.filter((f) => f.value);
  if (!visible.length) return null;
  const rows: (DetailField | null)[][] = chunkArray(visible, 4).map((c) => {
    const padded: (DetailField | null)[] = [...c];
    while (padded.length < 4) padded.push(null);
    return padded;
  });
  return (
    <div className="overflow-hidden rounded-2xl bg-white">
      <h2 className="border-b border-line px-6 py-4 font-display text-xl">{title}</h2>
      {rows.map((row, ri) => (
        <div key={ri} className={`grid grid-cols-2 md:grid-cols-4 ${ri > 0 ? "border-t border-line" : ""}`}>
          {row.map((f, ci) =>
            f ? (
              <div
                key={f.label}
                className="flex flex-col border-line bg-white px-3 py-5 text-center even:border-l md:border-l md:first:border-l-0"
              >
                <div className="font-display text-lg font-semibold leading-snug text-ink">{f.value}</div>
                <div className="mt-1.5 text-[11px] text-muted">{f.label}</div>
              </div>
            ) : (
              <div
                key={`empty-${ci}`}
                aria-hidden="true"
                className="border-line even:border-l md:border-l md:first:border-l-0"
              />
            )
          )}
        </div>
      ))}
    </div>
  );
}

export function LocationDescription({ listing }: { listing: PropertyListing }) {
  const fullAddress = [listing.UnparsedAddress, listing.City, [listing.Province, listing.PostalCode].filter(Boolean).join(" ")]
    .filter((p) => p && String(p).trim())
    .join(", ");
  return (
    <DetailBlock
      title="Location Description"
      fields={[
            { label: "Full Address", value: text(fullAddress) },
            { label: "Province", value: text(listing.Province) },
            { label: "Postal Code", value: text(listing.PostalCode) },
            { label: "Directions", value: text(listing.Directions) },
            { label: "Subdivision", value: text(listing.SubdivisionName) },
            { label: "Community Name", value: text(listing.CityRegion) },
          ]}
    />
  );
}

export function PropertySummary({ listing }: { listing: PropertyListing }) {
  return (
    <DetailBlock
      title="Property Summary"
      fields={[
            { label: "Property Type", value: text(listing.PropertySubType) },
            { label: "Stories", value: text(listing.Stories) },
            { label: "Structure Type", value: text(listing.StructureType) },
            { label: "Architectural Style", value: text(listing.ArchitecturalStyle) },
            { label: "Bedrooms Total", value: text(listing.BedroomsTotal) },
            { label: "Above Grade Beds", value: text(listing.BedroomsAboveGrade) },
            { label: "Below Grade Beds", value: text(listing.BedroomsBelowGrade) },
            { label: "Bathrooms", value: text(listing.BathroomsTotalInteger) },
            { label: "Partial Baths", value: text(listing.BathroomsPartial) },
            { label: "Above Grade Area", value: num(listing.AboveGradeFinishedArea) },
            { label: "Below Grade Area", value: num(listing.BelowGradeFinishedArea) },
            { label: "Living Area", value: num(listing.LivingArea) },
            { label: "Building Area", value: num(listing.BuildingAreaTotal) },
            { label: "Total Units", value: text(listing.NumberOfUnitsTotal) },
            { label: "Parking Features", value: text(listing.ParkingFeatures) },
            { label: "Fireplaces", value: text(listing.FireplacesTotal) },
            { label: "Subdivision", value: text(listing.SubdivisionName) },
            { label: "Neighbourhood", value: text(listing.CityRegion) },
            { label: "Land Size", value: text(listing.LotSizeDimensions) },
            { label: "Title", value: text(listing.CommonInterest) },
            { label: "Annual Property Taxes", value: currency(listing.TaxAnnualAmount) },
            { label: "Year Built", value: text(listing.YearBuilt) },
            { label: "Basement", value: text(listing.Basement) },
          ]}
    />
  );
}

export function LandAndLot({ listing }: { listing: PropertyListing }) {
  return (
    <DetailBlock
      title="Land & Lot"
      fields={[
            { label: "Land Size", value: text(listing.LotSizeDimensions) },
            { label: "Lot Area", value: text(listing.LotSizeArea) },
            { label: "Lot Features", value: text(listing.LotFeatures) },
            { label: "Pool", value: text(listing.PoolFeatures) },
            { label: "Community Features", value: text(listing.CommunityFeatures) },
          ]}
    />
  );
}

export function ConstructionExterior({ listing }: { listing: PropertyListing }) {
  return (
    <DetailBlock
      title="Construction & Exterior"
      fields={[
            { label: "Construction Materials", value: text(listing.ConstructionMaterials) },
            { label: "Roof", value: text(listing.Roof) },
            { label: "Flooring", value: text(listing.Flooring) },
            { label: "Foundation Details", value: text(listing.FoundationDetails) },
            { label: "Fireplaces", value: text(listing.FireplacesTotal) },
            { label: "Building Features", value: text(listing.BuildingFeatures) },
            { label: "Exterior Features", value: text(listing.ExteriorFeatures) },
          ]}
    />
  );
}

export function SystemsUtilities({ listing }: { listing: PropertyListing }) {
  return (
    <DetailBlock
      title="Systems & Utilities"
      fields={[
            { label: "Heating", value: text(listing.Heating) },
            { label: "Cooling", value: text(listing.Cooling) },
            { label: "Utilities", value: text(listing.Utilities) },
            { label: "Sewer", value: text(listing.Sewer) },
            { label: "Water Source", value: text(listing.WaterSource) },
            { label: "Appliances", value: text(listing.Appliances) },
          ]}
    />
  );
}

export function Financials({ listing, sale }: { listing: PropertyListing; sale: boolean }) {
  return (
    <>
      <DetailBlock
        title="Financials"
        fields={[
          sale
            ? { label: "List Price", value: currency(listing.ListPrice) }
            : { label: "Total Rent", value: currency(listing.TotalActualRent) ? `${currency(listing.TotalActualRent)}/mo` : null },
          { label: "Annual Tax", value: currency(listing.TaxAnnualAmount) },
          { label: "Condo/HOA Fee", value: currency(listing.AssociationFee) },
          { label: "Fee Includes", value: text(listing.AssociationFeeIncludes) },
        ]}
      />
      <DetailBlock
        title="Listing Info"
        fields={[
          { label: "Listing ID", value: text(listing.ListingId ?? listing.ListingKey) },
          { label: "Brokerage", value: text(listing.OfficeName) },
          { label: "MLS System", value: text(listing.OriginatingSystemName) },
          { label: "Date Listed", value: dateFmt(listing.OriginalEntryTimestamp) },
          { label: "Last Updated", value: dateFmt(listing.ModificationTimestamp) },
          { label: "Status Changed", value: dateFmt(listing.StatusChangeTimestamp) },
        ]}
      />
    </>
  );
}
