"use client";
import { useEffect, useState } from "react";
import type { PaymentPlan, PaymentInstallment } from "@/lib/precon";

function InstallmentForm({ initial, onSave, onCancel }: { initial: Partial<PaymentInstallment>; onSave: (d: Partial<PaymentInstallment>) => void; onCancel: () => void }) {
  const [d, setD] = useState<Partial<PaymentInstallment>>(initial);
  const set = (k: string, v: any) => setD((x) => ({ ...x, [k]: v }));
  const num = (v: string) => (v === "" ? null : Number(v));
  return (
    <div className="flex flex-col gap-2 rounded-lg bg-white p-2.5">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <label className="label">Amount ($)<input className="input" type="number" min={0} value={d.amount ?? ""} onChange={(e) => set("amount", num(e.target.value))} /></label>
        <label className="label">Due (days)<input className="input" type="number" min={0} value={d.due_days ?? ""} onChange={(e) => set("due_days", num(e.target.value))} /></label>
        <label className="label">Order<input className="input" type="number" min={0} value={d.sort_order ?? ""} onChange={(e) => set("sort_order", num(e.target.value))} /></label>
        <label className="label">Description<input className="input" value={d.description ?? ""} onChange={(e) => set("description", e.target.value)} /></label>
      </div>
      <div className="flex gap-2">
        <button type="button" className="btn h-8 px-3 text-xs" onClick={onCancel}>Cancel</button>
        <button type="button" className="btn-primary h-8 px-3 text-xs" onClick={() => onSave(d)} disabled={d.amount == null}>Save</button>
      </div>
    </div>
  );
}

