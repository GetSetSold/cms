import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { LeadActions } from "@/components/admin/LeadActions";
import { LeadTabs } from "@/components/admin/LeadTabs";
import type { Lead, LeadFlow, LeadFlowEnrollment } from "@/lib/types";

/** Shared lead-detail body: full page and modal render the same content. */
export async function LeadDetailView({ id, showBackLink }: { id: string; showBackLink?: boolean }) {
  const { supabase } = await requireStaff(["admin", "sales"]);
  const [{ data: lead }, { data: activities }, { data: queue }, { data: enrollments }, { data: availableFlows }] =
    await Promise.all([
      supabase.from("leads").select("*").eq("id", id).maybeSingle(),
      supabase.from("lead_activities").select("*").eq("lead_id", id).order("created_at", { ascending: false }),
      supabase.from("follow_up_queue").select("*").eq("lead_id", id).eq("status", "pending").order("run_at"),
      supabase
        .from("lead_flow_enrollments")
        .select("*, flow:follow_up_sequences(*)")
        .eq("lead_id", id)
        .order("created_at", { ascending: false }),
      supabase.from("follow_up_sequences").select("*").eq("is_active", true).order("category").order("name"),
    ]);
  if (!lead) return null;
  const l = lead as Lead;

  return (
    <div className="grid gap-6 p-6 lg:grid-cols-[1fr_380px]">
      <div className="flex min-w-0 flex-col gap-5">
        {showBackLink ? (
          <Link href="/admin/leads" className="text-muted">
            ← Leads
          </Link>
        ) : null}
        <LeadTabs
          lead={l}
          activities={activities ?? []}
          queue={queue ?? []}
          enrollments={(enrollments ?? []) as LeadFlowEnrollment[]}
          availableFlows={(availableFlows ?? []) as LeadFlow[]}
        />
      </div>
      <LeadActions lead={l} pendingCount={queue?.length ?? 0} />
    </div>
  );
}
