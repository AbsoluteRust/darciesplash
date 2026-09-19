import React from "react";

import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://folly.milktruckers.com"),
  title: {
    default: "The Commissioner's Collection",
    template: "%s | Darcie Splash",
  },
  description: "A gallery of commissioned artwork — emotes, splash art, wallpapers, and stickers from Darcie.",
  openGraph: {
    title: "The Commissioner's Collection",
    description: "A gallery of commissioned artwork — emotes, splash art, wallpapers, and stickers from Darcie.",
    url: "https://folly.milktruckers.com",
    siteName: "Darcie Splash",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "The Commissioner's Collection",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Commissioner's Collection",
    description: "A gallery of commissioned artwork — emotes, splash art, wallpapers, and stickers from Darcie.",
    images: ["/opengraph-image"],
  },
};
export default function PublicLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}