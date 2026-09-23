import { requireStaff } from "@/lib/auth";
import { SequenceEditor } from "@/components/admin/SequenceEditor";

export default async function SequencesPage() {
  const { supabase } = await requireStaff(["admin"]);
  const { data } = await supabase.from("follow_up_sequences").select("*").order("name");
  return (
    <div className="flex flex-col gap-6 p-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-4xl">Follow-ups</h1>
        <p className="text-muted">Messages sent automatically after a form is submitted. A sequence stops when the lead replies,
          is marked qualified or later, or opts out. Placeholders: <code>{"{{first_name}}"}</code>, <code>{"{{site_name}}"}</code>, <code>{"{{service}}"}</code>.</p>
      </div>
      {(data ?? []).map((s) => <SequenceEditor key={s.id} initial={s} />)}
      <SequenceEditor initial={null} />
    </div>
  );
}
