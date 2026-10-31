import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kv } from "@vercel/kv";

export async function POST(req: Request) {
  const session = await auth();
  const adminIds = (process.env.ADMIN_IDS || "").split(",").map(id => id.trim());
  
  if (!session?.user?.id || !adminIds.includes(session.user.id)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing post ID" }, { status: 400 });

  try {
    const posts = (await kv.get("news_posts")) || [];
    const updatedPosts = posts.filter((p: any) => p.id !== id);

    if (posts.length === updatedPosts.length) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    await kv.set("news_posts", updatedPosts);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[news] delete failed:", err);
    return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
  }
}