import { ImageResponse } from "next/og";
import { getPage } from "@/lib/cms";

export const dynamic = "force-dynamic";

/**
 * Social preview image for CMS pages (1200x630), mirroring the updates
 * setup: every page gets a branded title card when it has no photo of its
 * own (the slug page's metadata points here as the fallback). Same shell
 * as the updates generic card — "Rohit Sharma Real Estate" header,
 * getsetsold.ca underneath, page title, GetSetSold.ca footer.
 *
 * Why a route handler and not opengraph-image.tsx: a file-convention
 * image cannot live under the [[...slug]] catch-all — Next rejects a
 * static segment after a catch-all ("catch all segment must be the last
 * segment"). This handler takes the slug as its path instead:
 * /api/og/renting-a-home, /api/og/home.
 *
 * Satori rules learned the hard way (Oct 2026): every div with more than
 * one child needs an explicit display:flex, and next/og on Cloudflare
 * Workers has no system fonts — Inter is loaded from the fontsource CDN
 * (weights 400/800 only, matching what is used) or the worker throws 1101.
 */

type LoadedFont = { name: string; data: ArrayBuffer; weight: 400 | 800; style: "normal" };
let cachedFonts: LoadedFont[] | null = null;
async function loadFonts(): Promise<LoadedFont[]> {
  if (cachedFonts) return cachedFonts;
  try {
    const [r400, r800] = await Promise.all([
      fetch("https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-400-normal.woff"),
      fetch("https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-800-normal.woff"),
    ]);
    if (!r400.ok || !r800.ok) return [];
    cachedFonts = [
      { name: "Inter", data: await r400.arrayBuffer(), weight: 400, style: "normal" },
      { name: "Inter", data: await r800.arrayBuffer(), weight: 800, style: "normal" },
    ];
    return cachedFonts;
  } catch {
    return [];
  }
}

const ACCENT = "#0099cc";
const SIZE = { width: 1200, height: 630 };

const toSlug = (parts?: string[]) => (parts?.length ? parts.join("/").toLowerCase() : "home");

export async function GET(_req: Request, { params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  let pageTitle = "Rohit Sharma Real Estate";

  try {
    const result = await getPage(toSlug(slug), false);
    const p = result?.page;
    // Same title rule as the page's own metadata (seo_title wins), so the
    // card never disagrees with the shared title text.
    if (p) pageTitle = p.seo_title || p.title || pageTitle;
  } catch {
    // Fall through to the branded fallback below.
  }

  const fonts = await loadFonts();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column",
          justifyContent: "space-between", padding: 64, color: "#fff",
          background: "#0d0d0f", fontFamily: "Inter, system-ui, -apple-system, sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 26, fontWeight: 800 }}>
              Rohit Sharma<span style={{ color: ACCENT }}>&nbsp;Real Estate</span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 400, color: "rgba(255,255,255,0.6)", letterSpacing: "0.08em", marginTop: 6 }}>
              getsetsold.ca
            </div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 60, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
            {pageTitle}
          </div>
        </div>
        <div style={{ fontSize: 22, fontWeight: 400, color: "rgba(255,255,255,0.6)" }}>GetSetSold.ca</div>
      </div>
    ),
    { ...SIZE, fonts },
  );
}
