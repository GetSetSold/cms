import { ImageResponse } from "next/og";
import { getPostBySlug } from "@/lib/blog";
import { getHpiMarketAsOf, fmtMoney, fmtPct } from "@/lib/hpi";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";

/** Find the first market_stats block in the post's block lists (slug + pinned month). */
function findMarketBlock(post: any): { slug: string; month: string } | null {
  const lists = [post.blocks_before, post.blocks_after].filter(Array.isArray);
  for (const list of lists) {
    for (const b of list) {
      const isMarket = b?.block_type === "market_stats" || b?.type === "market_stats";
      if (isMarket && b?.data?.market_slug) return { slug: b.data.market_slug, month: (b.data.month as string) || "" };
    }
  }
  return null;
}

export default async function OgImage({ params }: { params: Promise<{ category: string; slug: string }> }) {
  const { category, slug } = await params;
  let marketName = "";
  let benchmark = "";
  let delta = "";
  let monthYear = "";
  try {
    const result = await getPostBySlug(category, slug);
    const block = result?.post ? findMarketBlock(result.post) : null;
    if (block) {
      const market = await getHpiMarketAsOf(block.slug, block.month);
      if (market) {
        marketName = market.name;
        benchmark = fmtMoney(market.latest.compositeBenchmark);
        delta = fmtPct(market.latest.momChange);
        const d = new Date(market.lastUpdated + (market.lastUpdated.includes("T") ? "" : "T00:00:00"));
        if (!isNaN(d.getTime())) monthYear = d.toLocaleDateString("en-CA", { month: "long", year: "numeric" }).toUpperCase();
      }
    }
  } catch {
    // Fall through to generic branded image
  }

  const isDown = delta.startsWith("-");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column",
          justifyContent: "space-between", padding: 64, color: "#fff",
          background: "radial-gradient(ellipse 80% 70% at 70% 20%, rgba(0,102,204,0.35), transparent 60%), #0d0d0f",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "0.14em" }}>
            GETSET<span style={{ color: "#4d9fff" }}>SOLD</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 600, color: "rgba(255,255,255,0.65)", letterSpacing: "0.08em" }}>
            {monthYear || "MARKET UPDATE"}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "0.22em", color: "#4d9fff", marginBottom: 12 }}>
            MARKET UPDATE
          </div>
          <div style={{ fontSize: 72, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.05 }}>
            {marketName ? `${marketName} Housing Market` : "Housing Market Update"}
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
    { ...size }
  );
}
