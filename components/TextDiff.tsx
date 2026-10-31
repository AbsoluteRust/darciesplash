'use client';

import { diffWords } from 'diff';

export default function TextDiff({ oldText, newText }: { oldText: string; newText: string }) {
  // Calculate the differences
  const changes = diffWords(oldText, newText);

  return (
    <div className="whitespace-pre-wrap text-sm leading-relaxed text-white/70">
      {changes.map((part, index) => {
        if (part.added) {
          return (
            <span key={index} className="bg-green-500/30 text-green-200 px-1 rounded-sm border border-green-500/50">
              {part.value}
            </span>
          );
        }
        if (part.removed) {
          return (
            <span key={index} className="bg-red-500/30 text-red-200 px-1 rounded-sm line-through opacity-70 border border-red-500/50">
              {part.value}
            </span>
          );
        }
        return <span key={index}>{part.value}</span>;
      })}
    </div>
  );
}