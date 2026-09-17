// Cloudflare Worker — public site renderer + lead-capture API
// Merged: your original lead-capture flow (unchanged) + real-estate page
// rendering, which needs a SECOND Supabase project (MLS/DDF data lives in a
// different project than pages/leads/contacts — see the cross-project
// discussion this was built from).
//
// New secrets to add (wrangler secret put), alongside your existing two:
//   MLS_SUPABASE_URL
//   MLS_SUPABASE_SERVICE_ROLE_KEY

import { renderBlocks } from "./blocks.js";
import { tokensAsCSS } from "./tokens.js";
import { siteStyles, dynamicFormStyles } from "./site-styles.js";

async function supabaseFetch(env, path, init = {}) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  return res;
}

async function mlsFetch(env, path, init = {}) {
  const res = await fetch(`${env.MLS_SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: env.MLS_SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.MLS_SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  return res;
}

// Site-wide config (branding, contact info, social links, notification/
// email settings) — one row in the CRM project, managed from the admin
// app's Settings tab. Cached per-isolate for a minute so every block on
// every page request isn't a separate round trip; a cold isolate just
// re-fetches. Falls back to {} on any failure so a broken/missing row
// never takes the whole site down — callers just see fewer overrides.
let settingsCache = null;
let settingsCacheAt = 0;
const SETTINGS_CACHE_MS = 60_000;

async function getSiteSettings(env) {
  if (settingsCache && Date.now() - settingsCacheAt < SETTINGS_CACHE_MS) return settingsCache;
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return {};
  try {
    const res = await supabaseFetch(env, "site_settings?id=eq.1&select=*");
    if (!res.ok) { console.error("getSiteSettings failed:", await res.text()); return settingsCache || {}; }
    const rows = await res.json();
    settingsCache = rows[0] || {};
    settingsCacheAt = Date.now();
    return settingsCache;
  } catch (err) {
    console.error("getSiteSettings threw:", err.message);
    return settingsCache || {};
  }
}

// Fetches one published form (with its sections and questions nested) for
// the dynamic_form block. `.order=position` on the embedded resources asks
// PostgREST to order them server-side; sorted again client-side in blocks.js
// as a belt-and-suspenders in case that embed-ordering syntax isn't honoured
// on this PostgREST version.
async function getForm(env, key) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return null;
  try {
    const q = `forms?key=eq.${encodeURIComponent(key)}&status=eq.published` +
      `&select=*,form_sections(id,title,description,position,form_questions(*))` +
      `&form_sections.order=position.asc&form_sections.form_questions.order=position.asc`;
    const res = await supabaseFetch(env, q);
    if (!res.ok) { console.error("getForm failed:", await res.text()); return null; }
    const rows = await res.json();
    return rows[0] || null;
  } catch (err) {
    console.error("getForm threw:", err.message);
    return null;
  }
}

// Fetches live MLS data for the 3 block types that need it, plus site
// settings for header_nav/footer and a form definition for dynamic_form.
// Called by renderBlocks() via the dataFetcher param — see blocks.js's
// DATA_BLOCK_TYPES.
async function fetchBlockData(type, props, env) {
  if (type === "header_nav" || type === "footer") {
    return getSiteSettings(env);
  }
  if (type === "dynamic_form") {
    return getForm(env, props.formKey || "general_contact");
  }
  if (!env.MLS_SUPABASE_URL || !env.MLS_SUPABASE_SERVICE_ROLE_KEY) {
    console.error(`fetchBlockData(${type}): MLS_SUPABASE_URL or MLS_SUPABASE_SERVICE_ROLE_KEY is missing from env`);
    return type === "listing_grid" ? { listings: [], total: 0 } : type === "map_split_search" ? { listings: [] } : [];
  }
  if (type === "featured_listings") {
    const count = props.count || 3;

    // Lombard Group's own listings live in `property` (ownership/brokerage
    // data), same as mls-search.html's loadFeatured(). Everything else
    // (area/city listings) comes from `grid`, the lighter public table.
    // filter: "office_only" -> property table, office's own listings.
    if (props.filter === "office_only") {
      const q = `property?select=*&OfficeName=eq.${encodeURIComponent("LOMBARD GROUP REAL ESTATE INC.")}&order=OriginalEntryTimestamp.desc&limit=${count}`;
      const res = await mlsFetch(env, q);
      if (!res.ok) { console.error("featured_listings (property) fetch failed:", await res.text()); return []; }
      const rows = await res.json();
      if (rows.length) return rows;
      // fall through to grid if the office has nothing active right now
    }

    let q = `grid?select=*&order=OriginalEntryTimestamp.desc&limit=${count}`;
    if (props.filter === "for_lease") q += `&TotalActualRent=not.is.null`;
    if (props.filter === "for_sale") q += `&ListPrice=not.is.null`;
    if (props.defaultArea) q += `&City=ilike.*${encodeURIComponent(props.defaultArea)}*`;
    const res = await mlsFetch(env, q);
    if (!res.ok) { console.error("featured_listings fetch failed:", await res.text()); return []; }
    return res.json();
  }

  if (type === "listing_grid") {
    const pageSize = props.pageSize || 12;
    let q = `grid?select=*&limit=${pageSize}`;
    if (props.defaultArea) q += `&City=eq.${encodeURIComponent(props.defaultArea)}`;
    const res = await mlsFetch(env, q, { headers: { Prefer: "count=exact" } });
    if (!res.ok) { console.error("listing_grid fetch failed:", await res.text()); return { listings: [], total: 0 }; }
    const listings = await res.json();
    const total = res.headers.get("content-range")?.split("/")[1] ?? listings.length;
    return { listings, total: Number(total) };
  }

  if (type === "map_split_search") {
    let q = `grid?select=*&Latitude=not.is.null&limit=50`;
    if (props.defaultArea) q += `&City=eq.${encodeURIComponent(props.defaultArea)}`;
    const res = await mlsFetch(env, q);
    if (!res.ok) { console.error("map_split_search fetch failed:", await res.text()); return { listings: [] }; }
    return { listings: await res.json() };
  }

  return null;
}

async function fetchListingDetail(listingKey, env) {
  if (!env.MLS_SUPABASE_URL || !env.MLS_SUPABASE_SERVICE_ROLE_KEY) {
    console.error("fetchListingDetail: MLS_SUPABASE_URL or MLS_SUPABASE_SERVICE_ROLE_KEY is missing from env");
    return null;
  }
  const res = await mlsFetch(env, `property?ListingKey=eq.${encodeURIComponent(listingKey)}&select=*`);
  if (!res.ok) {
    console.error("fetchListingDetail failed:", res.status, await res.text());
    return null;
  }
  const rows = await res.json();
  if (!rows.length) console.error("fetchListingDetail: no property row for ListingKey", listingKey);
  return rows[0] || null;
}

function pageShell({ title, description, bodyHtml }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <meta name="description" content="${description || ""}" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>${tokensAsCSS()}${siteStyles}${dynamicFormStyles}</style>
</head>
<body>
  ${bodyHtml}
</body>
</html>`;
}

// Your original router mapped "/" -> "home" and stripped slashes. The pages
// rows this project actually has use the raw path as slug ("/", "/sell",
// "/listings", "/listings/map") — keeping that as the real convention (it's
// what's already stored, and what the DB fix in 0004 assumes) rather than
// rewriting stored data a second time.
async function handlePageRequest(pathname, env) {
  const res = await supabaseFetch(
    env,
    `pages?slug=eq.${encodeURIComponent(pathname)}&status=eq.published&select=*`
  );
  if (!res.ok) return new Response("Error loading page", { status: 500 });
  const rows = await res.json();
  if (!rows.length) return new Response("Not found", { status: 404 });

  const page = rows[0];
  const dataFetcher = (type, props) => fetchBlockData(type, props, env);
  const bodyHtml = await renderBlocks(page.blocks || [], dataFetcher);
  const html = pageShell({
    title: page.seo?.title || page.title,
    description: page.seo?.description || "",
    bodyHtml,
  });
  return new Response(html, { headers: { "content-type": "text/html;charset=UTF-8" } });
}

async function handleListingDetailRequest(listingKey, env) {
  const property = await fetchListingDetail(listingKey, env);
  if (!property) return new Response("Listing not found", { status: 404 });

  const { renderers } = await import("./blocks.js");
  const html = await renderers.listing_detail(
    { showMortgageCalc: true, showHpi: true },
    { listing: property, officeName: property.OfficeName },
    env,
    mlsFetch
  );
  return new Response(
    pageShell({
      title: `${property.UnparsedAddress || listingKey} — GetSetSold`,
      description: (property.PublicRemarks || "").slice(0, 155),
      bodyHtml: html,
    }),
    { headers: { "content-type": "text/html;charset=UTF-8" } }
  );
}

// Handles two submission shapes:
//  1. Old static forms (contact_form/valuation_form/vip_buyer_form in
//     blocks.js) — a native <form method="POST"> submit, fields directly
//     on the body, expects a 303 redirect to /thank-you.
//  2. The new dynamic_form block — submits JSON `{form_key, answers,
//     source_page}` via fetch() from the client, expects a JSON response
//     so it can show an inline success message instead of navigating away.
// Both end up writing to the same contacts/leads/activity_log tables, so
// every submission — old or new — shows up together in the admin's
// existing Leads tab.
async function handleLeadSubmission(request, env) {
  const contentType = request.headers.get("content-type") || "";
  let data = {};
  if (contentType.includes("application/json")) {
    data = await request.json();
  } else {
    const form = await request.formData();
    data = Object.fromEntries(form.entries());
  }

  const isDynamic = data.answers && typeof data.answers === "object";
  const answers = isDynamic ? data.answers : data;
  const formType = data.form_key || data.form_type || "contact";

  // firstName/lastName is the convention dynamic forms use (see 0008's
  // seeded general_contact form); fall back to a single "name" field for
  // anything simpler, or the old static forms' plain "name" field.
  const name = answers.name ||
    [answers.firstName, answers.lastName].filter(Boolean).join(" ") ||
    data.name || "";

  const contactType = ["vip_buyer", "buyer_intake"].includes(formType) ? "buyer"
    : ["valuation", "home_evaluation", "seller_intake"].includes(formType) ? "seller"
    : "lead";

  const contactRes = await supabaseFetch(env, "contacts", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      name,
      email: answers.email || data.email,
      phone: answers.phone || data.phone,
      type: contactType,
      source: data.source_page || "unknown",
    }),
  });
  const contactRows = await contactRes.json();
  const contactId = contactRows?.[0]?.id;

  await supabaseFetch(env, "leads", {
    method: "POST",
    body: JSON.stringify({
      contact_id: contactId,
      form_type: formType,
      payload: isDynamic ? answers : data,
    }),
  });

  if (contactId) {
    await supabaseFetch(env, "activity_log", {
      method: "POST",
      body: JSON.stringify({
        contact_id: contactId,
        actor: "system",
        action: "form_submitted",
        notes: `Form type: ${formType}`,
      }),
    });
  }

  if (isDynamic) {
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "content-type": "application/json", ...CORS_HEADERS },
    });
  }
  return Response.redirect(new URL("/thank-you", request.url).toString(), 303);
}

