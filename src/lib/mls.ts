import { createClient } from "@supabase/supabase-js";

// Separate, read-only project: DDF/CREA listings live here, not in the CMS database.
export function createMlsClient() {
  return createClient(
    process.env.NEXT_PUBLIC_MLS_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_MLS_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
}

export interface GridListing {
  ListingKey: string;
  OfficeName: string | null;
  ListPrice: number | null;
  TotalActualRent: number | null;
  PhotosCount: number | null;
  Media: string | null; // single thumbnail URL
  UnparsedAddress: string | null;
  City: string | null;
  Province: string | null;
  PostalCode: string | null;
  Latitude: number | null;
  Longitude: number | null;
  ParkingTotal: number | null;
  BathroomsTotalInteger: number | null;
  BedroomsTotal: number | null;
  AboveGradeFinishedArea: number | null;
  StructureTypeText: string | null;
}

export interface MediaItem {
  MediaURL: string;
  Caption?: string;
  PreferredPhotoYN?: boolean;
}

export interface PropertyListing extends Omit<GridListing, "Media"> {
  PublicRemarks: string | null;
  YearBuilt: number | null;
  Media: MediaItem[] | string | null; // full array here, unlike grid's single URL
  Rooms: unknown;
  StructureType: string[] | string | null;
  PropertySubType: string | null;
  OriginalEntryTimestamp: string | null;
  Heating: string | null;
  Cooling: string | null;
  Basement: string | null;
}

export const isSale = (l: Pick<GridListing, "ListPrice">) => l.ListPrice != null;

export function priceDisplay(l: Pick<GridListing, "ListPrice" | "TotalActualRent">) {
  if (isSale(l)) return l.ListPrice ? `$${Number(l.ListPrice).toLocaleString("en-CA")}` : "Price on request";
  if (l.TotalActualRent) return `$${Number(l.TotalActualRent).toLocaleString("en-CA")}/mo`;
  return "Price on request";
}

/** Real DDF Media items use PreferredPhotoYN, not an order field. */
export function mediaItems(media: PropertyListing["Media"]): MediaItem[] {
  let arr: unknown = media;
  if (typeof media === "string") {
    try { arr = JSON.parse(media); } catch { return media.startsWith("http") ? [{ MediaURL: media }] : []; }
  }
  if (!Array.isArray(arr)) return [];
  const items = (arr as MediaItem[]).filter((m) => m?.MediaURL);
  const preferredIdx = items.findIndex((m) => m.PreferredPhotoYN);
  if (preferredIdx > 0) {
    const [preferred] = items.splice(preferredIdx, 1);
    items.unshift(preferred);
  }
  return items;
}

export function displayValue(value: unknown): string {
  if (Array.isArray(value)) return value.filter(Boolean).join(", ");
  if (typeof value === "string" && value.startsWith("[") && value.endsWith("]")) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter(Boolean).join(", ");
    } catch { /* not JSON */ }
  }
  return value == null ? "" : String(value);
}

export function daysOnMarket(timestamp: string | null) {
  if (!timestamp) return null;
  const entry = new Date(timestamp).getTime();
  if (Number.isNaN(entry)) return null;
  return Math.max(0, Math.floor((Date.now() - entry) / 86_400_000));
}
