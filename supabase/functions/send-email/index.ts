// Manual email from the admin lead screen. Requires a signed-in admin or sales user.
// Uses ZeptoMail (or Resend) via the shared sender, based on site_settings.
let shared: typeof import("../_shared/utils.ts");
try {
  shared = await import("../_shared/utils.ts");
} catch (e) {
  // If the shared import fails, return the error visibly instead of a bare 502.
  Deno.serve(() => new Response(JSON.stringify({ error: `shared import failed: ${String(e)}` }), {
    status: 500, headers: { "Content-Type": "application/json" },
  }));
  throw e;
}
const { admin, corsHeaders, json, sendEmail } = shared;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });

  try {
    const db = admin();
    const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: { user } } = await db.auth.getUser(jwt);
    if (!user) return json(req, { error: "Not signed in" }, 401);

    const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (!profile || !["admin", "sales"].includes((profile as { role: string }).role)) return json(req, { error: "Not allowed" }, 403);

    const { lead_id, subject, body } = await req.json().catch(() => ({}));
    const subj = typeof subject === "string" ? subject.trim().slice(0, 200) : "";
    const text = typeof body === "string" ? body.trim().slice(0, 10000) : "";
    if (!lead_id || !subj || !text) return json(req, { error: "lead_id, subject and body are required" }, 422);

    const { data: lead } = await db.from("leads")
      .select("id, email, first_name").eq("id", lead_id).maybeSingle();
    const leadEmail = (lead as { email: string } | null)?.email;
    if (!leadEmail) return json(req, { error: "This lead has no email address" }, 422);

    const { data: settings } = await db.from("site_settings").select("email_provider, site_name").maybeSingle();
    const siteName = (settings as { site_name?: string } | null)?.site_name ?? "GetSetSold";
    const provider = ((settings as { email_provider?: "zeptomail" | "resend" } | null)?.email_provider ?? "zeptomail");

    const firstName = ((lead as { first_name: string | null }).first_name ?? "").trim();
    const rendered = text
      .replace(/\{\{\s*first_name\s*\}\}/g, firstName || "there")
      .replace(/\{\{\s*site_name\s*\}\}/g, siteName);
    const renderedSubject = subj
      .replace(/\{\{\s*first_name\s*\}\}/g, firstName || "there")
      .replace(/\{\{\s*site_name\s*\}\}/g, siteName);

    const sent = await sendEmail(leadEmail, renderedSubject, rendered, undefined, provider);
    await db.from("lead_activities").insert({ lead_id, type: "email_out", body: `${renderedSubject}\n\n${rendered}`, created_by: user.id, meta: sent });
    return json(req, { ok: true });
  } catch (e) {
    // Return 200 (not 502) so the gateway doesn't mask the real error as EDGE_FUNCTION_ERROR.
    return json(req, { error: String((e as Error)?.message ?? e), stack: String((e as Error)?.stack ?? "").slice(0, 800) }, 200);
  }
});
