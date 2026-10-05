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
export type DetailSection = { heading?: string; fields: DetailField[] };

export function DetailBlock({ title, sections }: { title: string; sections: DetailSection[] }) {
  const visible = sections
    .map((s) => ({ ...s, fields: s.fields.filter((f) => f.value) }))
    .filter((s) => s.fields.length);
  if (!visible.length) return null;
  return (
    <div className="overflow-hidden rounded-2xl bg-white">
      <h2 className="border-b border-line px-6 py-4 font-display text-xl">{title}</h2>
      {visible.map((s, i) => (
        <div key={i}>
          {s.heading ? (
            <h3 className="border-b border-line px-6 py-3 text-[11px] font-semibold tracking-wider text-muted">{s.heading}</h3>
          ) : null}
          <dl className="grid grid-cols-2 gap-px bg-line md:grid-cols-4">
            {s.fields.map((f) => (
              <div key={f.label} className="flex flex-col bg-white px-3 py-5 text-center">
                <dd className="order-1 font-display text-lg font-semibold leading-snug text-ink">{f.value}</dd>
                <dt className="order-2 mt-1.5 text-[11px] text-muted">{f.label}</dt>
              </div>
            ))}
          </dl>
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
      sections={[
        {
          fields: [
            { label: "Full Address", value: text(fullAddress) },
            { label: "Province", value: text(listing.Province) },
            { label: "Postal Code", value: text(listing.PostalCode) },
            { label: "Directions", value: text(listing.Directions) },
            { label: "Subdivision", value: text(listing.SubdivisionName) },
            { label: "Community Name", value: text(listing.CityRegion) },
          ],
        },
      ]}
    />
  );
}

export function PropertySummary({ listing }: { listing: PropertyListing }) {
  return (
    <DetailBlock
      title="Property Summary"
      sections={[
        {
          fields: [
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
          ],
        },
      ]}
    />
  );
}

export function LandAndLot({ listing }: { listing: PropertyListing }) {
  return (
    <DetailBlock
      title="Land & Lot"
      sections={[
        {
          fields: [
            { label: "Land Size", value: text(listing.LotSizeDimensions) },
            { label: "Lot Area", value: text(listing.LotSizeArea) },
            { label: "Lot Features", value: text(listing.LotFeatures) },
            { label: "Pool", value: text(listing.PoolFeatures) },
            { label: "Community Features", value: text(listing.CommunityFeatures) },
          ],
        },
      ]}
    />
  );
}

export function ConstructionExterior({ listing }: { listing: PropertyListing }) {
  return (
    <DetailBlock
      title="Construction & Exterior"
      sections={[
        {
          fields: [
            { label: "Construction Materials", value: text(listing.ConstructionMaterials) },
            { label: "Roof", value: text(listing.Roof) },
            { label: "Flooring", value: text(listing.Flooring) },
            { label: "Foundation Details", value: text(listing.FoundationDetails) },
            { label: "Fireplaces", value: text(listing.FireplacesTotal) },
            { label: "Building Features", value: text(listing.BuildingFeatures) },
            { label: "Exterior Features", value: text(listing.ExteriorFeatures) },
          ],
        },
      ]}
    />
  );
}

export function SystemsUtilities({ listing }: { listing: PropertyListing }) {
  return (
    <DetailBlock
      title="Systems & Utilities"
      sections={[
        {
          fields: [
            { label: "Heating", value: text(listing.Heating) },
            { label: "Cooling", value: text(listing.Cooling) },
            { label: "Utilities", value: text(listing.Utilities) },
            { label: "Sewer", value: text(listing.Sewer) },
            { label: "Water Source", value: text(listing.WaterSource) },
            { label: "Appliances", value: text(listing.Appliances) },
          ],
        },
      ]}
    />
  );
}

export function Financials({ listing, sale }: { listing: PropertyListing; sale: boolean }) {
  return (
    <DetailBlock
      title="Financials"
      sections={[
        {
          fields: [
            sale
              ? { label: "List Price", value: currency(listing.ListPrice) }
              : { label: "Total Rent", value: currency(listing.TotalActualRent) ? `${currency(listing.TotalActualRent)}/mo` : null },
            { label: "Annual Tax", value: currency(listing.TaxAnnualAmount) },
            { label: "Condo/HOA Fee", value: currency(listing.AssociationFee) },
            { label: "Fee Includes", value: text(listing.AssociationFeeIncludes) },
          ],
        },
        {
          heading: "Listing Info",
          fields: [
            { label: "Listing ID", value: text(listing.ListingId ?? listing.ListingKey) },
            { label: "Brokerage", value: text(listing.OfficeName) },
            { label: "MLS System", value: text(listing.OriginatingSystemName) },
            { label: "Date Listed", value: dateFmt(listing.OriginalEntryTimestamp) },
            { label: "Last Updated", value: dateFmt(listing.ModificationTimestamp) },
            { label: "Status Changed", value: dateFmt(listing.StatusChangeTimestamp) },
          ],
        },
      ]}
    />
  );
}
