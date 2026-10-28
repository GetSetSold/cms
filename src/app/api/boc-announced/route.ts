import { NextResponse } from "next/server";
import { fetchAnnouncedDecision } from "@/lib/boc-announced";

/**
 * GET /api/boc-announced — latest announced BoC decision (announcement
 * date, target, change, effective date) from the Bank's key-rate page.
 * Public, no auth: the underlying data is public. Returns 502 when the
 * Bank's page cannot be read or parsed; clients then fall back to Valet.
 */
export async function GET() {
  const decision = await fetchAnnouncedDecision();
  if (!decision) {
    return NextResponse.json({ error: "Announced decision unavailable." }, { status: 502 });
  }
  return NextResponse.json(decision, {
    headers: { "Cache-Control": "public, max-age=300" },
  });
}
