import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kv } from "@vercel/kv";

export async function POST(req: Request) {
  const session = await auth();
  const adminIds = (process.env.ADMIN_IDS || "").split(",").map(id => id.trim());
  
  if (!session?.user?.id || !adminIds.includes(session.user.id)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, title, section, content } = await req.json();
  if (!id || !title || !section || !content) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  try {
    const posts = (await kv.get("news_posts")) || [];
    const index = posts.findIndex((p: any) => p.id === id);
    if (index === -1) return NextResponse.json({ error: "Post not found" }, { status: 404 });

    const oldPost = posts[index];
    
    // Add old content to revisions before updating
    const revisions = oldPost.revisions || [];
    revisions.push({
      title: oldPost.title,
      section: oldPost.section,
      content: oldPost.content,
      editedAt: Date.now()
    });

    posts[index] = {
      ...oldPost,
      title,
      section,
      content,
      editedAt: Date.now(),
      revisions: revisions.slice(-10) // Keep only the last 10 edits
    };

    await kv.set("news_posts", posts);
    return NextResponse.json({ ok: true, post: posts[index] });
  } catch (err) {
    return NextResponse.json({ error: "Failed to edit post" }, { status: 500 });
  }
}