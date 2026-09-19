// workers/src/templates-api.js
// GET /api/templates          -> { templates: [...] }
// GET /api/templates?id=<id>  -> one preset (404 if not found)

import { templatePresets, getPresetById } from "./template-presets.js";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "content-type, authorization",
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...CORS },
  });
}

export function handleTemplatesRequest(request) {
  if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);

  const id = new URL(request.url).searchParams.get("id");
  if (id) {
    const preset = getPresetById(id);
    return preset ? json(preset) : json({ error: "Template not found" }, 404);
  }
  return json({ templates: templatePresets });
}
