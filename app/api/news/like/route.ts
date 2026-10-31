import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kv } from "@vercel/kv";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "You must be signed in to like posts." }, { status: 401 });
  }

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing post ID" }, { status: 400 });

  try {
    const posts = (await kv.get("news_posts")) || [];
    const index = posts.findIndex((p: any) => p.id === id);
    if (index === -1) return NextResponse.json({ error: "Post not found" }, { status: 404 });

    const post = posts[index];
    let likes = post.likes || [];
    
    const userId = session.user.id;
    const hasLiked = likes.includes(userId);

    if (hasLiked) {
      likes = likes.filter((uid: string) => uid !== userId);
    } else {
      likes.push(userId);
    }

    posts[index] = { ...post, likes };
    await kv.set("news_posts", posts);

    return NextResponse.json({ ok: true, hasLiked: !hasLiked, count: likes.length });
  } catch (err) {
    return NextResponse.json({ error: "Failed to toggle like" }, { status: 500 });
  }
}