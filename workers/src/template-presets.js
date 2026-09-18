--- src/components/ImplementationGuide.tsx (原始)
import React, { useState } from 'react';

type Step = 'presets' | 'api' | 'admin-ui' | 'database' | 'deploy';

export const ImplementationGuide: React.FC = () => {
  const [activeStep, setActiveStep] = useState<Step>('presets');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const steps: { id: Step; label: string; icon: string; file: string }[] = [
    { id: 'presets', label: '1. Template Presets', icon: '📦', file: 'workers/src/template-presets.js' },
    { id: 'api', label: '2. API Endpoint', icon: '🔌', file: 'workers/src/index.js (add to)' },
    { id: 'admin-ui', label: '3. Admin UI', icon: '🎨', file: 'admin app (add to)' },
    { id: 'database', label: '4. DB Migration', icon: '🗄️', file: 'supabase/migrations/0015_templates.sql' },
    { id: 'deploy', label: '5. Deploy', icon: '🚀', file: 'wrangler deploy' },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-emerald-700 to-teal-700 text-white">
        <h3 className="font-bold text-lg mb-1">🛠️ Implementation Guide</h3>
        <p className="text-sm text-emerald-100">Add template support to your GetSetSold CMS — 5 files, copy-paste ready</p>
      </div>

      {/* Step Navigation */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
        {steps.map(step => (
          <button
            key={step.id}
            onClick={() => setActiveStep(step.id)}
            className={`flex-shrink-0 px-4 py-3 text-xs font-medium transition-colors ${
              activeStep === step.id
                ? 'text-emerald-700 border-b-2 border-emerald-700 bg-emerald-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <span className="mr-1">{step.icon}</span>
            {step.label}
          </button>
        ))}
      </div>

      {/* Step Content */}
      <div className="p-4">
        {activeStep === 'presets' && <PresetsStep copiedId={copiedId} onCopy={copyToClipboard} />}
        {activeStep === 'api' && <ApiStep copiedId={copiedId} onCopy={copyToClipboard} />}
        {activeStep === 'admin-ui' && <AdminUIStep copiedId={copiedId} onCopy={copyToClipboard} />}
        {activeStep === 'database' && <DatabaseStep copiedId={copiedId} onCopy={copyToClipboard} />}
        {activeStep === 'deploy' && <DeployStep copiedId={copiedId} onCopy={copyToClipboard} />}
      </div>
    </div>
  );
};

// ─── Copy Button Component ────────────────────────────────────────────────
const CopyButton: React.FC<{ text: string; id: string; copiedId: string | null; onCopy: (text: string, id: string) => void }> = ({ text, id, copiedId, onCopy }) => (
  <button
    onClick={() => onCopy(text, id)}
    className="absolute top-2 right-2 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white text-[10px] rounded transition-colors flex items-center gap-1"
  >
    {copiedId === id ? (
      <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Copied!</>
    ) : (
      <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>Copy</>
    )}
  </button>
);

// ─── Step 1: Template Presets File ────────────────────────────────────────
const PresetsStep: React.FC<{ copiedId: string | null; onCopy: (text: string, id: string) => void }> = ({ copiedId, onCopy }) => {
  const code = `// workers/src/template-presets.js
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
        body_html: \\\`
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
        \\\`,
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
}`;

  return (
    <div className="space-y-4">
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
        <h4 className="font-semibold text-emerald-900 mb-1">📁 Create new file: <code className="bg-emerald-100 px-1.5 py-0.5 rounded text-xs">workers/src/template-presets.js</code></h4>
        <p className="text-sm text-emerald-800">This file defines all available template presets. Each preset contains one or more blocks ready to insert.</p>
      </div>

      <div className="relative">
        <CopyButton text={code} id="presets-code" copiedId={copiedId} onCopy={onCopy} />
        <pre className="bg-gray-900 text-green-400 rounded-lg p-4 text-xs overflow-auto max-h-[500px] font-mono leading-relaxed">
          {code}
        </pre>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-900">
          <strong>💡 What this does:</strong> Exports an array of template objects. Each has an <code className="bg-blue-100 px-1 rounded">id</code>, <code className="bg-blue-100 px-1 rounded">name</code>, <code className="bg-blue-100 px-1 rounded">category</code>, and <code className="bg-blue-100 px-1 rounded">blocks</code> array. The admin UI will read this to show the template picker.
        </p>
      </div>
    </div>
  );
};

// ─── Step 2: API Endpoint ─────────────────────────────────────────────────
const ApiStep: React.FC<{ copiedId: string | null; onCopy: (text: string, id: string) => void }> = ({ copiedId, onCopy }) => {
  const code = `// ═══════════════════════════════════════════════════
// ADD THIS TO: workers/src/index.js
// Add these lines in the appropriate places
// ═══════════════════════════════════════════════════

// ── 1. Add this import at the TOP of index.js ──────
import { templatePresets, getPresetById } from "./template-presets.js";

// ── 2. Add this handler function (before the export default) ──

// Template presets API — the admin app calls this to get
// available templates for the "Insert Template" picker.
// GET /api/templates → returns all presets
// GET /api/templates?id=header_classic → returns one preset
async function handleTemplatesRequest(url) {
  const id = url.searchParams.get("id");

  if (id) {
    const preset = getPresetById(id);
    if (!preset) {
      return new Response(JSON.stringify({ error: "Template not found" }), {
        status: 404,
        headers: { "content-type": "application/json", ...CORS_HEADERS },
      });
    }
    return new Response(JSON.stringify(preset), {
      headers: { "content-type": "application/json", ...CORS_HEADERS },
    });
  }

  return new Response(JSON.stringify({ templates: templatePresets }), {
    headers: { "content-type": "application/json", ...CORS_HEADERS },
  });
}

// ── 3. Add this route inside the fetch() handler ──────
// (add it alongside the other /api/ routes)

if (url.pathname === "/api/templates") {
  if (request.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  return handleTemplatesRequest(url);
}

// ═══════════════════════════════════════════════════
// FULL ROUTER SECTION (for reference — add the templates
// route alongside your existing routes):
// ═══════════════════════════════════════════════════

/*
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ... existing routes ...

    if (url.pathname === "/api/leads" && request.method === "POST") {
      return handleLeadSubmission(request, env);
    }

    if (url.pathname === "/api/preview") {
      if (request.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
      if (request.method === "POST") return handlePreviewRequest(request, env);
    }

    // ── NEW: Template presets endpoint ──
    if (url.pathname === "/api/templates") {
      if (request.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
      return handleTemplatesRequest(url);
    }

    if (url.pathname === "/api/listings-search") {
      // ...
    }

    // ... rest of router ...
  },
};
*/`;

  return (
    <div className="space-y-4">
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
        <h4 className="font-semibold text-emerald-900 mb-1">📝 Edit file: <code className="bg-emerald-100 px-1.5 py-0.5 rounded text-xs">workers/src/index.js</code></h4>
        <p className="text-sm text-emerald-800">Add the import, handler function, and route to your existing index.js. Three small additions.</p>
      </div>

      <div className="relative">
        <CopyButton text={code} id="api-code" copiedId={copiedId} onCopy={onCopy} />
        <pre className="bg-gray-900 text-green-400 rounded-lg p-4 text-xs overflow-auto max-h-[500px] font-mono leading-relaxed">
          {code}
        </pre>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-900">
          <strong>🔌 API Endpoints created:</strong><br/>
          <code className="bg-blue-100 px-1 rounded">GET /api/templates</code> → All presets<br/>
          <code className="bg-blue-100 px-1 rounded">GET /api/templates?id=header_classic</code> → Single preset<br/>
          Both return CORS headers so the admin app can call them cross-origin.
        </p>
      </div>
    </div>
  );
};

// ─── Step 3: Admin UI ─────────────────────────────────────────────────────
const AdminUIStep: React.FC<{ copiedId: string | null; onCopy: (text: string, id: string) => void }> = ({ copiedId, onCopy }) => {
  const code = `// ═══════════════════════════════════════════════════
// ADD TO YOUR ADMIN APP (admin.rohit-910.workers.dev)
// This is the Template Picker component for the page builder
// ═══════════════════════════════════════════════════

// ── TemplatePicker.jsx ──
// Add this component to your admin app's page builder

import { useState, useEffect } from "react";

const CMS_URL = "https://cms.rohit-910.workers.dev";

export function TemplatePicker({ onInsert, onClose }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch(\`\${CMS_URL}/api/templates\`)
      .then(r => r.json())
      .then(data => {
        setTemplates(data.templates || []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load templates:", err);
        setLoading(false);
      });
  }, []);

  const categories = ["all", ...new Set(templates.map(t => t.category))];

  const filtered = templates.filter(t => {
    const matchCategory = activeCategory === "all" || t.category === activeCategory;
    const matchSearch = !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchSearch;
  });

  const handleInsert = (template) => {
    // template.blocks is an array of block objects
    // Insert them all at once into the page
    onInsert(template.blocks);
    onClose();
  };

  if (loading) return <div className="p-8 text-center">Loading templates...</div>;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-bold">Insert Template</h2>
            <p className="text-sm text-gray-500">Choose a pre-built section to add to your page</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">✕</button>
        </div>

        {/* Search + Category Filter */}
        <div className="p-4 border-b space-y-3">
          <input
            type="text"
            placeholder="Search templates..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm"
          />
          <div className="flex gap-2 flex-wrap">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={\`px-3 py-1 rounded-full text-xs font-medium \${
                  activeCategory === cat
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }\`}
              >
                {cat === "all" ? "All" : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Template Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(template => (
              <button
                key={template.id}
                onClick={() => handleInsert(template)}
                className="text-left p-4 border rounded-lg hover:border-indigo-400 hover:shadow-md transition-all group"
              >
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-xl">{template.icon}</span>
                  <div>
                    <h3 className="font-semibold text-sm group-hover:text-indigo-600">
                      {template.name}
                    </h3>
                    <span className="text-[10px] text-gray-400 uppercase">
                      {template.category}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-500">{template.description}</p>
                <div className="mt-2 text-[10px] text-indigo-500 font-medium">
                  {template.blocks.length} block{template.blocks.length > 1 ? "s" : ""} → Click to insert
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// HOW TO INTEGRATE INTO YOUR PAGE BUILDER:
// ═══════════════════════════════════════════════════

// In your page builder component, add:
//
// 1. A state for showing the template picker:
//    const [showTemplatePicker, setShowTemplatePicker] = useState(false);
//
// 2. A button to open it (add near your "Add Block" button):
//    <button onClick={() => setShowTemplatePicker(true)}>
//      📦 Insert Template
//    </button>
//
// 3. The handler that inserts blocks:
//    const handleInsertTemplate = (newBlocks) => {
//      setBlocks(prev => [...prev, ...newBlocks]);
//      // This updates the page's blocks array
//      // The preview iframe will re-render automatically
//    };
//
// 4. Render the picker conditionally:
//    {showTemplatePicker && (
//      <TemplatePicker
//        onInsert={handleInsertTemplate}
//        onClose={() => setShowTemplatePicker(false)}
//      />
//    )}
//
// 5. The preview will update via your existing /api/preview
//    endpoint — no changes needed there!`;

  return (
    <div className="space-y-4">
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
        <h4 className="font-semibold text-emerald-900 mb-1">📝 Add to your admin app: <code className="bg-emerald-100 px-1.5 py-0.5 rounded text-xs">TemplatePicker.jsx</code></h4>
        <p className="text-sm text-emerald-800">This React component fetches templates from your CMS and shows a picker modal in the page builder.</p>
      </div>

      <div className="relative">
        <CopyButton text={code} id="admin-code" copiedId={copiedId} onCopy={onCopy} />
        <pre className="bg-gray-900 text-green-400 rounded-lg p-4 text-xs overflow-auto max-h-[500px] font-mono leading-relaxed">
          {code}
        </pre>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
        <p className="text-sm text-amber-900">
          <strong>⚡ How it works:</strong> The TemplatePicker fetches from <code className="bg-amber-100 px-1 rounded">/api/templates</code>, shows a grid of templates, and when clicked, inserts the template's blocks array into the page. Your existing preview system handles the rest!
        </p>
      </div>
    </div>
  );
};

// ─── Step 4: Database Migration ───────────────────────────────────────────
const DatabaseStep: React.FC<{ copiedId: string | null; onCopy: (text: string, id: string) => void }> = ({ copiedId, onCopy }) => {
  const code = `-- ═══════════════════════════════════════════════════
-- OPTIONAL: Create a templates table in Supabase
-- This lets you manage templates dynamically from the admin
-- (instead of hardcoding them in template-presets.js)
-- ═══════════════════════════════════════════════════

-- File: supabase/migrations/0015_template_presets.sql

-- Create the template_presets table
CREATE TABLE IF NOT EXISTS template_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  preset_key text UNIQUE NOT NULL,     -- e.g. "header_classic"
  name text NOT NULL,                   -- e.g. "Classic Header"
  category text NOT NULL,               -- e.g. "headers"
  description text,
  icon text DEFAULT '📦',
  blocks jsonb NOT NULL DEFAULT '[]'::jsonb,  -- the actual block array
  sort_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for fast category lookups
CREATE INDEX idx_template_presets_category ON template_presets(category);
CREATE INDEX idx_template_presets_active ON template_presets(is_active);

-- ═══════════════════════════════════════════════════
-- Seed with the built-in presets:
-- ═══════════════════════════════════════════════════

INSERT INTO template_presets (preset_key, name, category, description, icon, blocks, sort_order) VALUES
-- HEADERS
('header_classic', 'Classic Header', 'headers', 'Logo left, nav centered, call button right', '🔝',
 '[{"block_type":"header_nav","props":{"header_style":"classic","header_fixed_desktop":true,"header_fixed_mobile":true,"mobile_menu_style":"overlay","nav_items":[{"label":"Home","href":"/"},{"label":"Listings","href":"/listings"},{"label":"Sell","href":"/sell"},{"label":"Contact","href":"/contact"}]}}]', 1),

('header_minimal', 'Minimal Header', 'headers', 'Compact header with left-aligned nav', '🔝',
 '[{"block_type":"header_nav","props":{"header_style":"minimal","header_fixed_desktop":true,"mobile_menu_style":"accordion","nav_items":[{"label":"Home","href":"/"},{"label":"Listings","href":"/listings"},{"label":"Contact","href":"/contact"}]}}]', 2),

('header_centered', 'Centered Header', 'headers', 'Logo and nav stacked and centered', '🔝',
 '[{"block_type":"header_nav","props":{"header_style":"centered","header_fixed_desktop":true,"mobile_menu_style":"overlay","nav_items":[{"label":"Home","href":"/"},{"label":"Listings","href":"/listings"},{"label":"Buy","href":"/buy"},{"label":"Sell","href":"/sell"},{"label":"Contact","href":"/contact"}]}}]', 3),

-- HEROES
('hero_home_search', 'Home Search Hero', 'heroes', 'Hero with property search CTA', '🏠',
 '[{"block_type":"hero","props":{"heading":"Find Your Perfect Property","subheading":"Search listings across the GTA","image":"https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1920&q=80","cta_label":"Browse Listings","cta_href":"/listings"}}]', 10),

('hero_seller', 'Seller Hero', 'heroes', 'Hero targeting home sellers', '🏠',
 '[{"block_type":"hero","props":{"heading":"What''s Your Home Worth?","subheading":"Get a free home valuation","image":"https://images.unsplash.com/photo-1582407947092-47d0e83b9091?w=1920&q=80","cta_label":"Get Free Valuation","cta_href":"/sell"}}]', 11),

-- FEATURES
('stats_trust', 'Trust Stats', 'features', 'Statistics row showing credibility', '📊',
 '[{"block_type":"stats_row","props":{"stats":[{"value":"500+","label":"Homes Sold"},{"value":"15+","label":"Years Experience"},{"value":"98%","label":"Satisfaction"},{"value":"$2B+","label":"In Sales"}]}}]', 20),

('faq_section', 'FAQ Section', 'features', 'Common questions accordion', '❓',
 '[{"block_type":"faq_accordion","props":{"items":[{"question":"How do I get started?","answer_html":"<p>Start by getting pre-approved for a mortgage.</p>"},{"question":"What areas do you serve?","answer_html":"<p>We serve the Greater Toronto Area.</p>"},{"question":"How much does it cost?","answer_html":"<p>Our services are typically covered by the seller''s commission.</p>"}]}}]', 21),

-- LISTINGS
('featured_sale', 'Featured Sale Listings', 'listings', '3 featured properties for sale', '🏘️',
 '[{"block_type":"rich_text","props":{"heading":"Featured Listings"}},{"block_type":"featured_listings","props":{"count":3,"filter":"for_sale"}}]', 30),

('office_listings', 'Our Office Listings', 'listings', 'Listings from our office', '🏘️',
 '[{"block_type":"rich_text","props":{"heading":"Our Exclusive Listings"}},{"block_type":"featured_listings","props":{"count":6,"filter":"office_only","officeKey":"291890"}}]', 31),

-- TOOLS
('calculators_section', 'Mortgage Calculators', 'tools', 'All 14 calculators', '🧮',
 '[{"block_type":"rich_text","props":{"heading":"Free Mortgage Calculators"}},{"block_type":"calculators_hub","props":{}}]', 40),

-- FORMS
('contact_section', 'Contact Form', 'forms', 'Simple contact form', '📧',
 '[{"block_type":"contact_form","props":{"heading":"Get in Touch"}}]', 50),

('valuation_section', 'Home Valuation Form', 'forms', 'Free valuation request', '📧',
 '[{"block_type":"valuation_form","props":{"heading":"Get Your Free Home Valuation"}}]', 51),

-- CTA
('cta_contact', 'Contact CTA', 'cta', 'Call to action with phone', '📢',
 '[{"block_type":"cta_banner","props":{"heading":"Ready to Make Your Move?","cta_label":"Contact Us Today","cta_href":"/contact","phone":"416-605-7488"}}]', 60),

('cta_valuation', 'Valuation CTA', 'cta', 'CTA driving to valuation', '📢',
 '[{"block_type":"cta_banner","props":{"heading":"Find Out What Your Home is Worth","cta_label":"Get Free Valuation","cta_href":"/sell"}}]', 61),

-- FULL PAGE LAYOUTS
('page_home', 'Complete Home Page', 'layouts', 'Full homepage layout', '📄',
 '[{"block_type":"hero","props":{"heading":"Find Your Perfect Property","subheading":"Search listings across the GTA","image":"https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1920&q=80","cta_label":"Browse Listings","cta_href":"/listings"}},{"block_type":"stats_row","props":{"stats":[{"value":"500+","label":"Homes Sold"},{"value":"15+","label":"Years"},{"value":"98%","label":"Satisfaction"}]}},{"block_type":"featured_listings","props":{"count":3,"filter":"for_sale"}},{"block_type":"cta_banner","props":{"heading":"Ready to Make a Move?","cta_label":"Contact Us","cta_href":"/contact","phone":"416-605-7488"}},{"block_type":"contact_form","props":{"heading":"Get in Touch"}}]', 100),

('page_sell', 'Sell Page Layout', 'layouts', 'Seller-focused page', '📄',
 '[{"block_type":"hero","props":{"heading":"What''s Your Home Worth?","subheading":"Get a free home valuation","image":"https://images.unsplash.com/photo-1582407947092-47d0e83b9091?w=1920&q=80","cta_label":"Get Valuation","cta_href":"#valuation"}},{"block_type":"valuation_form","props":{"heading":"Free Home Valuation"}},{"block_type":"stats_row","props":{"stats":[{"value":"$2B+","label":"In Sales"},{"value":"30 Days","label":"Avg. Sale Time"}]}},{"block_type":"cta_banner","props":{"heading":"Ready to Sell?","cta_label":"Schedule Consultation","cta_href":"/contact"}}]', 101),

('page_listings', 'Listings Page Layout', 'layouts', 'Property listings page', '📄',
 '[{"block_type":"hero","props":{"heading":"Property Listings","subheading":"Browse available properties"}},{"block_type":"listing_grid","props":{"pageSize":12}},{"block_type":"cta_banner","props":{"heading":"Can''t Find What You Need?","cta_label":"Contact Us","cta_href":"/contact"}}]', 102);

-- ═══════════════════════════════════════════════════
-- Then update your /api/templates endpoint to read
-- from this table instead of the hardcoded file:
-- ═══════════════════════════════════════════════════

/*
async function handleTemplatesRequest(url, env) {
  const id = url.searchParams.get("id");

  if (id) {
    const res = await supabaseFetch(env,
      \`template_presets?preset_key=eq.\${id}&select=*\`
    );
    const rows = await res.json();
    return new Response(JSON.stringify(rows[0] || null), {
      headers: { "content-type": "application/json", ...CORS_HEADERS },
    });
  }

  const res = await supabaseFetch(env,
    "template_presets?is_active=eq.true&order=sort_order.asc&select=*"
  );
  const templates = await res.json();
  return new Response(JSON.stringify({ templates }), {
    headers: { "content-type": "application/json", ...CORS_HEADERS },
  });
}
*/`;

  return (
    <div className="space-y-4">
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
        <h4 className="font-semibold text-emerald-900 mb-1">📁 Optional: Create <code className="bg-emerald-100 px-1.5 py-0.5 rounded text-xs">supabase/migrations/0015_template_presets.sql</code></h4>
        <p className="text-sm text-emerald-800">Run this in Supabase SQL Editor to create a templates table. This lets you manage templates dynamically from the admin app.</p>
      </div>

      <div className="relative">
        <CopyButton text={code} id="db-code" copiedId={copiedId} onCopy={onCopy} />
        <pre className="bg-gray-900 text-green-400 rounded-lg p-4 text-xs overflow-auto max-h-[500px] font-mono leading-relaxed">
          {code}
        </pre>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
        <p className="text-sm text-amber-900">
          <strong>📌 Note:</strong> This step is optional. You can start with the hardcoded <code className="bg-amber-100 px-1 rounded">template-presets.js</code> file (Steps 1-3) and add the database table later when you want admin-editable templates.
        </p>
      </div>
    </div>
  );
};

// ─── Step 5: Deploy ───────────────────────────────────────────────────────
const DeployStep: React.FC<{ copiedId: string | null; onCopy: (text: string, id: string) => void }> = ({ copiedId, onCopy }) => {
  const code = `# ═══════════════════════════════════════════════════
# DEPLOY YOUR CHANGES
# ═══════════════════════════════════════════════════

# Option A: Push to GitHub (if you have auto-deploy)
git add workers/src/template-presets.js
git add workers/src/index.js
git commit -m "Add template presets system for page builder"
git push origin main
# → Cloudflare auto-deploys the worker

# Option B: Manual deploy from local
cd workers
npx wrangler deploy

# ═══════════════════════════════════════════════════
# VERIFY IT WORKS
# ═══════════════════════════════════════════════════

# Test the API endpoint:
curl https://cms.rohit-910.workers.dev/api/templates

# Should return JSON with all your template presets.
# Test a single preset:
curl https://cms.rohit-910.workers.dev/api/templates?id=header_classic

# ═══════════════════════════════════════════════════
# TEST IN THE ADMIN APP
# ═══════════════════════════════════════════════════

# 1. Open your admin app (admin.rohit-910.workers.dev)
# 2. Go to the Pages editor
# 3. Click "Insert Template" button
# 4. Pick a template → blocks get added to the page
# 5. Preview updates automatically via /api/preview
# 6. Save the page → it's live!

# ═══════════════════════════════════════════════════
# ADDING NEW TEMPLATES LATER
# ═══════════════════════════════════════════════════

# To add a new template preset, just add it to the
# templatePresets array in template-presets.js:

# {
#   id: "my_new_template",
#   name: "My New Template",
#   category: "features",
#   description: "Does something cool",
#   icon: "✨",
#   blocks: [
#     { block_type: "rich_text", props: { heading: "Hello", body_html: "<p>World</p>" } }
#   ]
# }

# Then push to GitHub → auto-deploys → available immediately!

# ═══════════════════════════════════════════════════
# TROUBLESHOOTING
# ═══════════════════════════════════════════════════

# If templates don't show in admin:
# 1. Check /api/templates returns data (curl above)
# 2. Check CORS_HEADERS includes your admin origin
# 3. Check browser console for errors
# 4. Verify template-presets.js is imported correctly

# If blocks don't render after insert:
# 1. Check block_type matches a renderer in blocks.js
# 2. Check props match what the renderer expects
# 3. Use /api/preview to test before saving`;

  return (
    <div className="space-y-4">
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
        <h4 className="font-semibold text-emerald-900 mb-1">🚀 Deploy & Verify</h4>
        <p className="text-sm text-emerald-800">Push your changes and verify everything works end-to-end.</p>
      </div>

      <div className="relative">
        <CopyButton text={code} id="deploy-code" copiedId={copiedId} onCopy={onCopy} />
        <pre className="bg-gray-900 text-green-400 rounded-lg p-4 text-xs overflow-auto max-h-[500px] font-mono leading-relaxed">
          {code}
        </pre>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="font-semibold text-green-900 mb-2">✅ Checklist</h4>
        <ul className="space-y-2 text-sm text-green-800">
          <li className="flex items-start gap-2">
            <span className="text-green-600 mt-0.5">☐</span>
            <span>Created <code className="bg-green-100 px-1 rounded">workers/src/template-presets.js</code></span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 mt-0.5">☐</span>
            <span>Added import + handler + route to <code className="bg-green-100 px-1 rounded">workers/src/index.js</code></span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 mt-0.5">☐</span>
            <span>Added TemplatePicker component to admin app</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 mt-0.5">☐</span>
            <span>Pushed to GitHub → Worker auto-deployed</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 mt-0.5">☐</span>
            <span><code className="bg-green-100 px-1 rounded">curl /api/templates</code> returns presets</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 mt-0.5">☐</span>
            <span>Admin app shows template picker and inserts blocks</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 mt-0.5">☐</span>
            <span>Preview renders correctly after template insert</span>
          </li>
        </ul>
      </div>
    </div>
  );
};


+++ src/components/ImplementationGuide.tsx (修改后)
import React, { useState } from 'react';

type Step = 'presets' | 'api' | 'admin-ui' | 'database' | 'deploy';

export const ImplementationGuide: React.FC = () => {
  const [activeStep, setActiveStep] = useState<Step>('presets');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const steps: { id: Step; label: string; icon: string; file: string }[] = [
    { id: 'presets', label: '1. Template Presets', icon: '📦', file: 'workers/src/template-presets.js' },
    { id: 'api', label: '2. API Endpoint', icon: '🔌', file: 'workers/src/index.js (add to)' },
    { id: 'admin-ui', label: '3. Admin UI', icon: '🎨', file: 'admin app (add to)' },
    { id: 'database', label: '4. DB Migration', icon: '🗄️', file: 'supabase/migrations/0015_templates.sql' },
    { id: 'deploy', label: '5. Deploy', icon: '🚀', file: 'wrangler deploy' },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-emerald-700 to-teal-700 text-white">
        <h3 className="font-bold text-lg mb-1">🛠️ Implementation Guide</h3>
        <p className="text-sm text-emerald-100">Add template support to your GetSetSold CMS — 5 files, copy-paste ready</p>
      </div>

      {/* Step Navigation */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
        {steps.map(step => (
          <button
            key={step.id}
            onClick={() => setActiveStep(step.id)}
            className={`flex-shrink-0 px-4 py-3 text-xs font-medium transition-colors ${
              activeStep === step.id
                ? 'text-emerald-700 border-b-2 border-emerald-700 bg-emerald-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <span className="mr-1">{step.icon}</span>
            {step.label}
          </button>
        ))}
      </div>

      {/* Step Content */}
      <div className="p-4">
        {activeStep === 'presets' && <PresetsStep copiedId={copiedId} onCopy={copyToClipboard} />}
        {activeStep === 'api' && <ApiStep copiedId={copiedId} onCopy={copyToClipboard} />}
        {activeStep === 'admin-ui' && <AdminUIStep copiedId={copiedId} onCopy={copyToClipboard} />}
        {activeStep === 'database' && <DatabaseStep copiedId={copiedId} onCopy={copyToClipboard} />}
        {activeStep === 'deploy' && <DeployStep copiedId={copiedId} onCopy={copyToClipboard} />}
      </div>
    </div>
  );
};

// ─── Copy Button Component ────────────────────────────────────────────────
const CopyButton: React.FC<{ text: string; id: string; copiedId: string | null; onCopy: (text: string, id: string) => void }> = ({ text, id, copiedId, onCopy }) => (
  <button
    onClick={() => onCopy(text, id)}
    className="absolute top-2 right-2 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white text-[10px] rounded transition-colors flex items-center gap-1"
  >
    {copiedId === id ? (
      <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Copied!</>
    ) : (
      <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>Copy</>
    )}
  </button>
);

// ─── Step 1: Template Presets File ────────────────────────────────────────
const PresetsStep: React.FC<{ copiedId: string | null; onCopy: (text: string, id: string) => void }> = ({ copiedId, onCopy }) => {
  const code = `// workers/src/template-presets.js
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
        body_html: \\\`
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
        \\\`,
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
}`;

  return (
    <div className="space-y-4">
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
        <h4 className="font-semibold text-emerald-900 mb-1">📁 Create new file: <code className="bg-emerald-100 px-1.5 py-0.5 rounded text-xs">workers/src/template-presets.js</code></h4>
        <p className="text-sm text-emerald-800">This file defines all available template presets. Each preset contains one or more blocks ready to insert.</p>
      </div>

      {/* Prominent Copy Button */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg p-4 text-white">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h5 className="font-bold text-sm mb-1">📋 Copy the complete template-presets.js file</h5>
            <p className="text-xs text-indigo-100">Click the button below to copy all the code, then paste it into your new file</p>
          </div>
          <button
            onClick={() => onCopy(code, 'presets-code-main')}
            className="flex-shrink-0 px-6 py-3 bg-white text-indigo-700 rounded-lg font-bold text-sm hover:bg-indigo-50 transition-colors flex items-center gap-2 shadow-lg"
          >
            {copiedId === 'presets-code-main' ? (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy All Code
              </>
            )}
          </button>
        </div>
      </div>

      <div className="relative">
        <CopyButton text={code} id="presets-code" copiedId={copiedId} onCopy={onCopy} />
        <pre className="bg-gray-900 text-green-400 rounded-lg p-4 text-xs overflow-auto max-h-[500px] font-mono leading-relaxed">
          {code}
        </pre>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-900">
          <strong>💡 What this does:</strong> Exports an array of template objects. Each has an <code className="bg-blue-100 px-1 rounded">id</code>, <code className="bg-blue-100 px-1 rounded">name</code>, <code className="bg-blue-100 px-1 rounded">category</code>, and <code className="bg-blue-100 px-1 rounded">blocks</code> array. The admin UI will read this to show the template picker.
        </p>
      </div>
    </div>
  );
};

// ─── Step 2: API Endpoint ─────────────────────────────────────────────────
const ApiStep: React.FC<{ copiedId: string | null; onCopy: (text: string, id: string) => void }> = ({ copiedId, onCopy }) => {
  const code = `// ═══════════════════════════════════════════════════
// ADD THIS TO: workers/src/index.js
// Add these lines in the appropriate places
// ═══════════════════════════════════════════════════

// ── 1. Add this import at the TOP of index.js ──────
import { templatePresets, getPresetById } from "./template-presets.js";

// ── 2. Add this handler function (before the export default) ──

// Template presets API — the admin app calls this to get
// available templates for the "Insert Template" picker.
// GET /api/templates → returns all presets
// GET /api/templates?id=header_classic → returns one preset
async function handleTemplatesRequest(url) {
  const id = url.searchParams.get("id");

  if (id) {
    const preset = getPresetById(id);
    if (!preset) {
      return new Response(JSON.stringify({ error: "Template not found" }), {
        status: 404,
        headers: { "content-type": "application/json", ...CORS_HEADERS },
      });
    }
    return new Response(JSON.stringify(preset), {
      headers: { "content-type": "application/json", ...CORS_HEADERS },
    });
  }

  return new Response(JSON.stringify({ templates: templatePresets }), {
    headers: { "content-type": "application/json", ...CORS_HEADERS },
  });
}

// ── 3. Add this route inside the fetch() handler ──────
// (add it alongside the other /api/ routes)

if (url.pathname === "/api/templates") {
  if (request.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  return handleTemplatesRequest(url);
}

// ═══════════════════════════════════════════════════
// FULL ROUTER SECTION (for reference — add the templates
// route alongside your existing routes):
// ═══════════════════════════════════════════════════

/*
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ... existing routes ...

    if (url.pathname === "/api/leads" && request.method === "POST") {
      return handleLeadSubmission(request, env);
    }

    if (url.pathname === "/api/preview") {
      if (request.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
      if (request.method === "POST") return handlePreviewRequest(request, env);
    }

    // ── NEW: Template presets endpoint ──
    if (url.pathname === "/api/templates") {
      if (request.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
      return handleTemplatesRequest(url);
    }

    if (url.pathname === "/api/listings-search") {
      // ...
    }

    // ... rest of router ...
  },
};
*/`;

  return (
    <div className="space-y-4">
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
        <h4 className="font-semibold text-emerald-900 mb-1">📝 Edit file: <code className="bg-emerald-100 px-1.5 py-0.5 rounded text-xs">workers/src/index.js</code></h4>
        <p className="text-sm text-emerald-800">Add the import, handler function, and route to your existing index.js. Three small additions.</p>
      </div>

      {/* Prominent Copy Button */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg p-4 text-white">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h5 className="font-bold text-sm mb-1">📋 Copy the code to add to index.js</h5>
            <p className="text-xs text-indigo-100">Copy this code and add it to your existing workers/src/index.js file</p>
          </div>
          <button
            onClick={() => onCopy(code, 'api-code-main')}
            className="flex-shrink-0 px-6 py-3 bg-white text-indigo-700 rounded-lg font-bold text-sm hover:bg-indigo-50 transition-colors flex items-center gap-2 shadow-lg"
          >
            {copiedId === 'api-code-main' ? (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy All Code
              </>
            )}
          </button>
        </div>
      </div>

      <div className="relative">
        <CopyButton text={code} id="api-code" copiedId={copiedId} onCopy={onCopy} />
        <pre className="bg-gray-900 text-green-400 rounded-lg p-4 text-xs overflow-auto max-h-[500px] font-mono leading-relaxed">
          {code}
        </pre>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-900">
          <strong>🔌 API Endpoints created:</strong><br/>
          <code className="bg-blue-100 px-1 rounded">GET /api/templates</code> → All presets<br/>
          <code className="bg-blue-100 px-1 rounded">GET /api/templates?id=header_classic</code> → Single preset<br/>
          Both return CORS headers so the admin app can call them cross-origin.
        </p>
      </div>
    </div>
  );
};

// ─── Step 3: Admin UI ─────────────────────────────────────────────────────
const AdminUIStep: React.FC<{ copiedId: string | null; onCopy: (text: string, id: string) => void }> = ({ copiedId, onCopy }) => {
  const code = `// ═══════════════════════════════════════════════════
// ADD TO YOUR ADMIN APP (admin.rohit-910.workers.dev)
// This is the Template Picker component for the page builder
// ═══════════════════════════════════════════════════

// ── TemplatePicker.jsx ──
// Add this component to your admin app's page builder

import { useState, useEffect } from "react";

const CMS_URL = "https://cms.rohit-910.workers.dev";

export function TemplatePicker({ onInsert, onClose }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch(\`\${CMS_URL}/api/templates\`)
      .then(r => r.json())
      .then(data => {
        setTemplates(data.templates || []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load templates:", err);
        setLoading(false);
      });
  }, []);

  const categories = ["all", ...new Set(templates.map(t => t.category))];

  const filtered = templates.filter(t => {
    const matchCategory = activeCategory === "all" || t.category === activeCategory;
    const matchSearch = !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchSearch;
  });

  const handleInsert = (template) => {
    // template.blocks is an array of block objects
    // Insert them all at once into the page
    onInsert(template.blocks);
    onClose();
  };

  if (loading) return <div className="p-8 text-center">Loading templates...</div>;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-bold">Insert Template</h2>
            <p className="text-sm text-gray-500">Choose a pre-built section to add to your page</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">✕</button>
        </div>

        {/* Search + Category Filter */}
        <div className="p-4 border-b space-y-3">
          <input
            type="text"
            placeholder="Search templates..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm"
          />
          <div className="flex gap-2 flex-wrap">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={\`px-3 py-1 rounded-full text-xs font-medium \${
                  activeCategory === cat
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }\`}
              >
                {cat === "all" ? "All" : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Template Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(template => (
              <button
                key={template.id}
                onClick={() => handleInsert(template)}
                className="text-left p-4 border rounded-lg hover:border-indigo-400 hover:shadow-md transition-all group"
              >
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-xl">{template.icon}</span>
                  <div>
                    <h3 className="font-semibold text-sm group-hover:text-indigo-600">
                      {template.name}
                    </h3>
                    <span className="text-[10px] text-gray-400 uppercase">
                      {template.category}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-500">{template.description}</p>
                <div className="mt-2 text-[10px] text-indigo-500 font-medium">
                  {template.blocks.length} block{template.blocks.length > 1 ? "s" : ""} → Click to insert
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// HOW TO INTEGRATE INTO YOUR PAGE BUILDER:
// ═══════════════════════════════════════════════════

// In your page builder component, add:
//
// 1. A state for showing the template picker:
//    const [showTemplatePicker, setShowTemplatePicker] = useState(false);
//
// 2. A button to open it (add near your "Add Block" button):
//    <button onClick={() => setShowTemplatePicker(true)}>
//      📦 Insert Template
//    </button>
//
// 3. The handler that inserts blocks:
//    const handleInsertTemplate = (newBlocks) => {
//      setBlocks(prev => [...prev, ...newBlocks]);
//      // This updates the page's blocks array
//      // The preview iframe will re-render automatically
//    };
//
// 4. Render the picker conditionally:
//    {showTemplatePicker && (
//      <TemplatePicker
//        onInsert={handleInsertTemplate}
//        onClose={() => setShowTemplatePicker(false)}
//      />
//    )}
//
// 5. The preview will update via your existing /api/preview
//    endpoint — no changes needed there!`;

  return (
    <div className="space-y-4">
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
        <h4 className="font-semibold text-emerald-900 mb-1">📝 Add to your admin app: <code className="bg-emerald-100 px-1.5 py-0.5 rounded text-xs">TemplatePicker.jsx</code></h4>
        <p className="text-sm text-emerald-800">This React component fetches templates from your CMS and shows a picker modal in the page builder.</p>
      </div>

      {/* Prominent Copy Button */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg p-4 text-white">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h5 className="font-bold text-sm mb-1">📋 Copy the TemplatePicker component</h5>
            <p className="text-xs text-indigo-100">Copy this code and add it to your admin app (TemplatePicker.jsx)</p>
          </div>
          <button
            onClick={() => onCopy(code, 'admin-code-main')}
            className="flex-shrink-0 px-6 py-3 bg-white text-indigo-700 rounded-lg font-bold text-sm hover:bg-indigo-50 transition-colors flex items-center gap-2 shadow-lg"
          >
            {copiedId === 'admin-code-main' ? (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy All Code
              </>
            )}
          </button>
        </div>
      </div>

      <div className="relative">
        <CopyButton text={code} id="admin-code" copiedId={copiedId} onCopy={onCopy} />
        <pre className="bg-gray-900 text-green-400 rounded-lg p-4 text-xs overflow-auto max-h-[500px] font-mono leading-relaxed">
          {code}
        </pre>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
        <p className="text-sm text-amber-900">
          <strong>⚡ How it works:</strong> The TemplatePicker fetches from <code className="bg-amber-100 px-1 rounded">/api/templates</code>, shows a grid of templates, and when clicked, inserts the template's blocks array into the page. Your existing preview system handles the rest!
        </p>
      </div>
    </div>
  );
};

// ─── Step 4: Database Migration ───────────────────────────────────────────
const DatabaseStep: React.FC<{ copiedId: string | null; onCopy: (text: string, id: string) => void }> = ({ copiedId, onCopy }) => {
  const code = `-- ═══════════════════════════════════════════════════
-- OPTIONAL: Create a templates table in Supabase
-- This lets you manage templates dynamically from the admin
-- (instead of hardcoding them in template-presets.js)
-- ═══════════════════════════════════════════════════

-- File: supabase/migrations/0015_template_presets.sql

-- Create the template_presets table
CREATE TABLE IF NOT EXISTS template_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  preset_key text UNIQUE NOT NULL,     -- e.g. "header_classic"
  name text NOT NULL,                   -- e.g. "Classic Header"
  category text NOT NULL,               -- e.g. "headers"
  description text,
  icon text DEFAULT '📦',
  blocks jsonb NOT NULL DEFAULT '[]'::jsonb,  -- the actual block array
  sort_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for fast category lookups
CREATE INDEX idx_template_presets_category ON template_presets(category);
CREATE INDEX idx_template_presets_active ON template_presets(is_active);

-- ═══════════════════════════════════════════════════
-- Seed with the built-in presets:
-- ═══════════════════════════════════════════════════

INSERT INTO template_presets (preset_key, name, category, description, icon, blocks, sort_order) VALUES
-- HEADERS
('header_classic', 'Classic Header', 'headers', 'Logo left, nav centered, call button right', '🔝',
 '[{"block_type":"header_nav","props":{"header_style":"classic","header_fixed_desktop":true,"header_fixed_mobile":true,"mobile_menu_style":"overlay","nav_items":[{"label":"Home","href":"/"},{"label":"Listings","href":"/listings"},{"label":"Sell","href":"/sell"},{"label":"Contact","href":"/contact"}]}}]', 1),

('header_minimal', 'Minimal Header', 'headers', 'Compact header with left-aligned nav', '🔝',
 '[{"block_type":"header_nav","props":{"header_style":"minimal","header_fixed_desktop":true,"mobile_menu_style":"accordion","nav_items":[{"label":"Home","href":"/"},{"label":"Listings","href":"/listings"},{"label":"Contact","href":"/contact"}]}}]', 2),

('header_centered', 'Centered Header', 'headers', 'Logo and nav stacked and centered', '🔝',
 '[{"block_type":"header_nav","props":{"header_style":"centered","header_fixed_desktop":true,"mobile_menu_style":"overlay","nav_items":[{"label":"Home","href":"/"},{"label":"Listings","href":"/listings"},{"label":"Buy","href":"/buy"},{"label":"Sell","href":"/sell"},{"label":"Contact","href":"/contact"}]}}]', 3),

-- HEROES
('hero_home_search', 'Home Search Hero', 'heroes', 'Hero with property search CTA', '🏠',
 '[{"block_type":"hero","props":{"heading":"Find Your Perfect Property","subheading":"Search listings across the GTA","image":"https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1920&q=80","cta_label":"Browse Listings","cta_href":"/listings"}}]', 10),

('hero_seller', 'Seller Hero', 'heroes', 'Hero targeting home sellers', '🏠',
 '[{"block_type":"hero","props":{"heading":"What''s Your Home Worth?","subheading":"Get a free home valuation","image":"https://images.unsplash.com/photo-1582407947092-47d0e83b9091?w=1920&q=80","cta_label":"Get Free Valuation","cta_href":"/sell"}}]', 11),

-- FEATURES
('stats_trust', 'Trust Stats', 'features', 'Statistics row showing credibility', '📊',
 '[{"block_type":"stats_row","props":{"stats":[{"value":"500+","label":"Homes Sold"},{"value":"15+","label":"Years Experience"},{"value":"98%","label":"Satisfaction"},{"value":"$2B+","label":"In Sales"}]}}]', 20),

('faq_section', 'FAQ Section', 'features', 'Common questions accordion', '❓',
 '[{"block_type":"faq_accordion","props":{"items":[{"question":"How do I get started?","answer_html":"<p>Start by getting pre-approved for a mortgage.</p>"},{"question":"What areas do you serve?","answer_html":"<p>We serve the Greater Toronto Area.</p>"},{"question":"How much does it cost?","answer_html":"<p>Our services are typically covered by the seller''s commission.</p>"}]}}]', 21),

-- LISTINGS
('featured_sale', 'Featured Sale Listings', 'listings', '3 featured properties for sale', '🏘️',
 '[{"block_type":"rich_text","props":{"heading":"Featured Listings"}},{"block_type":"featured_listings","props":{"count":3,"filter":"for_sale"}}]', 30),

('office_listings', 'Our Office Listings', 'listings', 'Listings from our office', '🏘️',
 '[{"block_type":"rich_text","props":{"heading":"Our Exclusive Listings"}},{"block_type":"featured_listings","props":{"count":6,"filter":"office_only","officeKey":"291890"}}]', 31),

-- TOOLS
('calculators_section', 'Mortgage Calculators', 'tools', 'All 14 calculators', '🧮',
 '[{"block_type":"rich_text","props":{"heading":"Free Mortgage Calculators"}},{"block_type":"calculators_hub","props":{}}]', 40),

-- FORMS
('contact_section', 'Contact Form', 'forms', 'Simple contact form', '📧',
 '[{"block_type":"contact_form","props":{"heading":"Get in Touch"}}]', 50),

('valuation_section', 'Home Valuation Form', 'forms', 'Free valuation request', '📧',
 '[{"block_type":"valuation_form","props":{"heading":"Get Your Free Home Valuation"}}]', 51),

-- CTA
('cta_contact', 'Contact CTA', 'cta', 'Call to action with phone', '📢',
 '[{"block_type":"cta_banner","props":{"heading":"Ready to Make Your Move?","cta_label":"Contact Us Today","cta_href":"/contact","phone":"416-605-7488"}}]', 60),

('cta_valuation', 'Valuation CTA', 'cta', 'CTA driving to valuation', '📢',
 '[{"block_type":"cta_banner","props":{"heading":"Find Out What Your Home is Worth","cta_label":"Get Free Valuation","cta_href":"/sell"}}]', 61),

-- FULL PAGE LAYOUTS
('page_home', 'Complete Home Page', 'layouts', 'Full homepage layout', '📄',
 '[{"block_type":"hero","props":{"heading":"Find Your Perfect Property","subheading":"Search listings across the GTA","image":"https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1920&q=80","cta_label":"Browse Listings","cta_href":"/listings"}},{"block_type":"stats_row","props":{"stats":[{"value":"500+","label":"Homes Sold"},{"value":"15+","label":"Years"},{"value":"98%","label":"Satisfaction"}]}},{"block_type":"featured_listings","props":{"count":3,"filter":"for_sale"}},{"block_type":"cta_banner","props":{"heading":"Ready to Make a Move?","cta_label":"Contact Us","cta_href":"/contact","phone":"416-605-7488"}},{"block_type":"contact_form","props":{"heading":"Get in Touch"}}]', 100),

('page_sell', 'Sell Page Layout', 'layouts', 'Seller-focused page', '📄',
 '[{"block_type":"hero","props":{"heading":"What''s Your Home Worth?","subheading":"Get a free home valuation","image":"https://images.unsplash.com/photo-1582407947092-47d0e83b9091?w=1920&q=80","cta_label":"Get Valuation","cta_href":"#valuation"}},{"block_type":"valuation_form","props":{"heading":"Free Home Valuation"}},{"block_type":"stats_row","props":{"stats":[{"value":"$2B+","label":"In Sales"},{"value":"30 Days","label":"Avg. Sale Time"}]}},{"block_type":"cta_banner","props":{"heading":"Ready to Sell?","cta_label":"Schedule Consultation","cta_href":"/contact"}}]', 101),

('page_listings', 'Listings Page Layout', 'layouts', 'Property listings page', '📄',
 '[{"block_type":"hero","props":{"heading":"Property Listings","subheading":"Browse available properties"}},{"block_type":"listing_grid","props":{"pageSize":12}},{"block_type":"cta_banner","props":{"heading":"Can''t Find What You Need?","cta_label":"Contact Us","cta_href":"/contact"}}]', 102);

-- ═══════════════════════════════════════════════════
-- Then update your /api/templates endpoint to read
-- from this table instead of the hardcoded file:
-- ═══════════════════════════════════════════════════

/*
async function handleTemplatesRequest(url, env) {
  const id = url.searchParams.get("id");

  if (id) {
    const res = await supabaseFetch(env,
      \`template_presets?preset_key=eq.\${id}&select=*\`
    );
    const rows = await res.json();
    return new Response(JSON.stringify(rows[0] || null), {
      headers: { "content-type": "application/json", ...CORS_HEADERS },
    });
  }

  const res = await supabaseFetch(env,
    "template_presets?is_active=eq.true&order=sort_order.asc&select=*"
  );
  const templates = await res.json();
  return new Response(JSON.stringify({ templates }), {
    headers: { "content-type": "application/json", ...CORS_HEADERS },
  });
}
*/`;

  return (
    <div className="space-y-4">
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
        <h4 className="font-semibold text-emerald-900 mb-1">📁 Optional: Create <code className="bg-emerald-100 px-1.5 py-0.5 rounded text-xs">supabase/migrations/0015_template_presets.sql</code></h4>
        <p className="text-sm text-emerald-800">Run this in Supabase SQL Editor to create a templates table. This lets you manage templates dynamically from the admin app.</p>
      </div>

      {/* Prominent Copy Button */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg p-4 text-white">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h5 className="font-bold text-sm mb-1">📋 Copy the SQL migration</h5>
            <p className="text-xs text-indigo-100">Copy this SQL and run it in Supabase SQL Editor (optional step)</p>
          </div>
          <button
            onClick={() => onCopy(code, 'db-code-main')}
            className="flex-shrink-0 px-6 py-3 bg-white text-indigo-700 rounded-lg font-bold text-sm hover:bg-indigo-50 transition-colors flex items-center gap-2 shadow-lg"
          >
            {copiedId === 'db-code-main' ? (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy SQL
              </>
            )}
          </button>
        </div>
      </div>

      <div className="relative">
        <CopyButton text={code} id="db-code" copiedId={copiedId} onCopy={onCopy} />
        <pre className="bg-gray-900 text-green-400 rounded-lg p-4 text-xs overflow-auto max-h-[500px] font-mono leading-relaxed">
          {code}
        </pre>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
        <p className="text-sm text-amber-900">
          <strong>📌 Note:</strong> This step is optional. You can start with the hardcoded <code className="bg-amber-100 px-1 rounded">template-presets.js</code> file (Steps 1-3) and add the database table later when you want admin-editable templates.
        </p>
      </div>
    </div>
  );
};

// ─── Step 5: Deploy ───────────────────────────────────────────────────────
const DeployStep: React.FC<{ copiedId: string | null; onCopy: (text: string, id: string) => void }> = ({ copiedId, onCopy }) => {
  const code = `# ═══════════════════════════════════════════════════
# DEPLOY YOUR CHANGES
# ═══════════════════════════════════════════════════

# Option A: Push to GitHub (if you have auto-deploy)
git add workers/src/template-presets.js
git add workers/src/index.js
git commit -m "Add template presets system for page builder"
git push origin main
# → Cloudflare auto-deploys the worker

# Option B: Manual deploy from local
cd workers
npx wrangler deploy

# ═══════════════════════════════════════════════════
# VERIFY IT WORKS
# ═══════════════════════════════════════════════════

# Test the API endpoint:
curl https://cms.rohit-910.workers.dev/api/templates

# Should return JSON with all your template presets.
# Test a single preset:
curl https://cms.rohit-910.workers.dev/api/templates?id=header_classic

# ═══════════════════════════════════════════════════
# TEST IN THE ADMIN APP
# ═══════════════════════════════════════════════════

# 1. Open your admin app (admin.rohit-910.workers.dev)
# 2. Go to the Pages editor
# 3. Click "Insert Template" button
# 4. Pick a template → blocks get added to the page
# 5. Preview updates automatically via /api/preview
# 6. Save the page → it's live!

# ═══════════════════════════════════════════════════
# ADDING NEW TEMPLATES LATER
# ═══════════════════════════════════════════════════

# To add a new template preset, just add it to the
# templatePresets array in template-presets.js:

# {
#   id: "my_new_template",
#   name: "My New Template",
#   category: "features",
#   description: "Does something cool",
#   icon: "✨",
#   blocks: [
#     { block_type: "rich_text", props: { heading: "Hello", body_html: "<p>World</p>" } }
#   ]
# }

# Then push to GitHub → auto-deploys → available immediately!

# ═══════════════════════════════════════════════════
# TROUBLESHOOTING
# ═══════════════════════════════════════════════════

# If templates don't show in admin:
# 1. Check /api/templates returns data (curl above)
# 2. Check CORS_HEADERS includes your admin origin
# 3. Check browser console for errors
# 4. Verify template-presets.js is imported correctly

# If blocks don't render after insert:
# 1. Check block_type matches a renderer in blocks.js
# 2. Check props match what the renderer expects
# 3. Use /api/preview to test before saving`;

  return (
    <div className="space-y-4">
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
        <h4 className="font-semibold text-emerald-900 mb-1">🚀 Deploy & Verify</h4>
        <p className="text-sm text-emerald-800">Push your changes and verify everything works end-to-end.</p>
      </div>

      <div className="relative">
        <CopyButton text={code} id="deploy-code" copiedId={copiedId} onCopy={onCopy} />
        <pre className="bg-gray-900 text-green-400 rounded-lg p-4 text-xs overflow-auto max-h-[500px] font-mono leading-relaxed">
          {code}
        </pre>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="font-semibold text-green-900 mb-2">✅ Checklist</h4>
        <ul className="space-y-2 text-sm text-green-800">
          <li className="flex items-start gap-2">
            <span className="text-green-600 mt-0.5">☐</span>
            <span>Created <code className="bg-green-100 px-1 rounded">workers/src/template-presets.js</code></span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 mt-0.5">☐</span>
            <span>Added import + handler + route to <code className="bg-green-100 px-1 rounded">workers/src/index.js</code></span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 mt-0.5">☐</span>
            <span>Added TemplatePicker component to admin app</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 mt-0.5">☐</span>
            <span>Pushed to GitHub → Worker auto-deployed</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 mt-0.5">☐</span>
            <span><code className="bg-green-100 px-1 rounded">curl /api/templates</code> returns presets</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 mt-0.5">☐</span>
            <span>Admin app shows template picker and inserts blocks</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 mt-0.5">☐</span>
            <span>Preview renders correctly after template insert</span>
          </li>
        </ul>
      </div>
    </div>
  );
};
