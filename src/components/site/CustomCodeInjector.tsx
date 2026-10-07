"use client";
import { useEffect } from "react";

/** Injects the sitewide custom code (Admin → Settings → Custom code) on public
 *  pages. Skips /admin and /login so staff tools stay clean. */
export function CustomCodeInjector() {
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith("/admin") || path.startsWith("/login")) return;
    if (document.getElementById("site-custom-code")) return;
    fetch("/api/site-code")
      .then((r) => r.json())
      .then(({ code }: { code?: string }) => {
        if (!code?.trim() || document.getElementById("site-custom-code")) return;
        const holder = document.createElement("div");
        holder.id = "site-custom-code";
        holder.style.display = "none";
        holder.appendChild(document.createRange().createContextualFragment(code));
        document.body.appendChild(holder);
      })
      .catch(() => {
        /* custom code is optional — never break the page */
      });
  }, []);
  return null;
}
