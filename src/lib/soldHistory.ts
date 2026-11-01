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
