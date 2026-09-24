import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { FormEditor } from "@/components/admin/FormEditor";
import type { CmsForm } from "@/lib/types";

export default async function EditFormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireStaff(["admin", "editor"]);
  const { data: form } = await supabase.from("forms").select("*").eq("id", id).maybeSingle();
  if (!form) notFound();
  return <FormEditor initial={form as CmsForm} />;
}
