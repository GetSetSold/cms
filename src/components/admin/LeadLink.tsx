"use client";
import { useState } from "react";
import Link from "next/link";

/** Lead link with click feedback: shows a spinner while navigating. */
export function LeadLink({ id, children, className }: { id: string; children: React.ReactNode; className?: string }) {
  const [loading, setLoading] = useState(false);
  return (
    <Link href={`/admin/leads/${id}`} className={className} onClick={() => setLoading(true)}>
      <span className="flex items-center gap-2">
        {loading ? (
          <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-line border-t-primary" aria-label="Loading" />
        ) : (
          <span className="shrink-0 text-muted" aria-hidden>👁</span>
        )}
        <span className="min-w-0">{children}</span>
      </span>
    </Link>
  );
}