// Stateless preview: renders whatever `blocks` array the admin app sends
// through the SAME renderBlocks()/pageShell() code the real site uses —
// no separate preview-only rendering path to drift out of sync, and
// nothing is written to the database. The admin app calls this on every
// edit (debounced) and puts the returned HTML into an iframe via srcdoc.
async function handlePreviewRequest(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response("Bad request body", { status: 400, headers: CORS_HEADERS });
  }
  const blocks = Array.isArray(body.blocks) ? body.blocks : [];
  const dataFetcher = (type, props) => fetchBlockData(type, props, env);
  const bodyHtml = await renderBlocks(blocks, dataFetcher);
  const html = pageShell({
    title: body.title || "Preview",
    description: body.seo?.description || "",
    bodyHtml,
  });
  return new Response(html, {
    headers: { "content-type": "text/html;charset=UTF-8", ...CORS_HEADERS },
  });
}

// The admin app (admin.rohit-910.workers.dev) calls /api/preview on this
// Worker (cms.rohit-910.workers.dev) — different origins, so this needs
// CORS. The endpoint only renders whatever block JSON it's given and never
// touches the database, so an open origin is fine here.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/leads" && request.method === "POST") {
      return handleLeadSubmission(request, env);
    }

    if (url.pathname === "/api/preview") {
      if (request.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
      if (request.method === "POST") return handlePreviewRequest(request, env);
    }

    const listingMatch = url.pathname.match(/^\/listings\/([A-Za-z0-9-]+)$/);
    if (listingMatch && listingMatch[1] !== "map") {
      return handleListingDetailRequest(listingMatch[1], env);
    }

    return handlePageRequest(url.pathname, env);
  },
};
