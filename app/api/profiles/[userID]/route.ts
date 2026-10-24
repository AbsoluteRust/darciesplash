import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;

  let userInfo = { name: "Unknown User", avatarUrl: "https://cdn.discordapp.com/embed/avatars/0.png" };
  let debugError = null;

  try {
    const botUrl = (process.env.PI_BOT_URL || "").replace(/\/$/, "");
    if (!botUrl) throw new Error("PI_BOT_URL is missing in Vercel");
    
    const res = await fetch(`${botUrl}/api/user/profile?userId=${userId}`, {
      headers: { Authorization: `Bearer ${process.env.PI_BOT_SECRET}` },
      cache: "no-store",
    });
    
    if (res.ok) {
      userInfo = await res.json();
    } else {
      const text = await res.text();
      debugError = `Bot returned ${res.status}: ${text}`;
    }
  } catch (err: any) {
    debugError = `Fetch failed: ${err.message}`;
  }

  // Fetch Badges from KV
  const rawBadges = (await kv.hgetall(`user_badges:${userId}`)) || {};
  
  let loyalty: string[] = [];
  if (rawBadges.loyalty) {
    try {
      loyalty = typeof rawBadges.loyalty === "string" 
        ? JSON.parse(rawBadges.loyalty) 
        : rawBadges.loyalty;
    } catch {}
  }

  const badges = {
    gifts: Number(rawBadges.gifts || 0),
    referrals: Number(rawBadges.referrals || 0),
    subMonths: Number(rawBadges.sub_months || 0),
    loyalty,
  };

  const heartbeats = (await kv.hgetall("user_heartbeats")) || {};
  const lastPing = Number(heartbeats[userId] || 0);
  const isOnline = Date.now() - lastPing < 120000; 

  return NextResponse.json({
    id: userId,
    ...userInfo,
    isOnline,
    badges,
    _debug: debugError // <--- This will tell us what broke
  });
}