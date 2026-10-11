/** Shared section header: blue eyebrow label + bold heading + gradient bar, left-aligned. */
export function PreconSectionHeader({ eyebrow, heading, dark }: { eyebrow: string; heading: string; dark?: boolean }) {
  return (
    <div className="flex flex-col items-start gap-3 pb-2 text-left">
      <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-primary">{eyebrow}</span>
      <h2 className={`font-display text-2xl font-bold md:text-4xl ${dark ? "text-white" : "text-ink"}`}>{heading}</h2>
      <span className="h-[3px] w-12 rounded-[var(--radius-btn,999px)] bg-gradient-to-r from-primary to-primary/20" />
    </div>
  );
}
