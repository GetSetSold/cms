import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { collectSvgIds, getPage, getSettings, getSvgs } from "@/lib/cms";
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

export async function generateMetadata(props: Props): Promise<Metadata> {
  const [{ result }, settings] = await Promise.all([load(props), getSettings()]);
  if (!result) return { title: "Not found" };
  const { page } = result;
  const seo = settings.seo_defaults ?? { title_suffix: "", description: "" };
  const title = page.seo_title || `${page.slug === "home" ? settings.site_name : page.title}${page.slug === "home" ? "" : seo.title_suffix ?? ""}`;
  const description = page.seo_description || seo.description || undefined;
  const path = page.slug === "home" ? "/" : `/${page.slug}`;
  return {
    title,
    description,
    alternates: { canonical: page.canonical_url || path },
    robots: page.noindex ? { index: false, follow: false } : undefined,
    openGraph: { title, description, url: path, siteName: settings.site_name, type: "website" },
    twitter: { card: "summary", title, description },
  };
}

export default async function SitePage(props: Props) {
  const [{ result, preview }, settings] = await Promise.all([load(props), getSettings()]);
  if (!result) notFound();
  const { page, sections } = result;

  const ids = collectSvgIds(sections.map((s) => s.data));
  if (settings.logo_svg_id) ids.add(settings.logo_svg_id);
  const svgs = await getSvgs(ids);

  const t = settings.theme ?? {};
  const themeVars = {
    "--c-primary": t.primary, "--c-accent": t.accent, "--c-ink": t.ink, "--c-ground": t.ground,
  } as React.CSSProperties;

  const c = settings.contact ?? {};
  const orgLd = {
    "@context": "https://schema.org", "@type": "LocalBusiness",
    name: settings.site_name, telephone: c.phone || undefined, email: c.email || undefined,
    address: c.address || undefined, url: process.env.NEXT_PUBLIC_SITE_URL,
  };

  return (
    <div style={themeVars} className="bg-ground text-ink">
      {preview ? (
        <div className="bg-accent px-4 py-2 text-center text-sm text-white">Preview — status: {page.status}</div>
      ) : null}
      {!page.hide_nav ? <SiteHeader settings={settings} logo={settings.logo_svg_id ? svgs[settings.logo_svg_id] : null} /> : null}
      <main>
        <RenderSections sections={sections} ctx={{ svgs, settings, page }} />
      </main>
      {!page.hide_footer ? <SiteFooter settings={settings} /> : null}
      {!page.hide_nav ? <MobileCtaBar settings={settings} /> : null}
      {page.slug === "home" ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd).replace(/</g, "\\u003c") }} />
      ) : null}
      {settings.scripts?.ga4_id && /^G-[A-Z0-9]+$/.test(settings.scripts.ga4_id) ? (
        <>
          <script async src={`https://www.googletagmanager.com/gtag/js?id=${settings.scripts.ga4_id}`} />
          <script dangerouslySetInnerHTML={{ __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${settings.scripts.ga4_id}');` }} />
        </>
      ) : null}
    </div>
  );
}
