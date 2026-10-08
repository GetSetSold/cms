"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ShareFormButton } from "./ShareFormButton";

type Attachment = {
  id: string;
  form_name: string;
  form_key: string;
  answers: Record<string, unknown>;
  filled_by: "staff" | "lead";
  created_at: string;
};

type Flow = { id: string; name: string; steps: { channel: string; delay_minutes?: number }[] };

function renderAnswer(v: unknown): string {
  if (v == null || v === "") return "—";
  if (Array.isArray(v)) {
    if (v.length && typeof v[0] === "object") {
      return v.map((row) =>
        Object.entries(row as Record<string, unknown>)
          .map(([k, val]) => `${k.replace(/_/g, " ")}: ${String(val)}`)
          .join(" · ")
      ).join(" | ");
    }
    return v.map(String).join(", ");
  }
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v);
}

/** Attached forms on a lead (staff fill-out or send-to-fill). */
export function AttachedForms({ leadId }: { leadId: string }) {
  const [items, setItems] = useState<Attachment[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [flows, setFlows] = useState<Flow[]>([]);
  const [flowFor, setFlowFor] = useState<string | null>(null);
  const [flowId, setFlowId] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const sb = createClient();
    sb.from("lead_form_attachments").select("*").eq("lead_id", leadId).order("created_at", { ascending: false })
      .then(({ data }) => setItems((data ?? []) as Attachment[]));
    sb.from("lead_flows").select("id,name,steps").eq("is_active", true).order("name")
      .then(({ data }) => setFlows((data ?? []) as Flow[]));
  }, [leadId]);

  async function startFlow() {
    if (!flowFor || !flowId) return;
    const flow = flows.find((f) => f.id === flowId);
    if (!flow) return;
    const sb = createClient();
    const { error } = await sb.from("lead_flow_enrollments").insert({ lead_id: leadId, flow_id: flow.id });
    if (error) { setMsg(error.message); return; }
    const now = Date.now();
    const queue = flow.steps.map((step, i) => ({
      lead_id: leadId, sequence_id: flow.id, step_index: i, channel: step.channel,
      run_at: new Date(now + (Number(step.delay_minutes) || 0) * 60_000).toISOString(),
    }));
    if (queue.length) await sb.from("follow_up_queue").insert(queue);
    setMsg(`Added to “${flow.name}”`); setFlowFor(null); setFlowId("");
  }

  if (!items.length) return null;

  return (
    <div className="card flex flex-col gap-3">
      <strong>Attached forms</strong>
      {msg ? <p className="text-sm text-muted" role="status">{msg}</p> : null}
      {items.map((a) => {
        const entries = Object.entries(a.answers ?? {});
        const isOpen = expanded === a.id;
        return (
          <div key={a.id} className="rounded-xl border border-line p-3">
            <button className="flex w-full items-center justify-between gap-2 text-left" onClick={() => setExpanded(isOpen ? null : a.id)}>
              <span>
                <span className="font-medium">{a.form_name}</span>
                <span className="ml-2 text-xs text-muted">
                  {a.filled_by === "staff" ? "filled by staff" : "filled by lead"} · {new Date(a.created_at).toLocaleDateString()}
                </span>
              </span>
              <span className="text-xs text-muted">{isOpen ? "Hide" : "View"} ({entries.length})</span>
            </button>
            {isOpen ? (
              <dl className="mt-3 flex flex-col">
                {entries.map(([k, v]) => (
                  <div key={k} className="flex items-baseline justify-between gap-4 border-b border-line/60 py-2 last:border-0">
                    <dt className="shrink-0 text-xs font-medium uppercase tracking-wide text-muted">{k.replace(/_/g, " ")}</dt>
                    <dd className="text-right text-[14px]">{renderAnswer(v)}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-2">
              {flowFor === a.id ? (
                <div className="flex flex-1 gap-2">
                  <select className="input flex-1" value={flowId} onChange={(e) => setFlowId(e.target.value)}>
                    <option value="">Choose a flow…</option>
                    {flows.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                  <button className="btn-primary" disabled={!flowId} onClick={startFlow}>Start</button>
                  <button className="btn" onClick={() => { setFlowFor(null); setFlowId(""); }}>Cancel</button>
                </div>
              ) : (
                <>
                  <button className="btn h-8 px-3 text-[12px]" onClick={() => setFlowFor(a.id)}>Start flow</button>
                  <ShareFormButton leadId={leadId} attachmentId={a.id} label="Share" />
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
