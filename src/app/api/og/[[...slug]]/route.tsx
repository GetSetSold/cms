import { ImageResponse } from "next/og";
import { getPage, getSvgs } from "@/lib/cms";

export const dynamic = "force-dynamic";

/**
 * Social preview image for CMS pages (1200x630), mirroring the updates
 * setup. Two variants:
 * 1. Hero card — when the page has a hero block: the hero photo as a
 *    small round image beside the hero eyebrow, heading and first
 *    subline. Falls back gracefully: hero text without the photo when
 *    the artwork is missing or unusable.
 * 2. Title card — pages with no hero block: the branded title card
 *    (same shell as the updates generic card).
 *
 * Why a route handler and not opengraph-image.tsx: a file-convention
 * image cannot live under the [[...slug]] catch-all — Next rejects a
 * static segment after a catch-all ("catch all segment must be the last
 * segment"). This handler takes the slug as its path instead:
 * /api/og/renting-a-home, /api/og/home.
 *
 * Hero photos live in the artwork library as SVG wrappers around a
 * raster background-image data URI; the URI is extracted from the
 * markup and passed straight to Satori. Satori rules learned the hard
 * way (Oct 2026): every div with more than one child needs an explicit
 * display:flex, and next/og on Cloudflare Workers has no system fonts
 * — Inter is loaded from the fontsource CDN (weights 400/800 only,
 * matching what is used) or the worker throws 1101.
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

/** Plain text from a hero subline: strip markdown links, tags, extra space; cap length. */
function plainSubline(text: unknown, max = 140): string | null {
  if (typeof text !== "string" || !text.trim()) return null;
  const plain = text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!plain) return null;
  if (plain.length <= max) return plain;
  const cut = plain.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 60 ? cut.slice(0, lastSpace) : cut) + "…";
}

/** Raster data URI hidden inside an artwork record's SVG-wrapper markup.
 *  Only PNG/JPEG/GIF: Satori renders a WebP data URI as an empty box
 *  (proven by the renting-page render, Oct 2026 — the slot stayed pure
 *  background). A hero photo re-uploaded as PNG/JPEG is picked up
 *  automatically; anything else falls back to the text card. */
function extractRaster(markup: unknown): string | null {
  if (typeof markup !== "string") return null;
  const m = markup.match(/data:image\/(png|jpe?g|gif);base64,[A-Za-z0-9+/=]+/);
  return m ? m[0] : null;
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  let pageTitle = "Rohit Sharma Real Estate";
  let hero: { eyebrow?: string; heading?: string; subline?: string | null; image?: string | null } | null = null;

  try {
    const result = await getPage(toSlug(slug), false);
    const p = result?.page;
    // Same title rule as the page's own metadata (seo_title wins), so the
    // card never disagrees with the shared title text.
    if (p) pageTitle = p.seo_title || p.title || pageTitle;
    const heroSection = (result?.sections ?? []).find((s: any) => s?.block_type === "hero");
    const d = heroSection?.data ?? {};
    if (typeof d.heading === "string" && d.heading.trim()) {
      const accent = typeof d.heading_accent === "string" ? d.heading_accent.trim() : "";
      let subline: unknown = null;
      if (d.subheading_style === "checklist" && Array.isArray(d.subheading_items) && d.subheading_items.length) {
        subline = d.subheading_items[0]?.text;
      } else {
        subline = d.subheading;
      }
      let image: string | null = null;
      if (typeof d.svg_id === "string" && d.svg_id) {
        try {
          const svgs = await getSvgs([d.svg_id]);
          image = extractRaster(svgs[d.svg_id]?.markup);
        } catch {
          image = null;
        }
      }
      hero = {
        eyebrow: typeof d.eyebrow === "string" ? d.eyebrow : undefined,
        heading: `${d.heading.trim()}${accent ? ` ${accent}` : ""}`,
        subline: plainSubline(subline),
        image,
      };
    }
  } catch {
    // Fall through to the branded fallback below.
  }

  const fonts = await loadFonts();

  const brandHeader = (
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
  );

  const footer = <div style={{ fontSize: 22, fontWeight: 400, color: "rgba(255,255,255,0.6)" }}>GetSetSold.ca</div>;

  const middle = hero ? (
    <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 48 }}>
      {hero.image ? (
        <img src={hero.image} width={240} height={240} style={{ width: 240, height: 240, borderRadius: 120, objectFit: "cover", flexShrink: 0 }} />
      ) : null}
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        {hero.eyebrow ? (
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "0.18em", color: ACCENT, marginBottom: 14 }}>
            {hero.eyebrow.toUpperCase()}
          </div>
        ) : null}
        <div style={{ fontSize: 48, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.15 }}>
          {hero.heading}
        </div>
        {hero.subline ? (
          <div style={{ fontSize: 22, fontWeight: 400, color: "rgba(255,255,255,0.65)", lineHeight: 1.4, marginTop: 16 }}>
            {hero.subline}
          </div>
        ) : null}
      </div>
    </div>
  ) : (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ fontSize: 60, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
        {pageTitle}
      </div>
    </div>
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column",
          justifyContent: "space-between", padding: 64, color: "#fff",
          background: "#0d0d0f", fontFamily: "Inter, system-ui, -apple-system, sans-serif",
        }}
      >
        {brandHeader}
        {middle}
        {footer}
      </div>
    ),
    { ...SIZE, fonts },
  );
}
