// workers/src/blocks-realestate.js
//
// Renderer functions for the block types registered in 0003_blocks_and_pages.sql.
// Each export takes (props, data) and returns an HTML string — `data` is whatever
// the Worker already fetched for that block's `data_source` (grid rows, a single
// property row, etc.) before calling the renderer. Pure-content blocks (hero_search,
// service_tiles, cta_band, process_steps, stat_band, testimonial, lead_form) get
// `data = null` and render from `props` alone.
//
// Reconciled with the real tokens.js (its `color` keys now match this brand
// exactly — see the updated tokens.js). No more local color duplication.
import { tokens } from './tokens.js';
const COLOR = {
  ink: tokens.color.ink,
  blue: tokens.color.blue,
  blueDim: tokens.color.blueDim,
  surface: tokens.color.surface,
  success: tokens.color.success,
  successDim: tokens.color.successDim,
};

const money = (n) => `$${Number(n).toLocaleString()}`;

// A `grid` row -> the shape every real-estate block needs. Centralizing this
// means sync bugs (like the ListOfficeKey one) only ever need fixing in one place.
function normalizeListing(row) {
  const forLease = !!row.TotalActualRent;
  return {
    key: row.ListingKey,
    address: row.UnparsedAddress,
    city: row.City,
    priceLabel: forLease ? `${money(row.TotalActualRent)}/mo` : money(row.ListPrice),
    status: forLease ? 'For Lease' : 'For Sale',
    beds: row.BedroomsTotal,
    baths: row.BathroomsTotalInteger,
    parking: row.ParkingTotal,
    sqft: row.AboveGradeFinishedArea ?? row.LivingArea ?? null,
    photo: row.Media || null, // first-photo URL, already flattened by ddf-sync.js
    officeKey: row.ListOfficeKey,
    officeName: row.OfficeName,
    lat: row.Latitude,
    lng: row.Longitude,
  };
}

const statusBadge = (status) => {
  const lease = status === 'For Lease';
  return `background:${lease ? COLOR.blueDim : COLOR.successDim}; color:${lease ? COLOR.blue : COLOR.success};`;
};

// =====================================================
// hero_search — Home / Service Landing hero
// =====================================================
export function hero_search(props) {
  const stats = (props.stats || [])
    .map(s => `<div class="stat"><div class="stat-value">${s.value}</div><div class="stat-label">${s.label}</div></div>`)
    .join('');

  return `
  <section class="block hero-search">
    ${props.eyebrow ? `<div class="eyebrow">${props.eyebrow}</div>` : ''}
    <h1>${props.headline || ''}</h1>
    ${props.subcopy ? `<p class="subcopy">${props.subcopy}</p>` : ''}
    ${props.showSearch ? `
      <form class="search-bar" method="get" action="/listings">
        <input name="q" placeholder="Search by city, neighbourhood or MLS®#">
        <button type="submit">Search</button>
      </form>` : ''}
    ${stats ? `<div class="stat-row">${stats}</div>` : ''}
  </section>`;
}

// =====================================================
// service_tiles
// =====================================================
export function service_tiles(props) {
  const tiles = (props.tiles || []).map(t => `
    <a href="${t.link || '#'}" class="service-tile tile-${t.style || 'light'}">
      <h3>${t.title}</h3>
      <p>${t.copy || ''}</p>
      <span class="tile-cta">${t.cta || 'Learn more'} &rarr;</span>
    </a>`).join('');
  return `<section class="block service-tiles">${tiles}</section>`;
}

// =====================================================
// cta_band
// =====================================================
export function cta_band(props) {
  return `
  <section class="block cta-band cta-${props.style || 'dark'}">
    <div>
      <h2>${props.headline || ''}</h2>
      <p>${props.copy || ''}</p>
    </div>
    <a href="${props.ctaLink || '#'}" class="btn btn-primary">${props.ctaLabel || 'Learn more'}</a>
  </section>`;
}

// =====================================================
// process_steps
// =====================================================
export function process_steps(props) {
  const steps = (props.steps || []).map((s, i) => `
    <div class="step">
      <div class="step-num">${i + 1}</div>
      <div class="step-title">${s.title}</div>
      <p>${s.copy || ''}</p>
    </div>`).join('');
  return `
  <section class="block process-steps">
    ${props.heading ? `<h2>${props.heading}</h2>` : ''}
    <div class="step-grid">${steps}</div>
  </section>`;
}

