"use client";
import { usePathname } from "next/navigation";

/** Renders the sitewide custom code (Admin → Settings → Custom code) on public
 *  pages. Skips /admin and /login so staff tools stay clean. Rendered
 *  server-side so third-party scripts execute as normal page scripts. */
export function CustomCodeSlot({ code }: { code: string }) {
  const pathname = usePathname();
  if (!code?.trim()) return null;
  if (pathname.startsWith("/admin") || pathname.startsWith("/login")) return null;
  return (
    <div
      id="site-custom-code"
      style={{ display: "none" }}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: code }}
    />
  );
}
