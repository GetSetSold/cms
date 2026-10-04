"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface ParsedMarket {
  slug: string;
  name: string;
  lastUpdated: string;
  latest: unknown;
  history12m: unknown;
  fullHistory: unknown;
}

/** Upload ontario-hpi-data.json and upsert the 28 markets into hpi_markets. */
export function MarketDataUploader() {
  const supabase = useMemo(() => createClient(), []);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function upload() {
    if (!file || busy) return;
    setBusy(true);
    setStatus("Reading file…");
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const cities = json.cities as Record<string, {
        name: string; slug: string; lastUpdated: string;
        latest: unknown; history12m: unknown; fullHistory: unknown;
      }>;
      if (!cities || typeof cities !== "object") throw new Error("No 'cities' object in JSON.");
      const rows: ParsedMarket[] = Object.values(cities).map((c) => ({
        slug: c.slug,
        name: c.name,
        lastUpdated: c.lastUpdated,
        latest: c.latest,
        history12m: c.history12m,
        fullHistory: c.fullHistory,
      }));
      if (!rows.length) throw new Error("No markets found in file.");
      setStatus(`Uploading ${rows.length} markets…`);
      const payload = rows.map((r) => ({
        slug: r.slug,
        name: r.name,
        last_updated: r.lastUpdated,
        latest: r.latest,
        history_12m: r.history12m,
        full_history: r.fullHistory,
        updated_at: new Date().toISOString(),
      }));
      const { error } = await supabase.from("hpi_markets").upsert(payload, { onConflict: "slug" });
      if (error) throw error;
      setStatus(`Done — ${rows.length} markets updated.`);
      setFile(null);
    } catch (e) {
      setStatus(`Error: ${e instanceof Error ? e.message : "upload failed"}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-line bg-white p-5">
      <label className="label">HPI JSON file
        <input
          type="file"
          accept=".json,application/json"
          className="input"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </label>
      <div className="mt-3 flex items-center gap-3">
        <button type="button" className="btn-primary" disabled={!file || busy} onClick={upload}>
          {busy ? "Uploading…" : "Upload & refresh markets"}
        </button>
        {status ? <span className="text-sm text-muted" role="status">{status}</span> : null}
      </div>
      <p className="mt-3 text-xs text-muted">
        Same file you already produce from Excel — drop it here instead of the old /ontario-housing-market/ directory.
      </p>
    </div>
  );
}
