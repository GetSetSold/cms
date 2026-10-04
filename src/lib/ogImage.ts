import { createMlsClient, mediaItems, rawCitiesFor } from "./mls";

/**
 * Social preview image helpers — fetch a single listing thumbnail for
 * Open Graph / Twitter Card meta tags. Each does ONE lightweight query
 * (1 row, 1 column). Results are not cached here; callers should rely on
 * the page-level stats caches where applicable.
 */

/** First listing photo for a neighbourhood (property table, newest first). */
export async function getHoodOgImage(city: string, hood: string): Promise<string | undefined> {
  try {
    const mls = createMlsClient();
    const variants = await rawCitiesFor(city);
    const { data } = await mls
      .from("property")
      .select("Media")
      .in("City", variants)
      .or(`CityRegion.eq.${hood},SubdivisionName.eq.${hood}`)
      .order("OriginalEntryTimestamp", { ascending: false })
      .limit(1)
      .maybeSingle();
    const media = (data as { Media?: unknown } | null)?.Media;
    if (!media) return undefined;
    return mediaItems(media as never)[0]?.MediaURL;
  } catch {
    return undefined;
  }
}

/** First listing thumbnail for a city (grid table, newest first). Grid Media is a single URL. */
export async function getCityOgImage(city: string): Promise<string | undefined> {
  try {
    const mls = createMlsClient();
    const variants = await rawCitiesFor(city);
    const { data } = await mls
      .from("grid")
      .select("Media")
      .in("City", variants)
      .order("OriginalEntryTimestamp", { ascending: false })
      .limit(1)
      .maybeSingle();
    const m = (data as { Media?: unknown } | null)?.Media;
    return typeof m === "string" && m.startsWith("http") ? m : undefined;
  } catch {
    return undefined;
  }
}

/** Any listing thumbnail (for /listings, province hub). */
export async function getAnyOgImage(): Promise<string | undefined> {
  try {
    const mls = createMlsClient();
    const { data } = await mls
      .from("grid")
      .select("Media")
      .order("OriginalEntryTimestamp", { ascending: false })
      .limit(1)
      .maybeSingle();
    const m = (data as { Media?: unknown } | null)?.Media;
    return typeof m === "string" && m.startsWith("http") ? m : undefined;
  } catch {
    return undefined;
  }
}

/** Build the openGraph + twitter metadata snippet for a preview image. */
export function ogImageMeta(image: string | undefined, title: string, description: string) {
  if (!image) return {};
  return {
    openGraph: {
      title,
      description,
      images: [{ url: image }],
    },
    twitter: {
      card: "summary_large_image" as const,
      title,
      description,
      images: [image],
    },
  };
}
