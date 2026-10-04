import { getSettings } from "@/lib/cms";
import { AdCard } from "@/components/listings/AdCard";

/**
 * AdSense slot on the trends detail page, blended between sections.
 * Controlled by Settings -> Ads -> "Show ad on market trends pages".
 */
export async function TrendsAdSlot() {
  const settings = await getSettings();
  const ads = settings.ads;
  if (!ads?.grid_ad_enabled || !ads?.trends_ad_enabled || !ads?.grid_ad_code) return null;
  return (
    <div className="my-8">
      <div className="mx-auto max-w-md">
        <AdCard code={ads.grid_ad_code} />
      </div>
      <p className="mt-2 text-center text-xs text-muted">Advertisement</p>
    </div>
  );
}
