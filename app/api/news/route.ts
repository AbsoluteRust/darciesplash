import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const posts = (await kv.get("news_posts")) || [];
    return NextResponse.json({ posts });
  } catch (err) {
    console.error("Failed to fetch news:", err);
    return NextResponse.json({ error: "Failed to fetch news" }, { status: 500 });
  }
}