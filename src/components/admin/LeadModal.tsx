"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function LeadModal({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  useEffect(() => {
    const close = () => router.back();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [router]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto p-3 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      <div className="fixed inset-0 bg-black/60" onClick={() => router.back()} aria-hidden />
      <div className="relative my-6 w-full max-w-5xl rounded-2xl bg-[#F7F7F8] shadow-2xl">
        <button
          onClick={() => router.back()}
          aria-label="Close lead details"
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white text-[16px] text-ink shadow hover:bg-soft"
        >
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}
