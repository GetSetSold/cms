"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { SiteSettings, SvgAsset } from "@/lib/types";
import { FONT_OPTIONS } from "@/lib/theme";
import { SvgPicker } from "./SvgPicker";
import { NavItemEditor, FooterRowsEditor } from "./NavEditors";
import { ColorField } from "./ColorField";
const TABS = [
  { id: "branding", label: "Branding" },
  { id: "header", label: "Header" },
  { id: "navigation", label: "Navigation" },
  { id: "footer", label: "Footer" },
  { id: "mobile", label: "Mobile bar" },
  { id: "contact", label: "Contact & leads" },
  { id: "content", label: "Blog & social" },
  { id: "seo", label: "SEO" },
  { id: "ads", label: "Ads" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export function SettingsForm({ initial, svgs }: { initial: SiteSettings; svgs: SvgAsset[] }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [s, setS] = useState<SiteSettings>(initial);
  const [msg, setMsg] = useState("");
  const [tab, setTab] = useState<TabId>("branding");
  const set = <K extends keyof SiteSettings>(k: K, v: SiteSettings[K]) => setS({ ...s, [k]: v });

  async function save() {
    const { error } = await supabase.from("site_settings").update({
      site_name: s.site_name, logo_svg_id: s.logo_svg_id, theme: s.theme, seo_defaults: s.seo_defaults,
      navigation: s.navigation.filter((n) => n.label && n.href), header_cta: s.header_cta, header: s.header, footer: s.footer,
      contact: s.contact, scripts: s.scripts, lead_settings: s.lead_settings, mobile_cta: s.mobile_cta, blog_cta: s.blog_cta, social_links: s.social_links, precon_cashback: s.precon_cashback,
      agent: s.agent ?? {},
      email_provider: s.email_provider ?? "zeptomail", sms_provider: s.sms_provider ?? "vonage",
      ads: s.ads ?? {}, promo: s.promo ?? {}, local_expert: s.local_expert ?? {},
    }).eq("id", 1);
    setMsg(error ? error.message : "Saved");
  }

  const colors: [keyof SiteSettings["theme"], string][] = [["primary", "Primary"], ["accent", "Accent"], ["ink", "Text"], ["ground", "Background"]];
  const presets: { name: string; theme: SiteSettings["theme"] }[] = [
    { name: "Purple & indigo", theme: { primary: "#6C5DD3", accent: "#1B1145", ink: "#14142B", ground: "#F4F2FC", font_heading: "Space Grotesk", font_body: "Inter" } },
    { name: "Teal & clay", theme: { primary: "#0E5C55", accent: "#B8581F", ink: "#15171C", ground: "#F5F3EE", font_heading: "Manrope", font_body: "Inter" } },
    { name: "Navy & gold", theme: { primary: "#1E3A8A", accent: "#B8860B", ink: "#0F172A", ground: "#F8F7F2", font_heading: "Sora", font_body: "Work Sans" } },
    { name: "Forest & rust", theme: { primary: "#1F5B3F", accent: "#C1440E", ink: "#161A17", ground: "#F3F1EA", font_heading: "Poppins", font_body: "Work Sans" } },
  ];

  const goTab = (id: TabId) => { setTab(id); window.scrollTo({ top: 0, behavior: "smooth" }); };

  return (
    <div className="flex flex-col gap-4">
      {/* Slim tab bar — scrolls away with the page */}
      <div className="-mx-4 border-b border-line bg-white px-4 md:-mx-6 md:px-6">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-1 overflow-x-auto py-1.5">
          {TABS.map((t) => (
            <button key={t.id} type="button" onClick={() => goTab(t.id)}
              className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[13px] font-medium transition ${tab === t.id ? "bg-ink text-white" : "text-muted hover:bg-soft hover:text-ink"}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        {tab === "branding" && (
          <section className="flex flex-col gap-3 border border-line bg-white p-4 md:p-5">
            <h2 className="text-base font-semibold">Branding</h2>
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
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="label">Heading font
                        <select className="input" value={s.theme.font_heading || s.theme.font || "Inter"} onChange={(e) => set("theme", { ...s.theme, font_heading: e.target.value })}>
                          {FONT_OPTIONS.map((f) => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
                        </select>
                        <span style={{ fontFamily: s.theme.font_heading || s.theme.font || "Inter", fontWeight: 700 }} className="mt-2 text-2xl">Aa Bb Cc</span>
                      </label>
                      <label className="label">Body font
                        <select className="input" value={s.theme.font_body || s.theme.font || "Inter"} onChange={(e) => set("theme", { ...s.theme, font_body: e.target.value })}>
                          {FONT_OPTIONS.map((f) => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
                        </select>
                        <span style={{ fontFamily: s.theme.font_body || s.theme.font || "Inter" }} className="mt-2 text-base text-muted">The quick brown fox jumps over the lazy dog.</span>
                      </label>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-4">
                      <ColorField label="Force all icon colors (optional)" value={s.theme.icon_override} fallback={s.theme.primary}
                        onChange={(v) => set("theme", { ...s.theme, icon_override: v })} onReset={() => set("theme", { ...s.theme, icon_override: undefined })} />
                      <p className="pb-1.5 text-xs text-muted">Overrides every icon's accent color at once, sitewide. Leave unset to let each icon follow the normal Primary/Accent colors above.</p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-4">
                      <ColorField label="Force all icon backgrounds (optional)" value={s.theme.icon_bg_override} fallback="#FFFFFF"
                        onChange={(v) => set("theme", { ...s.theme, icon_bg_override: v })} onReset={() => set("theme", { ...s.theme, icon_bg_override: undefined })} />
                      <p className="pb-1.5 text-xs text-muted">Overrides the box/circle behind icons (hero icon, icon cards) sitewide, unless a block sets its own color.</p>
                    </div>

                    <div className="flex flex-col gap-3 rounded-lg border border-line p-3">
                      <strong className="text-sm">Shape</strong>
                      <p className="text-xs text-muted">Changes the visual language across every card, button, and box on the site at once — corners and shadows, not colors.</p>
                      <div className="flex flex-wrap gap-4">
                        <label className="label">Corners
                          <select className="input w-full sm:w-36" value={s.theme.radius ?? "soft"} onChange={(e) => set("theme", { ...s.theme, radius: e.target.value as "sharp" | "soft" | "round" })}>
                            <option value="sharp">Sharp</option>
                            <option value="soft">Soft (default)</option>
                            <option value="round">Round</option>
                          </select>
                        </label>
                        <label className="label">Depth
                          <select className="input w-full sm:w-40" value={s.theme.shadow ?? "soft"} onChange={(e) => set("theme", { ...s.theme, shadow: e.target.value as "none" | "soft" | "crisp" })}>
                            <option value="none">Flat (hairline border)</option>
                            <option value="soft">Soft shadow (default)</option>
                            <option value="crisp">Crisp shadow</option>
                          </select>
                        </label>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 rounded-lg border border-line p-3">
                      <strong className="text-sm">Density</strong>
                      <p className="text-xs text-muted">Compact uses smaller type and tighter spacing — a near black-and-white, Vercel-style look with your Accent color
                        used sparingly (step numbers, small badges). Applies site-wide to every block that supports it, not per-block.</p>
                      <select className="input w-full sm:w-48" value={s.theme.density ?? "comfortable"} onChange={(e) => set("theme", { ...s.theme, density: e.target.value as "comfortable" | "compact" })}>
                        <option value="comfortable">Comfortable (default)</option>
                        <option value="compact">Compact</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-3 rounded-lg border border-line p-3">
                      <strong className="text-sm">Pre-Construction Cashback</strong>
                      <p className="text-xs text-muted">Controls the cashback badge shown on Pre-Construction pages. Off by default — nothing shows until you turn this on.</p>
                      <label className="flex items-center justify-between text-sm">Show cashback badges
                        <input type="checkbox" checked={s.precon_cashback?.enabled ?? false}
                          onChange={(e) => set("precon_cashback", { ...(s.precon_cashback ?? { type: "percent", value: 1 }), enabled: e.target.checked })} />
                      </label>
                      {s.precon_cashback?.enabled ? (
                        <div className="flex items-end gap-3">
                          <label className="label">Type
                            <select className="input w-full sm:w-32" value={s.precon_cashback?.type ?? "percent"}
                              onChange={(e) => set("precon_cashback", { ...s.precon_cashback!, type: e.target.value as "percent" | "flat" })}>
                              <option value="percent">Percent</option>
                              <option value="flat">Flat $</option>
                            </select>
                          </label>
                          <label className="label">{s.precon_cashback?.type === "flat" ? "Amount ($)" : "Percent (%)"}
                            <input className="input w-full sm:w-32" type="number" min={0} step={s.precon_cashback?.type === "flat" ? 100 : 0.25}
                              value={s.precon_cashback?.value ?? 1}
                              onChange={(e) => set("precon_cashback", { ...s.precon_cashback!, value: Number(e.target.value) })} />
                          </label>
                        </div>
                      ) : null}
                    </div>
          </section>
        )}
        {tab === "header" && (
          <section className="flex flex-col gap-3 border border-line bg-white p-4 md:p-5">
            <h2 className="text-base font-semibold">Header</h2>
            <h3 className="text-sm font-semibold text-ink">Appearance</h3>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <ColorField label="Background" value={s.header?.bg} fallback="#ffffff" onChange={(v) => set("header", { ...s.header, bg: v })} onReset={() => set("header", { ...s.header, bg: undefined })} />
                        <ColorField label="Text color" value={s.header?.text} fallback="#14142B" onChange={(v) => set("header", { ...s.header, text: v })} onReset={() => set("header", { ...s.header, text: undefined })} />
                      </div>
                      <div className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
                        <label className="flex items-center justify-between">Logo on mobile<input type="checkbox" checked={s.header?.show_logo_mobile !== false} onChange={(e) => set("header", { ...s.header, show_logo_mobile: e.target.checked })} /></label>
                        <label className="flex items-center justify-between">Logo on desktop<input type="checkbox" checked={s.header?.show_logo_desktop !== false} onChange={(e) => set("header", { ...s.header, show_logo_desktop: e.target.checked })} /></label>
                        <label className="flex items-center justify-between">Site name on mobile<input type="checkbox" checked={s.header?.show_name_mobile !== false} onChange={(e) => set("header", { ...s.header, show_name_mobile: e.target.checked })} /></label>
                        <label className="flex items-center justify-between">Site name on desktop<input type="checkbox" checked={s.header?.show_name_desktop !== false} onChange={(e) => set("header", { ...s.header, show_name_desktop: e.target.checked })} /></label>
                      </div>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <label className="label">Logo size (px)<input type="number" min={16} max={80} className="input" value={s.header?.logo_size ?? 32} onChange={(e) => set("header", { ...s.header, logo_size: Number(e.target.value) })} /></label>
                        <label className="label">Logo–name gap (px)<input type="number" min={0} max={40} className="input" value={s.header?.logo_gap ?? 10} onChange={(e) => set("header", { ...s.header, logo_gap: Number(e.target.value) })} /></label>
                        <label className="label">Name size, mobile (px)<input type="number" min={12} max={48} className="input" value={s.header?.name_size_mobile ?? 24} onChange={(e) => set("header", { ...s.header, name_size_mobile: Number(e.target.value) })} /></label>
                        <label className="label">Name size, desktop (px)<input type="number" min={12} max={60} className="input" value={s.header?.name_size_desktop ?? 30} onChange={(e) => set("header", { ...s.header, name_size_desktop: Number(e.target.value) })} /></label>
                      </div>
                      <label className="label w-40">Name weight
                        <select className="input" value={s.header?.name_weight ?? "bold"} onChange={(e) => set("header", { ...s.header, name_weight: e.target.value as "normal" | "bold" })}>
                          <option value="normal">Normal</option>
                          <option value="bold">Bold</option>
                        </select>
                      </label>
                      <div className="flex flex-col gap-3 rounded-lg bg-ground p-3">
                        <label className="label">Subline (tagline shown under the site name)
                          <input className="input" placeholder="e.g. Real Estate Brokerage" value={s.header?.subline ?? ""} onChange={(e) => set("header", { ...s.header, subline: e.target.value })} />
                        </label>
                        <div className="grid gap-3 sm:grid-cols-3">
                          <label className="label">Size, mobile (px)<input type="number" min={9} max={24} className="input" value={s.header?.subline_size_mobile ?? 12} onChange={(e) => set("header", { ...s.header, subline_size_mobile: Number(e.target.value) })} /></label>
                          <label className="label">Size, desktop (px)<input type="number" min={9} max={28} className="input" value={s.header?.subline_size_desktop ?? 13} onChange={(e) => set("header", { ...s.header, subline_size_desktop: Number(e.target.value) })} /></label>
                          <label className="label">Weight
                            <select className="input" value={s.header?.subline_weight ?? "normal"} onChange={(e) => set("header", { ...s.header, subline_weight: e.target.value as "normal" | "bold" })}>
                              <option value="normal">Normal</option>
                              <option value="bold">Bold</option>
                            </select>
                          </label>
                        </div>
                      </div>
            <h3 className="text-sm font-semibold text-ink">Header button</h3>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="label">Header button<input className="input" value={s.header_cta?.label ?? ""} onChange={(e) => set("header_cta", { ...s.header_cta, label: e.target.value })} /></label>
                      <label className="label">Links to<input className="input" value={s.header_cta?.href ?? ""} onChange={(e) => set("header_cta", { ...s.header_cta, href: e.target.value })} /></label>
                    </div>
          </section>
        )}
        {tab === "navigation" && (
          <section className="flex flex-col gap-3 border border-line bg-white p-4 md:p-5">
            <h2 className="text-base font-semibold">Navigation</h2>
                    {s.navigation.map((n, i) => (
                      <NavItemEditor key={i} item={n}
                        onChange={(ni) => set("navigation", s.navigation.map((x, j) => (j === i ? ni : x)))}
                        onRemove={() => set("navigation", s.navigation.filter((_, j) => j !== i))}
                        onMoveUp={() => { const a = [...s.navigation]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; set("navigation", a); }}
                        onMoveDown={() => { const a = [...s.navigation]; [a[i + 1], a[i]] = [a[i], a[i + 1]]; set("navigation", a); }}
                        canMoveUp={i > 0}
                        canMoveDown={i < s.navigation.length - 1}
                      />
                    ))}
                    <button className="btn self-start border-dashed" onClick={() => set("navigation", [...s.navigation, { label: "", href: "" }])}>+ Add link</button>
          </section>
        )}
        {tab === "footer" && (
          <section className="flex flex-col gap-3 border border-line bg-white p-4 md:p-5">
            <h2 className="text-base font-semibold">Footer</h2>
                    <label className="label">Footer tagline<input className="input" value={s.footer?.tagline ?? ""} onChange={(e) => set("footer", { ...s.footer, tagline: e.target.value })} /></label>
                    <div className="grid gap-3 rounded-lg border border-line p-3 sm:grid-cols-3">
                      <ColorField label="Footer background" value={s.footer?.bg} fallback="#14142B" onChange={(v) => set("footer", { ...s.footer, bg: v })} onReset={() => set("footer", { ...s.footer, bg: undefined })} />
                      <ColorField label="Footer text color" value={s.footer?.text} fallback="#FFFFFF" onChange={(v) => set("footer", { ...s.footer, text: v })} onReset={() => set("footer", { ...s.footer, text: undefined })} />
                      <label className="label">Columns per row (desktop)
                        <select className="input" value={s.footer?.columns_per_row ?? 4} onChange={(e) => set("footer", { ...s.footer, columns_per_row: Number(e.target.value) as 3 | 4 })}>
                          <option value={3}>3</option>
                          <option value={4}>4</option>
                        </select>
                      </label>
                      <label className="label">Columns per row (mobile)
                        <select className="input" value={s.footer?.mobile_columns_per_row ?? 2} onChange={(e) => set("footer", { ...s.footer, mobile_columns_per_row: Number(e.target.value) as 1 | 2 })}>
                          <option value={1}>1</option>
                          <option value={2}>2</option>
                        </select>
                      </label>
                    </div>
                    <div className="label">Footer rows
                      <FooterRowsEditor rows={s.footer?.rows ?? []} maxPerRow={s.footer?.columns_per_row ?? 4} onChange={(rows) => set("footer", { ...s.footer, rows })} />
                    </div>
          </section>
        )}
        {tab === "mobile" && (
          <section className="flex flex-col gap-3 border border-line bg-white p-4 md:p-5">
            <h2 className="text-base font-semibold">Mobile bottom bar</h2>
                    <p className="text-xs text-muted">Shown as a sticky bar on phones. Up to 5 buttons.</p>
                    <div className="flex flex-wrap gap-4">
                      <label className="label">Style
                        <select className="input w-full sm:w-44" value={s.mobile_cta?.style ?? "buttons"} onChange={(e) => set("mobile_cta", { ...s.mobile_cta, style: e.target.value as "buttons" | "tabs" })}>
                          <option value="buttons">Buttons (pill/square)</option>
                          <option value="tabs">Tabs (icon over label)</option>
                        </select>
                      </label>
                      <label className="label">Bar background
                        <select className="input w-full sm:w-32" value={s.mobile_cta?.bar_bg ?? "light"} onChange={(e) => set("mobile_cta", { ...s.mobile_cta, bar_bg: e.target.value as "light" | "dark" })}>
                          <option value="light">Light (#FFFFFF)</option>
                          <option value="dark">Dark (#000000)</option>
                        </select>
                      </label>
                    </div>
                    <div className="flex flex-wrap gap-4">
                      <label className="label">Button shape
                        <select className="input w-full sm:w-40" value={s.mobile_cta?.shape ?? "rectangle"} onChange={(e) => set("mobile_cta", { ...s.mobile_cta, shape: e.target.value as "square" | "rectangle" })}>
                          <option value="rectangle">Rectangle</option>
                          <option value="square">Square</option>
                        </select>
                      </label>
                      <label className="label">Button size
                        <select className="input w-full sm:w-32" value={s.mobile_cta?.size ?? "md"} onChange={(e) => set("mobile_cta", { ...s.mobile_cta, size: e.target.value as "xs" | "sm" | "md" | "lg" })}>
                          <option value="xs">X-Small</option>
                          <option value="sm">Small</option>
                          <option value="md">Medium</option>
                          <option value="lg">Large</option>
                        </select>
                      </label>
                      <label className="label">Layout
                        <select className="input w-full sm:w-44" value={s.mobile_cta?.layout ?? "plain"} onChange={(e) => set("mobile_cta", { ...s.mobile_cta, layout: e.target.value as "plain" | "active-highlight" })}>
                          <option value="plain">Plain (last button filled)</option>
                          <option value="active-highlight">Highlight current page</option>
                        </select>
                      </label>
                    </div>
                    {(s.mobile_cta?.buttons ?? []).map((btn, i) => (
                      <div key={i} className="flex flex-col gap-2 rounded-lg border border-line p-2 sm:grid sm:grid-cols-[110px_minmax(0,1fr)_260px_minmax(0,1fr)_auto] sm:items-start">
                        <select className="input" value={btn.type} onChange={(e) => {
                          const buttons = [...(s.mobile_cta?.buttons ?? [])]; buttons[i] = { ...btn, type: e.target.value as typeof btn.type }; set("mobile_cta", { ...s.mobile_cta, buttons });
                        }}>
                          <option value="call">Call</option>
                          <option value="sms">Message</option>
                          <option value="link">Link</option>
                        </select>
                        <input className="input" placeholder="Label" value={btn.label} onChange={(e) => {
                          const buttons = [...(s.mobile_cta?.buttons ?? [])]; buttons[i] = { ...btn, label: e.target.value }; set("mobile_cta", { ...s.mobile_cta, buttons });
                        }} />
                        <div className="flex flex-col gap-1">
                          <SvgPicker value={btn.icon_svg_id} svgs={svgs} onChange={(id) => {
                            const buttons = [...(s.mobile_cta?.buttons ?? [])]; buttons[i] = { ...btn, icon_svg_id: id ?? undefined }; set("mobile_cta", { ...s.mobile_cta, buttons });
                          }} />
                          {!btn.icon_svg_id ? (
                            <select className="input h-8 text-xs" value={btn.icon} onChange={(e) => {
                              const buttons = [...(s.mobile_cta?.buttons ?? [])]; buttons[i] = { ...btn, icon: e.target.value as typeof btn.icon }; set("mobile_cta", { ...s.mobile_cta, buttons });
                            }}>
                              {(["phone", "message", "star", "home", "mail", "calendar"] as const).map((ic) => <option key={ic} value={ic}>{ic} (fallback icon)</option>)}
                            </select>
                          ) : null}
                        </div>
                        <input className="input" placeholder={btn.type === "link" ? "/contact" : "Phone override (optional)"} value={btn.href ?? ""} onChange={(e) => {
                          const buttons = [...(s.mobile_cta?.buttons ?? [])]; buttons[i] = { ...btn, href: e.target.value }; set("mobile_cta", { ...s.mobile_cta, buttons });
                        }} />
                        <button type="button" aria-label="Remove" onClick={() => set("mobile_cta", { ...s.mobile_cta, buttons: (s.mobile_cta?.buttons ?? []).filter((_, j) => j !== i) })}>✕</button>
                      </div>
                    ))}
                    {(s.mobile_cta?.buttons?.length ?? 0) < 5 ? (
                      <button type="button" className="btn self-start border-dashed" onClick={() => set("mobile_cta", { ...s.mobile_cta, buttons: [...(s.mobile_cta?.buttons ?? []), { type: "link", label: "New button", icon: "star" }] })}>
                        + Add button
                      </button>
                    ) : null}
          </section>
        )}
        {tab === "contact" && (
          <section className="flex flex-col gap-3 border border-line bg-white p-4 md:p-5">
            <h2 className="text-base font-semibold">Contact & leads</h2>
                    {(["phone", "email", "address", "hours"] as const).map((k) => (
                      <label key={k} className="label capitalize">{k}<input className="input" value={s.contact?.[k] ?? ""} onChange={(e) => set("contact", { ...s.contact, [k]: e.target.value })} /></label>
                    ))}
                    <label className="label">Email new leads to (comma separated)
                      <input className="input" value={(s.lead_settings?.notify_emails ?? []).join(", ")}
                        onChange={(e) => set("lead_settings", { ...s.lead_settings, notify_emails: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} />
                    </label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="label">Email provider
                        <select className="input" value={s.email_provider ?? "zeptomail"} onChange={(e) => set("email_provider", e.target.value as "zeptomail" | "resend")}>
                          <option value="zeptomail">ZeptoMail</option>
                          <option value="resend">Resend</option>
                        </select>
                      </label>
                      <label className="label">SMS provider
                        <select className="input" value={s.sms_provider ?? "vonage"} onChange={(e) => set("sms_provider", e.target.value as "vonage" | "twilio")}>
                          <option value="vonage">Vonage</option>
                          <option value="twilio">Twilio</option>
                        </select>
                      </label>
                    </div>
                    <p className="text-xs text-muted">Switching here takes effect on the next message sent — no redeploy needed. Each provider's own API key is a Supabase secret and is never stored here; make sure the secret for whichever provider you pick is set, or sending will fail.</p>
                    <h3 className="mt-2 text-sm font-semibold">Agent contact card</h3>
                    <p className="text-xs text-muted">Shown on listing detail pages beside the contact form.</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {(["name", "title", "brokerage", "phone", "email"] as const).map((k) => (
                        <label key={k} className="label capitalize">{k === "phone" ? "Phone" : k}<input className="input" value={s.agent?.[k] ?? ""} onChange={(e) => set("agent", { ...s.agent, [k]: e.target.value })} placeholder={k === "name" ? "Rohit Sharma" : k === "title" ? "REALTOR®" : k === "brokerage" ? "Lombard Group Real Estate Inc., Brokerage" : k === "phone" ? "+14166057488" : k === "email" ? "rohit@getsetsold.ca" : ""} /></label>
                      ))}
                    </div>
                    <div className="label">Photo (SVG)<SvgPicker value={s.agent?.photo_svg_id ?? null} svgs={svgs} onChange={(id) => set("agent", { ...s.agent, photo_svg_id: id })} /></div>
                    <h3 className="mt-2 text-sm font-semibold">Local expert section</h3>
                    <p className="text-xs text-muted">Shown on city and neighbourhood pages. Agent name, photo, brokerage and phone come from the agent contact card above.</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="label">Service area line<input className="input" value={s.local_expert?.service_area ?? ""} onChange={(e) => set("local_expert", { ...s.local_expert, service_area: e.target.value })} placeholder="Serving {city} & surrounding areas" /></label>
                      <label className="label">Review rating<input className="input" value={s.local_expert?.review_rating ?? ""} onChange={(e) => set("local_expert", { ...s.local_expert, review_rating: e.target.value })} placeholder="5.0" /></label>
                      <label className="label">Review count<input className="input" value={s.local_expert?.review_count ?? ""} onChange={(e) => set("local_expert", { ...s.local_expert, review_count: e.target.value })} placeholder="63" /></label>
                      <label className="label">Listing fee<input className="input" value={s.local_expert?.listing_fee ?? ""} onChange={(e) => set("local_expert", { ...s.local_expert, listing_fee: e.target.value })} placeholder="1%" /></label>
                      <label className="label">Buyer cash-back<input className="input" value={s.local_expert?.cashback ?? ""} onChange={(e) => set("local_expert", { ...s.local_expert, cashback: e.target.value })} placeholder="$5,000" /></label>
                      <label className="label">Valuation URL<input className="input" value={s.local_expert?.valuation_url ?? ""} onChange={(e) => set("local_expert", { ...s.local_expert, valuation_url: e.target.value })} placeholder="/home-valuation" /></label>
                      <label className="label">Call button label<input className="input" value={s.local_expert?.call_label ?? ""} onChange={(e) => set("local_expert", { ...s.local_expert, call_label: e.target.value })} placeholder="Call Rohit Today" /></label>
                    </div>
                    <div className="flex flex-wrap gap-4">
                      <label className="label flex flex-row items-center gap-2">Show on city pages<input type="checkbox" checked={s.local_expert?.show_on_cities !== false} onChange={(e) => set("local_expert", { ...s.local_expert, show_on_cities: e.target.checked })} className="h-4 w-4" /></label>
                      <label className="label flex flex-row items-center gap-2">Show on neighbourhood pages<input type="checkbox" checked={s.local_expert?.show_on_neighbourhoods !== false} onChange={(e) => set("local_expert", { ...s.local_expert, show_on_neighbourhoods: e.target.checked })} className="h-4 w-4" /></label>
                    </div>
          </section>
        )}
        {tab === "content" && (<>
          <section className="flex flex-col gap-3 border border-line bg-white p-4 md:p-5">
            <h2 className="text-base font-semibold">Blog sidebar CTA</h2>
                    <p className="text-xs text-muted">Set once — shown automatically on every blog post's sidebar. No per-post setup needed.</p>
                    <label className="label">Heading<input className="input" value={s.blog_cta?.heading ?? ""} onChange={(e) => set("blog_cta", { ...s.blog_cta, heading: e.target.value })} /></label>
                    <label className="label">Text<textarea rows={2} className="textarea" value={s.blog_cta?.text ?? ""} onChange={(e) => set("blog_cta", { ...s.blog_cta, text: e.target.value })} /></label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="label">Button label<input className="input" value={s.blog_cta?.button_label ?? ""} onChange={(e) => set("blog_cta", { ...s.blog_cta, button_label: e.target.value })} /></label>
                      <label className="label">Button links to<input className="input" value={s.blog_cta?.button_href ?? ""} onChange={(e) => set("blog_cta", { ...s.blog_cta, button_href: e.target.value })} /></label>
                    </div>
          </section>
          <section className="flex flex-col gap-3 border border-line bg-white p-4 md:p-5">
            <h2 className="text-base font-semibold">Social profiles</h2>
                    <p className="text-xs text-muted">Set once here — the Social Links block reads this list automatically anywhere it's used, so you don't have to re-add your profiles every time.</p>
                    <label className="label">Icon size
                      <select className="input w-full sm:w-32" value={s.social_links?.size ?? "md"} onChange={(e) => set("social_links", { ...s.social_links, size: e.target.value as "xs" | "sm" | "md" | "lg" })}>
                        <option value="xs">X-Small</option><option value="sm">Small</option><option value="md">Medium</option><option value="lg">Large</option>
                      </select>
                    </label>
                    {(s.social_links?.items ?? []).map((it, i) => (
                      <div key={i} className="flex flex-col gap-2 rounded-lg border border-line p-2 sm:grid sm:grid-cols-[260px_minmax(0,1fr)_auto] sm:items-start">
                        <SvgPicker value={it.svg_id} svgs={svgs} onChange={(id) => {
                          const items = [...(s.social_links?.items ?? [])]; items[i] = { ...it, svg_id: id ?? "" }; set("social_links", { ...s.social_links, items });
                        }} />
                        <div className="flex flex-col gap-1.5">
                          <input className="input" placeholder="Profile link" value={it.href} onChange={(e) => {
                            const items = [...(s.social_links?.items ?? [])]; items[i] = { ...it, href: e.target.value }; set("social_links", { ...s.social_links, items });
                          }} />
                          <input className="input" placeholder="Label (e.g. Facebook)" value={it.label ?? ""} onChange={(e) => {
                            const items = [...(s.social_links?.items ?? [])]; items[i] = { ...it, label: e.target.value }; set("social_links", { ...s.social_links, items });
                          }} />
                        </div>
                        <button type="button" aria-label="Remove" onClick={() => set("social_links", { ...s.social_links, items: (s.social_links?.items ?? []).filter((_, j) => j !== i) })}>✕</button>
                      </div>
                    ))}
                    <button type="button" className="btn self-start border-dashed" onClick={() => set("social_links", { ...s.social_links, items: [...(s.social_links?.items ?? []), { svg_id: "", href: "" }] })}>
                      + Add profile
                    </button>
          </section>
        </>)}
        {tab === "seo" && (
          <section className="flex flex-col gap-3 border border-line bg-white p-4 md:p-5">
            <h2 className="text-base font-semibold">SEO</h2>
                    <label className="label">Title suffix<input className="input" value={s.seo_defaults.title_suffix} onChange={(e) => set("seo_defaults", { ...s.seo_defaults, title_suffix: e.target.value })} /></label>
                    <label className="label">Default meta description<textarea className="textarea" rows={3} value={s.seo_defaults.description} onChange={(e) => set("seo_defaults", { ...s.seo_defaults, description: e.target.value })} /></label>
                    <label className="label">Google Analytics 4 ID<input className="input" placeholder="G-XXXXXXXXXX" value={s.scripts?.ga4_id ?? ""} onChange={(e) => set("scripts", { ...s.scripts, ga4_id: e.target.value.trim() })} /></label>
                    <p className="text-xs text-muted">Sitemap: /sitemap.xml · robots: /robots.txt · LocalBusiness schema is added to the home page from your contact details.</p>
          </section>
        )}
        {tab === "ads" && (
          <section className="flex flex-col gap-3 border border-line bg-white p-4 md:p-5">
            <h2 className="text-base font-semibold">Ads</h2>
            <label className="label flex items-center gap-2">
              <input type="checkbox" checked={s.ads?.grid_ad_enabled ?? false} onChange={(e) => set("ads", { ...s.ads, grid_ad_enabled: e.target.checked })} className="h-4 w-4" />
              Show AdSense ad card in listing grids
            </label>
            <label className="label">AdSense code (paste your full ad unit code)
              <textarea className="input font-mono text-xs" rows={6} placeholder='<ins class="adsbygoogle" data-ad-client="ca-pub-..." data-ad-slot="..."></ins>' value={s.ads?.grid_ad_code ?? ""} onChange={(e) => set("ads", { ...s.ads, grid_ad_code: e.target.value })} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="label">Show after card #
                <input type="number" min={1} max={24} className="input" value={s.ads?.grid_ad_position ?? 3} onChange={(e) => set("ads", { ...s.ads, grid_ad_position: Math.max(1, Number(e.target.value) || 3) })} />
              </label>
              <label className="label">Repeat every N cards (0 = once)
                <input type="number" min={0} max={24} className="input" value={s.ads?.grid_ad_frequency ?? 0} onChange={(e) => set("ads", { ...s.ads, grid_ad_frequency: Math.max(0, Number(e.target.value) || 0) })} />
              </label>
            </div>
            <p className="text-xs text-muted">The ad appears as a card in the listing grid on /listings, city hubs, and neighbourhood pages — like Zolo and realtor.ca.</p>
            <label className="label flex items-center gap-2 border-t border-line pt-3">
              <input type="checkbox" checked={s.ads?.trends_ad_enabled ?? false} onChange={(e) => set("ads", { ...s.ads, trends_ad_enabled: e.target.checked })} className="h-4 w-4" />
              Show ad on market trends detail pages
            </label>
            <label className="label flex items-center gap-2 border-t border-line pt-3">
              <input type="checkbox" checked={s.ads?.boc_ad_enabled ?? false} onChange={(e) => set("ads", { ...s.ads, boc_ad_enabled: e.target.checked })} className="h-4 w-4" />
              Show ad on Bank of Canada rates guide page
            </label>
            <label className="label flex items-center gap-2 border-t border-line pt-3">
              <input type="checkbox" checked={s.ads?.guides_ad_enabled ?? false} onChange={(e) => set("ads", { ...s.ads, guides_ad_enabled: e.target.checked })} className="h-4 w-4" />
              Show ads on guides pages
            </label>
            <label className="label flex items-center gap-2 border-t border-line pt-3">
              <input type="checkbox" checked={s.ads?.calculators_ad_enabled ?? false} onChange={(e) => set("ads", { ...s.ads, calculators_ad_enabled: e.target.checked })} className="h-4 w-4" />
              Show ads on calculator pages
            </label>
            <label className="label flex items-center gap-2 border-t border-line pt-3">
              <input type="checkbox" checked={s.ads?.listing_ad_enabled ?? false} onChange={(e) => set("ads", { ...s.ads, listing_ad_enabled: e.target.checked })} className="h-4 w-4" />
              Show ads on listing detail pages
            </label>
            <div className="border-t border-line pt-3">
              <h3 className="mb-2 text-sm font-semibold">Promo Banners</h3>
              <label className="label flex items-center gap-2">
                <input type="checkbox" checked={s.promo?.buyer_enabled ?? false} onChange={(e) => set("promo", { ...s.promo, buyer_enabled: e.target.checked })} className="h-4 w-4" />
                Show buyer cashback banner on For Sale listings
              </label>
              <label className="label flex items-center gap-2">
                <input type="checkbox" checked={s.promo?.tenant_enabled ?? false} onChange={(e) => set("promo", { ...s.promo, tenant_enabled: e.target.checked })} className="h-4 w-4" />
                Show free rental service banner on For Rent listings
              </label>
              <label className="label">Service areas (cities, one per line — leave empty for all cities)
                <textarea className="textarea" rows={4} placeholder={"Caledonia\nHaldimand\nHamilton"} value={Array.isArray(s.promo?.cities) ? (s.promo.cities as string[]).join("\n") : ""} onChange={(e) => set("promo", { ...s.promo, cities: e.target.value.split("\n").map((c) => c.trim()).filter(Boolean) })} />
              </label>
              <p className="text-xs text-muted">Banners appear in the left panel before the ad slot, only on listings in these cities. Buyer banner shows the 0.25% cashback on the list price.</p>
            </div>
          </section>
        )}
      </div>

      <div className="mx-auto flex w-full max-w-3xl items-center gap-3 border-t border-line pt-4">
        <button type="button" className="btn-primary" onClick={save}>Save changes</button>
        {msg ? <span className="text-sm text-muted" role="status">{msg}</span> : null}
      </div>
    </div>
  );
}
