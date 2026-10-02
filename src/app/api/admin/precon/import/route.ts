import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";

function isBlockedHost(host: string) {
  const h = host.toLowerCase().replace(/^\[/, "").replace(/\]$/, "");
  if (h === "localhost" || h.endsWith(".localhost") || h === "::1") return true;
  return /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.0\.0\.0)/.test(h);
}

function allMetas(html: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /<meta\s+([^>]*?)>/gi;
  let m: RegExpExecArray | null;
  const get = (attrs: string, n: string) => {
    const x = attrs.match(new RegExp(n + '\\s*=\\s*["\']([^"\']*)["\']', "i"));
    return x ? x[1] : null;
  };
  while ((m = re.exec(html))) {
    const key = get(m[1], "property") || get(m[1], "name");
    const content = get(m[1], "content");
    if (key && content && !out[key.toLowerCase()]) out[key.toLowerCase()] = content.trim();
  }
  return out;
}

function stripTags(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");
}

function cleanName(raw: string) {
  return raw.split(/\s[|｜–—-]\s/)[0].replace(/\s*[-–—|]\s*(homes|condos|towns|townhomes).*$/i, "").trim();
}

function absolutize(src: string, base: URL) {
  try { return new URL(src, base).toString(); } catch { return src; }
}

// POST { url } -> { draft, meta } — draft only contains real projects-table columns.
export async function POST(req: Request) {
  try { await requireStaff(["admin", "editor"]); }
  catch { return NextResponse.json({ error: "Not authorized." }, { status: 401 }); }
  const body = await req.json().catch(() => null);
  const rawUrl: string = body?.url?.trim() ?? "";
  let url: URL;
  try {
    url = new URL(rawUrl);
    if (!/^https?:$/.test(url.protocol)) throw new Error("bad protocol");
    if (isBlockedHost(url.hostname)) throw new Error("blocked host");
  } catch {
    return NextResponse.json({ error: "Enter a valid public http(s) URL." }, { status: 400 });
  }

  let html: string;
  try {
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36", "Accept": "text/html" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return NextResponse.json({ error: `Page returned HTTP ${res.status}.` }, { status: 502 });
    const ct = res.headers.get("content-type") ?? "";
    if (!/html/i.test(ct)) return NextResponse.json({ error: "URL did not return an HTML page." }, { status: 502 });
    html = await res.text();
  } catch (e: any) {
    return NextResponse.json({ error: e?.name === "TimeoutError" ? "Timed out fetching the page." : "Could not fetch the page." }, { status: 502 });
  }

  const metas = allMetas(html);
  const titleTag = (html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? "").trim();
  const text = stripTags(html);
  const notes: string[] = [];

  // Project name
  let projectName = metas["og:title"] || titleTag;
  if (projectName) { projectName = cleanName(projectName); notes.push(`name: "${projectName}"`); }

  // Description
  const description = metas["og:description"] || metas["description"] || null;
  if (description) notes.push("description found");

  // Main image
  let mainImage = metas["og:image"] || null;
  if (mainImage) { mainImage = absolutize(mainImage, url); notes.push("main image found"); }

  // Starting price — anchored to "from / starting at" phrasing to avoid nav/footer prices
  let price: string | null = null;
  const pm = text.match(/(?:starting\s+(?:from|at)|prices?\s+from|from)\s*:?\s*\$\s*([\d,]+(?:\.\d+)?)/i);
  if (pm) { price = "$" + pm[1]; notes.push(`price: ${price}`); }

  // Status keywords
  let status: string | null = null;
  if (/sold\s*out/i.test(text)) status = "Sold out";
  else if (/now\s+selling/i.test(text)) status = "Selling";
  else if (/coming\s+soon/i.test(text)) status = "Coming soon";
  else if (/register/i.test(text)) status = "Registering";
  if (status) notes.push(`status: ${status}`);

  // City via JSON-LD address
  let city: string | null = null;
  const ldRe = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let ldm: RegExpExecArray | null;
  while ((ldm = ldRe.exec(html)) && !city) {
    try {
      const parsed = JSON.parse(ldm[1]);
      const graphs = Array.isArray(parsed) ? parsed : [parsed];
      for (const g of graphs) {
        const addr = g?.address;
        const loc = addr?.addressLocality || (typeof addr === "string" ? addr : null);
        if (loc && typeof loc === "string") { city = loc.trim(); break; }
      }
    } catch { /* ignore bad JSON-LD */ }
  }
  if (city) notes.push(`city: ${city}`);

  const builderGuess = metas["og:site_name"] || null;
  if (builderGuess) notes.push(`site: ${builderGuess}`);

  const draft: Record<string, string | null> = {
    project_name: projectName || "",
    city,
    p_start_price: price,
    project_status: status,
    project_description: description,
    main_image_url: mainImage,
  };

  return NextResponse.json({
    draft,
    meta: { source_url: url.toString(), builder_guess: builderGuess, notes },
  });
}
