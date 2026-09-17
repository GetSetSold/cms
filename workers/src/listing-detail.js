// listing-detail.js — full single-listing page renderer, ported from the
// real getsetsold.ca real-estate.html (price hero, stats, description,
// features, room details, gallery, mortgage calculator, similar listings,
// HPI market trends) but restyled in our own brand tokens (Fraunces/Manrope,
// ink/blue) instead of their Roboto/#013A51 theme, per your call to use the
// new design system rather than pixel-match the old one.
//
// Data contract (confirmed from the real pages, not guessed):
//   ListingKey, UnparsedAddress, City, Province, PostalCode, OfficeName,
//   ListPrice, TotalActualRent, BedroomsTotal, BathroomsTotalInteger,
//   ParkingTotal, AboveGradeFinishedArea, PublicRemarks, Media (array of
//   {MediaURL, Order}), PhotosCount, OriginalEntryTimestamp.
// Sale vs rent: ListPrice present -> sale; else TotalActualRent -> rent.
//
// Two things on the real page are NOT stored in either Supabase project —
// they're separate external pieces, and I'm reproducing the same pattern
// rather than guessing a schema for them:
//   - Room details: the real page loads them via a separate script
//     (rooms-metrics.js) that reads a `Rooms` field on the listing row.
//     This renderer reads `listing.Rooms` the same way IF it's present
//     (array of {RoomType, Level, Dimensions} — the common RESO shape) and
//     simply omits the section if it isn't, rather than fabricating rows.
//   - HPI market trends: the real page fetches a public static JSON file
//     at https://www.getsetsold.ca/ontario-housing-market/ontario-hpi-data.json
//     client-side. This renderer fetches that same public file the same
//     way (client-side, after page load) — it isn't in Supabase, so the
//     Worker can't pre-fetch it server-side without hardcoding that URL,
//     which felt like the wrong place to bake in that dependency
//     permanently. Flag this to me if you'd rather it move server-side.

import { tokens } from "./tokens.js";

function esc(s = "") {
  return String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function fmtMoney(n) {
  if (n == null || n === "") return null;
  const num = Number(n);
  if (Number.isNaN(num)) return null;
  return "$" + num.toLocaleString("en-CA");
}

function isSale(listing) {
  return listing.ListPrice != null && listing.ListPrice !== "";
}

function priceDisplay(listing) {
  if (isSale(listing)) return fmtMoney(listing.ListPrice) || "Price on request";
  if (listing.TotalActualRent) return (fmtMoney(listing.TotalActualRent) || "") + "/mo";
  return "Price on request";
}

function daysOnMarket(timestamp) {
  if (!timestamp) return null;
  const entry = new Date(timestamp);
  if (Number.isNaN(entry.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - entry.getTime()) / 86400000));
}

// Field names confirmed from the real listings-images.js: listing.Media is
// an array of { MediaURL, Caption, PreferredPhotoYN } — no "Order" field.
// The hero photo is whichever item has PreferredPhotoYN true (falls back
// to the first valid item), not a sort order. Returns [{url, caption}].
function mediaItems(media) {
  if (!media) return [];
  let arr = media;
  if (typeof media === "string") {
    try { arr = JSON.parse(media); } catch { return media.startsWith("http") ? [{ url: media, caption: "" }] : []; }
  }
  if (!Array.isArray(arr)) return [];
  const valid = arr.filter((m) => m && (m.MediaURL || (typeof m === "string" && m)));
  const items = valid.map((m) => ({
    url: typeof m === "string" ? m : m.MediaURL,
    caption: typeof m === "string" ? "" : m.Caption || "",
    preferred: typeof m === "string" ? false : !!m.PreferredPhotoYN,
  }));
  const preferredIdx = items.findIndex((m) => m.preferred);
  if (preferredIdx > 0) {
    const [preferred] = items.splice(preferredIdx, 1);
    items.unshift(preferred);
  }
  return items;
}

// Back-compat helper for callers that just want URLs (similar-listing cards, etc.)
function mediaUrls(media) {
  return mediaItems(media).map((m) => m.url);
}

function statPill(label, value) {
  if (value == null || value === "") return "";
  return `<div class="ld-stat"><div class="ld-stat-value">${esc(String(value))}</div><div class="ld-stat-label">${esc(label)}</div></div>`;
}

