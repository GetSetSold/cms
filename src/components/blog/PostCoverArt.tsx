/**
 * Inline SVG cover for a blog post — 16:9, matte black/blue, branded.
 * Rendered directly (no server image generation), so it always works.
 * When market data is available, shows market + month + benchmark.
 */

function fmtMoney(n: number): string {
  return n >= 1000000
    ? `$${(n / 1000000).toFixed(2)}M`.replace(/\.00M$/, "M")
    : n >= 1000
      ? `$${Math.round(n / 1000)}K`
      : `$${Math.round(n)}`;
}

function fmtPct(n: number): string {
  return `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;
}

export function PostCoverArt({
  marketName,
  monthLabel,
  benchmark,
  momChange,
  rateLabel,
  rateValue,
  rateChange,
}: {
  marketName?: string;
  monthLabel?: string;
  benchmark?: number;
  momChange?: number;
  /** Rate variant: e.g. rateLabel="BoC Target Rate", rateValue="2.75%", rateChange="-0.25" */
  rateLabel?: string;
  rateValue?: string;
  rateChange?: string;
}) {
  const hasMarket = !!marketName;
  const isRate = !!rateLabel;
  const isDown = (momChange ?? 0) < 0;
  const rateDown = (rateChange ?? "").startsWith("-") || (rateChange ?? "").startsWith("\u2212");

  return (
    <svg viewBox="0 0 800 450" className="aspect-video w-full rounded-[var(--radius-lg)]" role="img" aria-label={marketName ? `${marketName} housing market update` : "Market update"}>
      <rect width="800" height="450" fill="#0d0d0f" rx="20" />
      {/* faint grid */}
      <g stroke="#1e1e22" strokeWidth="1">
        <line x1="0" y1="112" x2="800" y2="112" />
        <line x1="0" y1="225" x2="800" y2="225" />
        <line x1="0" y1="337" x2="800" y2="337" />
      </g>
      {/* header */}
      <text x="48" y="72" fontSize="24" fontWeight="700" fill="#ffffff" letterSpacing="3">
        GETSET<tspan fill="#4d9fff">SOLD</tspan>
      </text>
      <text x="752" y="72" fontSize="20" fill="rgba(255,255,255,0.6)" textAnchor="end" letterSpacing="2">
        {(monthLabel || "MARKET UPDATE").toUpperCase()}
      </text>
      {/* body */}
      <text x="48" y="200" fontSize="20" fontWeight="700" fill="#4d9fff" letterSpacing="4">
        {isRate ? "RATE UPDATE" : "MARKET UPDATE"}
      </text>
      <text x="48" y="268" fontSize="56" fontWeight="700" fill="#ffffff">
        {hasMarket ? `${marketName}` : isRate ? "Bank of Canada" : "Housing Market"}
      </text>
      {hasMarket ? (
        <text x="48" y="312" fontSize="28" fill="rgba(255,255,255,0.75)">
          Housing Market
        </text>
      ) : isRate ? (
        <text x="48" y="312" fontSize="28" fill="rgba(255,255,255,0.75)">
          Interest Rate Decision
        </text>
      ) : null}
      {/* footer stats */}
      {isRate && rateValue ? (
        <g>
          <text x="48" y="392" fontSize="44" fontWeight="700" fill="#ffffff">
            {rateValue}
          </text>
          <text x="48" y="418" fontSize="16" fill="rgba(255,255,255,0.6)">
            {rateLabel || "Target rate"}
          </text>
        </g>
      ) : benchmark ? (
        <g>
          <text x="48" y="392" fontSize="44" fontWeight="700" fill="#ffffff">
            {fmtMoney(benchmark)}
          </text>
          <text x="48" y="418" fontSize="16" fill="rgba(255,255,255,0.6)">
            Benchmark price
          </text>
        </g>
      ) : (
        <text x="48" y="392" fontSize="36" fontWeight="700" fill="#ffffff">
          GetSetSold.ca
        </text>
      )}
      {isRate && rateChange ? (
        <g>
          <text x="752" y="392" fontSize="40" fontWeight="700" fill={rateDown ? "#4ade80" : "#ff6b6b"} textAnchor="end">
            {rateChange}
          </text>
          <text x="752" y="418" fontSize="16" fill="rgba(255,255,255,0.6)" textAnchor="end">
            vs previous decision
          </text>
        </g>
      ) : momChange != null && benchmark ? (
        <g>
          <text x="752" y="392" fontSize="40" fontWeight="700" fill={isDown ? "#ff6b6b" : "#4ade80"} textAnchor="end">
            {fmtPct(momChange)}
          </text>
          <text x="752" y="418" fontSize="16" fill="rgba(255,255,255,0.6)" textAnchor="end">
            month over month
          </text>
        </g>
      ) : null}
    </svg>
  );
}
