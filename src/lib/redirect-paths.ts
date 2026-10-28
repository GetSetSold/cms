// Pure redirect-path helpers, shared by the server lookup (lib/redirects)
// and the Admin UI — no server imports here, so the client manager can
// use them without pulling the server Supabase client into its bundle.

/**
 * Normalise a redirect source to the form the CMS slug page uses:
 * lowercase, no leading/trailing slashes, no query string, no host.
 * Returns "" for anything that is not a usable internal path.
 */
export function normalizeRedirectSource(raw: string): string {
  const s = raw.trim().toLowerCase().split(/[?#]/)[0].replace(/^https?:\/\/[^/]+/i, "");
  return s.replace(/^\/+|\/+$/g, "");
}

/**
 * Normalise a redirect destination to an internal path ("/foo/bar").
 * Returns "" for external URLs, protocol-relative URLs, javascript:,
 * or anything that is not a plain internal path — v1 is internal only,
 * so the site can never be used as an open redirect. A query string
 * (e.g. /refer?ref=x) is preserved.
 */
export function normalizeRedirectDestination(raw: string): string {
  const s = raw.trim();
  if (!s.startsWith("/") || s.startsWith("//")) return "";
  if (/^\/[a-z][a-z0-9+.-]*:/i.test(s)) return "";
  const [path, ...rest] = s.split("?");
  const cleanPath = `/${path.replace(/^\/+|\/+$/g, "")}`;
  return rest.length ? `${cleanPath}?${rest.join("?")}` : cleanPath;
}