// =====================================================
// stat_band
// =====================================================
export function stat_band(props) {
  const stats = (props.stats || [])
    .map(s => `<div class="stat"><div class="stat-value">${s.value}</div><div class="stat-label">${s.label}</div></div>`)
    .join('');
  return `<section class="block stat-band stat-${props.style || 'bordered'}">${stats}</section>`;
}

// =====================================================
// testimonial
// =====================================================
export function testimonial(props) {
  return `
  <section class="block testimonial">
    <div class="avatar"></div>
    <div>
      <p class="quote">&ldquo;${props.quote || ''}&rdquo;</p>
      <div class="attribution">${props.name || ''} &middot; ${props.detail || ''}</div>
    </div>
  </section>`;
}

// =====================================================
// lead_form — writes to `leads` via the Worker's form endpoint, tagged with formType
// =====================================================
export function lead_form(props) {
  const fieldSets = {
    address_only: `<input name="address" placeholder="Property address" required>`,
    name_email_phone: `
      <input name="name" placeholder="Full name" required>
      <input name="email" type="email" placeholder="Email" required>
      <input name="phone" placeholder="Phone">`,
    full_buyer: `
      <input name="name" placeholder="Full name" required>
      <input name="email" type="email" placeholder="Email" required>
      <input name="budget_max" placeholder="Max budget">
      <input name="areas" placeholder="Preferred areas">`,
  };
  return `
  <section class="block lead-form">
    <div class="lead-copy">
      <h2>${props.heading || ''}</h2>
      <p>${props.copy || ''}</p>
    </div>
    <form class="lead-fields" method="post" action="/api/leads">
      <input type="hidden" name="form_type" value="${props.formType || 'contact'}">
      ${fieldSets[props.fields] || fieldSets.address_only}
      <button type="submit">${props.ctaLabel || 'Submit'}</button>
    </form>
  </section>`;
}

// =====================================================
// featured_listings — data: array of `grid` rows, already filtered/limited by the Worker
// =====================================================
export function featured_listings(props, data) {
  const listings = (data || []).map(normalizeListing);
  const cards = listings.map(l => `
    <a href="/listings/${l.key}" class="listing-card">
      <div class="listing-photo" style="${l.photo ? `background-image:url('${l.photo}')` : 'background:' + COLOR.surface}">
        <span class="badge" style="${statusBadge(l.status)}">${l.status}</span>
      </div>
      <div class="listing-body">
        <div class="listing-price">${l.priceLabel}</div>
        <div class="listing-address">${l.address}, ${l.city}</div>
      </div>
    </a>`).join('');

  return `
  <section class="block featured-listings">
    <div class="section-head">
      <h2>${props.heading || 'Featured listings'}</h2>
      <a href="/listings" class="see-all">View all &rarr;</a>
    </div>
    <div class="listing-grid grid-3">${cards}</div>
  </section>`;
}

// =====================================================
// listing_grid — full Grid page with filter bar. data: { listings, total, page }
// =====================================================
export function listing_grid(props, data) {
  const listings = (data?.listings || []).map(normalizeListing);
  const cards = listings.map(l => `
    <a href="/listings/${l.key}" class="listing-card">
      <div class="listing-photo" style="${l.photo ? `background-image:url('${l.photo}')` : 'background:' + COLOR.surface}">
        <span class="badge" style="${statusBadge(l.status)}">${l.status}</span>
        <span class="photo-count"></span>
      </div>
      <div class="listing-body">
        <div class="listing-price">${l.priceLabel}</div>
        <div class="listing-address">${l.address}, ${l.city}</div>
        <div class="listing-specs">
          <span>${l.beds ?? '–'} bd</span><span>${l.baths ?? '–'} ba</span>
          <span>${l.parking ?? '–'} pk</span><span>${l.sqft ? l.sqft.toLocaleString() : '–'} sqft</span>
        </div>
      </div>
    </a>`).join('');

  return `
  <section class="block listing-grid-page">
    <div class="section-head">
      <div>
        <h1>${props.heading || 'Listings'}</h1>
        <div class="result-count">${data?.total ?? listings.length} active listings</div>
      </div>
      <div class="view-toggle">
        <a class="active" href="#">Grid</a>
        <a href="/listings/map">Map</a>
      </div>
    </div>
    ${props.showFilters ? `
    <div class="filter-bar">
      <button class="filter-pill active">All</button>
      <button class="filter-pill">For Sale</button>
      <button class="filter-pill">For Lease</button>
      <button class="filter-pill">Single Family</button>
      <button class="filter-pill">Condo</button>
    </div>` : ''}
    <div class="listing-grid grid-3">${cards}</div>
  </section>`;
}

