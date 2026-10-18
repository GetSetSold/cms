import type { Metadata } from "next";
import { Geist, Instrument_Serif } from "next/font/google";
import { CustomCodeSlot } from "@/components/site/CustomCodeInjector";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const instrument = Instrument_Serif({
  subsets: ["latin"], weight: "400", style: ["normal", "italic"],
  variable: "--font-instrument", display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
};

/** Sitewide custom code, cached 5 minutes. Direct REST read (no cookies) so the
 *  layout stays static-renderable. */
async function getThemeTypo(): Promise<{ body: string; card_title: string; eyebrow: string }> {
  const defaults = { body: "0.875rem", card_title: "1.125rem", eyebrow: "0.75rem" };
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return defaults;
    const res = await fetch(`${url}/rest/v1/site_settings?select=theme&id=eq.1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      next: { revalidate: 300 },
    });
    if (!res.ok) return defaults;
    const data = await res.json();
    const t = data?.[0]?.theme ?? {};
    return {
      body: typeof t.typo_body === "string" ? t.typo_body : defaults.body,
      card_title: typeof t.typo_card_title === "string" ? t.typo_card_title : defaults.card_title,
      eyebrow: typeof t.typo_eyebrow === "string" ? t.typo_eyebrow : defaults.eyebrow,
    };
  } catch {
    return defaults;
  }
}

async function getCustomCode(): Promise<string> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return "";
    const res = await fetch(`${url}/rest/v1/site_settings?select=custom_code&id=eq.1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      next: { revalidate: 300 },
    });
    if (!res.ok) return "";
    const data = await res.json();
    return typeof data?.[0]?.custom_code === "string" ? data[0].custom_code : "";
  } catch {
    return "";
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const customCode = await getCustomCode();
  const typo = await getThemeTypo();
  return (
    <html lang="en" className={`${geist.variable} ${instrument.variable}`}
      style={{ "--font-body-size": typo.body, "--font-card-title-size": typo.card_title, "--font-eyebrow-size": typo.eyebrow } as React.CSSProperties}>
      <body className="min-h-screen antialiased">
        {children}
        <CustomCodeSlot code={customCode} />
      </body>
    </html>
  );
}
