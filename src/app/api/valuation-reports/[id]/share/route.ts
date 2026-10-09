import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";

/**
 * POST /api/valuation-reports/[id]/share — create or refresh a share link.
 * Body: { expires_in_days?: number } (default 7, 0 = never expires)
 * Same concept as form_shares: token link, revocable, view-counted.
 */

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { supabase } = await requireStaff(["admin", "editor", "sales"]);
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const days = Number(body.expires_in_days ?? 7);

  const token = randomBytes(12).toString("base64url");
  const expires_at = days > 0 ? new Date(Date.now() + days * 86400000).toISOString() : null;

  const { error } = await supabase
    .from("valuation_reports")
    .update({ share_token: token, share_expires_at: expires_at, share_revoked: false })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  return NextResponse.json({ ok: true, token, url: `${base}/shared/valuation/${token}`, expires_at });
}
