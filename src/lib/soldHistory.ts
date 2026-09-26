import { createClient } from "@/lib/supabase/server";

export type SoldHistoryRow = {
  id: string; status: "sold" | "leased" | "purchased"; address: string;
  price: number | null; listed_price: number | null; image_url: string | null; link: string | null;
  bed: number | null; bath: number | null; parking: number | null; sqft: number | null;
  listing_key: string | null; closed_at: string;
};

export async function getSoldHistory(status?: string) {
  const supabase = await createClient();
  let q = supabase.from("sold_history").select("*").order("closed_at", { ascending: false });
  if (status) q = q.eq("status", status);
  const { data } = await q;
  return (data ?? []) as SoldHistoryRow[];
}
