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
};

export default nextConfig;

initOpenNextCloudflareForDev();
