import type { Metadata } from "next";
import Link from "next/link";
import { getSettings, getLogo } from "@/lib/cms";
import { seoTitle } from "@/lib/seo";
import { getAllFloorplans } from "@/lib/precon";
import { themeFontHref, themeVars, themeIconOverrideCSS } from "@/lib/theme";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter, MobileCtaBar } from "@/components/site/SiteFooter";
import { PreconBoxHeader } from "@/components/site/PreconBoxHeader";
import { PreconSectionHeader } from "@/components/site/PreconSectionHeader";
import { PreconCardCta } from "@/components/site/PreconCardCta";

const wrap = "mx-auto w-full max-w-7xl px-5 md:px-10";
const card = "rounded-[var(--radius-lg)] border-[length:var(--border-card-width)] border-line shadow-[var(--shadow-card)] bg-white";

export async function generateMetadata(): Promise<Metadata> {
  const title = await seoTitle("Pre-Construction Floor Plans in Ontario");
  const description = "Browse every pre-construction floor plan across Ontario — layouts from every builder and project.";
  const url = "https://www.getsetsold.ca/pre-construction/floorplans";
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, type: "website", url },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function FloorplansPage() {
  const settings = await getSettings();
  const logo = await getLogo(settings);
  const floorplans = await getAllFloorplans();
  const heroImages = floorplans.map((f) => f.floorplan_image_url).filter(Boolean) as string[];
  const modelCount = new Set(floorplans.map((f) => f.model_slug).filter(Boolean)).size;

  return (
    <div style={themeVars(settings)} className="bg-ground text-ink">
      <link rel="stylesheet" href={themeFontHref(settings)} />
      {themeIconOverrideCSS(settings) ? <style dangerouslySetInnerHTML={{ __html: themeIconOverrideCSS(settings) }} /> : null}
      <SiteHeader settings={settings} logo={logo} />
      <main className="pb-16">
        <PreconBoxHeader
          crumbs={[{ label: "Pre-Construction", href: "/pre-construction" }, { label: "Floor Plans" }]}
          eyebrow="Pre-Construction Ontario"
          title="Every floor plan, in one place."
          lede="Browse floor plans from every pre-construction project across Ontario."
          bgImages={heroImages}
          strongScrim
          facts={[
            { value: String(floorplans.length), label: "Floor Plans" },
            { value: String(modelCount), label: "Models" },
          ]}
        />

        <section className="mt-[50px] border-t border-line">
          <div className="mx-auto w-full max-w-7xl px-5 md:px-10 py-[50px]">
            <PreconSectionHeader eyebrow="Catalogue" heading="All Floor Plans" />
            {floorplans.length ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {floorplans.map((f) => {
                  const href = f.builder_slug && f.project_slug && f.model_slug
                    ? `/pre-construction/${f.builder_slug}/${f.project_slug}/${f.model_slug}`
                    : null;
                  const inner = (
                    <>
                      <div className="relative aspect-[4/3] bg-white">
                        {f.floorplan_image_url ? <img src={f.floorplan_image_url} alt={f.floorplan_name ?? f.model_name ?? ""} className="h-full w-full object-contain" /> : null}
                      </div>
                      <div className="flex flex-col gap-1.5 p-5">
                        <div className="text-[16.5px] font-bold">{f.floorplan_name ?? f.model_name ?? "Floor Plan"}</div>
                        <div className="text-[13.5px] text-muted">
                          {[f.model_name, f.project_name, f.builder_name].filter(Boolean).join(" · ")}
                        </div>
                        {href ? <PreconCardCta label="View Model" /> : null}
                      </div>
                    </>
                  );
                  return href ? (
                    <Link key={f.id} href={href} prefetch={false} className={`group flex flex-col overflow-hidden ${card}`}>{inner}</Link>
                  ) : (
                    <div key={f.id} className={`flex flex-col overflow-hidden ${card}`}>{inner}</div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted">No floor plans listed yet.</p>
            )}
          </div>
        </section>
      </main>
      <SiteFooter settings={settings} />
      <MobileCtaBar settings={settings} />
    </div>
  );
}
