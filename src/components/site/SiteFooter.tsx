import Link from "next/link";
import type { SiteSettings } from "@/lib/types";

export function SiteFooter({ settings }: { settings: SiteSettings }) {
  const c = settings.contact ?? {};
  const columns = settings.footer?.columns ?? [];

  return (
    <footer className={`mx-auto grid max-w-7xl grid-cols-2 gap-8 px-5 pb-28 pt-16 text-[15px] md:px-10 md:pb-12 md:[grid-template-columns:1.4fr_repeat(${Math.max(columns.length, 1)},1fr)]`}>
      <div className="col-span-2 flex flex-col gap-3 md:col-span-1">
        <div className="font-display text-3xl">{settings.site_name}</div>
        {settings.footer?.tagline ? <p className="text-muted">{settings.footer.tagline}</p> : null}
        {c.address ? <p className="text-muted">{c.address}</p> : null}
        <div className="mt-1 flex flex-col gap-1.5">
          {c.phone ? <a href={`tel:${c.phone}`} className="text-muted hover:text-ink">{c.phone}</a> : null}
          {c.email ? <a href={`mailto:${c.email}`} className="text-muted hover:text-ink">{c.email}</a> : null}
          {c.hours ? <span className="text-muted">{c.hours}</span> : null}
        </div>
      </div>

      {columns.map((col, i) => (
        <div key={i} className="flex flex-col gap-2.5">
          {col.heading ? <strong>{col.heading}</strong> : null}
          {col.links.map((l) => (
            <Link key={l.href} href={l.href} className="text-muted hover:text-ink">{l.label}</Link>
          ))}
        </div>
      ))}

      <div className="col-span-2 flex flex-col gap-2.5 border-t border-line pt-6 text-sm text-muted md:col-span-1 md:border-0 md:pt-0">
        <span>© {new Date().getFullYear()} {settings.site_name}</span>
        <Link href="/login" className="hover:text-ink">Staff login</Link>
      </div>
    </footer>
  );
}

/** Sticky Call / Quote bar on phones */
export function MobileCtaBar({ settings }: { settings: SiteSettings }) {
  const phone = settings.contact?.phone;
  const cta = settings.header_cta;
  if (!phone && !cta?.label) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 gap-2.5 border-t border-line bg-white p-3 pb-[max(12px,env(safe-area-inset-bottom))] md:hidden">
      {phone ? (
        <a href={`tel:${phone}`} className="flex h-12 items-center justify-center rounded-full border border-ink font-medium">Call</a>
      ) : <span />}
      {cta?.label ? (
        <Link href={cta.href} className="flex h-12 items-center justify-center rounded-full bg-primary font-medium text-white">{cta.label}</Link>
      ) : null}
    </div>
  );
}
