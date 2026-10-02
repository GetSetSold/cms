import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { validatePublicUrl, fetchHtml, extractProject, allMetas } from "@/lib/precon-import";

// POST { url } -> { draft, meta } — draft only contains real projects-table columns.
export async function POST(req: Request) {
  try { await requireStaff(["admin", "editor"]); }
  catch { return NextResponse.json({ error: "Not authorized." }, { status: 401 }); }
  const body = await req.json().catch(() => null);
  const url = validatePublicUrl(body?.url ?? "");
  if (!url) return NextResponse.json({ error: "Enter a valid public http(s) URL." }, { status: 400 });

  const html = await fetchHtml(url.toString(), 15000);
  if (!html) return NextResponse.json({ error: "Could not fetch a readable HTML page from that URL." }, { status: 502 });

  const { draft, notes } = extractProject(html, url);
  const builderGuess = allMetas(html)["og:site_name"] || null;
  if (builderGuess) notes.push(`site: ${builderGuess}`);

  return NextResponse.json({ draft, meta: { source_url: url.toString(), builder_guess: builderGuess, notes } });
}
