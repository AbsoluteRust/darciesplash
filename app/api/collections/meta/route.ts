// app/api/collections/meta/route.ts
import { NextResponse } from "next/server";
import {
  getAllMeta,
  getMeta,
  resolveSlug,
  canRenameNow,
  cooldownRemainingMs,
} from "@/lib/collection-meta";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  const internal = searchParams.get("internal");

  // Resolve a public slug (current or historical) to internal
  if (slug) {
    const internalSlug = await resolveSlug(slug);
    if (!internalSlug) {
      return NextResponse.json({ error: "Unknown slug" }, { status: 404 });
    }
    const meta = await getMeta(internalSlug);
    return NextResponse.json({
      meta,
      canRename: canRenameNow(meta),
      cooldownRemainingMs: cooldownRemainingMs(meta),
    });
  }

  // Single collection by internal slug
  if (internal) {
    const meta = await getMeta(internal);
    return NextResponse.json({
      meta,
      canRename: canRenameNow(meta),
      cooldownRemainingMs: cooldownRemainingMs(meta),
    });
  }

  // All collections
  const all = await getAllMeta();
  return NextResponse.json({
    collections: all.map((m) => ({
      meta: m,
      canRename: canRenameNow(m),
      cooldownRemainingMs: cooldownRemainingMs(m),
    })),
  });
}