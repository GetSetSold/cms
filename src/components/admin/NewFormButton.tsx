"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export function NewFormButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function create() {
    setBusy(true); setError("");
    const name = "Untitled form";
    const supabase = createClient();
    const { data, error } = await supabase.from("forms").insert({
      name, slug: `${slugify(name)}-${Date.now().toString(36)}`, form_key: "form",
      fields: [
        { key: "name", label: "Name", type: "text", required: true },
        { key: "email", label: "Email", type: "email", required: true },
        { key: "phone", label: "Phone", type: "tel", required: false },
      ],
    }).select("id").single();
    setBusy(false);
    if (error) return setError(error.message);
    router.push(`/admin/forms/${data.id}`);
  }

  return (
    <div className="flex items-center gap-3">
      <button className="btn-primary self-start" disabled={busy} onClick={create}>{busy ? "Creating…" : "+ New form"}</button>
      {error ? <span className="text-sm text-red-700">{error}</span> : null}
    </div>
  );
}
