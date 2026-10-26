"use client";

import { useEffect, useState } from "react";

export function RateBroadcastAdmin() {
  const [count, setCount] = useState<number | null>(null);
  const [oldRate, setOldRate] = useState("");
  const [newRate, setNewRate] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [headline, setHeadline] = useState("");
  const [commentary, setCommentary] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/rate-broadcast").then((r) => r.json()).then((d) => setCount(d.activeSubscribers ?? 0));
  }, []);

  function buildPreview() {
    const q = new URLSearchParams({
      preview: "1", oldRate, newRate, effectiveDate, headline, commentary,
    });
    setPreviewUrl(`/api/admin/rate-broadcast?${q.toString()}`);
  }

  async function send(test: boolean) {
    if (!confirm(test ? `Send test to ${testEmail}?` : `Send to all ${count} subscribers? This cannot be undone.`)) return;
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/rate-broadcast", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oldRate: Number(oldRate), newRate: Number(newRate),
          effectiveDate, headline, commentary,
          test_email: test ? testEmail : undefined,
        }),
      });
      const d = await res.json();
      setResult(d.error ? `Error: ${d.error}` : `Sent: ${d.sent}, Failed: ${d.failed}`);
    } finally { setSending(false); }
  }

  const inputCls = "w-full rounded border border-line px-3 py-2 text-sm";

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        Sends to <strong>{count ?? "…"}</strong> active subscriber{count === 1 ? "" : "s"}. This cannot be undone.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <input value={oldRate} onChange={(e) => setOldRate(e.target.value)} placeholder="Old rate % (e.g. 3.00)" type="number" step="0.01" className={inputCls} />
        <input value={newRate} onChange={(e) => setNewRate(e.target.value)} placeholder="New rate % (e.g. 2.75)" type="number" step="0.01" className={inputCls} />
      </div>
      <input value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} placeholder="Effective date (e.g. October 29, 2026)" className={inputCls} />
      <input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Headline (e.g. Bank of Canada cuts rate to 2.75%)" className={inputCls} />
      <textarea value={commentary} onChange={(e) => setCommentary(e.target.value)} placeholder="Commentary — what this means for buyers/sellers (HTML allowed)"
        rows={6} className={inputCls} />

      <div className="flex flex-wrap gap-2">
        <button onClick={buildPreview} disabled={!headline}
          className="rounded bg-[#111] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          Preview email
        </button>
      </div>

      {previewUrl ? (
        <div className="overflow-hidden rounded-lg border border-line">
          <iframe src={previewUrl} className="h-[600px] w-full" title="Email preview" />
        </div>
      ) : null}

      <div className="flex flex-col gap-2 rounded-lg border border-line bg-white p-4">
        <p className="text-xs font-semibold">Send test</p>
        <div className="flex gap-2">
          <input value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="test@example.com"
            className="flex-1 rounded border border-line px-3 py-2 text-sm" />
          <button onClick={() => send(true)} disabled={sending || !testEmail || !headline}
            className="rounded bg-[#0099cc] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
            Send test
          </button>
        </div>
      </div>

      <button onClick={() => send(false)} disabled={sending || !headline || !count}
        className="w-fit rounded bg-red-600 px-6 py-2 text-sm font-medium text-white disabled:opacity-50">
        {sending ? "Sending…" : `Send to all ${count ?? ""} subscribers`}
      </button>
      {result ? <p className="text-sm">{result}</p> : null}
    </div>
  );
}
