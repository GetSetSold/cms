import { parsePromoBullets } from "@/lib/precon";
import type { Promo, PromoItem } from "@/lib/precon";
import { IconStar, IconCheck } from "./PreconIcons";
import { amenityIconFromUrl } from "./PreconAmenityIcons";

function ItemIcon({ iconUrl, title }: { iconUrl: string | null; title: string | null }) {
  const el = amenityIconFromUrl(iconUrl, title);
  if (el) {
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-btn,999px)] bg-white/15 [&>svg]:h-5 [&>svg]:w-5">
        {el}
      </span>
    );
  }
  if (iconUrl && (iconUrl.startsWith("http") || iconUrl.startsWith("/"))) {
    return <img src={iconUrl} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />;
  }
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-btn,999px)] bg-white/15">
      <IconCheck className="h-4 w-4" />
    </span>
  );
}

/** Black promo card — white pill badge on top, content row below. */
export function PromoBanner({ promo }: { promo: Promo }) {
  const bullets = parsePromoBullets(promo.bullets);
  const items = (promo.items ?? []).filter((it: PromoItem) => it.show !== false);

  return (
    <div className="rounded-[18px] bg-ink p-5 text-white md:p-6">
      <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-btn,999px)] bg-white px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink">
        <IconStar className="h-3 w-3" />
        {promo.badge ?? "Offer"} · Limited time
      </span>
      <div className="mt-3.5 flex flex-wrap items-center gap-4">
        <div className="min-w-[200px] flex-1">
          <h3 className="font-display text-[17px] font-extrabold md:text-lg">{promo.title}</h3>
          {promo.description ? <p className="mt-1 text-[13px] text-white/60">{promo.description}</p> : null}
          {items.length ? (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {items.map((it) => (
                <div key={it.id} className="flex items-start gap-3 rounded-xl bg-white/8 p-3">
                  <ItemIcon iconUrl={it.icon_url} title={it.title} />
                  <div className="min-w-0">
                    {it.badge ? (
                      <div className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-white/50">{it.badge}</div>
                    ) : null}
                    <div className="text-[13px] font-bold text-white/90">{it.title}</div>
                    {it.description ? <div className="mt-0.5 text-xs text-white/55">{it.description}</div> : null}
                  </div>
                </div>
              ))}
            </div>
          ) : bullets.length ? (
            <ul className="mt-3 grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
              {bullets.map((b, j) => (
                <li key={j} className="flex items-start gap-2.5 text-[13px] font-medium text-white/85">
                  <span className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-[var(--radius-btn,999px)] bg-white/15">
                    <IconCheck className="h-2.5 w-2.5" />
                  </span>
                  {b}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <a href="#lead" className="flex h-12 shrink-0 items-center rounded-[var(--radius-btn)] bg-white px-6 text-sm font-bold text-ink">
          Claim This Offer →
        </a>
      </div>
    </div>
  );
}
