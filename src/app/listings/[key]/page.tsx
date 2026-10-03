import { notFound, redirect, permanentRedirect } from "next/navigation";
import { createMlsClient, listingSlug, resolveCitySlug, citySlug } from "@/lib/mls";

export const dynamic = "force-dynamic";

/** Legacy route — 301s to the canonical /real-estate/{key}/{slug} URL,
 *  preserving any existing backlinks or indexed worker URLs. */
export default async function OldListingRedirect({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const decodedKey = decodeURIComponent(key);
  const mls = createMlsClient();
  const { data } = await mls
    .from("property")
    .select("ListingKey, UnparsedAddress, City")
    .eq("ListingKey", decodedKey)
    .maybeSingle();
  if (!data) {
    const city = await resolveCitySlug(decodedKey);
    if (city) redirect(`/listings/city/${citySlug(city)}`);
    notFound();
  }
  permanentRedirect(`/real-estate/${encodeURIComponent(data.ListingKey)}/${listingSlug(data)}`);
}