function InstallmentsManager({ planId }: { planId: string }) {
  const [rows, setRows] = useState<PaymentInstallment[]>([]);
  const [editing, setEditing] = useState<Partial<PaymentInstallment> | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/admin/precon/payment-installments?payment_plan_id=${encodeURIComponent(planId)}`)
      .then((r) => r.json())
      .then((b) => setRows(b.payment_installments ?? []))
      .catch(() => setError("Could not load installments."));
  }, [planId]);

  async function save(d: Partial<PaymentInstallment>) {
    setError("");
    const res = await fetch(d.id ? `/api/admin/precon/payment-installments/${d.id}` : "/api/admin/precon/payment-installments", {
      method: d.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...d, payment_plan_id: planId }),
    });
    const body = await res.json();
    if (!res.ok) return setError(body.error || "Something went wrong.");
    const saved = body.payment_installment as PaymentInstallment;
    const next = d.id ? rows.map((r) => (r.id === d.id ? saved : r)) : [...rows, saved];
    next.sort((a, b) => (a.sort_order ?? 9999) - (b.sort_order ?? 9999));
    setRows(next);
    setEditing(null);
  }

  async function remove(id: string) {
    if (!confirm("Delete this installment?")) return;
    const res = await fetch(`/api/admin/precon/payment-installments/${id}`, { method: "DELETE" });
    if (!res.ok) return setError((await res.json()).error || "Could not delete.");
    setRows(rows.filter((r) => r.id !== id));
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg bg-ground p-2.5">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">Installments</span>
        <span className="text-xs text-muted">{rows.length}</span>
        <button type="button" className="btn ml-auto h-7 px-2.5 text-xs" onClick={() => setEditing({})}>+ Add</button>
      </div>
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
      {editing ? <InstallmentForm initial={editing} onCancel={() => setEditing(null)} onSave={save} /> : null}
      {rows.map((r) => (
        <div key={r.id} className="flex items-center gap-3 rounded border border-line bg-white px-2.5 py-1.5 text-sm">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-soft text-xs font-bold text-muted">{r.sort_order ?? "–"}</span>
          <span className="font-semibold">${Number(r.amount).toLocaleString()}</span>
          <span className="text-muted">{r.due_days != null ? `day ${r.due_days}` : "no due date"}</span>
          <span className="min-w-0 flex-1 truncate text-muted">{r.description}</span>
          <div className="flex shrink-0 gap-3 text-xs">
            <button type="button" className="font-medium text-primary" onClick={() => setEditing(r)}>Edit</button>
            <button type="button" className="font-medium text-red-700" onClick={() => remove(r.id)}>Delete</button>
          </div>
        </div>
      ))}
      {!rows.length && !editing ? <p className="text-xs text-muted">No installments yet.</p> : null}
    </div>
  );
}

function PlanForm({ initial, onSave, onCancel }: { initial: Partial<PaymentPlan>; onSave: (d: Partial<PaymentPlan>) => void; onCancel: () => void }) {
  const [d, setD] = useState<Partial<PaymentPlan>>(initial);
  const set = (k: keyof PaymentPlan, v: any) => setD((x) => ({ ...x, [k]: v }));
  const num = (v: string) => (v === "" ? null : Number(v));
  return (
    <div className="flex flex-col gap-2 rounded-lg bg-ground p-3">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <label className="label">Title<input className="input" value={d.title ?? ""} onChange={(e) => set("title", e.target.value)} /></label>
        <label className="label">Total amount ($)<input className="input" type="number" min={0} value={d.total_amount ?? ""} onChange={(e) => set("total_amount", num(e.target.value))} /></label>
        <label className="label">Total days<input className="input" type="number" min={0} value={d.total_days ?? ""} onChange={(e) => set("total_days", num(e.target.value))} /></label>
        <label className="label">Visible
          <select className="input" value={d.show === true ? "true" : d.show === false ? "false" : ""} onChange={(e) => set("show", e.target.value === "" ? null : e.target.value === "true")}>
            <option value="">—</option><option value="true">Yes</option><option value="false">No</option>
          </select>
        </label>
      </div>
      <div className="flex gap-2">
        <button type="button" className="btn h-8 px-3 text-xs" onClick={onCancel}>Cancel</button>
        <button type="button" className="btn-primary h-8 px-3 text-xs" onClick={() => onSave(d)} disabled={!d.title?.trim()}>Save</button>
      </div>
    </div>
  );
}

export function PaymentPlansManager({ projectId }: { projectId: string }) {
  const [plans, setPlans] = useState<PaymentPlan[]>([]);
  const [openPlan, setOpenPlan] = useState<string | null>(null);
  const [editing, setEditing] = useState<Partial<PaymentPlan> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/admin/precon/payment-plans?project_id=${encodeURIComponent(projectId)}`);
        const b = await res.json();
        if (!res.ok) throw new Error(b.error || "Load failed.");
        setPlans(b.payment_plans ?? []);
      } catch (e: any) { setError(e.message || "Could not load payment plans."); }
      setLoading(false);
    })();
  }, [projectId]);

  async function save(d: Partial<PaymentPlan>) {
    setError("");
    const res = await fetch(d.id ? `/api/admin/precon/payment-plans/${d.id}` : "/api/admin/precon/payment-plans", {
      method: d.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...d, project_id: projectId }),
    });
    const body = await res.json();
    if (!res.ok) return setError(body.error || "Something went wrong.");
    const saved = body.payment_plan as PaymentPlan;
    setPlans(d.id ? plans.map((p) => (p.id === d.id ? saved : p)) : [...plans, saved]);
    setEditing(null);
  }

  async function remove(id: string) {
    if (!confirm("Delete this payment plan and its installments?")) return;
    const res = await fetch(`/api/admin/precon/payment-plans/${id}`, { method: "DELETE" });
    if (!res.ok) return setError((await res.json()).error || "Could not delete.");
    setPlans(plans.filter((p) => p.id !== id));
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <strong className="text-sm">Payment plans</strong>
        <span className="rounded-full bg-ground px-2 py-0.5 text-xs text-muted">{loading ? "…" : plans.length}</span>
        <button type="button" className="btn ml-auto h-8 px-3 text-xs" onClick={() => setEditing({})}>+ Add plan</button>
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {editing ? <PlanForm initial={editing} onCancel={() => setEditing(null)} onSave={save} /> : null}
      {plans.map((p) => (
        <div key={p.id} className="flex flex-col gap-2 rounded-lg border border-line bg-white p-2.5">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setOpenPlan(openPlan === p.id ? null : p.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={`shrink-0 transition-transform ${openPlan === p.id ? "rotate-90" : ""}`}><path d="m9 6 6 6-6 6" /></svg>
              <span className="truncate text-sm font-medium">{p.title || "(untitled)"}</span>
              {p.total_amount != null ? <span className="shrink-0 text-xs text-muted">${Number(p.total_amount).toLocaleString()}</span> : null}
              {p.total_days != null ? <span className="shrink-0 text-xs text-muted">{p.total_days} days</span> : null}
              {p.show === false ? <span className="shrink-0 rounded-full bg-ground px-2 py-0.5 text-xs text-muted">hidden</span> : null}
            </button>
            <div className="flex shrink-0 gap-3 text-xs">
              <button type="button" className="font-medium text-primary" onClick={() => setEditing(p)}>Edit</button>
              <button type="button" className="font-medium text-red-700" onClick={() => remove(p.id)}>Delete</button>
            </div>
          </div>
          {openPlan === p.id ? <InstallmentsManager planId={p.id} /> : null}
        </div>
      ))}
      {!loading && !plans.length && !editing ? <p className="text-xs text-muted">No payment plans yet.</p> : null}
    </div>
  );
}
