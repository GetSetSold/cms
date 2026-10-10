"use client";

import { useState, useEffect } from "react";

type Project = { id: string; slug: string; project_name: string; city: string | null };
type Subscriber = { id: string; email: string; first_name: string | null; is_active: boolean; created_at: string };
type Broadcast = { id: string; project_name: string; sent_count: number; failed_count: number; created_at: string };

export function PreconBroadcastAdmin() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [subs, setSubs] = useState<Subscriber[]>([]);
  const [history, setHistory] = useState<Broadcast[]>([]);
  const [projectSlug, setProjectSlug] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [confirmSend, setConfirmSend] = useState(false);

  async function refresh() {
    const [p, s, h] = await Promise.all([
      fetch("/api/admin/precon/projects").then((r) => r.json()).catch(() => ({})),
      fetch("/api/admin/precon-subscribers").then((r) => r.json()).catch(() => ({})),
      fetch("/api/admin/precon-broadcast").then((r) => r.json()).catch(() => ({})),
    ]);
    setProjects((p.projects ?? []).map((x: any) => ({ id: String(x.id), slug: x.slug, project_name: x.project_name, city: x.city })));
    setSubs(s.subscribers ?? []);
    setHistory(h.broadcasts ?? []);
  }
  useEffect(() => { refresh(); }, []);

  async function addSubscriber(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/precon-subscribers", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: newEmail, firstName: newName }),
    });
    const d = await res.json();
    if (res.ok) { setNewEmail(""); setNewName(""); refresh(); }
    else setResult(d.error || "Failed to add");
  }

  async function removeSubscriber(id: string) {
    if (!confirm("Remove this subscriber?")) return;
    await fetch(`/api/admin/precon-subscribers?id=${id}`, { method: "DELETE" });
    refresh();
  }

  async function sendTest() {
    if (!projectSlug || !testEmail) { setResult("Pick a project and enter a test email first."); return; }
    setSending(true); setResult(null);
    try {
      const res = await fetch("/api/admin/precon-broadcast", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_slug: projectSlug, test_email: testEmail }),
      });
      const d = await res.json();
      setResult(res.ok ? `Test sent to ${testEmail}.` : (d.error || "Test failed"));
    } finally { setSending(false); }
  }

  async function sendBroadcast() {
    if (!projectSlug) { setResult("Pick a project first."); return; }
    setSending(true); setResult(null); setConfirmSend(false);
    try {
      const res = await fetch("/api/admin/precon-broadcast", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_slug: projectSlug }),
      });
      const d = await res.json();
      setResult(res.ok
        ? `Broadcast done: ${d.sent} sent, ${d.failed} failed.`
        : (d.error || "Broadcast failed"));
      refresh();
    } finally { setSending(false); }
  }

  const inputCls = "rounded-lg border border-line bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none";
  const activeCount = subs.filter((s) => s.is_active).length;

  return (
    <div className="space-y-8">
      {/* 1. Pick project + send */}
      <section className="rounded-xl border border-line bg-white p-5">
        <h2 className="font-bold mb-1">1. Pick a project</h2>
        <p className="text-xs text-muted mb-4">The email uses the project page data: hero image, builder, incentives, models.</p>
        <div className="flex flex-wrap gap-3 items-center">
          <select value={projectSlug} onChange={(e) => setProjectSlug(e.target.value)} className={`${inputCls} min-w-[240px]`}>
            <option value="">Select project…</option>
            {projects.map((p) => (
              <option key={p.slug} value={p.slug}>{p.project_name}{p.city ? ` — ${p.city}` : ""}</option>
            ))}
          </select>
          {projectSlug && (
            <a href={`/api/precon-alerts/preview-single?slug=${projectSlug}`} target="_blank" rel="noreferrer"
              className="text-sm text-accent underline">Preview email</a>
          )}
        </div>

        <h2 className="font-bold mt-6 mb-1">2. Test it</h2>
        <div className="flex flex-wrap gap-3 items-center">
          <input value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="you@example.com"
            type="email" className={inputCls} />
          <button onClick={sendTest} disabled={sending}
            className="rounded-lg border border-line px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50">
            {sending ? "Sending…" : "Send test email"}
          </button>
        </div>

        <h2 className="font-bold mt-6 mb-1">3. Broadcast</h2>
        <p className="text-xs text-muted mb-3">Sends to <strong>{activeCount}</strong> active subscriber{activeCount === 1 ? "" : "s"}. This cannot be undone.</p>
        {!confirmSend ? (
          <button onClick={() => setConfirmSend(true)} disabled={sending || !projectSlug || activeCount === 0}
            className="rounded-lg bg-ink px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            Send to all {activeCount} subscribers
          </button>
        ) : (
          <div className="flex gap-3 items-center">
            <span className="text-sm font-medium">Really send to {activeCount} people?</span>
            <button onClick={sendBroadcast} disabled={sending}
              className="rounded-lg bg-red-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              {sending ? "Sending…" : "Yes, send now"}
            </button>
            <button onClick={() => setConfirmSend(false)} className="rounded-lg border border-line px-4 py-2.5 text-sm">
              Cancel
            </button>
          </div>
        )}
        {result && <p className="mt-3 text-sm font-medium">{result}</p>}
      </section>

      {/* Subscribers */}
      <section className="rounded-xl border border-line bg-white p-5">
        <h2 className="font-bold mb-4">Subscribers ({subs.length})</h2>
        <form onSubmit={addSubscriber} className="flex flex-wrap gap-3 mb-4">
          <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Email" type="email" required className={inputCls} />
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="First name (optional)" className={inputCls} />
          <button type="submit" className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white">Add</button>
        </form>
        <div className="max-h-64 overflow-y-auto divide-y divide-line text-sm">
          {subs.map((s) => (
            <div key={s.id} className="flex items-center justify-between py-2">
              <span className={!s.is_active ? "line-through text-muted" : ""}>
                {s.email}{s.first_name ? ` — ${s.first_name}` : ""}
                {!s.is_active && <span className="ml-2 text-xs">(unsubscribed)</span>}
              </span>
              <button onClick={() => removeSubscriber(s.id)} className="text-xs text-red-700 hover:underline">Remove</button>
            </div>
          ))}
          {subs.length === 0 && <p className="text-muted text-sm py-2">No subscribers yet.</p>}
        </div>
      </section>

      {/* History */}
      <section className="rounded-xl border border-line bg-white p-5">
        <h2 className="font-bold mb-4">Broadcast history</h2>
        <div className="divide-y divide-line text-sm">
          {history.map((b) => (
            <div key={b.id} className="flex items-center justify-between py-2">
              <span>{b.project_name}</span>
              <span className="text-muted text-xs">
                {b.sent_count} sent{b.failed_count ? `, ${b.failed_count} failed` : ""} · {new Date(b.created_at).toLocaleString()}
              </span>
            </div>
          ))}
          {history.length === 0 && <p className="text-muted text-sm py-2">No broadcasts yet.</p>}
        </div>
      </section>
    </div>
  );
}
