// Describes the editable fields of each block. The builder's inspector is generated from this.
export type Field =
  | { key: string; label: string; type: "text" | "textarea" | "svg" | "link" | "boolean" | "strings" | "form" }
  | { key: string; label: string; type: "select"; options: string[] }
  | { key: string; label: string; type: "group"; fields: Field[] }
  | { key: string; label: string; type: "list"; itemLabel: string; fields: Field[] };

const t = (key: string, label: string): Field => ({ key, label, type: "text" });
const ta = (key: string, label: string): Field => ({ key, label, type: "textarea" });

export const BLOCK_FIELDS: Record<string, Field[]> = {
  hero: [
    t("eyebrow", "Eyebrow"), t("heading", "Heading"), t("heading_accent", "Heading (accent part)"),
    ta("subheading", "Subheading"),
    { key: "layout", label: "Layout", type: "select", options: ["split", "centered", "form", "search"] },
    { key: "tone", label: "Text tone (match to background)", type: "select", options: ["light", "dark"] },
    { key: "svg_id", label: "Illustration (split layout)", type: "svg" },
    { key: "image_side", label: "Illustration side (split layout)", type: "select", options: ["right", "left"] },
    { key: "centered_icon_svg_id", label: "Icon above eyebrow (centered layout)", type: "svg" },
    t("centered_icon_radius", "Icon circle radius, 50–100px (centered layout)"),
    { key: "primary_cta", label: "Primary button", type: "link" },
    { key: "secondary_cta", label: "Secondary button", type: "link" },
    { key: "badge", label: "Floating badge", type: "group", fields: [t("label", "Label"), t("value", "Value")] },
  ],
  logos: [t("heading", "Heading"), { key: "items", label: "Client names", type: "strings" }],
  services: [
    t("heading", "Heading"), { key: "link", label: "Heading link", type: "link" },
    { key: "items", label: "Services", type: "list", itemLabel: "Service", fields: [
      t("title", "Title"), ta("text", "Text"), { key: "svg_id", label: "Illustration", type: "svg" }, t("href", "Links to"), t("link_label", "Button label (default: Learn more)"),
    ] },
  ],
  features: [
    t("heading", "Heading"), ta("intro", "Intro"),
    { key: "items", label: "Items", type: "list", itemLabel: "Item", fields: [t("title", "Title"), ta("text", "Text")] },
  ],
  stats: [{ key: "items", label: "Stats", type: "list", itemLabel: "Stat", fields: [t("value", "Value"), t("label", "Label")] }],
  testimonials: [
    t("heading", "Heading"),
    { key: "items", label: "Testimonials", type: "list", itemLabel: "Testimonial", fields: [ta("quote", "Quote"), t("name", "Name"), t("role", "Role, company")] },
  ],
  faq: [t("heading", "Heading"), { key: "items", label: "Questions", type: "list", itemLabel: "Question", fields: [t("q", "Question"), ta("a", "Answer")] }],
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
    { key: "svg_id", label: "Photo (illustration)", type: "svg" },
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
    t("heading", "Title"),
    ta("text", "Content"),
    { key: "link", label: "Link (optional)", type: "link" },
  ],
  process_steps: [
    t("heading", "Heading"),
    { key: "mobile_columns", label: "Columns on mobile", type: "select", options: ["1", "2"] },
    { key: "items", label: "Steps", type: "list", itemLabel: "Step", fields: [t("title", "Title"), ta("text", "Description")] },
  ],
  checklist: [
    t("heading", "Heading (optional)"),
    { key: "mobile_columns", label: "Columns on mobile", type: "select", options: ["1", "2"] },
    { key: "items", label: "Items", type: "list", itemLabel: "Item", fields: [t("text", "Text")] },
  ],
  spacer: [
    t("height", "Height (px)"),
  ],
};
