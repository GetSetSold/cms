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
import { siteStyles } from "./site-styles.js";

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

// Fetches live MLS data for the 3 block types that need it. Called by
// renderBlocks() via the dataFetcher param — see blocks.js's DATA_BLOCK_TYPES.
async function fetchBlockData(type, props, env) {
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
  const res = await mlsFetch(env, `property?ListingKey=eq.${encodeURIComponent(listingKey)}&select=*`);
  if (!res.ok) return null;
  const rows = await res.json();
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
  <style>${tokensAsCSS()}${siteStyles}</style>
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

async function handleLeadSubmission(request, env) {
  const contentType = request.headers.get("content-type") || "";
  let data = {};
  if (contentType.includes("application/json")) {
    data = await request.json();
  } else {
    const form = await request.formData();
    data = Object.fromEntries(form.entries());
  }

  const formType = data.form_type || "contact";

  const contactRes = await supabaseFetch(env, "contacts", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      name: data.name,
      email: data.email,
      phone: data.phone,
      type: formType === "vip_buyer" ? "buyer" : formType === "valuation" ? "seller" : "lead",
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
      payload: data,
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

  return Response.redirect(new URL("/thank-you", request.url).toString(), 303);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/leads" && request.method === "POST") {
      return handleLeadSubmission(request, env);
    }

    const listingMatch = url.pathname.match(/^\/listings\/([A-Za-z0-9-]+)$/);
    if (listingMatch && listingMatch[1] !== "map") {
      return handleListingDetailRequest(listingMatch[1], env);
    }

    return handlePageRequest(url.pathname, env);
  },
};
