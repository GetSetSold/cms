import { requireStaff } from "@/lib/auth";
import { PasswordForm } from "@/components/admin/PasswordForm";

export default async function AccountPage() {
  const { profile } = await requireStaff();
  return (
    <div className="flex max-w-lg flex-col gap-6 p-8">
      <h1 className="font-display text-4xl">Account</h1>
      <p className="text-muted">Signed in as {profile.email}</p>
      <PasswordForm />
    </div>
  );
}
