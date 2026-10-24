import { getSettings } from "@/lib/cms";
import { ContentAdSlot } from "@/components/ads/ContentAdSlot";

/**
 * AdSense slot on the trends detail page, blended between sections.
 * Uses the full-width auto slot (same as single-listing pages) so the ad
 * fills the content width on desktop instead of a narrow centered square.
 * Controlled by Settings -> Ads -> "Show ad on market trends pages".
 */
export async function TrendsAdSlot() {
  const settings = await getSettings();
  const ads = settings.ads;
  if (!ads?.grid_ad_enabled || !ads?.trends_ad_enabled || !ads?.grid_ad_code) return null;
  return (
    <div className="my-8">
      <ContentAdSlot adCode={ads.grid_ad_code} />
    </div>
  );
}
