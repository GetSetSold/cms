import { parsePromoBullets } from "@/lib/precon";
import type { Promo } from "@/lib/precon";
import { IconStar, IconCheck, IconClockAlarm } from "./PreconIcons";

const card = "rounded-[var(--radius-lg)] border-[length:var(--border-card-width)] border-line shadow-[var(--shadow-card)] bg-white";

/** Single-column white promo card with black CTA. */
export function PromoBanner({ promo }: { promo: Promo }) {
  const bullets = parsePromoBullets(promo.bullets);

  return (
    <div className={`flex flex-col gap-5 p-6 md:p-8 ${card}`}>
      <div className="flex flex-wrap items-center gap-3">
        {promo.badge ? (
          <span className="flex items-center gap-1.5 rounded-[var(--radius-label)] bg-ink px-3.5 py-1.5 text-[10px] font-extrabold uppercase tracking-widest text-white">
            <IconStar className="h-3 w-3" />
            {promo.badge}
          </span>
        ) : null}
        <span className="flex items-center gap-1.5 text-[12px] font-semibold text-muted">
          <IconClockAlarm className="h-4 w-4" />
          Limited time
        </span>
      </div>
      <h3 className="font-display text-xl font-extrabold md:text-2xl">{promo.title}</h3>
      {promo.description ? <p className="max-w-2xl text-sm leading-relaxed text-muted md:text-[15px]">{promo.description}</p> : null}
      {bullets.length ? (
        <ul className="grid grid-cols-1 gap-x-8 gap-y-2.5 sm:grid-cols-2">
          {bullets.map((b, j) => (
            <li key={j} className="flex items-start gap-3 text-sm font-medium">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[var(--radius-btn,999px)] bg-ink text-white">
                <IconCheck className="h-3 w-3" />
              </span>
              {b}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-wrap items-center gap-4 pt-1">
        <a href="#lead" className="flex h-12 items-center rounded-[var(--radius-btn)] bg-ink px-8 text-sm font-bold text-white">
          Claim This Offer →
        </a>
        <span className="text-[12px] text-muted">No obligation required</span>
      </div>
    </div>
  );
}
