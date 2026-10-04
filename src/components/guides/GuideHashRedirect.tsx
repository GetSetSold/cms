"use client";
/** Legacy ?c=<id> and #<id> guide URLs → canonical /guides/<id>. */
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LEGACY_IDS, getGuide } from "@/lib/guides/registry";

export function GuideHashRedirect() {
  const router = useRouter();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash.replace("#", "");
    const raw = params.get("c") || hash;
    if (!raw) return;
    const id =
      (LEGACY_IDS as Record<string, string>)[raw] ?? (getGuide(raw) ? raw : null);
    if (id) router.replace(`/guides/${id}`);
  }, [router]);
  return null;
}
