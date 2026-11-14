'use client';

import ProfileCard from "@/components/ProfileCard";
import { useRarityMode } from "@/components/RarityModeContext";

export const COLLECTION_GLOW: Record<string, string> = {
  celestial: "rgba(125, 190, 255, 0.67)",
  madolche: "rgba(255, 133, 198, 0.67)",
  tobi: "#fff",
  darcie: "#ff97f6",
  halo: "#fff",
  lunalux: "#fff"
};
export const DEFAULT_GLOW = "rgba(125, 190, 255, 0.67)";

const RARITY_COLORS: Record<string, string> = {
  Common: "#9ca3af",
  Uncommon: "#22c55e",
  Rare: "#3b82f6",
  Epic: "#a855f7",
  Legendary: "#eab308",
  Mythic: "#ef4444",
  Contraband: "#000000",
};

// A URL is considered animated if it points at a GIF, WebP, or APNG file.
// Query strings are tolerated because R2 / Discord CDN URLs commonly carry
// `?v=...` cache-busters or `?size=...` modifiers.
function isAnimatedUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  const lower = String(url).toLowerCase();
  if (lower.includes('.gif?') || lower.includes('.webp?') || lower.includes('.apng?')) return true;
  if (lower.endsWith('.gif') || lower.endsWith('.webp') || lower.endsWith('.apng')) return true;
  return false;
}

export default function StandardCard({
  name,
  title,
  type,
  image,
  thumbUrl,
  rarity,
  collection,
  glow,
  isPlay = false,
  isModal = false,
  onClick,
  enableTilt = true,
  copyEmote = null,
}: {
  name: string;
  title?: string;
  type?: string;
  image?: string;
  thumbUrl?: string;
  rarity?: string;
  collection?: string;
  glow?: string;
  isPlay?: boolean;
  isModal?: boolean;
  onClick?: () => void;
  enableTilt?: boolean;
  copyEmote?: { name: string; url: string } | null;
}) {
  const { mode: rarityMode } = useRarityMode();

  // On /play, we always show rarity (ignore the filter). On /collections, we respect the filter.
  const showRarity = isPlay ? true : rarityMode !== "off";
  const finalRarity = showRarity ? rarity : undefined;

  // Use the collection glow if provided, otherwise fall back to the card's glow, otherwise default.
  const finalGlow = glow || COLLECTION_GLOW[collection || ""] || DEFAULT_GLOW;
  
  // Get the color for the rarity to use as an external hover glow
  const rarityColor = finalRarity ? RARITY_COLORS[finalRarity] : null;

  // Detect card type. Prefer the explicit `type` prop; fall back to `title`
  // (which is the type string in the modal, and "Emote..." or the type in the grid).
  const effectiveType = type || title || "Emote";
  const isEmote = effectiveType.startsWith("Emote");

  // Pick the source the card should actually render.
  //
  // The catalogue's `thumbUrl` is always a static, downscaled thumbnail (the
  // bot generates it in `uploadWithThumbnail` from a single frame). If the
  // full `image` is animated, prefer it over `thumbUrl` so the card animates.
  // When the image is static, keep the fast thumbnail path.
  const imageIsAnimated = isAnimatedUrl(image);
  const resolvedSrc = imageIsAnimated && image
    ? image
    : (thumbUrl || image || "");

  // In the modal, non-emotes (splash art, mobile wallpaper, sticker) render as
  // a raw full-resolution <img> at natural aspect ratio, bypassing ProfileCard's
  // emote-shaped framing so the whole image shows uncropped. Emotes keep using
  // ProfileCard so their card framing is unchanged.
  if (isModal && !isEmote && image) {
    return (
      <img
        src={image}
        alt={name || "Card"}
        className="full-wallpaper"
        onClick={onClick}
        style={{ cursor: "zoom-out" }}
      />
    );
  }

  return (
    <div 
      className="relative group w-full h-full"
      // Pass the color to CSS so it can be applied to the tilting .pc-card element
      style={{ '--hover-glow': rarityColor ? `${rarityColor}cc` : 'transparent' } as React.CSSProperties}
    >
      <ProfileCard
        name={name || "Unknown Card"}
        title={title || "Emote"}
        handle={(name || "unknown").toLowerCase().replace(/\s+/g, "-")}
        status="Online"
        contactText="View"
        avatarUrl={resolvedSrc}
        rarity={finalRarity}
        showUserInfo={false}
        enableTilt={enableTilt}
        enableMobileTilt={false}
        behindGlowColor={finalGlow}
        iconUrl={null}
        behindGlowEnabled
        innerGradient="linear-gradient(145deg,#60496e8c 0%,#71C4FF44 100%)"
        isModal={isModal}
        onContactClick={onClick}
        copyEmote={copyEmote}
      />
    </div>
  );
}