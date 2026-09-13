import type { Metadata } from "next";
import CollectionClient from "./CollectionClient";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}): Promise<Metadata> {
  const { id } = await params;
  const sp = await searchParams;
  const cardSlug = typeof sp.card === "string" ? sp.card : null;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://folly.milktruckers.com";
  const collectionName = id.charAt(0).toUpperCase() + id.slice(1);

  if (!cardSlug) {
    return {
      title: `The ${collectionName} Collection`,
      description: `Browse the ${collectionName} collection.`,
      openGraph: {
        title: `The ${collectionName} Collection`,
        description: `Browse the ${collectionName} collection.`,
        url: `${siteUrl}/collections/${id}`,
        siteName: "Darcie Splash",
        images: [{ url: `${siteUrl}/opengraph-image`, width: 1200, height: 630 }],
      },
      twitter: { card: "summary_large_image" },
    };
  }

  let cardName = cardSlug;
  let cardType = "Emote";
  let cardImage = "";

  try {
    const res = await fetch(`${siteUrl}/api/cards/list`, { cache: "no-store" });
    if (res.ok) {
      const cards = await res.json();
      const match = cards.find(
        (c: any) =>
          c.name.toLowerCase().replace(/\s+/g, "-") === cardSlug.toLowerCase()
      );
      if (match) {
        cardName = match.name;
        cardType = match.type || "Emote";
        cardImage = match.image || "";
      }
    }
  } catch {
    // fall through
  }

  const imageParams = new URLSearchParams();
  imageParams.set("name", cardName);
  imageParams.set("type", cardType);
  imageParams.set("collection", collectionName);
  if (cardImage) imageParams.set("image", cardImage);

  const ogImageUrl = `${siteUrl}/api/card-image?${imageParams.toString()}`;

  return {
    title: `${cardName} — ${collectionName} Collection`,
    description: `A ${cardType} from the ${collectionName} collection.`,
    openGraph: {
      title: `${cardName} — ${collectionName} Collection`,
      description: `A ${cardType} from the ${collectionName} collection.`,
      url: `${siteUrl}/collections/${id}?card=${cardSlug}`,
      siteName: "Darcie Splash",
      images: [{ url: ogImageUrl, width: 400, height: 560 }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${cardName} — ${collectionName} Collection`,
      images: [ogImageUrl],
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CollectionClient params={Promise.resolve({ id })} />;
}