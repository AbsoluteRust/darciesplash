import React from "react";

const EMOTE_RE = /<(a?):(\w+):(\d+)>/g;

export function parseEmotes(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  EMOTE_RE.lastIndex = 0;
  while ((match = EMOTE_RE.exec(text)) !== null) {
    const [full, animated, name, id] = match;

    // Push the text before this emote
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const ext = animated ? "gif" : "webp";
    nodes.push(
      <img
        key={`${id}-${match.index}`}
        src={`https://cdn.discordapp.com/emojis/${id}.${ext}`}
        alt={`:${name}:`}
        className="testimonial-emote-inline"
        loading="lazy"
      />
    );

    lastIndex = match.index + full.length;
  }

  // Push any trailing text
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}