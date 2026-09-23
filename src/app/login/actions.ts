"use server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

const safeNext = (n: FormDataEntryValue | null) =>
  typeof n === "string" && n.startsWith("/admin") ? n : "/admin";

export async function signIn(_: unknown, form: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(form.get("email") ?? ""),
    password: String(form.get("password") ?? ""),
  });
  if (error) return { error: "Email or password is incorrect." };
  redirect(safeNext(form.get("next")));
}

export async function sendMagicLink(_: unknown, form: FormData) {
  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? (await headers()).get("origin") ?? "";
  const { error } = await supabase.auth.signInWithOtp({
    email: String(form.get("email") ?? ""),
    options: {
      shouldCreateUser: false, // staff are invited by an admin, never self-registered
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(safeNext(form.get("next")))}`,
    },
  });
  if (error) return { error: "We couldn't send a link to that address." };
  return { message: "Check your inbox for a sign-in link." };
}

export async function resetPassword(_: unknown, form: FormData) {
  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  await supabase.auth.resetPasswordForEmail(String(form.get("email") ?? ""), {
    redirectTo: `${origin}/auth/callback?next=/admin/account`,
  });
  return { message: "If that email has an account, a reset link is on its way." };
}
