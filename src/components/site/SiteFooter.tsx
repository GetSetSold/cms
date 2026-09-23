import Link from "next/link";
import type { SiteSettings } from "@/lib/types";

export function SiteFooter({ settings }: { settings: SiteSettings }) {
  const c = settings.contact ?? {};
  return (
    <footer className="mx-auto grid max-w-7xl gap-8 px-5 pb-28 pt-16 text-[15px] md:grid-cols-4 md:px-10 md:pb-12">
      <div className="flex flex-col gap-3">
        <div className="font-display text-3xl">{settings.site_name}</div>
        {settings.footer?.tagline ? <p className="text-muted">{settings.footer.tagline}</p> : null}
        {c.address ? <p className="text-muted">{c.address}</p> : null}
      </div>
      <div className="flex flex-col gap-2.5">
        <strong>Pages</strong>
        {settings.navigation.map((n) => (
          <Link key={n.href} href={n.href} className="text-muted hover:text-ink">{n.label}</Link>
        ))}
      </div>
      <div className="flex flex-col gap-2.5">
        <strong>Contact</strong>
        {c.phone ? <a href={`tel:${c.phone}`} className="text-muted">{c.phone}</a> : null}
        {c.email ? <a href={`mailto:${c.email}`} className="text-muted">{c.email}</a> : null}
        {c.hours ? <span className="text-muted">{c.hours}</span> : null}
      </div>
      <div className="flex flex-col gap-2.5">
        <strong>Company</strong>
        <span className="text-muted">© {new Date().getFullYear()} {settings.site_name}</span>
        <Link href="/login" className="text-muted hover:text-ink">Staff login</Link>
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
