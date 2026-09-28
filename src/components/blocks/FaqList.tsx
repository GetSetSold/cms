import { contrastRatio } from "@/lib/color";
import type { BlockCtx } from "./index";

export type FaqStyle = "lines" | "numbered" | "cards";
export const FAQ_STYLES: string[] = ["lines", "numbered", "cards"];
type Item = { q?: string; a?: string };

const cardShadow = "border-[length:var(--border-card-width)] border-line shadow-[var(--shadow-card)]";
// Static class maps (Tailwind can't see classes built from a variable).
const GRID: Record<number, string> = { 1: "md:grid-cols-1", 2: "md:grid-cols-2", 3: "md:grid-cols-3" };
const Q_SIZE: Record<number, string> = { 1: "md:text-2xl", 2: "md:text-xl", 3: "md:text-lg" };
const NOMARKER = "list-none [&::-webkit-details-marker]:hidden";

/** Split into N columns top-to-bottom (1–3 in the first column, 4–6 in the next…) so the
 *  page order, the numbering and the tab order all stay in the same sequence. Each column
 *  stacks independently, so opening one answer never shifts the other columns. */
function slug(q: string): string {
  return q.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60).replace(/-+$/, "");
}

function toColumns(items: Item[], cols: number): { item: Item; n: number; id: string }[][] {
  const per = Math.max(1, Math.ceil(items.length / cols));
  const out: { item: Item; n: number; id: string }[][] = [];
  const used = new Set<string>();
  items.forEach((item, i) => {
    // Deep-link anchor from the question itself (#faq-how-long-does-buying-take); unique within the block.
    let id = `faq-${slug(item.q ?? "") || i + 1}`;
    if (used.has(id)) id = `${id}-${i + 1}`;
    used.add(id);
    const c = Math.floor(i / per);
    (out[c] ??= []).push({ item, n: i + 1, id });
  });
  return out;
}

export function FaqList({ items, style, columns, ctx }: { items: Item[]; style: FaqStyle; columns: number; ctx: BlockCtx }) {
  const cols = toColumns(items, Math.min(Math.max(columns, 1), 3));
  const dark = !!ctx.dark;
  const head = dark ? "text-ground" : "text-ink";
  const body = dark ? "text-ground/75" : "text-muted";
  const rule = dark ? "border-white/20" : "border-line";
  const q = Q_SIZE[cols.length] ?? Q_SIZE[1];

  // Number color: the brand color only if it actually reads on this section's color.
  const bg = ctx.bg ?? (dark ? "#14142B" : "#FFFFFF");
  const brand = dark ? ctx.settings.theme?.accent : ctx.settings.theme?.primary;
  const numColor = brand && /^#[0-9a-f]{6}$/i.test(brand) && contrastRatio(brand, bg) >= 3 ? brand : dark ? "#FFFFFFD9" : "#14142B";

  const row = (f: Item, n: number, id: string) => {
    if (style === "numbered") {
      return (
        <details key={n} id={id} className={`group scroll-mt-24 border-t last:border-b ${rule}`}>
          <summary className={`grid cursor-pointer grid-cols-[2.75rem_1fr_auto] items-center gap-3 py-6 md:grid-cols-[4rem_1fr_auto] md:py-8 ${NOMARKER}`}>
            <span className="text-base font-semibold md:text-lg" style={{ color: numColor }}>{String(n).padStart(2, "0")}</span>
            <h3 className={`text-lg font-medium tracking-tight ${q} ${head}`}>{f.q}</h3>
            <span className={`flex h-11 w-11 items-center justify-center rounded-full md:h-14 md:w-14 ${dark ? "bg-white/10" : "bg-soft"}`}>
              <span aria-hidden className={`text-2xl leading-none transition-transform group-open:rotate-45 ${head}`}>+</span>
            </span>
          </summary>
          <p className={`pb-7 pl-14 pr-14 leading-relaxed md:pb-9 md:pl-[4.75rem] md:pr-20 md:text-lg ${body}`}>{f.a}</p>
        </details>
      );
    }
    if (style === "cards") {
      return (
        <details key={n} id={id} className={`group scroll-mt-24 overflow-hidden rounded-[var(--radius-lg)] p-5 md:p-6 ${dark ? "bg-white/10" : `bg-white ${cardShadow}`}`}>
          <summary className={`flex cursor-pointer items-center justify-between gap-4 ${NOMARKER}`}>
            <h3 className={`text-lg font-semibold ${q} ${head}`}>{f.q}</h3>
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-transform group-open:rotate-180 ${dark ? "bg-white/15 text-white" : "bg-primary/10 text-primary"}`}>
              <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
            </span>
          </summary>
          <p className={`mt-4 pr-14 leading-relaxed md:text-lg ${body}`}>{f.a}</p>
        </details>
      );
    }
    return (
      <details key={n} id={id} className={`group scroll-mt-24 border-t py-6 last:border-b md:py-8 ${rule}`}>
        <summary className={`flex cursor-pointer items-center justify-between gap-4 ${NOMARKER}`}>
          <h3 className={`text-lg font-semibold ${q} ${head}`}>{f.q}</h3>
          <span aria-hidden className={`text-3xl leading-none transition-transform group-open:rotate-45 ${head}`}>+</span>
        </summary>
        <p className={`pt-4 pr-10 leading-relaxed md:text-lg ${body}`}>{f.a}</p>
      </details>
    );
  };

  return (
    <div className={`grid gap-x-10 gap-y-3 md:gap-x-14 ${GRID[cols.length] ?? GRID[1]}`}>
      {cols.map((col, ci) => (
        <div key={ci} className={`flex flex-col ${style === "cards" ? "gap-3 md:gap-4" : ""}`}>{col.map(({ item, n, id }) => row(item, n, id))}</div>
      ))}
    </div>
  );
}
