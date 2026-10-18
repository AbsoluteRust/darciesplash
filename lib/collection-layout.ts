// lib/collection-layout.ts

export type SortMode = 'default' | 'creation' | 'type' | 'rarity';
export type LayoutMode = 'auto' | 'custom';

export type CollectionSection = {
  id: string;
  title: string;
  description: string;
  cards: string[];
};

export type CollectionLayout = {
  mode: LayoutMode;
  sortBy: SortMode;
  manualOrder?: string[];
  sections?: CollectionSection[];
  randomised: boolean;
  updatedAt?: number;
  updatedBy?: string;
};

export const SECTION_TITLE_MAX = 40;
export const SECTION_DESC_MAX = 300;

export const DEFAULT_LAYOUT: CollectionLayout = {
  mode: 'auto',
  sortBy: 'default',
  randomised: false,
};

export function normalizeLayout(raw: any): CollectionLayout {
  if (!raw) return { ...DEFAULT_LAYOUT };

  // Legacy: { order: string[] } → default auto sort with manual order
  if (Array.isArray(raw.order) && !raw.mode) {
    return {
      mode: 'auto',
      sortBy: 'default',
      manualOrder: raw.order,
      randomised: false,
    };
  }

  const sortBy: SortMode =
    ['default', 'creation', 'type', 'rarity'].includes(raw.sortBy)
      ? raw.sortBy
      : 'default';

  return {
    mode: raw.mode === 'custom' ? 'custom' : 'auto',
    sortBy,
    manualOrder: Array.isArray(raw.manualOrder) ? raw.manualOrder : undefined,
    sections: Array.isArray(raw.sections)
      ? raw.sections
          .map((s: any) => ({
            id: String(s?.id || crypto.randomUUID()),
            title: String(s?.title || '').slice(0, SECTION_TITLE_MAX),
            description: String(s?.description || '').slice(0, SECTION_DESC_MAX),
            cards: Array.isArray(s?.cards) ? s.cards.map(String) : [],
          }))
          .filter((s: CollectionSection) => s.cards.length > 0)
      : undefined,
    randomised: !!raw.randomised,
    updatedAt: raw.updatedAt,
    updatedBy: raw.updatedBy,
  };
}

export function validateLayout(
  layout: CollectionLayout,
  _allCardNames: string[]
): { ok: true } | { ok: false; error: string } {
  if (layout.mode === 'custom') {
    if (!layout.sections || layout.sections.length === 0) {
      return { ok: false, error: 'Add at least one section.' };
    }
    const seen = new Set<string>();
    for (const section of layout.sections) {
      if (section.cards.length === 0) {
        return {
          ok: false,
          error: `Section "${section.title || '(untitled)'}" needs at least one card.`,
        };
      }
      for (const name of section.cards) {
        if (seen.has(name)) {
          return {
            ok: false,
            error: `Card "${name}" appears in more than one section.`,
          };
        }
        seen.add(name);
      }
      if (section.title.length > SECTION_TITLE_MAX) {
        return { ok: false, error: `Title too long: "${section.title}"` };
      }
      if (section.description.length > SECTION_DESC_MAX) {
        return {
          ok: false,
          error: `Description too long in "${section.title}"`,
        };
      }
    }
  }
  return { ok: true };
}