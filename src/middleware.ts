import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

// Only run where a session matters; public pages stay fast.
export const config = {
  matcher: ["/admin/:path*", "/login", "/auth/:path*"],
};
