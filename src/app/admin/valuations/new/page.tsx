import { requireStaff } from "@/lib/auth";
import ValuationBuilder from "./ValuationBuilder";

export default async function NewValuationPage() {
  await requireStaff(["admin", "editor", "sales"]);
  return <ValuationBuilder />;
}
