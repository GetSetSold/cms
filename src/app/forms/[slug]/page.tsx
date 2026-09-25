import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSettings, getLogo } from "@/lib/cms";
import { themeFontHref, themeVars, themeIconOverrideCSS } from "@/lib/theme";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { CmsFormRenderer } from "@/components/blocks/CmsFormRenderer";
import type { CmsForm } from "@/lib/types";

export const dynamic = "force-dynamic";

async function getForm(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("forms").select("*").eq("slug", slug).eq("is_active", true).maybeSingle();
  return data as CmsForm | null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const form = await getForm(slug);
  if (!form) return { title: "Form not found" };
  return { title: form.name, description: form.description ?? undefined, alternates: { canonical: `/forms/${slug}` } };
}

export default async function FormPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [form, settings] = await Promise.all([getForm(slug), getSettings()]);
  if (!form) notFound();
  const logo = await getLogo(settings);

  const themeVars_ = themeVars(settings);

  return (
    <div style={themeVars_} className="bg-ground text-ink">
      <link rel="stylesheet" href={themeFontHref(settings)} />
      {themeIconOverrideCSS(settings) ? <style dangerouslySetInnerHTML={{ __html: themeIconOverrideCSS(settings) }} /> : null}
      <SiteHeader settings={settings} logo={logo} />
      <main className="mx-auto w-full max-w-2xl px-5 py-14 md:py-20">
        <div className="mb-8 flex flex-col gap-2">
          <h1 className="font-display text-4xl font-extrabold">{form.name}</h1>
          {form.description ? <p className="text-muted">{form.description}</p> : null}
        </div>
        <CmsFormRenderer form={form} />
      </main>
      <SiteFooter settings={settings} />
    </div>
  );
}
