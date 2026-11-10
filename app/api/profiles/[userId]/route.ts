// app/api/profiles/[userId]/route.ts
import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId: rawUserId } = await params;
  const userId = String(rawUserId);

  const botUrl = (process.env.PI_BOT_URL || "").replace(/\/$/, "");
  const botHeaders = { Authorization: `Bearer ${process.env.PI_BOT_SECRET}` };

  // 1. Fetch name & avatar
  let userInfo = { name: "Unknown User", avatarUrl: "https://cdn.discordapp.com/embed/avatars/0.png" };
  try {
    const res = await fetch(`${botUrl}/api/user/profile?userId=${userId}`, {
      headers: botHeaders,
      cache: "no-store",
    });
    if (res.ok) userInfo = await res.json();
  } catch (err) {}

  // 2. Fetch Badges & Roles
  const [rawBadges, roles] = await Promise.all([
    kv.hgetall(`user_badges:${userId}`).catch(() => ({})) as Promise<Record<string, string>>,
    kv.get(`account_roles:${userId}`).catch(() => ({})) as Promise<Record<string, boolean>>
  ]);

  let loyalty: string[] = [];
  if (rawBadges?.loyalty) {
    try {
      loyalty = typeof rawBadges.loyalty === "string" ? JSON.parse(rawBadges.loyalty) : rawBadges.loyalty;
    } catch {}
  }

  const manualSubMonths = Number(rawBadges?.sub_months || 0);

  let kofiSubMonths = 0;
  try {
    const res = await fetch(`${botUrl}/api/kofi/subscription?discordId=${encodeURIComponent(userId)}`, {
      headers: botHeaders,
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      kofiSubMonths = Number(data?.months) || 0;
    }
  } catch (err) {}

  const badges = {
    gifts: Number(rawBadges?.gifts || 0),
    referrals: Number(rawBadges?.referrals || 0),
    subMonths: Math.max(manualSubMonths, kofiSubMonths),
    isCommissioner: !!roles?.commissioner,
    loyalty,
  };

  // 3. Fetch Emotes
  const guildEmotes = ((await kv.get("guild_emotes").catch(() => ({}))) || {}) as Record<string, { id: string }>;
  const emotes = {
    heart: guildEmotes["lilyHeart"]?.id || null,
    sparkle: guildEmotes["lilySparkle"]?.id || null,
    gift: guildEmotes["lilyGift"]?.id || null,
    banana: guildEmotes["lilyBanana"]?.id || null,
    love: guildEmotes["lilyLove"]?.id || null,
  };

  // 4. Online Status
  const heartbeats = ((await kv.hgetall("user_heartbeats").catch(() => ({}))) || {}) as Record<string, number>;
  const lastPing = Number(heartbeats[userId] || 0);
  const isOnline = Date.now() - lastPing < 120000;

  // 5. Custom Color
  const userColors = ((await kv.hgetall("user_profile_colors").catch(() => ({}))) || {}) as Record<string, string>;
  const customColor = userColors[userId] || null;

  // 6. Inventory
  const inventory = ((await kv.hgetall(`user_cards:${userId}`).catch(() => ({}))) || {}) as Record<string, number>;

  // 7. Points
  const packPoints = Number(await kv.hget('user_scores', userId).catch(() => 0)) || 0;

  let collectorPoints = 0;
  try {
    const scoreRes = await fetch(`${botUrl}/api/user/collection-score?userId=${userId}`, {
      headers: botHeaders,
      cache: "no-store",
    });
    if (scoreRes.ok) {
      const scoreData = await scoreRes.json();
      collectorPoints = Number(scoreData.score) || 0;
    }
  } catch (err) {}

  // 8. Streaks
  let streakTotal = 0;
  let streakScore = 0;
  let streakBreakdown: any[] = [];
  try {
    const streakRes = await fetch(`${botUrl}/api/user/streak-breakdown?userId=${userId}`, {
      headers: botHeaders,
      cache: "no-store",
    });
    if (streakRes.ok) {
      const data = await streakRes.json();
      streakTotal = data.total || 0;
      streakScore = data.streakScore || 0;
      streakBreakdown = data.breakdown || [];
    }
  } catch (err) {}

  // 9. Stardust
  const stardust = Number(await kv.hget('user_stardust', userId).catch(() => 0)) || 0;

  // 10. Favorites
  const favKey = `user_favorites:${userId}`;
  let favorites: string[] = [];
  try {
    const rawFavs = await kv.get(favKey);
    if (rawFavs) {
      if (Array.isArray(rawFavs)) favorites = rawFavs;
      else if (typeof rawFavs === 'string') favorites = JSON.parse(rawFavs);
    }
  } catch (err) {}

  // 11. Badge Overrides
  let badgeOverrides = {};
  try {
    badgeOverrides = (await kv.get('custom_badges')) || {};
  } catch (err) {}

  // 12. Achievements (delegated to the bot's computeAchievementsDetailed)
  let achievements: any[] = [];
  try {
    const res = await fetch(
      `${botUrl}/api/user/achievements?userId=${encodeURIComponent(userId)}`,
      { headers: botHeaders, cache: "no-store" }
    );
    if (res.ok) {
      const data = await res.json();
      achievements = (data.achievements || []).map((a: any) => ({
        id: a.label,
        label: a.label,
        rarity: a.tier,
        emoji: a.emoji,
        color: a.color || null,
        unlocked: !!a.unlocked,
      }));
    } else {
      console.error('[profile] achievements fetch failed:', res.status);
    }
  } catch (err) {
    console.error('[profile] achievements fetch threw:', err);
  }

  // 13. Featured achievement id
  let featuredBadgeId: string | null = null;
  try {
    featuredBadgeId = (await kv.get(`user_featured_badge:${userId}`)) as string | null;
  } catch (err) {
    console.error('[profile] featured-badge read failed:', err);
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
    badgeOverrides,
    achievements,
    featuredBadgeId,
    stats: {
      stardust,
      collectorPoints,
      packPoints,
      streakTotal,
      streakScore,
      streakBreakdown,
    }
  });
}