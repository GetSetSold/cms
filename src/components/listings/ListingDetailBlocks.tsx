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

export type DetailField = { label: string; value: string | null; span?: number };

/** Column spans per breakpoint — literal classes so Tailwind JIT picks them up. */
const SPAN_CLS: Record<number, string> = {
  1: "",
  2: "col-span-2 md:col-span-2",
  3: "col-span-2 md:col-span-3",
  4: "col-span-2 md:col-span-4",
};

type PlacedCell = { field: DetailField | null; span: number; dCol: number; mCol: number };

/**
 * Flows fields into desktop rows of 4 columns (honoring `span`), pads the
 * last row with empty cells so every row follows the same table divisions —
 * like a basic HTML table — and computes each cell's starting column on
 * desktop (dCol) and on mobile (mCol, from an independent 2-column flow with
 * spans clamped) so dividers land correctly at both breakpoints.
 */
function layoutTable(fields: DetailField[], mobileCols = 2): PlacedCell[][] {
  const DCOLS = 4;
  type C = { field: DetailField | null; span: number };
  const dRows: C[][] = [];
  let cur: C[] = [];
  let used = 0;
  const pushRow = () => {
    if (cur.length) {
      dRows.push(cur);
      cur = [];
      used = 0;
    }
  };
  for (const f of fields) {
    const s = Math.min(Math.max(f.span ?? 1, 1), DCOLS);
    if (used + s > DCOLS) pushRow();
    cur.push({ field: f, span: s });
    used += s;
  }
  pushRow();
  if (!dRows.length) return [];
  // Pad the last row so the table keeps its divisions throughout.
  const last = dRows[dRows.length - 1];
  let lu = last.reduce((a, c) => a + c.span, 0);
  while (lu < DCOLS) {
    last.push({ field: null, span: 1 });
    lu += 1;
  }

  // Desktop start columns.
  const withDCol: (C & { dCol: number })[] = [];
  for (const row of dRows) {
    let dc = 0;
    for (const c of row) {
      withDCol.push({ ...c, dCol: dc });
      dc += c.span;
    }
  }
  // Independent mobile flow for divider placement.
  let mc = 0;
  const placed: PlacedCell[] = withDCol.map((c) => {
    const ms = Math.min(c.span, mobileCols);
    if (mc + ms > mobileCols) mc = 0;
    const out = { ...c, mCol: mc };
    mc += ms;
    return out;
  });
  // Re-chunk into desktop rows for rendering.
  const rows: PlacedCell[][] = [];
  let i = 0;
  for (const row of dRows) {
    rows.push(placed.slice(i, i + row.length));
    i += row.length;
  }
  return rows;
}

export function FieldTable({ fields, mobileCols = 2 }: { fields: DetailField[]; mobileCols?: number }) {
  const visible = fields.filter((f) => f.value);
  if (!visible.length) return null;
  const rows = layoutTable(visible, mobileCols);
  const gridCls = mobileCols === 2 ? "grid-cols-2 md:grid-cols-4" : "grid-cols-4";
  return (
    <>
      {rows.map((row, ri) => (
        <div key={ri} className={`grid ${gridCls} ${ri > 0 ? "border-t border-line" : ""}`}>
          {row.map((c, ci) => {
            const borderCls = `${c.mCol > 0 ? "border-l" : ""} ${c.dCol > 0 ? "md:border-l" : "md:border-l-0"} border-line`;
            const key = c.field ? c.field.label : `empty-${ci}`;
            return c.field ? (
              <div key={key} className={`flex flex-col bg-white px-3 py-5 text-center ${SPAN_CLS[c.span]} ${borderCls}`}>
                <div className="font-display text-lg font-semibold leading-snug text-ink">{c.field.value}</div>
                <div className="mt-1.5 text-[11px] text-muted">{c.field.label}</div>
              </div>
            ) : (
              <div key={key} aria-hidden="true" className={`${SPAN_CLS[c.span]} ${borderCls}`} />
            );
          })}
        </div>
      ))}
    </>
  );
}

export function DetailBlock({ title, fields }: { title: string; fields: DetailField[] }) {
  const visible = fields.filter((f) => f.value);
  if (!visible.length) return null;
  return (
    <div className="overflow-hidden rounded-2xl bg-white">
      <h2 className="border-b border-line px-6 py-4 font-display text-xl">{title}</h2>
      <FieldTable fields={fields} />
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
        { label: "Full Address", value: text(fullAddress), span: 2 },
        { label: "Directions", value: text(listing.Directions), span: 2 },
        { label: "Community Name", value: text(listing.CityRegion) },
        { label: "Province", value: text(listing.Province) },
        { label: "Postal Code", value: text(listing.PostalCode) },
        { label: "Subdivision", value: text(listing.SubdivisionName) },
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
        { label: "Appliances", value: text(listing.Appliances), span: 3 },
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
