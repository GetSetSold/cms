/** Black & white CMA report + listing presentation — used by admin print view and public shared link. */

type Comp = Record<string, any>;

const money = (n: any) => (n ? "$" + Math.round(Number(n)).toLocaleString() : "—");

const DEFAULT_AGENT = {
  name: "Rohit Sharma",
  phone: "416-605-7488",
  email: "rohit@getsetsold.com",
  brokerage: "Lombard Group Real Estate Inc., Brokerage",
  tagline: "Your Trusted Partner in Real Estate",
  bio: "With over a decade of experience in the Greater Toronto Area's dynamic real estate market, Rohit Sharma has established himself as a trusted advisor for both buyers and sellers. Specializing in residential properties, Rohit combines deep market knowledge with cutting-edge technology to deliver exceptional results. His client-first approach and innovative 1% commission model have saved homeowners over $2 million in commission fees while maintaining full-service quality. Rohit is committed to transparent pricing, honest communication, and ensuring every client feels confident throughout their real estate journey.",
};

const WHY_FEATURES = [
  "Professional Cleaning", "Professional Photography", "Weekly Progress Report", "Social Media Promos",
  "MLS & Realtor.ca", "Online Booking System", "Staging Consultation", "Open Houses On Your Schedule",
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

const MARKETING: [string, string][] = [
  ["MLS & Realtor.ca", "Maximum exposure on Canada's #1 real estate platform, reaching thousands of active buyers daily."],
  ["Social Media Blitz", "Targeted campaigns across Facebook, Instagram, and TikTok to reach buyers where they spend their time."],
  ["Email Campaigns", "Direct outreach to our network of 5,000+ potential buyers and local real estate professionals."],
  ["Professional Media", "High-quality photography, virtual tours, and video walkthroughs that showcase your home's best features."],
  ["Open Houses", "Strategically scheduled open houses designed to create urgency and attract serious, qualified buyers."],
  ["Google & SEO", "Search engine optimization ensures your property ranks at the top when buyers search online."],
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

      {/* Active comps */}
      {!!actives.length && (
        <section>
          <h2>Active Listings Nearby ({actives.length})</h2>
          <table>
            <thead><tr><th>Address</th><th>Price</th><th>Bd/Ba</th><th>Sqft</th><th>DOM</th></tr></thead>
            <tbody>
              {actives.map((a: any, i: number) => {
                const dom = a.OriginalEntryTimestamp
                  ? Math.max(0, Math.round((Date.now() - new Date(a.OriginalEntryTimestamp).getTime()) / 86400000)) : null;
                return (
                  <tr key={i}>
                    <td>{a.UnparsedAddress}{a.City ? `, ${a.City}` : ""}</td>
                    <td className="r">{money(a.ListPrice)}</td>
                    <td>{a.BedroomsTotal ?? "—"}/{a.BathroomsTotalInteger ?? "—"}</td>
                    <td className="r">{a.AboveGradeFinishedArea ? Number(a.AboveGradeFinishedArea).toLocaleString() : "—"}</td>
                    <td className="r">{dom ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
          <div className="cma-agent-name">{agent.name}</div>
          <div className="cma-agent-tag">{agent.tagline}</div>
          <p className="cma-notes">{agent.bio}</p>
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
          <div className="cma-cards">
            {WHY_FEATURES.map((f) => <div key={f} className="cma-card">{f}</div>)}
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
          <div className="cma-cards">
            {MARKETING.map(([t, d]) => (
              <div key={t} className="cma-card"><strong>{t}</strong><p>{d}</p></div>
            ))}
          </div>
        </section>
      )}

      {has("reasons") && (
        <section className="cma-page">
          <h2>20 Reasons to List With Me</h2>
          <ol className="cma-reasons">
            {REASONS.map((r, i) => <li key={i}>{r}</li>)}
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
              <p className="cma-notes"><strong>5.0</strong> average across <strong>63+</strong> Google reviews</p>
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
          <p className="cma-notes">
            Ready to sell for more and keep more? Contact {agent.name} today for your free in-home consultation.
          </p>
          <div className="cma-cta">
            <div><strong>{agent.name}</strong>, REALTOR®</div>
            <div>{agent.brokerage}</div>
            <div>{agent.phone} · {agent.email}</div>
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
        .cma-price-row { display: flex; gap: 24px; align-items: center; margin-bottom: 12px; }
        .cma-price-row span { display: block; font-size: 11px; color: #777; text-transform: uppercase; }
        .cma-price-row strong { font-size: 18px; }
        .cma-rec strong { font-size: 30px; color: #0066cc; }
        .cma-notes { font-size: 13px; color: #333; margin-top: 8px; line-height: 1.6; }
        .cma-save td { font-weight: 700; }
        .cma-fine { font-size: 11px; color: #888; margin-top: 8px; }
        .cma-agent-name { font-size: 24px; font-weight: 800; }
        .cma-agent-tag { font-size: 14px; color: #0066cc; font-weight: 600; margin: 4px 0 12px; }
        .cma-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: #ddd; border: 1px solid #ddd; margin-top: 16px; }
        .cma-stat { background: #fff; padding: 14px 8px; text-align: center; }
        .cma-stat strong { display: block; font-size: 22px; color: #0066cc; }
        .cma-stat span { font-size: 11px; color: #777; text-transform: uppercase; }
        .cma-cards { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        .cma-card { border: 1px solid #ddd; border-radius: 8px; padding: 14px; font-size: 13px; }
        .cma-card p { color: #555; margin-top: 4px; font-size: 12px; line-height: 1.5; }
        .cma-reasons { columns: 2; column-gap: 32px; font-size: 13px; line-height: 1.9; padding-left: 20px; }
        .cma-reviews { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; }
        .cma-review { border: 1px solid #ddd; border-radius: 8px; padding: 12px; font-size: 12px; }
        .cma-review p { color: #333; line-height: 1.5; margin: 6px 0; }
        .cma-stars { color: #0066cc; letter-spacing: 2px; }
        .cma-reviewer { font-weight: 600; }
        .cma-cta { border: 2px solid #111; border-radius: 8px; padding: 20px; margin-top: 12px; font-size: 15px; line-height: 1.8; }
        .cma footer { border-top: 3px solid #111; padding-top: 12px; margin-top: 32px; font-size: 13px; }
        @media print {
          .cma { padding: 0; max-width: none; }
          .cma-no-print { display: none !important; }
          .cma-page { page-break-before: always; }
        }
      `}</style>
    </div>
  );
}
