"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/**
 * Shows login state in the header: "My Alerts" if logged in, nothing if not.
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

  if (!email) return null;

  return (
    <Link href="/property-alerts/manage"
      className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink hover:text-[#0066CC] md:text-[15px]"
      title={email}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
      <span className="hidden lg:inline">My Alerts</span>
    </Link>
  );
}
