import { requireStaff } from "@/lib/auth";
import { RoleSelect } from "@/components/admin/RoleSelect";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

export default async function UsersPage() {
  const { supabase, user } = await requireStaff(["admin"]);
  const { data } = await supabase.from("profiles").select("*").order("created_at");
  return (
    <>
      <AdminPageHeader title="Users" />
      <div className="flex flex-col gap-6 p-8">
        <p className="text-muted">Invite staff from Supabase → Authentication → Users → “Invite user”. They appear here as editors; set their role below.</p>
        <div className="overflow-hidden rounded-2xl bg-white">
          <table className="w-full text-left">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-muted"><tr><th className="p-4">Email</th><th className="p-4">Name</th><th className="p-4">Role</th></tr></thead>
            <tbody>
              {(data ?? []).map((p) => (
                <tr key={p.id} className="border-b border-line/60 last:border-0">
                  <td className="p-4">{p.email}</td><td className="p-4">{p.full_name ?? "—"}</td>
                  <td className="p-4">{p.id === user.id ? <span className="capitalize">{p.role} (you)</span> : <RoleSelect id={p.id} role={p.role} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card text-[13px] text-muted">
          <strong className="text-ink">Roles.</strong> Admin: everything. Editor: pages and SVGs. Sales: leads only.
        </div>
      </div>
    </>
  );
}
