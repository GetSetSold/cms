import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { createPreconServiceClient } from "@/lib/precon";

const ALLOWED = ["images", "image_assignments", "floorplans", "payment_plans", "payment_installments"];

// Returns the column names of a pre-con table (from one sample row). Used by
// the gallery manager to render a raw-data form without hardcoding the schema.
export async function GET(req: Request) {
  try { await requireStaff(["admin", "editor"]); }
  catch { return NextResponse.json({ error: "Not authorized." }, { status: 401 }); }
  const table = new URL(req.url).searchParams.get("table");
  if (!table || !ALLOWED.includes(table)) return NextResponse.json({ error: "Unknown table." }, { status: 400 });
  const supabase = createPreconServiceClient();
  const { data, error } = await supabase.from(table).select("*").limit(1);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const row = (data ?? [])[0] as Record<string, unknown> | undefined;
  return NextResponse.json({ columns: row ? Object.keys(row) : [] });
}
