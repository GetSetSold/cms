import type { Metadata } from "next";
import { cityPageMetadata, CityPageContent } from "@/components/listings/CityPage";
import type { ListingsSearchParams } from "@/components/listings/ListingsBrowser";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return cityPageMetadata(slug, "/listings/city");
}

export default async function ListingsCityPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<ListingsSearchParams> }) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  return <CityPageContent slug={slug} basePath="/listings/city" sp={sp} />;
}
