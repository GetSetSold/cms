export type Role = "admin" | "editor" | "sales";
export type PageStatus = "draft" | "scheduled" | "published" | "archived";
export type LeadStatus = "new" | "contacted" | "qualified" | "proposal" | "won" | "lost";

export type Json = Record<string, any>;

export interface SectionSettings {
  background?: "default" | "muted" | "dark" | "brand";
  hide_on_mobile?: boolean;
  hide_on_desktop?: boolean;
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

export interface SiteSettings {
  site_name: string;
  logo_svg_id: string | null;
  theme: { primary: string; accent: string; ink: string; ground: string; font?: string };
  seo_defaults: { title_suffix: string; description: string; site_url?: string };
  navigation: { label: string; href: string }[];
  header_cta: { label: string; href: string };
  footer: { tagline?: string };
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
