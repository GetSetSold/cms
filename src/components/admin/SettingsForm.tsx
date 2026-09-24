"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { SiteSettings, SvgAsset } from "@/lib/types";
import { FONT_OPTIONS } from "@/lib/theme";
import { SvgPicker } from "./SvgPicker";

export function SettingsForm({ initial, svgs }: { initial: SiteSettings; svgs: SvgAsset[] }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [s, setS] = useState<SiteSettings>(initial);
  const [msg, setMsg] = useState("");
  const set = <K extends keyof SiteSettings>(k: K, v: SiteSettings[K]) => setS({ ...s, [k]: v });

  async function save() {
    const { error } = await supabase.from("site_settings").update({
      site_name: s.site_name, logo_svg_id: s.logo_svg_id, theme: s.theme, seo_defaults: s.seo_defaults,
      navigation: s.navigation.filter((n) => n.label && n.href), header_cta: s.header_cta, footer: s.footer,
      contact: s.contact, scripts: s.scripts, lead_settings: s.lead_settings,
    }).eq("id", 1);
    setMsg(error ? error.message : "Saved"); router.refresh();
  }

  const colors: [keyof SiteSettings["theme"], string][] = [["primary", "Primary"], ["accent", "Accent"], ["ink", "Text"], ["ground", "Background"]];
  const presets: { name: string; theme: SiteSettings["theme"] }[] = [
    { name: "Purple & indigo", theme: { primary: "#6C5DD3", accent: "#1B1145", ink: "#14142B", ground: "#F4F2FC", font: "Inter" } },
    { name: "Teal & clay", theme: { primary: "#0E5C55", accent: "#B8581F", ink: "#15171C", ground: "#F5F3EE", font: "Manrope" } },
    { name: "Navy & gold", theme: { primary: "#1E3A8A", accent: "#B8860B", ink: "#0F172A", ground: "#F8F7F2", font: "Sora" } },
    { name: "Forest & rust", theme: { primary: "#1F5B3F", accent: "#C1440E", ink: "#161A17", ground: "#F3F1EA", font: "Work Sans" } },
  ];

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <section className="card flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Branding</h2>
        <label className="label">Site name<input className="input" value={s.site_name} onChange={(e) => set("site_name", e.target.value)} /></label>
        <div className="label">Logo (SVG)<SvgPicker value={s.logo_svg_id} svgs={svgs} onChange={(id) => set("logo_svg_id", id)} /></div>
        <div className="label">Theme presets
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <button key={p.name} type="button" onClick={() => set("theme", p.theme)}
                className="flex items-center gap-2 rounded-lg border border-line px-2.5 py-1.5 hover:border-primary">
                <span className="flex h-5 w-5 overflow-hidden rounded-full border border-line">
                  <span className="h-full w-1/2" style={{ background: p.theme.primary }} />
                  <span className="h-full w-1/2" style={{ background: p.theme.accent }} />
                </span>
                <span className="text-xs text-ink">{p.name}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {colors.map(([k, label]) => (
            <label key={k} className="label">{label}
              <span className="flex items-center gap-2 rounded-lg border border-line p-1.5">
                <input type="color" value={s.theme[k]} onChange={(e) => set("theme", { ...s.theme, [k]: e.target.value })} className="h-8 w-8 cursor-pointer rounded border-0 bg-transparent" />
                <span className="font-mono text-xs text-ink">{s.theme[k]}</span>
              </span>
            </label>
          ))}
        </div>
        <label className="label">Font
          <select className="input" value={s.theme.font || "Inter"} onChange={(e) => set("theme", { ...s.theme, font: e.target.value })}>
            {FONT_OPTIONS.map((f) => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
          </select>
          <span style={{ fontFamily: s.theme.font || "Inter" }} className="mt-2 text-2xl font-bold">Aa Bb Cc — {s.theme.font || "Inter"}</span>
        </label>
      </section>

      <section className="card flex flex-col gap-4">
        <h2 className="text-lg font-semibold">SEO defaults</h2>
        <label className="label">Title suffix<input className="input" value={s.seo_defaults.title_suffix} onChange={(e) => set("seo_defaults", { ...s.seo_defaults, title_suffix: e.target.value })} /></label>
        <label className="label">Default meta description<textarea className="textarea" rows={3} value={s.seo_defaults.description} onChange={(e) => set("seo_defaults", { ...s.seo_defaults, description: e.target.value })} /></label>
        <label className="label">Google Analytics 4 ID<input className="input" placeholder="G-XXXXXXXXXX" value={s.scripts?.ga4_id ?? ""} onChange={(e) => set("scripts", { ...s.scripts, ga4_id: e.target.value.trim() })} /></label>
        <p className="text-xs text-muted">Sitemap: /sitemap.xml · robots: /robots.txt · LocalBusiness schema is added to the home page from your contact details.</p>
      </section>

      <section className="card flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Navigation</h2>
        {s.navigation.map((n, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_auto_auto] items-center gap-2">
            <input className="input" placeholder="Label" value={n.label} onChange={(e) => set("navigation", s.navigation.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
            <input className="input" placeholder="/about" value={n.href} onChange={(e) => set("navigation", s.navigation.map((x, j) => (j === i ? { ...x, href: e.target.value } : x)))} />
            <button aria-label="Move up" disabled={i === 0} onClick={() => { const a = [...s.navigation]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; set("navigation", a); }}>↑</button>
            <button aria-label="Remove" onClick={() => set("navigation", s.navigation.filter((_, j) => j !== i))}>✕</button>
          </div>
        ))}
        <button className="btn self-start border-dashed" onClick={() => set("navigation", [...s.navigation, { label: "", href: "" }])}>+ Add link</button>
        <div className="grid grid-cols-2 gap-2">
          <label className="label">Header button<input className="input" value={s.header_cta?.label ?? ""} onChange={(e) => set("header_cta", { ...s.header_cta, label: e.target.value })} /></label>
          <label className="label">Links to<input className="input" value={s.header_cta?.href ?? ""} onChange={(e) => set("header_cta", { ...s.header_cta, href: e.target.value })} /></label>
        </div>
        <label className="label">Footer tagline<input className="input" value={s.footer?.tagline ?? ""} onChange={(e) => set("footer", { ...s.footer, tagline: e.target.value })} /></label>
      </section>

      <section className="card flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Contact &amp; leads</h2>
        {(["phone", "email", "address", "hours"] as const).map((k) => (
          <label key={k} className="label capitalize">{k}<input className="input" value={s.contact?.[k] ?? ""} onChange={(e) => set("contact", { ...s.contact, [k]: e.target.value })} /></label>
        ))}
        <label className="label">Email new leads to (comma separated)
          <input className="input" value={(s.lead_settings?.notify_emails ?? []).join(", ")}
            onChange={(e) => set("lead_settings", { ...s.lead_settings, notify_emails: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} />
        </label>
        <p className="text-xs text-muted">SMS and email provider keys (Twilio, Resend) are Supabase secrets — they are never stored here.</p>
      </section>

      <div className="flex items-center gap-3 xl:col-span-2">
        <button className="btn-primary" onClick={save}>Save changes</button>
        {msg ? <span className="text-sm text-muted" role="status">{msg}</span> : null}
      </div>
    </div>
  );
}
