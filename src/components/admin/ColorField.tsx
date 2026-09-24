"use client";

export function ColorField({ label, value, fallback, onChange, onReset }: {
  label: string; value: string | undefined; fallback: string; onChange: (v: string) => void; onReset: () => void;
}) {
  return (
    <div className="flex flex-col gap-1.5 text-[13px] text-muted">
      <span>{label}</span>
      <div className="flex items-center gap-2">
        <label className="flex h-8 w-9 cursor-pointer items-center justify-center overflow-hidden rounded border border-line">
          <input type="color" value={value || fallback} onChange={(e) => onChange(e.target.value)} className="h-10 w-10 cursor-pointer border-0 bg-transparent p-0" />
        </label>
        <span className="font-mono text-xs text-ink">{value || "default"}</span>
        {/* Outside the label on purpose — nesting a button inside a <label> that
            wraps the color input causes the browser to also re-trigger the
            input's own click when Reset is pressed, reopening the color picker
            instead of clearing it. */}
        <button type="button" className="ml-auto text-xs text-muted hover:text-ink" onClick={onReset}>Reset</button>
      </div>
    </div>
  );
}
