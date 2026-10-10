import { NextRequest, NextResponse } from "next/server";
import { parseNaturalSearch } from "@/lib/nlpSearch";

/**
 * Prototype: parse natural language search to filter params.
 * GET /api/nlp-search?q=3+bed+detached+in+Hamilton+under+700k
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "";
  if (!q.trim()) {
    return NextResponse.json({ error: "Missing ?q= parameter" }, { status: 400 });
  }
  const result = parseNaturalSearch(q);
  return NextResponse.json({ query: q, ...result });
}
