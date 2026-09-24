import { requireStaff } from "@/lib/auth";
import { SequenceEditor } from "@/components/admin/SequenceEditor";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

export default async function SequencesPage() {
  const { supabase } = await requireStaff(["admin"]);
  const { data } = await supabase.from("follow_up_sequences").select("*").order("name");
  return (
    <>
      <AdminPageHeader title="Follow-ups" />
      <div className="flex flex-col gap-6 p-8">
        <p className="text-muted">Messages sent automatically after a form is submitted. A sequence stops when the lead replies,
          is marked qualified or later, or opts out. Placeholders: <code>{"{{first_name}}"}</code>, <code>{"{{site_name}}"}</code>, <code>{"{{service}}"}</code>.</p>
        {(data ?? []).map((s) => <SequenceEditor key={s.id} initial={s} />)}
        <SequenceEditor initial={null} />
      </div>
    </>
  );
}
