import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/webhooks/salesiq?secret=...
 * Receives Zoho SalesIQ events (e.g. chat ended) and forwards them as leads
 * into the CRM via the submit-lead edge function (form_key: "salesiq_chat").
 *
 * Setup in Zoho SalesIQ: Automation → Webhooks → POST to
 *   https://<site>/api/webhooks/salesiq?secret=<SALESIQ_WEBHOOK_SECRET>
 * with SALESIQ_WEBHOOK_SECRET set as a Cloudflare secret on the worker.
 */

const clip = (v: unknown, n: number) =>
  (typeof v === "string" ? v.trim().slice(0, n) : "") || null;

function pick(obj: any, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = k.split(".").reduce((o, p) => (o != null ? o[p] : undefined), obj);
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "salesiq-webhook" });
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}

export async function POST(req: NextRequest) {
  const secret = process.env.SALESIQ_WEBHOOK_SECRET || "";
  if (!secret) {
    return NextResponse.json({ error: "SalesIQ webhook not configured." }, { status: 503 });
  }
  if (req.nextUrl.searchParams.get("secret") !== secret) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let body: any = {};
  const ct = req.headers.get("content-type") ?? "";
  try {
    body = ct.includes("application/x-www-form-urlencoded")
      ? Object.fromEntries(new URLSearchParams(await req.text()))
      : await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }
  // Zoho sometimes nests the event under `data` or sends a JSON string.
  if (typeof body.data === "string") {
    try { body = JSON.parse(body.data); } catch { /* keep as-is */ }
  }
  const d = body.data && typeof body.data === "object" ? body.data : body;

  const name = pick(d, "visitor.name", "visitorname", "name", "attender.name");
  const email = pick(d, "visitor.email", "visitoremail", "email");
  const phone = pick(d, "visitor.phone", "visitorphone", "phone", "visitor.mobile");
  const pageUrl = pick(d, "visitor.currentPage", "page.url", "url", "chat.department");
  const transcript =
    pick(d, "chat.transcript", "transcript") ??
    (Array.isArray(d.messages) ? d.messages.map((m: any) => `${m.by ?? ""}: ${m.text ?? ""}`.trim()).join("\n").slice(0, 4000) : null);

  if (!email && !phone) {
    // Nothing to identify the visitor by — nothing to save.
    // saw_keys helps diagnose Zoho payload shape changes (keys only, no PII).
    const keys = d && typeof d === "object" ? Object.keys(d).slice(0, 25) : [];
    console.error("[salesiq] skipped: no contact info. top-level keys:", keys.join(","));
    return NextResponse.json({ ok: true, skipped: "no contact info", saw_keys: keys });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return NextResponse.json({ error: "Supabase not configured." }, { status: 500 });

  const [first, ...rest] = (name ?? "").split(/\s+/).filter(Boolean);
  const res = await fetch(`${supabaseUrl}/functions/v1/submit-lead`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      first_name: first || null,
      last_name: rest.join(" ") || null,
      email: email?.toLowerCase() ?? null,
      phone,
      message: transcript,
      form_key: "salesiq_chat",
      path: pageUrl,
      elapsed_ms: 60000, // server-to-server: bypass the "filled too fast" spam check
      custom_fields: {
        salesiq_visitor_id: pick(d, "visitor.id", "visitorid"),
        salesiq_chat_id: pick(d, "chat.id", "chatid"),
        page_url: pageUrl,
      },
    }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    console.error("[salesiq webhook] submit-lead failed:", res.status, err.slice(0, 200));
    return NextResponse.json({ error: "Lead not saved." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
