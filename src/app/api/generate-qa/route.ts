import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";

const SYSTEM_PROMPT = `You write natural, self-contained Q&A pairs from real estate blog content, optimized for AI answer engines (Google AI Overviews, ChatGPT, Perplexity) to cite directly.

Rules:
- Phrase each question the way a real person would actually type or ask it — not a generic heading.
- Each answer leads with the direct answer in the first sentence, then at most one short supporting fact. No fluff, no "great question!" preambles.
- Base every answer only on facts actually present in the given content. Do not invent numbers, dates, or claims that aren't there.
- Return 4 to 6 pairs.
- Respond with ONLY valid JSON in exactly this shape, nothing else: {"items":[{"q":"...","a":"..."}]}`;

async function generateWithGroq(content: string) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY is not configured on the server.");

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: content.slice(0, 12000) }, // keep the request reasonably sized
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Groq API error (${res.status}): ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content;
  if (!raw) throw new Error("Groq returned no content.");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed.items)) throw new Error("Groq response wasn't in the expected {items:[...]} shape.");
  return parsed.items as { q: string; a: string }[];
}

// STUB — muse.ai's documented API is a video hosting/search platform (face,
// object, and speech detection on uploaded video), not a text-completion
// endpoint. I couldn't confirm a chat/completions-style API to call here, so
// this deliberately throws rather than pretending to work. If muse.ai does
// expose a text-generation endpoint, point me at its docs and this becomes
// a real implementation instead of a stub.
async function generateWithMuseAi(_content: string): Promise<{ q: string; a: string }[]> {
  throw new Error("muse.ai text generation isn't wired up yet — its public API is video-focused, not text completion. Share their text/chat API docs to finish this.");
}

export async function POST(req: Request) {
  try {
    await requireStaff(["admin", "editor"]);
  } catch {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const { content, provider } = await req.json().catch(() => ({}));
  if (!content || typeof content !== "string") {
    return NextResponse.json({ error: "Missing content to generate from." }, { status: 400 });
  }

  try {
    const items = provider === "museai" ? await generateWithMuseAi(content) : await generateWithGroq(content);
    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
