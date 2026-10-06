export function PreconSectionHeader({ eyebrow, heading, dark }: { eyebrow: string; heading: string; dark?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 pb-2 text-center">
      <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-primary">{eyebrow}</span>
      <h2 className={`font-display text-2xl font-bold md:text-4xl ${dark ? "text-white" : "text-ink"}`}>{heading}</h2>
      <span className="h-[3px] w-14 rounded-[var(--radius-label)] bg-gradient-to-r from-primary to-ink" />
    </div>
  );
}
