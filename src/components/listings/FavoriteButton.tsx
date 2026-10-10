"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Heart button to favorite/unfavorite a listing.
 * Requires login — prompts to manage alerts page if not authenticated.
 */
export function FavoriteButton({ listingKey }: { listingKey: string }) {
  const [favorited, setFavorited] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from("favorite_listings")
        .select("id")
        .eq("user_id", session.user.id)
        .eq("listing_key", listingKey)
        .maybeSingle();
      setFavorited(!!data);
    })();
  }, [listingKey]);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      window.location.href = "/property-alerts/manage";
      return;
    }
    setLoading(true);
    try {
      if (favorited) {
        await fetch(`/api/favorites?key=${encodeURIComponent(listingKey)}`, { method: "DELETE" });
        setFavorited(false);
      } else {
        await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listingKey }),
        });
        setFavorited(true);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      aria-label={favorited ? "Remove from favorites" : "Save to favorites"}
      className="flex h-8 w-8 shrink-0 items-center justify-center text-ink hover:scale-110 transition-transform"
    >
      <svg width="22" height="22" viewBox="0 0 24 24"
        fill={favorited ? "currentColor" : "none"}
        stroke="currentColor" strokeWidth="1.8"
        className={favorited ? "text-red-500" : ""}>
        <path d="M12 20s-7-4.35-9.5-8.5C.7 8.1 2.4 4.5 6 4.5c2 0 3.4 1.1 6 3.5 2.6-2.4 4-3.5 6-3.5 3.6 0 5.3 3.6 3.5 7C19 15.65 12 20 12 20z" />
      </svg>
    </button>
  );
}
