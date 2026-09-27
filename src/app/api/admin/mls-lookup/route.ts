import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { createMlsClient } from "@/lib/mls";

export async function GET(req: Request) {
  try { await requireStaff(["admin", "editor"]); }
  catch { return NextResponse.json({ error: "Not authorized." }, { status: 401 }); }

  const key = new URL(req.url).searchParams.get("key")?.trim();
  if (!key) return NextResponse.json({ error: "Missing MLS #." }, { status: 400 });

  const mls = createMlsClient();
  const { data, error } = await mls.from("grid").select("ListingKey,UnparsedAddress,City,ListPrice,Media").eq("ListingKey", key).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "No listing found with that MLS #. Double-check the number." }, { status: 404 });
  return NextResponse.json({ listing: data });
}
