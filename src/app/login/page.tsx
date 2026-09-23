import type { Metadata } from "next";
import { getSettings } from "@/lib/cms";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Staff login", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const [{ next, error }, settings] = await Promise.all([searchParams, getSettings()]);
  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-ink p-14 text-ground md:flex">
        <svg viewBox="0 0 720 900" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden="true">
          <circle cx="560" cy="210" r="150" fill="var(--c-accent)" />
          <path d="M0 700 Q180 610 360 670 T720 640 V900 H0 Z" fill="var(--c-primary)" />
          <path d="M0 780 Q200 720 380 770 T720 760 V900 H0 Z" fill="#0A4540" />
        </svg>
        <div className="relative font-display text-3xl">{settings.site_name} <span className="font-sans text-[13px] opacity-70">CMS</span></div>
        <div className="relative flex max-w-[420px] flex-col gap-3">
          <h1 className="font-display text-[56px] leading-none">Pages, leads and follow-ups in one place.</h1>
          <p className="opacity-80">Staff access only. Your role decides what you can edit.</p>
        </div>
      </section>
      <section className="flex items-center justify-center p-6 md:p-14">
        <div className="flex w-full flex-col items-center gap-4">
          {error ? <p className="w-full max-w-[400px] rounded-lg bg-red-50 p-3 text-sm text-red-800">That link has expired. Please request a new one.</p> : null}
          <LoginForm next={next} />
        </div>
      </section>
    </div>
  );
}
