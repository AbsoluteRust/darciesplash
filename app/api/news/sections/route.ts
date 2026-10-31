import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kv } from "@vercel/kv";

const DEFAULT_SECTIONS = [
  { id: 'general', label: 'General', color: '#9ca3af' },
  { id: 'website', label: 'Website', color: '#3b82f6' },
  { id: 'games', label: 'Games', color: '#a855f7' },
  { id: 'darcie', label: 'Darcie', color: '#ec4899' },
  { id: 'emotes', label: 'Emotes', color: '#22c55e' },
  { id: 'collections', label: 'Collections', color: '#eab308' },
  { id: 'admin-updates', label: 'Admin Updates', color: '#ef4444' },
];

export async function GET() {
  try {
    const session = await auth();
    const adminIds = (process.env.ADMIN_IDS || "").split(",").map(id => id.trim());
    const isAdmin = !!session?.user?.id && adminIds.includes(session.user.id);

    let sections = (await kv.get("news_sections")) || DEFAULT_SECTIONS;

    // Migrate old sections missing colors
    sections = sections.map((s: any) => {
      if (!s.color) {
        const defaultSec = DEFAULT_SECTIONS.find(d => d.id === s.id);
        return { ...s, color: defaultSec ? defaultSec.color : '#3b82f6' };
      }
      return s;
    });

    if (!sections.find((s: any) => s.id === 'admin-updates')) {
      sections.push(DEFAULT_SECTIONS.find(s => s.id === 'admin-updates'));
    }

    if (!isAdmin) {
      sections = sections.filter((s: any) => s.id !== 'admin-updates');
    }

    return NextResponse.json({ sections });
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch sections" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  const adminIds = (process.env.ADMIN_IDS || "").split(",").map(id => id.trim());
  if (!session?.user?.id || !adminIds.includes(session.user.id)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { action, id, label, color, order } = await req.json();

  try {
    let sections = (await kv.get("news_sections")) || DEFAULT_SECTIONS;
    
    if (!sections.find((s: any) => s.id === 'admin-updates')) {
      sections.push(DEFAULT_SECTIONS.find(s => s.id === 'admin-updates'));
    }

    if (action === "create") {
      const newId = label.toLowerCase().replace(/[^a-z0-9]/g, '-');
      if (!sections.find((s: any) => s.id === newId)) {
        sections.push({ id: newId, label, color: color || '#3b82f6' });
      }
    } 
    else if (action === "edit") {
      if (id === 'admin-updates') return NextResponse.json({ error: "Cannot rename admin section" }, { status: 400 });
      sections = sections.map((s: any) => s.id === id ? { ...s, label, color } : s);
    } 
    else if (action === "delete") {
      if (id === 'admin-updates') return NextResponse.json({ error: "Cannot delete admin section" }, { status: 400 });
      
      sections = sections.filter((s: any) => s.id !== id);
      
      const posts = (await kv.get("news_posts")) || [];
      const updatedPosts = posts.map((p: any) => 
        p.section === id ? { ...p, section: "general" } : p
      );
      await kv.set("news_posts", updatedPosts);
    }
    else if (action === "reorder" && Array.isArray(order)) {
      const sectionMap = new Map(sections.map((s: any) => [s.id, s]));
      const newSections = order.map((id: string) => sectionMap.get(id)).filter(Boolean);
      
      // Add any sections that weren't in the order list (safety fallback)
      sections.forEach((s: any) => {
        if (!order.includes(s.id)) newSections.push(s);
      });
      sections = newSections;
    }

    await kv.set("news_sections", sections);
    return NextResponse.json({ ok: true, sections });
  } catch (err) {
    return NextResponse.json({ error: "Failed to update sections" }, { status: 500 });
  }
}