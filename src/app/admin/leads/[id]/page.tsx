import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { LeadActions } from "@/components/admin/LeadActions";
import type { Lead } from "@/lib/types";

const DOT: Record<string, string> = {
  sms_out: "bg-primary", email_out: "bg-primary", sms_in: "bg-accent", note: "bg-ink", status_change: "bg-[#8A8E97]", system: "bg-line",
};
const LABEL: Record<string, string> = {
  sms_out: "SMS sent", email_out: "Email sent", sms_in: "SMS received", note: "Note", status_change: "Status changed", system: "System",
};

export default async function LeadDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireStaff(["admin", "sales"]);
  const [{ data: lead }, { data: activities }, { data: queue }] = await Promise.all([
    supabase.from("leads").select("*").eq("id", id).maybeSingle(),
    supabase.from("lead_activities").select("*").eq("lead_id", id).order("created_at", { ascending: false }),
    supabase.from("follow_up_queue").select("*").eq("lead_id", id).eq("status", "pending").order("run_at"),
  ]);
  if (!lead) notFound();
  const l = lead as Lead;
  const name = [l.first_name, l.last_name].filter(Boolean).join(" ") || "Unnamed lead";

  return (
    <div className="grid gap-6 p-6 lg:grid-cols-[1fr_380px]">
      <div className="flex flex-col gap-5">
        <Link href="/admin/leads" className="text-muted">← Leads</Link>
        <div className="card flex flex-col gap-4">
          <h1 className="text-2xl font-semibold">{name}</h1>
          <dl className="grid gap-4 text-[13px] sm:grid-cols-2">
            {[
              ["Phone", l.phone && <a href={`tel:${l.phone}`}>{l.phone}</a>],
              ["Email", l.email && <a href={`mailto:${l.email}`}>{l.email}</a>],
              ["Company", l.company], ["Service", l.service], ["Form", l.form_key], ["Page", l.source_path],
              ["SMS consent", l.sms_opted_out ? "Opted out (STOP)" : l.sms_opt_in ? "Opted in" : "No"],
              ["Received", new Date(l.created_at).toLocaleString()],
              ["Source", Object.entries(l.utm ?? {}).map(([k, v]) => `${k}=${v}`).join(" · ") || "Direct"],
            ].map(([k, v]) => (
              <div key={k as string}><dt className="text-muted">{k}</dt><dd className="text-[15px]">{v || "—"}</dd></div>
            ))}
          </dl>
          {l.message ? <div className="rounded-lg bg-ground p-4 text-[15px] leading-relaxed">{l.message}</div> : null}
        </div>

        <div className="card flex flex-col gap-4">
          <strong>Timeline</strong>
          {(queue ?? []).map((q) => (
            <div key={q.id} className="flex gap-3">
              <div className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border-2 border-dashed border-[#B5AFA2]" />
              <div><div className="font-medium text-muted">Scheduled {q.channel}</div><div className="text-xs text-muted">{new Date(q.run_at).toLocaleString()}</div></div>
            </div>
          ))}
          {(activities ?? []).map((a) => (
            <div key={a.id} className="flex gap-3">
              <div className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${DOT[a.type] ?? "bg-line"}`} />
              <div>
                <div className="font-medium">{LABEL[a.type] ?? a.type}{a.meta?.automation ? " · automation" : ""}</div>
                {a.body ? <div className="whitespace-pre-line text-[13px] text-muted">{a.body}</div> : null}
                <div className="text-xs text-muted">{new Date(a.created_at).toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <LeadActions lead={l} pendingCount={queue?.length ?? 0} />
    </div>
  );
}
