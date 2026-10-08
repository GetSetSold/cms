import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { LEAD_STATUSES, type Lead } from "@/lib/types";
import { AddLeadButton } from "@/components/admin/AddLeadButton";
import { LeadLink } from "@/components/admin/LeadLink";

// One color per stage — light column tint, a matching dot/border accent — so the board reads at a
// glance instead of every column looking the same.
const STATUS_STYLE: Record<string, { bg: string; text: string; dot: string; border: string }> = {
  new: { bg: "bg-[#EAF1FD]", text: "text-[#1D4ED8]", dot: "bg-[#3B82F6]", border: "border-[#3B82F6]" },
  contacted: { bg: "bg-[#FDF3E4]", text: "text-[#92600B]", dot: "bg-[#F59E0B]", border: "border-[#F59E0B]" },
  qualified: { bg: "bg-[#F1ECFB]", text: "text-[#6D28D9]", dot: "bg-[#8B5CF6]", border: "border-[#8B5CF6]" },
  proposal: { bg: "bg-[#FCEAE4]", text: "text-[#B4480F]", dot: "bg-[#F97316]", border: "border-[#F97316]" },
  won: { bg: "bg-[#E7F5EC]", text: "text-[#0F7A3D]", dot: "bg-[#22C55E]", border: "border-[#22C55E]" },
  lost: { bg: "bg-[#F1F1F2]", text: "text-[#6B7280]", dot: "bg-[#9CA3AF]", border: "border-[#9CA3AF]" },
};

const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 60) return `${m} min`;
  if (m < 1440) return `${Math.round(m / 60)} h`;
  return `${Math.round(m / 1440)} d`;
};

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ q?: string; form?: string; view?: string }> }) {
  const { q, form, view } = await searchParams;
  const { supabase } = await requireStaff(["admin", "sales"]);

  let query = supabase.from("leads").select("*").order("created_at", { ascending: false }).limit(500);
  if (q) {
    const safe = q.replace(/[%,()]/g, " ");
    query = query.or(`first_name.ilike.%${safe}%,last_name.ilike.%${safe}%,email.ilike.%${safe}%,phone.ilike.%${safe}%`);
  }
  if (form) query = query.eq("form_key", form);
  const { data } = await query;
  const leads = (data ?? []) as Lead[];
  const forms = [...new Set(leads.map((l) => l.form_key).filter(Boolean))] as string[];
  const name = (l: Lead) => [l.first_name, l.last_name].filter(Boolean).join(" ") || l.email || l.phone || "Unnamed";
  const board = view === "board";

  return (
    <div className="flex flex-col gap-5 p-6">
      <div className="flex items-center gap-3">
        <h1 className="font-display text-4xl">Leads</h1>
        <div className="ml-auto flex items-center gap-2">
          <AddLeadButton />
          <div className="flex rounded-[10px] bg-soft/70 p-1">
          <Link href={{ query: { q, form, view: "board" } }} className={`flex h-8 items-center rounded-[7px] px-3 ${board ? "bg-white shadow-sm" : "text-muted"}`}>Board</Link>
          <Link href={{ query: { q, form } }} className={`flex h-8 items-center rounded-[7px] px-3 ${!board ? "bg-white shadow-sm" : "text-muted"}`}>List</Link>
          </div>
        </div>
      </div>
      <form className="flex gap-2">
        {view ? <input type="hidden" name="view" value={view} /> : null}
        <input name="q" defaultValue={q} placeholder="Search name, email, phone" className="input h-10 flex-1" />
        <select name="form" defaultValue={form ?? ""} className="input h-10 w-48">
          <option value="">All forms</option>
          {forms.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <button className="btn">Filter</button>
      </form>

      {board ? (
        <div className="grid gap-2.5 overflow-x-auto md:grid-cols-6">
          {LEAD_STATUSES.map((st) => {
            const col = leads.filter((l) => l.status === st);
            const c = STATUS_STYLE[st];
            return (
              <div key={st} className={`flex min-w-[180px] flex-col gap-1.5 rounded-xl p-2 ${c.bg}`}>
                <div className="flex items-center justify-between px-1 pb-0.5">
                  <div className="flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${c.dot}`} /><strong className={`text-[13px] capitalize ${c.text}`}>{st}</strong></div>
                  <span className="text-xs text-muted">{col.length}</span>
                </div>
                {col.map((l) => (
                  <LeadLink key={l.id} id={l.id} className={`flex flex-col gap-1 rounded-lg border-l-[3px] bg-white p-2 hover:ring-2 hover:ring-primary ${c.border}`}>
                    <div className="flex justify-between gap-2"><strong className="truncate text-[13px]">{name(l)}</strong><span className="shrink-0 text-[11px] text-muted">{ago(l.created_at)}</span></div>
                    <div className="truncate text-[12px] text-muted">{[l.service, l.form_key].filter(Boolean).join(" · ")}</div>
                    <div className="flex flex-wrap gap-1 text-[10px]">
                      {l.sms_opt_in && !l.sms_opted_out ? <span className="rounded-full bg-[#E4F0EE] px-1.5 py-0.5 text-[#0A4540]">SMS ok</span> : null}
                      {l.sms_opted_out ? <span className="rounded-full bg-[#FBEBDD] px-1.5 py-0.5 text-[#8A3F12]">Opted out</span> : null}
                      {l.utm?.utm_source ? <span className="rounded-full bg-soft px-1.5 py-0.5 text-muted">{l.utm.utm_source}</span> : null}
                    </div>
                  </LeadLink>
                ))}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white">
          <table className="w-full text-left">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
              <tr><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Phone</th><th className="p-3">Form</th><th className="p-3">Status</th><th className="p-3">Received</th></tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id} className="border-b border-line/60 last:border-0">
                  <td className="p-3 font-medium"><LeadLink id={l.id} className="hover:text-primary">{name(l)}</LeadLink></td>
                  <td className="p-3">{l.email}</td><td className="p-3">{l.phone}</td><td className="p-3">{l.form_key}</td>
                  <td className="p-3 capitalize">{l.status}</td><td className="p-3 text-muted">{new Date(l.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
