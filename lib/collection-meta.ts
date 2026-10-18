// lib/collection-meta.ts
import { kv } from "@vercel/kv";

export type CollectionMeta = {
  internalSlug: string;
  displayName: string;
  publicSlug: string;
  slugHistory: string[];
  lastRenamedAt: number;
  updatedAt?: number;
  updatedBy?: string;
};

export const RENAME_COOLDOWN_MS = 90 * 24 * 60 * 60 * 1000;
export const DISPLAY_NAME_MAX = 50;
export const PUBLIC_SLUG_MAX = 60;

/** Order is the canonical display order on the site and in the bot. */
export const INTERNAL_SLUGS = [
  "darcie",
  "tobi",
  "madolche",
  "celestial",
  "lunalux",
  "halo",
] as const;

export const DEFAULT_META: Record<
  string,
  { displayName: string; publicSlug: string }
> = {
  darcie: { displayName: "Darcie", publicSlug: "darcie" },
  tobi: { displayName: "Tobi", publicSlug: "tobi" },
  madolche: { displayName: "Madolche", publicSlug: "madolche" },
  celestial: { displayName: "Celestial", publicSlug: "celestial" },
  lunalux: { displayName: "LunaLux", publicSlug: "lunalux" },
  halo: { displayName: "Halo", publicSlug: "halo" },
};

const META_KEY = (internalSlug: string) => `collection_meta:${internalSlug}`;
const SLUG_INDEX_KEY = "collection_slug_index"; // { publicSlug: internalSlug }

export function normalizeMeta(
  raw: any,
  internalSlug: string
): CollectionMeta {
  const fallback = DEFAULT_META[internalSlug] || {
    displayName: internalSlug,
    publicSlug: internalSlug,
  };
  return {
    internalSlug,
    displayName: String(raw?.displayName || fallback.displayName).slice(
      0,
      DISPLAY_NAME_MAX
    ),
    publicSlug: String(raw?.publicSlug || fallback.publicSlug).slice(
      0,
      PUBLIC_SLUG_MAX
    ),
    slugHistory: Array.isArray(raw?.slugHistory)
      ? raw.slugHistory.map(String)
      : [],
    lastRenamedAt: Number(raw?.lastRenamedAt) || 0,
    updatedAt: raw?.updatedAt,
    updatedBy: raw?.updatedBy,
  };
}

export async function getMeta(internalSlug: string): Promise<CollectionMeta> {
  const raw = await kv.get(META_KEY(internalSlug));
  return normalizeMeta(raw, internalSlug);
}

export async function getAllMeta(): Promise<CollectionMeta[]> {
  const metas = await Promise.all(
    INTERNAL_SLUGS.map((s) => getMeta(s))
  );
  return metas;
}

export async function getSlugIndex(): Promise<Record<string, string>> {
  return (await kv.get(SLUG_INDEX_KEY)) || {};
}

/** Resolve any public slug (current or historical) to an internal slug. */
export async function resolveSlug(
  publicSlug: string
): Promise<string | null> {
  const index = await getSlugIndex();
  return index[publicSlug] || null;
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function canRenameNow(meta: CollectionMeta): boolean {
  if (!meta.lastRenamedAt) return true;
  return Date.now() - meta.lastRenamedAt >= RENAME_COOLDOWN_MS;
}

export function cooldownRemainingMs(meta: CollectionMeta): number {
  if (!meta.lastRenamedAt) return 0;
  return Math.max(0, RENAME_COOLDOWN_MS - (Date.now() - meta.lastRenamedAt));
}

/** Rebuild the entire slug index from current metas. */
export async function rebuildSlugIndex(): Promise<Record<string, string>> {
  const metas = await getAllMeta();
  const index: Record<string, string> = {};
  for (const m of metas) {
    index[m.publicSlug] = m.internalSlug;
    for (const h of m.slugHistory) index[h] = m.internalSlug;
  }
  await kv.set(SLUG_INDEX_KEY, index);
  return index;
}

/**
 * Save new displayName/publicSlug for a collection, atomically updating
 * the slug index. Caller is responsible for auth + cooldown validation.
 */
export async function saveRename(
  internalSlug: string,
  next: { displayName: string; publicSlug: string },
  updatedBy: string
): Promise<CollectionMeta> {
  const existing = await getMeta(internalSlug);
  const index = await getSlugIndex();

  // Reject if another collection currently owns this public slug
  const owner = index[next.publicSlug];
  if (owner && owner !== internalSlug) {
    throw new Error(`Slug "${next.publicSlug}" is already in use`);
  }
  // Reject if this collection already used this slug historically (would confuse redirects)
  if (
    existing.slugHistory.includes(next.publicSlug) &&
    next.publicSlug !== existing.publicSlug
  ) {
    throw new Error(
      `Slug "${next.publicSlug}" was previously this collection's slug`
    );
  }

  const history = new Set(existing.slugHistory);
  history.add(existing.publicSlug);
  history.delete(next.publicSlug);

  const updated: CollectionMeta = {
    internalSlug,
    displayName: next.displayName,
    publicSlug: next.publicSlug,
    slugHistory: [...history],
    lastRenamedAt: Date.now(),
    updatedAt: Date.now(),
    updatedBy,
  };

  // Write meta first, then index — if index write fails we can rebuild.
  await kv.set(META_KEY(internalSlug), updated);

  const nextIndex = { ...index };
  // Remove all old mappings for this internal slug
  for (const [slug, owner] of Object.entries(nextIndex)) {
    if (owner === internalSlug) delete nextIndex[slug];
  }
  nextIndex[updated.publicSlug] = internalSlug;
  for (const h of updated.slugHistory) nextIndex[h] = internalSlug;
  await kv.set(SLUG_INDEX_KEY, nextIndex);

  return updated;
}