// Gallery — uses Fancybox (same library/CDN as your real
// listings-thumbnail-fancybox.js) instead of a hand-rolled lightbox: real
// pinch-zoom, a proper toolbar (zoom/fullscreen/download/close), and one
// less thing for us to maintain. Each photo is wrapped in an
// <a data-fancybox="gallery" href="{full photo}">, matching the real
// site's markup convention, and Fancybox.bind() picks all of them up.
// items: [{url, caption, preferred}] from mediaItems() — already ordered
// with the preferred/hero photo first. We keep our 2x2 thumbnail grid
// (rather than the real site's full thumbnail strip) for visual fit with
// the rest of the brand, but every photo stays reachable: the "+N more"
// tile and hidden anchors keep the FULL set navigable inside Fancybox,
// same as clicking through all photos on the real site.
function renderGallery(items) {
  if (!items.length) {
    return `<div class="ld-hero-img ld-hero-empty">No photos available</div>`;
  }
  const [hero, ...rest] = items;
  const photoCount = items.length;
  const thumbs = rest.slice(0, 4).map(
    (m) => `<a data-fancybox="gallery" href="${esc(m.url)}" data-caption="${esc(m.caption)}" class="ld-thumb" style="background-image:url('${esc(m.url)}')"></a>`
  ).join("");
  const extraCount = items.length > 5 ? items.length - 5 : 0;
  const extra = extraCount
    ? `<a data-fancybox="gallery" href="${esc(items[5].url)}" data-caption="${esc(items[5].caption)}" class="ld-thumb-more">+${extraCount} more</a>` +
      items.slice(6).map((m) => `<a data-fancybox="gallery" href="${esc(m.url)}" data-caption="${esc(m.caption)}" style="display:none;"></a>`).join("")
    : "";
  return `
    <div class="ld-gallery">
      <a data-fancybox="gallery" href="${esc(hero.url)}" data-caption="${esc(hero.caption)}" class="ld-hero-img" style="background-image:url('${esc(hero.url)}')">
        ${photoCount > 1 ? `<span class="ld-photo-count">+${photoCount - 1}</span>` : ""}
      </a>
      <div class="ld-thumb-grid">${thumbs}${extra}</div>
    </div>`;
}

// Field names confirmed from the real rooms-metrics.js on getsetsold.ca:
// listing.Rooms is an array of { RoomLevel, RoomType, RoomDimensions,
// RoomLength, RoomWidth, RoomLengthWidthUnits }. RoomDimensions is a
// pre-formatted string when present; otherwise we build "L x W units"
// from RoomLength/RoomWidth/RoomLengthWidthUnits the same way that script does.
function roomDimensions(r) {
  if (r.RoomDimensions) return r.RoomDimensions;
  if (r.RoomLength && r.RoomWidth) {
    const units = r.RoomLengthWidthUnits || "";
    return `${r.RoomLength} x ${r.RoomWidth}${units ? " " + units : ""}`;
  }
  return null;
}

function renderRooms(listing) {
  let rooms = listing.Rooms;
  if (typeof rooms === "string") {
    try { rooms = JSON.parse(rooms); } catch { rooms = null; }
  }
  if (!Array.isArray(rooms) || !rooms.length) return "";
  const rows = rooms.map((r) => `
    <div class="ld-room-row">
      <div class="ld-room-col"><div class="ld-room-label">Room</div><div>${esc(r.RoomType || "—")}</div></div>
      <div class="ld-room-col"><div class="ld-room-label">Level</div><div>${esc(r.RoomLevel || "—")}</div></div>
      <div class="ld-room-col"><div class="ld-room-label">Dimensions</div><div>${esc(roomDimensions(r) || "—")}</div></div>
    </div>`).join("");
  return `
    <div class="ld-section">
      <div class="ld-section-title">Room Details</div>
      <div class="ld-room-table">${rows}</div>
    </div>`;
}

function renderFeatures(listing) {
  const items = [];
  if (listing.HeatType) items.push(`Heating: ${listing.HeatType}`);
  if (listing.CoolingYN != null) items.push(listing.CoolingYN ? "Central Air" : null);
  if (listing.BasementType) items.push(`Basement: ${listing.BasementType}`);
  if (listing.GarageType || listing.ParkingTotal) items.push(`Parking: ${listing.GarageType || listing.ParkingTotal}`);
  if (listing.PropertyType) items.push(listing.PropertyType);
  if (listing.YearBuilt) items.push(`Built ${listing.YearBuilt}`);
  const clean = items.filter(Boolean);
  if (!clean.length) return "";
  return `
    <div class="ld-section">
      <div class="ld-section-title">Features</div>
      <div class="ld-features-grid">
        ${clean.map((f) => `<div class="ld-feature-item">${esc(f)}</div>`).join("")}
      </div>
    </div>`;
}

function renderMortgageCalc(listing) {
  if (!isSale(listing)) return "";
  const price = Number(listing.ListPrice) || 0;
  return `
    <div class="ld-card">
      <div class="ld-card-title">Mortgage Calculator</div>
      <div class="ld-calc" data-price="${price}">
        <label>Down payment (%)
          <input type="number" class="ld-calc-down" value="20" min="0" max="100">
        </label>
        <label>Interest rate (%)
          <input type="number" class="ld-calc-rate" value="5.25" step="0.05" min="0">
        </label>
        <label>Amortization (years)
          <input type="number" class="ld-calc-years" value="25" min="1" max="30">
        </label>
        <div class="ld-calc-result">
          <div class="ld-calc-result-label">Est. monthly payment</div>
          <div class="ld-calc-result-value" id="ld-calc-output">—</div>
        </div>
      </div>
    </div>`;
}

