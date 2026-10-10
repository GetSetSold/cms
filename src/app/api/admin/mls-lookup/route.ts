import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { createMlsClient } from "@/lib/mls";

export async function GET(req: Request) {
  try { await requireStaff(["admin", "editor"]); }
  catch { return NextResponse.json({ error: "Not authorized." }, { status: 401 }); }

  const key = new URL(req.url).searchParams.get("key")?.trim();
  if (!key) return NextResponse.json({ error: "Missing MLS #." }, { status: 400 });

  const mls = createMlsClient();
  // Accept a real MLS# (ListingId) or a raw ListingKey.
  type LookupRow = { ListingKey: string; UnparsedAddress: string | null; City: string | null; ListPrice: number | null; Media: unknown };
  let listing: LookupRow | null = null;
  const { data: byId } = await mls.from("property")
    .select("ListingKey,UnparsedAddress,City,ListPrice,Media").eq("ListingId", key).maybeSingle();
  if (byId) {
    listing = byId as unknown as LookupRow;
  } else {
    const { data: byKey, error } = await mls.from("grid")
      .select("ListingKey,UnparsedAddress,City,ListPrice,Media").eq("ListingKey", key).maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    listing = (byKey as unknown as LookupRow | null);
  }
  if (!listing) return NextResponse.json({ error: "No listing found with that MLS #. Double-check the number." }, { status: 404 });
  const media = listing.Media;
  const image = Array.isArray(media)
    ? (media.find((m: { PreferredPhotoYN?: boolean; MediaURL?: string }) => m.PreferredPhotoYN)?.MediaURL
      ?? (media[0] as { MediaURL?: string } | undefined)?.MediaURL ?? null)
    : (media as string | null);
  return NextResponse.json({ listing: { ...listing, Media: image } });
}
