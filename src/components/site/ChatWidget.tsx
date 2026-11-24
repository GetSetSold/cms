"use client";
/**
 * Website chat assistant — "Rohit Sharma Real Estate".
 * Black-and-white theme with the site accent (#0099cc via --c-accent) used
 * only for the online dot and links. Answers come from /api/chat (site
 * knowledge + live listings). When a visitor wants a viewing, valuation or
 * callback, the widget collects name + phone in the chat and submits a CRM
 * lead through submit-lead with the transcript attached.
 * Replaces the tawk.to bubble (removed from Settings → Custom code).
 */
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

type Msg = { from: "bot" | "user"; text: string };
type LeadIntent = "viewing" | "valuation" | "callback";

const GREETING =
  "Hi there — I'm the assistant for Rohit Sharma Real Estate. I can answer questions about buying, selling and renting in Caledonia & Haldimand County. How can I help?";
const CHIPS = [
  "What do you charge to sell?",
  "Homes for sale in Caledonia",
  "Book a viewing",
  "Free home valuation",
];
const INTENT_LABEL: Record<LeadIntent, string> = {
  viewing: "book a viewing",
  valuation: "a free home valuation",
  callback: "a callback from Rohit",
};

/** Render bot text with bare URLs turned into links. */
function RichText({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return (
    <>
      {parts.map((p, i) =>
        /^https?:\/\//.test(p) ? (
          <a key={i} href={p} target="_blank" rel="noreferrer" className="font-semibold text-[#0099cc] underline">
            {p.replace(/^https?:\/\/(www\.)?/, "").split("/").slice(0, 3).join("/")}…
          </a>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

export function ChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([{ from: "bot", text: GREETING }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [lead, setLead] = useState<{ intent: LeadIntent; step: "name" | "phone"; name: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const started = useRef(Date.now());

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, open, lead]);

  if (pathname.startsWith("/admin") || pathname.startsWith("/login") || pathname.startsWith("/builder")) return null;

  function push(from: Msg["from"], text: string) {
    setMessages((m) => [...m, { from, text }]);
  }

  function startLead(intent: LeadIntent) {
    setLead({ intent, step: "name", name: "" });
    push("bot", `Happy to set up ${INTENT_LABEL[intent]}. What's your name?`);
  }

  async function submitLead(intent: LeadIntent, name: string, phone: string, transcript: Msg[]) {
    const convo = transcript.map((m) => `${m.from === "user" ? "Visitor" : "Assistant"}: ${m.text}`).join("\n");
    const payload = JSON.stringify({
      name,
      phone,
      message: `Website chat lead — wants ${INTENT_LABEL[intent]}. Page: ${pathname}\n\nConversation:\n${convo}`,
      form_key: "website_chat",
      path: pathname,
      elapsed_ms: Date.now() - started.current,
    });
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/submit-lead`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: payload,
    }).catch(() => null);
    if (res?.ok) {
      push("bot", "Perfect — you're all set. Rohit will reach out shortly to confirm the details.");
    } else {
      push("bot", "Thanks — I couldn't send that just now, but you can reach Rohit directly at (416) 605-7488.");
    }
  }

  async function handleUserText(raw: string) {
    const text = raw.trim();
    if (!text || busy) return;
    setInput("");
    const next: Msg[] = [...messages, { from: "user", text }];
    setMessages(next);

    // Lead capture flow runs locally — no API round-trip.
    if (lead) {
      if (lead.step === "name") {
        setLead({ ...lead, step: "phone", name: text });
        push("bot", `Thanks, ${text.split(" ")[0]}. And the best phone number to reach you?`);
      } else {
        const done = lead;
        setLead(null);
        await submitLead(done.intent, done.name, text, next);
      }
      return;
    }

    setBusy(true);
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: pathname,
        messages: next.slice(-10).map((m) => ({ role: m.from === "user" ? "user" : "assistant", content: m.text })),
      }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setBusy(false);
    let reply: string = data?.reply || "Happy to help — could you tell me a bit more about what you're looking for?";
    const token = reply.match(/\[\[lead:(viewing|valuation|callback)\]\]/);
    if (token) {
      reply = reply.replace(token[0], "").trim();
      if (reply) push("bot", reply);
      startLead(token[1] as LeadIntent);
    } else {
      push("bot", reply);
    }
  }

  function onChip(chip: string) {
    if (chip === "Book a viewing") {
      push("user", chip);
      startLead("viewing");
    } else if (chip === "Free home valuation") {
      push("user", chip);
      startLead("valuation");
    } else {
      void handleUserText(chip);
    }
  }

  return (
    <>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          aria-label="Chat with Rohit Sharma Real Estate"
          className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-[999px] bg-ink text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      ) : null}

      {open ? (
        <div className="fixed bottom-5 right-5 z-50 flex h-[min(560px,78vh)] w-[min(380px,calc(100vw-32px))] flex-col overflow-hidden rounded-[18px] border border-line bg-white shadow-[0_16px_48px_rgba(0,0,0,0.3)]">
          <div className="flex items-center gap-[10px] bg-ink p-[14px_16px] text-white">
            <div className="flex h-9 w-9 flex-none items-center justify-center rounded-[999px] bg-white text-[14px] font-extrabold text-ink">
              RS
            </div>
            <div className="min-w-0 leading-tight">
              <p className="text-[15.5px] font-bold">Rohit Sharma Real Estate</p>
              <p className="flex items-center gap-[5px] text-[12.5px] text-white/60">
                <span className="inline-block h-2 w-2 rounded-[999px]" style={{ background: "var(--c-accent, #0099cc)" }} />
                Online — replies instantly
              </p>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close chat" className="ml-auto flex-none p-1 text-white/80">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div ref={scrollRef} className="flex flex-1 flex-col gap-2 overflow-y-auto bg-soft p-[14px_12px]">
            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.from === "user"
                    ? "max-w-[82%] self-end whitespace-pre-wrap rounded-[14px] rounded-br-[4px] bg-ink p-[9px_12px] text-[14.5px] leading-relaxed text-white"
                    : "max-w-[82%] self-start whitespace-pre-wrap rounded-[14px] rounded-bl-[4px] border border-line bg-white p-[9px_12px] text-[14.5px] leading-relaxed"
                }
              >
                {m.from === "bot" ? <RichText text={m.text} /> : m.text}
              </div>
            ))}
            {busy ? <div className="self-start rounded-[14px] border border-line bg-white p-[9px_12px] text-[14.5px] text-muted">Typing…</div> : null}
          </div>

          <div className="flex flex-wrap gap-[6px] bg-soft p-[10px_12px_4px]">
            {CHIPS.map((c) => (
              <button
                key={c}
                onClick={() => onChip(c)}
                className="rounded-[999px] border border-ink bg-transparent p-[6px_11px] text-[13px] font-semibold text-ink"
              >
                {c}
              </button>
            ))}
          </div>

          <div className="flex gap-2 bg-soft p-[10px_12px_12px]">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void handleUserText(input)}
              placeholder={lead ? (lead.step === "name" ? "Your name…" : "Your phone number…") : "Type your question…"}
              aria-label="Type your message"
              className="min-w-0 flex-1 rounded-[999px] border border-line bg-white p-[11px_12px] text-[14.5px]"
            />
            <button
              onClick={() => void handleUserText(input)}
              className="flex-none rounded-[999px] bg-ink p-[11px_16px] text-[14.5px] font-bold text-white"
            >
              Send
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