function renderContactCard(listing) {
  const price = priceDisplay(listing);
  return `
    <div class="ld-card ld-contact-card">
      <div class="ld-contact-price">${esc(price)}</div>
      <div class="ld-contact-office">${esc(listing.OfficeName || "Lombard Group Real Estate Inc., Brokerage")}</div>
      <form class="ld-contact-form" data-form-type="listing_inquiry" action="/api/leads" method="POST">
        <input type="hidden" name="listing_key" value="${esc(listing.ListingKey || "")}">
        <input type="hidden" name="source_page" value="${esc("/listings/" + (listing.ListingKey || ""))}">
        <input name="name" placeholder="Name" required>
        <input name="email" type="email" placeholder="Email" required>
        <input name="phone" placeholder="Phone" required>
        <textarea name="message" placeholder="I'm interested in this property...">I'm interested in ${esc(listing.UnparsedAddress || "this property")}.</textarea>
        <button type="submit" class="ld-btn-primary">Request Info</button>
      </form>
      <a class="ld-btn-secondary" href="tel:+14166057488">Call 416-605-7488</a>
    </div>`;
}

// Cashback banner — matches your real cashback-banner.js: sale listings get
// a cashback offer (0.25% of list price, capped at $5,000), rentals get a
// "free service to tenants" message instead. Same two CTAs: call, and
// share (native share sheet with a clipboard-copy fallback).
function renderCashbackBanner(listing) {
  const sale = isSale(listing);
  const shareUrl = `/listings/${encodeURIComponent(listing.ListingKey || "")}`;
  if (sale) {
    const price = Number(listing.ListPrice) || 0;
    const cashback = Math.min(price * 0.0025, 5000);
    return `
      <div class="ld-cashback sale">
        <div class="ld-cashback-pill">Cashback Offer</div>
        <div class="ld-cashback-headline">Get <em>$${Math.round(cashback).toLocaleString()}</em> cash back when you buy this home</div>
        <div class="ld-cashback-sub">Purchase this property with us and receive up to <strong>$${Math.round(cashback).toLocaleString()}</strong> back at closing &mdash; no catches, just more money in your pocket.</div>
        <div class="ld-cashback-actions">
          <a class="ld-cashback-cta primary" href="tel:+14166057488">Enquire Now</a>
          <button type="button" class="ld-cashback-cta secondary" data-share-url="${esc(shareUrl)}">Share</button>
        </div>
      </div>`;
  }
  return `
    <div class="ld-cashback rent">
      <div class="ld-cashback-pill">Free Service</div>
      <div class="ld-cashback-headline">Free rental service for <em>tenants</em></div>
      <div class="ld-cashback-sub">We'll help you secure this rental at no cost to you &mdash; our fee is covered by the landlord.</div>
      <div class="ld-cashback-actions">
        <a class="ld-cashback-cta primary" href="tel:+14166057488">Enquire Now</a>
        <button type="button" class="ld-cashback-cta secondary" data-share-url="${esc(shareUrl)}">Share</button>
      </div>
    </div>`;
}

// Directions/map — matches your real listings-directions.js: same MapTiler
// key, a small map centered on the listing, and a button that just opens
// Google Maps with the coordinates as the destination (no routing API).
const MAPTILER_KEY = "Zr8EXulAyt75JJibE0ol";

function renderMapDirections(listing) {
  const lat = parseFloat(listing.Latitude);
  const lng = parseFloat(listing.Longitude);
  if (!lat || !lng) return "";
  return `
    <div class="ld-section">
      <div class="ld-section-title">Location &amp; Directions</div>
      <div id="ld-map" class="ld-map" data-lat="${lat}" data-lng="${lng}"></div>
      <a class="ld-btn-secondary" style="margin-top:12px;" target="_blank"
         href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}">Get Directions</a>
    </div>`;
}

// Nearby places — your live site uses the Mapbox Search API for this, which
// needs a genuine Mapbox token (different service from MapTiler, which is
// what we actually have a key for). Since there's no Mapbox token, this
// uses the Overpass API (OpenStreetMap) instead: free, no key required,
// and consistent with MapTiler's own OSM-based map data. Same three
// categories as the live site (schools, restaurants, grocery).
function renderPoiSection(listing) {
  const lat = parseFloat(listing.Latitude);
  const lng = parseFloat(listing.Longitude);
  if (!lat || !lng) return "";
  return `
    <div class="ld-section" id="ld-poi-section" data-lat="${lat}" data-lng="${lng}">
      <div class="ld-section-title">What's Nearby</div>
      <div class="ld-poi-tabs">
        <button type="button" class="ld-poi-tab active" data-cat="school">Schools</button>
        <button type="button" class="ld-poi-tab" data-cat="restaurant">Restaurants</button>
        <button type="button" class="ld-poi-tab" data-cat="grocery">Grocery</button>
      </div>
      <div class="ld-poi-list" id="ld-poi-list"><div class="ld-hpi-loading">Loading nearby places…</div></div>
    </div>`;
}

