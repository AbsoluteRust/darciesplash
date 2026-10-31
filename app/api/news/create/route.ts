import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kv } from "@vercel/kv";

export async function POST(req: Request) {
  const session = await auth();
  const adminIds = (process.env.ADMIN_IDS || "").split(",").map(id => id.trim());
  
  if (!session?.user?.id || !adminIds.includes(session.user.id)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title, section, content, imageUrl } = await req.json();
  if (!title || !section || !content) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const newPost = {
    id: crypto.randomUUID(),
    title,
    section,
    content,
    imageUrl: imageUrl || null,
    timestamp: Date.now(),
    author: {
      name: session.user.name || "Admin",
      avatar: session.user.image || "https://cdn.discordapp.com/embed/avatars/0.png"
    },
    revisions: []
    likes: [], // <-- Add this
    shares: 0 
  };

  try {
    const existing = (await kv.get("news_posts")) || [];
    existing.unshift(newPost);
    await kv.set("news_posts", existing.slice(0, 100));
    return NextResponse.json({ ok: true, post: newPost });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}