import Link from "next/link";
import type { MobileCtaButton, SiteSettings } from "@/lib/types";
import { MobileCtaBarInner } from "./MobileCtaBarInner";

const DESKTOP_COLS: Record<number, string> = { 1: "md:grid-cols-1", 2: "md:grid-cols-2", 3: "md:grid-cols-3", 4: "md:grid-cols-4" };
const MOBILE_COLS: Record<number, string> = { 1: "grid-cols-1", 2: "grid-cols-2" };

const BRAND_ROW_TEMPLATE: Record<number, string> = {
  1: "md:[grid-template-columns:1.4fr_repeat(1,1fr)]",
  2: "md:[grid-template-columns:1.4fr_repeat(2,1fr)]",
  3: "md:[grid-template-columns:1.4fr_repeat(3,1fr)]",
  4: "md:[grid-template-columns:1.4fr_repeat(4,1fr)]",
};

export function SiteFooter({ settings }: { settings: SiteSettings }) {
  const c = settings.contact ?? {};
  const f = settings.footer ?? { rows: [] };
  const rows = f.rows ?? [];
  const [firstRow, ...restRows] = rows;

  return (
    <footer style={{ background: f.bg || undefined, color: f.text || undefined }}>
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-5 pb-28 pt-16 text-[15px] md:px-10 md:pb-12">
        {/* Row 1: brand block (wider) + this row's columns */}
        <div className={`grid gap-8 ${MOBILE_COLS[f.mobile_columns_per_row ?? 1]} ${BRAND_ROW_TEMPLATE[f.columns_per_row ?? 4]}`}>
          <div className="col-span-2 flex flex-col gap-3 md:col-span-1">
            <div className="font-display text-3xl">{settings.site_name}</div>
            {f.tagline ? <p className="opacity-75">{f.tagline}</p> : null}
            {c.address ? <p className="opacity-75">{c.address}</p> : null}
            <div className="mt-1 flex flex-col gap-1.5">
              {c.phone ? <a href={`tel:${c.phone}`} className="opacity-75 hover:opacity-100">{c.phone}</a> : null}
              {c.email ? <a href={`mailto:${c.email}`} className="opacity-75 hover:opacity-100">{c.email}</a> : null}
              {c.hours ? <span className="opacity-75">{c.hours}</span> : null}
            </div>
          </div>
          {(firstRow ?? []).map((col, i) => (
            <div key={i} className="flex flex-col gap-2.5">
              {col.heading ? <strong>{col.heading}</strong> : null}
              {col.links.map((l) => <Link key={l.href} href={l.href} className="opacity-75 hover:opacity-100">{l.label}</Link>)}
            </div>
          ))}
        </div>

        {/* Additional rows: full-width, clean grid of their own — never shares
            a track with the brand block, so column count changes never
            distort neighbouring content the way one shared grid did. */}
        {restRows.map((row, ri) => (
          <div key={ri} className={`grid gap-8 ${MOBILE_COLS[f.mobile_columns_per_row ?? 1]} ${DESKTOP_COLS[f.columns_per_row ?? 4]}`}>
            {row.map((col, i) => (
              <div key={i} className="flex flex-col gap-2.5">
                {col.heading ? <strong>{col.heading}</strong> : null}
                {col.links.map((l) => <Link key={l.href} href={l.href} className="opacity-75 hover:opacity-100">{l.label}</Link>)}
              </div>
            ))}
          </div>
        ))}

        <div className="flex flex-col gap-2.5 border-t pt-6 text-sm opacity-75" style={{ borderColor: f.text ? `${f.text}33` : undefined }}>
          <span>© {new Date().getFullYear()} {settings.site_name}</span>
          <Link href="/login" className="hover:opacity-100">Staff login</Link>
        </div>
      </div>
    </footer>
  );
}

function ctaHref(btn: MobileCtaButton, phone?: string) {
  if (btn.type === "call") return `tel:${btn.href || phone || ""}`;
  if (btn.type === "sms") return `sms:${btn.href || phone || ""}`;
  return btn.href || "#";
}

/** Sticky bottom bar on phones — up to 3 configurable buttons (Settings > Mobile bar).
 *  Server wrapper: resolves any custom icon SVGs from the library, then hands off to a
 *  client component for the active-route-aware part — keeps the same {settings} prop
 *  everywhere it's already used, so no page call sites need to change. */
export async function MobileCtaBar({ settings }: { settings: SiteSettings }) {
  const cfg = settings.mobile_cta ?? { buttons: [], shape: "rectangle" as const, size: "md" as const };
  const buttons = (cfg.buttons ?? []).slice(0, 3);
  if (!buttons.length) return null;

  const svgIds = buttons.map((b) => b.icon_svg_id).filter((id): id is string => !!id);
  let svgMarkup: Record<string, string> = {};
  if (svgIds.length) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data } = await supabase.from("svg_assets").select("id,markup").in("id", svgIds);
    svgMarkup = Object.fromEntries((data ?? []).map((s) => [s.id, s.markup as string]));
  }

  const resolved = buttons.map((btn) => ({
    label: btn.label,
    href: ctaHref(btn, settings.contact?.phone),
    iconSvgMarkup: btn.icon_svg_id ? svgMarkup[btn.icon_svg_id] : undefined,
    iconPreset: btn.icon,
  }));

  return <MobileCtaBarInner buttons={resolved} shape={cfg.shape ?? "rectangle"} size={cfg.size ?? "md"} layout={cfg.layout ?? "plain"} />;
}
