import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: { unoptimized: true }, // the site uses inline SVG only
};

export default nextConfig;

initOpenNextCloudflareForDev();
