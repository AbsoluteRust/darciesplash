import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kv } from "@vercel/kv";
import { canEditCollectionOrder } from "@/lib/collection-owners";
import {
  getMeta,
  saveRename,
  canRenameNow,
  cooldownRemainingMs,
  slugify,
  DISPLAY_NAME_MAX,
  PUBLIC_SLUG_MAX,
  INTERNAL_SLUGS,
} from "@/lib/collection-meta";

type AccountRoles = {
  commissioner: boolean;
  darsubscribbler: boolean;
};

function readRoles(raw: any): AccountRoles {
  return {
    commissioner: !!raw?.commissioner,
    darsubscribbler: !!raw?.darsubscribbler,
  };
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const internalSlug = String(body?.internalSlug || "");
  const rawDisplay = String(body?.displayName || "").trim();
  const rawPublic = String(body?.publicSlug || "").trim();

  if (!INTERNAL_SLUGS.includes(internalSlug as any)) {
    return NextResponse.json({ error: "Unknown collection" }, { status: 400 });
  }
  if (!rawDisplay || rawDisplay.length > DISPLAY_NAME_MAX) {
    return NextResponse.json(
      { error: `Display name must be 1–${DISPLAY_NAME_MAX} chars` },
      { status: 400 }
    );
  }

  const derivedSlug = rawPublic ? slugify(rawPublic) : slugify(rawDisplay);
  if (!derivedSlug || derivedSlug.length > PUBLIC_SLUG_MAX) {
    return NextResponse.json(
      { error: `URL slug must be 1–${PUBLIC_SLUG_MAX} chars, letters/digits/hyphens only` },
      { status: 400 }
    );
  }

  const rolesRaw = await kv.get(`account_roles:${session.user.id}`);
  const roles = readRoles(rolesRaw);

  if (!canEditCollectionOrder(session.user.id, internalSlug, roles)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const existing = await getMeta(internalSlug);

  if (!canRenameNow(existing)) {
    const days = Math.ceil(cooldownRemainingMs(existing) / (24 * 60 * 60 * 1000));
    return NextResponse.json(
      { error: `You can rename this collection again in ${days} day${days === 1 ? "" : "s"}` },
      { status: 429 }
    );
  }

  try {
    const updated = await saveRename(
      internalSlug,
      { displayName: rawDisplay, publicSlug: derivedSlug },
      session.user.id
    );
    return NextResponse.json({
      ok: true,
      meta: updated,
      canRename: false,
      cooldownRemainingMs: cooldownRemainingMs(updated),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Rename failed" },
      { status: 400 }
    );
  }
}