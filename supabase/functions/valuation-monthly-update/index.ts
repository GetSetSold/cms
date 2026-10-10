// Monthly valuation update emails. Called by pg_cron on the 1st of each month.
// Sends each valuation lead a short market-drift update based on HPI benchmarks.
// Auth: x-cron-secret header (same CRON_SECRET as the other scheduled functions).
import { admin, sendEmail } from "../_shared/utils.ts";

/** city slug -> HPI market slug. Mirrors src/lib/hpi.ts CITY_TO_HPI. */
const CITY_TO_HPI: Record<string, string> = {
  toronto: "greater-toronto", etobicoke: "greater-toronto", scarborough: "greater-toronto",
  "north-york": "greater-toronto", york: "greater-toronto", "east-york": "greater-toronto",
  vaughan: "greater-toronto", markham: "greater-toronto", richmondhill: "greater-toronto",
  "richmond-hill": "greater-toronto", pickering: "greater-toronto", ajax: "greater-toronto",
  whitby: "greater-toronto", oshawa: "greater-toronto", newmarket: "greater-toronto",
  aurora: "greater-toronto",
  mississauga: "mississauga", brampton: "mississauga", caledon: "mississauga",
  oakville: "oakville-milton", milton: "oakville-milton", "halton-hills": "oakville-milton",
  hamilton: "hamilton-burlington", burlington: "hamilton-burlington", ancaster: "hamilton-burlington",
  dundas: "hamilton-burlington", waterdown: "hamilton-burlington", flamborough: "hamilton-burlington",
  glanbrook: "hamilton-burlington", "stoney-creek": "hamilton-burlington", binbrook: "hamilton-burlington",
  "mount-hope": "hamilton-burlington",
  caledonia: "hamilton-burlington", haldimand: "hamilton-burlington", cayuga: "hamilton-burlington",
  dunnville: "hamilton-burlington", hagersville: "hamilton-burlington", jarvis: "hamilton-burlington",
  grimsby: "hamilton-burlington",
  guelph: "guelph", barrie: "barrie", cambridge: "cambridge",
  kitchener: "kitchener-waterloo", waterloo: "kitchener-waterloo",
  brantford: "brantford", paris: "brantford",
  ottawa: "ottawa", kanata: "ottawa", orleans: "ottawa", nepean: "ottawa",
  windsor: "windsor-essex", essex: "windsor-essex", tecumseh: "windsor-essex", lasalle: "windsor-essex",
  woodstock: "woodstock-ingersoll-tillsonburg", ingersoll: "woodstock-ingersoll-tillsonburg",
  tillsonburg: "woodstock-ingersoll-tillsonburg",
  "st-thomas": "london-st-thomas", london: "london-st-thomas",
  "niagara-falls": "niagara-region", "st-catharines": "niagara-region", welland: "niagara-region",
  "niagara-on-the-lake": "niagara-region", forterie: "niagara-region", "fort-erie": "niagara-region",
  pelham: "niagara-region", lincoln: "niagara-region",
  peterborough: "peterborough", "kawartha-lakes": "kawartha-lakes", lindsay: "kawartha-lakes",
  orillia: "simcoe", collingwood: "simcoe", midland: "simcoe",
  "owen-sound": "grey-bruce-owen-sound", southampton: "grey-bruce-owen-sound",
  goderich: "huron-perth", stratford: "huron-perth",
  kingston: "kingston", belleville: "quinte", trenton: "quinte",
  brockville: "rideau-st-lawrence", cornwall: "rideau-st-lawrence",
  cobourg: "northumberland-hills", porthope: "northumberland-hills", "port-hope": "northumberland-hills",
  bancroft: "bancroft",
  sudbury: "sudbury", "north-bay": "north-bay", "sault-ste-marie": "sault-ste-marie",
  bracebridge: "lakelands", huntsville: "lakelands", gravenhurst: "lakelands",
};

