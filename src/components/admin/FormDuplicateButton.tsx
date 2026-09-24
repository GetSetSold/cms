"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Spinner } from "./Spinner";

export function FormDuplicateButton({ formId }: { formId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function duplicate() {
    setBusy(true);
    const supabase = createClient();
    const { data: form } = await supabase.from("forms").select("*").eq("id", formId).single();
    if (!form) { setBusy(false); return; }
    const { id, created_at, updated_at, ...rest } = form;
    const { data: copy, error } = await supabase.from("forms").insert({
      ...rest, name: `${form.name} (copy)`, slug: `${form.slug}-copy-${Date.now().toString(36)}`, is_active: false,
    }).select("id").single();
    setBusy(false);
    if (!error && copy) router.push(`/admin/forms/${copy.id}`);
  }

  return (
    <button onClick={duplicate} disabled={busy} title="Duplicate form" className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-ground disabled:opacity-50">
      {busy ? <Spinner /> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></svg>}
    </button>
  );
}
