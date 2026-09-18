// workers/src/template-presets.js
// Pre-built template blocks for the page builder

export const templatePresets = [
  // HEADERS
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
          { label: "Listings", href: "/listings" },
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

  // HEROES
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

  // FEATURES
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
    id: "faq_section",
    name: "FAQ Section",
    category: "features",
    description: "Common questions accordion",
    icon: "❓",
    blocks: [{
      block_type: "faq_accordion",
      props: {
        items: [
          { question: "How do I get started buying a home?", answer_html: "<p>Start by getting pre-approved for a mortgage, then browse our listings.</p>" },
          { question: "What areas do you serve?", answer_html: "<p>We serve the Greater Toronto Area including Toronto, Mississauga, Brampton, and Hamilton.</p>" },
          { question: "How much does it cost to use a realtor?", answer_html: "<p>Our services are typically covered by the seller's commission.</p>" },
        ]
      }
    }]
  },

  // LISTINGS
  {
    id: "featured_sale",
    name: "Featured Sale Listings",
    category: "listings",
    description: "Grid of 3 featured properties for sale",
    icon: "🏘️",
    blocks: [
      { block_type: "rich_text", props: { heading: "Featured Listings" } },
      { block_type: "featured_listings", props: { count: 3, filter: "for_sale" } }
    ]
  },
  {
    id: "featured_lease",
    name: "Featured Lease Listings",
    category: "listings",
    description: "Grid of 3 featured rental properties",
    icon: "🏘️",
    blocks: [
      { block_type: "rich_text", props: { heading: "Available for Lease" } },
      { block_type: "featured_listings", props: { count: 3, filter: "for_lease" } }
    ]
  },

  // CALCULATORS
  {
    id: "calculators_section",
    name: "Mortgage Calculators",
    category: "tools",
    description: "All 14 mortgage/real estate calculators",
    icon: "🧮",
    blocks: [
      { block_type: "rich_text", props: { heading: "Free Mortgage Calculators" } },
      { block_type: "calculators_hub", props: {} }
    ]
  },

  // FORMS
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

  // CTA
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

  // FULL PAGE LAYOUTS
  {
    id: "page_home",
    name: "Complete Home Page",
    category: "layouts",
    description: "Full homepage: hero → stats → listings → CTA → form",
    icon: "📄",
    blocks: [
      { block_type: "hero", props: { heading: "Find Your Perfect Property", subheading: "Search listings across the GTA", image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1920&q=80", cta_label: "Browse Listings", cta_href: "/listings" } },
      { block_type: "stats_row", props: { stats: [{ value: "500+", label: "Homes Sold" }, { value: "15+", label: "Years Experience" }, { value: "98%", label: "Satisfaction" }] } },
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

// Helper: flatten all blocks from a preset
export function getPresetBlocks(id) {
  const preset = getPresetById(id);
  return preset ? preset.blocks : [];
}
