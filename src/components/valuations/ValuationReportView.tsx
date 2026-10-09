/** Black & white CMA report — used by admin print view and public shared link. */

type Comp = Record<string, any>;

const money = (n: any) => (n ? "$" + Math.round(Number(n)).toLocaleString() : "—");

export function ValuationReportView({ report, leadName }: { report: any; leadName?: string }) {
  const actives: Comp[] = report.active_comps ?? [];
  const solds: Comp[] = report.sold_comps ?? [];
  const rec = Number(report.recommended_price) || 0;
  const listFee = rec ? Math.round(rec * 0.01) : 0;
  const tradFee = rec ? Math.round(rec * 0.05) : 0;

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
        {report.upgrades && <p className="cma-notes"><strong>Upgrades / notes:</strong> {report.upgrades}</p>}
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
          <table>
            <thead><tr><th>Address</th><th>Sold price</th><th>Sold date</th><th>Bd/Ba/Sqft</th></tr></thead>
            <tbody>
              {solds.map((s: any, i: number) => (
                <tr key={i}>
                  <td>{s.address}</td>
                  <td className="r">{money(s.price)}</td>
                  <td>{s.date || "—"}</td>
                  <td>{[s.beds && s.beds + "bd", s.baths && s.baths + "ba", s.sqft && String(s.sqft).replace(/,/g, "") + "sf"].filter(Boolean).join(" · ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Pricing */}
      <section>
        <h2>Pricing Recommendation</h2>
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

      <footer>
        <div>Rohit Sharma, REALTOR® · Lombard Group Real Estate Inc., Brokerage · 416-605-7488 · rohit@getsetsold.com</div>
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
        .cma-price-row { display: flex; gap: 24px; align-items: center; margin-bottom: 12px; }
        .cma-price-row span { display: block; font-size: 11px; color: #777; text-transform: uppercase; }
        .cma-price-row strong { font-size: 18px; }
        .cma-rec strong { font-size: 30px; color: #0066cc; }
        .cma-notes { font-size: 13px; color: #333; margin-top: 8px; line-height: 1.6; }
        .cma-save td { font-weight: 700; }
        .cma-fine { font-size: 11px; color: #888; margin-top: 8px; }
        .cma footer { border-top: 3px solid #111; padding-top: 12px; margin-top: 32px; font-size: 13px; }
        @media print {
          .cma { padding: 0; max-width: none; }
          .cma-no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
}
