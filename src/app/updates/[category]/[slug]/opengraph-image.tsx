import { ImageResponse } from "next/og";
import { getPostBySlug } from "@/lib/blog";
import { getHpiMarketAsOf, fmtMoney, fmtPct } from "@/lib/hpi";
import { getBocDecisionAsOf, fmtRate } from "@/lib/boc";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";

/**
 * Social preview image for update posts (1200x630). Every post gets a
 * title-led image — the old generic fallback said "Housing Market Update"
 * even for rate posts, which is wrong for sharing.
 *
 * Variants, in order:
 * 1. market_stats post → market data card (benchmark + MoM change).
 * 2. rate_update post → rate card (post title + target rate + change +
 *    effective date, when the announced layer provides one).
 * 3. anything else → branded fallback with the POST TITLE and category.
 *
 * Fonts: next/og on Cloudflare Workers has no system fonts, so Satori
 * crashes without explicit fonts (seen as "error code: 1101"). Inter is
 * loaded from the fontsource CDN once per isolate and only weights 400
 * and 800 are used, matching what is loaded.
 */

function findBlock(post: any, type: string): any | null {
  const lists = [post.blocks_before, post.blocks_after].filter(Array.isArray);
  for (const list of lists) {
    for (const b of list) {
      if ((b?.block_type === type || b?.type === type)) return b;
    }
  }
  return null;
}

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

function fmtLongDate(iso: string): string {
  const d = new Date(iso + (iso.includes("T") ? "" : "T00:00:00"));
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric" });
}

const ACCENT = "#0099cc";

function Shell({ eyebrow, children }: { eyebrow: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        width: "100%", height: "100%", display: "flex", flexDirection: "column",
        justifyContent: "space-between", padding: 64, color: "#fff",
        background: "#0d0d0f", fontFamily: "Inter, system-ui, -apple-system, sans-serif",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "0.14em" }}>
          GETSET<span style={{ color: ACCENT }}>SOLD</span>
        </div>
        <div style={{ fontSize: 24, fontWeight: 400, color: "rgba(255,255,255,0.65)", letterSpacing: "0.08em" }}>
          {eyebrow}
        </div>
      </div>
      {children}
      <div style={{ fontSize: 22, fontWeight: 400, color: "rgba(255,255,255,0.6)" }}>GetSetSold.ca</div>
    </div>
  );
}

export default async function OgImage({ params }: { params: Promise<{ category: string; slug: string }> }) {
  const { category, slug } = await params;
  let postTitle = "GetSetSold Update";
  let categoryName = "MARKET UPDATE";
  let marketName = "";
  let benchmark = "";
  let delta = "";
  let monthYear = "";
  let rateValue: string | null = null;
  let rateChange: string | null = null;
  let rateUp: boolean | null = null;
  let rateEffective: string | null = null;

  try {
    const result = await getPostBySlug(category, slug);
    if (result?.post) {
      postTitle = result.post.title;
      categoryName = (result.category?.name ?? "UPDATE").toUpperCase();
      const marketBlock = findBlock(result.post, "market_stats");
      if (marketBlock?.data?.market_slug) {
        const market = await getHpiMarketAsOf(marketBlock.data.market_slug, marketBlock.data.month || "");
        if (market) {
          marketName = market.name;
          benchmark = fmtMoney(market.latest.compositeBenchmark);
          delta = fmtPct(market.latest.momChange);
          const d = new Date(market.lastUpdated + (market.lastUpdated.includes("T") ? "" : "T00:00:00"));
          if (!isNaN(d.getTime())) monthYear = d.toLocaleDateString("en-CA", { month: "long", year: "numeric" }).toUpperCase();
        }
      } else {
        const rateBlock = findBlock(result.post, "rate_update");
        if (rateBlock) {
          const snap = await getBocDecisionAsOf((rateBlock.data?.decision_date as string) || "");
          if (snap && snap.target !== null) {
            rateValue = fmtRate(snap.target);
            if (snap.change) {
              rateChange = `${snap.change.direction === "up" ? "+" : "\u2212"}${snap.change.change.toFixed(2)}`;
              rateUp = snap.change.direction === "up";
            } else {
              rateChange = "Hold";
              rateUp = null;
            }
            rateEffective = snap.effectiveDate ? fmtLongDate(snap.effectiveDate) : null;
          }
        }
      }
    }
  } catch {
    // Fall through to the generic branded image below.
  }

  const fonts = await loadFonts();
  const opts = { ...size, fonts };

  if (marketName) {
    const isDown = delta.startsWith("-");
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%", height: "100%", display: "flex", flexDirection: "column",
            justifyContent: "space-between", padding: 64, color: "#fff",
            background: "radial-gradient(ellipse 80% 70% at 70% 20%, rgba(0,153,204,0.35), transparent 60%), #0d0d0f",
            fontFamily: "Inter, system-ui, -apple-system, sans-serif",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "0.14em" }}>
              GETSET<span style={{ color: ACCENT }}>SOLD</span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 400, color: "rgba(255,255,255,0.65)", letterSpacing: "0.08em" }}>
              {monthYear || "MARKET UPDATE"}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "0.22em", color: ACCENT, marginBottom: 12 }}>
              MARKET UPDATE
            </div>
            <div style={{ fontSize: 72, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.05 }}>
              {`${marketName} Housing Market`}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <div style={{ fontSize: 56, fontWeight: 800 }}>{benchmark || "GetSetSold.ca"}</div>
              {benchmark ? <div style={{ fontSize: 20, color: "rgba(255,255,255,0.6)" }}>Benchmark price</div> : null}
            </div>
            {delta ? (
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 48, fontWeight: 800, color: isDown ? "#ff6b6b" : "#4ade80" }}>{delta}</div>
                <div style={{ fontSize: 20, color: "rgba(255,255,255,0.6)" }}>month over month</div>
              </div>
            ) : null}
          </div>
        </div>
      ),
      opts,
    );
  }

  if (rateValue) {
    return new ImageResponse(
      (
        <Shell eyebrow={categoryName}>
          <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "0.22em", color: ACCENT, marginBottom: 16 }}>
                POLICY INTEREST RATE UPDATE
              </div>
              <div style={{ fontSize: 56, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
                {postTitle}
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 20 }}>
                <div style={{ fontSize: 72, fontWeight: 800 }}>{rateValue}</div>
                {rateChange ? (
                  <div style={{ fontSize: 40, fontWeight: 800, color: rateUp === null ? "rgba(255,255,255,0.8)" : rateUp ? "#ff6b6b" : "#4ade80" }}>
                    {rateChange}
                  </div>
                ) : null}
              </div>
              {rateEffective ? (
                <div style={{ fontSize: 22, fontWeight: 400, color: "rgba(255,255,255,0.65)", textAlign: "right" }}>
                  Effective {rateEffective}
                </div>
              ) : null}
            </div>
          </div>
        </Shell>
      ),
      opts,
    );
  }

  return new ImageResponse(
    (
      <Shell eyebrow={categoryName}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "0.22em", color: ACCENT, marginBottom: 16 }}>
            {categoryName}
          </div>
          <div style={{ fontSize: 60, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
            {postTitle}
          </div>
        </div>
      </Shell>
    ),
    opts,
  );
}
