import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";

/** Server-side guard for admin pages. RLS still protects every query underneath. */
export async function requireStaff(roles: Role[] = ["admin", "editor", "sales"]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile) redirect("/login");
  if (!roles.includes(profile.role)) redirect("/admin");
  return { supabase, user, profile: profile as { id: string; email: string; full_name: string | null; role: Role } };
}
