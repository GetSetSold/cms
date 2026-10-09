import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { collectSvgIds, getPage, getSettings, getSvgs } from "@/lib/cms";
import { themeFontHref, themeVars, themeIconOverrideCSS } from "@/lib/theme";
import { createClient } from "@/lib/supabase/server";
import { RenderSections } from "@/components/blocks";
import { SiteHeader } from "@/components/site/SiteHeader";
import { MobileCtaBar, SiteFooter } from "@/components/site/SiteFooter";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<{ preview?: string }>;
};

const toSlug = (parts?: string[]) => (parts?.length ? parts.join("/").toLowerCase() : "home");

async function isEditor() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return data?.role === "admin" || data?.role === "editor";
}

async function load(props: Props) {
  const [{ slug }, { preview }] = await Promise.all([props.params, props.searchParams]);
  const wantPreview = preview === "1" && (await isEditor());
  return { result: await getPage(toSlug(slug), wantPreview), preview: wantPreview };
}

/** Extract plain text from page sections for auto-generated meta description. */
function extractPageText(sections: any[]): string {
  const texts: string[] = [];
  for (const s of sections) {
    const d = s.data ?? {};
    // Common text fields across blocks
    for (const key of ["heading", "subline", "content", "text", "bio", "description"]) {
      if (typeof d[key] === "string" && d[key].trim()) {
        // Strip HTML tags if present
        const plain = d[key].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
        if (plain) texts.push(plain);
      }
    }
    // FAQ items
    if (Array.isArray(d.items)) {
      for (const item of d.items) {
        if (item.q) texts.push(String(item.q));
        if (item.a) texts.push(String(item.a).replace(/<[^>]*>/g, " "));
      }
    }
    if (texts.join(" ").length > 500) break; // Enough for description
  }
  return texts.join(" ").replace(/\s+/g, " ").trim();
}

/** Find first image URL in page sections for OG image. */
function findFirstImage(sections: any[]): string | null {
  for (const s of sections) {
    const d = s.data ?? {};
    // Check common image fields
    for (const key of ["image", "photo", "bg_image", "src"]) {
      if (typeof d[key] === "string" && d[key].startsWith("http")) return d[key];
      if (typeof d[key] === "object" && d[key]?.url) return d[key].url;
    }
  }
  return null;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const [{ result }, settings] = await Promise.all([load(props), getSettings()]);
  if (!result) return { title: "Not found" };
  const { page, sections } = result;
  const seo = settings.seo_defaults ?? { title_suffix: "", description: "" };
  const rawTitle = page.seo_title || page.title;
  const suffix = seo.title_suffix ?? "";
  // Always append suffix unless it's already there (prevents doubles if user typed it manually)
  const title = suffix && rawTitle.endsWith(suffix.trim()) ? rawTitle : `${rawTitle}${suffix}`;
  
  // Auto-generate description from page content if not set
  let description = page.seo_description || undefined;
  if (!description && sections) {
    const pageText = extractPageText(sections);
    if (pageText) {
      // Truncate to ~155 chars at word boundary
      if (pageText.length > 155) {
        const truncated = pageText.slice(0, 155);
        const lastSpace = truncated.lastIndexOf(" ");
        description = (lastSpace > 100 ? truncated.slice(0, lastSpace) : truncated) + "...";
      } else {
        description = pageText;
      }
    }
  }
  
  const path = page.slug === "home" ? "/" : `/${page.slug}`;
  const ogImage = (sections ? findFirstImage(sections) : null) || settings.seo_defaults?.og_image || undefined;
  
  return {
    title,
    description,
    alternates: { canonical: page.canonical_url || path },
    robots: page.noindex ? { index: false, follow: false } : undefined,
    openGraph: { 
      title, 
      description, 
      url: path, 
      siteName: settings.site_name, 
      type: "website",
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
    twitter: { 
      card: ogImage ? "summary_large_image" : "summary", 
      title, 
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
    verification: {
      ...(seo.google_verify ? { google: seo.google_verify } : {}),
      ...(seo.bing_verify ? { other: { "msvalidate.01": seo.bing_verify } } : {}),
    },
  };
}

export default async function SitePage(props: Props) {
  const [{ result, preview }, settings] = await Promise.all([load(props), getSettings()]);
  if (!result) notFound();
  const { page, sections } = result;
  const seo = settings.seo_defaults ?? { title_suffix: "", description: "" };

  const ids = collectSvgIds(sections.map((s) => s.data));
  if (settings.logo_svg_id) ids.add(settings.logo_svg_id);
  const svgs = await getSvgs(ids);

  const themeVars_ = themeVars(settings);

  const c = settings.contact ?? {};
  const orgLd = {
    "@context": "https://schema.org", "@type": "RealEstateAgent",
    name: settings.site_name, telephone: c.phone || undefined, email: c.email || undefined,
    address: c.address ? {
      "@type": "PostalAddress",
      streetAddress: c.address,
    } : undefined,
    url: process.env.NEXT_PUBLIC_SITE_URL,
    areaServed: ["Caledonia", "Haldimand County", "Hamilton", "Niagara", "Halton", "Greater Toronto Area"].map((area) => ({
      "@type": "City", name: area,
    })),
    priceRange: "$$",
  };

  return (
    <div style={themeVars_} className="bg-ground text-ink">
      <link rel="stylesheet" href={themeFontHref(settings)} />
      {themeIconOverrideCSS(settings) ? <style dangerouslySetInnerHTML={{ __html: themeIconOverrideCSS(settings) }} /> : null}
      {seo.gtm_id ? (
        <>
          <script dangerouslySetInnerHTML={{ __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${seo.gtm_id}');` }} />
          <noscript><iframe src={`https://www.googletagmanager.com/ns.html?id=${seo.gtm_id}`} height="0" width="0" style={{ display: "none", visibility: "hidden" }} /></noscript>
        </>
      ) : null}
      {preview ? (
        <div className="bg-accent px-4 py-2 text-center text-sm text-white">Preview — status: {page.status}</div>
      ) : null}
      {!page.hide_nav ? <SiteHeader settings={settings} logo={settings.logo_svg_id ? svgs[settings.logo_svg_id] : null} /> : null}
      <main>
        <RenderSections sections={sections} ctx={{ svgs, settings, page }} />
      </main>
      {!page.hide_footer ? <SiteFooter settings={settings} logo={settings.logo_svg_id ? svgs[settings.logo_svg_id] : null} /> : null}
      {!page.hide_nav ? <MobileCtaBar settings={settings} /> : null}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd).replace(/</g, "\\u003c") }} />
      {settings.scripts?.ga4_id && /^G-[A-Z0-9]+$/.test(settings.scripts.ga4_id) ? (
        <>
          <script async src={`https://www.googletagmanager.com/gtag/js?id=${settings.scripts.ga4_id}`} />
          <script dangerouslySetInnerHTML={{ __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${settings.scripts.ga4_id}');` }} />
        </>
      ) : null}
    </div>
  );
}
