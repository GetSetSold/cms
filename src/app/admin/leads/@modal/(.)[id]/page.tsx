import { requireStaff } from "@/lib/auth";
import { LeadModal } from "@/components/admin/LeadModal";
import { LeadDetailView } from "@/components/admin/LeadDetailView";

/** Intercepted lead detail: renders the same content inside a modal popup
 *  over the leads list. Direct visits / refreshes still get the full page. */
export default async function LeadModalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireStaff(["admin", "sales"]);

  return (
    <LeadModal>
      <LeadDetailView id={id} />
    </LeadModal>
  );
}
