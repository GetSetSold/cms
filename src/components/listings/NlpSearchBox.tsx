"use client";

import { useState } from "react";

/**
 * Natural language search box (prototype).
 * Type "3 bed detached in Hamilton under 700k" -> parses to filters -> navigates.
 */
export function NlpSearchBox({ basePath = "/listings" }: { basePath?: string }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/nlp-search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.error) {
        setFeedback(data.error);
        return;
      }
      const params = new URLSearchParams(data.params as Record<string, string>);
      // Show what was understood.
      const summary = (data.summary as string[]).join(", ");
      setFeedback(summary ? `Showing: ${summary}` : "No filters detected");
      // Navigate to filtered listings.
      const url = `${basePath}?${params.toString()}`;
      window.location.href = url;
    } catch {
      setFeedback("Couldn't parse that — try the filters below.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mb-6">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='Try "3 bed detached in Hamilton under 700k"'
          className="flex-1 rounded-lg border border-line bg-white px-4 py-2.5 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="shrink-0 rounded-lg bg-ink px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? "..." : "Search"}
        </button>
      </form>
      {feedback && <p className="mt-2 text-xs text-muted">{feedback}</p>}
    </div>
  );
}
