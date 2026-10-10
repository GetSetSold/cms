import { AdminAlertCreator } from "@/components/admin/AdminAlertCreator";

export default function AdminPropertyAlertsPage() {
  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold mb-2">Create Property Alert</h1>
      <p className="text-sm text-muted mb-6">
        Manually set up a property alert for a client. They'll receive email notifications when new listings match.
      </p>
      <AdminAlertCreator />
    </div>
  );
}
