import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Public: submit a form via a send-to-fill token. Attaches answers to the
 *  existing lead instead of creating a new one. */

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token : "";
  const answers = body.answers && typeof body.answers === "object" ? body.answers : null;
  if (!token || !answers) {
    return NextResponse.json({ error: "Missing token or answers." }, { status: 400 });
  }

  const supabase = await createClient();

  // Validate token (RLS: only unexpired, unused).
  const { data: tok } = await supabase
    .from("lead_form_tokens")
    .select("token,lead_id,form_id")
    .eq("token", token)
    .maybeSingle();
  if (!tok) return NextResponse.json({ error: "Invalid or expired link." }, { status: 404 });
  const t = tok as { token: string; lead_id: string; form_id: string };

  // Get form info (public can read active forms).
  const { data: form } = await supabase
    .from("forms")
    .select("id,name,form_key")
    .eq("id", t.form_id)
    .eq("is_active", true)
    .maybeSingle();
  if (!form) return NextResponse.json({ error: "Form not found." }, { status: 404 });

  // Create the attachment. RLS blocks anon inserts, so this needs a staff-bypass.
  // We use the service-role-adjacent path: the token itself is the authorization.
  // Since RLS denies anon, we insert via a SECURITY DEFINER function instead.
  const { error } = await supabase.rpc("attach_lead_form", {
    p_token: t.token,
    p_lead_id: t.lead_id,
    p_form_id: t.form_id,
    p_form_key: (form as { form_key: string }).form_key,
    p_form_name: (form as { name: string }).name,
    p_answers: answers,
  });

  if (error) {
    return NextResponse.json({ error: "Could not save your answers. Please try again." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
