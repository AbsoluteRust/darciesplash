import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { auth } from "@/auth";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();
    const adminIds = (process.env.ADMIN_IDS || "").split(",").map(id => id.trim());
    const isAdmin = !!session?.user?.id && adminIds.includes(session.user.id);

    let posts = (await kv.get("news_posts")) || [];

    // Hide admin posts from regular users
    if (!isAdmin) {
      posts = posts.filter((p: any) => p.section !== 'admin-updates');
    }

    return NextResponse.json({ posts });
  } catch (err) {
    console.error("Failed to fetch news:", err);
    return NextResponse.json({ error: "Failed to fetch news" }, { status: 500 });
  }
}