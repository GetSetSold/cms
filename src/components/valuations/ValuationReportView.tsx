"use client";
/** Black & white CMA report + listing presentation — admin print view and public shared link. */
import { useEffect, useState, type ReactNode } from "react";

type Comp = Record<string, any>;

const money = (n: any) => (n ? "$" + Math.round(Number(n)).toLocaleString() : "—");

/* ---------- inline icon set (print-safe, no extra requests) ---------- */
const svgProps = {
  width: 24, height: 24, viewBox: "0 0 24 24", fill: "none",
  stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round",
} as const;

const ICONS: Record<string, ReactNode> = {
  home: (<svg {...svgProps}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M9 22V12h6v10" /></svg>),
  camera: (<svg {...svgProps}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>),
  chart: (<svg {...svgProps}><line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" /></svg>),
  share: (<svg {...svgProps}><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.41" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>),
  calendar: (<svg {...svgProps}><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>),
  mail: (<svg {...svgProps}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>),
  search: (<svg {...svgProps}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>),
  sparkle: (<svg {...svgProps}><path d="M12 2l2.4 7.6H22l-6.2 4.5 2.4 7.4-6.2-4.6-6.2 4.6 2.4-7.4L2 9.6h7.6z" /></svg>),
  mega: (<svg {...svgProps}><path d="M3 11l18-7-7 18-2.5-7.5z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" /></svg>),
  shield: (<svg {...svgProps}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>),
  clock: (<svg {...svgProps}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>),
  lamp: (<svg {...svgProps}><path d="M9 2h6l3 8H6z" /><line x1="12" y1="10" x2="12" y2="22" /><path d="M8 22h8" /></svg>),
  door: (<svg {...svgProps}><rect x="5" y="3" width="14" height="18" rx="1" /><circle cx="15" cy="12" r="1" fill="currentColor" stroke="none" /></svg>),
  cart: (<svg {...svgProps}><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></svg>),
  tree: (<svg {...svgProps}><path d="M12 3l6 9h-3.5L18 19H6l3.5-7H6z" /><line x1="12" y1="19" x2="12" y2="22" /></svg>),
  cap: (<svg {...svgProps}><path d="M22 10L12 5 2 10l10 5 10-5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg>),
};

const DEFAULT_AGENT = {
  name: "Rohit Sharma",
  phone: "416-605-7488",
  email: "rohit@getsetsold.com",
  brokerage: "Lombard Group Real Estate Inc., Brokerage",
  tagline: "Your Trusted Partner in Real Estate",
  photo: "",
  photo_svg: "",
  bio: "With over a decade of experience in the Greater Toronto Area's dynamic real estate market, Rohit Sharma has established himself as a trusted advisor for both buyers and sellers. Specializing in residential properties, Rohit combines deep market knowledge with cutting-edge technology to deliver exceptional results. His client-first approach and innovative 1% commission model have saved homeowners over $2 million in commission fees while maintaining full-service quality. Rohit is committed to transparent pricing, honest communication, and ensuring every client feels confident throughout their real estate journey.",
};

const WHY_FEATURES: [string, string][] = [
  ["Professional Cleaning", "sparkle"],
  ["Professional Photography", "camera"],
  ["Weekly Progress Report", "chart"],
  ["Social Media Promos", "share"],
  ["MLS & Realtor.ca", "home"],
  ["Online Booking System", "calendar"],
  ["Staging Consultation", "lamp"],
  ["Open Houses On Your Schedule", "door"],
];

const COMPARISON: [string, "yes" | "maybe"][] = [
  ["No Obligation to Buy With Us", "maybe"],
  ["Full MLS Listing on TRREB", "yes"],
  ["Full Realtor.ca Listing", "yes"],
  ["Full Local Board Listing", "maybe"],
  ["Listing on Multiple Sites (Zolo, HouseSigma, etc.)", "yes"],
  ["Professional Cleaning", "maybe"],
  ["Professional Photography", "maybe"],
  ["Professional Virtual Tour", "maybe"],
  ["Home Staging Consultation", "maybe"],
  ["Online Scheduling System", "maybe"],
  ["Weekly Progress Report", "maybe"],
  ["Social Media Promotion", "maybe"],
  ["Professional Feature Sheet", "maybe"],
  ["Open House Showings", "maybe"],
  ["For Sale Sign Installation", "maybe"],
  ["Email Campaigns to Buyer Network", "maybe"],
  ["Skilled Offer Negotiation", "yes"],
  ["Paperwork & Legal Guidance", "yes"],
  ["Google & SEO Marketing", "maybe"],
  ["Satisfaction Guarantee or Cancel Anytime", "maybe"],
];

const MARKETING: [string, string, string][] = [
  ["MLS & Realtor.ca", "Maximum exposure on Canada's #1 real estate platform, reaching thousands of active buyers daily.", "home"],
  ["Social Media Blitz", "Targeted campaigns across Facebook, Instagram, and TikTok to reach buyers where they spend their time.", "mega"],
  ["Email Campaigns", "Direct outreach to our network of 5,000+ potential buyers and local real estate professionals.", "mail"],
  ["Professional Media", "High-quality photography, virtual tours, and video walkthroughs that showcase your home's best features.", "camera"],
  ["Open Houses", "Strategically scheduled open houses designed to create urgency and attract serious, qualified buyers.", "door"],
  ["Google & SEO", "Search engine optimization ensures your property ranks at the top when buyers search online.", "search"],
];

const REASONS: [string, string][] = [
  ["Free in-home consultation & property assessment", "A relaxed walkthrough to understand your home, your goals, and your timeline."],
  ["Detailed market analysis & competitive pricing strategy", "Real sold data from your neighbourhood — priced to attract, not to sit."],
  ["Customized marketing plan development", "A plan built around your property, not a one-size-fits-all template."],
  ["Transparent commission & service agreement", "Everything in writing, in plain language — no fine print, no surprises."],
  ["Professional staging consultation & recommendations", "Small changes that make buyers fall in love at first showing."],
  ["Arrangement of professional cleaning services", "Your home shows its absolute best from the very first photo."],
  ["Professional photography & virtual tour creation", "Scroll-stopping visuals that get buyers through the door."],
  ["MLS & Realtor.ca listing activation", "Maximum exposure on Canada's biggest buyer platforms from day one."],
  ["Social media marketing launch across all platforms", "Your listing in front of thousands of local buyers where they scroll."],
  ["Email blast to our buyer network of 5,000+ contacts", "Instant exposure to thousands of active buyers and agents."],
  ["For Sale sign installation & neighborhood outreach", "Curb appeal plus neighbours who may know your next buyer."],
  ["Open house scheduling & event management", "Professionally run events that create urgency and competition."],
  ["Offer review & detailed comparison analysis", "Every offer broken down side-by-side so you decide with confidence."],
  ["Skilled negotiation to maximize your sale price", "Experienced negotiation that protects your bottom line."],
  ["Conditional management & buyer qualification verification", "No shaky deals — buyers verified before your home comes off the market."],
  ["Legal paperwork preparation & review coordination", "All documents handled correctly and on time."],
  ["Final walkthrough scheduling & support", "A smooth final walkthrough with nothing left to chance."],
  ["Closing document review & signing facilitation", "Every signature in place for a stress-free closing day."],
  ["Keys & possession transfer coordination", "A clean handoff so you move on without loose ends."],
  ["Post-sale follow-up & satisfaction check-in", "The relationship doesn't end at closing — I'm here after you move."],
];

const REVIEWS: [string, string][] = [
  ["Sarah & James Mitchell", "Rohit sold our home in just 12 days and saved us over $15,000 in commission. His marketing strategy was incredible, and we got above asking price. Can't recommend him enough!"],
  ["Michael Chen", "As a first-time seller, I was nervous about the process. Rohit made everything seamless. The 1% commission was a game-changer — I used the savings for my new home's down payment."],
  ["Priya Patel", "Professional, knowledgeable, and genuinely cares about his clients. Rohit's weekly progress reports kept me informed every step of the way. The photos he arranged were stunning."],
  ["David & Karen Thompson", "We interviewed several agents before choosing Rohit. His transparent pricing and full-service approach won us over. Our property sold for $25,000 over asking!"],
  ["Lisa Rodriguez", "Rohit's staging consultation transformed our home. Buyers were impressed from the moment they walked in. The open house strategy he implemented brought multiple competing offers."],
  ["Robert & Anne Williams", "Outstanding service at an unbeatable price. Rohit handled everything from professional cleaning to MLS listing. We couldn't be happier with the results and the money we saved."],
];

const ELFSIGHT_APP_ID = "e705f2da-4d5f-48a0-8e1a-4e33be72155d";

/** Stat card with a dark top bar (value) and label/caption below — like the commission cards. */
function Bar({ value, sub, label, caption, captionClass, highlight }: {
  value: string; sub?: string; label: string; caption?: string; captionClass?: string; highlight?: boolean;
}) {
  return (
    <div className={`cma-bar${highlight ? " hl" : ""}`}>
      <div className="cma-bar-top">
        <div className="cma-bar-value">{value}</div>
        {sub ? <div className="cma-bar-sub">{sub}</div> : null}
      </div>
      <div className="cma-bar-body">
        <div className="cma-bar-label">{label}</div>
        {caption ? <div className={`cma-bar-cap ${captionClass ?? ""}`}>{caption}</div> : null}
      </div>
    </div>
  );
}

export function ValuationReportView({ report, leadName, branding }: { report: any; leadName?: string; branding?: any }) {
  const [dark, setDark] = useState(false);
  const rec = Number(report.recommended_price) || 0;
  const [calcPrice, setCalcPrice] = useState<number>(rec);
  const [ctaOpen, setCtaOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [ctaState, setCtaState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [ctaError, setCtaError] = useState("");
  const fullAddress = `${report.address ?? ""}${report.city ? `, ${report.city}` : ""}`.trim();

  async function submitCta(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (ctaState === "sending") return;
    setCtaState("sending");
    setCtaError("");
    const form = new FormData(e.currentTarget);
    const payload = {
      ...Object.fromEntries(form),
      form_key: "valuation_cta",
      path: typeof window !== "undefined" ? window.location.pathname : "",
      custom_fields: {
        property_address: fullAddress,
        valuation_report_id: report.id,
        suggested_price: rec || null,
        lead_id: report.lead_id ?? null,
      },
    };
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/submit-lead`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""}`,
      },
      body: JSON.stringify(payload),
    }).catch(() => null);
    if (res?.ok) setCtaState("done");
    else {
      const body = await res?.json().catch(() => ({}));
      setCtaState("error");
      setCtaError(body?.error ?? "Something went wrong. Please try again.");
    }
  }
  // Print/PDF always renders light.
  useEffect(() => {
    const off = () => setDark(false);
    window.addEventListener("beforeprint", off);
    return () => window.removeEventListener("beforeprint", off);
  }, []);

  const actives: Comp[] = report.active_comps ?? [];
  const solds: Comp[] = report.sold_comps ?? [];
  const upgrades: { description: string; amount: number }[] = report.upgrade_items ?? [];
  const upgradeTotal = upgrades.reduce((s, u) => s + (Number(u.amount) || 0), 0);
  const pres = report.presentation ?? {};
  const include: string[] = Array.isArray(pres.include) ? pres.include : [];
  const reviewsSource = pres.reviews_source === "static" ? "static" : "elfsight";
  const agent = { ...DEFAULT_AGENT, ...(pres.agent ?? {}) };
  const agentFirst = agent.name.split(" ")[0] || "Rohit";
  const clientName = pres.client_name || leadName || "";
  const ybRaw = (report.year_built ?? "").toString().trim();
  let yearLabel = "—";
  if (/^\d{4}$/.test(ybRaw)) {
    const age = new Date().getFullYear() - parseInt(ybRaw, 10);
    yearLabel = age >= 0 ? `${ybRaw} (${age} yrs old)` : ybRaw;
  } else if (ybRaw) {
    yearLabel = ybRaw;
  }
  const has = (k: string) => include.includes(k);
  const nearby: { name: string; kind: string; distKm: number }[] = pres.nearby_places ?? [];

  // Shared market stats (sold section + auto summary).
  const soldPrices = solds.map((s: any) => Number(s.price)).filter((p) => p > 0).sort((a, b) => a - b);
  const avgSold = soldPrices.length ? Math.round(soldPrices.reduce((a, b) => a + b, 0) / soldPrices.length) : 0;
  const medianSold = soldPrices.length ? soldPrices[Math.floor(soldPrices.length / 2)] : 0;
  const soldDoms = solds.map((s: any) => Number(s.dom)).filter((d) => d > 0);
  const avgSoldDom = soldDoms.length ? Math.round(soldDoms.reduce((a, b) => a + b, 0) / soldDoms.length) : null;
  const activePrices = actives.map((a: any) => Number(a.ListPrice)).filter((p) => p > 0);
  const avgActive = activePrices.length ? Math.round(activePrices.reduce((a, b) => a + b, 0) / activePrices.length) : 0;
  const coopRate = rec >= 1000000 ? 0.025 : 0.02;
  const estSavings = rec ? Math.round(rec * (0.05 - (0.01 + coopRate))) : 0;

  const summaryText = [
    `This market analysis for ${fullAddress}${clientName ? `, prepared for ${clientName}` : ""}`,
    rec ? ` suggests a list price of ${money(rec)}${report.price_low && report.price_high ? ` within a range of ${money(report.price_low)} to ${money(report.price_high)}` : ""}` : " reflects current market conditions",
    solds.length ? `, supported by ${solds.length} recent sold comparable${solds.length > 1 ? "s" : ""}${avgSold ? ` averaging ${money(avgSold)}` : ""}${avgSoldDom != null ? ` with an average of ${avgSoldDom} days on market` : ""}` : "",
    actives.length ? `${solds.length ? " and" : ","} ${actives.length} nearby active listing${actives.length > 1 ? "s" : ""}${avgActive ? ` averaging ${money(avgActive)}` : ""}` : "",
    ".",
    estSavings ? ` With GetSetSold's 1% listing model, the estimated commission savings versus a traditional 5% structure are approximately ${money(estSavings)}.` : "",
  ].join("");

  // Section navigator (jump links).
  const navItems: { label: string; id: string }[] = [
    { label: "Subject Property", id: "sec-subject" },
    { label: "Price Recommendation", id: "sec-pricing" },
  ];
  if (actives.length) navItems.push({ label: `Active Listings (${actives.length})`, id: "sec-actives" });
  if (solds.length) navItems.push({ label: `Sold (${solds.length})`, id: "sec-solds" });
  if (has("nearby") && nearby.length) navItems.push({ label: "Nearby", id: "sec-nearby" });
  if (rec) navItems.push({ label: "Commission", id: "sec-commission" });
  if (has("agent")) navItems.push({ label: "Your Agent", id: "sec-agent" });
  if (has("why")) navItems.push({ label: "Why List With Me", id: "sec-why" });
  if (has("comparison")) navItems.push({ label: "Value Proposition", id: "sec-comparison" });
  if (has("marketing")) navItems.push({ label: "Marketing", id: "sec-marketing" });
  if (has("reasons")) navItems.push({ label: "20 Reasons", id: "sec-reasons" });
  if (has("reviews")) navItems.push({ label: "Reviews", id: "sec-reviews" });
  navItems.push({ label: "Summary", id: "sec-summary" });
  if (has("cta")) navItems.push({ label: "Next Steps", id: "sec-cta" });

  const b = branding ?? {};
  const topLine = [
    b.header_tagline || "Rohit K Sharma | Real Estate Agent",
    b.header_name || "Lombard Group Real Estate Inc., Brokerage",
    b.header_phone || "(416)-605-7488",
    b.header_email || "rohit@getsetsold.com",
  ].filter(Boolean).join(" · ");
  const shortBrand = b.header_tagline || "Rohit K Sharma | Real Estate Agent";
  const reportDate = report.created_at ? new Date(report.created_at).toISOString().slice(0, 10) : "";

  const NEARBY_GROUPS: [string, string, string][] = [
    ["school", "Schools", "cap"],
    ["park", "Parks & Green Space", "tree"],
    ["grocery", "Grocery & Essentials", "cart"],
  ];

  return (
    <div className={`cma-root${dark ? " cma-dark" : ""}`}>
      {/* Fixed website-style header (screen only) */}
      <div className="cma-fixedhead cma-no-print">
        <div className="cma-fh-inner">
          <div className="cma-fh-brand">{topLine}</div>
          <div className="cma-fh-main">
            <div className="cma-fh-titles">
              <div className="cma-fh-brandshort">{shortBrand}</div>
              <div className="cma-fh-logo">GETSETSOLD<span>.ca</span></div>
              <div className="cma-fh-title">Comparative Market Analysis</div>
              <div className="cma-fh-date">{reportDate}</div>
            </div>
            <div className="cma-fh-icons">
              <button type="button" className="cma-fh-iconbtn" onClick={() => setDark(!dark)} aria-pressed={dark} aria-label="Toggle dark mode">{dark ? "☾" : "☀"}</button>
              <span className="cma-fh-div" aria-hidden="true" />
              <button type="button" className="cma-fh-iconbtn" onClick={() => window.print()} aria-label="Download PDF">⤓</button>
              <span className="cma-fh-div" aria-hidden="true" />
              <span className="cma-navrel">
                <button type="button" className="cma-fh-iconbtn" onClick={() => setNavOpen(!navOpen)} aria-expanded={navOpen} aria-haspopup="true" aria-label="Navigation">☰</button>
                {navOpen && (
                  <>
                    <div className="cma-navoverlay" onClick={() => setNavOpen(false)} />
                    <nav className="cma-navmenu" aria-label="Report sections">
                      {navItems.map((n) => (
                        <a key={n.id} href={`#${n.id}`} onClick={() => setNavOpen(false)}>{n.label}</a>
                      ))}
                    </nav>
                  </>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="cma">
      {/* Print header (print/PDF only) */}
      <div className="cma-printhead">
        <div className="cma-topbar">{topLine}</div>
        <header className="cma-head">
          <div>
            <div className="cma-brand">GETSETSOLD<span>.ca</span></div>
            <div className="cma-sub">Comparative Market Analysis</div>
          </div>
          <div className="cma-meta">
            <div>{reportDate}</div>
            {clientName && <div>Prepared for {clientName}</div>}
          </div>
        </header>
      </div>

      {/* Subject property */}
      <section id="sec-subject">
        <h2>Subject Property</h2>
        <div className="cma-address">{report.address}{report.city ? `, ${report.city}` : ""}</div>
        {clientName && <div className="cma-prepared">Prepared for <strong>{clientName}</strong></div>}
        <div className="cma-kv">
          <div><span>Type</span><strong>{report.property_type || "—"}</strong></div>
          <div><span>Beds</span><strong>{report.beds ?? "—"}</strong></div>
          <div><span>Baths</span><strong>{report.baths ?? "—"}</strong></div>
          <div><span>Sqft</span><strong>{report.sqft ? (isNaN(Number(report.sqft)) ? report.sqft : Number(report.sqft).toLocaleString()) : "—"}</strong></div>
          <div><span>Lot size</span><strong>{report.lot_size || "—"}</strong></div>
          <div><span>Year built / Age</span><strong>{yearLabel}</strong></div>
        </div>
        {report.upgrades && <p className="cma-notes"><strong>Notes:</strong> {report.upgrades}</p>}
      </section>

      {/* Pricing */}
      <section id="sec-pricing">
        <h2>Pricing Recommendation</h2>
        {!!upgrades.length && (
          <div className="cma-table-wrap">
            <table className="cma-adj">
              <thead><tr><th>Upgrade / adjustment</th><th className="r">Value added</th></tr></thead>
              <tbody>
                {upgrades.map((u, i) => (
                  <tr key={i}><td>{u.description || "Upgrade"}</td><td className="r">+{money(u.amount)}</td></tr>
                ))}
                <tr className="cma-save"><td>Total adjustments</td><td className="r">+{money(upgradeTotal)}</td></tr>
              </tbody>
            </table>
          </div>
        )}
        <div className="cma-bars cols-3" style={{ marginBottom: 12 }}>
          {report.price_low ? <Bar value={money(report.price_low)} label="Range low" /> : null}
          <Bar highlight value={money(report.recommended_price)} label="Recommended list price" />
          {report.price_high ? <Bar value={money(report.price_high)} label="Range high" /> : null}
        </div>
        {report.pricing_notes && <p className="cma-notes">{report.pricing_notes}</p>}
      </section>

      {/* Active comps */}
      {!!actives.length && (
        <section id="sec-actives">
          <h2>Active Listings Nearby ({actives.length})</h2>
          <div className="cma-listings">
            {actives.map((a: any, i: number) => {
              const dom = a._dom ?? (a.OriginalEntryTimestamp
                ? Math.max(0, Math.round((Date.now() - new Date(a.OriginalEntryTimestamp).getTime()) / 86400000)) : null);
              return (
                <div key={i} className="cma-listing">
                  {a.Media
                    ? <img src={a.Media} alt={a.UnparsedAddress ?? "Listing photo"} loading="lazy" />
                    : <div className="cma-noimg">No photo</div>}
                  <div className="cma-listing-body">
                    <div className="cma-listing-price">
                      {money(a.ListPrice)}
                      {dom != null && <span className="cma-dom">{dom} DOM</span>}
                    </div>
                    <div className="cma-listing-addr">{a.UnparsedAddress}{a.City ? `, ${a.City}` : ""}</div>
                    <div className="cma-listing-meta">
                      {[a.BedroomsTotal != null && `${a.BedroomsTotal}bd`,
                        a.BathroomsTotalInteger != null && `${a.BathroomsTotalInteger}ba`,
                        a.AboveGradeFinishedArea && `${Number(a.AboveGradeFinishedArea).toLocaleString()} sf`,
                        a._distKm != null && `${Number(a._distKm).toFixed(1)} km away`]
                        .filter(Boolean).join(" · ") || "—"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Sold comps */}
      {!!solds.length && (
        <section id="sec-solds">
          <h2>Recent Sold Comparables ({solds.length})</h2>
          {!!soldPrices.length && (
            <div className="cma-bars cols-5" style={{ marginBottom: 16 }}>
              <Bar value={money(soldPrices[0])} label="Low" />
              <Bar value={money(soldPrices[soldPrices.length - 1])} label="High" />
              <Bar value={money(medianSold)} label="Median" />
              <Bar value={money(avgSold)} label="Average" />
              {avgSoldDom != null && <Bar value={String(avgSoldDom)} label="Avg DOM" />}
            </div>
          )}
          <div className="cma-solds">
            {solds.map((s: any, i: number) => (
              <div key={i} className="cma-sold">
                <div className="cma-sold-top">
                  <div className="cma-sold-price">{money(s.price)}</div>
                  {s.dom ? <span className="cma-dom">{s.dom} DOM</span> : null}
                </div>
                <div className="cma-sold-addr">{s.address}</div>
                <div className="cma-sold-meta">
                  {[s.date, [s.beds && s.beds + "bd", s.baths && s.baths + "ba", s.sqft && String(s.sqft).replace(/,/g, "") + "sf"].filter(Boolean).join(" · ")]
                    .filter(Boolean).join("  ·  ") || "—"}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Nearby places */}
      {has("nearby") && !!nearby.length && (
        <section id="sec-nearby">
          <h2>Nearby Places</h2>
          <p className="cma-notes" style={{ marginBottom: 16 }}>Schools, parks, and everyday essentials within minutes — one more reason this location holds its value.</p>
          <div className="cma-nearby">
            {NEARBY_GROUPS.map(([kind, label, icon]) => {
              const items = nearby.filter((p) => p.kind === kind);
              if (!items.length) return null;
              return (
                <div key={kind} className="cma-nearby-group">
                  <div className="cma-nearby-head"><span className="cma-mkt-icon">{ICONS[icon]}</span><strong>{label}</strong></div>
                  <ul>
                    {items.map((p, i) => (
                      <li key={i}><span>{p.name}</span><span className="cma-nearby-dist">{p.distKm} km</span></li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Commission — interactive calculator, prefilled with the suggested price */}
      {!!rec && (
        <section id="sec-commission">
          <h2>Commission Comparison</h2>
          <div className="cma-calc-addr">{report.address}{report.city ? `, ${report.city}` : ""}</div>
          <label className="cma-calc-label" htmlFor="cma-price">
            <span className="cma-calc-arrow">↓</span> Enter Property Asking Price ($) to see your savings
          </label>
          <input
            id="cma-price"
            className="cma-calc-input"
            type="text"
            inputMode="numeric"
            value={calcPrice ? calcPrice.toLocaleString() : ""}
            onChange={(e) => {
              const v = parseInt(e.target.value.replace(/[^0-9]/g, ""), 10);
              setCalcPrice(isNaN(v) ? 0 : v);
            }}
          />
          {(() => {
            const p = calcPrice || 0;
            const coopRate = p >= 1000000 ? 0.025 : 0.02;
            const totalRate = 0.01 + coopRate;
            const totalPct = coopRate === 0.02 ? "3%" : "3.5%";
            const pctLabel = (r: number) => `${parseFloat((r * 100).toFixed(2))}%`;
            return (
              <>
                <div className="cma-calc-head">Listing side commission</div>
                <div className="cma-bars cols-4">
                  {[0.01, 0.02, 0.025, 0.03].map((r) => {
                    const first = r === 0.01;
                    return (
                      <Bar
                        key={r}
                        highlight={first}
                        value={pctLabel(r)}
                        sub={money(Math.round(p * r))}
                        label={first ? "GetSetSold" : "Typical agent"}
                        caption={first ? `You save ${money(Math.round(p * 0.015))}` : `${money(Math.round(p * (r - 0.01)))} more`}
                        captionClass={first ? "save" : "more"}
                      />
                    );
                  })}
                </div>
                <div className="cma-calc-head">Total commission (listing + buyer agent)</div>
                <div className="cma-bars cols-2">
                  <Bar
                    highlight
                    value={`${totalPct} Total`}
                    sub={money(Math.round(p * totalRate))}
                    label="GetSetSold"
                    caption={`You save ${money(Math.round(p * (0.05 - totalRate)))}`}
                    captionClass="save"
                  />
                  <Bar
                    value="5% Total"
                    sub={money(Math.round(p * 0.05))}
                    label="Traditional"
                    caption={`${money(Math.round(p * (0.05 - totalRate)))} more`}
                    captionClass="more"
                  />
                </div>
                <p className="cma-fine">Buyer-agent co-op ({coopRate === 0.02 ? "2% under $1M" : "2.5% over $1M"}) is paid to the buyer's brokerage. HST extra.</p>
              </>
            );
          })()}
        </section>
      )}

      {/* ===== Listing presentation sections ===== */}

      {has("agent") && (
        <section id="sec-agent" className="cma-page">
          <h2>Meet Your Agent</h2>
          <div className="cma-agent">
            {agent.photo_svg
              ? <div className="cma-agent-photo cma-agent-svg" dangerouslySetInnerHTML={{ __html: agent.photo_svg }} />
              : agent.photo
              ? <img src={agent.photo} alt={agent.name} className="cma-agent-photo" />
              : <div className="cma-agent-photo cma-agent-initials">{agent.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2)}</div>}
            <div>
              <div className="cma-agent-name">{agent.name}</div>
              <div className="cma-agent-tag">{agent.tagline}</div>
              <p className="cma-notes" style={{ marginTop: 0 }}>{agent.bio}</p>
            </div>
          </div>
          <div className="cma-bars cols-4" style={{ marginTop: 16 }}>
            {[["20+", "Properties Sold"], ["1%", "Commission Rate"], ["100%", "Client Satisfaction"], ["$2M+", "Saved for Clients"]].map(([n, l]) => (
              <Bar key={l} value={n} label={l} />
            ))}
          </div>
        </section>
      )}

      {has("why") && (
        <section id="sec-why" className="cma-page">
          <h2>Why List With Me</h2>
          <p className="cma-notes" style={{ marginBottom: 16 }}>Every service you'd expect from a traditional full-commission agent, plus innovative extras that save you time and money.</p>
          <div className="cma-why">
            {WHY_FEATURES.map(([f, icon]) => (
              <div key={f} className="cma-why-card">
                <span className="cma-why-icon">{ICONS[icon]}</span>
                <span>{f}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {has("comparison") && (
        <section className="cma-page" id="sec-comparison">
          <div className="cma-vp-eyebrow">The Value Proposition</div>
          <div className="cma-vp-title">Full Service. Fraction of the Cost.</div>
          <p className="cma-vp-sub">Why pay 2.5% when you get everything at 1%? Plus free cleaning, photography, weekly reports, and social media promotion included.</p>
          <div className="cma-table-wrap">
            <table className="cma-vp-table">
              <thead><tr><th>Feature</th><th className="c">Traditional<br />Agent</th><th className="c cma-vp-hl">Rohit Sharma<br />(1%)</th></tr></thead>
              <tbody>
                {COMPARISON.map(([f, t]) => (
                  <tr key={f}>
                    <td>{f}</td>
                    <td className="c">{t === "yes" ? <span className="cma-vp-yes">✓</span> : <span className="cma-vp-maybe">?</span>}</td>
                    <td className="c cma-vp-hl"><span className="cma-vp-yes">✓</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="cma-vp-banner">All For Just 1% Listing Fee</div>
        </section>
      )}

      {has("marketing") && (
        <section id="sec-marketing" className="cma-page">
          <h2>Marketing Strategy</h2>
          <p className="cma-notes" style={{ marginBottom: 16 }}>Your property receives maximum exposure through a comprehensive, multi-channel approach designed to attract qualified buyers quickly.</p>
          <div className="cma-cards">
            {MARKETING.map(([t, d, icon]) => (
              <div key={t} className="cma-card cma-mkt-card">
                <span className="cma-mkt-icon">{ICONS[icon]}</span>
                <div><strong>{t}</strong><p>{d}</p></div>
              </div>
            ))}
          </div>
        </section>
      )}

      {has("reasons") && (
        <section id="sec-reasons" className="cma-page">
          <h2>20 Reasons to List With Confidence</h2>
          <p className="cma-notes" style={{ marginBottom: 20 }}>A proven, step-by-step process designed to sell your home faster and for more money.</p>
          <div className="cma-reasons-grid">
            {REASONS.map(([r, sub], i) => (
              <div key={i} className="cma-reason">
                <div className="cma-reason-num">{String(i + 1).padStart(2, "0")}</div>
                <div className="cma-reason-title">{r}</div>
                <div className="cma-reason-sub">{sub}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {has("reviews") && (
        <section id="sec-reviews" className="cma-page">
          <h2>What Clients Say</h2>
          {reviewsSource === "elfsight" ? (
            <>
              <script src="https://static.elfsight.com/platform/platform.js" data-use-service-core defer></script>
              <div className={`elfsight-app-${ELFSIGHT_APP_ID}`} data-elfsight-app-lazy></div>
            </>
          ) : (
            <>
              <div className="cma-reviews-head">
                <div><strong className="cma-reviews-score">5.0</strong><span> average rating</span></div>
                <div><strong>63+</strong><span> Google reviews</span></div>
              </div>
              <div className="cma-reviews">
                {REVIEWS.map(([n, q]) => (
                  <div key={n} className="cma-review">
                    <div className="cma-stars">★★★★★</div>
                    <p>"{q}"</p>
                    <div className="cma-reviewer">— {n}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {/* Auto summary */}
      <section id="sec-summary">
        <h2>Report Summary</h2>
        <p className="cma-notes cma-summary">{summaryText}</p>
        {!!(rec || avgSold || estSavings) && (
          <div className="cma-bars cols-3" style={{ marginTop: 16 }}>
            {!!rec && <Bar highlight value={money(rec)} label="Suggested list price" />}
            {!!avgSold && <Bar value={money(avgSold)} label="Avg sold nearby" />}
            {!!estSavings && <Bar value={money(estSavings)} label="Est. commission savings" />}
          </div>
        )}
      </section>

      {has("cta") && (
        <section id="sec-cta" className="cma-page">
          <h2>Next Steps</h2>
          <div className="cma-cta">
            <div className="cma-cta-title">Ready to Make Your Move?</div>
            <p>Get expert guidance, full-service representation, and keep more money in your pocket.</p>
            <button type="button" className="cma-cta-btn cma-no-print" onClick={() => { setCtaOpen(true); setCtaState("idle"); setCtaError(""); }}>
              List With {agentFirst} <span aria-hidden="true">→</span>
            </button>
            <div className="cma-cta-contact">
              <div><strong>{agent.name}</strong>, REALTOR®</div>
              <div>{agent.brokerage}</div>
              <div>{agent.phone} · {agent.email}</div>
            </div>
          </div>
        </section>
      )}

      <footer>
        <div>{topLine}</div>
        <div className="cma-fine">Opinion of value based on available market data — not an appraisal. Market conditions change; review pricing before listing.</div>
      </footer>

      <style>{`
        .cma { max-width: 860px; margin: 0 auto; padding: 28px 20px; background: #f5f5f5; color: #111; font-family: -apple-system, 'Segoe UI', sans-serif; }
        /* fixed website-style header: full width, content centered */
        .cma-root { background: #f5f5f5; }
        .cma-fixedhead { position: sticky; top: 0; z-index: 50; background: #fff; border-bottom: 1px solid #e2e2e2; }
        .cma-fh-inner { max-width: 860px; margin: 0 auto; padding: 10px 20px 12px; }
        .cma-fh-brand { font-size: 12px; color: #666; padding-bottom: 8px; border-bottom: 1px solid #f0f0f0; margin-bottom: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cma-fh-main { display: flex; align-items: center; gap: 16px; }
        .cma-fh-titles { flex: 1; min-width: 0; }
        .cma-fh-brandshort { display: none; }
        .cma-fh-logo { font-size: 23px; font-weight: 800; letter-spacing: -0.5px; line-height: 1.15; }
        .cma-fh-logo span { color: #0066cc; }
        .cma-fh-title { font-size: 14px; font-weight: 700; margin-top: 2px; }
        .cma-fh-date { font-size: 12px; color: #777; }
        .cma-fh-icons { display: flex; align-items: center; flex-shrink: 0; }
        .cma-fh-iconbtn { background: none; border: none; padding: 8px 12px; font-size: 19px; line-height: 1; cursor: pointer; color: #111; }
        .cma-fh-iconbtn:hover { color: #0066cc; }
        .cma-fh-div { width: 1px; height: 22px; background: #e2e2e2; flex-shrink: 0; }
        .cma-navrel { position: relative; display: inline-flex; }
        /* print header */
        .cma-printhead { display: none; }
        .cma-topbar { text-align: center; font-size: 13px; color: #555; padding: 10px 16px; border-bottom: 1px solid #eee; margin-bottom: 20px; }
        .cma-head { display: flex; justify-content: space-between; align-items: flex-start; background: #fff; border: 1px solid #e2e2e2; border-radius: 12px; padding: 20px 24px; margin-bottom: 20px; }
        .cma-brand { font-size: 26px; font-weight: 800; letter-spacing: -0.5px; }
        .cma-brand span { color: #0066cc; }
        .cma-sub { font-size: 13px; color: #555; margin-top: 2px; }
        .cma-meta { text-align: right; font-size: 13px; color: #555; }
        .cma section { background: #fff; border: 1px solid #e2e2e2; border-radius: 12px; padding: 24px; margin-bottom: 20px; }
        .cma h2 { font-size: 19px; font-weight: 800; letter-spacing: 0; border-bottom: 3px solid #111; padding-bottom: 8px; margin: 0 0 16px; }
        .cma-address { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
        .cma-prepared { font-size: 14px; color: #555; margin: 6px 0 16px; }
        .cma-prepared strong { color: #111; }
        .cma-kv { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; border-top: 1px solid #eee; margin-top: 4px; }
        .cma-kv > div { padding: 12px 12px 12px 0; border-bottom: 1px solid #eee; min-width: 0; }
        .cma-kv span { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #777; font-weight: 600; margin-bottom: 4px; }
        .cma-kv strong { font-size: 16px; overflow-wrap: break-word; }
        .cma-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .cma table { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 480px; }
        .cma th { text-align: left; font-size: 11px; text-transform: uppercase; color: #777; padding: 8px; border-bottom: 2px solid #111; white-space: nowrap; }
        .cma td { padding: 8px; border-bottom: 1px solid #eee; }
        .cma td.r, .cma th.r { text-align: right; }
        .cma td.c, .cma th.c { text-align: center; }
        .cma-adj { margin-bottom: 16px; }
        .cma-notes { font-size: 13px; color: #333; margin-top: 8px; line-height: 1.6; }
        .cma-save td { font-weight: 700; }
        .cma-fine { font-size: 11px; color: #888; margin-top: 8px; }
        .cma-listings { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
        .cma-listing { border: 1px solid #e2e2e2; border-radius: 10px; overflow: hidden; background: #fff; min-width: 0; }
        .cma-listing img { width: 100%; height: 150px; object-fit: cover; display: block; }
        .cma-noimg { height: 150px; background: #f4f4f4; display: flex; align-items: center; justify-content: center; color: #999; font-size: 12px; }
        .cma-listing-body { padding: 12px 14px; }
        .cma-listing-price { font-size: 19px; font-weight: 800; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .cma-dom { font-size: 11px; font-weight: 700; background: #111; color: #fff; border-radius: 20px; padding: 2px 9px; white-space: nowrap; }
        .cma-solds { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .cma-sold { border: 1px solid #e2e2e2; border-radius: 10px; padding: 16px; background: #fff; min-width: 0; }
        .cma-sold-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px; }
        .cma-sold-price { font-size: 20px; font-weight: 800; color: #0066cc; }
        .cma-sold-addr { font-size: 14px; font-weight: 600; overflow-wrap: break-word; }
        .cma-sold-meta { font-size: 12px; color: #666; margin-top: 6px; }
        .cma-listing-addr { font-size: 13px; margin: 3px 0 6px; overflow-wrap: break-word; }
        .cma-listing-meta { font-size: 12px; color: #666; }
        .cma-agent { display: flex; gap: 20px; align-items: flex-start; margin-bottom: 16px; }
        .cma-agent-photo { width: 110px; height: 110px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
        .cma-agent-svg { overflow: hidden; display: flex; align-items: center; justify-content: center; background: #f4f4f4; }
        .cma-agent-svg svg { width: 100%; height: 100%; }
        .cma-agent-initials { background: #111; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: 800; }
        .cma-agent-name { font-size: 24px; font-weight: 800; overflow-wrap: break-word; }
        .cma-agent-tag { font-size: 14px; color: #0066cc; font-weight: 600; margin: 4px 0 8px; }
        .cma-why { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
        .cma-why-card { border: 1px solid #e2e2e2; border-radius: 10px; padding: 18px 10px; text-align: center; font-size: 13px; font-weight: 600; line-height: 1.4; background: #fff; min-width: 0; }
        .cma-why-icon { display: flex; justify-content: center; color: #111; margin-bottom: 10px; }
        .cma-cards { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        .cma-card { border: 1px solid #e2e2e2; border-radius: 10px; padding: 16px; font-size: 13px; background: #fff; min-width: 0; }
        .cma-card p { color: #555; margin-top: 4px; font-size: 12px; line-height: 1.5; }
        .cma-mkt-card { display: flex; gap: 12px; align-items: flex-start; }
        .cma-mkt-icon { color: #111; flex-shrink: 0; margin-top: 2px; }
        .cma-reasons-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; }
        .cma-reason { padding: 20px 16px; border-top: 1px solid #eee; min-width: 0; }
        .cma-reason-num { font-size: 34px; font-weight: 800; color: #0066cc; line-height: 1; margin-bottom: 10px; }
        .cma-reason-num::after { content: ""; display: block; width: 40px; height: 3px; background: #111; margin-top: 8px; }
        .cma-reason-title { font-size: 14px; font-weight: 700; line-height: 1.35; margin-bottom: 6px; }
        .cma-reason-sub { font-size: 12px; color: #666; line-height: 1.55; }
        .cma-reviews-head { display: flex; gap: 32px; margin-bottom: 16px; font-size: 14px; color: #555; flex-wrap: wrap; }
        .cma-reviews-score { font-size: 28px; font-weight: 800; color: #111; }
        .cma-reviews { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .cma-review { border: 1px solid #e2e2e2; border-radius: 10px; padding: 20px; font-size: 13px; background: #fff; min-width: 0; }
        .cma-review p { color: #333; line-height: 1.65; margin: 10px 0 12px; font-style: italic; overflow-wrap: break-word; }
        .cma-stars { color: #111; letter-spacing: 3px; font-size: 14px; }
        .cma-reviewer { font-weight: 700; }
        .cma-nearby { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .cma-nearby-group { border: 1px solid #e2e2e2; border-radius: 10px; padding: 16px; min-width: 0; }
        .cma-nearby-head { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; font-size: 14px; }
        .cma-nearby ul { list-style: none; padding: 0; margin: 0; font-size: 13px; }
        .cma-nearby li { display: flex; justify-content: space-between; gap: 8px; padding: 6px 0; border-top: 1px solid #f0f0f0; }
        .cma-nearby-dist { color: #777; font-size: 12px; white-space: nowrap; }
        .cma-cta { border: 2px solid #111; border-radius: 12px; padding: 32px; text-align: center; }
        .cma-cta-title { font-size: 26px; font-weight: 800; margin-bottom: 8px; }
        .cma-cta p { color: #555; font-size: 14px; margin-bottom: 20px; }
        .cma-cta-contact { font-size: 15px; line-height: 1.9; overflow-wrap: break-word; }
        .cma-cta-btn { display: inline-flex; align-items: center; gap: 8px; background: #111; color: #fff; border: none; border-radius: 30px; padding: 14px 32px; font-size: 16px; font-weight: 700; cursor: pointer; margin: 6px 0 22px; transition: background 0.2s; }
        .cma-cta-btn:hover { background: #0066cc; }
        .cma-cta-btn span { font-size: 18px; }
        .cma-cta-btn:disabled { opacity: 0.6; cursor: default; }
        .cma-modal-wrap { position: fixed; inset: 0; background: rgba(0,0,0,0.55); display: flex; align-items: center; justify-content: center; padding: 16px; z-index: 100; }
        .cma-modal { background: #fff; border-radius: 16px; padding: 28px; width: 100%; max-width: 480px; max-height: 90vh; overflow-y: auto; position: relative; color: #111; }
        .cma-modal h3 { font-size: 22px; font-weight: 800; margin: 0 0 6px; }
        .cma-modal-sub { font-size: 13px; color: #555; margin-bottom: 16px; }
        .cma-modal-x { position: absolute; top: 12px; right: 12px; border: none; background: #f0f0f0; width: 32px; height: 32px; border-radius: 50%; font-size: 14px; cursor: pointer; color: #111; }
        .cma-field { display: block; font-size: 13px; font-weight: 600; margin-bottom: 12px; }
        .cma-field input, .cma-field textarea { display: block; width: 100%; margin-top: 6px; border: 1px solid #ddd; border-radius: 10px; padding: 11px 14px; font-size: 15px; font-weight: 400; font-family: inherit; background: #fff; color: #111; }
        .cma-field input:focus, .cma-field textarea:focus { outline: 2px solid #0066cc; border-color: #0066cc; }
        .cma-field textarea { resize: vertical; }
        .cma-field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .cma-honey { position: absolute; left: -9999px; }
        .cma-modal-send { width: 100%; justify-content: center; margin: 4px 0 0; }
        .cma-modal-err { color: #dc2626; font-size: 13px; margin-bottom: 10px; }
        .cma-modal-done { text-align: center; padding: 12px 0; }
        .cma-modal-done h3 { margin-bottom: 8px; }
        .cma-modal-done p { color: #555; font-size: 14px; margin-bottom: 20px; }
        .cma-modal-done .cma-cta-btn { margin-bottom: 0; }
        .cma-modal-check { width: 56px; height: 56px; border-radius: 50%; background: #16a34a; color: #fff; font-size: 28px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; }
        .cma footer { background: #fff; border: 1px solid #e2e2e2; border-radius: 12px; padding: 20px 24px; margin-top: 4px; font-size: 13px; text-align: center; color: #555; }
        .cma section { scroll-margin-top: 140px; }
        /* section navigator (icon button + dropdown menu) */
        .cma-navoverlay { position: fixed; inset: 0; z-index: 39; }
        .cma-navmenu { position: absolute; top: calc(100% + 8px); right: 0; background: #fff; border: 1px solid #e2e2e2; border-radius: 12px; box-shadow: 0 12px 32px rgba(0,0,0,0.14); min-width: 250px; max-width: 92vw; padding: 4px 0; z-index: 40; }
        .cma-navmenu a { display: block; padding: 11px 18px; font-size: 14px; font-weight: 600; color: #333; text-decoration: none; border-bottom: 1px solid #f0f0f0; }
        .cma-navmenu a:last-child { border-bottom: none; }
        .cma-navmenu a:hover { background: #f5f5f5; color: #111; }
        /* value proposition */
        .cma-vp-eyebrow { text-align: center; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; font-weight: 700; color: #777; margin-bottom: 10px; }
        .cma-vp-title { text-align: center; font-size: 27px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 8px; }
        .cma-vp-sub { text-align: center; color: #555; font-size: 14px; line-height: 1.6; max-width: 600px; margin: 0 auto 18px; }
        .cma-vp-table { min-width: 0; }
        .cma-vp-table .c { width: 72px; }
        .cma-vp-table td { overflow-wrap: break-word; }
        .cma-vp-table th.cma-vp-hl, .cma-vp-table td.cma-vp-hl { background: #f5f5f5; }
        .cma-vp-yes { color: #111; font-weight: 800; font-size: 17px; }
        .cma-vp-maybe { color: #aaa; font-weight: 800; font-size: 15px; }
        .cma-vp-banner { background: #111; color: #fff; text-align: center; font-weight: 800; font-size: 17px; border-radius: 10px; padding: 16px; margin-top: 18px; }
        .cma-summary { font-size: 14px !important; line-height: 1.75 !important; }
        /* bar cards: dark color lives in the block header only */
        .cma-bars { display: grid; gap: 12px; }
        .cma-bars.cols-2 { grid-template-columns: repeat(2, 1fr); }
        .cma-bars.cols-3 { grid-template-columns: repeat(3, 1fr); }
        .cma-bars.cols-4 { grid-template-columns: repeat(4, 1fr); }
        .cma-bars.cols-5 { grid-template-columns: repeat(5, 1fr); }
        .cma-bar { border: 1px solid #e2e2e2; border-radius: 12px; overflow: hidden; background: #fff; text-align: center; min-width: 0; }
        .cma-bar-top { background: #111; color: #fff; padding: 16px 8px; }
        .cma-bar.hl .cma-bar-top { background: #0066cc; }
        .cma-bar-value { font-size: 24px; font-weight: 800; line-height: 1.15; overflow-wrap: break-word; }
        .cma-bar-sub { font-size: 15px; color: #bbb; margin-top: 4px; font-weight: 600; }
        .cma-bar-body { padding: 12px 8px 14px; }
        .cma-bar-label { font-size: 11px; letter-spacing: 1.2px; color: #777; text-transform: uppercase; font-weight: 700; }
        .cma-bar-cap { font-size: 14px; font-weight: 700; margin-top: 6px; }
        .cma-bar-cap.save { color: #16a34a; }
        .cma-bar-cap.more { color: #dc2626; }
        .cma-calc-label { display: block; text-align: center; font-size: 14px; font-weight: 600; color: #444; margin-bottom: 8px; }
        .cma-calc-addr { text-align: center; font-size: 19px; font-weight: 800; margin-bottom: 8px; overflow-wrap: break-word; }
        .cma-calc-arrow { display: inline-block; margin-right: 6px; color: #0066cc; font-weight: 800; }
        .cma-calc-input { display: block; width: 100%; max-width: 420px; margin: 0 auto 20px; border: 1px solid #ddd; border-radius: 12px; padding: 14px 18px; font-size: 22px; font-weight: 700; text-align: center; background: #fff; color: #111; }
        .cma-calc-input:focus { outline: 2px solid #0066cc; border-color: #0066cc; }
        .cma-calc-head { text-align: center; font-size: 13px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: #111; margin: 22px 0 4px; padding-bottom: 10px; border-bottom: 2px solid #111; }
        /* dark mode: dark color in blocks only — page stays light */
        .cma-root.cma-dark { background: #f5f5f5; color: #111; }
        .cma-root.cma-dark .cma-topbar { color: #555; border-color: #e2e2e2; }
        .cma-root.cma-dark .cma-fixedhead { background: #141414; border-color: #141414; }
        .cma-root.cma-dark .cma-fh-brand { color: #999; border-color: #2e2e2e; }
        .cma-root.cma-dark .cma-fh-brandshort { color: #ddd; }
        .cma-root.cma-dark .cma-fh-logo { color: #f2f2f2; }
        .cma-root.cma-dark .cma-fh-logo span { color: #4da3ff; }
        .cma-root.cma-dark .cma-fh-title { color: #f2f2f2; }
        .cma-root.cma-dark .cma-fh-date { color: #999; }
        .cma-root.cma-dark .cma-head, .cma-root.cma-dark section, .cma-root.cma-dark footer { background: #141414; border-color: #141414; color: #f2f2f2; }
        .cma-root.cma-dark h2 { border-color: #f2f2f2; color: #f2f2f2; }
        .cma-root.cma-dark .cma-brand span { color: #4da3ff; }
        .cma-root.cma-dark .cma-sub, .cma-root.cma-dark .cma-meta { color: #aaa; }
        .cma-root.cma-dark .cma-notes, .cma-root.cma-dark .cma-review p { color: #ccc; }
        .cma-root.cma-dark .cma-fine, .cma-root.cma-dark .cma-listing-meta, .cma-root.cma-dark .cma-nearby-dist, .cma-root.cma-dark .cma-reason-sub, .cma-root.cma-dark .cma-sold-meta { color: #999; }
        .cma-root.cma-dark th { color: #999; border-color: #f2f2f2; }
        .cma-root.cma-dark td { border-color: #2e2e2e; }
        .cma-root.cma-dark .cma-table-wrap table { color: #f2f2f2; }
        .cma-root.cma-dark .cma-listing, .cma-root.cma-dark .cma-why-card, .cma-root.cma-dark .cma-card, .cma-root.cma-dark .cma-review, .cma-root.cma-dark .cma-nearby-group, .cma-root.cma-dark .cma-sold { background: #000; border-color: #2e2e2e; }
        .cma-root.cma-dark .cma-noimg { background: #1c1c1c; color: #777; }
        .cma-root.cma-dark .cma-card p { color: #aaa; }
        .cma-root.cma-dark .cma-why-icon, .cma-root.cma-dark .cma-mkt-icon { color: #f2f2f2; }
        .cma-root.cma-dark .cma-stars, .cma-root.cma-dark .cma-reviews-score { color: #f2f2f2; }
        .cma-root.cma-dark .cma-dom { background: #f2f2f2; color: #000; }
        .cma-root.cma-dark .cma-reason { border-color: #2e2e2e; }
        .cma-root.cma-dark .cma-reason-num { color: #4da3ff; }
        .cma-root.cma-dark .cma-reason-num::after { background: #f2f2f2; }
        .cma-root.cma-dark .cma-reason-title { color: #f2f2f2; }
        .cma-root.cma-dark .cma-cta { border-color: #f2f2f2; }
        .cma-root.cma-dark .cma-cta p { color: #aaa; }
        .cma-root.cma-dark .cma-bar { background: #000; border-color: #2e2e2e; }
        .cma-root.cma-dark .cma-bar-top { background: #f5f5f5; color: #111; }
        .cma-root.cma-dark .cma-bar.hl .cma-bar-top { background: #0066cc; color: #fff; }
        .cma-root.cma-dark .cma-bar-sub { color: #555; }
        .cma-root.cma-dark .cma-bar-label { color: #999; }
        .cma-root.cma-dark .cma-calc-label { color: #aaa; }
        .cma-root.cma-dark .cma-calc-addr { color: #f2f2f2; }
        .cma-root.cma-dark .cma-calc-arrow { color: #4da3ff; }
        .cma-root.cma-dark .cma-calc-input { background: #000; border-color: #3a3a3a; color: #f2f2f2; }
        .cma-root.cma-dark .cma-calc-head { color: #f2f2f2; border-color: #f2f2f2; }
        .cma-root.cma-dark .cma-agent-tag { color: #4da3ff; }
        .cma-root.cma-dark .cma-agent-name { color: #f2f2f2; }
        .cma-root.cma-dark .cma-address { color: #f2f2f2; }
        .cma-root.cma-dark .cma-prepared { color: #aaa; }
        .cma-root.cma-dark .cma-prepared strong { color: #f2f2f2; }
        .cma-root.cma-dark .cma-kv { border-color: #2e2e2e; }
        .cma-root.cma-dark .cma-kv > div { border-color: #2e2e2e; }
        .cma-root.cma-dark .cma-kv span { color: #999; }
        .cma-root.cma-dark .cma-kv strong { color: #f2f2f2; }
        .cma-root.cma-dark .cma-sold-price { color: #4da3ff; }
        .cma-root.cma-dark .cma-sold-addr { color: #f2f2f2; }
        .cma-root.cma-dark .cma-listing-price { color: #f2f2f2; }
        .cma-root.cma-dark .cma-listing-addr { color: #ddd; }
        .cma-root.cma-dark .cma-nearby-head strong { color: #f2f2f2; }
        .cma-root.cma-dark .cma-nearby li { border-color: #2e2e2e; color: #ddd; }
        .cma-root.cma-dark .cma-cta-title { color: #f2f2f2; }
        .cma-root.cma-dark .cma-cta-btn { background: #f5f5f5; color: #111; }
        .cma-root.cma-dark .cma-cta-btn:hover { background: #0066cc; color: #fff; }
        .cma-root.cma-dark .cma-cta-contact { color: #ddd; }
        .cma-root.cma-dark .cma-rec strong { color: #4da3ff; }
        .cma-root.cma-dark .cma-price-row strong { color: #f2f2f2; }
        .cma-root.cma-dark .cma-price-row span { color: #999; }
        .cma-root.cma-dark .cma-navmenu { background: #000; border-color: #2e2e2e; }
        .cma-root.cma-dark .cma-navmenu a { color: #ddd; }
        .cma-root.cma-dark .cma-navmenu a:hover { background: #1e1e1e; color: #fff; }
        .cma-root.cma-dark .cma-vp-eyebrow { color: #999; }
        .cma-root.cma-dark .cma-vp-title { color: #f2f2f2; }
        .cma-root.cma-dark .cma-vp-sub { color: #aaa; }
        .cma-root.cma-dark .cma-vp-table th.cma-vp-hl, .cma-root.cma-dark .cma-vp-table td.cma-vp-hl { background: #1c1c1c; }
        .cma-root.cma-dark .cma-vp-yes { color: #f2f2f2; }
        .cma-root.cma-dark .cma-vp-maybe { color: #666; }
        .cma-root.cma-dark .cma-vp-banner { background: #f5f5f5; color: #111; }
        .cma-root.cma-dark .cma-fh-iconbtn { color: #f2f2f2; }
        .cma-root.cma-dark .cma-fh-iconbtn:hover { color: #4da3ff; }
        .cma-root.cma-dark .cma-fh-div { background: #3a3a3a; }
        @media (max-width: 640px) {
          .cma { padding: 16px 12px; overflow-x: clip; }
          .cma-fh-inner { padding: 10px 12px; }
          .cma-fh-brand { display: none; }
          .cma-fh-main { flex-wrap: wrap; gap: 8px; }
          .cma-fh-titles { flex: 1 1 100%; }
          .cma-fh-brandshort { display: block; font-size: 11px; font-weight: 700; }
          .cma-fh-logo { display: none; }
          .cma-fh-title { font-size: 12px; margin-top: 1px; }
          .cma-fh-date { font-size: 11px; }
          .cma-fh-icons { flex: 1 1 100%; border-top: 1px solid #f0f0f0; padding-top: 4px; justify-content: flex-end; }
          .cma-root.cma-dark .cma-fh-icons { border-color: #2e2e2e; }
          .cma-fh-iconbtn { padding: 8px 14px; }
          .cma section { padding: 18px 16px; }
          .cma-head { flex-direction: column; gap: 10px; }
          .cma-meta { text-align: left; }
          .cma-listings { grid-template-columns: 1fr; }
          .cma-solds { grid-template-columns: 1fr; }
          .cma-why { grid-template-columns: repeat(2, 1fr); }
          .cma-reviews { grid-template-columns: 1fr; }
          .cma-cards { grid-template-columns: 1fr; }
          .cma-reasons-grid { grid-template-columns: repeat(2, 1fr); }
          .cma-nearby { grid-template-columns: 1fr; }
          .cma-kv { grid-template-columns: repeat(2, 1fr); }
          .cma-agent { flex-direction: column; }
          .cma-bars.cols-5, .cma-bars.cols-4 { grid-template-columns: repeat(2, 1fr); }
          .cma-bars.cols-3, .cma-bars.cols-2 { grid-template-columns: 1fr; }
          .cma-field-row { grid-template-columns: 1fr; }
          .cma-modal { padding: 22px 18px; }
          .cma-vp-title { font-size: 22px; }
          .cma-vp-table th, .cma-vp-table td { padding: 8px 6px; font-size: 12px; }
          .cma-vp-table .c { width: 58px; }
          .cma-topbar { font-size: 12px; }
        }
        @media print {
          .cma { padding: 0; max-width: none; background: #fff; color: #111; }
          .cma-no-print { display: none !important; }
          .cma-printhead { display: block; }
          .cma-head, .cma section, .cma footer { border-color: #ddd; background: #fff; }
          .cma-page { page-break-before: always; }
          .cma-listing, .cma-why-card, .cma-card, .cma-review, .cma-reason, .cma-bar, .cma-sold { break-inside: avoid; }
          .cma-table-wrap { overflow: visible; }
          .cma-bar-top { background: #fff !important; color: #111 !important; border-bottom: 2px solid #111; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .cma-bar.hl .cma-bar-top { color: #0066cc !important; }
          .cma-bar-sub { color: #555 !important; }
          .cma-calc-input { border-color: #999; }
          .cma-vp-table th.cma-vp-hl, .cma-vp-table td.cma-vp-hl { background: #f0f0f0 !important; }
          .cma-vp-banner { background: #111 !important; color: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      {ctaOpen && (
        <div className="cma-modal-wrap cma-no-print" onClick={() => setCtaOpen(false)} role="dialog" aria-modal="true" aria-label={`List with ${agentFirst}`}>
          <div className="cma-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="cma-modal-x" onClick={() => setCtaOpen(false)} aria-label="Close">✕</button>
            {ctaState === "done" ? (
              <div className="cma-modal-done">
                <div className="cma-modal-check">✓</div>
                <h3>Message sent!</h3>
                <p>{agentFirst} will be in touch shortly about {fullAddress}.</p>
                <button type="button" className="cma-cta-btn" onClick={() => setCtaOpen(false)}>Done</button>
              </div>
            ) : (
              <form onSubmit={submitCta}>
                <h3>List With {agentFirst}</h3>
                <p className="cma-modal-sub">Send {agentFirst} a message about <strong>{fullAddress}</strong>.</p>
                <label className="cma-field">Name
                  <input name="name" required autoComplete="name" defaultValue={leadName ?? ""} placeholder="Your full name" />
                </label>
                <div className="cma-field-row">
                  <label className="cma-field">Phone
                    <input name="phone" type="tel" autoComplete="tel" placeholder="416-555-0100" />
                  </label>
                  <label className="cma-field">Email
                    <input name="email" type="email" required autoComplete="email" placeholder="you@email.com" />
                  </label>
                </div>
                <label className="cma-field">Message
                  <textarea name="message" rows={4} defaultValue={`Hi ${agentFirst}, I'm interested in listing my property at ${fullAddress}. Please contact me to discuss the next steps.`} />
                </label>
                <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="cma-honey" />
                {ctaState === "error" && <p className="cma-modal-err">{ctaError}</p>}
                <button type="submit" className="cma-cta-btn cma-modal-send" disabled={ctaState === "sending"}>
                  {ctaState === "sending" ? "Sending…" : <>Send message <span aria-hidden="true">→</span></>}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
