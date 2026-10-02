// Shared HTML extraction helpers for the pre-con importers (project + model scans).
// Everything returned here maps 1:1 onto real DB columns — no invented fields.

export function isBlockedHost(host: string) {
  const h = host.toLowerCase().replace(/^\[/, "").replace(/\]$/, "");
  if (h === "localhost" || h.endsWith(".localhost") || h === "::1") return true;
  return /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.0\.0\.0)/.test(h);
}

export function validatePublicUrl(raw: string): URL | null {
  try {
    const url = new URL(raw.trim());
    if (!/^https?:$/.test(url.protocol)) return null;
    if (isBlockedHost(url.hostname)) return null;
    return url;
  } catch { return null; }
}

export async function fetchHtml(url: string, timeoutMs = 8000): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
        "Accept": "text/html",
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    if (!/html/i.test(res.headers.get("content-type") ?? "")) return null;
    return await res.text();
  } catch { return null; }
}

export function allMetas(html: string): Record<string, string> {
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

export function stripTags(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function cleanName(raw: string) {
  return raw
    .split(/\s[|｜–—-]\s/)[0]
    .replace(/\s*[-–—|]\s*(homes|condos|towns|townhomes|now selling).*$/i, "")
    .trim();
}

export function absolutize(src: string, base: URL) {
  try { return new URL(src, base).toString(); } catch { return src; }
}

/** Price anchored to "from / starting at" phrasing to avoid nav/footer prices. */
export function anchoredPrice(text: string): string | null {
  const m = text.match(/(?:starting\s+(?:from|at)|prices?\s+from|from)\s*:?\s*\$\s*([\d,]+(?:\.\d+)?)/i);
  return m ? "$" + m[1] : null;
}

export function detectStatus(text: string): string | null {
  if (/sold\s*out/i.test(text)) return "Sold out";
  if (/now\s+selling/i.test(text)) return "Selling";
  if (/coming\s+soon/i.test(text)) return "Coming soon";
  if (/register/i.test(text)) return "Registering";
  return null;
}

// ---------- project-level ----------

export type ProjectDraft = {
  project_name: string; city: string | null; p_start_price: string | null;
  project_status: string | null; project_description: string | null; main_image_url: string | null;
};

export function extractProject(html: string, url: URL): { draft: ProjectDraft; notes: string[] } {
  const metas = allMetas(html);
  const titleTag = (html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? "").trim();
  const text = stripTags(html);
  const notes: string[] = [];

  const projectName = cleanName(metas["og:title"] || titleTag);
  if (projectName) notes.push(`name: "${projectName}"`);
  const description = metas["og:description"] || metas["description"] || null;
  if (description) notes.push("description found");
  let mainImage = metas["og:image"] || null;
  if (mainImage) { mainImage = absolutize(mainImage, url); notes.push("main image found"); }
  const price = anchoredPrice(text);
  if (price) notes.push(`price: ${price}`);
  const status = detectStatus(text);
  if (status) notes.push(`status: ${status}`);

  let city: string | null = null;
  const ldRe = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let ldm: RegExpExecArray | null;
  while ((ldm = ldRe.exec(html)) && !city) {
    try {
      const parsed = JSON.parse(ldm[1]);
      for (const g of Array.isArray(parsed) ? parsed : [parsed]) {
        const addr = g?.address;
        const loc = addr?.addressLocality || (typeof addr === "string" ? addr : null);
        if (loc && typeof loc === "string") { city = loc.trim(); break; }
      }
    } catch { /* ignore bad JSON-LD */ }
  }
  if (city) notes.push(`city: ${city}`);

  return {
    draft: {
      project_name: projectName || "", city, p_start_price: price,
      project_status: status, project_description: description, main_image_url: mainImage,
    },
    notes,
  };
}

// ---------- model-level (maps onto home_models columns) ----------

export type ModelDraft = {
  model_name: string;
  bedrooms: string | null;
  bathrooms: string | null;
  sqft: string | null;
  starting_price: string | null;
  storeys: string | null;
  building_type: string | null;
  description: string | null;
  model_image_url: string | null;
  source_url: string; // reference only — stripped before DB insert
};

const NUM = String.raw`(?:\d+\s*\+\s*\d+|\d+(?:\.\d+)?)`;

function spec(text: string, re: RegExp): string | null {
  const m = text.match(re);
  return m ? m[1].replace(/\s+/g, "") : null;
}

export function extractModel(html: string, pageUrl: URL): ModelDraft | null {
  const metas = allMetas(html);
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "";
  const titleTag = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? "";
  const modelName = cleanName(stripTags(h1) || metas["og:title"] || titleTag);
  if (!modelName) return null;
  const text = stripTags(html);

  const bedrooms = spec(text, new RegExp(`(${NUM})\\s*(?:bedrooms?|beds?|bd(?!\\w))`, "i"));
  const bathrooms = spec(text, new RegExp(`(${NUM})\\s*(?:bathrooms?|baths?|ba(?!\\w))`, "i"));
  const sqftM = text.match(/([\d,]{3,})\s*(?:sq\.?\s*ft\.?|sqft)/i);
  const storeys = spec(text, new RegExp(`(${NUM})\\s*-?\\s*stor(?:eys?|ies)`, "i"));
  const btM = text.match(/(townhomes?|townhouses?|detached|semi-?detached|condos?|duplex|triplex|rowhouses?)/i);

  let modelImage = metas["og:image"] || null;
  if (!modelImage) {
    const imgs = [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map((m) => m[1]);
    const pick = imgs.find((s) => !/\.svg(\?|$)/i.test(s) && !/logo|icon|sprite|placeholder/i.test(s));
    if (pick) modelImage = pick;
  }
  if (modelImage) modelImage = absolutize(modelImage, pageUrl);

  return {
    model_name: modelName,
    bedrooms,
    bathrooms,
    sqft: sqftM ? sqftM[1] : null,
    starting_price: anchoredPrice(text),
    storeys,
    building_type: btM ? btM[1].replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : null,
    description: metas["og:description"] || metas["description"] || null,
    model_image_url: modelImage,
    source_url: pageUrl.toString(),
  };
}

/** Parse spec tables on the project page itself (Model | Beds | Baths | Sqft | Price). */
export function tableModels(html: string, pageUrl: URL): ModelDraft[] {
  const out: ModelDraft[] = [];
  const tables = html.match(/<table[\s\S]*?<\/table>/gi) ?? [];
  for (const t of tables) {
    const rows = [...t.matchAll(/<tr[\s\S]*?<\/tr>/gi)]
      .map((m) => [...m[0].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((c) => stripTags(c[1]).trim()))
      .filter((r) => r.length > 1);
    if (rows.length < 2) continue;
    const header = rows[0].map((h) => h.toLowerCase());
    const col = (re: RegExp) => header.findIndex((h) => re.test(h));
    const iName = col(/model|plan|name|design|home|unit/);
    const iPrice = col(/price|from/);
    const iBed = col(/bed/);
    const iBath = col(/bath/);
    const iSqft = col(/sq\.?\s*ft|sqft|area|size/);
    if ([iBed, iBath, iSqft, iPrice].filter((i) => i >= 0).length < 2) continue;
    const cell = (r: string[], i: number) => (i >= 0 && r[i] ? r[i] : null);
    for (const r of rows.slice(1)) {
      const name = cell(r, iName) ?? cell(r, 0);
      if (!name || name.length > 80) continue;
      out.push({
        model_name: name, bedrooms: cell(r, iBed), bathrooms: cell(r, iBath), sqft: cell(r, iSqft),
        starting_price: cell(r, iPrice), storeys: null, building_type: null,
        description: null, model_image_url: null, source_url: pageUrl.toString(),
      });
    }
    if (out.length) break;
  }
  return out;
}

/** Discover same-site model detail page links. Capped at 10. */
export function modelLinks(html: string, pageUrl: URL): string[] {
  const hrefs = [...html.matchAll(/<a[^>]+href=["']([^"']+)["']/gi)].map((m) => m[1]);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const h of hrefs) {
    if (!/model|floor-?plans?|home-?plans?|home-?designs?|elevation|house-?types?|residence/i.test(h)) continue;
    let u: URL;
    try { u = new URL(h, pageUrl); } catch { continue; }
    if (u.hostname !== pageUrl.hostname) continue;
    u.hash = "";
    const key = u.toString();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
    if (out.length >= 10) break;
  }
  return out;
}
