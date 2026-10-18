// scripts/seed-collection-meta.mjs
import nextEnv from "@next/env";
import { kv } from "@vercel/kv";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const DEFAULT_META = {
  darcie: { displayName: "Darcie", publicSlug: "darcie" },
  tobi: { displayName: "Tobi", publicSlug: "tobi" },
  madolche: { displayName: "Madolche", publicSlug: "madolche" },
  celestial: { displayName: "Celestial", publicSlug: "celestial" },
  lunalux: { displayName: "LunaLux", publicSlug: "lunalux" },
  halo: { displayName: "Halo", publicSlug: "halo" },
};

const META_KEY = (s) => `collection_meta:${s}`;

async function main() {
  for (const [internal, def] of Object.entries(DEFAULT_META)) {
    const existing = await kv.get(META_KEY(internal));
    if (existing) {
      console.log(`[seed] ${internal} already exists, skipping`);
      continue;
    }
    await kv.set(META_KEY(internal), {
      internalSlug: internal,
      displayName: def.displayName,
      publicSlug: def.publicSlug,
      slugHistory: [],
      lastRenamedAt: 0,
    });
    console.log(`[seed] ${internal} → "${def.displayName}" @ /${def.publicSlug}`);
  }

  const index = {};
  for (const [internal, def] of Object.entries(DEFAULT_META)) {
    index[def.publicSlug] = internal;
  }
  await kv.set("collection_slug_index", index);
  console.log("[seed] slug index built:", index);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});