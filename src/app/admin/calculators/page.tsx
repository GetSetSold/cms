import { requireStaff } from "@/lib/auth";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CalculatorSettingsForm } from "@/components/admin/CalculatorSettingsForm";

export const dynamic = "force-dynamic";

export default async function CalculatorsAdminPage() {
  const { supabase } = await requireStaff(["admin"]);
  const { data: settings } = await supabase.from("site_settings").select("calculators").eq("id", 1).single();

  return (
    <>
      <AdminPageHeader title="Calculators" />
      <div className="flex flex-col gap-4 p-4 md:p-6">
        <p className="max-w-3xl text-sm text-muted">
          Regulatory assumptions and defaults used by all 14 calculators — stress-test rules,
          down-payment brackets, CMHC tiers, and land-transfer rebates. Changes apply immediately.
        </p>
        <CalculatorSettingsForm initial={(settings as { calculators?: unknown } | null)?.calculators} />
      </div>
    </>
  );
}
