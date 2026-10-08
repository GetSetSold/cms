"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

/** Modern black/white eye icon. */
export function EyeIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/** Lead link with click feedback: spinner while navigating, uses router for reliability. */
export function LeadLink({ id, children, className }: { id: string; children: React.ReactNode; className?: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function go(e: React.MouseEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    router.push(`/admin/leads/${id}`);
    // Clear the spinner if navigation doesn't complete (e.g. same page).
    setTimeout(() => setLoading(false), 4000);
  }

  return (
    <a href={`/admin/leads/${id}`} className={className} onClick={go}>
      <span className="flex items-center gap-2">
        {loading ? (
          <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-line border-t-[#111]" aria-label="Loading" />
        ) : (
          <EyeIcon className="h-4 w-4 shrink-0 text-[#111]" />
        )}
        <span className="min-w-0 flex-1">{children}</span>
      </span>
    </a>
  );
}
