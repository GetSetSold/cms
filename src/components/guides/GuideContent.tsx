import type { GuideMeta, GuideSection } from "@/lib/guides/types";
import { Checklist } from "./Checklist";

/**
 * Guide body: intro card, then one white card per section
 * (heading + hairline divider, paragraphs, interactive checklist).
 * Minimal site theme: black/white/blue only. All copy verbatim from the registry.
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
      <div className="mb-5 rounded-xl border border-line bg-white p-5 shadow-sm">
        <p className="text-[15px] leading-8 text-muted">{guide.intro}</p>
      </div>

      {sections.map((s, i) => (
        <section key={i} className="mb-4 rounded-xl border border-line bg-white p-5 shadow-sm">
          <h2 className="mb-3 border-b border-line pb-2 text-[16px] font-bold text-ink">
            {s.heading}
          </h2>
          {s.paragraphs.map((p, j) => (
            <p key={j} className="mb-3 text-[14px] leading-7 text-ink last:mb-0">
              {p}
            </p>
          ))}
          {s.checklist.length > 0 && (
            <>
              <h3 className="mt-4 text-[11px] font-bold uppercase tracking-wider text-ink">
                Checklist
              </h3>
              <Checklist items={s.checklist} />
            </>
          )}
        </section>
      ))}
    </div>
  );
}
