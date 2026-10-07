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
/** tawk.to anonymous visitor IDs look like V1791405680723906 — never a real name. */
const ANON_ID_RE = /^V\d{6,}$/i;

function isEmail(v: unknown): boolean {
  return typeof v === "string" && EMAIL_RE.test(v.trim());
}
function isPhone(v: unknown): boolean {
  if (typeof v !== "string") return false;
  const t = v.trim();
  return PHONE_RE.test(t) && t.replace(/\D/g, "").length >= 7;
}

interface Candidates {
  emails: { key: string; value: string }[];
  phones: { key: string; value: string }[];
  names: { key: string; value: string }[];
  pages: { key: string; value: string }[];
  messageArrays: unknown[][];
}

/** Walk the whole payload and collect every candidate value with its key path,
 *  so we can pick the best one instead of the first one. */
function collect(node: unknown, out: Candidates, path = "", depth = 0): void {
  if (depth > 7 || node == null) return;
  if (typeof node === "string") {
    const t = node.trim();
    if (!t) return;
    const key = path.toLowerCase();
    if (isEmail(t)) out.emails.push({ key, value: t.match(EMAIL_RE)![0] });
    else if (isPhone(t)) out.phones.push({ key, value: t });
    else if (
      t.length >= 2 && t.length <= 80 &&
      !ANON_ID_RE.test(t) &&
      (key.includes("name") || key.includes("first") || key.includes("last"))
    ) {
      out.names.push({ key, value: t });
    }
    if (key.includes("page") || key.includes("url")) {
      if (/^https?:\/\//i.test(t)) out.pages.push({ key, value: t });
    }
    return;
  }
  if (Array.isArray(node)) {
    // Message-like array? Items with text/message/body fields.
    if (
      node.length > 0 &&
      node.every(
        (m) =>
          m && typeof m === "object" &&
          typeof (m as Record<string, unknown>).text === "string" ||
          (m && typeof m === "object" && typeof (m as Record<string, unknown>).message === "string") ||
          (m && typeof m === "object" && typeof (m as Record<string, unknown>).body === "string"),
      )
    ) {
      out.messageArrays.push(node);
    }
    node.forEach((item, i) => collect(item, out, `${path}[${i}]`, depth + 1));
    return;
  }
  if (typeof node === "object") {
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      collect(v, out, path ? `${path}.${k}` : k, depth + 1);
    }
  }
}

function pick(...vals: unknown[]): string {
  for (const v of vals) if (typeof v === "string" && v.trim()) return v.trim();
  return "";
}

/** Score a name candidate: explicit first/last-name keys win over generic ones. */
function nameScore(key: string): number {
  const k = key.toLowerCase();
  if (k.includes("first") || k.includes("last") || k.includes("fullname") || k.includes("full-name")) return 3;
  if (k.includes("nick") || k.includes("display")) return 2;
  if (k.includes("name")) return 1;
  return 0;
}

function bestName(cands: Candidates): string {
  const sorted = [...cands.names].sort((a, b) => nameScore(b.key) - nameScore(a.key));
  // Prefer a two-word (or longer) name — single tokens are often IDs/handles.
  const full = sorted.find((c) => c.value.split(/\s+/).length >= 2);
  return (full ?? sorted[0])?.value ?? "";
}

function bestPhone(cands: Candidates): string {
  const sorted = [...cands.phones].sort((a, b) => {
    const ka = a.key.toLowerCase(), kb = b.key.toLowerCase();
    const sa = ka.includes("phone") || ka.includes("mobile") ? 1 : 0;
    const sb = kb.includes("phone") || kb.includes("mobile") ? 1 : 0;
    return sb - sa;
  });
  return sorted[0]?.value ?? "";
}

function transcriptOf(cands: Candidates): string {
  for (const arr of cands.messageArrays) {
    const lines = arr
      .map((m) => {
        const o = m as Record<string, unknown>;
        const sender = o.sender as Record<string, unknown> | undefined;
        const who = pick(
          o.senderName, o.nickname,
          sender?.name, sender?.type,
          typeof o.type === "string" && o.type === "visitor" ? "visitor" : "",
          "them",
        );
        const text = pick(o.text, o.message, o.body, o.msg);
        return text ? `${who}: ${text}` : "";
      })
      .filter(Boolean);
    if (lines.length >= 1) return lines.join("\n");
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

  const event = pick(d.event, d.type).toLowerCase();
  if (event && !event.includes("end") && !event.includes("transcript")) {
    return NextResponse.json({ ok: true, skipped: `event ${event}` });
  }

  const cands: Candidates = { emails: [], phones: [], names: [], pages: [], messageArrays: [] };
  collect(d, cands);

  const email = cands.emails[0]?.value ?? "";
  const phone = bestPhone(cands);
  const name = bestName(cands);
  const pageUrl = cands.pages[0]?.value ?? "";

  if (!email && !phone) {
    return NextResponse.json({ ok: true, skipped: "no contact info" });
  }

  const transcript = transcriptOf(cands);
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
      page_url: pageUrl || undefined,
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
