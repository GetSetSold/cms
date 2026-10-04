"use client";
/** Interactive checklist: checking an item strikes it through and fades it (legacy behavior). */
import { useState } from "react";

export function Checklist({ items }: { items: string[] }) {
  const [checked, setChecked] = useState<Set<number>>(new Set());

  const toggle = (i: number) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  return (
    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
      {items.map((item, i) => {
        const done = checked.has(i);
        return (
          <label
            key={i}
            className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-line bg-soft p-2.5 text-[13px] leading-snug text-ink transition hover:border-accent"
            style={done ? { textDecoration: "line-through", opacity: 0.5 } : undefined}
          >
            <input
              type="checkbox"
              checked={done}
              onChange={() => toggle(i)}
              className="mt-0.5 h-3.5 w-3.5 shrink-0"
              style={{ accentColor: "var(--c-accent)" }}
            />
            <span>{item}</span>
          </label>
        );
      })}
    </div>
  );
}
