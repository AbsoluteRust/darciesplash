// lib/collection-layout-sort.ts
import type { CollectionLayout } from './collection-layout';

const TYPE_ORDER = ['Splash Art', 'Mobile Wallpaper', 'Sticker', 'Emote'];
const RARITY_ORDER = [
  'Contraband',
  'Mythic',
  'Legendary',
  'Epic',
  'Rare',
  'Uncommon',
  'Common',
];

export type RenderGroup = {
  id: string;
  title?: string;
  description?: string;
  cards: any[];
};

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function applyManualOrder(cards: any[], order: string[]): any[] {
  if (!order || order.length === 0) return cards;
  const byName = new Map(cards.map(c => [c.name, c]));
  const out: any[] = [];
  for (const name of order) {
    const c = byName.get(name);
    if (c) {
      out.push(c);
      byName.delete(name);
    }
  }
  for (const c of byName.values()) out.push(c);
  return out;
}

function getCardTimestamp(card: any): number | null {
  const raw =
    card.createdAt ??
    card.created_at ??
    card.created ??
    card.timestamp ??
    card.dateAdded ??
    card.createdOn ??
    null;
  if (raw == null) return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  const t = new Date(raw).getTime();
  return Number.isFinite(t) ? t : null;
}

function byCreatedDesc(a: any, b: any): number {
  const ta = getCardTimestamp(a) ?? 0;
  const tb = getCardTimestamp(b) ?? 0;
  return tb - ta;
}

export function buildGroups(
  cards: any[],
  layout: CollectionLayout
): RenderGroup[] {
  // ---- Custom sections ----
  if (layout.mode === 'custom' && layout.sections) {
    const byName = new Map(cards.map(c => [c.name, c]));
    const used = new Set<string>();
    const groups: RenderGroup[] = [];

    for (const section of layout.sections) {
      const sectionCards: any[] = [];
      for (const name of section.cards) {
        const c = byName.get(name);
        if (c && !used.has(name)) {
          sectionCards.push(c);
          used.add(name);
        }
      }
      groups.push({
        id: section.id,
        title: section.title,
        description: section.description,
        cards: layout.randomised ? shuffle(sectionCards) : sectionCards,
      });
    }

    const orphans = cards.filter(c => !used.has(c.name));
    if (orphans.length > 0) {
      groups.push({
        id: '__orphans__',
        title: 'Other cards',
        description: 'Not assigned to a section yet.',
        cards: layout.randomised ? shuffle(orphans) : orphans,
      });
    }
    return groups;
  }

  // ---- Auto mode ----
  switch (layout.sortBy) {
    case 'default': {
      const ordered = applyManualOrder(cards, layout.manualOrder || []);
      return [
        {
          id: 'default',
          cards: layout.randomised ? shuffle(ordered) : ordered,
        },
      ];
    }

    case 'creation': {
      const byYear = new Map<string, any[]>();
      for (const c of cards) {
        const ts = getCardTimestamp(c);
        const year = ts != null ? String(new Date(ts).getFullYear()) : 'Unknown';
        if (!byYear.has(year)) byYear.set(year, []);
        byYear.get(year)!.push(c);
      }
      const years = [...byYear.keys()].sort((a, b) => {
        if (a === 'Unknown') return 1;
        if (b === 'Unknown') return -1;
        return Number(b) - Number(a);
      });
      return years.map(year => {
        const yearCards = byYear.get(year)!.slice().sort(byCreatedDesc);
        return {
          id: `year-${year}`,
          title: year === 'Unknown' ? 'Before creation tracking' : year,
          cards: layout.randomised ? shuffle(yearCards) : yearCards,
        };
      });
    }

    case 'type': {
      const byType = new Map<string, any[]>();
      for (const c of cards) {
        const type = c.type || 'Emote';
        if (!byType.has(type)) byType.set(type, []);
        byType.get(type)!.push(c);
      }
      const types = [...byType.keys()].sort((a, b) => {
        const ia = TYPE_ORDER.indexOf(a);
        const ib = TYPE_ORDER.indexOf(b);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      });
      return types.map(type => {
        const typeCards = byType.get(type)!.slice().sort(byCreatedDesc);
        return {
          id: `type-${type}`,
          title: type,
          cards: layout.randomised ? shuffle(typeCards) : typeCards,
        };
      });
    }

    case 'rarity': {
      const byRarity = new Map<string, any[]>();
      for (const c of cards) {
        const rarity = c.rarity || 'Common';
        if (!byRarity.has(rarity)) byRarity.set(rarity, []);
        byRarity.get(rarity)!.push(c);
      }
      const rarities = [...byRarity.keys()].sort((a, b) => {
        const ia = RARITY_ORDER.indexOf(a);
        const ib = RARITY_ORDER.indexOf(b);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      });
      return rarities.map(rarity => {
        const rarityCards = byRarity.get(rarity)!.slice().sort(byCreatedDesc);
        return {
          id: `rarity-${rarity}`,
          title: rarity,
          cards: layout.randomised ? shuffle(rarityCards) : rarityCards,
        };
      });
    }

    default:
      return [{ id: 'default', cards }];
  }
}