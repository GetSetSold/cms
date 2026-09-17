// workers/src/index.js — router entrypoint.
//
// If a different index.js already exists from the Phase 1 scaffold (form
// endpoints, etc.), merge this routing logic into it rather than overwriting —
// this file only adds the page-render paths.

import { renderPage, renderListingDetail } from './render.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // /listings/:listingKey — direct route, not a `pages` row (see the note
    // in 0003_blocks_and_pages.sql on why single listings aren't stored rows).
    const listingMatch = path.match(/^\/listings\/([A-Za-z0-9-]+)$/);
    if (listingMatch && listingMatch[1] !== 'map') {
      const html = await renderListingDetail(listingMatch[1], env);
      if (!html) return new Response('Listing not found', { status: 404 });
      return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
    }

    // Everything else: look up a `pages` row by slug (path as-is; '/' included).
    const preview = url.searchParams.get('preview') === '1'; // requires an authenticated caller in practice — wire auth before enabling in prod
    const html = await renderPage(path, env, { preview });
    if (!html) return new Response('Not found', { status: 404 });

    return new Response(html, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        // Published, non-preview pages are safe to cache at the edge.
        'cache-control': preview ? 'no-store' : 'public, max-age=300',
      },
    });
  },
};
