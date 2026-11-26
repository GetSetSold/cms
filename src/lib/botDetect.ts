/**
 * Bot / crawler detection from a user-agent string — shared by the
 * /api/track route (drops bot traffic before it's recorded), the
 * VisitorTracker (doesn't even send for self-identified bots) and the
 * Admin → Visitors page (labels + people-only filter).
 *
 * Returns a friendly label for known bots, or null for what looks like
 * a real browser. Crawlers that spoof a plain Chrome UA can't be
 * caught this way — that's expected; this removes the honest majority.
 */
export function botKind(ua: string | null | undefined): string | null {
  if (!ua) return null;
  if (/googlebot/i.test(ua)) return "Googlebot";
  if (/bingbot/i.test(ua)) return "Bingbot";
  if (/GPTBot|ChatGPT-User|ClaudeBot|anthropic-ai|PerplexityBot|CCBot|Bytespider|Amazonbot|meta-externalagent/i.test(ua)) return "AI crawler";
  if (/headlesschrome/i.test(ua)) return "Headless (bot)";
  if (/bot|crawler|spider|scraper|curl|wget|python-requests|go-http-client|okhttp/i.test(ua)) return "Bot";
  return null;
}

export function isBotUA(ua: string | null | undefined): boolean {
  return botKind(ua) !== null;
}
