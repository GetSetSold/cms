import { PreconBroadcastAdmin } from "@/components/admin/PreconBroadcastAdmin";

export default function AdminPreconBroadcastPage() {
  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-2">Pre-con Broadcast</h1>
      <p className="text-sm text-muted mb-6">
        Send a single-project email to your pre-con subscriber list. Run the migration{" "}
        <code className="text-xs bg-gray-100 px-1 rounded">20261010000002_precon_broadcast.sql</code> first.
      </p>
      <PreconBroadcastAdmin />
    </div>
  );
}
