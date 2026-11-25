"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Quietly re-renders the Visitors page every 10 seconds so the live
 *  view stays current without a manual refresh. */
export function VisitorsAutoRefresh() {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 10_000);
    return () => clearInterval(t);
  }, [router]);
  return null;
}
