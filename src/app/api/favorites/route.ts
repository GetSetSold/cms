import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Toggle a favorite listing (heart).
 * POST /api/favorites { listingKey }
 * DELETE /api/favorites?key=...
 * GET /api/favorites — list user's favorites
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const { listingKey } = await req.json();
  if (!listingKey) return NextResponse.json({ error: "listingKey required" }, { status: 400 });

  const { error } = await supabase.from("favorite_listings").upsert(
    { user_id: user.id, listing_key: listingKey },
    { onConflict: "user_id,listing_key" }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, favorited: true });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const key = req.nextUrl.searchParams.get("key");
  if (!key) return NextResponse.json({ error: "key required" }, { status: 400 });

  await supabase.from("favorite_listings").delete().eq("user_id", user.id).eq("listing_key", key);
  return NextResponse.json({ ok: true, favorited: false });
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const { data } = await supabase
    .from("favorite_listings")
    .select("listing_key, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ favorites: data ?? [] });
}
