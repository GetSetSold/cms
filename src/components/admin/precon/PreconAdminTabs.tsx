"use client";
import { useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { BuildersManager } from "@/components/admin/precon/BuildersManager";
import { ProjectsManager } from "@/components/admin/precon/ProjectsManager";
import { ModelsManager } from "@/components/admin/precon/ModelsManager";
import { AmenitiesManager } from "@/components/admin/precon/AmenitiesManager";
import { PromosManager } from "@/components/admin/precon/PromosManager";
import { ImagesManager } from "@/components/admin/precon/ImagesManager";
import type { Builder, Project, HomeModel, Amenity, Promo } from "@/lib/precon";

const TABS = ["Builders", "Projects", "Models", "Amenities", "Promos", "Images"] as const;

export function PreconAdminTabs({ data }: {
  data: { builders: Builder[]; projects: Project[]; models: HomeModel[]; amenities: Amenity[]; promos: Promo[] };
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Builders");
  return (
    <>
      <AdminPageHeader title="Pre-Construction" />
      <div className="flex flex-col gap-4 p-4 md:p-6">
        <div className="flex gap-2 overflow-x-auto border-b border-line">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`whitespace-nowrap px-4 py-2.5 text-sm font-bold ${tab === t ? "border-b-2 border-primary text-ink" : "text-muted"}`}
            >
              {t}
            </button>
          ))}
        </div>
        {tab === "Builders" ? <BuildersManager initial={data.builders} /> : null}
        {tab === "Projects" ? <ProjectsManager initial={data.projects} builders={data.builders} /> : null}
        {tab === "Models" ? <ModelsManager initial={data.models} projects={data.projects} /> : null}
        {tab === "Amenities" ? <AmenitiesManager initial={data.amenities} /> : null}
        {tab === "Promos" ? <PromosManager initial={data.promos} builders={data.builders} projects={data.projects} /> : null}
        {tab === "Images" ? <ImagesManager /> : null}
      </div>
    </>
  );
}
