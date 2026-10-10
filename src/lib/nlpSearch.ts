/**
 * Natural Language Search parser (prototype).
 *
 * Converts plain-English queries like:
 *   "3 bed detached in Hamilton under 700k"
 *   "2 bath condo for rent in Toronto under $2500"
 * into ListingsSearchParams for the existing ListingsBrowser.
 *
 * Rule-based ($0, no LLM, no external calls). Handles the structured
 * patterns that cover ~80% of real estate searches.
 */

export interface ParsedSearch {
  params: Record<string, string>;
  /** Human-readable summary of what was understood. */
  summary: string[];
  /** Parts of the query that weren't understood. */
  unmatched: string[];
}

// Property type keywords -> homeType param values (match your filter options).
const HOME_TYPE_MAP: [RegExp, string][] = [
  [/\bdetached\b/i, "detached"],
  [/\bsemi[-\s]?detached\b/i, "semi-detached"],
  [/\btownh(ouse|ome)s?\b/i, "townhouse"],
  [/\bcondo(s)?\b/i, "condo"],
  [/\bapartment(s)?\b|\bapt\b/i, "apartment"],
  [/\bbungalow(s)?\b/i, "bungalow"],
  [/\blink\b/i, "link"],
];

// Common city names — the site resolves these via listCities(), but for the
// prototype we match against a static list. Production should validate
// against the distinct_cities view.
const KNOWN_CITIES = [
  "toronto", "hamilton", "mississauga", "brampton", "kitchener", "vaughan",
  "oakville", "markham", "burlington", "barrie", "caledonia", "cayuga",
  "dunnville", "hagersville", "jarvis", "selkirk", "fisherville",
  "stoney creek", "ancaster", "dundas", "waterdown", "binbrook",
  "niagara falls", "st. catharines", "welland", "grimsby", "lincoln",
  "oakville", "milton", "georgetown", "acton",
  "guelph", "cambridge", "waterloo",
  "london", "windsor", "sarnia",
  "ottawa", "kingston",
];

/** Parse "700k", "1.2m", "$500,000" -> number. */
function parsePrice(s: string): number | null {
  const clean = s.replace(/[$,\s]/g, "").toLowerCase();
  const m = clean.match(/^(\d+(?:\.\d+)?)(k|m)?$/);
  if (!m) return null;
  let n = parseFloat(m[1]);
  if (m[2] === "k") n *= 1000;
  if (m[2] === "m") n *= 1_000_000;
  return Math.round(n);
}

export function parseNaturalSearch(query: string): ParsedSearch {
  const params: Record<string, string> = {};
  const summary: string[] = [];
  const unmatched: string[] = [];
  let remaining = ` ${query.toLowerCase()} `;

  const consume = (re: RegExp): RegExpMatchArray | null => {
    const m = remaining.match(re);
    if (m) remaining = remaining.replace(m[0], " ");
    return m;
  };

  // --- Bedrooms: "3 bed", "3 bedroom", "3br", "3+ bed" ---
  let m = consume(/(\d+)\s*\+\s*(?:bed(?:room)?s?|br)\b/);
  if (m) {
    params.beds = m[1];
    summary.push(`${m[1]}+ bedrooms`);
  } else {
    m = consume(/(\d+)\s*(?:bed(?:room)?s?|br)\b/);
    if (m) {
      params.beds = m[1];
      summary.push(`${m[1]} bedrooms`);
    }
  }

  // --- Bathrooms: "2 bath", "2 bathroom" ---
  m = consume(/(\d+(?:\.\d+)?)\s*bath(?:room)?s?\b/);
  if (m) {
    params.baths = m[1];
    summary.push(`${m[1]} bathrooms`);
  }

  // --- Price: "under 700k", "below $500,000", "over 1m", "500k-700k", "between 500k and 800k" ---
  m = consume(/between\s+([$,\d.k m]+?)\s+and\s+([$,\d.k m]+)/);
  if (m) {
    const lo = parsePrice(m[1]);
    const hi = parsePrice(m[2]);
    if (lo != null) { params.minPrice = String(lo); summary.push(`min $${lo.toLocaleString()}`); }
    if (hi != null) { params.maxPrice = String(hi); summary.push(`max $${hi.toLocaleString()}`); }
  } else {
    m = consume(/([$,\d.]+k|[$,\d.]+m|[$][\d,]+)\s*[-–—to]+\s*([$,\d.]+k|[$,\d.]+m|[$][\d,]+)/);
    if (m) {
      const lo = parsePrice(m[1]);
      const hi = parsePrice(m[2]);
      if (lo != null) { params.minPrice = String(lo); summary.push(`min $${lo.toLocaleString()}`); }
      if (hi != null) { params.maxPrice = String(hi); summary.push(`max $${hi.toLocaleString()}`); }
    } else {
      m = consume(/(?:under|below|max|up to)\s+([$,\d.]+k|[$,\d.]+m|[$][\d,]+)/);
      if (m) {
        const hi = parsePrice(m[1]);
        if (hi != null) { params.maxPrice = String(hi); summary.push(`under $${hi.toLocaleString()}`); }
      } else {
        m = consume(/(?:over|above|min|from)\s+([$,\d.]+k|[$,\d.]+m|[$][\d,]+)/);
        if (m) {
          const lo = parsePrice(m[1]);
          if (lo != null) { params.minPrice = String(lo); summary.push(`over $${lo.toLocaleString()}`); }
        }
      }
    }
  }

  // --- Sale vs Rent ---
  if (consume(/\bfor\s+rent\b|\brental\b|\blease\b/)) {
    params.type = "rent";
    summary.push("for rent");
  } else if (consume(/\bfor\s+sale\b/)) {
    params.type = "sale";
    summary.push("for sale");
  }

  // --- Home type ---
  for (const [re, value] of HOME_TYPE_MAP) {
    if (consume(re)) {
      params.homeType = value;
      summary.push(value);
      break;
    }
  }

  // --- City: "in Hamilton", or bare city name ---
  m = consume(/\bin\s+([a-z][a-z.\s'-]{2,30}?)(?=\s+(?:under|below|over|above|with|for|between|$))/);
  let cityName: string | null = m ? m[1].trim() : null;
  if (!cityName) {
    // Try bare city name match against known cities.
    for (const c of KNOWN_CITIES) {
      if (consume(new RegExp(`\\b${c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`))) {
        cityName = c;
        break;
      }
    }
  }
  if (cityName) {
    // Capitalize each word for display; the site resolves slugs case-insensitively.
    params.city = cityName.replace(/\b\w/g, (ch) => ch.toUpperCase());
    summary.push(`in ${params.city}`);
  }

  // --- Whatever's left (minus stopwords) is unmatched ---
  const stopwords = new Set(["a", "an", "the", "in", "for", "with", "and", "or", "me", "find", "show", "looking", "search"]);
  const leftover = remaining
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w && !stopwords.has(w) && !/^[.,!?]+$/.test(w));
  if (leftover.length) unmatched.push(leftover.join(" "));

  return { params, summary, unmatched };
}
