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

function mediaUrls(media) {
  if (!media) return [];
  let arr = media;
  if (typeof media === "string") {
    try { arr = JSON.parse(media); } catch { return media.startsWith("http") ? [media] : []; }
  }
  if (!Array.isArray(arr)) return [];
  return arr
    .slice()
    .sort((a, b) => (a?.Order ?? 0) - (b?.Order ?? 0))
    .map((m) => (typeof m === "string" ? m : m?.MediaURL || m?.Media))
    .filter(Boolean);
}

function statPill(label, value) {
  if (value == null || value === "") return "";
  return `<div class="ld-stat"><div class="ld-stat-value">${esc(String(value))}</div><div class="ld-stat-label">${esc(label)}</div></div>`;
}

function renderGallery(photos, address) {
  if (!photos.length) {
    return `<div class="ld-hero-img ld-hero-empty">No photos available</div>`;
  }
  const [hero, ...rest] = photos;
  const thumbs = rest.slice(0, 4).map(
    (url, i) => `<div class="ld-thumb" style="background-image:url('${esc(url)}')" data-idx="${i + 1}"></div>`
  ).join("");
  const extra = photos.length > 5 ? `<div class="ld-thumb-more" data-idx="5">+${photos.length - 5} more</div>` : "";
  return `
    <div class="ld-gallery" data-photos='${esc(JSON.stringify(photos))}'>
      <div class="ld-hero-img" style="background-image:url('${esc(hero)}')" data-idx="0"></div>
      <div class="ld-thumb-grid">${thumbs}${extra}</div>
    </div>
    <div class="ld-lightbox" id="ld-lightbox">
      <button class="ld-lightbox-close" id="ld-lightbox-close">&times;</button>
      <div class="ld-lightbox-scroll" id="ld-lightbox-scroll"></div>
    </div>`;
}

function renderRooms(listing) {
  let rooms = listing.Rooms;
  if (typeof rooms === "string") {
    try { rooms = JSON.parse(rooms); } catch { rooms = null; }
  }
  if (!Array.isArray(rooms) || !rooms.length) return "";
  const rows = rooms.map((r) => `
    <div class="ld-room-row">
      <div class="ld-room-col"><div class="ld-room-label">Room</div><div>${esc(r.RoomType || r.room || "—")}</div></div>
      <div class="ld-room-col"><div class="ld-room-label">Level</div><div>${esc(r.Level || r.level || "—")}</div></div>
      <div class="ld-room-col"><div class="ld-room-label">Dimensions</div><div>${esc(r.Dimensions || r.dimensions || "—")}</div></div>
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
  const photos = mediaUrls(listing.Media);
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

    ${renderGallery(photos, listing.UnparsedAddress)}

    <div class="ld-layout">
      <div class="ld-main">
        <div class="ld-price-hero">
          <div class="ld-status-tag ${sale ? "sale" : "rent"}">${sale ? "For Sale" : "For Rent"}</div>
          <div class="ld-price">${esc(priceDisplay(listing))}</div>
          <div class="ld-address">${esc(listing.UnparsedAddress || "")}${listing.City ? ", " + esc(listing.City) : ""}${listing.Province ? ", " + esc(listing.Province) : ""} ${esc(listing.PostalCode || "")}</div>
          ${dom != null ? `<div class="ld-dom">Listed ${dom}${dom === 1 ? " day" : " days"} ago</div>` : ""}
        </div>

        <div class="ld-stats-bar">${statsHtml}</div>

        ${listing.PublicRemarks ? `
        <div class="ld-section">
          <div class="ld-section-title">About This Property</div>
          <div class="ld-description">${esc(listing.PublicRemarks)}</div>
        </div>` : ""}

        ${renderFeatures(listing)}
        ${renderRooms(listing)}

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
    .ld-breadcrumb { font-size: 12px; color: ${tokens.color.ink45}; margin-bottom: 14px; }
    .ld-breadcrumb a { color: ${tokens.color.blue}; text-decoration: none; }

    .ld-gallery { display: grid; grid-template-columns: 2fr 1fr; gap: 8px; border-radius: 16px; overflow: hidden; margin-bottom: 20px; height: 420px; }
    .ld-hero-img { background-size: cover; background-position: center; border-radius: 16px 0 0 16px; cursor: zoom-in; }
    .ld-hero-empty { display:flex; align-items:center; justify-content:center; background:${tokens.color.surface}; color:${tokens.color.ink45}; }
    .ld-thumb-grid { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 8px; height: 100%; }
    .ld-thumb, .ld-thumb-more { background-size: cover; background-position: center; cursor: zoom-in; border-radius: 4px; background-color: ${tokens.color.surface}; }
    .ld-thumb-more { display:flex; align-items:center; justify-content:center; background: ${tokens.color.ink}; color:#fff; font-weight:600; font-size:13px; }
    @media (max-width: 760px) { .ld-gallery { grid-template-columns: 1fr; height: auto; } .ld-hero-img { height: 260px; border-radius:16px; } .ld-thumb-grid { display:none; } }

    .ld-lightbox { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.94); z-index:9999; flex-direction:column; align-items:center; }
    .ld-lightbox.open { display:flex; }
    .ld-lightbox-close { position:fixed; top:14px; right:20px; width:40px; height:40px; border-radius:50%; border:none; background:rgba(255,255,255,0.15); color:#fff; font-size:22px; cursor:pointer; z-index:2; }
    .ld-lightbox-scroll { width:100%; max-width:900px; height:100vh; overflow-y:auto; padding:60px 16px; display:flex; flex-direction:column; gap:10px; align-items:center; }
    .ld-lightbox-scroll img { max-width:100%; max-height:80vh; border-radius:8px; }

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

    .ld-hpi-loading { font-size:13px; color:${tokens.color.ink45}; padding:20px; text-align:center; }
    .ld-hpi-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
    .ld-hpi-stat { background:${tokens.color.blueDim}; border-radius:10px; padding:14px; text-align:center; }
    .ld-hpi-stat-label { font-size:10px; text-transform:uppercase; color:${tokens.color.ink45}; margin-bottom:4px; }
    .ld-hpi-stat-value { font-family:${tokens.font.display}; font-size:1.2rem; font-weight:600; }
    .ld-hpi-stat-value.up { color:${tokens.color.success}; }
    .ld-hpi-stat-value.down { color:#c0362c; }

    .ld-similar-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
    @media (max-width:760px) { .ld-similar-grid { grid-template-columns:repeat(2,1fr); } }
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
    // Gallery lightbox
    var galleryEl = document.querySelector('.ld-gallery');
    var lightbox = document.getElementById('ld-lightbox');
    var scrollEl = document.getElementById('ld-lightbox-scroll');
    var closeBtn = document.getElementById('ld-lightbox-close');
    if (galleryEl && lightbox) {
      var photos = JSON.parse(galleryEl.getAttribute('data-photos') || '[]');
      galleryEl.addEventListener('click', function(e) {
        var t = e.target.closest('[data-idx]');
        if (!t) return;
        scrollEl.innerHTML = photos.map(function(u) { return '<img src="' + u + '" loading="lazy">'; }).join('');
        lightbox.classList.add('open');
        var idx = parseInt(t.getAttribute('data-idx'), 10) || 0;
        var imgs = scrollEl.querySelectorAll('img');
        if (imgs[idx]) imgs[idx].scrollIntoView();
      });
    }
    if (closeBtn) closeBtn.addEventListener('click', function() { lightbox.classList.remove('open'); });

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
  })();
  </script>`;
}
