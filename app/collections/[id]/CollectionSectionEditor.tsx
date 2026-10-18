'use client';

import { useCallback, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  SECTION_TITLE_MAX,
  SECTION_DESC_MAX,
  type CollectionSection,
} from '@/lib/collection-layout';

type AnyCard = { name: string; image?: string; thumbUrl?: string; type?: string };

function SortableCardChip({ id, card }: { id: string; card: AnyCard }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
    cursor: 'grab',
    touchAction: 'none',
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="section-editor__chip"
    >
      {card.thumbUrl || card.image ? (
        <img src={card.thumbUrl || card.image} alt={card.name} draggable={false} />
      ) : (
        <span>{card.name.slice(0, 2)}</span>
      )}
      <span className="section-editor__chip-name">{card.name}</span>
    </div>
  );
}

export default function CollectionSectionEditor({
  sections,
  allCards,
  onChange,
}: {
  sections: CollectionSection[];
  allCards: AnyCard[];
  onChange: (next: CollectionSection[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const cardByName = useMemo(
    () => new Map(allCards.map(c => [c.name, c])),
    [allCards]
  );
  const usedNames = useMemo(() => {
    const s = new Set<string>();
    for (const sec of sections) for (const n of sec.cards) s.add(n);
    return s;
  }, [sections]);

  const unassigned = useMemo(
    () => allCards.filter(c => !usedNames.has(c.name)),
    [allCards, usedNames]
  );

  const updateSection = (id: string, patch: Partial<CollectionSection>) => {
    onChange(sections.map(s => (s.id === id ? { ...s, ...patch } : s)));
  };

  const removeSection = (id: string) => {
    onChange(sections.filter(s => s.id !== id));
  };

  const addSection = () => {
    onChange([
      ...sections,
      {
        id: crypto.randomUUID(),
        title: `Section ${sections.length + 1}`.slice(0, SECTION_TITLE_MAX),
        description: '',
        cards: [],
      },
    ]);
  };

  const handleDragEnd = (sectionId: string, e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;
    const oldIdx = section.cards.indexOf(String(active.id));
    const newIdx = section.cards.indexOf(String(over.id));
    if (oldIdx === -1 || newIdx === -1) return;
    updateSection(sectionId, { cards: arrayMove(section.cards, oldIdx, newIdx) });
  };

  const addCardTo = (sectionId: string, cardName: string) => {
    const cleaned = sections.map(s => ({
      ...s,
      cards: s.cards.filter(n => n !== cardName),
    }));
    onChange(
      cleaned.map(s =>
        s.id === sectionId ? { ...s, cards: [...s.cards, cardName] } : s
      )
    );
  };

  const removeCardFrom = (sectionId: string, cardName: string) => {
    onChange(
      sections.map(s =>
        s.id === sectionId
          ? { ...s, cards: s.cards.filter(n => n !== cardName) }
          : s
      )
    );
  };

  return (
    <div className="section-editor">
      {sections.map(section => (
        <div key={section.id} className="section-editor__section">
          <div className="section-editor__header">
            <input
              type="text"
              className="section-editor__title-input"
              value={section.title}
              onChange={e =>
                updateSection(section.id, {
                  title: e.target.value.slice(0, SECTION_TITLE_MAX),
                })
              }
              maxLength={SECTION_TITLE_MAX}
              placeholder="Section title"
            />
            <span className="section-editor__counter">
              {section.title.length}/{SECTION_TITLE_MAX}
            </span>
            <button
              type="button"
              className="section-editor__remove"
              onClick={() => removeSection(section.id)}
              disabled={sections.length === 1}
              title="Remove section"
            >
              ✕
            </button>
          </div>

          <textarea
            className="section-editor__desc-input"
            value={section.description}
            onChange={e =>
              updateSection(section.id, {
                description: e.target.value.slice(0, SECTION_DESC_MAX),
              })
            }
            maxLength={SECTION_DESC_MAX}
            placeholder="Optional description"
            rows={2}
          />
          <span className="section-editor__counter">
            {section.description.length}/{SECTION_DESC_MAX}
          </span>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={e => handleDragEnd(section.id, e)}
          >
            <SortableContext items={section.cards} strategy={rectSortingStrategy}>
              <div className="section-editor__grid">
                {section.cards.map(name => {
                  const card = cardByName.get(name);
                  if (!card) return null;
                  return (
                    <div key={name} className="section-editor__card-wrap">
                      <SortableCardChip id={name} card={card} />
                      <button
                        type="button"
                        className="section-editor__card-remove"
                        onClick={() => removeCardFrom(section.id, name)}
                        title="Remove card from section"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>

          {section.cards.length === 0 && (
            <p className="section-editor__empty">Add cards from below</p>
          )}

          {unassigned.length > 0 && (
            <details className="section-editor__picker">
              <summary>+ Add card</summary>
              <div className="section-editor__picker-grid">
                {unassigned.slice(0, 60).map(c => (
                  <button
                    key={c.name}
                    type="button"
                    className="section-editor__picker-item"
                    onClick={() => addCardTo(section.id, c.name)}
                    title={c.name}
                  >
                    {c.thumbUrl || c.image ? (
                      <img src={c.thumbUrl || c.image} alt={c.name} />
                    ) : (
                      <span>{c.name.slice(0, 2)}</span>
                    )}
                  </button>
                ))}
              </div>
            </details>
          )}
        </div>
      ))}

      <button type="button" className="section-editor__add" onClick={addSection}>
        + Add section
      </button>

      {sections.some(s => s.cards.length === 0) && (
        <p className="section-editor__warning">
          Every section needs at least one card.
        </p>
      )}
    </div>
  );
}