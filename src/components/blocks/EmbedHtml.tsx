"use client";
import { useEffect, useRef } from "react";

/** For third-party embed snippets (Elfsight, review widgets, chat widgets,
 *  etc.) — the kind of thing you paste in whole from another service.
 *  Setting innerHTML never executes <script> tags it contains (that's a
 *  deliberate browser behavior, not a bug) — so this re-creates each script
 *  tag as a real DOM node after the markup is in place, which does run. */
export function EmbedHtml({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !html) return;
    el.innerHTML = html;

    const scripts = Array.from(el.querySelectorAll("script"));
    for (const old of scripts) {
      const fresh = document.createElement("script");
      for (const attr of Array.from(old.attributes)) fresh.setAttribute(attr.name, attr.value);
      fresh.textContent = old.textContent;
      old.replaceWith(fresh);
    }

    return () => { el.innerHTML = ""; };
  }, [html]);

  return <div ref={ref} />;
}
