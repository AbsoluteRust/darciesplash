import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
    ],
    unoptimized: true,
  },

  // 👇 Add this block
  allowedDevOrigins: [
    "raspberrypi.local",
    "192.168.1.40",   // optional but recommended
  ],
};

export default nextConfig;
