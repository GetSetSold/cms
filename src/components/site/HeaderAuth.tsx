"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/**
 * Header auth slot: always shows "My Alerts" (logged-out taps land on the
 * manage page's login form).
 */
export function HeaderAuth() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      setEmail(session?.user?.email ?? null);
    })();
  }, []);

  return (
    <>
      <span className="h-5 w-px bg-line" aria-hidden="true" />
      <Link href="/property-alerts/manage"
        className="inline-flex items-center gap-1.5 rounded-[var(--radius-btn)] bg-ink px-4 py-2 text-[13px] font-medium text-white hover:opacity-90"
        title={email ?? undefined}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        My Alerts
      </Link>
      <span className="h-5 w-px bg-line" aria-hidden="true" />
    </>
  );
}
