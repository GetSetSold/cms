"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FormSubmissionCard, type FormSubmission } from "./FormSubmissionCard";

type Attachment = {
  id: string;
  form_id: string;
  form_name: string;
  form_key: string;
  answers: Record<string, unknown>;
  filled_by: "staff" | "lead";
  created_at: string;
};

type FormSection = { id: string; heading?: string; fields: { key: string; label: string; type: string; options?: string[]; subfields?: { key: string; label: string; type: string }[]; repeat_label?: string }[] };

/** Attached forms on a lead — unified card layout for every submission. */
export function AttachedForms({ leadId }: { leadId: string }) {
  const [submissions, setSubmissions] = useState<(FormSubmission & { leadId: string })[]>([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const sb = createClient();
    sb.from("lead_form_attachments").select("*").eq("lead_id", leadId).order("created_at", { ascending: false })
      .then(async ({ data }) => {
        const atts = (data ?? []) as Attachment[];
        const formIds = [...new Set(atts.map((a) => a.form_id))];
        const defs: Record<string, FormSection[]> = {};
        for (const fid of formIds) {
          const { data: f } = await sb.from("forms").select("sections").eq("id", fid).maybeSingle();
          if (f) defs[fid] = ((f as { sections: FormSection[] }).sections ?? []) as FormSection[];
        }
        setSubmissions(atts.map((a) => ({
          id: a.id,
          leadId,
          formName: a.form_name,
          formKey: a.form_key,
          subtitle: `${a.filled_by === "staff" ? "Filled by staff" : "Filled by lead"} · ${new Date(a.created_at).toLocaleDateString()}`,
          answers: a.answers,
          sections: defs[a.form_id] ?? [],
          onSave: async (answers) => {
            const { error } = await sb.from("lead_form_attachments").update({ answers }).eq("id", a.id);
            if (error) return error.message;
            setSubmissions((prev) => prev.map((s) => (s.id === a.id ? { ...s, answers } : s)));
            return null;
          },
        })));
      });
  }, [leadId]);

  if (!submissions.length) return null;

  return (
    <div className="card flex flex-col !gap-0 !p-0">
      {msg ? <p className="p-6 pb-0 text-sm text-muted" role="status">{msg}</p> : null}
      {submissions.map((s, i) => (
        <div key={s.id} className={`px-6 py-4 ${i > 0 ? "border-t border-line" : ""}`}>
          <FormSubmissionCard submission={s} bare />
        </div>
      ))}
    </div>
  );
}
