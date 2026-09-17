// Block renderers — merged: your original Phase 1 set + the real-estate blocks
// mapped from the mockup canvas (blocks-realestate.js). Each function takes
// `props` (from a page's blocks jsonb) and returns an HTML string; a few take
// `(props, data)` when they need a live fetch first (see DATA_BLOCK_TYPES).

import { tokens } from "./tokens.js";
import { registry as realEstateRegistry } from "./blocks-realestate.js";
import { renderListingDetail } from "./listing-detail.js";

function esc(s = "") {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

// ---- your original Phase 1 renderers, unchanged ----
export const renderers = {
  // `settings` (2nd arg) comes from the site_settings singleton row, via
  // header_nav being in blocks.js's DATA_BLOCK_TYPES — see index.js's
  // fetchBlockData. Block props still win when set explicitly, so a page
  // that wants a different logo/phone for one header can still override it.
  header_nav(props, settings = {}) {
    const items = (props.nav_items || []).map(
      (i) => `<a href="${esc(i.href)}" class="nav-link">${esc(i.label)}</a>`
    ).join("");
    const logoText = props.logo_text || settings.business_name || "GetSetSold";
    const logoUrl = props.logo_url || settings.logo_url;
    const phone = props.phone || settings.phone || "416-605-7488";
    const phoneHref = "tel:+1" + String(phone).replace(/\D/g, "");
    return `
      <header class="site-header">
        <a class="logo" href="/">${logoUrl ? `<img src="${esc(logoUrl)}" alt="${esc(logoText)}" class="logo-img" />` : esc(logoText)}</a>
        <nav class="main-nav" id="main-nav">${items}</nav>
        <div class="header-actions">
          <a class="btn btn-accent" href="${esc(phoneHref)}">Call Now</a>
          <button class="nav-toggle" id="nav-toggle" aria-label="Menu" aria-expanded="false">
            <span></span><span></span><span></span>
          </button>
        </div>
      </header>
      <script>
        (function() {
          var btn = document.getElementById('nav-toggle');
          var nav = document.getElementById('main-nav');
          if (btn && nav) {
            btn.addEventListener('click', function() {
              var open = nav.classList.toggle('open');
              btn.classList.toggle('open', open);
              btn.setAttribute('aria-expanded', open ? 'true' : 'false');
            });
          }
        })();
      </script>`;
  },

  hero(props) {
    return `
      <section class="hero" style="background-image:url('${esc(props.image || "")}')">
        <div class="hero-inner">
          <h1>${esc(props.heading || "")}</h1>
          ${props.subheading ? `<p class="hero-sub">${esc(props.subheading)}</p>` : ""}
          ${props.cta_label ? `<a class="btn btn-accent" href="${esc(props.cta_href || "#")}">${esc(props.cta_label)}</a>` : ""}
        </div>
      </section>`;
  },

  section_container(props, innerHtml = "") {
    const cls = props.full_bleed ? "section full-bleed" : "section container";
    const bg = props.background ? `style="background:${esc(props.background)}"` : "";
    return `<section class="${cls}" ${bg}>${innerHtml}</section>`;
  },

  rich_text(props) {
    return `
      <div class="rich-text">
        ${props.heading ? `<h2>${esc(props.heading)}</h2>` : ""}
        <div>${props.body_html || ""}</div>
      </div>`;
  },

  stats_row(props) {
    const stats = (props.stats || [])
      .map((s) => `<div class="stat"><strong>${esc(s.value)}</strong><span>${esc(s.label)}</span></div>`)
      .join("");
    return `<div class="stats-row">${stats}</div>`;
  },

  faq_accordion(props) {
    const items = (props.items || [])
      .map(
        (i, idx) => `
        <details class="faq-item" ${idx === 0 ? "open" : ""}>
          <summary>${esc(i.question)}</summary>
          <div>${i.answer_html || ""}</div>
        </details>`
      )
      .join("");
    return `<div class="faq-accordion">${items}</div>`;
  },

  cta_banner(props) {
    return `
      <div class="cta-banner">
        <h3>${esc(props.heading || "")}</h3>
        <a class="btn btn-accent" href="${esc(props.cta_href || "#")}">${esc(props.cta_label || "Contact Us")}</a>
        ${props.phone ? `<a class="btn btn-outline" href="tel:${esc(props.phone)}">${esc(props.phone)}</a>` : ""}
      </div>`;
  },

  contact_form(props) {
    return `
      <form class="lead-form" data-form-type="contact" action="/api/leads" method="POST">
        <h3>${esc(props.heading || "Get in Touch")}</h3>
        <input name="name" placeholder="Name" required />
        <input name="email" type="email" placeholder="Email" required />
        <input name="phone" placeholder="Phone" />
        <textarea name="message" placeholder="Message"></textarea>
        <button type="submit" class="btn btn-accent">Send Message</button>
      </form>`;
  },

  valuation_form(props) {
    return `
      <form class="lead-form" data-form-type="valuation" action="/api/leads" method="POST">
        <h3>${esc(props.heading || "Free Home Valuation")}</h3>
        <input name="address" placeholder="Property Address" required />
        <input name="name" placeholder="Name" required />
        <input name="email" type="email" placeholder="Email" required />
        <input name="phone" placeholder="Phone" required />
        <button type="submit" class="btn btn-accent">Get My Home Value</button>
      </form>`;
  },

  vip_buyer_form(props) {
    return `
      <form class="lead-form" data-form-type="vip_buyer" action="/api/leads" method="POST">
        <h3>${esc(props.heading || "Join the VIP Buyer Program")}</h3>
        <input name="name" placeholder="Name" required />
        <input name="email" type="email" placeholder="Email" required />
        <input name="phone" placeholder="Phone" required />
        <button type="submit" class="btn btn-accent">Get VIP Access</button>
      </form>`;
  },

  footer(props, settings = {}) {
    const brokerage = props.brokerage || settings.brokerage_name || "Lombard Group Real Estate Inc., Brokerage";
    const agentName = settings.agent_name || "Rohit K. Sharma, REALTOR®";
    const phone = props.phone || settings.phone || "416-605-7488";
    const email = settings.email;
    const social = settings.social || {};
    const socialLinks = ["facebook", "instagram", "youtube", "linkedin", "tiktok"]
      .filter((k) => social[k])
      .map((k) => `<a href="${esc(social[k])}" class="footer-social-link" target="_blank" rel="noopener">${esc(k.charAt(0).toUpperCase() + k.slice(1))}</a>`)
      .join("");
    return `
      <footer class="site-footer">
        <p>${esc(brokerage)}</p>
        <p>${esc(agentName)} — ${esc(phone)}${email ? ` — ${esc(email)}` : ""}</p>
        ${socialLinks ? `<p class="footer-social">${socialLinks}</p>` : ""}
        ${settings.license_text ? `<p class="footer-license">${esc(settings.license_text)}</p>` : ""}
      </footer>`;
  },

  // ---- real-estate blocks, merged in from blocks-realestate.js ----
  ...realEstateRegistry,

  // Override: full single-listing page (price hero, stats, description,
  // features, room details, gallery, mortgage calc, similar listings, HPI
  // trends) ported from the real getsetsold.ca listing page — replaces the
  // simpler listing_detail stub that was in blocks-realestate.js.
  listing_detail: renderListingDetail,
};

// Block types that need a live data fetch before rendering (see render.js /
// index.js for the actual fetch — this list is just what to await for).
export const DATA_BLOCK_TYPES = new Set(["featured_listings", "listing_grid", "map_split_search", "header_nav", "footer"]);

// `block.block_type` is the real, original convention from this scaffold.
// `0003_blocks_and_pages.sql` originally inserted pages.blocks using the key
// "block" instead — see 0004_fix_block_key.sql, which corrects the 4 already-
// inserted pages rows to use "block_type". This fallback keeps rendering
// working even if that fix hasn't been run yet, but the DB fix is the real
// answer, not this fallback — don't rely on it long-term.
function blockType(block) {
  return block.block_type ?? block.block;
}

export async function renderBlock(block, dataFetcher) {
  const type = blockType(block);
  const fn = renderers[type];
  if (!fn) return `<!-- unknown block type: ${esc(type)} -->`;

  if (DATA_BLOCK_TYPES.has(type) && dataFetcher) {
    const data = await dataFetcher(type, block.props || {});
    return fn(block.props || {}, data);
  }
  return fn(block.props || {});
}

// `dataFetcher(type, props) -> Promise<data>` is supplied by index.js, since
// only it knows how to reach the MLS Supabase project.
export async function renderBlocks(blocks = [], dataFetcher) {
  const rendered = await Promise.all(blocks.map((b) => renderBlock(b, dataFetcher)));
  return rendered.join("\n");
}
