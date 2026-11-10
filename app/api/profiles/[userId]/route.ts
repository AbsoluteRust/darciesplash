// app/api/profiles/[userId]/route.ts
import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;

  // ... [Keep all your existing userInfo, badges, kofi, emotes, heartbeats, colors code here] ...
  
  // (For brevity, I'm assuming you have the variables `userInfo`, `badges`, `emotes`, `isOnline`, and `customColor` populated exactly as they are in your current file)
  
  // 1. Fetch name & avatar from the Bot
  let userInfo = { name: "Unknown User", avatarUrl: "https://cdn.discordapp.com/embed/avatars/0.png" };
  try {
    const botUrl = (process.env.PI_BOT_URL || "").replace(/\/$/, "");
    const res = await fetch(`${botUrl}/api/user/profile?userId=${userId}`, {
      headers: { Authorization: `Bearer ${process.env.PI_BOT_SECRET}` },
      cache: "no-store",
    });
    if (res.ok) userInfo = await res.json();
  } catch (err) {}

  const rawBadges = (await kv.hgetall(`user_badges:${userId}`)) || {};
  const roles = (await kv.get(`account_roles:${userId}`)) || {};
  let loyalty: string[] = [];
  if (rawBadges.loyalty) {
    try {
      loyalty = typeof rawBadges.loyalty === "string" ? JSON.parse(rawBadges.loyalty) : rawBadges.loyalty;
    } catch {}
  }
  const manualSubMonths = Number(rawBadges.sub_months || 0);
  
  let kofiSubMonths = 0;
  try {
    const botUrl = (process.env.PI_BOT_URL || "").replace(/\/$/, "");
    const res = await fetch(`${botUrl}/api/kofi/subscription?discordId=${encodeURIComponent(userId)}`, {
      headers: { Authorization: `Bearer ${process.env.PI_BOT_SECRET}` },
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      kofiSubMonths = Number(data?.months) || 0;
    }
  } catch (err) {}

  const badges = {
    gifts: Number(rawBadges.gifts || 0),
    referrals: Number(rawBadges.referrals || 0),
    subMonths: Math.max(manualSubMonths, kofiSubMonths),
    isCommissioner: !!roles.commissioner,
    loyalty,
  };

  const guildEmotes = (await kv.get("guild_emotes")) || {};
  const emotes = {
    heart: guildEmotes["lilyHeart"]?.id || null,
    sparkle: guildEmotes["lilySparkle"]?.id || null,
    gift: guildEmotes["lilyGift"]?.id || null,
    banana: guildEmotes["lilyBanana"]?.id || null,
    love: guildEmotes["lilyLove"]?.id || null,
  };

  const heartbeats = (await kv.hgetall("user_heartbeats")) || {};
  const lastPing = Number(heartbeats[userId] || 0);
  const isOnline = Date.now() - lastPing < 120000;

  const userColors = (await kv.hgetall("user_profile_colors")) || {};
  const customColor = userColors[userId] || null;

  // 6. Fetch Inventory, Stats, & Favorites
  const inventory = (await kv.hgetall(`user_cards:${userId}`)) || {};
  
  const collectorPoints = Number(await kv.hget('user_scores', userId)) || 0;
  const packPoints = Number(await kv.hget('user_pack_points', userId)) || 0;
  const stardust = (badges.subMonths * 6800) + (badges.referrals * 6800) + (badges.gifts * 6800) + (badges.isCommissioner ? 6800 : 0);

  let streakSources: string[] = [];
  try {
    const rawStreaks = await kv.hget('user_streak_sources', userId);
    if (rawStreaks) streakSources = typeof rawStreaks === 'string' ? JSON.parse(rawStreaks) : rawStreaks;
  } catch {}

  // Fetch the user's showcased favorites
  // 7. Fetch Favorites
  let favorites: string[] = [];
  try {
    const rawFavs = await kv.get(`user_favorites:${userId}`);
    if (Array.isArray(rawFavs)) {
      favorites = rawFavs;
    } else if (typeof rawFavs === 'string') {
      // Fallback for any old string-formatted entries
      favorites = JSON.parse(rawFavs);
    }
  } catch (err) {
    console.error("Failed to parse favorites:", err);
  }

  return NextResponse.json({
    id: userId,
    ...userInfo,
    isOnline,
    badges,
    emotes,
    customColor,
    inventory,
    favorites,
    stats: {
      stardust,
      collectorPoints,
      packPoints,
      streakSources,
    }
  });
}