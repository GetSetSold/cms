// TemplatePicker.jsx — add to the admin app (admin.rohit-910.workers.dev)
// Needs GET {CMS_URL}/api/templates to be deployed on the Worker.

import { useState, useEffect } from "react";

const CMS_URL = "https://cms.rohit-910.workers.dev";

function Overlay({ children }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      {children}
    </div>
  );
}

export function TemplatePicker({ onInsert, onClose }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch(`${CMS_URL}/api/templates`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(data => {
        if (!cancelled) setTemplates(data.templates || []);
      })
      .catch(err => {
        console.error("Failed to load templates:", err);
        if (!cancelled) setError("Could not load templates. Check that /api/templates is deployed.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const categories = ["all", ...new Set(templates.map(t => t.category))];

  const q = search.trim().toLowerCase();
  const filtered = templates.filter(t => {
    const matchCategory = activeCategory === "all" || t.category === activeCategory;
    const matchSearch =
      !q ||
      (t.name || "").toLowerCase().includes(q) ||
      (t.description || "").toLowerCase().includes(q);
    return matchCategory && matchSearch;
  });

  const handleInsert = template => {
    // Copy the blocks so edits on the page never change the template,
    // and give each block a fresh id in case the builder needs one.
    const copies = template.blocks.map(b => ({
      ...JSON.parse(JSON.stringify(b)),
      id: crypto.randomUUID(),
    }));
    onInsert(copies);
    onClose();
  };

  if (loading) {
    return (
      <Overlay>
        <div className="bg-white rounded-xl p-8 text-center">Loading templates...</div>
      </Overlay>
    );
  }

  if (error) {
    return (
      <Overlay>
        <div className="bg-white rounded-xl p-8 text-center space-y-4">
          <p className="text-sm text-red-600">{error}</p>
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 rounded-lg text-sm">
            Close
          </button>
        </div>
      </Overlay>
    );
  }

  return (
    <Overlay>
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-bold">Insert Template</h2>
            <p className="text-sm text-gray-500">Choose a pre-built section to add to your page</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">✕</button>
        </div>

        <div className="p-4 border-b space-y-3">
          <input
            type="text"
            placeholder="Search templates..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm"
          />
          <div className="flex gap-2 flex-wrap">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  activeCategory === cat
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {cat === "all" ? "All" : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No templates match.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map(template => (
                <button
                  key={template.id}
                  onClick={() => handleInsert(template)}
                  className="text-left p-4 border rounded-lg hover:border-indigo-400 hover:shadow-md transition-all group"
                >
                  <div className="flex items-start gap-2 mb-2">
                    <span className="text-xl">{template.icon}</span>
                    <div>
                      <h3 className="font-semibold text-sm group-hover:text-indigo-600">
                        {template.name}
                      </h3>
                      <span className="text-[10px] text-gray-400 uppercase">
                        {template.category}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">{template.description}</p>
                  <div className="mt-2 text-[10px] text-indigo-500 font-medium">
                    {template.blocks.length} block{template.blocks.length === 1 ? "" : "s"} → Click to insert
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </Overlay>
  );
}

/*
HOW TO USE IN YOUR PAGE BUILDER

const [showTemplatePicker, setShowTemplatePicker] = useState(false);

<button onClick={() => setShowTemplatePicker(true)}>📦 Insert Template</button>

const handleInsertTemplate = newBlocks => setBlocks(prev => [...prev, ...newBlocks]);

{showTemplatePicker && (
  <TemplatePicker
    onInsert={handleInsertTemplate}
    onClose={() => setShowTemplatePicker(false)}
  />
)}
*/
