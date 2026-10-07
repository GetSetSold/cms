import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { LeadDetailView } from "@/components/admin/LeadDetailView";

export default async function LeadDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireStaff(["admin", "sales"]);
  const { data: lead } = await supabase.from("leads").select("id").eq("id", id).maybeSingle();
  if (!lead) notFound();

  return <LeadDetailView id={id} showBackLink />;
}
