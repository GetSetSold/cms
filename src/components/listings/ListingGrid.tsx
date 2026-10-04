import type { ReactNode } from "react";
import { ListingCard } from "./ListingCard";
import { AdCard } from "./AdCard";
import type { GridListing } from "@/lib/mls";

export type AdConfig = {
  grid_ad_enabled?: boolean;
  grid_ad_code?: string;
  grid_ad_position?: number;
  grid_ad_frequency?: number;
};

/**
 * Build listing card elements with an AdSense AdCard injected at the
 * configured position (and repeated every N cards if frequency > 0).
 * Used by ListingsBrowser and neighbourhood pages so the ad appears
 * in every listing grid, like Zolo / realtor.ca.
 */
export function listingCardsWithAds(rows: GridListing[], ads?: AdConfig): ReactNode[] {
  const showAd =
    ads?.grid_ad_enabled &&
    !!ads?.grid_ad_code?.includes("data-ad-client");
  if (!showAd) {
    return rows.map((l) => <ListingCard key={l.ListingKey} listing={l} />);
  }
  const position = Math.max(1, ads!.grid_ad_position ?? 3);
  const frequency = Math.max(0, ads!.grid_ad_frequency ?? 0);
  const out: ReactNode[] = [];
  let adCount = 0;
  rows.forEach((l, i) => {
    out.push(<ListingCard key={l.ListingKey} listing={l} />);
    const pos = i + 1;
    if (
      pos === position ||
      (frequency > 0 && pos > position && (pos - position) % frequency === 0)
    ) {
      adCount++;
      out.push(<AdCard key={`grid-ad-${adCount}`} code={ads!.grid_ad_code!} />);
    }
  });
  return out;
}
