"use client";
import { useEffect, useState } from "react";

type Img = { id: string; image_url: string | null; alt_text: string | null; sort_order: number | null };

export function ImagesManager() {
  const [images, setImages] = useState<Img[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/precon/images")
      .then((r) => r.json())
      .then((b) => { setImages(b.images ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-muted">Loading images…</p>;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">{images.length} images in the pool. Assign images from each Builder, Project, or Model page.</p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {images.map((img) => (
          <div key={img.id} className="overflow-hidden rounded-xl bg-white">
            {img.image_url ? <img src={img.image_url} alt={img.alt_text ?? ""} className="aspect-video w-full object-cover" /> : null}
            <div className="p-2 text-xs text-muted">{img.alt_text ?? img.id.slice(0, 8)}</div>
          </div>
        ))}
      </div>
      {!images.length ? <p className="text-sm text-muted">No images yet.</p> : null}
    </div>
  );
}
