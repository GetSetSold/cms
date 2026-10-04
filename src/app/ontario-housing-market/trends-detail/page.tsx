import { permanentRedirect } from "next/navigation";

/** Legacy /ontario-housing-market/trends-detail?city=slug -> /ontario-housing-market-trends/slug (308). */
export default async function LegacyTrendsDetail({
  searchParams,
}: {
  searchParams: Promise<{ city?: string }>;
}) {
  const { city } = await searchParams;
  permanentRedirect(city ? `/ontario-housing-market-trends/${city}` : "/ontario-housing-market-trends");
}
