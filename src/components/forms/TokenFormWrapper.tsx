"use client";
import { useEffect, useState } from "react";
import { CmsFormRenderer } from "@/components/blocks/CmsFormRenderer";
import type { CmsForm } from "@/lib/types";

/** Wraps a form opened via a send-to-fill token (?t=...). Validates the token,
 *  shows who it's for, and attaches answers to the existing lead on submit. */
export function TokenFormWrapper({ form, token }: { form: CmsForm; token: string }) {
  const [status, setStatus] = useState<"loading" | "ok" | "bad">("loading");
  const [leadName, setLeadName] = useState("");

  useEffect(() => {
    fetch(`/api/lead-form-tokens?t=${encodeURIComponent(token)}`)
      .then(async (r) => {
        if (!r.ok) { setStatus("bad"); return; }
        const data = await r.json();
        setLeadName(data.lead_name ?? "");
        setStatus("ok");
      })
      .catch(() => setStatus("bad"));
  }, [token]);

  async function submitAnswers(answers: Record<string, unknown>): Promise<true | string> {
    try {
      const res = await fetch("/api/lead-form-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, answers }),
      });
      const data = await res.json();
      if (!res.ok) return data.error ?? "Failed to submit.";
      return true;
    } catch {
      return "Failed to submit. Please try again.";
    }
  }

  if (status === "loading") {
    return <p className="py-10 text-center text-muted">Loading…</p>;
  }
  if (status === "bad") {
    return (
      <div className="py-10 text-center">
        <p className="text-lg font-semibold">This link is invalid or has expired.</p>
        <p className="mt-2 text-muted">Please ask for a new link.</p>
      </div>
    );
  }

  return (
    <div>
      {leadName ? (
        <p className="mb-6 rounded-xl bg-[#f7f7f7] px-4 py-3 text-[14px] text-muted">
          You're filling this out for <strong className="text-ink">{leadName}</strong>.
        </p>
      ) : null}
      <CmsFormRenderer form={form} onSubmitAnswers={submitAnswers} />
    </div>
  );
}
