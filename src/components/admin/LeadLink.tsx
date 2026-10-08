"use client";
import { useState } from "react";
import Link from "next/link";

/** Modern black/white eye icon. */
export function EyeIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/** Lead link with click feedback: spinner while navigating. Uses Next.js Link for reliable client-side nav. */
export function LeadLink({ id, children, className }: { id: string; children: React.ReactNode; className?: string }) {
  const [loading, setLoading] = useState(false);

  return (
    <Link href={`/admin/leads/${id}`} prefetch className={className} onClick={() => setLoading(true)}>
      <span className="flex items-center gap-2">
        {loading ? (
          <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-line border-t-[#111]" aria-label="Loading" />
        ) : (
          <EyeIcon className="h-4 w-4 shrink-0 text-[#111]" />
        )}
        <span className="min-w-0 flex-1">{children}</span>
      </span>
    </Link>
  );
}
