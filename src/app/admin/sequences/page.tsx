import { requireStaff } from "@/lib/auth";
import { SequenceEditor } from "@/components/admin/SequenceEditor";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { LEAD_FLOW_CATEGORIES } from "@/lib/types";

export default async function SequencesPage() {
  const { supabase } = await requireStaff(["admin"]);
  const { data } = await supabase.from("follow_up_sequences").select("*").order("category").order("name");
  const flows = data ?? [];
  return (
    <>
      <AdminPageHeader title="Lead Flows" />
      <div className="flex flex-col gap-6 p-8">
        <p className="text-muted">A flow is a set of messages sent automatically after a lead comes in — grouped by lead type
          (Tenant, Buyer, Seller, Landlord, Investor…). A flow with a form set auto-enrolls every lead from that form; otherwise
          add leads to it manually from their record. A flow stops for a lead when they reply, are marked qualified or later, or opt out.
          Placeholders: <code>{"{{first_name}}"}</code>, <code>{"{{site_name}}"}</code>, <code>{"{{service}}"}</code>.</p>
        {LEAD_FLOW_CATEGORIES.map(({ value, label }) => {
          const inCat = flows.filter((f) => f.category === value);
          if (!inCat.length) return null;
          return (
            <div key={value} className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{label}</h2>
              {inCat.map((s) => <SequenceEditor key={s.id} initial={s} />)}
            </div>
          );
        })}
        <SequenceEditor initial={null} />
      </div>
    </>
  );
}
