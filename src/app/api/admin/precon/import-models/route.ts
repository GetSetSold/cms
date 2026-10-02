import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import {
  validatePublicUrl, fetchHtml, extractModel, tableModels, modelLinks, type ModelDraft,
} from "@/lib/precon-import";

// POST { url } -> { models: ModelDraft[], meta }
// Each model maps 1:1 onto home_models columns (+ source_url reference, stripped before insert).
export async function POST(req: Request) {
  try { await requireStaff(["admin", "editor"]); }
  catch { return NextResponse.json({ error: "Not authorized." }, { status: 401 }); }
  const body = await req.json().catch(() => null);
  const url = validatePublicUrl(body?.url ?? "");
  if (!url) return NextResponse.json({ error: "Enter a valid public http(s) URL." }, { status: 400 });

  const html = await fetchHtml(url.toString(), 15000);
  if (!html) return NextResponse.json({ error: "Could not fetch a readable HTML page from that URL." }, { status: 502 });

  const notes: string[] = [];

  // Single-model mode: the URL itself is a model detail page — extract it directly.
  if (body?.single === true) {
    const one = extractModel(html, url);
    return NextResponse.json({
      models: one ? [one] : [],
      meta: { source_url: url.toString(), notes: one ? ["single model page"] : ["no model details detected on this page"] },
    });
  }

  let models: ModelDraft[] = tableModels(html, url);
  notes.push(`spec-table scan: ${models.length} model(s)`);

  if (!models.length) {
    const links = modelLinks(html, url);
    notes.push(`${links.length} model page(s) found`);
    const found: ModelDraft[] = [];
    for (let i = 0; i < links.length; i += 4) {
      const batch = await Promise.all(
        links.slice(i, i + 4).map(async (l) => {
          const h = await fetchHtml(l);
          return h ? extractModel(h, new URL(l)) : null;
        }),
      );
      batch.forEach((b) => { if (b?.model_name) found.push(b); });
    }
    const seen = new Set<string>();
    models = found.filter((m) => {
      const k = m.model_name.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  return NextResponse.json({ models, meta: { source_url: url.toString(), notes } });
}
