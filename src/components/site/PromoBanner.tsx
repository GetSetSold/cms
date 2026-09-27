import { parsePromoBullets } from "@/lib/precon";
import type { Promo } from "@/lib/precon";

export function PromoBanner({ promo }: { promo: Promo }) {
  const bullets = parsePromoBullets(promo.bullets);
  const mid = Math.ceil(bullets.length / 2);
  const left = bullets.slice(0, mid);
  const right = bullets.slice(mid);

  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] bg-gradient-to-br from-[#1e3d6e] to-[#162840]">
      <div className="grid grid-cols-1 md:grid-cols-[7fr_3fr]">
        <div className="flex flex-col gap-4 border-b border-white/10 p-6 md:border-b-0 md:border-r md:p-10">
          {promo.badge ? <span className="w-fit rounded-full bg-primary px-3.5 py-1.5 text-[10px] font-extrabold uppercase tracking-widest text-white">★ {promo.badge}</span> : null}
          <h2 className="font-display text-xl font-bold text-white md:text-3xl">{promo.title}</h2>
          {promo.description ? <p className="max-w-xl text-sm leading-relaxed text-white/65 md:text-base">{promo.description}</p> : null}
          {bullets.length ? (
            <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
              {[left, right].map((col, i) => (
                <ul key={i} className="flex flex-col divide-y divide-white/10">
                  {col.map((b, j) => (
                    <li key={j} className="flex items-center gap-3 py-2.5 text-sm font-semibold text-white">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] text-white">✔</span>
                      {b}
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-primary/30 bg-primary/15">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
          </div>
          <p className="font-display text-lg font-bold text-white">Act Before<br />It Expires</p>
          <p className="max-w-[200px] text-xs text-white/45">Limited availability — speak with an agent today</p>
          <a href="#lead" className="flex h-12 w-full max-w-[240px] items-center justify-center rounded-lg bg-primary text-sm font-extrabold text-white">Claim This Offer →</a>
          <span className="text-[11px] text-white/30">🔒 No obligation required</span>
        </div>
      </div>
    </div>
  );
}
