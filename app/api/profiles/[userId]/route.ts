// app/api/profiles/[userId]/route.ts
import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;

  // 1. Fetch name & avatar from the Bot
  let userInfo = { name: "Unknown User", avatarUrl: "https://cdn.discordapp.com/embed/avatars/0.png" };
  try {
    const botUrl = (process.env.PI_BOT_URL || "").replace(/\/$/, "");
    const res = await fetch(`${botUrl}/api/user/profile?userId=${userId}`, {
      headers: { Authorization: `Bearer ${process.env.PI_BOT_SECRET}` },
      cache: "no-store",
    });
    if (res.ok) userInfo = await res.json();
  } catch (err) {
    console.error("Failed to fetch user from bot:", err);
  }

  // 2. Fetch Badges & Roles from KV
  const rawBadges = (await kv.hgetall(`user_badges:${userId}`)) || {};
  const roles = (await kv.get(`account_roles:${userId}`)) || {};

  let loyalty: string[] = [];
  if (rawBadges.loyalty) {
    try {
      loyalty = typeof rawBadges.loyalty === "string"
        ? JSON.parse(rawBadges.loyalty)
        : rawBadges.loyalty;
    } catch {}
  }

  const manualSubMonths = Number(rawBadges.sub_months || 0);

  // 2b. Fetch Ko-fi subscription months from the bot and merge with manual.
  // Manual value (from the old /manage-badges system) and Ko-fi value (from
  // webhook + backfill) are two separate histories. Take the larger of the
  // two so anyone counted by either system shows their badge.
  let kofiSubMonths = 0;
  try {
    const botUrl = (process.env.PI_BOT_URL || "").replace(/\/$/, "");
    const res = await fetch(
      `${botUrl}/api/kofi/subscription?discordId=${encodeURIComponent(userId)}`,
      {
        headers: { Authorization: `Bearer ${process.env.PI_BOT_SECRET}` },
        cache: "no-store",
      }
    );
    if (res.ok) {
      const data = await res.json();
      kofiSubMonths = Number(data?.months) || 0;
    }
  } catch (err) {
    console.error("Failed to fetch Ko-fi subscription from bot:", err);
  }

  const badges = {
    gifts: Number(rawBadges.gifts || 0),
    referrals: Number(rawBadges.referrals || 0),
    subMonths: Math.max(manualSubMonths, kofiSubMonths),
    isCommissioner: !!roles.commissioner,
    loyalty,
  };

  // 3. Fetch Emote IDs from the bot's KV
  const guildEmotes = (await kv.get("guild_emotes")) || {};
  const emotes = {
    heart: guildEmotes["lilyHeart"]?.id || null,
    sparkle: guildEmotes["lilySparkle"]?.id || null,
    gift: guildEmotes["lilyGift"]?.id || null,
    banana: guildEmotes["lilyBanana"]?.id || null,
    love: guildEmotes["lilyLove"]?.id || null,
  };

  // 4. Check Online Status
  const heartbeats = (await kv.hgetall("user_heartbeats")) || {};
  const lastPing = Number(heartbeats[userId] || 0);
  const isOnline = Date.now() - lastPing < 120000;

  // 5. Fetch custom color
  const userColors = (await kv.hgetall("user_profile_colors")) || {};
  const customColor = userColors[userId] || null;

  return NextResponse.json({
    id: userId,
    ...userInfo,
    isOnline,
    badges,
    emotes,
    customColor,
  });
}