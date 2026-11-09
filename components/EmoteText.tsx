// components/EmoteText.tsx
'use client';

import { useEmoteLookup } from '@/lib/emoteLookup';
import { parseEmotes } from '@/lib/parseEmotes';

export function EmoteText({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  const lookup = useEmoteLookup();
  return <span className={className}>{parseEmotes(content, lookup)}</span>;
}