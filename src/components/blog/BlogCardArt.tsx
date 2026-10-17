/**
 * Matte SVG placeholder for blog cards — shown when a post has no cover image.
 * Flat black/blue/grey fills, thin line icons, post-specific text so no two
 * cards repeat. Card body stays white; only the image area is the placeholder.
 */

const ACCENT = "#4d9fff";
const SUBTLE = "#9a9aa0";

/* Category -> matte background + icon. Stays within black/blue/grey. */
const THEMES: Record<string, { bg: string; grid: string; icon: React.ReactNode }> = {
  "market-updates": {
    bg: "#141416", grid: "#2a2a2e",
    icon: <polyline points="20,130 60,122 100,128 140,110 180,118 220,96 260,104 300,84" fill="none" stroke={ACCENT} strokeWidth="2.5" />,
  },
  market: {
    bg: "#141416", grid: "#2a2a2e",
    icon: <polyline points="20,130 60,122 100,128 140,110 180,118 220,96 260,104 300,84" fill="none" stroke={ACCENT} strokeWidth="2.5" />,
  },
  buying: {
    bg: "#1c2733", grid: "#2c3a4a",
    icon: <g fill="none" stroke={ACCENT} strokeWidth="2.5"><path d="M120 110 L160 78 L200 110" /><rect x="128" y="110" width="64" height="48" /><rect x="150" y="130" width="20" height="28" /></g>,
  },
  selling: {
    bg: "#232326", grid: "#333338",
    icon: <g fill="none" stroke={ACCENT} strokeWidth="2.5"><path d="M130 80 L190 80 L210 100 L150 160 L110 120 Z" /><circle cx="172" cy="100" r="4" fill={ACCENT} /></g>,
  },
  "bank-of-canada": {
    bg: "#1a1a20", grid: "#2b2b33",
    icon: <g fill="none" stroke={ACCENT} strokeWidth="2.5"><path d="M110 90 L160 62 L210 90" /><line x1="118" y1="90" x2="118" y2="150" /><line x1="142" y1="90" x2="142" y2="150" /><line x1="178" y1="90" x2="178" y2="150" /><line x1="202" y1="90" x2="202" y2="150" /><line x1="106" y1="150" x2="214" y2="150" /></g>,
  },
  renting: {
    bg: "#20242a", grid: "#31363e",
    icon: <g fill="none" stroke={ACCENT} strokeWidth="2.5"><circle cx="140" cy="110" r="22" /><line x1="156" y1="126" x2="200" y2="170" /><line x1="182" y1="152" x2="192" y2="142" /><line x1="192" y1="162" x2="202" y2="152" /></g>,
  },
  investing: {
    bg: "#16181d", grid: "#262a32",
    icon: <g fill="none" stroke={ACCENT} strokeWidth="2.5"><polyline points="110,150 150,110 180,130 220,80" /><polyline points="196,80 220,80 220,104" /></g>,
  },
  "pre-construction": {
    bg: "#1e2126", grid: "#2f333b",
    icon: <g fill="none" stroke={ACCENT} strokeWidth="2.5"><rect x="130" y="70" width="60" height="90" /><line x1="130" y1="90" x2="190" y2="90" /><line x1="130" y1="110" x2="190" y2="110" /><line x1="130" y1="130" x2="190" y2="130" /></g>,
  },
};

const DEFAULT_THEME = {
  bg: "#1a1a1c", grid: "#2a2a2e",
  icon: <g fill="none" stroke={ACCENT} strokeWidth="2.5"><rect x="120" y="90" width="80" height="60" rx="4" /><line x1="120" y1="110" x2="200" y2="110" /></g>,
};

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;
}

export function BlogCardArt({
  categorySlug,
  categoryName,
  title,
  marketLabel,
}: {
  categorySlug: string;
  categoryName: string;
  title: string;
  /** e.g. "Hamilton–Burlington · September 2026" — from the post's market_stats block */
  marketLabel?: string;
}) {
  const t = THEMES[categorySlug] ?? DEFAULT_THEME;
  const label = categoryName.toUpperCase();
  // Unique per post: market context for market updates, title snippet otherwise
  const line1 = marketLabel ? marketLabel.split("·")[0].trim() : truncate(title, 34);
  const line2 = marketLabel ? marketLabel.split("·").slice(1).join("·").trim() : "";

  return (
    <svg viewBox="0 0 320 200" className="aspect-[16/10] w-full" role="img" aria-label={title}>
      <rect width="320" height="200" fill={t.bg} />
      <g stroke={t.grid} strokeWidth="1">
        <line x1="0" y1="50" x2="320" y2="50" />
        <line x1="0" y1="100" x2="320" y2="100" />
        <line x1="0" y1="150" x2="320" y2="150" />
      </g>
      {t.icon}
      <text x="20" y="34" fontSize="11" fontWeight="800" fill={ACCENT} letterSpacing="2">{label}</text>
      <text x="20" y="178" fontSize={line1.length > 24 ? 15 : 19} fontWeight="800" fill="#ffffff">{line1}</text>
      {line2 ? <text x="20" y="196" fontSize="11" fill={SUBTLE}>{line2}</text> : null}
    </svg>
  );
}
