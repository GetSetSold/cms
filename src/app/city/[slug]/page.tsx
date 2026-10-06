import type { Metadata } from "next";
import { cityPageMetadata, CityPageContent } from "@/components/listings/CityPage";
import type { ListingsSearchParams } from "@/components/listings/ListingsBrowser";

// ISR: cache the base hub at the edge for 1h; requests with search params
// (filters/pagination) still render dynamically.
export const revalidate = 3600;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; type?: string }>;
}): Promise<Metadata> {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  return cityPageMetadata(slug, sp);
}

export default async function CityPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<ListingsSearchParams> }) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  return <CityPageContent slug={slug} sp={sp} />;
}