function citySlug(city: string): string {
  return (city || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function fmtMoney(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-CA");
}

Deno.serve(async (req) => {
  const secret = Deno.env.get("CRON_SECRET");
  if (!secret || req.headers.get("x-cron-secret") !== secret) {
    return new Response("Unauthorized", { status: 401 });
  }
  const db = admin();
  const siteUrl = Deno.env.get("SITE_URL") ?? "https://www.getsetsold.ca";

  const now = new Date();
  const month = monthKey(now);
  const monthLabel = now.toLocaleDateString("en-CA", { month: "long", year: "numeric", timeZone: "UTC" });

  const { data: settings } = await db.from("site_settings")
    .select("site_name, email_provider").maybeSingle();
  const siteName = (settings as { site_name?: string } | null)?.site_name ?? "GetSetSold";
  const provider = ((settings as { email_provider?: string } | null)?.email_provider ?? "zeptomail") as "zeptomail" | "resend";

  // Candidate reports: shared, priced, lead-linked, created in the last 12 months.
  const yearAgo = new Date(now);
  yearAgo.setUTCFullYear(now.getUTCFullYear() - 1);
  const { data: reports, error: repErr } = await db.from("valuation_reports")
    .select("id, lead_id, address, city, recommended_price, created_at")
    .not("share_token", "is", null)
    .not("recommended_price", "is", null)
    .not("lead_id", "is", null)
    .gte("created_at", yearAgo.toISOString())
    .order("created_at", { ascending: false });
  if (repErr) return Response.json({ error: repErr.message }, { status: 500 });

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const r of (reports ?? []) as Record<string, unknown>[]) {
    const reportId = r.id as string;
    try {
      // One email per report per month.
      const { data: already } = await db.from("valuation_update_sends")
        .select("id").eq("report_id", reportId).eq("month", month).maybeSingle();
      if (already) { skipped++; continue; }

      const { data: lead } = await db.from("leads")
        .select("id, email, first_name, valuation_updates_opt_out")
        .eq("id", r.lead_id as string).maybeSingle();
      const leadRow = lead as { id: string; email: string | null; first_name: string | null; valuation_updates_opt_out: boolean } | null;
      const email = (leadRow?.email ?? "").trim();
      if (!email || leadRow?.valuation_updates_opt_out) { skipped++; continue; }

      const marketSlug = CITY_TO_HPI[citySlug(r.city as string)];
      if (!marketSlug) { skipped++; continue; }

      const { data: market } = await db.from("hpi_markets")
        .select("name, latest, history_12m, full_history").eq("slug", marketSlug).maybeSingle();
      const m = market as { name: string; latest: { compositeBenchmark?: number }; history_12m: { month: string; compositeBenchmark: number }[]; full_history: { month: string; compositeBenchmark: number }[] } | null;
      const latestBench = m?.latest?.compositeBenchmark;
      if (!m || !latestBench) { skipped++; continue; }

      // Benchmark nearest to (not after) the report's creation month.
      const reportMonth = monthKey(new Date(r.created_at as string));
      const hist = [...(m.history_12m ?? []), ...(m.full_history ?? [])]
        .filter((h) => h?.month && typeof h.compositeBenchmark === "number")
        .sort((a, b) => (a.month < b.month ? -1 : 1));
      const base = [...hist].reverse().find((h) => h.month <= reportMonth) ?? hist[0];
      if (!base) { skipped++; continue; }

      const drift = (latestBench - base.compositeBenchmark) / base.compositeBenchmark;
      const oldValue = Number(r.recommended_price);
      const newValue = Math.round(oldValue * (1 + drift));
      const pct = drift * 100;
      const dir = pct > 0.05 ? "up" : pct < -0.05 ? "down" : "flat";
      const dirWord = dir === "up" ? "risen" : dir === "down" ? "eased" : "held steady";

      const firstName = (leadRow?.first_name ?? "").trim();
      const address = (r.address as string) ?? "";
      const unsubToken = crypto.randomUUID();
      const unsubUrl = `${siteUrl}/api/valuation-updates/unsubscribe?token=${unsubToken}`;

      const subject = `Your ${citySlug(r.city as string).replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} market update — ${monthLabel}`;
      const text =
`Hi ${firstName || "there"},

A quick monthly update from ${siteName}.

Since your home valuation for ${address} (${reportMonth}), the ${m.name} benchmark has ${dirWord}${dir === "flat" ? "" : ` ${Math.abs(pct).toFixed(1)}%`}.

Your estimated value then: ${fmtMoney(oldValue)}
Estimated value now: ~${fmtMoney(newValue)}

This is based on the MLS® Home Price Index trend for your area — not a new appraisal. Thinking about selling? Reply to this email and I'll run fresh numbers for your specific property.

— Rohit Sharma
${siteName} · (416)-605-7488

Don't want these monthly updates? Unsubscribe: ${unsubUrl}`;

      await sendEmail(email, subject, text, undefined, provider);

      await db.from("valuation_update_sends").insert({
        report_id: reportId,
        lead_id: leadRow!.id,
        month,
        old_value: oldValue,
        new_value: newValue,
        pct_change: Math.round(pct * 100) / 100,
        market_slug: marketSlug,
        market_name: m.name,
        unsubscribe_token: unsubToken,
      });
      sent++;
    } catch (e) {
      skipped++;
      errors.push(`${reportId}: ${(e as Error).message}`);
    }
  }

  return Response.json({ month, sent, skipped, errors: errors.slice(0, 10) });
});
