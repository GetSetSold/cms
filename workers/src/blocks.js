// Block renderers — merged: your original Phase 1 set + the real-estate blocks
// mapped from the mockup canvas (blocks-realestate.js). Each function takes
// `props` (from a page's blocks jsonb) and returns an HTML string; a few take
// `(props, data)` when they need a live fetch first (see DATA_BLOCK_TYPES).

import { tokens } from "./tokens.js";
import { registry as realEstateRegistry } from "./blocks-realestate.js";
import { renderListingDetail } from "./listing-detail.js";
import { renderDynamicForm } from "./dynamic-form.js";

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
  // fetchBlockData. Menu items and footer links are managed centrally in
  // the admin's Menu & Footer tab (settings.nav_items/footer_links), which
  // is the single source of truth — settings wins whenever it has items, so
  // editing that tab actually changes every page's header/footer instead of
  // being silently shadowed by stale per-page block props from before that
  // tab existed. A page's own props.nav_items is only used as a fallback
  // for a page that predates the site-wide menu and has never been re-saved.
  header_nav(props, settings = {}) {
    // preview_nav_items (only ever set by the admin's Menu & Footer live
    // preview) always wins — it's how unsaved edits show up in that
    // preview even though settings otherwise beats a page's own props.
    const navItems = Array.isArray(props.preview_nav_items) ? props.preview_nav_items
      : (settings.nav_items && settings.nav_items.length) ? settings.nav_items
      : (props.nav_items || []);
    const logoText = props.logo_text || settings.business_name || "GetSetSold";
    const logoUrl = props.logo_url || settings.logo_url;
    const phone = props.phone || settings.phone || "416-605-7488";
    const phoneHref = "tel:+1" + String(phone).replace(/\D/g, "");
    const nameStyle = !logoUrl && settings.business_name_font_size
      ? ` style="font-size:${parseInt(settings.business_name_font_size, 10)}px;"`
      : "";
    // 3 mobile menu styles, picked in Menu & Footer: 'overlay' (default —
    // fullscreen slide-down panel), 'accordion' (dropdown list where items
    // with sub-links get a +/- collapse toggle), 'simple' (no hamburger —
    // a horizontally-scrollable pill strip under the header, always visible).
    const mobileStyle = props.preview_mobile_menu_style || settings.mobile_menu_style || "overlay";
    // 3 pre-styled desktop header layouts (settings.header_style, same
    // props-preview/settings precedence as everything else here):
    // 'classic' (logo left / nav centered / actions right — the original
    // layout), 'centered' (logo, then nav, stacked and centered), 'minimal'
    // (compact height, nav left-aligned next to the logo). These only
    // reflow the desktop (>900px) header — the mobile hamburger/dropdown
    // behavior below is identical no matter which one is picked.
    const headerStyle = props.preview_header_style || settings.header_style || "classic";
    // Independent "fixed header" toggles for desktop vs mobile — sticks the
    // header to the top of the viewport on scroll for that breakpoint only.
    const fixedDesktop = props.preview_header_fixed_desktop ?? settings.header_fixed_desktop;
    const fixedMobile = props.preview_header_fixed_mobile ?? settings.header_fixed_mobile;
    const headerClasses = [
      "site-header",
      `site-header-${esc(headerStyle)}`,
      fixedDesktop ? "header-fixed-desktop" : "",
      fixedMobile ? "header-fixed-mobile" : "",
    ].filter(Boolean).join(" ");
    const items = navItems.map((item, i) => {
      const children = Array.isArray(item.children) ? item.children : [];
      if (mobileStyle === "accordion" && children.length) {
        const subLinks = children.map((c) => `<a href="${esc(c.href)}" class="nav-sublink">${esc(c.label)}</a>`).join("");
        return `
          <div class="nav-item-group">
            <button type="button" class="nav-link nav-item-toggle" data-nav-group="${i}">${esc(item.label)}<span class="nav-toggle-sign">+</span></button>
            <div class="nav-submenu" id="nav-submenu-${i}">${subLinks}</div>
          </div>`;
      }
      return `<a href="${esc(item.href)}" class="nav-link">${esc(item.label)}</a>`;
    }).join("");
    return `
      <header class="${headerClasses}">
        <a class="logo" href="/"${nameStyle}>${logoUrl ? `<img src="${esc(logoUrl)}" alt="${esc(logoText)}" class="logo-img" />` : esc(logoText)}</a>
        <nav class="main-nav main-nav-${esc(mobileStyle)}" id="main-nav">${items}</nav>
        <div class="header-actions">
          <a class="btn btn-accent" href="${esc(phoneHref)}">Call Now</a>
          ${mobileStyle !== "simple" ? `
          <button class="nav-toggle" id="nav-toggle" aria-label="Menu" aria-expanded="false">
            <span></span><span></span><span></span>
          </button>` : ""}
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
          var toggles = document.querySelectorAll('.nav-item-toggle');
          for (var i = 0; i < toggles.length; i++) {
            toggles[i].addEventListener('click', function() {
              var group = this.parentElement;
              var open = group.classList.toggle('open');
              var sign = this.querySelector('.nav-toggle-sign');
              if (sign) sign.textContent = open ? '−' : '+';
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
    // Footer links: built in the admin's Menu & Footer tab — settings wins
    // over stale per-page props, same precedence as header_nav above.
    const footerLinksSrc = Array.isArray(props.preview_footer_links) ? props.preview_footer_links
      : (settings.footer_links && settings.footer_links.length) ? settings.footer_links
      : (props.footer_links || []);
    const footerLinks = footerLinksSrc.map((l) => `<a href="${esc(l.href)}" class="footer-link">${esc(l.label)}</a>`).join("");
    // 3 pre-styled footer layouts (settings.footer_style): 'simple' (the
    // original stacked layout — info, links, social all in one left-aligned
    // column), 'columns' (info / links / social as 3 side-by-side columns),
    // 'centered' (everything centered, for a lighter-weight footer). The
    // markup is the same 3 column divs in every case — only the CSS for
    // .site-footer-<style> changes how they're arranged, so nothing here
    // needs to branch on footerStyle beyond the class name.
    const footerStyle = props.preview_footer_style || settings.footer_style || "simple";
    return `
      <footer class="site-footer site-footer-${esc(footerStyle)}">
        <div class="footer-col footer-col-info">
          <p>${esc(brokerage)}</p>
          <p>${esc(agentName)} — ${esc(phone)}${email ? ` — ${esc(email)}` : ""}</p>
        </div>
        ${footerLinks ? `<div class="footer-col footer-col-links"><p class="footer-links">${footerLinks}</p></div>` : ""}
        ${socialLinks ? `<div class="footer-col footer-col-social"><p class="footer-social">${socialLinks}</p></div>` : ""}
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

  // Dynamic lead-capture form (see 0008_lead_forms.sql / the admin's Forms
  // tab) — one block type that renders whatever form `props.formKey`
  // points at, built from sections + questions stored in the CRM DB.
  dynamic_form: renderDynamicForm,
};

// Block types that need a live data fetch before rendering (see render.js /
// index.js for the actual fetch — this list is just what to await for).
export const DATA_BLOCK_TYPES = new Set(["featured_listings", "listing_grid", "map_split_search", "header_nav", "footer", "dynamic_form"]);

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
