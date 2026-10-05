export type Role = "admin" | "editor" | "sales";
export type PageStatus = "draft" | "scheduled" | "published" | "archived";
export type LeadStatus = "new" | "contacted" | "qualified" | "proposal" | "won" | "lost";

export type Json = Record<string, any>;

export interface SectionSettings {
  background?: "default" | "muted" | "dark" | "brand" | "white" | "custom";
  background_color?: string; // used when background === "custom"
  hide_on_mobile?: boolean;
  hide_on_desktop?: boolean;
  /** Groups this block with other consecutive blocks sharing the same row_id
   *  into one CSS-grid row on desktop (mobile always stacks to 1 column).
   *  row_columns only needs to be set on any one block in the group. */
  row_id?: string;
  row_columns?: 1 | 2 | 3 | 4;
  anchor?: string;
  /** Available on every block, not just certain ones — wraps the block's
   *  content in a background box. Text color inside adjusts automatically
   *  based on the actual color's real brightness, not an assumption. */
  box?: boolean;
  box_bg?: string; // hex, or the literal strings "white" / "transparent"
  /** Available on every block — any button the block renders reads this
   *  when the block itself doesn't hardcode its own style. */
  button_style?: "solid" | "bordered";
  /** Section Header only — draw this header and the visible block right below
   *  it as ONE card. Layout: header beside the block, or header above it. */
  merge_next?: boolean;
  merge_layout?: "side" | "stacked";
  merge_color?: string; // one hex color for the whole merged card (default white)
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
export type MobileCtaButton = { type: "call" | "sms" | "link"; label: string; icon: MobileCtaIcon; icon_svg_id?: string; href?: string };
export interface SiteSettings {
  site_name: string;
  logo_svg_id: string | null;
  email_provider?: "zeptomail" | "resend";
  sms_provider?: "vonage" | "twilio";
  theme: { primary: string; accent: string; ink: string; ground: string; font?: string; font_heading?: string; font_body?: string; icon_override?: string; icon_bg_override?: string; radius?: "sharp" | "soft" | "round"; shadow?: "none" | "soft" | "crisp"; density?: "comfortable" | "compact" };
  seo_defaults: { title_suffix: string; description: string; site_url?: string };
  navigation: NavItem[];
  header_cta: { label: string; href: string };
  header: {
    bg?: string; text?: string;
    show_logo_mobile?: boolean; show_logo_desktop?: boolean;
    show_name_mobile?: boolean; show_name_desktop?: boolean;
    logo_size?: number;      // px, applies to both breakpoints
    logo_gap?: number;       // px, space between logo and site name/subline
    name_size_mobile?: number;  // px
    name_size_desktop?: number; // px
    name_weight?: "normal" | "bold";
    subline?: string;            // e.g. a tagline under the site name
    subline_size_mobile?: number;  // px
    subline_size_desktop?: number; // px
    subline_weight?: "normal" | "bold";
  };
  footer: { tagline?: string; rows: NavColumn[][]; bg?: string; text?: string; columns_per_row?: 3 | 4; mobile_columns_per_row?: 1 | 2 };
  mobile_cta: { buttons: MobileCtaButton[]; shape: "square" | "rectangle"; size?: "xs" | "sm" | "md" | "lg"; layout?: "plain" | "active-highlight"; style?: "buttons" | "tabs"; bar_bg?: "light" | "dark" };
  blog_cta: { heading?: string; text?: string; button_label?: string; button_href?: string };
  contact: { phone?: string; email?: string; address?: string; hours?: string };
  agent?: { name?: string; title?: string; photo_svg_id?: string | null; phone?: string; email?: string; brokerage?: string };
  social_links: { size?: "xs" | "sm" | "md" | "lg"; items: { svg_id: string; href: string; label?: string }[] };
  mls_office_key?: string;
  precon_cashback?: { enabled: boolean; type: "percent" | "flat"; value: number };
  scripts: { ga4_id?: string };
  ads?: {
    grid_ad_enabled?: boolean;
    grid_ad_code?: string;
    grid_ad_position?: number;
    grid_ad_frequency?: number;
    trends_ad_enabled?: boolean;
    boc_ad_enabled?: boolean;
    guides_ad_enabled?: boolean;
    calculators_ad_enabled?: boolean;
    listing_ad_enabled?: boolean;
  };
  lead_settings: { notify_emails: string[] };
  /** Calculator regulatory/default assumptions (Admin → Calculators). Merged over code defaults. */
  calculators?: {
    stressBuffer?: number; stressFloor?: number; gdsLimit?: number; tdsLimit?: number;
    dp1pct?: number; dp1max?: number; dp2pct?: number; dp2max?: number; dp3pct?: number;
    cmhcTiers?: { upTo: number; rate: number }[];
    onRebate?: number; toRebate?: number;
    effectiveDate?: string; lastUpdated?: string;
  };
}

export interface SvgAsset {
  id: string;
  name: string;
  markup: string;
  tags: string[];
}

export type LeadFlowCategory = "tenant" | "buyer_preowned" | "buyer_precon" | "seller" | "landlord" | "investor" | "general";
export const LEAD_FLOW_CATEGORIES: { value: LeadFlowCategory; label: string }[] = [
  { value: "tenant", label: "Tenant" },
  { value: "buyer_preowned", label: "Buyer — Pre-owned" },
  { value: "buyer_precon", label: "Buyer — Pre-construction" },
  { value: "seller", label: "Seller" },
  { value: "landlord", label: "Landlord" },
  { value: "investor", label: "Investor" },
  { value: "general", label: "General" },
];

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
  custom_fields: Record<string, unknown>;
  status: LeadStatus;
  sms_opt_in: boolean;
  sms_opted_out: boolean;
  created_at: string;
}

