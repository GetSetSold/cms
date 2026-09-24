export type Role = "admin" | "editor" | "sales";
export type PageStatus = "draft" | "scheduled" | "published" | "archived";
export type LeadStatus = "new" | "contacted" | "qualified" | "proposal" | "won" | "lost";

export type Json = Record<string, any>;

export interface SectionSettings {
  background?: "default" | "muted" | "dark" | "brand";
  hide_on_mobile?: boolean;
  hide_on_desktop?: boolean;
  /** Groups this block with other consecutive blocks sharing the same row_id
   *  into one CSS-grid row on desktop (mobile always stacks to 1 column).
   *  row_columns only needs to be set on any one block in the group. */
  row_id?: string;
  row_columns?: 1 | 2 | 3 | 4;
  anchor?: string;
}

export interface Section {
  id: string;
  page_id: string;
  block_type: string;
  position: number;
  data: Json;
  settings: SectionSettings;
  is_visible: boolean;
}

export interface Page {
  id: string;
  title: string;
  slug: string;
  page_type: string;
  status: PageStatus;
  publish_at: string | null;
  seo_title: string | null;
  seo_description: string | null;
  canonical_url: string | null;
  noindex: boolean;
  hide_nav: boolean;
  hide_footer: boolean;
  updated_at: string;
}

export type NavLink = { label: string; href: string };
export type NavColumn = { heading?: string; links: NavLink[] };
/** A plain link, or — if `columns` is set — a mega-menu dropdown with one or more link groups. */
export type NavItem = { label: string; href: string; columns?: NavColumn[] };

export type MobileCtaIcon = "phone" | "message" | "star" | "home" | "mail" | "calendar";
export type MobileCtaButton = { type: "call" | "sms" | "link"; label: string; icon: MobileCtaIcon; href?: string };
export interface SiteSettings {
  site_name: string;
  logo_svg_id: string | null;
  theme: { primary: string; accent: string; ink: string; ground: string; font?: string; font_heading?: string; font_body?: string };
  seo_defaults: { title_suffix: string; description: string; site_url?: string };
  navigation: NavItem[];
  header_cta: { label: string; href: string };
  header: {
    bg?: string; text?: string;
    show_logo_mobile?: boolean; show_logo_desktop?: boolean;
    show_name_mobile?: boolean; show_name_desktop?: boolean;
    logo_size?: number;      // px, applies to both breakpoints
    name_size_mobile?: number;  // px
    name_size_desktop?: number; // px
  };
  footer: { tagline?: string; columns: NavColumn[]; bg?: string; text?: string; columns_per_row?: 3 | 4 };
  mobile_cta: { buttons: MobileCtaButton[]; shape: "square" | "rectangle"; size?: "sm" | "md" | "lg" };
  contact: { phone?: string; email?: string; address?: string; hours?: string };
  social_links: Record<string, string>;
  scripts: { ga4_id?: string };
  lead_settings: { notify_emails: string[] };
}

export interface SvgAsset {
  id: string;
  name: string;
  markup: string;
  tags: string[];
}

export interface Lead {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  message: string | null;
  service: string | null;
  form_key: string | null;
  source_path: string | null;
  utm: Json;
  status: LeadStatus;
  sms_opt_in: boolean;
  sms_opted_out: boolean;
  created_at: string;
}

export const LEAD_STATUSES: LeadStatus[] = ["new", "contacted", "qualified", "proposal", "won", "lost"];

export type FormFieldType =
  | "text" | "email" | "tel" | "url" | "textarea" | "number" | "decimal" | "currency" | "date"
  | "dropdown" | "radio" | "checkbox" | "multiple_choice" | "address" | "subform";

export type FormField = {
  key: string; label: string; type: FormFieldType;
  required?: boolean;
  options?: string[]; // dropdown / radio / multiple_choice
  span?: 1 | 2;        // force full width in a 2-column section
  // subform only: a repeatable group of its own fields
  subfields?: FormField[];
  repeat_label?: string; // e.g. "Add another applicant"
  max?: number;           // max repeats, default unlimited
};

export type FormSection = {
  id: string;
  heading?: string;
  columns: 1 | 2; // desktop only — mobile is always single column
  background?: string; // hex color, e.g. "#F4F2FC" — blank/undefined = no background
  fields: FormField[];
};

export interface CmsForm {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sections: FormSection[];
  embed_html: string | null;
  submit_label: string;
  success_message: string;
  form_key: string;
  is_active: boolean;
  paginate: boolean; // one section per step, with Next/Back — for longer forms
}

/** A one-click starting block for every new form: First name, Last name, Email, Phone —
 *  matches what the lead pipeline expects (name/email/phone), so submissions from any
 *  form land in Leads consistently regardless of what else the form asks. */
export const CONTACT_BLOCK_FIELDS: FormField[] = [
  { key: "first_name", label: "First name", type: "text", required: true, span: 1 },
  { key: "last_name", label: "Last name", type: "text", required: true, span: 1 },
  { key: "email", label: "Email", type: "email", required: true, span: 1 },
  { key: "phone", label: "Phone", type: "tel", required: false, span: 1 },
];
