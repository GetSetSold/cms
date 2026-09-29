"use client";
import { useEffect } from "react";

/** A basic accessible dialog: dimmed backdrop, closes on Escape or backdrop click, locks page
 *  scroll while open, and caps its own height so a long form scrolls inside the modal instead of
 *  growing the whole page. Shared by any admin panel that needs a big form to "fit" rather than
 *  push everything below it down the page. */
export function Modal({ title, onClose, children, wide, size }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean; size?: "lg" | "xl" }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prevOverflow; };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center sm:p-6" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title}
        className={`flex max-h-[calc(100vh-2rem)] w-full flex-col rounded-2xl bg-white shadow-xl ${size === "xl" ? "max-w-5xl" : wide ? "max-w-2xl" : "max-w-lg"}`}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-line px-5 py-4">
          <strong className="text-lg">{title}</strong>
          <button type="button" aria-label="Close" onClick={onClose} className="ml-auto flex h-8 w-8 items-center justify-center rounded-full text-xl text-muted hover:bg-ground">×</button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
