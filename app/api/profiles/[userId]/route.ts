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

  // 1. Fetch name & avatar from the Bot
  let userInfo = { name: "Unknown User", avatarUrl: "https://cdn.discordapp.com/embed/avatars/0.png" };
  try {
    const res = await fetch(`${botUrl}/api/user/profile?userId=${userId}`, {
      headers: botHeaders,
      cache: "no-store",
    });
    if (res.ok) userInfo = await res.json();
  } catch (err) {}

  // 2. Fetch Badges & Roles from KV
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
    const res = await fetch(
      `${botUrl}/api/kofi/subscription?discordId=${encodeURIComponent(userId)}`,
      { headers: botHeaders, cache: "no-store" }
    );
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

  // 3. Fetch Emote IDs
  const guildEmotes = (await kv.get("guild_emotes")) || {};
  const emotes = {
    heart: guildEmotes["lilyHeart"]?.id || null,
    sparkle: guildEmotes["lilySparkle"]?.id || null,
    gift: guildEmotes["lilyGift"]?.id || null,
    banana: guildEmotes["lilyBanana"]?.id || null,
    love: guildEmotes["lilyLove"]?.id || null,
  };

  // 4. Online Status
  const heartbeats = (await kv.hgetall("user_heartbeats")) || {};
  const lastPing = Number(heartbeats[userId] || 0);
  const isOnline = Date.now() - lastPing < 120000;

  // 5. Custom Color
  const userColors = (await kv.hgetall("user_profile_colors")) || {};
  const customColor = userColors[userId] || null;

  // 6. Fetch Inventory
  const inventory = (await kv.hgetall(`user_cards:${userId}`)) || {};

  // 7. Fetch Points
  // Pack Points (spendable via /b)
  const packPoints = Number(await kv.hget('user_scores', userId)) || 0;

  // Collector Points (from /leaderboard)
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
  } catch (err) {
    console.error("Failed to fetch collection score:", err);
  }

  // Stardust (starts in 2027)
  let stardust = 0;
  const currentYear = new Date().getFullYear();
  if (currentYear >= 2027) {
    stardust += (badges.subMonths * 6800);
    stardust += (badges.referrals * 6800);
    stardust += (badges.gifts * 6800);
    if (badges.isCommissioner) stardust += 6800;
    const weeklyBonuses = Number(await kv.hget('user_weekly_stardust', userId)) || 0;
    stardust += weeklyBonuses;
  }

  // 8. Streak Sources (from lib/streaks.js)
  let streakSources: string[] = [];
  try {
    const streakData = (await kv.hgetall(`user_streaks:${userId}`)) || {};
    if (streakData.daily_last) streakSources.push("Daily Streak");
    if (streakData.weekly_last) streakSources.push("Weekly Streak");
    if (streakData.monthly_last) streakSources.push("Monthly Streak");

    const now = Date.now();
    const weeklyExpiries = (await kv.hgetall(`user_bonus_weekly:${userId}`)) || {};
    let activeWeekly = 0;
    for (const expiry of Object.values(weeklyExpiries)) if (Number(expiry) > now) activeWeekly++;
    if (activeWeekly > 0) streakSources.push(`${activeWeekly}x Weekly Pack Bonus`);

    const monthlyExpiries = (await kv.hgetall(`user_bonus_monthly:${userId}`)) || {};
    let activeMonthly = 0;
    for (const expiry of Object.values(monthlyExpiries)) if (Number(expiry) > now) activeMonthly++;
    if (activeMonthly > 0) streakSources.push(`${activeMonthly}x Monthly Pack Bonus`);
  } catch (err) {}

  // 9. Favorites
  const favKey = `user_favorites:${userId}`;
  let favorites: string[] = [];
  try {
    const rawFavs = await kv.get(favKey);
    if (rawFavs) {
      if (Array.isArray(rawFavs)) favorites = rawFavs;
      else if (typeof rawFavs === 'string') favorites = JSON.parse(rawFavs);
    }
  } catch (err) {}

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