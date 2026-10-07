import { NextRequest, NextResponse } from "next/server";
import { getSettings } from "@/lib/cms";

/**
 * GET /api/geocode?q=...            → address autocomplete suggestions
 * GET /api/geocode?placeId=...      → Google Place Details → full feature
 *
 * Proxies geocoding so API keys (Cloudflare Secrets MAPTILER_API_KEY /
 * GOOGLE_PLACES_API_KEY) never reach the browser. The provider is chosen in
 * Admin → Settings → Home valuation ("Address provider"); a missing key for
 * the selected provider falls back to the other one automatically.
 */

interface Feature {
  label: string;
  detail?: string;
  lat: number | null;
  lng: number | null;
  city: string;
  isAddress: boolean;
  placeId?: string;
}

// Short-lived provider cache: one settings read per minute, not per keystroke.
let providerCache: { at: number; provider: "maptiler" | "google" } | null = null;
async function getProvider(): Promise<"maptiler" | "google"> {
  if (providerCache && Date.now() - providerCache.at < 60_000) return providerCache.provider;
  try {
    const s = await getSettings();
    const p = (s as any).home_evaluation?.geocode_provider === "google" ? "google" : "maptiler";
    providerCache = { at: Date.now(), provider: p };
    return p;
  } catch {
    return "maptiler";
  }
}

async function maptilerSearch(q: string, key: string): Promise<Feature[]> {
  // Ontario bounding box: lng -95.2..-74.3, lat 41.6..56.9
  // No `types` restriction: MapTiler's address index misses some house numbers,
  // so we accept all result types and rank true numbered addresses first.
  const url =
    `https://api.maptiler.com/geocoding/${encodeURIComponent(q)}.json` +
    `?key=${encodeURIComponent(key)}&country=ca&bbox=-95.2%2C41.6%2C-74.3%2C56.9&limit=8&autocomplete=true&fuzzyMatch=true`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Address search failed.");
  const data = await res.json();
  return (data.features ?? [])
    .map((f: any) => {
      const [lng, lat] = f.geometry?.coordinates ?? [];
      const ctx: any[] = Array.isArray(f.context) ? f.context : [];
      const city =
        ctx.find((c) => c.id?.startsWith("municipality"))?.text ??
        ctx.find((c) => c.id?.startsWith("locality"))?.text ??
        f.place_name?.split(",").slice(-3, -2)[0]?.trim() ??
        "";
      const placeTypes: string[] = Array.isArray(f.place_type) ? f.place_type : [];
      return {
        label: f.place_name ?? f.text ?? "",
        detail: [f.text, city].filter(Boolean).join(" — ") || undefined,
        lat: typeof lat === "number" ? lat : null,
        lng: typeof lng === "number" ? lng : null,
        city,
        isAddress: placeTypes.includes("address"),
      } as Feature;
    })
    .filter((f: Feature) => typeof f.lat === "number" && typeof f.lng === "number")
    .sort((a: Feature, b: Feature) => Number(b.isAddress) - Number(a.isAddress))
    .slice(0, 6);
}

async function googleAutocomplete(q: string, key: string): Promise<Feature[]> {
  const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key },
    body: JSON.stringify({
      input: q,
      includedRegionCodes: ["CA"],
      languageCode: "en",
      locationBias: {
        rectangle: {
          low: { latitude: 41.6, longitude: -95.2 },
          high: { latitude: 56.9, longitude: -74.3 },
        },
      },
    }),
  });
  if (!res.ok) throw new Error("Address search failed.");
  const data = await res.json();
  return ((data.suggestions ?? []) as any[])
    .map((s: any) => s.placePrediction)
    .filter(Boolean)
    .map((p: any) => ({
      label: p.text?.text ?? "",
      detail: p.structuredFormat?.secondaryText?.text || undefined,
      lat: null,
      lng: null,
      city: "",
      // True address-ness is resolved at Place Details time (street_number check).
      isAddress: false,
      placeId: p.placeId ?? String(p.place ?? "").replace(/^places\//, ""),
    }) as Feature)
    .filter((f: Feature) => f.label && f.placeId)
    .slice(0, 6);
}

async function googleDetails(placeId: string, key: string): Promise<Feature> {
  const res = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?fields=formattedAddress,addressComponents,location,types`,
    { headers: { "X-Goog-Api-Key": key } }
  );
  if (!res.ok) throw new Error("Could not locate that address.");
  const p = await res.json();
  const comps: any[] = Array.isArray(p.addressComponents) ? p.addressComponents : [];
  const hasType = (t: string) => comps.some((c) => (c.types ?? []).includes(t));
  const city =
    comps.find((c) => (c.types ?? []).includes("locality"))?.longText ??
    comps.find((c) => (c.types ?? []).includes("administrative_area_level_3"))?.longText ??
    "";
  const main = p.structuredFormat?.mainText?.text ?? p.formattedAddress?.split(",")[0] ?? "";
  return {
    label: p.formattedAddress ?? "",
    detail: [main, city].filter(Boolean).join(" — ") || undefined,
    lat: typeof p.location?.latitude === "number" ? p.location.latitude : null,
    lng: typeof p.location?.longitude === "number" ? p.location.longitude : null,
    city,
    isAddress: hasType("street_number"),
    placeId,
  };
}

export async function GET(req: NextRequest) {
  const googleKey = process.env.GOOGLE_PLACES_API_KEY;
  const maptilerKey = process.env.MAPTILER_API_KEY;

  // Place Details (Google only — MapTiler suggestions already carry geometry).
  const placeId = (req.nextUrl.searchParams.get("placeId") ?? "").trim();
  if (placeId) {
    if (!googleKey) {
      return NextResponse.json({ error: "Address details are not configured." }, { status: 503 });
    }
    try {
      const feature = await googleDetails(placeId, googleKey);
      if (feature.lat == null || feature.lng == null) {
        return NextResponse.json({ error: "Could not locate that address." }, { status: 502 });
      }
      return NextResponse.json({ feature });
    } catch (e: any) {
      return NextResponse.json({ error: e.message ?? "Address search failed." }, { status: 502 });
    }
  }

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 3) return NextResponse.json({ features: [] });

  const provider = await getProvider();
  const useGoogle = provider === "google" && !!googleKey;

  try {
    const features = useGoogle
      ? await googleAutocomplete(q, googleKey!)
      : maptilerKey
        ? await maptilerSearch(q, maptilerKey)
        : [];
    if (!features.length && !maptilerKey && !googleKey) {
      return NextResponse.json(
        { error: "Address search is not configured yet. Add the MAPTILER_API_KEY or GOOGLE_PLACES_API_KEY secret." },
        { status: 503 }
      );
    }
    return NextResponse.json({ features, provider: useGoogle ? "google" : "maptiler" });
  } catch (e: any) {
    // If Google fails, fall back to MapTiler rather than breaking the picker.
    if (useGoogle && maptilerKey) {
      try {
        return NextResponse.json({ features: await maptilerSearch(q, maptilerKey), provider: "maptiler" });
      } catch { /* fall through */ }
    }
    return NextResponse.json({ error: "Address search failed. Please try again." }, { status: 502 });
  }
}
