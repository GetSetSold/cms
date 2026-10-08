"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Opportunity = {
  id: string;
  title: string;
  type: string;
  stage: string;
  notes: string | null;
  created_at: string;
};

const STAGES = ["new", "active", "offer", "closed", "lost"];
const TYPE_LABELS: Record<string, string> = {
  tenant: "Tenant", buyer: "Buyer", seller: "Seller", landlord: "Landlord", investor: "Investor",
};

/** Deal-level tracking on a lead: what opportunity, which stage. */
export function Opportunities({ leadId }: { leadId: string }) {
  const [items, setItems] = useState<Opportunity[]>([]);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("tenant");
  const [msg, setMsg] = useState("");

  async function load() {
    const { data } = await createClient().from("opportunities").select("*").eq("lead_id", leadId).order("created_at", { ascending: false });
    setItems((data ?? []) as Opportunity[]);
  }
  useEffect(() => { load(); }, [leadId]);

  async function add() {
    if (!title.trim()) return;
    const { error } = await createClient().from("opportunities").insert({ lead_id: leadId, title: title.trim(), type });
    if (error) { setMsg(error.message); return; }
    setTitle(""); setAdding(false); setMsg(""); load();
  }

  async function setStage(id: string, stage: string) {
    const { error } = await createClient().from("opportunities").update({ stage, updated_at: new Date().toISOString() }).eq("id", id);
    if (!error) load();
  }

  async function remove(id: string) {
    if (!confirm("Remove this opportunity?")) return;
    await createClient().from("opportunities").delete().eq("id", id);
    load();
  }

  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <strong>Opportunities</strong>
        {!adding ? (
          <button className="btn h-8 px-3 text-[12px]" onClick={() => setAdding(true)}>Add</button>
        ) : null}
      </div>
      {msg ? <p className="text-sm text-muted" role="status">{msg}</p> : null}
      {adding ? (
        <div className="flex flex-col gap-2 rounded-xl bg-[#f7f7f7] p-3">
          <input className="input" placeholder="e.g. Tenant — 100 Lillian Way" value={title} onChange={(e) => setTitle(e.target.value)} />
          <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
            {Object.entries(TYPE_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
          <div className="flex gap-2">
            <button className="btn-primary" onClick={add}>Add</button>
            <button className="btn" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </div>
      ) : null}
      {items.length ? (
        <div className="flex flex-col gap-2">
          {items.map((o) => (
            <div key={o.id} className="flex items-center justify-between gap-3 rounded-xl bg-[#f7f7f7] p-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-[14px]">{o.title}</p>
                <p className="text-xs text-muted">{TYPE_LABELS[o.type] ?? o.type}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <select className="input h-8 py-1 text-[12px] capitalize" value={o.stage} onChange={(e) => setStage(o.id, e.target.value)}>
                  {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <button className="text-xs text-muted hover:text-red-600" onClick={() => remove(o.id)}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      ) : !adding ? (
        <p className="text-[13px] text-muted">No opportunities yet — track what deal this lead is working on.</p>
      ) : null}
    </div>
  );
}
