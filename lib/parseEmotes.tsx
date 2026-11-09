// lib/parseEmotes.tsx
import React from 'react';

export type EmoteLookup = Record<string, { id: string; animated: boolean }>;

// Matches either <:name:id> / <a:name:id> OR bare :name: shortcodes.
const EMOTE_RE = /<(a?):(\w+):(\d+)>|:(\w+):/g;

export function parseEmotes(
  text: string,
  lookup?: EmoteLookup,
  className: string = 'testimonial-emote-inline',
): React.ReactNode[] {
  if (!text) return [];

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  EMOTE_RE.lastIndex = 0;
  while ((match = EMOTE_RE.exec(text)) !== null) {
    const [full, animated, discordName, discordId, shortcodeName] = match;

    let name: string;
    let id: string;
    let isAnimated: boolean;

    if (discordId) {
      // <:name:id> or <a:name:id> — always trust the ID in the markup.
      name = discordName;
      id = discordId;
      isAnimated = !!animated;
    } else {
      // :name: — resolve via lookup; skip entirely if not found (treat as literal text).
      const found = lookup?.[shortcodeName];
      if (!found) continue;
      name = shortcodeName;
      id = found.id;
      isAnimated = found.animated;
    }

    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const ext = isAnimated ? 'gif' : 'webp';
    nodes.push(
      <img
        key={`${id}-${match.index}`}
        src={`https://cdn.discordapp.com/emojis/${id}.${ext}`}
        alt={`:${name}:`}
        className={className}
        loading="lazy"
      />,
    );

    lastIndex = match.index + full.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}