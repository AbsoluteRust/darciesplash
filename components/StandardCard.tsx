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

export default function StandardCard({
  name,
  title,
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

  return (
    <ProfileCard
      name={name || "Unknown Card"}
      title={title || "Emote"}
      handle={(name || "unknown").toLowerCase().replace(/\s+/g, "-")}
      status="Online"
      contactText="View"
      avatarUrl={thumbUrl || image || ""}
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
  );
}