import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export async function POST(req: Request) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing post ID" }, { status: 400 });

  try {
    const posts = (await kv.get("news_posts")) || [];
    const index = posts.findIndex((p: any) => p.id === id);
    if (index === -1) return NextResponse.json({ error: "Post not found" }, { status: 404 });

    const post = posts[index];
    const shares = (post.shares || 0) + 1;

    posts[index] = { ...post, shares };
    await kv.set("news_posts", posts);

    return NextResponse.json({ ok: true, shares });
  } catch (err) {
    return NextResponse.json({ error: "Failed to increment share" }, { status: 500 });
  }
}