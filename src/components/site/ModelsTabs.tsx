"use client";
import { useState } from "react";
import Link from "next/link";
import type { PreconModel } from "@/lib/precon";

const card = "rounded-[var(--radius-lg)] border-[length:var(--border-card-width)] border-line shadow-[var(--shadow-card)] bg-white";

export function ModelsTabs({ models, basePath }: { models: PreconModel[]; basePath: string }) {
  const [tab, setTab] = useState<"Move-In Ready" | "Pre-Construction">("Pre-Construction");
  const visible = models.filter((m) => m.status === tab);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-2">
        {(["Move-In Ready", "Pre-Construction"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex h-10 items-center rounded-full px-4 text-sm font-medium ${tab === t ? "bg-primary text-white" : "border border-line bg-white"}`}>
            {t}
          </button>
        ))}
      </div>
      {visible.length ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((m) => (
            <Link key={m.id} href={`${basePath}/${m.slug}`} prefetch={false} className={`flex flex-col overflow-hidden ${card}`}>
              <div className="aspect-[4/3] bg-soft">
                {m.gallery[0] ? <img src={m.gallery[0]} alt={m.name} className="h-full w-full object-cover" /> : null}
              </div>
              <div className="flex flex-col gap-1 p-4">
                <div className="text-base font-bold text-primary">{m.price_from ? `$${m.price_from.toLocaleString()}` : "Price TBA"}</div>
                <div className="text-sm font-medium">{m.name}</div>
                <div className="flex gap-3 text-xs text-muted">
                  {m.bedrooms ? <span>{m.bedrooms} bd</span> : null}
                  {m.bathrooms ? <span>{m.bathrooms} ba</span> : null}
                  {m.sqft ? <span>{m.sqft.toLocaleString()} sqft</span> : null}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : <p className="text-muted">No models listed yet — check back soon.</p>}
    </div>
  );
}