// =====================================================
// map_split_search — data: { listings } (same grid rows, with lat/lng)
// =====================================================
export function map_split_search(props, data) {
  const listings = (data?.listings || []).map(normalizeListing);
  const rows = listings.map(l => `
    <div class="map-list-row" data-key="${l.key}">
      <div class="thumb" style="${l.photo ? `background-image:url('${l.photo}')` : 'background:' + COLOR.surface}"></div>
      <div>
        <div class="row-top">
          <div class="row-price">${l.priceLabel}</div>
          <span class="badge" style="${statusBadge(l.status)}">${l.status}</span>
        </div>
        <div class="row-address">${l.address}</div>
        <div class="row-specs">${l.beds ?? '–'} bd &middot; ${l.baths ?? '–'} ba &middot; ${l.sqft ? l.sqft.toLocaleString() : '–'} sqft</div>
      </div>
    </div>`).join('');

  // Pins are positioned client-side from lat/lng against whatever map provider
  // is wired in (see note below) — this markup gives it a data attribute per pin.
  const pinData = listings.map(l => `{"key":"${l.key}","lat":${l.lat},"lng":${l.lng},"price":"${l.priceLabel}"}`).join(',');

  return `
  <section class="block map-split" data-pins='[${pinData}]'>
    <div class="map-list-panel">
      <div class="panel-head"><strong>${listings.length}</strong> listings in view</div>
      <div class="map-list-scroll">${rows}</div>
    </div>
    <div class="map-panel" id="map-canvas">
      <!-- NOTE: mounts a real map provider client-side (Mapbox GL or Google Maps) —
           this block only prepares the listing+coordinate data; see Phase 3 decision
           on which map provider before wiring the live pins. -->
    </div>
  </section>`;
}

// =====================================================
// listing_detail — data: { listing: property row, officeName }
// =====================================================
export function listing_detail(props, data) {
  const p = data?.listing || {};
  const forLease = !!p.TotalActualRent;
  const priceLabel = forLease ? `${money(p.TotalActualRent)}/mo` : money(p.ListPrice);
  const specs = [
    { label: 'Beds', value: p.BedroomsTotal },
    { label: 'Baths', value: p.BathroomsTotalInteger },
    { label: 'Parking', value: p.ParkingTotal },
    { label: 'Sqft', value: (p.LivingArea ?? p.AboveGradeFinishedArea)?.toLocaleString() },
  ].map(s => `<div class="spec"><div class="spec-value">${s.value ?? '–'}</div><div class="spec-label">${s.label}</div></div>`).join('');

  return `
  <section class="block listing-detail">
    <div class="gallery">
      <div class="hero-photo" style="${p.Media?.[0]?.MediaURL ? `background-image:url('${p.Media[0].MediaURL}')` : ''}"></div>
    </div>
    <div class="title-row">
      <div>
        <span class="badge" style="${statusBadge(forLease ? 'For Lease' : 'For Sale')}">${forLease ? 'For Lease' : 'For Sale'}</span>
        <h1>${p.UnparsedAddress || ''}</h1>
        <div class="sub">${p.City || ''}, ${p.Province || 'ON'} &middot; ${p.PostalCode || ''}</div>
      </div>
      <div class="price">${priceLabel}</div>
    </div>
    <div class="specs-row">${specs}</div>
    <div class="body-split">
      <div class="description">
        <h2>About this home</h2>
        <p>${p.PublicRemarks || ''}</p>
      </div>
      ${props.showAgentCard !== false ? `
      <aside class="agent-card">
        <div class="agent-name">Rohit Sharma</div>
        <div class="agent-office">${data?.officeName || p.OfficeName || ''} &middot; Office ${p.ListOfficeKey || ''}</div>
        <button class="btn btn-primary">Request a showing</button>
        <button class="btn btn-outline">Call agent</button>
        ${props.showMortgageCalc !== false && !forLease ? `
        <div class="mortgage-est">
          <div class="label">Est. monthly payment</div>
          <div class="value">${money(Math.round((p.ListPrice || 0) * 0.8 * 0.045 / 12))}</div>
        </div>` : ''}
      </aside>` : ''}
    </div>
  </section>`;
}

export const registry = {
  hero_search, service_tiles, cta_band, process_steps, stat_band, testimonial,
  lead_form, featured_listings, listing_grid, map_split_search, listing_detail,
};
