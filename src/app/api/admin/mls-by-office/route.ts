import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { createMlsClient } from "@/lib/mls";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try { await requireStaff(["admin", "editor"]); }
  catch { return NextResponse.json({ error: "Not authorized." }, { status: 401 }); }

  const officeKey = new URL(req.url).searchParams.get("office")?.trim();
  if (!officeKey) return NextResponse.json({ error: "Missing office key." }, { status: 400 });

  // Remembered for next time — same "set once" convenience as everywhere else in Settings.
  const supabase = await createClient();
  await supabase.from("site_settings").update({ mls_office_key: officeKey }).eq("id", 1);

  const mls = createMlsClient();
  const { data, error } = await mls.from("grid").select("ListingKey,UnparsedAddress,City,ListPrice,Media").eq("ListOfficeKey", officeKey);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data?.length) return NextResponse.json({ error: "No listings found for that office key. Double-check it against a real listing's ListOfficeKey field." }, { status: 404 });
  return NextResponse.json({ listings: data });
}