async function fetchSimilar(listing, env, mlsFetch) {
  if (!listing.City) return [];
  const q = `grid?select=*&City=ilike.*${encodeURIComponent(listing.City)}*&ListingKey=neq.${encodeURIComponent(listing.ListingKey || "")}&limit=4`;
  try {
    const res = await mlsFetch(env, q);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

function renderSimilarCard(row) {
  const photos = mediaUrls(row.Media);
  const price = isSale(row) ? fmtMoney(row.ListPrice) : (row.TotalActualRent ? (fmtMoney(row.TotalActualRent) || "") + "/mo" : "Price on request");
  return `
    <a class="ld-similar-card" href="/listings/${esc(row.ListingKey || "")}">
      <div class="ld-similar-thumb" style="background-image:url('${esc(photos[0] || "")}')"></div>
      <div class="ld-similar-body">
        <div class="ld-similar-price">${esc(price)}</div>
        <div class="ld-similar-addr">${esc(row.UnparsedAddress || "")}</div>
        <div class="ld-similar-city">${esc(row.City || "")}</div>
      </div>
    </a>`;
}

export async function renderListingDetail(props, data, env, mlsFetch) {
  const listing = data?.listing || {};
  const photos = mediaItems(listing.Media);
  const dom = daysOnMarket(listing.OriginalEntryTimestamp);
  const sale = isSale(listing);

  const similar = mlsFetch ? await fetchSimilar(listing, env, mlsFetch) : [];

  const statsHtml = [
    statPill("Beds", listing.BedroomsTotal),
    statPill("Baths", listing.BathroomsTotalInteger),
    statPill("Parking", listing.ParkingTotal),
    statPill("Sqft", listing.AboveGradeFinishedArea ? Number(listing.AboveGradeFinishedArea).toLocaleString() : null),
  ].join("");

  return `
  <div class="ld-wrap">
    <div class="ld-breadcrumb"><a href="/">Home</a> / <a href="/listings">Listings</a> / ${esc(listing.City || "")}</div>

    ${renderGallery(photos)}

    <div class="ld-layout">
      <div class="ld-main">
        <div class="ld-price-hero">
          <div class="ld-status-tag ${sale ? "sale" : "rent"}">${sale ? "For Sale" : "For Rent"}</div>
          <div class="ld-price">${esc(priceDisplay(listing))}</div>
          <div class="ld-address">${esc(listing.UnparsedAddress || "")}${listing.City ? ", " + esc(listing.City) : ""}${listing.Province ? ", " + esc(listing.Province) : ""} ${esc(listing.PostalCode || "")}</div>
          ${dom != null ? `<div class="ld-dom">Listed ${dom}${dom === 1 ? " day" : " days"} ago</div>` : ""}
        </div>

        ${props.showCashback !== false ? renderCashbackBanner(listing) : ""}

        <div class="ld-stats-bar">${statsHtml}</div>

        ${listing.PublicRemarks ? `
        <div class="ld-section">
          <div class="ld-section-title">About This Property</div>
          <div class="ld-description">${esc(listing.PublicRemarks)}</div>
        </div>` : ""}

        ${renderFeatures(listing)}
        ${renderRooms(listing)}
        ${props.showMap !== false ? renderMapDirections(listing) : ""}
        ${props.showPoi !== false ? renderPoiSection(listing) : ""}

        ${props.showHpi !== false ? `
        <div class="ld-section" id="ld-hpi-section" data-city="${esc(listing.City || "")}">
          <div class="ld-section-title">Local Market Trends</div>
          <div class="ld-hpi-loading">Loading market data…</div>
        </div>` : ""}

        ${similar.length ? `
        <div class="ld-section">
          <div class="ld-section-title">Similar Listings</div>
          <div class="ld-similar-grid">${similar.map(renderSimilarCard).join("")}</div>
        </div>` : ""}
      </div>

      <div class="ld-side">
        ${renderContactCard(listing)}
        ${props.showMortgageCalc !== false ? renderMortgageCalc(listing) : ""}
      </div>
    </div>
  </div>

  <style>
    .ld-wrap { max-width: 1180px; margin: 0 auto; padding: 20px 16px 60px; font-family: ${tokens.font.body}; color: ${tokens.color.ink}; }
    @media (max-width: 600px) {
      .ld-wrap { padding: 14px 12px 40px; }
      .ld-price-hero, .ld-card, .ld-section { padding: 16px 16px; }
      .ld-price { font-size: 1.5rem; }
      .ld-stats-bar { grid-template-columns: repeat(2,1fr); }
      .ld-stat { padding: 12px 8px; border-bottom: 1px solid ${tokens.color.line}; }
      .ld-features-grid { grid-template-columns: 1fr; }
      .ld-room-row { grid-template-columns: 1fr; }
      .ld-room-col { border-right: none; border-bottom: 1px solid ${tokens.color.line}; }
      .ld-hpi-stats { grid-template-columns: 1fr; }
    }
    .ld-breadcrumb { font-size: 12px; color: ${tokens.color.ink45}; margin-bottom: 14px; }
    .ld-breadcrumb a { color: ${tokens.color.blue}; text-decoration: none; }

    .ld-gallery { display: grid; grid-template-columns: 2fr 1fr; gap: 8px; border-radius: 16px; overflow: hidden; margin-bottom: 20px; height: 420px; }
    .ld-hero-img { position:relative; display:block; background-size: cover; background-position: center; border-radius: 16px 0 0 16px; cursor: zoom-in; }
    .ld-hero-empty { display:flex; align-items:center; justify-content:center; background:${tokens.color.surface}; color:${tokens.color.ink45}; }
    .ld-thumb-grid { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 8px; height: 100%; }
    .ld-thumb, .ld-thumb-more { display:block; background-size: cover; background-position: center; cursor: zoom-in; border-radius: 4px; background-color: ${tokens.color.surface}; }
    .ld-thumb-more { display:flex; align-items:center; justify-content:center; background: ${tokens.color.ink}; color:#fff; font-weight:600; font-size:13px; text-decoration:none; }
    .ld-photo-count { position:absolute; right:12px; bottom:12px; background: rgba(20,20,20,0.72); color:#fff; font-size:13px; font-weight:600; padding:5px 10px; border-radius: 6px; line-height:1; }
    @media (max-width: 760px) { .ld-gallery { grid-template-columns: 1fr; height: auto; } .ld-hero-img { height: 260px; border-radius:16px; } .ld-thumb-grid { display:none; } }

    .ld-layout { display:grid; grid-template-columns: 1fr 340px; gap: 32px; align-items:start; }
    @media (max-width: 900px) { .ld-layout { grid-template-columns: 1fr; } }

    .ld-price-hero, .ld-card, .ld-section { background:#fff; border:1px solid ${tokens.color.line}; border-radius:16px; padding:20px 22px; margin-bottom:16px; }
    .ld-status-tag { display:inline-block; padding:3px 10px; border-radius:4px; font-size:11px; font-weight:700; letter-spacing:0.06em; text-transform:uppercase; margin-bottom:10px; color:#fff; }
    .ld-status-tag.sale { background:${tokens.color.blue}; }
    .ld-status-tag.rent { background:${tokens.color.ink}; }
    .ld-price { font-family:${tokens.font.display}; font-size:2rem; font-weight:600; margin-bottom:6px; }
    .ld-address { font-size:15px; color:${tokens.color.ink70}; }
    .ld-dom { font-size:12px; color:${tokens.color.ink45}; margin-top:10px; padding-top:10px; border-top:1px solid ${tokens.color.line}; }

    .ld-stats-bar { display:grid; grid-template-columns:repeat(4,1fr); background:#fff; border:1px solid ${tokens.color.line}; border-radius:16px; overflow:hidden; margin-bottom:16px; }
    .ld-stat { padding:16px 10px; text-align:center; border-right:1px solid ${tokens.color.line}; }
    .ld-stat:last-child { border-right:none; }
    .ld-stat-value { font-family:${tokens.font.display}; font-size:1.1rem; font-weight:600; color:${tokens.color.blue}; }
    .ld-stat-label { font-size:10px; text-transform:uppercase; letter-spacing:0.06em; color:${tokens.color.ink45}; margin-top:2px; }

    .ld-section-title { font-family:${tokens.font.display}; font-size:1.1rem; font-weight:600; margin-bottom:14px; padding-bottom:10px; border-bottom:1px solid ${tokens.color.line}; }
    .ld-description { font-size:14px; line-height:1.75; color:${tokens.color.ink70}; white-space:pre-line; }

    .ld-features-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:10px; }
    .ld-feature-item { font-size:13px; padding:10px 14px; background:${tokens.color.surface}; border-radius:8px; }

    .ld-room-table { border:1px solid ${tokens.color.line}; border-radius:12px; overflow:hidden; }
    .ld-room-row { display:grid; grid-template-columns:1fr 1fr 1fr; border-bottom:1px solid ${tokens.color.line}; }
    .ld-room-row:last-child { border-bottom:none; }
    .ld-room-col { padding:12px; border-right:1px solid ${tokens.color.line}; }
    .ld-room-col:last-child { border-right:none; }
    .ld-room-label { font-size:9px; text-transform:uppercase; letter-spacing:0.06em; color:${tokens.color.ink45}; margin-bottom:2px; }

    .ld-cashback { border-radius:16px; overflow:hidden; margin-bottom:16px; padding:22px 24px; position:relative; }
    .ld-cashback.sale { background:linear-gradient(135deg, ${tokens.color.ink} 0%, #1a1a1f 60%, ${tokens.color.blue} 140%); }
    .ld-cashback.rent { background:linear-gradient(135deg, #0d2b1f 0%, #1a4532 60%, ${tokens.color.success} 140%); }
    .ld-cashback-pill { display:inline-flex; padding:4px 12px; border-radius:20px; font-size:10px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; margin-bottom:10px; background:rgba(255,255,255,.18); color:#fff; }
    .ld-cashback-headline { font-family:${tokens.font.display}; font-size:1.35rem; font-weight:600; color:#fff; line-height:1.25; margin-bottom:6px; }
    .ld-cashback-headline em { font-style:italic; color:${tokens.color.blueDim}; }
    .ld-cashback-sub { font-size:13px; color:rgba(255,255,255,.75); line-height:1.55; margin-bottom:16px; max-width:520px; }
    .ld-cashback-actions { display:flex; gap:10px; flex-wrap:wrap; }
    .ld-cashback-cta { padding:10px 18px; border-radius:999px; font-size:12.5px; font-weight:700; text-decoration:none; cursor:pointer; border:none; }
    .ld-cashback-cta.primary { background:#fff; color:${tokens.color.ink}; }
    .ld-cashback-cta.secondary { background:rgba(255,255,255,.15); color:#fff; border:1px solid rgba(255,255,255,.3); }
    @media (max-width:600px) { .ld-cashback { padding:18px; } .ld-cashback-headline { font-size:1.1rem; } }

    .ld-map { height:280px; border-radius:12px; background:${tokens.color.surface}; overflow:hidden; }

    .ld-poi-tabs { display:flex; gap:8px; margin-bottom:14px; }
    .ld-poi-tab { padding:7px 14px; border-radius:999px; border:1px solid ${tokens.color.line}; background:#fff; font-family:${tokens.font.body}; font-size:12.5px; font-weight:600; color:${tokens.color.ink70}; cursor:pointer; }
    .ld-poi-tab.active { background:${tokens.color.ink}; color:#fff; border-color:${tokens.color.ink}; }
    .ld-poi-item { display:flex; justify-content:space-between; gap:12px; padding:12px 0; border-bottom:1px solid ${tokens.color.line}; font-size:13px; }
    .ld-poi-item:last-child { border-bottom:none; }
    .ld-poi-name { font-weight:600; }
    .ld-poi-addr { font-size:12px; color:${tokens.color.ink45}; margin-top:2px; }
    .ld-poi-dist { font-size:12.5px; color:${tokens.color.blue}; font-weight:700; white-space:nowrap; flex-shrink:0; }

    .ld-hpi-loading { font-size:13px; color:${tokens.color.ink45}; padding:20px; text-align:center; }
    .ld-hpi-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
    .ld-hpi-stat { background:${tokens.color.blueDim}; border-radius:10px; padding:14px; text-align:center; }
    .ld-hpi-stat-label { font-size:10px; text-transform:uppercase; color:${tokens.color.ink45}; margin-bottom:4px; }
    .ld-hpi-stat-value { font-family:${tokens.font.display}; font-size:1.2rem; font-weight:600; }
    .ld-hpi-stat-value.up { color:${tokens.color.success}; }
    .ld-hpi-stat-value.down { color:#c0362c; }

    .ld-similar-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
    @media (max-width:900px) { .ld-similar-grid { grid-template-columns:repeat(3,1fr); } }
    @media (max-width:600px) { .ld-similar-grid { grid-template-columns:repeat(2,1fr); gap:8px; } }
    .ld-similar-card { display:block; text-decoration:none; color:inherit; border:1px solid ${tokens.color.line}; border-radius:12px; overflow:hidden; transition:transform .18s; }
    .ld-similar-card:hover { transform:translateY(-2px); }
    .ld-similar-thumb { height:110px; background-size:cover; background-position:center; background-color:${tokens.color.surface}; }
    .ld-similar-body { padding:10px 12px; }
    .ld-similar-price { font-weight:700; font-size:14px; color:${tokens.color.blue}; }
    .ld-similar-addr { font-size:12px; margin-top:2px; }
    .ld-similar-city { font-size:11px; color:${tokens.color.ink45}; }

    .ld-card-title { font-family:${tokens.font.display}; font-size:1rem; font-weight:600; margin-bottom:14px; }
    .ld-contact-price { font-family:${tokens.font.display}; font-size:1.5rem; font-weight:600; }
    .ld-contact-office { font-size:12px; color:${tokens.color.ink45}; margin-bottom:14px; }
    .ld-contact-form input, .ld-contact-form textarea { width:100%; padding:10px 12px; border:1px solid ${tokens.color.line}; border-radius:8px; font-family:${tokens.font.body}; font-size:13px; margin-bottom:8px; box-sizing:border-box; }
    .ld-contact-form textarea { min-height:70px; resize:vertical; }
    .ld-btn-primary { width:100%; padding:12px; background:${tokens.color.blue}; color:#fff; border:none; border-radius:8px; font-weight:600; font-size:13px; cursor:pointer; }
    .ld-btn-secondary { display:block; text-align:center; margin-top:10px; padding:10px; border:1px solid ${tokens.color.line}; border-radius:8px; text-decoration:none; color:${tokens.color.ink}; font-size:13px; font-weight:600; }

    .ld-calc { display:flex; flex-direction:column; gap:10px; }
    .ld-calc label { font-size:12px; color:${tokens.color.ink70}; display:flex; flex-direction:column; gap:4px; }
    .ld-calc input { padding:8px 10px; border:1px solid ${tokens.color.line}; border-radius:6px; font-size:13px; }
    .ld-calc-result { margin-top:6px; padding-top:12px; border-top:1px solid ${tokens.color.line}; text-align:center; }
    .ld-calc-result-label { font-size:11px; color:${tokens.color.ink45}; text-transform:uppercase; }
    .ld-calc-result-value { font-family:${tokens.font.display}; font-size:1.4rem; font-weight:600; color:${tokens.color.blue}; }
  </style>

  <script>
  (function() {
    // Gallery — Fancybox, same CDN/library your real
    // listings-thumbnail-fancybox.js uses. Loaded once per page; binds to
    // every [data-fancybox="gallery"] anchor the gallery markup rendered.
    if (document.querySelector('[data-fancybox="gallery"]')) {
      var fbCss = document.createElement('link');
      fbCss.rel = 'stylesheet';
      fbCss.href = 'https://cdn.jsdelivr.net/npm/@fancyapps/ui/dist/fancybox.css';
      document.head.appendChild(fbCss);
      var fbScript = document.createElement('script');
      fbScript.src = 'https://cdn.jsdelivr.net/npm/@fancyapps/ui/dist/fancybox.umd.js';
      fbScript.onload = function() {
        if (window.Fancybox) {
          Fancybox.bind('[data-fancybox="gallery"]', {
            Thumbs: { autoStart: false },
            Toolbar: { display: ['zoom', 'fullscreen', 'download', 'close'] },
          });
        }
      };
      document.head.appendChild(fbScript);
    }

    // Mortgage calculator
    var calc = document.querySelector('.ld-calc');
    if (calc) {
      var price = parseFloat(calc.getAttribute('data-price')) || 0;
      var out = document.getElementById('ld-calc-output');
      function recalc() {
        var downPct = parseFloat(calc.querySelector('.ld-calc-down').value) || 0;
        var rate = parseFloat(calc.querySelector('.ld-calc-rate').value) || 0;
        var years = parseFloat(calc.querySelector('.ld-calc-years').value) || 25;
        var principal = price * (1 - downPct / 100);
        var monthlyRate = (rate / 100) / 12;
        var n = years * 12;
        var payment = monthlyRate === 0 ? principal / n : principal * (monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1);
        out.textContent = isFinite(payment) && payment > 0 ? '$' + Math.round(payment).toLocaleString('en-CA') : '—';
      }
      calc.addEventListener('input', recalc);
      recalc();
    }

    // HPI market trends — same public JSON the live site uses, fetched client-side
    var hpiSection = document.getElementById('ld-hpi-section');
    if (hpiSection) {
      var city = hpiSection.getAttribute('data-city') || '';
      fetch('https://www.getsetsold.ca/ontario-housing-market/ontario-hpi-data.json')
        .then(function(r) { return r.json(); })
        .then(function(data) {
          var region = (data && data.regions) ? data.regions.find(function(r) {
            return r.cities && r.cities.some(function(c) { return c.toLowerCase() === city.toLowerCase(); });
          }) : null;
          var loading = hpiSection.querySelector('.ld-hpi-loading');
          if (!region || !region.latest) {
            if (loading) loading.textContent = 'Market trend data not available for this area.';
            return;
          }
          var l = region.latest;
          function fmtChg(n) {
            var cls = n > 0 ? 'up' : n < 0 ? 'down' : '';
            return '<span class="' + cls + '">' + (n > 0 ? '+' : '') + n.toFixed(1) + '%</span>';
          }
          hpiSection.innerHTML = '<div class="ld-section-title">Local Market Trends</div>' +
            '<div class="ld-hpi-stats">' +
              '<div class="ld-hpi-stat"><div class="ld-hpi-stat-label">Benchmark Price</div><div class="ld-hpi-stat-value">$' + Math.round(l.compositeBenchmark || 0).toLocaleString('en-CA') + '</div></div>' +
              '<div class="ld-hpi-stat"><div class="ld-hpi-stat-label">Month over Month</div><div class="ld-hpi-stat-value ' + (l.mom > 0 ? 'up' : 'down') + '">' + fmtChg(l.mom || 0) + '</div></div>' +
              '<div class="ld-hpi-stat"><div class="ld-hpi-stat-label">Year over Year</div><div class="ld-hpi-stat-value ' + (l.yoy > 0 ? 'up' : 'down') + '">' + fmtChg(l.yoy || 0) + '</div></div>' +
            '</div>';
        })
        .catch(function() {
          var loading = hpiSection.querySelector('.ld-hpi-loading');
          if (loading) loading.textContent = 'Market trend data unavailable.';
        });
    }

    // Cashback banner share button
    document.querySelectorAll('.ld-cashback-cta.secondary[data-share-url]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var url = location.origin + btn.getAttribute('data-share-url');
        if (navigator.share) {
          navigator.share({ url: url }).catch(function() {});
        } else if (navigator.clipboard) {
          navigator.clipboard.writeText(url).then(function() {
            var old = btn.textContent;
            btn.textContent = 'Copied!';
            setTimeout(function() { btn.textContent = old; }, 1800);
          });
        }
      });
    });

    // Directions map — same MapTiler key/style your live site uses
    var mapEl = document.getElementById('ld-map');
    if (mapEl) {
      var lat = parseFloat(mapEl.getAttribute('data-lat'));
      var lng = parseFloat(mapEl.getAttribute('data-lng'));
      var mlScript = document.createElement('script');
      mlScript.src = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js';
      var mlCss = document.createElement('link');
      mlCss.rel = 'stylesheet';
      mlCss.href = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css';
      document.head.appendChild(mlCss);
      mlScript.onload = function() {
        var map = new maplibregl.Map({
          container: 'ld-map',
          style: 'https://api.maptiler.com/maps/streets-v4/style.json?key=${MAPTILER_KEY}',
          center: [lng, lat],
          zoom: 14,
          interactive: false,
        });
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }));
        new maplibregl.Marker({ color: '${tokens.color.blue}' }).setLngLat([lng, lat]).addTo(map);
      };
      document.head.appendChild(mlScript);
    }

    // Nearby places — Overpass API (OpenStreetMap), no key required
    var poiSection = document.getElementById('ld-poi-section');
    if (poiSection) {
      var pLat = parseFloat(poiSection.getAttribute('data-lat'));
      var pLng = parseFloat(poiSection.getAttribute('data-lng'));
      var poiList = document.getElementById('ld-poi-list');
      var OVERPASS_TAGS = {
        school: '["amenity"~"school|college|university"]',
        restaurant: '["amenity"~"restaurant|cafe|fast_food"]',
        grocery: '["shop"~"supermarket|grocery|convenience"]',
      };
      var poiCache = {};

      function haversineKm(la1, lo1, la2, lo2) {
        var R = 6371, r = function(d) { return d * Math.PI / 180; };
        var a = Math.sin(r(la2 - la1) / 2) ** 2 + Math.cos(r(la1)) * Math.cos(r(la2)) * Math.sin(r(lo2 - lo1) / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      }

      function loadPoi(cat) {
        if (poiCache[cat]) { renderPoiList(poiCache[cat]); return; }
        poiList.innerHTML = '<div class="ld-hpi-loading">Loading nearby places\\u2026</div>';
        var radius = 3000; // meters
        var q = '[out:json][timeout:15];(node' + OVERPASS_TAGS[cat] + '(around:' + radius + ',' + pLat + ',' + pLng + '););out center 20;';
        fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: q })
          .then(function(r) { return r.json(); })
          .then(function(data) {
            var items = (data.elements || []).map(function(el) {
              var tags = el.tags || {};
              var d = haversineKm(pLat, pLng, el.lat, el.lon);
              return {
                name: tags.name || 'Unnamed',
                addr: [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ') || tags['addr:city'] || '',
                dist: d,
              };
            }).sort(function(a, b) { return a.dist - b.dist; }).slice(0, 8);
            poiCache[cat] = items;
            renderPoiList(items);
          })
          .catch(function() {
            poiList.innerHTML = '<div class="ld-hpi-loading">Nearby places unavailable right now.</div>';
          });
      }

      function renderPoiList(items) {
        if (!items.length) { poiList.innerHTML = '<div class="ld-hpi-loading">Nothing found nearby.</div>'; return; }
        poiList.innerHTML = items.map(function(p) {
          return '<div class="ld-poi-item"><div><div class="ld-poi-name">' + p.name + '</div>' +
            (p.addr ? '<div class="ld-poi-addr">' + p.addr + '</div>' : '') + '</div>' +
            '<div class="ld-poi-dist">' + p.dist.toFixed(1) + ' km</div></div>';
        }).join('');
      }

      poiSection.querySelectorAll('.ld-poi-tab').forEach(function(tab) {
        tab.addEventListener('click', function() {
          poiSection.querySelectorAll('.ld-poi-tab').forEach(function(t) { t.classList.remove('active'); });
          tab.classList.add('active');
          loadPoi(tab.getAttribute('data-cat'));
        });
      });
      loadPoi('school');
    }
  })();
  </script>`;
}
