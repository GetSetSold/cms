// Block renderers — merged: your original Phase 1 set + the real-estate blocks
// mapped from the mockup canvas (blocks-realestate.js). Each function takes
// `props` (from a page's blocks jsonb) and returns an HTML string; a few take
// `(props, data)` when they need a live fetch first (see DATA_BLOCK_TYPES).

import { tokens } from "./tokens.js";
import { registry as realEstateRegistry } from "./blocks-realestate.js";

function esc(s = "") {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

// ---- your original Phase 1 renderers, unchanged ----
export const renderers = {
  header_nav(props) {
    const items = (props.nav_items || []).map(
      (i) => `<a href="${esc(i.href)}" class="nav-link">${esc(i.label)}</a>`
    ).join("");
    return `
      <header class="site-header">
        <a class="logo" href="/">${esc(props.logo_text || "GetSetSold")}</a>
        <nav class="main-nav">${items}</nav>
        <a class="btn btn-accent" href="tel:+14166057488">Call Now</a>
      </header>`;
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

  footer(props) {
    return `
      <footer class="site-footer">
        <p>${esc(props.brokerage || "Lombard Group Real Estate Inc., Brokerage")}</p>
        <p>Rohit K. Sharma, REALTOR® — 416-605-7488</p>
      </footer>`;
  },

  // ---- real-estate blocks, merged in from blocks-realestate.js ----
  ...realEstateRegistry,
};

// Block types that need a live data fetch before rendering (see render.js /
// index.js for the actual fetch — this list is just what to await for).
export const DATA_BLOCK_TYPES = new Set(["featured_listings", "listing_grid", "map_split_search"]);

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
