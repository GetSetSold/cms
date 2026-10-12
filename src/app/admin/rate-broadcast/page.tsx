import { requireStaff } from "@/lib/auth";
import { RateBroadcastAdmin } from "@/components/admin/RateBroadcastAdmin";

export default async function RateBroadcastPage() {
  await requireStaff(["admin", "editor"]);
  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8 md:px-10">
      <h1 className="mb-2 text-2xl font-bold">Bank of Canada Rate Updates</h1>
      <p className="mb-6 text-sm text-muted">
        Compose and send rate updates to subscribers. Preview the email before sending.
      </p>
      <RateBroadcastAdmin />
    </div>
  );
}
