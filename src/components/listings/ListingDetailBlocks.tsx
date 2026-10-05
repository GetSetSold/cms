import { displayValue, roomItems, roomDimensions, type PropertyListing } from "@/lib/mls";

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

type PlacedCell = {
  field: DetailField | null;
  span: number;
  dCol: number;
  dRow: number;
  mCol: number;
  mRow: number;
  /** Fills a gap in a mobile visual row; hidden on desktop. */
  mobileOnly?: boolean;
};

/**
 * Places fields on a flat grid: desktop flows in 4 columns honoring `span`,
 * mobile flows independently (2 columns, spans clamped). The last desktop
 * row is padded with empty cells so every row keeps the same table
 * divisions — like a basic HTML table — and incomplete mobile visual rows
 * are filled with empty cells (hidden on desktop) so dividers never dangle.
 * Each cell records its starting column and row index at both breakpoints
 * so dividers land correctly.
 */
function layoutTable(fields: DetailField[], mobileCols = 2): PlacedCell[] {
  const DCOLS = 4;
  const dPlaced: { field: DetailField | null; span: number; dCol: number; dRow: number }[] = [];
  let dRow = 0;
  let dUsed = 0;
  const pushD = (field: DetailField | null, span: number) => {
    const s = Math.min(Math.max(span, 1), DCOLS);
    if (dUsed + s > DCOLS) {
      dRow += 1;
      dUsed = 0;
    }
    dPlaced.push({ field, span: s, dCol: dUsed, dRow });
    dUsed += s;
  };
  for (const f of fields) pushD(f, f.span ?? 1);
  while (dPlaced.length && dUsed < DCOLS) pushD(null, 1);

  const placed: PlacedCell[] = [];
  let mRow = 0;
  let mUsed = 0;
  const gapFill = () => {
    while (mUsed < mobileCols) {
      placed.push({ field: null, span: 1, dCol: -1, dRow: -1, mCol: mUsed, mRow, mobileOnly: true });
      mUsed += 1;
    }
  };
  for (const c of dPlaced) {
    const ms = Math.min(c.span, mobileCols);
    if (mUsed + ms > mobileCols) {
      gapFill();
      mRow += 1;
      mUsed = 0;
    }
    placed.push({ ...c, mCol: mUsed, mRow });
    mUsed += ms;
  }
  if (mUsed > 0 && mUsed < mobileCols) gapFill();
  return placed;
}

export function FieldTable({
  fields,
  mobileCols = 2,
  variant = "detail",
}: {
  fields: DetailField[];
  mobileCols?: number;
  variant?: "detail" | "stats";
}) {
  const visible = fields.filter((f) => f.value);
  if (!visible.length) return null;
  const cells = layoutTable(visible, mobileCols);
  const gridCls = mobileCols === 2 ? "grid-cols-2 md:grid-cols-4" : "grid-cols-4";
  const stats = variant === "stats";
  return (
    <div className={`grid ${gridCls}`}>
      {cells.map((c, i) => {
        const vCls = c.mobileOnly ? "border-l" : `${c.mCol > 0 ? "border-l" : ""} ${c.dCol > 0 ? "md:border-l" : "md:border-l-0"}`;
        const hCls = c.mobileOnly ? "border-t" : `${c.mRow > 0 ? "border-t" : ""} ${c.dRow > 0 ? "md:border-t" : "md:border-t-0"}`;
        const cls = `border-line ${vCls} ${hCls} ${SPAN_CLS[c.span]}${c.mobileOnly ? " md:hidden" : ""}`;
        const key = c.field ? c.field.label : `empty-${i}`;
        return c.field ? (
          stats ? (
            <div key={key} className={`flex flex-col items-center gap-1 bg-white px-2 py-5 text-center ${cls}`}>
              <div className="font-display text-[0.9rem] font-semibold leading-snug text-ink">{c.field.value}</div>
              <div className="text-[11px] font-semibold text-muted">{c.field.label}</div>
            </div>
          ) : (
            <div key={key} className={`flex flex-col bg-white px-3 py-5 text-left ${cls}`}>
              <div className="text-[11px] font-semibold text-muted">{c.field.label}</div>
              <div className="mt-1 break-words font-display text-[0.9rem] font-semibold leading-snug text-ink">{c.field.value}</div>
            </div>
          )
        ) : (
          <div key={key} aria-hidden="true" className={cls} />
        );
      })}
    </div>
  );
}

export function DetailBlock({ title, fields }: { title: string; fields: DetailField[] }) {
  const visible = fields.filter((f) => f.value);
  if (!visible.length) return null;
  return (
    <div className="overflow-hidden rounded-2xl bg-white">
      <h2 className="border-b border-line px-6 py-4 font-display !text-left text-[1.0rem]">{title}</h2>
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

export function RoomsBlock({ listing }: { listing: PropertyListing }) {
  const rooms = roomItems(listing.Rooms);
  if (!rooms.length) return null;
  return (
    <div className="overflow-hidden rounded-2xl bg-white">
      <h2 className="border-b border-line px-6 py-4 font-display !text-left text-[1.0rem]">Rooms</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-line">
              <th className="px-4 py-3 text-[11px] font-semibold text-muted md:px-6">Room</th>
              <th className="border-l border-line px-3 py-3 text-[11px] font-semibold text-muted">Level</th>
              <th className="border-l border-line px-4 py-3 text-[11px] font-semibold text-muted md:px-6">Dimensions</th>
            </tr>
          </thead>
          <tbody>
            {rooms.map((r, i) => (
              <tr key={i} className={i > 0 ? "border-t border-line" : ""}>
                <td className="px-4 py-4 text-[0.9rem] font-medium text-ink md:px-6">{r.RoomType || "—"}</td>
                <td className="border-l border-line px-3 py-4 text-[0.9rem] text-ink">{r.RoomLevel || "—"}</td>
                <td className="border-l border-line px-4 py-4 text-[0.9rem] text-ink md:px-6">{roomDimensions(r) || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function MapDirections({ listing }: { listing: PropertyListing }) {
  const lat = Number(listing.Latitude);
  const lng = Number(listing.Longitude);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0);
  const directions = text(listing.Directions);
  if (!hasCoords && !directions) return null;
  const address = [listing.UnparsedAddress, listing.City, listing.Province, listing.PostalCode]
    .filter((p) => p && String(p).trim())
    .join(", ");
  const dest = hasCoords ? `${lat},${lng}` : encodeURIComponent(address);
  return (
    <div className="overflow-hidden rounded-2xl bg-white">
      <h2 className="border-b border-line px-6 py-4 font-display !text-left text-[1.0rem]">Map & Directions</h2>
      {hasCoords ? (
        <iframe
          title={`Map of ${listing.UnparsedAddress ?? "this listing"}`}
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.02}%2C${lat - 0.012}%2C${lng + 0.02}%2C${lat + 0.012}&layer=mapnik&marker=${lat}%2C${lng}`}
          className="h-72 w-full border-0"
          loading="lazy"
        />
      ) : null}
      <div className="flex flex-col items-start gap-3 px-6 py-5">
        {directions ? <p className="text-[0.9rem] leading-relaxed text-ink">{directions}</p> : null}
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${dest}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-[12px] font-semibold text-white"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polygon points="3 11 22 2 13 21 11 13 3 11" />
          </svg>
          Get Directions
        </a>
      </div>
    </div>
  );
}
