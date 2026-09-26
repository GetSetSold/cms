import { requireStaff } from "@/lib/auth";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { SoldHistoryManager } from "@/components/admin/SoldHistoryManager";
import type { SoldHistoryRow } from "@/lib/soldHistory";

export default async function SoldHistoryPage() {
  const { supabase } = await requireStaff(["admin", "editor"]);
  const { data } = await supabase.from("sold_history").select("*").order("closed_at", { ascending: false });
  return (
    <>
      <AdminPageHeader title="Sold History" />
      <div className="flex flex-col gap-6 p-8">
        <p className="text-muted">Manually managed — separate from the live MLS/DDF feed. Add a record here once a deal closes.</p>
        <SoldHistoryManager initial={(data ?? []) as SoldHistoryRow[]} />
      </div>
    </>
  );
}
