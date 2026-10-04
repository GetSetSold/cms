import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: { unoptimized: true }, // the site uses inline SVG only
  env: {
    NEXT_PUBLIC_SUPABASE_URL: "https://pcgggfqndoaoddcrechr.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjZ2dnZnFuZG9hb2RkY3JlY2hyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxODIyOTQsImV4cCI6MjEwNTc1ODI5NH0.aaL23C2TC_bXSF9_k2B8QuiULFa7GfWI3Rg15JogpYA",
    NEXT_PUBLIC_SITE_URL: "https://cms.rohit-910.workers.dev",
  },
  async redirects() {
    return [
      // Legacy city hub URLs -> keyword-rich canonical URLs (301)
      { source: "/city/:slug", destination: "/:slug-real-estate", permanent: true },
      { source: "/listings/city/:slug", destination: "/:slug-real-estate", permanent: true },
      // Legacy HPI trends URLs -> new flat trends URLs (301)
      { source: "/ontario-housing-market/trends", destination: "/ontario-housing-market-trends", permanent: true },
      // Legacy BoC rates URL -> CMS guide URL (301)
      { source: "/bank-of-canada-rates", destination: "/bank-of-canada-rates-guide", permanent: true },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [
        // Province hubs: explicit rules must come before the generic city
        // rewrite (first match wins; array-form rewrites run before static routes).
        { source: "/ontario-real-estate", destination: "/province/ontario" },
        // Neighbourhood pages: /toronto-real-estate/mimico serves
        // /neighbourhood/[city]/[hood] internally. Must come before the
        // single-segment city rewrite (two segments won't match it anyway,
        // but explicit ordering is safer).
        { source: "/:city-real-estate/:hood", destination: "/neighbourhood/:city/:hood" },
        // /haldimand-real-estate serves the /city/[slug] page internally.
        // :slug captures "haldimand" (also works for hyphenated cities).
        { source: "/:slug-real-estate", destination: "/city/:slug" },
      ],
    };
  },
};

export default nextConfig;

initOpenNextCloudflareForDev();
