import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { SharedApplicationView } from "@/components/site/SharedApplicationView";

export const metadata: Metadata = {
  title: "Shared Application",
  robots: { index: false, follow: false },
};

export default async function SharedApplicationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  // RLS: public can only read unexpired shares.
  const { data: share } = await supabase
    .from("form_shares")
    .select("token,expires_at,view_count,branding,snapshot")
    .eq("token", token)
    .maybeSingle();
  if (!share) return <ExpiredLinkView />;

  // Bump view count (fire-and-forget).
  supabase
    .from("form_shares")
    .update({ view_count: ((share as { view_count: number }).view_count ?? 0) + 1 })
    .eq("token", token)
    .then(() => {});

  const snap = (share as { snapshot: { form_name?: string; sections: { heading: string; fields: { label: string; value: unknown; heading?: boolean }[] }[]; submitted_at: string } }).snapshot;
  return <SharedApplicationView share={{ ...(share as { expires_at: string; branding: Record<string, string> }), snapshot: snap }} formName={snap.form_name ?? "Form"} />;
}

/** Friendly message for revoked or expired share links. */
function ExpiredLinkView() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f7f7] px-4">
      <div className="w-full max-w-md rounded-[var(--radius-lg)] bg-white p-8 text-center shadow-[var(--shadow-card)]">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#f7f7f7]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
        </div>
        <h1 className="text-[20px] font-bold text-[#111]">This link has expired</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-muted">
          This shared link is no longer available. It may have been revoked or reached its expiry date.
        </p>
        <p className="mt-3 text-[14px] text-muted">
          Please contact us for a new shareable link.
        </p>
        <a href="/" className="btn-primary mt-6 inline-block h-10 px-6 text-[14px] leading-10">
          Back to home page
        </a>
      </div>
    </div>
  );
}
