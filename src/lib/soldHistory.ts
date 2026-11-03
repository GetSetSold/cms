import { createClient } from "@/lib/supabase/server";

export type SoldHistoryRow = {
  id: string; status: "sold" | "leased" | "purchased"; address: string;
  price: number | null; listed_price: number | null; image_url: string | null; link: string | null;
  bed: number | null; bath: number | null; parking: number | null; sqft: number | null;
  listing_key: string | null; closed_at: string;
};

export async function getSoldHistory(status?: string, city?: string) {
  const supabase = await createClient();
  let q = supabase.from("sold_history").select("*").order("closed_at", { ascending: false });
  if (status) q = q.eq("status", status);
  // sold_history has no city column — match the address text (entries are
  // written as "123 Main St, Caledonia").
  if (city) q = q.ilike("address", `%${city}%`);
  const { data } = await q;
  return (data ?? []) as SoldHistoryRow[];
}

/** Random order for display — not insertion order, not grouped by status.
//  Seeded by Toronto date: stable all day (keeps ?page= pagination
//  consistent), freshly shuffled each day ("auto random"). */
export function shuffleRows<T>(rows: T[]): T[] {
  const seedStr = new Date().toLocaleDateString("en-CA", { timeZone: "America/Toronto" });
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) { h ^= seedStr.charCodeAt(i); h = Math.imul(h, 16777619); }
  const rand = () => {
    h |= 0; h = (h + 0x6D2B79F5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const a = [...rows];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
