// workers/src/template-presets.js
// Pre-built template blocks for the page builder
// These are the "preset templates" users can insert with one click.

export const templatePresets = [
  // ═══════════════════════════════════════════════════
  // HEADERS
  // ═══════════════════════════════════════════════════
  {
    id: "header_classic",
    name: "Classic Header",
    category: "headers",
    description: "Logo left, nav centered, call button right",
    icon: "🔝",
    blocks: [{
      block_type: "header_nav",
      props: {
        header_style: "classic",
        header_fixed_desktop: true,
        header_fixed_mobile: true,
        mobile_menu_style: "overlay",
        nav_items: [
          { label: "Home", href: "/" },
          { label: "Listings", href: "/listings", children: [
            { label: "All Listings", href: "/listings" },
            { label: "Map Search", href: "/listings/map" },
          ]},
          { label: "Sell", href: "/sell" },
          { label: "About", href: "/about" },
          { label: "Contact", href: "/contact" },
        ],
      }
    }]
  },
  {
    id: "header_minimal",
    name: "Minimal Header",
    category: "headers",
    description: "Compact header with left-aligned nav",
    icon: "🔝",
    blocks: [{
      block_type: "header_nav",
      props: {
        header_style: "minimal",
        header_fixed_desktop: true,
        mobile_menu_style: "accordion",
        nav_items: [
          { label: "Home", href: "/" },
          { label: "Listings", href: "/listings" },
          { label: "Contact", href: "/contact" },
        ],
      }
    }]
  },
  {
    id: "header_centered",
    name: "Centered Header",
    category: "headers",
    description: "Logo and nav stacked and centered",
    icon: "🔝",
    blocks: [{
      block_type: "header_nav",
      props: {
        header_style: "centered",
        header_fixed_desktop: true,
        mobile_menu_style: "overlay",
        nav_items: [
          { label: "Home", href: "/" },
          { label: "Listings", href: "/listings" },
          { label: "Buy", href: "/buy" },
          { label: "Sell", href: "/sell" },
          { label: "Mortgage", href: "/calculators" },
          { label: "Contact", href: "/contact" },
        ],
      }
    }]
  },

  // ═══════════════════════════════════════════════════
  // HERO SECTIONS
  // ═══════════════════════════════════════════════════
  {
    id: "hero_home_search",
    name: "Home Search Hero",
    category: "heroes",
    description: "Hero with property search CTA",
    icon: "🏠",
    blocks: [{
      block_type: "hero",
      props: {
        heading: "Find Your Perfect Property",
        subheading: "Search listings across the GTA and surrounding areas",
        image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1920&q=80",
        cta_label: "Browse Listings",
        cta_href: "/listings",
      }
    }]
  },
  {
    id: "hero_seller",
    name: "Seller Hero",
    category: "heroes",
    description: "Hero targeting home sellers with valuation CTA",
    icon: "🏠",
    blocks: [{
      block_type: "hero",
      props: {
        heading: "What's Your Home Worth?",
        subheading: "Get a free, no-obligation home valuation from our expert team",
        image: "https://images.unsplash.com/photo-1582407947092-47d0e83b9091?w=1920&q=80",
        cta_label: "Get Free Valuation",
        cta_href: "/sell",
      }
    }]
  },
  {
    id: "hero_buyer",
    name: "Buyer Hero",
    category: "heroes",
    description: "Hero for buyer-focused pages",
    icon: "🏠",
    blocks: [{
      block_type: "hero",
      props: {
        heading: "Your Dream Home Awaits",
        subheading: "Explore exclusive listings with personalized guidance every step of the way",
        image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1920&q=80",
        cta_label: "View Listings",
        cta_href: "/listings",
      }
    }]
  },

  // ═══════════════════════════════════════════════════
  // FEATURE / CONTENT SECTIONS
  // ═══════════════════════════════════════════════════
  {
    id: "stats_trust",
    name: "Trust Stats",
    category: "features",
    description: "Statistics row showing credibility numbers",
    icon: "📊",
    blocks: [{
      block_type: "stats_row",
      props: {
        stats: [
          { value: "500+", label: "Homes Sold" },
          { value: "15+", label: "Years Experience" },
          { value: "98%", label: "Client Satisfaction" },
          { value: "$2B+", label: "In Sales" },
        ]
      }
    }]
  },
  {
    id: "services_grid",
    name: "Services Grid",
    category: "features",
    description: "Three-column services overview",
    icon: "✨",
    blocks: [{
      block_type: "rich_text",
      props: {
        heading: "Our Services",
        body_html: \`
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:2rem;margin-top:2rem;">
            <div style="text-align:center;padding:2rem;background:#f8f9fa;border-radius:12px;">
              <div style="font-size:2.5rem;margin-bottom:1rem;">🏡</div>
              <h3>Buy a Home</h3>
              <p>Find your perfect property from our curated listings across the GTA.</p>
            </div>
            <div style="text-align:center;padding:2rem;background:#f8f9fa;border-radius:12px;">
              <div style="font-size:2.5rem;margin-bottom:1rem;">💰</div>
              <h3>Sell Your Property</h3>
              <p>Get top dollar with our proven marketing strategies and expert negotiation.</p>
            </div>
            <div style="text-align:center;padding:2rem;background:#f8f9fa;border-radius:12px;">
              <div style="font-size:2.5rem;margin-bottom:1rem;">📊</div>
              <h3>Free Valuation</h3>
              <p>Discover what your home is worth in today's market with a free assessment.</p>
            </div>
          </div>
        \`,
      }
    }]
  },
  {
    id: "faq_section",
    name: "FAQ Section",
    category: "features",
    description: "Common questions accordion",
    icon: "❓",
    blocks: [{
      block_type: "faq_accordion",
      props: {
        items: [
          { question: "How do I get started buying a home?", answer_html: "<p>Start by getting pre-approved for a mortgage, then browse our listings. Contact us to schedule viewings.</p>" },
          { question: "What areas do you serve?", answer_html: "<p>We serve the Greater Toronto Area including Toronto, Mississauga, Brampton, Hamilton, and surrounding regions.</p>" },
          { question: "How much does it cost to use a realtor?", answer_html: "<p>Our services are typically covered by the seller's commission, so there's no direct cost to buyers.</p>" },
          { question: "How long does the buying process take?", answer_html: "<p>From offer to closing, the process typically takes 30-90 days depending on conditions and negotiations.</p>" },
        ]
      }
    }]
  },

  // ═══════════════════════════════════════════════════
  // LISTING SECTIONS
  // ═══════════════════════════════════════════════════
  {
    id: "featured_sale",
    name: "Featured Sale Listings",
    category: "listings",
    description: "Grid of 3 featured properties for sale",
    icon: "🏘️",
    blocks: [{
      block_type: "rich_text",
      props: { heading: "Featured Listings" }
    }, {
      block_type: "featured_listings",
      props: { count: 3, filter: "for_sale" }
    }]
  },
  {
    id: "featured_lease",
    name: "Featured Lease Listings",
    category: "listings",
    description: "Grid of 3 featured rental properties",
    icon: "🏘️",
    blocks: [{
      block_type: "rich_text",
      props: { heading: "Available for Lease" }
    }, {
      block_type: "featured_listings",
      props: { count: 3, filter: "for_lease" }
    }]
  },
  {
    id: "listing_grid_full",
    name: "Full Listing Grid",
    category: "listings",
    description: "Paginated listing grid with 12 per page",
    icon: "🏘️",
    blocks: [{
      block_type: "listing_grid",
      props: { pageSize: 12 }
    }]
  },
  {
    id: "office_listings",
    name: "Our Office Listings",
    category: "listings",
    description: "Listings from our own office",
    icon: "🏘️",
    blocks: [{
      block_type: "rich_text",
      props: { heading: "Our Exclusive Listings" }
    }, {
      block_type: "featured_listings",
      props: { count: 6, filter: "office_only", officeKey: "291890" }
    }]
  },

  // ═══════════════════════════════════════════════════
  // CALCULATORS & TOOLS
  // ═══════════════════════════════════════════════════
  {
    id: "calculators_section",
    name: "Mortgage Calculators",
    category: "tools",
    description: "All 14 mortgage/real estate calculators",
    icon: "🧮",
    blocks: [{
      block_type: "rich_text",
      props: { heading: "Free Mortgage Calculators" }
    }, {
      block_type: "calculators_hub",
      props: {}
    }]
  },

  // ═══════════════════════════════════════════════════
  // LEAD CAPTURE / FORMS
  // ═══════════════════════════════════════════════════
  {
    id: "contact_section",
    name: "Contact Form",
    category: "forms",
    description: "Simple contact form",
    icon: "📧",
    blocks: [{
      block_type: "contact_form",
      props: { heading: "Get in Touch" }
    }]
  },
  {
    id: "valuation_section",
    name: "Home Valuation Form",
    category: "forms",
    description: "Free home valuation request form",
    icon: "📧",
    blocks: [{
      block_type: "valuation_form",
      props: { heading: "Get Your Free Home Valuation" }
    }]
  },
  {
    id: "vip_buyer_section",
    name: "VIP Buyer Signup",
    category: "forms",
    description: "VIP buyer program registration",
    icon: "📧",
    blocks: [{
      block_type: "vip_buyer_form",
      props: { heading: "Join the VIP Buyer Program" }
    }]
  },
  {
    id: "dynamic_contact_form",
    name: "Dynamic Contact Form",
    category: "forms",
    description: "Custom form from Forms builder (general_contact)",
    icon: "📧",
    blocks: [{
      block_type: "dynamic_form",
      props: { formKey: "general_contact" }
    }]
  },

  // ═══════════════════════════════════════════════════
  // CALL TO ACTION
  // ═══════════════════════════════════════════════════
  {
    id: "cta_contact",
    name: "Contact CTA",
    category: "cta",
    description: "Call to action with phone + contact button",
    icon: "📢",
    blocks: [{
      block_type: "cta_banner",
      props: {
        heading: "Ready to Make Your Move?",
        cta_label: "Contact Us Today",
        cta_href: "/contact",
        phone: "416-605-7488",
      }
    }]
  },
  {
    id: "cta_valuation",
    name: "Valuation CTA",
    category: "cta",
    description: "CTA driving to home valuation",
    icon: "📢",
    blocks: [{
      block_type: "cta_banner",
      props: {
        heading: "Find Out What Your Home is Worth",
        cta_label: "Get Free Valuation",
        cta_href: "/sell",
      }
    }]
  },
  {
    id: "cta_listings",
    name: "Listings CTA",
    category: "cta",
    description: "CTA driving to property listings",
    icon: "📢",
    blocks: [{
      block_type: "cta_banner",
      props: {
        heading: "Browse Available Properties",
        cta_label: "View All Listings",
        cta_href: "/listings",
      }
    }]
  },

  // ═══════════════════════════════════════════════════
  // FULL PAGE LAYOUTS (multi-block combos)
  // ═══════════════════════════════════════════════════
  {
    id: "page_home",
    name: "Complete Home Page",
    category: "layouts",
    description: "Full homepage: hero → stats → services → listings → FAQ → CTA → form",
    icon: "📄",
    blocks: [
      { block_type: "hero", props: { heading: "Find Your Perfect Property", subheading: "Search listings across the GTA", image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1920&q=80", cta_label: "Browse Listings", cta_href: "/listings" } },
      { block_type: "stats_row", props: { stats: [{ value: "500+", label: "Homes Sold" }, { value: "15+", label: "Years Experience" }, { value: "98%", label: "Satisfaction" }] } },
      { block_type: "rich_text", props: { heading: "Our Services", body_html: '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:2rem;margin-top:2rem;"><div style="text-align:center;padding:2rem;background:#f8f9fa;border-radius:12px;"><div style="font-size:2.5rem;">🏡</div><h3>Buy</h3><p>Find your dream home</p></div><div style="text-align:center;padding:2rem;background:#f8f9fa;border-radius:12px;"><div style="font-size:2.5rem;">💰</div><h3>Sell</h3><p>Get top dollar</p></div><div style="text-align:center;padding:2rem;background:#f8f9fa;border-radius:12px;"><div style="font-size:2.5rem;">📊</div><h3>Valuate</h3><p>Free home valuation</p></div></div>' } },
      { block_type: "featured_listings", props: { count: 3, filter: "for_sale" } },
      { block_type: "cta_banner", props: { heading: "Ready to Make a Move?", cta_label: "Contact Us", cta_href: "/contact", phone: "416-605-7488" } },
      { block_type: "contact_form", props: { heading: "Get in Touch" } },
    ]
  },
  {
    id: "page_sell",
    name: "Sell Page Layout",
    category: "layouts",
    description: "Seller-focused page: hero → valuation → stats → CTA",
    icon: "📄",
    blocks: [
      { block_type: "hero", props: { heading: "What's Your Home Worth?", subheading: "Get a free home valuation today", image: "https://images.unsplash.com/photo-1582407947092-47d0e83b9091?w=1920&q=80", cta_label: "Get Valuation", cta_href: "#valuation" } },
      { block_type: "valuation_form", props: { heading: "Free Home Valuation" } },
      { block_type: "stats_row", props: { stats: [{ value: "$2B+", label: "In Sales" }, { value: "30 Days", label: "Avg. Sale Time" }, { value: "98%", label: "List-to-Sale Ratio" }] } },
      { block_type: "cta_banner", props: { heading: "Ready to Sell?", cta_label: "Schedule a Consultation", cta_href: "/contact", phone: "416-605-7488" } },
    ]
  },
  {
    id: "page_listings",
    name: "Listings Page Layout",
    category: "layouts",
    description: "Property listings page with grid",
    icon: "📄",
    blocks: [
      { block_type: "hero", props: { heading: "Property Listings", subheading: "Browse available properties", cta_label: "", cta_href: "" } },
      { block_type: "listing_grid", props: { pageSize: 12 } },
      { block_type: "cta_banner", props: { heading: "Can't Find What You're Looking For?", cta_label: "Contact Us", cta_href: "/contact" } },
    ]
  },
  {
    id: "page_calculators",
    name: "Calculators Page Layout",
    category: "layouts",
    description: "Mortgage calculators hub page",
    icon: "📄",
    blocks: [
      { block_type: "hero", props: { heading: "Free Mortgage Calculators", subheading: "Plan your finances with our tools" } },
      { block_type: "calculators_hub", props: {} },
      { block_type: "cta_banner", props: { heading: "Need Help With Your Mortgage?", cta_label: "Talk to an Expert", cta_href: "/contact", phone: "416-605-7488" } },
    ]
  },
  {
    id: "page_contact",
    name: "Contact Page Layout",
    category: "layouts",
    description: "Contact page with form and info",
    icon: "📄",
    blocks: [
      { block_type: "hero", props: { heading: "Get in Touch", subheading: "We'd love to hear from you" } },
      { block_type: "contact_form", props: { heading: "Send Us a Message" } },
      { block_type: "faq_accordion", props: { items: [{ question: "What are your office hours?", answer_html: "<p>Monday-Friday 9am-6pm, Saturday 10am-4pm</p>" }, { question: "How quickly do you respond?", answer_html: "<p>We typically respond within 2 hours during business hours.</p>" }] } },
    ]
  },
];

// Helper: get presets filtered by category
export function getPresetsByCategory(category) {
  return templatePresets.filter(p => p.category === category);
}

// Helper: get all categories
export function getPresetCategories() {
  const cats = [...new Set(templatePresets.map(p => p.category))];
  return cats;
}

// Helper: get a single preset by ID
export function getPresetById(id) {
  return templatePresets.find(p => p.id === id);
}

// Helper: flatten all blocks from a preset (for inserting into a page)
export function getPresetBlocks(id) {
  const preset = getPresetById(id);
  return preset ? preset.blocks : [];
}
