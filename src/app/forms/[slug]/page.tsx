import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSettings, getLogo } from "@/lib/cms";
import { themeFontHref, themeVars, themeIconOverrideCSS } from "@/lib/theme";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { CmsFormRenderer } from "@/components/blocks/CmsFormRenderer";
import { TokenFormWrapper } from "@/components/forms/TokenFormWrapper";
import type { CmsForm } from "@/lib/types";

export const dynamic = "force-dynamic";

async function getForm(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("forms").select("*").eq("slug", slug).eq("is_active", true).maybeSingle();
  return data as CmsForm | null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const [form, settings] = await Promise.all([getForm(slug), getSettings()]);
  if (!form) return { title: "Form not found" };
  const title = form.name;
  const description = form.description ?? undefined;
  // Same social preview treatment as CMS pages: the site default OG image
  // when one is set, otherwise the branded title card from /api/og (which
  // renders the form's name — see the form lookup in that route), so no
  // form ever shares without an image.
  const ogImage = settings.seo_defaults?.og_image || `/api/og/${slug}`;
  return {
    title,
    description,
    alternates: { canonical: `/forms/${slug}` },
    openGraph: {
      title,
      description,
      url: `/forms/${slug}`,
      siteName: settings.site_name,
      type: "website",
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function FormPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ t?: string }> }) {
  const { slug } = await params;
  const { t } = await searchParams;
  const [form, settings] = await Promise.all([getForm(slug), getSettings()]);
  if (!form) notFound();
  const logo = await getLogo(settings);

  const themeVars_ = themeVars(settings);

  return (
    <div style={themeVars_} className="bg-ground text-ink">
      <link rel="stylesheet" href={themeFontHref(settings)} />
      {themeIconOverrideCSS(settings) ? <style dangerouslySetInnerHTML={{ __html: themeIconOverrideCSS(settings) }} /> : null}
      <SiteHeader settings={settings} logo={logo} />
      <main className={`mx-auto w-full px-5 py-14 md:py-20 ${form.layout === "sidebar" ? "max-w-6xl" : "max-w-2xl"}`}>
        {!form.hide_header && form.layout !== "sidebar" ? (
          <div className="mb-8 flex flex-col gap-2">
            <h1 className="font-display font-bold text-[30px] leading-[1.15] tracking-tight md:text-[28px] md:leading-[1.2]">{form.name}</h1>
            {form.description ? <p className="text-muted">{form.description}</p> : null}
          </div>
        ) : null}
        {t ? <TokenFormWrapper form={form} token={t} /> : <CmsFormRenderer form={form} />}
      </main>
      <SiteFooter settings={settings} />
    </div>
  );
}
