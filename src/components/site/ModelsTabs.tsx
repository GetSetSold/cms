"use client";
import { useState } from "react";
import Link from "next/link";
import type { HomeModel } from "@/lib/precon";
import { getCashbackAmount, formatCashback } from "@/lib/cashback";
import type { SiteSettings } from "@/lib/types";

const card = "rounded-[var(--radius-lg)] border-[length:var(--border-card-width)] border-line shadow-[var(--shadow-card)] bg-white";

export function ModelsTabs({ models, basePath, cashback }: { models: HomeModel[]; basePath: string; cashback?: SiteSettings["precon_cashback"] }) {
  const [tab, setTab] = useState<"ready" | "precon">("precon");
  const visible = models.filter((m) => (tab === "ready" ? m.move_in_ready === true : m.move_in_ready !== true));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-2">
        <button onClick={() => setTab("precon")} className={`flex h-10 items-center rounded-full px-4 text-sm font-medium ${tab === "precon" ? "bg-primary text-white" : "border border-line bg-white"}`}>Pre-Construction</button>
        <button onClick={() => setTab("ready")} className={`flex h-10 items-center rounded-full px-4 text-sm font-medium ${tab === "ready" ? "bg-primary text-white" : "border border-line bg-white"}`}>Move-In Ready</button>
      </div>
      {visible.length ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((m) => {
            const cb = getCashbackAmount(m.starting_price, cashback);
            return (
              <Link key={m.id} href={`${basePath}/${m.slug}`} prefetch={false} className={`flex flex-col overflow-hidden ${card}`}>
                <div className="relative aspect-[4/3] bg-soft">
                  {m.model_image_url ? <img src={m.model_image_url} alt={m.model_name ?? ""} className="h-full w-full object-cover" /> : null}
                  {cb ? <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-gradient-to-r from-[#065f46] to-[#059669] px-2.5 py-1 text-[11px] font-semibold text-white">{formatCashback(cb)} cashback</span> : null}
                </div>
                <div className="flex flex-col gap-1 p-4">
                  <div className="text-base font-bold text-primary">{m.starting_price ? `$${Number(m.starting_price).toLocaleString()}` : "Price TBA"}</div>
                  <div className="text-sm font-medium">{m.model_name}</div>
                  <div className="flex gap-3 text-xs text-muted">
                    {m.bedrooms ? <span>{m.bedrooms} bd</span> : null}
                    {m.bathrooms ? <span>{m.bathrooms} ba</span> : null}
                    {m.sqft ? <span>{m.sqft} sqft</span> : null}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : <p className="text-muted">No models listed yet — check back soon.</p>}
    </div>
  );
}
