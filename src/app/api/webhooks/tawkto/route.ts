import { NextRequest, NextResponse } from "next/server";

/**
 * tawk.to → CRM lead webhook.
 * tawk.to dashboard: Administration > Settings > Webhooks → add webhook for the
 * "Chat End" AND "Chat Transcript Created" events,
 * POST to /api/webhooks/tawkto?secret=<TAWKTO_WEBHOOK_SECRET>.
 *
 * - chat:end: creates the lead immediately (visitor.name/email, page from referrer).
 * - chat:transcript_created (~3 min later): enriches the lead with the full
 *   transcript + pre-chat form answers (name/phone/email parsed from the form message).
 *
 * Lead key: form_key "tawkto_chat". Skips anonymous visitors (no email/phone).
 *
 * Field paths follow https://developer.tawk.to/webhooks/ :
 *   chat:end:            { event, chatId, domain, referrer, visitor{name,email}, property{name} }
 *   transcript_created:  { event, chat, chat.messages[{msg, sender{t,n}}], visitor{name,email}, referrer }
 */

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_RE = /^\+?[\d\s().-]{7,20}$/;
const ANON_ID_RE = /^V\d{6,}$/i;

function isEmail(v: unknown): boolean {
  return typeof v === "string" && EMAIL_RE.test(v.trim());
}
function isPhone(v: unknown): boolean {
  if (typeof v !== "string") return false;
  const t = v.trim();
  return PHONE_RE.test(t) && t.replace(/\D/g, "").length >= 7;
}
function pick(...vals: unknown[]): string {
  for (const v of vals) if (typeof v === "string" && v.trim()) return v.trim();
  return "";
}
function cleanName(v: string): string {
  const t = v.trim();
  return ANON_ID_RE.test(t) ? "" : t;
}

/** Extract "Email : x / Phone : y / First Name : a / Last Name : b" from the
 *  pre-chat form system message tawk.to injects into the transcript. */
function parsePrechatForm(text: string): { email: string; phone: string; firstName: string; lastName: string } {
  const out = { email: "", phone: "", firstName: "", lastName: "" };
  const grab = (label: string): string => {
    const m = text.match(new RegExp(label + "\\s*:\\s*([^\\n]+)", "i"));
    return m ? m[1].trim() : "";
  };
  const email = grab("email");
  if (isEmail(email)) out.email = email.match(EMAIL_RE)![0];
  const phone = grab("phone");
  if (isPhone(phone)) out.phone = phone;
  out.firstName = grab("first[ -]?name");
  out.lastName = grab("last[ -]?name");
  return out;
}

function senderName(sender: unknown): string {
  if (!sender || typeof sender !== "object") return "them";
  const s = sender as Record<string, unknown>;
  // t: a = agent, v = visitor, s = system
  if (s.t === "v") return "visitor";
  if (s.t === "a") return pick(s.n, "agent");
  return pick(s.n, "system");
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

  const event = pick(d.event).toLowerCase();
  const isTranscript = event.includes("transcript");
  // Only the transcript event creates the lead: it carries the full messages,
  // the pre-chat form answers (name/phone/email), and avoids duplicates that
  // would come from also handling chat:end.
  if (event && !isTranscript) {
    return NextResponse.json({ ok: true, skipped: `event ${event} (transcript only)` });
  }

  const visitor = (d.visitor ?? {}) as Record<string, unknown>;
  const chat = (d.chat ?? {}) as Record<string, unknown>;
  const chatId = pick(d.chatId, chat.id);
  const pageUrl = pick(d.referrer, d.domain);

  // Base contact info from the documented visitor object.
  let email = isEmail(visitor.email) ? (visitor.email as string).trim().match(EMAIL_RE)![0] : "";
  let fullName = cleanName(pick(visitor.name));
  let phone = "";

  // Transcript path: parse messages + pre-chat form answers.
  let transcript = "";
  const messages = chat.messages;
  if (Array.isArray(messages) && messages.length > 0) {
    const lines: string[] = [];
    for (const m of messages) {
      if (!m || typeof m !== "object") continue;
      const o = m as Record<string, unknown>;
      const text = pick(o.msg, o.text, o.message);
      if (!text) continue;
      // Pre-chat form answers live in a system message — parse fields out of it.
      const form = parsePrechatForm(text);
      if (form.email && !email) email = form.email;
      if (form.phone && !phone) phone = form.phone;
      if ((form.firstName || form.lastName) && !fullName) {
        fullName = [form.firstName, form.lastName].filter(Boolean).join(" ");
      }
      lines.push(`${senderName(o.sender)}: ${text}`);
    }
    transcript = lines.join("\n");
  }

  if (!email && !phone) {
    return NextResponse.json({ ok: true, skipped: "no contact info" });
  }

  const [firstName, ...rest] = fullName.split(/\s+/).filter(Boolean);

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
      message: transcript ? `tawk.to chat transcript:\n${transcript}` : "tawk.to chat.",
      page_url: pageUrl || undefined,
      custom_fields: {
        source: "tawkto_chat",
        tawkto_chat_id: chatId || undefined,
        tawkto_event: event || undefined,
      },
    }),
  });

  if (!leadRes.ok) {
    const errText = await leadRes.text().catch(() => "");
    console.error("[tawkto] submit-lead failed:", leadRes.status, errText.slice(0, 300));
    return NextResponse.json({ error: "Lead capture failed." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
