import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  turbopack: { root: __dirname },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "raw.githubusercontent.com",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "cdn.discordapp.com",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "media.discordapp.net",
        pathname: "**",
      },
    ],

    // Cache transformed images for 31 days instead of the 60-second default.
    // This is the single biggest win — every image gets transformed once,
    // then served from cache for a month.
    minimumCacheTTL: 2678400,

    // WebP only. AVIF doubles the number of variants per image, which doubles
    // your transformation count. WebP is visually fine at these sizes.
    formats: ["image/webp"],

    // Narrow the widths Next.js is allowed to generate.
    // Default Next has 8 deviceSizes and 8 imageSizes = up to 64 variants
    // per image if all get hit. This cuts it to ~14 total.
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],

    // Restrict quality values. Without this, any `<Image quality={x}>`
    // creates its own variant. With it, requests for other qualities
    // are snapped to the nearest allowed value.
    // Requires Next.js 15.3+. Remove if your version complains.
    qualities: [60, 75],

    unoptimized: false,
  },

  allowedDevOrigins: [
    "raspberrypi.local",
    "192.168.1.40",
  ],
};

export default nextConfig;