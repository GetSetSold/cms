// Describes the editable fields of each block. The builder's inspector is generated from this.
export type Field =
  | { key: string; label: string; type: "text" | "textarea" | "svg" | "link" | "boolean" | "strings" | "form" | "color" | "code" }
  | { key: string; label: string; type: "select"; options: string[] }
  | { key: string; label: string; type: "group"; fields: Field[] }
  | { key: string; label: string; type: "list"; itemLabel: string; fields: Field[] };

const t = (key: string, label: string): Field => ({ key, label, type: "text" });
const ta = (key: string, label: string): Field => ({ key, label, type: "textarea" });

export const BLOCK_FIELDS: Record<string, Field[]> = {
  hero: [
    t("eyebrow", "Eyebrow"), t("heading", "Heading"), t("heading_accent", "Heading (accent part)"),
    { key: "heading_accent_color", label: "Accent part color override", type: "color" },
    ta("subheading", "Subheading"),
    { key: "subheading_style", label: "Subheading style", type: "select", options: ["paragraph", "checklist"] },
    { key: "subheading_items", label: "Checklist items (subheading style = checklist)", type: "list", itemLabel: "Item", fields: [t("text", "Text")] },
    { key: "proof_points", label: "Proof points (shown under the buttons, 3 max)", type: "list", itemLabel: "Proof point", fields: [t("value", "Value"), t("label", "Label")] },
    { key: "layout", label: "Layout", type: "select", options: ["split", "centered", "form", "search"] },
    { key: "tone", label: "Text tone (match to background)", type: "select", options: ["light", "dark"] },
    { key: "svg_id", label: "Illustration (split layout)", type: "svg" },
    { key: "image_side", label: "Illustration side (split layout)", type: "select", options: ["right", "left"] },
    t("image_size", "Illustration size, % of its column (split layout) — e.g. 100 = fills it, 60 = smaller, max 150"),
    { key: "image_bg", label: "Illustration backdrop", type: "select", options: ["none", "mist"] },
    { key: "image_bg_color", label: "Illustration backdrop custom color (overrides preset)", type: "color" },
    t("image_bg_size", "Backdrop size, % of its column — e.g. 100 = fills it (independent of illustration size)"),
    { key: "centered_icon_svg_id", label: "Icon above eyebrow (shows in every layout)", type: "svg" },
    t("centered_icon_radius", "Icon circle radius, 50–100px (used by Centered, Form and Search; Split has its own size below)"),
    t("split_icon_radius", "Icon circle radius for Split layout only (optional — defaults to the size above if left blank)"),
    { key: "centered_icon_bg", label: "Icon circle background (default white)", type: "color" },
    { key: "primary_cta", label: "Primary button", type: "link" },
    { key: "secondary_cta", label: "Secondary button", type: "link" },
    { key: "badge", label: "Badge (ribbon)", type: "group", fields: [t("label", "Label"), t("value", "Value")] },
    { key: "badge_style", label: "Badge style", type: "select", options: ["solid", "bordered", "glass", "dark"] },
    { key: "badge_bg", label: "Badge background color (optional — overrides style)", type: "color" },
    { key: "badge_position", label: "Badge position (blank = opposite the image)", type: "select", options: ["", "left", "center", "right"] },
    { key: "badge_icon_svg_id", label: "Badge icon (optional)", type: "svg" },
    { key: "badge_href", label: "Badge links to (optional — adds an arrow)", type: "text" },
  ],
  logos: [t("heading", "Heading"), { key: "items", label: "Client names", type: "strings" }],
  services: [
    t("heading", "Heading"), { key: "link", label: "Heading link", type: "link" },
    { key: "card_style", label: "Card style — classic: current look · solid: filled card · panel: colored top · tile: white card with icon tile", type: "select", options: ["classic", "solid", "panel", "tile"] },
    { key: "icon_align", label: "Icon position (solid / panel / tile styles)", type: "select", options: ["left", "center", "right"] },
    { key: "card_color", label: "Card color (solid / panel / tile — default: your brand color)", type: "color" },
    { key: "items", label: "Services", type: "list", itemLabel: "Service", fields: [
      t("title", "Title"), ta("text", "Text"), { key: "svg_id", label: "Icon / illustration", type: "svg" }, t("href", "Links to"), t("link_label", "Button label (default: Learn more)"),
    ] },
  ],
  features: [
    t("heading", "Heading"), ta("intro", "Intro"),
    { key: "items", label: "Items", type: "list", itemLabel: "Item", fields: [
      { key: "svg_id", label: "Icon", type: "svg" },
      { key: "icon_color", label: "Icon color override", type: "color" },
      t("title", "Title"), ta("text", "Text"), t("href", "Links to (optional)"), t("link_label", "Button label (default: Learn more)"),
    ] },
  ],
  stats: [{ key: "items", label: "Stats", type: "list", itemLabel: "Stat", fields: [t("value", "Value"), t("label", "Label")] }],
  testimonials: [
    t("heading", "Heading"),
    { key: "items", label: "Testimonials", type: "list", itemLabel: "Testimonial", fields: [ta("quote", "Quote"), t("name", "Name"), t("role", "Role, company")] },
  ],
  whats_included: [
    t("eyebrow", "Eyebrow (e.g. \"EVERYTHING YOU NEED TO SELL YOUR HOME\")"), t("heading", "Heading"), ta("subline", "Subline"),
    { key: "mobile_columns", label: "Cards per row on mobile", type: "select", options: ["2", "1"] },
    { key: "items", label: "What's included", type: "list", itemLabel: "Item", fields: [
      { key: "svg_id", label: "Icon", type: "svg" }, t("title", "Title"), ta("text", "Text"),
    ] },
  ],
  phased_reasons: [
    t("eyebrow", "Eyebrow (e.g. \"20 REASONS TO CHOOSE US\")"), t("heading", "Heading"), ta("subline", "Subline"),
    { key: "mobile_columns", label: "Reason cards per row on mobile", type: "select", options: ["1", "2"] },
    { key: "phases", label: "Phases", type: "list", itemLabel: "Phase", fields: [
      t("label", "Phase label (e.g. \"PHASE 1 · 4 REASONS\")"), t("title", "Phase title"), ta("description", "Phase description"),
      { key: "reasons", label: "Reasons in this phase", type: "list", itemLabel: "Reason", fields: [t("title", "Title"), ta("text", "Text")] },
    ] },
  ],
  faq: [
    t("heading", "Heading"),
    { key: "style", label: "Style — classic: current look · lines: plain rows · numbered: 01, 02 with a round button · cards: boxed cards", type: "select", options: ["classic", "lines", "numbered", "cards"] },
    { key: "columns", label: "Columns on desktop (phones always show 1; classic ignores this)", type: "select", options: ["1", "2", "3"] },
    { key: "items", label: "Questions", type: "list", itemLabel: "Question", fields: [t("q", "Question"), ta("a", "Answer")] },
  ],
  cta: [t("heading", "Heading"), ta("text", "Text"), { key: "button", label: "Button", type: "link" }],
  lead_form: [
    t("heading", "Heading"), ta("text", "Text"), t("form_key", "Form name (used for follow-up rules)"),
    t("submit_label", "Button label"), t("success_message", "Thank-you message"),
    { key: "show_email", label: "Ask for email", type: "boolean" },
    { key: "show_message", label: "Ask for a message", type: "boolean" },
    { key: "show_sms_opt_in", label: "Show SMS consent checkbox", type: "boolean" },
  ],
  rich_text: [t("heading", "Heading"), ta("body", "Text (blank line = new paragraph)")],
  text_svg: [
    t("heading", "Heading"), ta("body", "Text (blank line = new paragraph)"),
    { key: "svg_id", label: "Illustration", type: "svg" },
    { key: "side", label: "Illustration side", type: "select", options: ["right", "left"] },
  ],
  pricing: [
    t("heading", "Heading"),
    { key: "plans", label: "Plans", type: "list", itemLabel: "Plan", fields: [
      t("name", "Name"), t("price", "Price"), t("period", "Period (e.g. /month)"),
      ta("features", "Features (one per line)"), t("cta_label", "Button label"), t("cta_href", "Button link"),
      { key: "highlight", label: "Highlight this plan", type: "boolean" },
    ] },
  ],
  contact_info: [t("heading", "Heading")],
  timeline: [
    t("heading", "Heading"),
    { key: "items", label: "Milestones", type: "list", itemLabel: "Milestone", fields: [t("year", "Year"), t("title", "Title")] },
  ],
  team_profile: [
    t("eyebrow", "Eyebrow"), t("name", "Name"), t("role", "Role / brokerage"), ta("bio", "Bio"),
    t("credential_1", "Credential line 1 (e.g. LICENSED, BY REAL ESTATE COUNCIL OF ONTARIO)"),
    t("credential_2", "Credential line 2 (e.g. MEMBER, TORONTO REAL ESTATE BOARD)"),
    { key: "svg_id", label: "Photo (illustration)", type: "svg" },
    { key: "photo_radius", label: "Photo corner radius", type: "select", options: ["none", "sm", "md", "lg", "full"] },
    { key: "photo_align", label: "Photo alignment", type: "select", options: ["left", "center", "right"] },
    { key: "primary_cta", label: "Primary button", type: "link" },
    { key: "secondary_cta", label: "Secondary button", type: "link" },
  ],
  service_areas: [
    t("heading", "Heading"),
    { key: "items", label: "Areas", type: "list", itemLabel: "Area", fields: [t("label", "City name"), t("href", "Links to (blank = auto)")] },
  ],
  listing_grid: [
    t("heading", "Heading"),
    t("city", "City (blank = most recent across all cities)"),
    { key: "per_row", label: "Columns", type: "select", options: ["2", "3", "4"] },
    t("per_page", "Number of listings to show"),
    t("link_label", "\"View all\" link label"),
  ],
  custom_form: [
    { key: "form_slug", label: "Form", type: "form" },
    t("heading", "Heading"),
    ta("text", "Intro text"),
  ],
  icon_card: [
    { key: "svg_id", label: "Icon", type: "svg" },
    { key: "icon_color", label: "Icon color override", type: "color" },
    t("heading", "Title"),
    ta("text", "Content"),
    { key: "link", label: "Button (optional)", type: "link" },
    { key: "box", label: "Show background box", type: "boolean" },
    { key: "box_bg", label: "Box background color (default: theme soft)", type: "color" },
  ],
  process_steps: [
    t("eyebrow", "Eyebrow (e.g. \"OUR HOME SELLING PROCESS\")"), t("heading", "Heading"), ta("subline", "Subline (shown below a divider line, when filled in)"),
    { key: "mobile_columns", label: "Columns on mobile", type: "select", options: ["1", "2"] },
    { key: "items", label: "Steps (desktop columns automatically match how many you add, up to 6)", type: "list", itemLabel: "Step", fields: [t("title", "Title"), ta("text", "Description")] },
  ],
  checklist: [
    t("heading", "Heading (optional)"),
    { key: "mobile_columns", label: "Columns on mobile", type: "select", options: ["1", "2"] },
    { key: "desktop_columns", label: "Columns on desktop", type: "select", options: ["1", "2", "3"] },
    { key: "items", label: "Items", type: "list", itemLabel: "Item", fields: [t("text", "Text")] },
  ],
  spacer: [
    t("height", "Space (px) — positive adds space, negative reduces it (e.g. -50)"),
  ],
  divider: [
    { key: "color", label: "Line color", type: "color" },
    t("thickness", "Thickness (px)"),
    { key: "width", label: "Width", type: "select", options: ["100%", "75%", "50%", "25%"] },
    t("spacing", "Space above/below (px)"),
  ],
  section_header: [
    t("eyebrow", "Eyebrow (colored, above the heading)"),
    t("heading", "Heading"),
    t("subline", "Subline (bold, below the divider)"),
    { key: "align", label: "Alignment", type: "select", options: ["left", "center"] },
  ],
  feature_section: [
    { key: "layout", label: "Layout — simple: one card · lines: dividers with row links · cross: filled grid · bands: dark left, light right", type: "select", options: ["simple", "lines", "cross", "bands"] },
    { key: "color", label: "Section color (one color for the whole section — Reset keeps the layout's own look)", type: "color" },
    t("eyebrow", "Eyebrow (small colored line above the headline)"),
    t("heading", "Headline"),
    ta("text", "Text under the headline"),
    ta("footnote", "Small note (shown under a divider line)"),
    { key: "link", label: "Main link (e.g. Explore the seller plan)", type: "link" },
    { key: "items", label: "Feature rows", type: "list", itemLabel: "Row", fields: [
      { key: "svg_id", label: "Icon", type: "svg" },
      { key: "icon_color", label: "Icon color override", type: "color" },
      t("title", "Title"), ta("text", "Description"), t("href", "Link (optional)"), t("link_label", "Link label (default: Learn more)"),
    ] },
  ],
  featured_listing: [
    t("heading", "Heading"),
    t("listing_key", "MLS listing key"),
  ],
  blog_grid: [
    t("heading", "Heading"),
    { key: "layout", label: "Layout", type: "select", options: ["grid", "swipe"] },
    t("count", "Number of posts"),
    t("category_slug", "Category (blank = all)"),
    t("link_label", "\"View all\" link label"),
  ],
  qa_block: [
    t("heading", "Heading (optional)"),
    { key: "items", label: "Questions", type: "list", itemLabel: "Q&A", fields: [
      t("q", "Question — phrase it the way someone would actually ask it"),
      ta("a", "Direct answer — lead with the answer itself, keep it short"),
    ] },
  ],
  faq_boxed: [
    t("heading", "Heading (e.g. Frequently Asked Questions)"),
    { key: "items", label: "Questions", type: "list", itemLabel: "Q&A", fields: [t("q", "Question"), ta("a", "Answer")] },
  ],
  custom_code: [
    t("heading", "Heading (optional)"),
    { key: "html", label: "Embed code (paste from Elfsight, a review widget, etc.)", type: "code" },
  ],
  social_links: [
    t("heading", "Heading (optional, e.g. Join Us Socially)"),
    { key: "size", label: "Icon size (blank = use Settings default)", type: "select", options: ["xs", "sm", "md", "lg"] },
    { key: "items", label: "Profiles (leave empty to use the list set in Settings)", type: "list", itemLabel: "Profile", fields: [
      { key: "svg_id", label: "Icon", type: "svg" },
      t("href", "Profile link"),
      t("label", "Label (for accessibility, e.g. Facebook)"),
    ] },
  ],
  featured_listings_grid: [
    t("heading", "Heading"),
    t("count", "Number of listings to show"),
    t("link_label", "\"View all\" link label"),
  ],
  sold_history_grid: [
    t("heading", "Heading"),
    t("count", "Number of records to show"),
    { key: "status_filter", label: "Only show (leave blank for all)", type: "select", options: ["", "sold", "leased", "purchased"] },
    t("link_label", "\"View all\" link label"),
  ],
  precon_projects_grid: [
    t("heading", "Heading"),
    { key: "show_filters", label: "Show filters", type: "boolean" },
    { key: "show_stats", label: "Show stats bar", type: "boolean" },
    { key: "show_map", label: "Show map", type: "boolean" },
  ],
};
