import { cache } from "react";
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

export function citySlug(city: string) {
  return city.toLowerCase().trim().replace(/\s+/g, "-");
}

/** Slugify free-text (addresses, cities) for URLs: NFD-normalize to strip
 *  diacritics, lowercase, collapse runs of non-alphanumerics to hyphens. */
export function slugifyAddress(...parts: (string | null | undefined)[]): string {
  const raw = parts.filter(Boolean).join(" ");
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Canonical address slug for a listing URL, e.g. "100 Lillian Way" +
 *  "Haldimand" -> "100-lillian-way-haldimand". */
export function listingSlug(l: Pick<GridListing, "UnparsedAddress" | "City">): string {
  return slugifyAddress(l.UnparsedAddress, l.City);
}

/** The full distinct-city list, fetched once per request no matter how many
 *  times it's called (React's cache() memoizes by arguments for the
 *  lifetime of a single render pass) — resolveCitySlug and the city search
 *  dropdown both need this, and previously each ran its own separate query. */
export const listCities = cache(async (): Promise<string[]> => {
  const mls = createMlsClient();
  const { data } = await mls.from("distinct_cities").select("City").limit(5000);
  return (data ?? []).map((r) => r.City as string);
});

/** The DDF feed concatenates district info into City ("Toronto (Waterfront
 *  Communities)"). Strip the trailing parenthetical to get the real city.
 *  "Toronto (Waterfront Communities)" -> "Toronto". */
export function normalizeCity(city: string): string {
  const cleaned = city.replace(/\s*\([^)]*\)\s*$/, "").trim();
  return cleaned || city.trim();
}

/** Normalized city -> raw City variants stored in the DB. Cached per request.
 *  This is what merges "Toronto", "Toronto (Mimico)", ... into one hub. */
export const getCityMapping = cache(async (): Promise<Map<string, string[]>> => {
  const raw = await listCities();
  const map = new Map<string, string[]>();
  for (const c of raw) {
    const n = normalizeCity(c);
    if (!n) continue;
    const arr = map.get(n);
    if (arr) arr.push(c);
    else map.set(n, [c]);
  }
  return map;
});

/** Sorted list of NORMALIZED city names (for dropdowns, sitemap). */
export async function listNormalizedCities(): Promise<string[]> {
  const map = await getCityMapping();
  return [...map.keys()].sort((a, b) => a.localeCompare(b));
}

/** DDF City values are free text, not a fixed list — resolve a URL slug back
 *  to the NORMALIZED city name. Reads from the `distinct_cities` view (create
 *  it once in the MLS project — see README) rather than sampling raw `grid`
 *  rows, which could miss cities entirely depending on row order. */
export async function resolveCitySlug(slug: string): Promise<string | null> {
  const map = await getCityMapping();
  const lower = slug.toLowerCase();
  for (const normalized of map.keys()) {
    if (citySlug(normalized) === lower) return normalized;
  }
  return null;
}

/** Resolve a city NAME (user input, any casing, raw or normalized) to the
 *  normalized city name. */
export async function resolveCityName(name: string): Promise<string | null> {
  const map = await getCityMapping();
  const lower = name.toLowerCase().trim();
  for (const [normalized, variants] of map) {
    if (normalized.toLowerCase() === lower) return normalized;
    if (variants.some((v) => v.toLowerCase() === lower)) return normalized;
  }
  return null;
}

/** Raw City values for a normalized city, for `.in("City", ...)` queries. */
export async function rawCitiesFor(normalized: string): Promise<string[]> {
  const map = await getCityMapping();
  return map.get(normalized) ?? [normalized];
}

/** Find a RAW city whose slug matches — used to 301 old parenthetical URLs
 *  (e.g. /toronto-(mimico)-real-estate) to the normalized hub. */
export async function findRawCityBySlug(slug: string): Promise<string | null> {
  const raw = await listCities();
  const lower = slug.toLowerCase();
  for (const c of raw) {
    if (citySlug(c) === lower) return c;
  }
  return null;
}

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
