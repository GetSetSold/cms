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
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

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

  if (status === "loading") {
    return (
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-2xl bg-white p-8 shadow-[0_6px_20px_rgba(20,20,43,0.08)] text-center text-muted">
          Loading...
        </div>
      </div>
    );
  }

  if (status === "login") {
    return (
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-2xl bg-white p-8 md:p-10 shadow-[0_6px_20px_rgba(20,20,43,0.08)] text-center">
          <h1 className="text-2xl font-bold mb-3">Manage your alerts</h1>
          <p className="text-muted mb-8 text-sm">
            Enter your email for a secure login link.
          </p>
          <form onSubmit={handleLogin} className="space-y-4 text-left">
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
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="rounded-2xl bg-white p-8 md:p-10 shadow-[0_6px_20px_rgba(20,20,43,0.08)]">
        <h1 className="text-2xl font-bold mb-6">Your property alerts</h1>
      {searches.length === 0 ? (
        <p className="text-muted">You have no saved alerts. <a href="/property-alerts" className="text-accent underline">Create one</a>.</p>
      ) : (
        <div className="space-y-4">
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
      </div>
    </div>
  );
}