export interface LeadFlow {
  id: string;
  name: string;
  description: string | null;
  category: LeadFlowCategory;
  trigger: string;
  form_key: string | null;
  is_active: boolean;
  steps: { delay_minutes: number; channel: "sms" | "email"; subject?: string; template: string }[];
}

export interface LeadFlowEnrollment {
  id: string;
  lead_id: string;
  flow_id: string;
  status: "active" | "completed" | "stopped";
  enrolled_by: string | null;
  created_at: string;
  flow?: LeadFlow; // present when joined via select("*, flow:follow_up_sequences(*)")
}

export const LEAD_STATUSES: LeadStatus[] = ["new", "contacted", "qualified", "proposal", "won", "lost"];

export type BlockInstance = { type: string; data?: Json; settings?: SectionSettings };

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  template_blocks_before: BlockInstance[];
  template_blocks_after: BlockInstance[];
  sort_order: number;
}

export interface BlogAuthor {
  id: string;
  name: string;
  role: string | null;
  bio: string | null;
  avatar_svg_id: string | null;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  category_id: string | null;
  excerpt: string | null;
  cover_svg_id: string | null;
  blocks_before: BlockInstance[];
  content_md: string;
  blocks_after: BlockInstance[];
  author_id: string | null;
  tags: string[];
  status: PageStatus;
  publish_at: string | null;
  seo_title: string | null;
  seo_description: string | null;
  updated_at: string;
  created_at: string;
}

export type FormFieldType =
  | "text" | "email" | "tel" | "url" | "textarea" | "number" | "decimal" | "currency" | "date"
  | "dropdown" | "radio" | "checkbox" | "multiple_choice" | "address" | "subform"
  /** Not a question — a text header (with an underline) you can drop in before any question to
   *  break a long section into labeled parts. Uses `label` as its heading text; nothing else applies. */
  | "heading";

export type FormField = {
  key: string; label: string; type: FormFieldType;
  required?: boolean;
  options?: string[]; // dropdown / radio / multiple_choice
  span?: 1 | 2;        // force full width in a 2-column section
  // subform only: a repeatable group of its own fields
  subfields?: FormField[];
  repeat_label?: string; // e.g. "Add another applicant"
  max?: number;           // max repeats, default unlimited (or the cap when the count comes from an answer)

  // ---- logic (all optional; a form without any of these behaves exactly as before) ----
  /** Show this question only once an earlier question has a matching answer. */
  show_if?: FormCondition;
  /** number / decimal / currency: fixed limits, and/or a limit taken from an earlier answer. */
  min_value?: number;
  max_value?: number;
  max_from?: string;   // key of an earlier question: this answer can't be higher than that one
  whole?: boolean;     // number only: whole numbers (2, not 2.5)
  /** subform only: exactly as many entries as the answer to this earlier question (people can't add/remove). */
  repeat_from?: string;
  entry_label?: string; // title of each entry, e.g. "Working adult {n}"
  /** subform only, and only when the form is paginated: each entry gets its own step instead of
   *  piling them all onto one long page. */
  paginate_entries?: boolean;
  /** subform only, free-add mode (no repeat_from): bounds on how many entries someone can add,
   *  each optionally tied to an earlier NUMBER question's answer instead of a fixed number. */
  min_entries?: number;
  max_entries?: number;
  min_entries_from?: string;
  max_entries_from?: string;
};

export type FormChoiceStyle = "simple" | "boxed" | "pills";
export type FormTheme = "light" | "dark";

export type FormConditionOp = "answered" | "equals" | "not_equals" | "greater_than" | "less_than";
export type FormCondition = { field: string; op: FormConditionOp; value?: string };

export type FormSection = {
  id: string;
  heading?: string;
  columns: 1 | 2; // desktop only — mobile is always single column
  background?: string; // hex color, e.g. "#F4F2FC" — blank/undefined = no background
  fields: FormField[];
};

export interface SectionPreset {
  id: string;
  name: string;
  category: string;
  description: string | null;
  blocks: { type: string; data?: Json; settings?: SectionSettings }[];
}

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
  choice_style?: FormChoiceStyle; // "boxed": bigger radio/checkbox buttons, every question in a bordered card
  theme?: FormTheme; // defaults to "light"
  layout?: "standard" | "sidebar"; // "sidebar": a persistent left panel (title + section nav), works whether the form paginates or not
  hide_header?: boolean; // hide the form's own name/description — wherever it's used (standalone page, sidebar panel, or as a block)
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

// The two standard consent statements — edit the name/title inline after inserting, same as any
// other field label. Both keep the exact required disclosure language (data rates, STOP to opt out).
export const CONSENT_TEXTS = {
  sms: "I agree to receive text messages from Rohit Sharma about my request. Message & data rates may apply. Reply STOP to opt out.",
  sms_email: "I agree to receive email and text messages from Realtor Rohit Sharma about my request. Message & data rates may apply. Reply STOP to opt out.",
} as const;
