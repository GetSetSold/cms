"use client";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** Upload an image to the public `media` Supabase Storage bucket and return
 *  its public URL via onUploaded. Prerequisite (his step, once): create a
 *  PUBLIC bucket named `media` in the CMS project (pcgggfqndoaoddcrechr)
 *  and run the storage policies for public read + authenticated write. */
export function ImageUploadButton({ onUploaded, folder = "uploads", label = "Upload" }: {
  onUploaded: (url: string) => void; folder?: string; label?: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function uploadFile(file: File) {
    setError(""); setUploading(true);
    const safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-+|-+$/g, "") || "image";
    const path = `${folder}/${Date.now()}-${safe}`;
    const { error: upErr } = await supabase.storage.from("media").upload(path, file, { contentType: file.type || "image/jpeg" });
    if (upErr) {
      setUploading(false);
      setError(/bucket|not found/i.test(upErr.message)
        ? "Storage bucket 'media' not found — create it in Supabase first."
        : upErr.message);
      return;
    }
    const { data } = supabase.storage.from("media").getPublicUrl(path);
    setUploading(false);
    onUploaded(data.publicUrl);
  }

  return (
    <span className="flex flex-col gap-1">
      <label className={`btn shrink-0 cursor-pointer whitespace-nowrap ${uploading ? "opacity-50" : ""}`}>
        {uploading ? "Uploading…" : label}
        <input type="file" accept="image/*" className="hidden" disabled={uploading}
          onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) uploadFile(f); }} />
      </label>
      {error ? <span className="text-xs text-red-700">{error}</span> : null}
    </span>
  );
}
