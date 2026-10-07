import { NextRequest, NextResponse } from "next/server";

/**
 * tawk.to → CRM lead webhook.
 * tawk.to dashboard: Administration > Settings > Webhooks → add webhook for the
 * "Chat End" event, POST to /api/webhooks/tawkto?secret=<TAWKTO_WEBHOOK_SECRET>.
 * Forwards identified chats into the CRM via the shared submit-lead edge function
 * as form_key "tawkto_chat". Skips anonymous visitors (no email/phone).
 */

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_RE = /^\+?[\d\s().-]{7,20}$/;

function isEmail(v: unknown): v is string {
  return typeof v === "string" && EMAIL_RE.test(v.trim());
}
function isPhone(v: unknown): v is string {
  if (typeof v !== "string") return false;
  const t = v.trim();
  return PHONE_RE.test(t) && t.replace(/\D/g, "").length >= 7;
}

/** Deep-scan any JSON value for email/phone/name-like strings, regardless of
 *  tawk.to's field naming or nesting. Prefers keys that hint at the field. */
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

/** Best-effort transcript from tawk.to chat payload shapes. */
function transcriptOf(d: Record<string, unknown>): string {
  const chat = d.chat as Record<string, unknown> | undefined;
  const buckets: unknown[] = [d.messages, chat?.messages, d.transcript];
  for (const b of buckets) {
    if (!Array.isArray(b)) continue;
    const lines = b
      .map((m) => {
        if (typeof m === "string") return m;
        if (m && typeof m === "object") {
          const o = m as Record<string, unknown>;
          const sender = o.sender as Record<string, unknown> | undefined;
          const who = pick(
            o.senderName, o.nickname,
            sender?.name, sender?.type,
            pick(o.type) === "visitor" ? "visitor" : "",
            "them",
          );
          const text = pick(o.text, o.message, o.body, o.msg);
          return text ? `${who}: ${text}` : "";
        }
        return "";
      })
      .filter(Boolean);
    if (lines.length) return lines.join("\n");
  }
  return "";
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "tawkto-webhook" });
}

export async function POST(req: NextRequest) {
  const secret = process.env.TAWKTO_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "tawk.to webhook not configured." }, { status: 503 });
  }
  if (req.nextUrl.searchParams.get("secret") !== secret) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let d: Record<string, unknown> = {};
  try {
    const j = await req.json();
    if (j && typeof j === "object") d = j as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: true, skipped: "unreadable body" });
  }

  // Only capture ended chats — not chat:start (avoids leads from chats that go nowhere).
  const event = pick(d.event, d.type).toLowerCase();
  if (event && !event.includes("end") && !event.includes("transcript")) {
    return NextResponse.json({ ok: true, skipped: `event ${event}` });
  }

  const found: { email?: string; phone?: string; name?: string } = {};
  deepScan(d, found);
  const email = found.email ?? "";
  const phone = found.phone ?? "";
  const name = found.name ?? "";

  if (!email && !phone) {
    return NextResponse.json({ ok: true, skipped: "no contact info" });
  }

  const transcript = transcriptOf(d);
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
      form_key: "tawkto_chat",
      first_name: firstName || "Website",
      last_name: rest.join(" ") || "Visitor",
      email: email || undefined,
      phone: phone || undefined,
      message: transcript ? `tawk.to chat transcript:\n${transcript}` : "tawk.to chat — no transcript captured.",
      custom_fields: { source: "tawkto_chat" },
    }),
  });

  if (!leadRes.ok) {
    const errText = await leadRes.text().catch(() => "");
    console.error("[tawkto] submit-lead failed:", leadRes.status, errText.slice(0, 300));
    return NextResponse.json({ error: "Lead capture failed." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
