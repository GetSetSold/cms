type View = "grid" | "split" | "map";

export function ViewToggle({ view, hrefFor }: { view: View; hrefFor: (v: View) => string }) {
  const opts: { key: View; label: string; icon: string }[] = [
    { key: "grid", label: "Grid", icon: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" },
    { key: "split", label: "Split", icon: "M3 4h8v16H3zM13 4h8v16h-8z" },
    { key: "map", label: "Map", icon: "M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2ZM9 4v14M15 6v14" },
  ];
  return (
    <div className="flex gap-1 rounded-xl bg-white p-1">
      {opts.map((o) => (
        <a key={o.key} href={hrefFor(o.key)}
          className={`flex h-10 items-center gap-1.5 rounded-lg px-3.5 text-sm font-medium ${view === o.key ? "bg-primary text-white" : "text-muted hover:bg-ground"}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={o.icon} /></svg>
          {o.label}
        </a>
      ))}
    </div>
  );
}
