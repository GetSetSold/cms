"use client";
/**
 * Lead-capture + PDF download buttons for a guide detail page.
 * Mirrors the calculators' ReportButtons pattern:
 * - "Download PDF" → builds the guide PDF client-side and saves it directly.
 * - "Email This Guide" → lead modal (first name, last name, email).
 *   On submit: builds the PDF, POSTs it to the send-guide-report edge
 *   function (which stores the lead in CMS + emails the PDF via ZeptoMail).
 * - Remembers the visitor per guide for ~90 days to avoid repeat prompts.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { buildGuidePdfBase64, downloadGuidePdf } from "@/lib/guides/pdf";
import type { GuideMeta, GuideSection } from "@/lib/guides/types";

const REPORT_FN = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-guide-report`;
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
const STORE_KEY = "_gss_guide_lead2";

interface StoredLead {
  first?: string;
  last?: string;
  emailed?: Record<string, number>;
}

function readStore(): StoredLead {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as StoredLead) : {};
  } catch {
    return {};
  }
}
function writeStore(s: StoredLead): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}
function wasEmailed(guideId: string): boolean {
  const ts = readStore().emailed?.[guideId];
  return typeof ts === "number" && Date.now() - ts < NINETY_DAYS_MS;
}
function markEmailed(guideId: string, first: string, last: string): void {
  const s = readStore();
  s.first = first;
  s.last = last;
  s.emailed = { ...(s.emailed ?? {}), [guideId]: Date.now() };
  writeStore(s);
}

export function GuideReportButtons({
  guide,
  sections,
}: {
  guide: GuideMeta;
  sections: GuideSection[];
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [skipPrompt, setSkipPrompt] = useState(false);
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<{ first?: string; last?: string; email?: string }>({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (modalOpen) {
      const s = readStore();
      setFirst(s.first ?? "");
      setLast(s.last ?? "");
      setErrors({});
      setSendError(null);
      setSent(false);
      setTimeout(() => firstRef.current?.focus(), 100);
    }
  }, [modalOpen]);

  const onDownload = useCallback(async () => {
    await downloadGuidePdf(guide, sections);
  }, [guide, sections]);

  const onEmailClick = useCallback(() => {
    if (wasEmailed(guide.id)) {
      // Already captured for this guide — just download.
      setSkipPrompt(true);
      onDownload();
      setTimeout(() => setSkipPrompt(false), 4000);
    } else {
      setModalOpen(true);
    }
  }, [guide.id, onDownload]);

  const submit = useCallback(async () => {
    const errs: typeof errors = {};
    if (!first.trim()) errs.first = "First name is required.";
    if (!last.trim()) errs.last = "Last name is required.";
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      errs.email = "Enter a valid email address.";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSending(true);
    setSendError(null);
    try {
      const { base64, fileName } = await buildGuidePdfBase64(guide, sections);
      const res = await fetch(REPORT_FN, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guide_id: guide.id,
          guide_title: guide.title,
          first_name: first.trim(),
          last_name: last.trim(),
          email: email.trim().toLowerCase(),
          pdf_base64: base64,
          file_name: fileName,
          path: window.location.pathname,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok)
        throw new Error(data.error || "Could not send the guide. Please try again.");
      markEmailed(guide.id, first.trim(), last.trim());
      setSent(true);
      setTimeout(() => setModalOpen(false), 1500);
    } catch (e) {
      setSendError(e instanceof Error ? e.message : "Could not send the guide. Please try again.");
    } finally {
      setSending(false);
    }
  }, [first, last, email, guide, sections]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onDownload}
          style={{ background: guide.color }}
          className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] px-5 py-2.5 text-[14px] font-semibold text-white transition hover:opacity-90"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" /></svg>
          Download PDF
        </button>
        <button
          type="button"
          onClick={onEmailClick}
          style={{ borderColor: guide.color, color: guide.color }}
          className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] border px-5 py-2.5 text-[14px] font-semibold transition hover:bg-soft"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>
          Email This Guide
        </button>
        {skipPrompt && (
          <span className="text-[13px] text-muted">We already have your details for this guide — downloading directly.</span>
        )}
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !sending && setModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Email guide"
        >
          <div
            className="w-full max-w-md rounded-[var(--radius-md)] bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {sent ? (
              <div className="py-6 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7" /></svg>
                </div>
                <h3 className="text-[17px] font-bold text-ink">Guide on its way!</h3>
                <p className="mt-1 text-[14px] text-muted">Check your inbox — your PDF guide is on its way.</p>
              </div>
            ) : (
              <>
                <h3 className="text-[17px] font-bold text-ink">Get your free guide</h3>
                <p className="mt-1 text-[13.5px] text-muted">
                  Enter your details and we&apos;ll email you the <strong>{guide.title}</strong> PDF instantly.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-1 block text-[13px] font-semibold text-ink">First name</span>
                    <input
                      ref={firstRef}
                      type="text"
                      value={first}
                      onChange={(e) => setFirst(e.target.value)}
                      className={`w-full rounded-[var(--radius-sm)] border px-3 py-2.5 text-[15px] outline-none focus:border-accent ${errors.first ? "border-red-500" : "border-line"}`}
                      autoComplete="given-name"
                    />
                    {errors.first && <span className="mt-1 block text-[12px] text-red-600">{errors.first}</span>}
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[13px] font-semibold text-ink">Last name</span>
                    <input
                      type="text"
                      value={last}
                      onChange={(e) => setLast(e.target.value)}
                      className={`w-full rounded-[var(--radius-sm)] border px-3 py-2.5 text-[15px] outline-none focus:border-accent ${errors.last ? "border-red-500" : "border-line"}`}
                      autoComplete="family-name"
                    />
                    {errors.last && <span className="mt-1 block text-[12px] text-red-600">{errors.last}</span>}
                  </label>
                </div>
                <label className="mt-3 block">
                  <span className="mb-1 block text-[13px] font-semibold text-ink">Email</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") submit();
                    }}
                    className={`w-full rounded-[var(--radius-sm)] border px-3 py-2.5 text-[15px] outline-none focus:border-accent ${errors.email ? "border-red-500" : "border-line"}`}
                    autoComplete="email"
                    placeholder="you@example.com"
                  />
                  {errors.email && <span className="mt-1 block text-[12px] text-red-600">{errors.email}</span>}
                </label>
                {sendError && <p className="mt-3 text-[13px] font-medium text-red-600">{sendError}</p>}
                <div className="mt-5 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={onDownload}
                    disabled={sending}
                    className="text-[13.5px] font-medium text-muted underline underline-offset-2 hover:text-ink"
                  >
                    Skip — Download Directly
                  </button>
                  <button
                    type="button"
                    onClick={submit}
                    disabled={sending}
                    style={{ background: guide.color }}
                    className="rounded-[var(--radius-sm)] px-6 py-2.5 text-[14px] font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                  >
                    {sending ? "Sending…" : "Email PDF Guide"}
                  </button>
                </div>
                <p className="mt-4 text-center text-[11px] leading-relaxed text-muted">
                  Your information is kept confidential. By continuing, you agree to be contacted by
                  Rohit Sharma, Real Estate Agent.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
