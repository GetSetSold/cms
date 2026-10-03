import { notFound, permanentRedirect } from "next/navigation";
import { createMlsClient, listingSlug } from "@/lib/mls";

export const dynamic = "force-dynamic";

/** /real-estate/{key} without a slug — 301s to the canonical slugged URL. */
export default async function RealEstateKeyRedirect({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const decodedKey = decodeURIComponent(key);
  const mls = createMlsClient();
  const { data } = await mls
    .from("property")
    .select("ListingKey, UnparsedAddress, City")
    .eq("ListingKey", decodedKey)
    .maybeSingle();
  if (!data) notFound();
  permanentRedirect(`/real-estate/${encodeURIComponent(data.ListingKey)}/${listingSlug(data)}`);
}
