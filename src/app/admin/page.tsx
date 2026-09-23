import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";

export default async function AdminHome() {
  const { profile } = await requireStaff();
  redirect(profile.role === "sales" ? "/admin/leads" : "/admin/pages");
}
