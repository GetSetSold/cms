import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { normalizeRedirectDestination, normalizeRedirectSource } from "./redirect-paths";

export type CmsRedirectRow = {
  id: string;
  source: string;
  destination: string;
  permanent: boolean;
  is_active: boolean;
};

/**
 * Look up an active redirect for a slug. Called ONLY when the CMS page
 * lookup missed, so normal page loads pay no extra query and there is
 * no cache to invalidate — a redirect saved in Admin works on the
 * very next hit of its source URL. Cached per request so metadata and
 * the page component don't query twice for the same miss.
 */
export const getRedirect = cache(async (slug: string): Promise<CmsRedirectRow | null> => {
  const source = normalizeRedirectSource(slug);
  if (!source) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("redirects")
    .select("id,source,destination,permanent,is_active")
    .eq("source", source)
    .eq("is_active", true)
    .maybeSingle();
  if (!data) return null;
  const destination = normalizeRedirectDestination(data.destination);
  // Safety: never redirect a URL to itself.
  if (!destination || destination.split("?")[0].slice(1) === source) return null;
  return { ...data, destination } as CmsRedirectRow;
});
