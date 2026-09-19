// workers/src/templates-api.js
// GET /api/templates          -> { templates: [...] }   (from block_templates table)
// GET /api/templates?id=<id>  -> one template (404 if not found)
// Falls back to the built-in presets in template-presets.js if the table
// can't be read, so the picker never comes up empty.

import { templatePresets, getPresetById } from "./template-presets.js";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "content-type, authorization",
};

const ICONS = {
  headers: "🔝", heroes: "🏠", features: "✨", listings: "🏘️", tools: "🧮",
  forms: "📧", cta: "📢", layouts: "📄", footers: "🔻", testimonials: "💬",
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...CORS },
  });
}

function rowToTemplate(r) {
  const blocks = Array.isArray(r.blocks) && r.blocks.length
    ? r.blocks
    : r.block_type && r.block_type !== "page_layout"
      ? [{ block_type: r.block_type, props: r.props || {} }]
      : [];
  return {
    id: r.template_id,
    name: r.name,
    category: r.category,
    description: r.description || "",
    icon: ICONS[r.category] || "📦",
    blocks,
  };
}

async function loadFromDb(env) {
  if (!env || !env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return null;
  try {
    const res = await fetch(
      `${env.SUPABASE_URL}/rest/v1/block_templates?select=template_id,name,category,description,block_type,props,blocks&order=category.asc,name.asc`,
      {
        headers: {
          apikey: env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );
    if (!res.ok) {
      console.error("templates load failed:", await res.text());
      return null;
    }
    const rows = await res.json();
    const list = rows.map(rowToTemplate).filter(t => t.blocks.length);
    return list.length ? list : null;
  } catch (err) {
    console.error("templates load threw:", err.message);
    return null;
  }
}

export async function handleTemplatesRequest(request, env) {
  if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);

  const id = new URL(request.url).searchParams.get("id");
  const templates = (await loadFromDb(env)) || templatePresets;

  if (id) {
    const t = templates.find(x => x.id === id) || getPresetById(id);
    return t ? json(t) : json({ error: "Template not found" }, 404);
  }
  return json({ templates });
}
