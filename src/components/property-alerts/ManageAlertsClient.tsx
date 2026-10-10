"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface SavedSearch {
  id: string;
  criteria: Record<string, string>;
  criteria_summary: string | null;
  is_active: boolean;
  created_at: string;
  last_notified_at: string | null;
}

/**
 * Manage property alerts: request magic link, then view/pause/delete searches.
 */
export function ManageAlertsClient() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"loading" | "login" | "dashboard">("loading");
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [editing, setEditing] = useState<SavedSearch | null>(null);
  const [editForm, setEditForm] = useState({ city: "", beds: "", baths: "", minPrice: "", maxPrice: "", homeType: "", type: "sale" });

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        const userEmail = session.user.email.toLowerCase();
        // Link any existing saved searches (created before signup) to this user.
        // (Best-effort; the select below works by email regardless.)
        await supabase.from("saved_searches").update({ user_id: session.user.id }).eq("email", userEmail).is("user_id", null);
        // Load their saved searches by email (works even if linking didn't stick).
        const { data } = await supabase
          .from("saved_searches")
          .select("id, criteria, criteria_summary, is_active, created_at, last_notified_at")
          .eq("email", userEmail)
          .order("created_at", { ascending: false });
        setSearches(data ?? []);
        // Load favorites with details.
        try {
          const favRes = await fetch("/api/favorites/details");
          if (favRes.ok) {
            const favData = await favRes.json();
            setFavorites(favData.favorites ?? []);
          }
        } catch {}
        setStatus("dashboard");
      } else {
        setStatus("login");
      }
    })();
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setMessage("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.toLowerCase().trim(),
        options: { emailRedirectTo: `${window.location.origin}/property-alerts/manage` },
      });
      if (error) throw error;
      setMessage("Check your email for a login link.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSending(false);
    }
  }

  function listingsUrl(criteria: Record<string, string>): string {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(criteria)) {
      if (v) params.set(k, v);
    }
    return `/listings?${params.toString()}`;
  }

  async function toggleActive(id: string, current: boolean) {
    const supabase = createClient();
    await supabase.from("saved_searches").update({ is_active: !current }).eq("id", id);
    setSearches((s) => s.map((x) => (x.id === id ? { ...x, is_active: !current } : x)));
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this alert?")) return;
    const supabase = createClient();
    await supabase.from("saved_searches").delete().eq("id", id);
    setSearches((s) => s.filter((x) => x.id !== id));
  }

  function openEdit(s: SavedSearch) {
    const c = s.criteria || {};
    setEditForm({
      city: c.city || "",
      beds: c.beds || "",
      baths: c.baths || "",
      minPrice: c.minPrice || "",
      maxPrice: c.maxPrice || "",
      homeType: c.homeType || "",
      type: c.type || "sale",
    });
    setEditing(s);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const criteria: Record<string, string> = {};
    if (editForm.city) criteria.city = editForm.city;
    if (editForm.beds) criteria.beds = editForm.beds;
    if (editForm.baths) criteria.baths = editForm.baths;
    if (editForm.minPrice) criteria.minPrice = editForm.minPrice;
    if (editForm.maxPrice) criteria.maxPrice = editForm.maxPrice;
    if (editForm.homeType) criteria.homeType = editForm.homeType;
    criteria.type = editForm.type;

    const parts: string[] = [];
    if (editForm.beds) parts.push(`${editForm.beds} bed`);
    if (editForm.homeType) parts.push(editForm.homeType);
    if (editForm.city) parts.push(editForm.city);
    if (editForm.maxPrice) parts.push(`under $${Number(editForm.maxPrice).toLocaleString()}`);
    if (editForm.minPrice) parts.push(`over $${Number(editForm.minPrice).toLocaleString()}`);

    const res = await fetch("/api/property-alerts/update", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editing.id, criteria, criteriaSummary: parts.join(" · ") }),
    });
    if (res.ok) {
      setSearches((ss) => ss.map((x) => x.id === editing.id ? { ...x, criteria, criteria_summary: parts.join(" · ") } : x));
      setEditing(null);
    }
  }

  if (status === "loading") {
    return (
      <div className="mx-auto w-full max-w-md text-center text-muted">
        Loading...
      </div>
    );
  }

  if (status === "login") {
    return (
      <div className="mx-auto w-full max-w-md">
        <h1 className="text-2xl font-bold mb-3 text-center">Manage your alerts</h1>
        <p className="text-muted mb-8 text-sm text-center">
          Enter your email for a secure login link.
        </p>
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-line bg-white px-4 py-2.5 text-sm focus:border-accent focus:outline-none"
            disabled={sending}
          />
          <button type="submit" disabled={sending || !email.trim()}
            className="w-full rounded-lg bg-ink py-3 text-sm font-semibold text-white disabled:opacity-50">
            {sending ? "Sending..." : "Send login link"}
          </button>
          {message && <p className="text-sm text-muted text-center">{message}</p>}
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full">
      <h1 className="text-2xl font-bold mb-6">Your property alerts</h1>
      {searches.length === 0 ? (
        <p className="text-muted mb-10">You have no saved alerts. <a href="/property-alerts" className="text-accent underline">Create one</a>.</p>
      ) : (
        <div className="space-y-4 mb-10">
          {searches.map((s) => (
            <div key={s.id} className="rounded-lg border border-line bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">{s.criteria_summary || "Custom search"}</p>
                  <p className="text-xs text-muted mt-1">
                    Created {new Date(s.created_at).toLocaleDateString()}
                    {s.last_notified_at && ` · Last alert ${new Date(s.last_notified_at).toLocaleDateString()}`}
                  </p>
                  <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full ${s.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                    {s.is_active ? "Active" : "Paused"}
                  </span>
                </div>
                <div className="flex gap-2 shrink-0">
                  <a href={listingsUrl(s.criteria)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-ink text-white hover:opacity-90">
                    View listings
                  </a>
                  <button onClick={() => openEdit(s)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-line hover:bg-gray-50">
                    Edit
                  </button>
                  <button onClick={() => toggleActive(s.id, s.is_active)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-line hover:bg-gray-50">
                    {s.is_active ? "Pause" : "Resume"}
                  </button>
                  <button onClick={() => handleDelete(s.id)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {favorites.length > 0 && (
        <div className="mt-10">
          <h2 className="text-xl font-bold mb-4">Your favorite listings ({favorites.length})</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {favorites.map((f) => (
              f.missing ? null : (
                <a key={f.key} href={`/real-estate/${encodeURIComponent(f.key)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="group rounded-[var(--radius-card)] border border-line bg-white overflow-hidden hover:shadow-md transition-shadow">
                  <div className="relative">
                    {f.photo ? (
                      <img src={f.photo} alt="" className="h-40 w-full object-cover" />
                    ) : (
                      <div className="h-40 w-full bg-gray-100" />
                    )}
                    <span className={`absolute top-2 left-2 text-[11px] font-semibold px-2 py-0.5 rounded ${f.price && f.type === "rent" ? "bg-accent text-white" : "bg-ink text-white"}`}>
                      {f.isRent ? "For Rent" : "For Sale"}
                    </span>
                  </div>
                  <div className="p-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-bold">${Number(f.price).toLocaleString()}</div>
                      <div className="truncate text-xs text-muted">{f.address}, {f.city}</div>
                      <div className="text-[11px] text-muted">
                        {f.beds ? `${f.beds} bd` : ""}{f.beds && f.baths ? " · " : ""}{f.baths ? `${f.baths} ba` : ""}
                      </div>
                    </div>
                    <span className="shrink-0 text-ink group-hover:translate-x-0.5 transition-transform">→</span>
                  </div>
                </a>
              )
            ))}
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEditing(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Edit alert</h3>
            <form onSubmit={saveEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">City</label>
                <input type="text" value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                  className="w-full rounded-lg border border-line px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Beds</label>
                  <select value={editForm.beds} onChange={(e) => setEditForm({ ...editForm, beds: e.target.value })}
                    className="w-full rounded-lg border border-line px-3 py-2 text-sm">
                    <option value="">Any</option>
                    <option value="1">1+</option><option value="2">2+</option>
                    <option value="3">3+</option><option value="4">4+</option>
                    <option value="5">5+</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Baths</label>
                  <select value={editForm.baths} onChange={(e) => setEditForm({ ...editForm, baths: e.target.value })}
                    className="w-full rounded-lg border border-line px-3 py-2 text-sm">
                    <option value="">Any</option>
                    <option value="1">1+</option><option value="2">2+</option>
                    <option value="3">3+</option><option value="4">4+</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Min price</label>
                  <input type="number" value={editForm.minPrice} onChange={(e) => setEditForm({ ...editForm, minPrice: e.target.value })}
                    className="w-full rounded-lg border border-line px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Max price</label>
                  <input type="number" value={editForm.maxPrice} onChange={(e) => setEditForm({ ...editForm, maxPrice: e.target.value })}
                    className="w-full rounded-lg border border-line px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <select value={editForm.homeType} onChange={(e) => setEditForm({ ...editForm, homeType: e.target.value })}
                    className="w-full rounded-lg border border-line px-3 py-2 text-sm">
                    <option value="">Any</option>
                    <option value="detached">Detached</option>
                    <option value="semi-detached">Semi</option>
                    <option value="townhouse">Townhouse</option>
                    <option value="condo">Condo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Sale/Rent</label>
                  <select value={editForm.type} onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                    className="w-full rounded-lg border border-line px-3 py-2 text-sm">
                    <option value="sale">For sale</option>
                    <option value="rent">For rent</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 rounded-lg bg-ink py-2.5 text-sm font-semibold text-white">Save</button>
                <button type="button" onClick={() => setEditing(null)}
                  className="rounded-lg border border-line px-4 py-2.5 text-sm">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
