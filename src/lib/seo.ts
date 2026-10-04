import { getSettings } from "./cms";

/**
 * Append the SEO title suffix from site settings (seo_defaults.title_suffix,
 * e.g. "| GetSetSold"). Used by all listing/city/neighbourhood/province pages
 * so <title> and OG/Twitter titles stay consistent.
 */
export async function seoTitle(title: string): Promise<string> {
  try {
    const settings = await getSettings();
    const suffix = (settings as { seo_defaults?: { title_suffix?: string } } | null)
      ?.seo_defaults?.title_suffix?.trim();
    if (!suffix) return title;
    if (title.endsWith(suffix)) return title;
    return `${title} ${suffix}`;
  } catch {
    return title;
  }
}
