import { NextRequest, NextResponse } from "next/server";

/**
 * Zoho SalesIQ → CRM lead webhook.
 * GET/HEAD 200 for Zoho's URL validation; POST requires ?secret=<SALESIQ_WEBHOOK_SECRET>.
 * Forwards identified chats into the CRM via the shared submit-lead edge function
 * as form_key "salesiq_chat". Skips anonymous visitors (no email/phone).
 */

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_RE = /^\+?[\d\s().-]{7,20}$/;

function isEmail(v: unknown): v is string {
  return typeof v === "string" && EMAIL_RE.test(v.trim());
}
function isPhone(v: unknown): v is string {
  if (typeof v !== "string") return false;
  const t = v.trim();
  return PHONE_RE.test(t) && (t.replace(/\D/g, "").length >= 7);
}

/** Deep-scan any JSON value for email/phone/name-like strings, regardless of
 *  Zoho's field naming or nesting. Prefers keys that hint at the field. */
function deepScan(node: unknown, out: { email?: string; phone?: string; name?: string }, depth = 0): void {
  if (depth > 6 || !node) return;
  if (typeof node === "string") {
    const t = node.trim();
    if (!out.email && isEmail(t)) out.email = t.match(EMAIL_RE)![0];
    else if (!out.phone && isPhone(t)) out.phone = t;
    return;
  }
  if (Array.isArray(node)) {
    for (const item of node) deepScan(item, out, depth + 1);
    return;
  }
  if (typeof node === "object") {
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      const key = k.toLowerCase();
      if (typeof v === "string") {
        const t = v.trim();
        if (!t) continue;
        if (!out.email && (key.includes("email") || isEmail(t))) {
          const m = t.match(EMAIL_RE);
          if (m) { out.email = m[0]; continue; }
        }
        if (!out.phone && (key.includes("phone") || key.includes("mobile") || key.includes("contact") || isPhone(t))) {
          if (isPhone(t)) { out.phone = t; continue; }
        }
        if (!out.name && key.includes("name") && t.length >= 2 && t.length <= 80 && !isEmail(t)) {
          out.name = t;
          continue;
        }
      }
      deepScan(v, out, depth + 1);
    }
  }
}

function pick(...vals: unknown[]): string {
  for (const v of vals) if (typeof v === "string" && v.trim()) return v.trim();
  return "";
}

/** Best-effort transcript from common chat payload shapes. */
function transcriptOf(d: Record<string, unknown>): string {
  const chat = d.chat as Record<string, unknown> | undefined;
  const buckets: unknown[] = [d.messages, d.transcript, chat?.messages, d.conversation];
  if (chat) buckets.push(chat.transcript, chat.messages);
  for (const b of buckets) {
    if (!Array.isArray(b)) continue;
    const lines = b
      .map((m) => {
        if (typeof m === "string") return m;
        if (m && typeof m === "object") {
          const o = m as Record<string, unknown>;
          const who = pick(o.sender, o.by, o.author, o.from, (o.visitor as boolean) ? "visitor" : "", "them");
          const text = pick(o.text, o.message, o.body, o.content);
          return text ? `${who}: ${text}` : "";
        }
        return "";
      })
      .filter(Boolean);
    if (lines.length) return lines.join("\n");
  }
  const raw = pick(d.chat_transcript, d.conversation_text);
  return raw;
}

async function readBody(req: NextRequest): Promise<Record<string, unknown>> {
  const ct = req.headers.get("content-type") ?? "";
  try {
    if (ct.includes("application/json")) {
      const j = await req.json();
      return j && typeof j === "object" ? (j as Record<string, unknown>) : {};
    }
    if (ct.includes("application/x-www-form-urlencoded")) {
      const text = await req.text();
      const out: Record<string, unknown> = {};
      for (const [k, v] of new URLSearchParams(text)) {
        // Zoho sometimes nests JSON inside a form field.
        try {
          const parsed = JSON.parse(v);
          if (parsed && typeof parsed === "object") { out[k] = parsed; continue; }
        } catch { /* plain string */ }
        out[k] = v;
      }
      return out;
    }
    // Unknown content type: try JSON, fall back to text scan.
    try {
      const j = await req.json();
      if (j && typeof j === "object") return j as Record<string, unknown>;
    } catch { /* fall through */ }
    const text = await req.text();
    return text ? { _raw: text } : {};
  } catch {
    return {};
  }
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "salesiq-webhook" });
}

export async function POST(req: NextRequest) {
  const secret = process.env.SALESIQ_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "SalesIQ webhook not configured." }, { status: 503 });
  }
  if (req.nextUrl.searchParams.get("secret") !== secret) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const d = await readBody(req);
  const found: { email?: string; phone?: string; name?: string } = {};
  deepScan(d, found);

  const email = found.email ?? "";
  const phone = found.phone ?? "";
  const name = found.name ?? "";

  if (!email && !phone) {
    const keys = Object.keys(d).slice(0, 25);
    console.error("[salesiq] skipped: no contact info. top-level keys:", keys.join(","));
    return NextResponse.json({ ok: true, skipped: "no contact info", saw_keys: keys });
  }

  const transcript = transcriptOf(d);
  const pageUrl = pick(
    d.page_url, d.url, d.website,
    (d.visitor as Record<string, unknown> | undefined)?.page_url,
    (d.chat as Record<string, unknown> | undefined)?.page_url,
  );
  const chatId = pick(
    (d.chat as Record<string, unknown> | undefined)?.id,
    d.chat_id, d.conversation_id,
  );
  const visitorId = pick(
    (d.visitor as Record<string, unknown> | undefined)?.id,
    d.visitor_id,
  );

  const [firstName, ...rest] = name.split(/\s+/).filter(Boolean);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnon) {
    return NextResponse.json({ error: "CRM not configured." }, { status: 503 });
  }

  const leadRes = await fetch(`${supabaseUrl}/functions/v1/submit-lead`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseAnon,
      Authorization: `Bearer ${supabaseAnon}`,
    },
    body: JSON.stringify({
      form_key: "salesiq_chat",
      first_name: firstName || "Website",
      last_name: rest.join(" ") || "Visitor",
      email: email || undefined,
      phone: phone || undefined,
      message: transcript ? `SalesIQ chat transcript:\n${transcript}` : "SalesIQ chat — no transcript captured.",
      page_url: pageUrl || undefined,
      custom_fields: {
        source: "salesiq_chat",
        salesiq_chat_id: chatId || undefined,
        salesiq_visitor_id: visitorId || undefined,
        salesiq_page: pageUrl || undefined,
      },
    }),
  });

  if (!leadRes.ok) {
    const errText = await leadRes.text().catch(() => "");
    console.error("[salesiq] submit-lead failed:", leadRes.status, errText.slice(0, 300));
    return NextResponse.json({ error: "Lead capture failed.", detail: errText.slice(0, 300) }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
