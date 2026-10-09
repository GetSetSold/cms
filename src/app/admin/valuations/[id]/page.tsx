import { requireStaff } from "@/lib/auth";
import ReportClient from "./ReportClient";

export default async function ValuationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff(["admin", "editor", "sales"]);
  return <ReportClient params={params} />;
}
