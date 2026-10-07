import { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SharedApplicationView } from "@/components/site/SharedApplicationView";

export const metadata: Metadata = {
  title: "Rental Application",
  robots: { index: false, follow: false },
};

export default async function SharedApplicationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  // RLS: public can only read unexpired shares.
  const { data: share } = await supabase
    .from("rental_application_shares")
    .select("token,expires_at,view_count,branding,snapshot")
    .eq("token", token)
    .maybeSingle();
  if (!share) notFound();

  // Bump view count (fire-and-forget).
  supabase
    .from("rental_application_shares")
    .update({ view_count: ((share as { view_count: number }).view_count ?? 0) + 1 })
    .eq("token", token)
    .then(() => {});

  return <SharedApplicationView share={share as {
    expires_at: string;
    branding: Record<string, string>;
    snapshot: { sections: { heading: string; fields: { label: string; value: unknown; heading?: boolean }[] }[]; submitted_at: string };
  }} />;
}
