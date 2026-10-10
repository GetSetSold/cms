import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** One-click unsubscribe for the monthly valuation market updates (CASL). */
export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  let ok = false;
  if (token) {
    const supabase = await createClient();
    const { data } = await supabase.rpc("unsubscribe_valuation_updates", { p_token: token });
    ok = data === true;
  }
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Unsubscribed — GetSetSold.ca</title>
<style>body{font-family:-apple-system,'Segoe UI',sans-serif;background:#f5f5f5;margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}
.card{background:#fff;border:1px solid #e2e2e2;border-radius:16px;padding:40px 32px;max-width:440px;text-align:center}
.brand{font-size:22px;font-weight:800;letter-spacing:-.5px;margin-bottom:16px}.brand span{color:#0066cc}
h1{font-size:22px;margin:0 0 10px}p{color:#555;font-size:14px;line-height:1.6}</style></head>
<body><div class="card"><div class="brand">GETSETSOLD<span>.ca</span></div>
<h1>${ok ? "You're unsubscribed" : "Link not recognized"}</h1>
<p>${ok
  ? "You won't receive monthly market updates anymore. If you ever want fresh numbers on your property, just ask — happy to help."
  : "This unsubscribe link isn't valid. If you'd like to stop receiving updates, reply to any update email or call (416)-605-7488."}</p>
</div></body></html>`;
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
