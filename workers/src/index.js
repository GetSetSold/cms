// ═══════════════════════════════════════════════════
// ADD THIS TO: workers/src/index.js
// Add these lines in the appropriate places
// ═══════════════════════════════════════════════════

// ── 1. Add this import at the TOP of index.js ──────
import { templatePresets, getPresetById } from "./template-presets.js";

// ── 2. Add this handler function (before the export default) ──

// Template presets API — the admin app calls this to get
// available templates for the "Insert Template" picker.
// GET /api/templates → returns all presets
// GET /api/templates?id=header_classic → returns one preset
async function handleTemplatesRequest(url) {
  const id = url.searchParams.get("id");
  
  if (id) {
    const preset = getPresetById(id);
    if (!preset) {
      return new Response(JSON.stringify({ error: "Template not found" }), {
        status: 404,
        headers: { "content-type": "application/json", ...CORS_HEADERS },
      });
    }
    return new Response(JSON.stringify(preset), {
      headers: { "content-type": "application/json", ...CORS_HEADERS },
    });
  }

  return new Response(JSON.stringify({ templates: templatePresets }), {
    headers: { "content-type": "application/json", ...CORS_HEADERS },
  });
}

// ── 3. Add this route inside the fetch() handler ──────
// (add it alongside the other /api/ routes)

if (url.pathname === "/api/templates") {
  if (request.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  return handleTemplatesRequest(url);
}

// ═══════════════════════════════════════════════════
// FULL ROUTER SECTION (for reference — add the templates
// route alongside your existing routes):
// ═══════════════════════════════════════════════════

/*
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ... existing routes ...

    if (url.pathname === "/api/leads" && request.method === "POST") {
      return handleLeadSubmission(request, env);
    }

    if (url.pathname === "/api/preview") {
      if (request.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
      if (request.method === "POST") return handlePreviewRequest(request, env);
    }

    // ── NEW: Template presets endpoint ──
    if (url.pathname === "/api/templates") {
      if (request.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
      return handleTemplatesRequest(url);
    }

    if (url.pathname === "/api/listings-search") {
      // ...
    }

    // ... rest of router ...
  },
};
*/
