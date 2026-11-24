/**
 * Website chat assistant API ("Rohit Sharma Real Estate").
 * Answers from src/lib/chatKnowledge.ts plus LIVE listings pulled from the
 * MLS grid at request time (never from model memory). Powered by Cloudflare
 * Workers AI (free tier) via the AI binding declared in wrangler.jsonc —
 * no API key, no per-token billing. If the binding is missing the route
 * returns a graceful fallback that offers a callback instead.
 */
import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createMlsClient, LISTING_CARD_COLUMNS, listingSlug, rawCitiesFor, type GridListing } from "@/lib/mls";
import { CHAT_SYSTEM_PROMPT } from "@/lib/chatKnowledge";
import { siteDirectory, matchedPageContext } from "@/lib/siteKnowledge";

type ChatMessage = { role: "user" | "assistant"; content: string };

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.getsetsold.ca";
const CITIES = [
  "caledonia", "haldimand", "hamilton", "ancaster", "stoney creek", "dunnville",
  "cayuga", "hagersville", "jarvis", "binbrook", "waterdown", "burlington", "grimsby",
];
const fmt = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

function listingLine(l: GridListing): string {
  const url = `${SITE}/real-estate/${l.ListingKey}/${listingSlug(l)}`;
  const beds = l.BedroomsTotal != null ? `${l.BedroomsTotal} bed` : "";
  const baths = l.BathroomsTotalInteger != null ? `${l.BathroomsTotalInteger} bath` : "";
  const size = l.AboveGradeFinishedArea ? `${l.AboveGradeFinishedArea} sq ft` : "";
  const facts = [beds, baths, size].filter(Boolean).join(", ");
  if (l.ListPrice) return `- ${l.UnparsedAddress}, ${l.City} — for sale at ${fmt(l.ListPrice)}${facts ? ` (${facts})` : ""} — ${url}`;
  if (l.TotalActualRent) return `- ${l.UnparsedAddress}, ${l.City} — for rent at ${fmt(l.TotalActualRent)}/mo${facts ? ` (${facts})` : ""} — ${url}`;
  return `- ${l.UnparsedAddress}, ${l.City} — ${url}`;
}

/** Live listings context: the listing on the page being viewed, plus a
 *  small search when the visitor names a city / rent / price cap. */
async function listingsContext(lastUser: string, path: string): Promise<string> {
  const mls = createMlsClient();
  const parts: string[] = [];

  const keyMatch = path.match(/\/real-estate\/(\d+)\//);
  if (keyMatch) {
    const { data } = await mls.from("grid").select(LISTING_CARD_COLUMNS).eq("ListingKey", keyMatch[1]).limit(1);
    if (data?.length) parts.push(`The visitor is currently viewing this listing:\n${listingLine(data[0] as GridListing)}`);
  }

  const text = lastUser.toLowerCase();
  const city = CITIES.find((c) => text.includes(c));
  const wantsRent = /\brent|lease|tenant/.test(text);
  const wantsBuy = /buy|sale|sell|purchase|home|house|listing/.test(text);
  const capMatch = text.match(/under\s*\$?([\d,.]+)\s*(k|m|million)?/);
  let cap: number | null = null;
  if (capMatch) {
    const raw = parseFloat(capMatch[1].replace(/,/g, ""));
    cap = capMatch[2] === "k" ? raw * 1_000 : capMatch[2] ? raw * 1_000_000 : raw;
  }

  if (city && (wantsRent || wantsBuy || cap)) {
    const variants = await rawCitiesFor(city.replace(/\b\w/g, (c) => c.toUpperCase()));
    let q = mls.from("grid").select(LISTING_CARD_COLUMNS).in("City", variants).order("OriginalEntryTimestamp", { ascending: false }).limit(4);
    if (wantsRent && !wantsBuy) q = q.not("TotalActualRent", "is", null);
    else q = q.not("ListPrice", "is", null);
    if (cap && !wantsRent) q = q.lte("ListPrice", cap);
    if (cap && wantsRent) q = q.lte("TotalActualRent", cap);
    const { data } = await q;
    if (data?.length) {
      parts.push(`Live listings matching the visitor's question (newest first):\n${(data as GridListing[]).map(listingLine).join("\n")}`);
    } else {
      parts.push(`A live search found no current ${wantsRent ? "rentals" : "listings"} matching the visitor's question. Say so honestly and offer property alerts or a callback.`);
    }
    const cityLabel = city.replace(/\b\w/g, (c) => c.toUpperCase());
    const browseUrl = `${SITE}/${city.replace(/\s+/g, "-")}-real-estate${wantsRent && !wantsBuy ? "?type=rent" : ""}`;
    parts.push(`Browse all ${wantsRent && !wantsBuy ? "rentals" : "homes for sale"} in ${cityLabel}: ${browseUrl}`);
  }

  return parts.length ? `\n\nLIVE LISTINGS\n${parts.join("\n\n")}` : "";
}

type WorkersAi = {
  run: (model: string, input: unknown) => Promise<{ response?: string }>;
};

function aiBinding(): WorkersAi | null {
  try {
    const env = getCloudflareContext().env as unknown as { AI?: WorkersAi };
    return env.AI ?? null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const messages: ChatMessage[] = Array.isArray(body?.messages) ? body.messages.slice(-10) : [];
  const path = typeof body?.path === "string" ? body.path : "/";
  if (!messages.length) return NextResponse.json({ error: "No messages" }, { status: 400 });

  const ai = aiBinding();
  if (!ai) {
    return NextResponse.json({
      reply:
        "Thanks for reaching out — the assistant is just being set up. Rohit can answer directly: tap below to request a callback, or call (416) 605-7488.\n[[lead:callback]]",
    });
  }

  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const [listings, directory, pageContent] = await Promise.all([
    listingsContext(lastUser, path).catch(() => ""),
    siteDirectory(),
    matchedPageContext(lastUser, path),
  ]);
  const context = directory + pageContent + listings;

  // Workers AI chat models take the system prompt as a message in the
  // array. Llama 3.3 70B is a plain instruction model — no hidden
  // reasoning tokens are billed or burned before the answer, unlike the
  // reasoning model this replaced (Nov 24 cost review).
  let reply = "";
  try {
    const out = await ai.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
      messages: [
        { role: "system", content: CHAT_SYSTEM_PROMPT + context },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
      max_tokens: 700,
    });
    reply = (out?.response ?? "").trim();
  } catch {
    reply = "";
  }

  if (!reply) {
    return NextResponse.json({
      reply:
        "Sorry, I couldn't pull that up just now. Rohit can help directly — request a callback below or call (416) 605-7488.\n[[lead:callback]]",
    });
  }
  return NextResponse.json({ reply });
}
