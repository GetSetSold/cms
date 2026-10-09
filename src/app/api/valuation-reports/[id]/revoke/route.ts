import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/valuation-reports/[id]/revoke — revoke a share link (authenticated API,
 * same concept as form_shares revoke: client-side delete could fail silently under RLS).
 */

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { supabase } = await requireStaff(["admin", "editor", "sales"]);
  const { id } = await params;
  const { error } = await supabase
    .from("valuation_reports")
    .update({ share_revoked: true, share_token: null })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
