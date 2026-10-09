/** Black & white CMA report + listing presentation — used by admin print view and public shared link. */
import type { ReactNode } from "react";

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
  tag: (<svg {...svgProps}><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><circle cx="7" cy="7" r="1.2" /></svg>),
  shield: (<svg {...svgProps}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>),
  clock: (<svg {...svgProps}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>),
  lamp: (<svg {...svgProps}><path d="M9 2h6l3 8H6z" /><line x1="12" y1="10" x2="12" y2="22" /><path d="M8 22h8" /></svg>),
  door: (<svg {...svgProps}><rect x="5" y="3" width="14" height="18" rx="1" /><circle cx="15" cy="12" r="1" fill="currentColor" stroke="none" /></svg>),
  key: (<svg {...svgProps}><circle cx="8" cy="15" r="4.5" /><path d="M11.2 11.8L21 2m-3 3l3 3" /></svg>),
};

const DEFAULT_AGENT = {
  name: "Rohit Sharma",
  phone: "416-605-7488",
  email: "rohit@getsetsold.com",
  brokerage: "Lombard Group Real Estate Inc., Brokerage",
  tagline: "Your Trusted Partner in Real Estate",
  photo: "",
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

const COMPARISON: [string, boolean, boolean][] = [
  ["MLS & Realtor.ca Listing", true, true],
  ["Professional Photography", true, true],
  ["Virtual Tours / 3D Walkthrough", true, true],
  ["For Sale Sign Installation", true, true],
  ["Professional Staging Consultation", true, true],
  ["Open Houses", true, true],
  ["Social Media Marketing", true, true],
  ["Email Campaigns", true, true],
  ["Offer Negotiation", true, true],
  ["Paperwork & Legal Guidance", true, true],
  ["Weekly Progress Reports", false, true],
  ["Online Booking System", false, true],
  ["Google & SEO Marketing", false, true],
  ["Professional Cleaning Service", false, true],
  ["No-Sale Guarantee", false, true],
];

const MARKETING: [string, string, string][] = [
  ["MLS & Realtor.ca", "Maximum exposure on Canada's #1 real estate platform, reaching thousands of active buyers daily.", "home"],
  ["Social Media Blitz", "Targeted campaigns across Facebook, Instagram, and TikTok to reach buyers where they spend their time.", "mega"],
  ["Email Campaigns", "Direct outreach to our network of 5,000+ potential buyers and local real estate professionals.", "mail"],
  ["Professional Media", "High-quality photography, virtual tours, and video walkthroughs that showcase your home's best features.", "camera"],
  ["Open Houses", "Strategically scheduled open houses designed to create urgency and attract serious, qualified buyers.", "door"],
  ["Google & SEO", "Search engine optimization ensures your property ranks at the top when buyers search online.", "search"],
];

const REASONS = [
  "Free in-home consultation & property assessment",
  "Detailed market analysis & competitive pricing strategy",
  "Customized marketing plan development",
  "Transparent commission & service agreement",
  "Professional staging consultation & recommendations",
  "Arrangement of professional cleaning services",
  "Professional photography & virtual tour creation",
  "MLS & Realtor.ca listing activation",
  "Social media marketing launch across all platforms",
  "Email blast to our buyer network of 5,000+ contacts",
  "For Sale sign installation & neighborhood outreach",
  "Open house scheduling & event management",
  "Offer review & detailed comparison analysis",
  "Skilled negotiation to maximize your sale price",
  "Conditional management & buyer qualification verification",
  "Legal paperwork preparation & review coordination",
  "Final walkthrough scheduling & support",
  "Closing document review & signing facilitation",
  "Keys & possession transfer coordination",
  "Post-sale follow-up & satisfaction check-in",
];

const REVIEWS: [string, string][] = [
  ["Sarah & James Mitchell", "Rohit sold our home in just 12 days and saved us over $15,000 in commission. His marketing strategy was incredible, and we got above asking price. Can't recommend him enough!"],
  ["Michael Chen", "As a first-time seller, I was nervous about the process. Rohit made everything seamless. The 1% commission was a game-changer — I used the savings for my new home's down payment."],
  ["Priya Patel", "Professional, knowledgeable, and genuinely cares about his clients. Rohit's weekly progress reports kept me informed every step of the way. The photos he arranged were stunning."],
  ["David & Karen Thompson", "We interviewed several agents before choosing Rohit. His transparent pricing and full-service approach won us over. Our property sold for $25,000 over asking!"],
  ["Lisa Rodriguez", "Rohit's staging consultation transformed our home. Buyers were impressed from the moment they walked in. The open house strategy he implemented brought multiple competing offers."],
  ["Robert & Anne Williams", "Outstanding service at an unbeatable price. Rohit handled everything from professional cleaning to MLS listing. We couldn't be happier with the results and the money we saved."],
  ["Jennifer Park", "Rohit exceeded all expectations. His knowledge of the market and negotiation skills resulted in a sale well above asking. Highly professional and always available."],
  ["Amanda & Chris Scott", "From listing to closing, Rohit was exceptional. His 1% commission saved us thousands, and the service was better than agents charging full commission. A true professional."],
];

const ELFSIGHT_APP_ID = "e705f2da-4d5f-48a0-8e1a-4e33be72155d";

export function ValuationReportView({ report, leadName }: { report: any; leadName?: string }) {
  const actives: Comp[] = report.active_comps ?? [];
  const solds: Comp[] = report.sold_comps ?? [];
  const upgrades: { description: string; amount: number }[] = report.upgrade_items ?? [];
  const upgradeTotal = upgrades.reduce((s, u) => s + (Number(u.amount) || 0), 0);
  const rec = Number(report.recommended_price) || 0;
  const listFee = rec ? Math.round(rec * 0.01) : 0;
  const tradFee = rec ? Math.round(rec * 0.05) : 0;
  const pres = report.presentation ?? {};
  const include: string[] = Array.isArray(pres.include) ? pres.include : [];
  const reviewsSource = pres.reviews_source === "static" ? "static" : "elfsight";
  const agent = { ...DEFAULT_AGENT, ...(pres.agent ?? {}) };
  const has = (k: string) => include.includes(k);

  return (
    <div className="cma">
      {/* Header */}
      <header className="cma-head">
        <div>
          <div className="cma-brand">GETSETSOLD<span>.ca</span></div>
          <div className="cma-sub">Comparative Market Analysis</div>
        </div>
        <div className="cma-meta">
          <div>{new Date(report.created_at).toLocaleDateString()}</div>
          {leadName && <div>Prepared for {leadName}</div>}
        </div>
      </header>

      {/* Subject property */}
      <section>
        <h2>Subject Property</h2>
        <div className="cma-address">{report.address}{report.city ? `, ${report.city}` : ""}</div>
        <div className="cma-grid">
          {[["Type", report.property_type], ["Bedrooms", report.beds], ["Bathrooms", report.baths],
            ["Square feet", report.sqft], ["Lot size", report.lot_size], ["Year built", report.year_built]]
            .filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="cma-cell"><span>{k}</span><strong>{String(v)}</strong></div>
            ))}
        </div>
        {report.upgrades && <p className="cma-notes"><strong>Notes:</strong> {report.upgrades}</p>}
      </section>

      {/* Active comps — photo cards */}
      {!!actives.length && (
        <section>
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
        <section>
          <h2>Recent Sold Comparables ({solds.length})</h2>
          {(() => {
            const prices = solds.map((s: any) => Number(s.price)).filter((p) => p > 0).sort((a, b) => a - b);
            if (!prices.length) return null;
            const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
            const median = prices[Math.floor(prices.length / 2)];
            const doms = solds.map((s: any) => Number(s.dom)).filter((d) => d > 0);
            const avgDom = doms.length ? Math.round(doms.reduce((a, b) => a + b, 0) / doms.length) : null;
            return (
              <div className="cma-stats" style={{ marginBottom: 16 }}>
                {[["Low", money(prices[0])], ["High", money(prices[prices.length - 1])], ["Median", money(median)], ["Average", money(avg)]]
                  .map(([l, v]) => (
                    <div key={l as string} className="cma-stat"><strong>{v}</strong><span>{l}</span></div>
                  ))}
                {avgDom != null && (
                  <div className="cma-stat"><strong>{avgDom}</strong><span>Avg DOM</span></div>
                )}
              </div>
            );
          })()}
          <table>
            <thead><tr><th>Address</th><th>Sold price</th><th>Sold date</th><th>Bd/Ba/Sqft</th><th>DOM</th></tr></thead>
            <tbody>
              {solds.map((s: any, i: number) => (
                <tr key={i}>
                  <td>{s.address}</td>
                  <td className="r">{money(s.price)}</td>
                  <td>{s.date || "—"}</td>
                  <td>{[s.beds && s.beds + "bd", s.baths && s.baths + "ba", s.sqft && String(s.sqft).replace(/,/g, "") + "sf"].filter(Boolean).join(" · ") || "—"}</td>
                  <td className="r">{s.dom || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Pricing */}
      <section>
        <h2>Pricing Recommendation</h2>
        {!!upgrades.length && (
          <table className="cma-adj">
            <thead><tr><th>Upgrade / adjustment</th><th className="r">Value added</th></tr></thead>
            <tbody>
              {upgrades.map((u, i) => (
                <tr key={i}><td>{u.description || "Upgrade"}</td><td className="r">+{money(u.amount)}</td></tr>
              ))}
              <tr className="cma-save"><td>Total adjustments</td><td className="r">+{money(upgradeTotal)}</td></tr>
            </tbody>
          </table>
        )}
        <div className="cma-price-row">
          {report.price_low && <div><span>Range low</span><strong>{money(report.price_low)}</strong></div>}
          <div className="cma-rec"><span>Recommended list price</span><strong>{money(report.recommended_price)}</strong></div>
          {report.price_high && <div><span>Range high</span><strong>{money(report.price_high)}</strong></div>}
        </div>
        {report.pricing_notes && <p className="cma-notes">{report.pricing_notes}</p>}
      </section>

      {/* Commission */}
      {!!rec && (
        <section>
          <h2>Commission Comparison</h2>
          <table>
            <tbody>
              <tr><td>GetSetSold listing side (1%)</td><td className="r">{money(listFee)}</td></tr>
              <tr><td>Traditional total (5%)</td><td className="r">{money(tradFee)}</td></tr>
              <tr className="cma-save"><td>You keep (est. savings on listing side)</td><td className="r">{money(tradFee - Math.round(rec * 0.03))}</td></tr>
            </tbody>
          </table>
          <p className="cma-fine">Buyer-agent co-op (2% under $1M / 2.5% over) is separate and paid to the buyer's brokerage. HST extra.</p>
        </section>
      )}

      {/* ===== Listing presentation sections ===== */}

      {has("agent") && (
        <section className="cma-page">
          <h2>Meet Your Agent</h2>
          <div className="cma-agent">
            {agent.photo
              ? <img src={agent.photo} alt={agent.name} className="cma-agent-photo" />
              : <div className="cma-agent-photo cma-agent-initials">{agent.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2)}</div>}
            <div>
              <div className="cma-agent-name">{agent.name}</div>
              <div className="cma-agent-tag">{agent.tagline}</div>
              <p className="cma-notes" style={{ marginTop: 0 }}>{agent.bio}</p>
            </div>
          </div>
          <div className="cma-stats">
            {[["20+", "Properties Sold"], ["1%", "Commission Rate"], ["100%", "Client Satisfaction"], ["$2M+", "Saved for Clients"]].map(([n, l]) => (
              <div key={l} className="cma-stat"><strong>{n}</strong><span>{l}</span></div>
            ))}
          </div>
        </section>
      )}

      {has("why") && (
        <section className="cma-page">
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
        <section className="cma-page">
          <h2>GetSetSold vs Traditional</h2>
          <table>
            <thead><tr><th>Service</th><th className="c">Traditional</th><th className="c">GetSetSold</th></tr></thead>
            <tbody>
              {COMPARISON.map(([f, t, r]) => (
                <tr key={f}><td>{f}</td><td className="c">{t ? "✓" : "—"}</td><td className="c"><strong>{r ? "✓" : "—"}</strong></td></tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {has("marketing") && (
        <section className="cma-page">
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
        <section className="cma-page">
          <h2>20 Reasons to List With Confidence</h2>
          <p className="cma-notes" style={{ marginBottom: 16 }}>A proven, step-by-step process designed to sell your home faster and for more money.</p>
          <ol className="cma-reasons">
            {REASONS.map((r, i) => <li key={i}><span className="cma-reason-num">{String(i + 1).padStart(2, "0")}</span>{r}</li>)}
          </ol>
        </section>
      )}

      {has("reviews") && (
        <section className="cma-page">
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

      {has("cta") && (
        <section className="cma-page">
          <h2>Next Steps</h2>
          <div className="cma-cta">
            <div className="cma-cta-title">Ready to Make Your Move?</div>
            <p>Get expert guidance, full-service representation, and keep more money in your pocket.</p>
            <div className="cma-cta-contact">
              <div><strong>{agent.name}</strong>, REALTOR®</div>
              <div>{agent.brokerage}</div>
              <div>{agent.phone} · {agent.email}</div>
            </div>
          </div>
        </section>
      )}

      <footer>
        <div>{agent.name}, REALTOR® · {agent.brokerage} · {agent.phone} · {agent.email}</div>
        <div className="cma-fine">This analysis is an opinion of value based on available market data, not an appraisal. Market conditions change; pricing should be reviewed before listing.</div>
      </footer>

      <style>{`
        .cma { max-width: 800px; margin: 0 auto; padding: 32px 24px; background: #fff; color: #111; font-family: -apple-system, 'Segoe UI', sans-serif; }
        .cma-head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #111; padding-bottom: 16px; margin-bottom: 28px; }
        .cma-brand { font-size: 26px; font-weight: 800; letter-spacing: -0.5px; }
        .cma-brand span { color: #0066cc; }
        .cma-sub { font-size: 13px; color: #555; margin-top: 2px; }
        .cma-meta { text-align: right; font-size: 13px; color: #555; }
        .cma section { margin-bottom: 28px; }
        .cma h2 { font-size: 15px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #ddd; padding-bottom: 6px; margin-bottom: 12px; }
        .cma-address { font-size: 20px; font-weight: 700; margin-bottom: 12px; }
        .cma-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: #ddd; border: 1px solid #ddd; }
        .cma-cell { background: #fff; padding: 10px 12px; }
        .cma-cell span { display: block; font-size: 11px; color: #777; text-transform: uppercase; }
        .cma-cell strong { font-size: 15px; }
        .cma table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .cma th { text-align: left; font-size: 11px; text-transform: uppercase; color: #777; padding: 8px; border-bottom: 2px solid #111; }
        .cma td { padding: 8px; border-bottom: 1px solid #eee; }
        .cma td.r, .cma th.r { text-align: right; }
        .cma td.c, .cma th.c { text-align: center; }
        .cma-adj { margin-bottom: 16px; }
        .cma-price-row { display: flex; gap: 24px; align-items: center; margin-bottom: 12px; flex-wrap: wrap; }
        .cma-price-row span { display: block; font-size: 11px; color: #777; text-transform: uppercase; }
        .cma-price-row strong { font-size: 18px; }
        .cma-rec strong { font-size: 30px; color: #0066cc; }
        .cma-notes { font-size: 13px; color: #333; margin-top: 8px; line-height: 1.6; }
        .cma-save td { font-weight: 700; }
        .cma-fine { font-size: 11px; color: #888; margin-top: 8px; }
        .cma-listings { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .cma-listing { border: 1px solid #e2e2e2; border-radius: 10px; overflow: hidden; background: #fff; }
        .cma-listing img { width: 100%; height: 150px; object-fit: cover; display: block; }
        .cma-noimg { height: 150px; background: #f4f4f4; display: flex; align-items: center; justify-content: center; color: #999; font-size: 12px; }
        .cma-listing-body { padding: 12px 14px; }
        .cma-listing-price { font-size: 19px; font-weight: 800; display: flex; align-items: center; gap: 8px; }
        .cma-dom { font-size: 11px; font-weight: 700; background: #111; color: #fff; border-radius: 20px; padding: 2px 9px; }
        .cma-listing-addr { font-size: 13px; margin: 3px 0 6px; }
        .cma-listing-meta { font-size: 12px; color: #666; }
        .cma-agent { display: flex; gap: 20px; align-items: flex-start; margin-bottom: 16px; }
        .cma-agent-photo { width: 110px; height: 110px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
        .cma-agent-initials { background: #111; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: 800; }
        .cma-agent-name { font-size: 24px; font-weight: 800; }
        .cma-agent-tag { font-size: 14px; color: #0066cc; font-weight: 600; margin: 4px 0 8px; }
        .cma-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: #ddd; border: 1px solid #ddd; margin-top: 16px; }
        .cma-stat { background: #fff; padding: 14px 8px; text-align: center; }
        .cma-stat strong { display: block; font-size: 22px; color: #0066cc; }
        .cma-stat span { font-size: 11px; color: #777; text-transform: uppercase; }
        .cma-why { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
        .cma-why-card { border: 1px solid #e2e2e2; border-radius: 10px; padding: 18px 10px; text-align: center; font-size: 13px; font-weight: 600; line-height: 1.4; background: #fff; }
        .cma-why-icon { display: flex; justify-content: center; color: #111; margin-bottom: 10px; }
        .cma-cards { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        .cma-card { border: 1px solid #e2e2e2; border-radius: 10px; padding: 16px; font-size: 13px; background: #fff; }
        .cma-card p { color: #555; margin-top: 4px; font-size: 12px; line-height: 1.5; }
        .cma-mkt-card { display: flex; gap: 12px; align-items: flex-start; }
        .cma-mkt-icon { color: #111; flex-shrink: 0; margin-top: 2px; }
        .cma-reasons { columns: 2; column-gap: 32px; font-size: 13px; line-height: 1.9; padding-left: 0; list-style: none; }
        .cma-reasons li { display: flex; gap: 10px; align-items: baseline; break-inside: avoid; }
        .cma-reason-num { font-weight: 800; color: #0066cc; font-size: 12px; flex-shrink: 0; }
        .cma-reviews-head { display: flex; gap: 32px; margin-bottom: 16px; font-size: 14px; color: #555; }
        .cma-reviews-score { font-size: 28px; font-weight: 800; color: #111; }
        .cma-reviews { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .cma-review { border: 1px solid #e2e2e2; border-radius: 10px; padding: 20px; font-size: 13px; background: #fff; }
        .cma-review p { color: #333; line-height: 1.65; margin: 10px 0 12px; font-style: italic; }
        .cma-stars { color: #111; letter-spacing: 3px; font-size: 14px; }
        .cma-reviewer { font-weight: 700; }
        .cma-cta { border: 2px solid #111; border-radius: 12px; padding: 32px; text-align: center; }
        .cma-cta-title { font-size: 26px; font-weight: 800; margin-bottom: 8px; }
        .cma-cta p { color: #555; font-size: 14px; margin-bottom: 20px; }
        .cma-cta-contact { font-size: 15px; line-height: 1.9; }
        .cma footer { border-top: 3px solid #111; padding-top: 12px; margin-top: 32px; font-size: 13px; }
        @media (max-width: 640px) {
          .cma-listings { grid-template-columns: 1fr; }
          .cma-why { grid-template-columns: repeat(2, 1fr); }
          .cma-reviews { grid-template-columns: 1fr; }
          .cma-cards { grid-template-columns: 1fr; }
          .cma-reasons { columns: 1; }
          .cma-grid { grid-template-columns: repeat(2, 1fr); }
          .cma-agent { flex-direction: column; }
        }
        @media print {
          .cma { padding: 0; max-width: none; }
          .cma-no-print { display: none !important; }
          .cma-page { page-break-before: always; }
          .cma-listing, .cma-why-card, .cma-card, .cma-review { break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}
