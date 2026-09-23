// Describes the editable fields of each block. The builder's inspector is generated from this.
export type Field =
  | { key: string; label: string; type: "text" | "textarea" | "svg" | "link" | "boolean" | "strings" }
  | { key: string; label: string; type: "select"; options: string[] }
  | { key: string; label: string; type: "group"; fields: Field[] }
  | { key: string; label: string; type: "list"; itemLabel: string; fields: Field[] };

const t = (key: string, label: string): Field => ({ key, label, type: "text" });
const ta = (key: string, label: string): Field => ({ key, label, type: "textarea" });

export const BLOCK_FIELDS: Record<string, Field[]> = {
  hero: [
    t("eyebrow", "Eyebrow"), t("heading", "Heading"), t("heading_accent", "Heading (accent part)"),
    ta("subheading", "Subheading"),
    { key: "layout", label: "Layout", type: "select", options: ["split", "centered", "form"] },
    { key: "svg_id", label: "Illustration", type: "svg" },
    { key: "primary_cta", label: "Primary button", type: "link" },
    { key: "secondary_cta", label: "Secondary button", type: "link" },
    { key: "badge", label: "Floating badge", type: "group", fields: [t("label", "Label"), t("value", "Value")] },
  ],
  logos: [t("heading", "Heading"), { key: "items", label: "Client names", type: "strings" }],
  services: [
    t("heading", "Heading"), { key: "link", label: "Heading link", type: "link" },
    { key: "items", label: "Services", type: "list", itemLabel: "Service", fields: [
      t("title", "Title"), ta("text", "Text"), { key: "svg_id", label: "Illustration", type: "svg" }, t("href", "Links to"),
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
};
