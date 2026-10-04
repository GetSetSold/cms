import type { GuideMeta, GuideSection } from "@/lib/guides/types";
import { Checklist } from "./Checklist";

/**
 * Guide body: intro card with guide-color left border, then one white card
 * per section (colored bar heading, paragraphs, interactive checklist).
 * All copy comes verbatim from the registry.
 */
export function GuideContent({
  guide,
  sections,
}: {
  guide: GuideMeta;
  sections: GuideSection[];
}) {
  return (
    <div>
      <div
        className="mb-5 rounded-xl border border-line bg-white p-5 shadow-sm"
        style={{ borderLeft: `4px solid ${guide.color}` }}
      >
        <p className="text-[15px] leading-8 text-muted">{guide.intro}</p>
      </div>

      {sections.map((s, i) => (
        <section key={i} className="mb-4 rounded-xl border border-line bg-white p-5 shadow-sm">
          <h2 className="mb-3 flex items-center gap-2 border-b border-line pb-2 text-[16px] font-bold text-ink">
            <span
              aria-hidden
              className="block h-5 w-1 shrink-0 rounded"
              style={{ backgroundColor: guide.color }}
            />
            {s.heading}
          </h2>
          {s.paragraphs.map((p, j) => (
            <p key={j} className="mb-3 text-[14px] leading-7 text-ink last:mb-0">
              {p}
            </p>
          ))}
          {s.checklist.length > 0 && (
            <>
              <h3
                className="mt-4 text-[11px] font-bold uppercase tracking-wider"
                style={{ color: guide.color }}
              >
                Checklist
              </h3>
              <Checklist items={s.checklist} color={guide.color} />
            </>
          )}
        </section>
      ))}
    </div>
  );
}
