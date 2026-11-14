// app/admin/card-thumbnails/AdminCardThumbEditor.tsx
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Card = {
  name: string;
  image: string;
  thumbUrl: string;
  collection: string;
  rarity: string;
  type: string;
  override: {
    thumbUrl: string;
    crop: { left: number; top: number; width: number; height: number };
    quality: number;
    savedAt: number;
  } | null;
};

type Crop = { left: number; top: number; width: number; height: number };

const THUMB_SIZE = 640;
const ASPECT = 1; // square

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function sizeDelta(defaultSize: number, customSize: number) {
  const diff = customSize - defaultSize;
  const pct = defaultSize > 0 ? (diff / defaultSize) * 100 : 0;
  const sign = diff > 0 ? '+' : '';
  const color = diff > 0 ? 'text-amber-400' : diff < 0 ? 'text-emerald-400' : 'text-white/50';
  return { label: `${sign}${formatBytes(Math.abs(diff))} (${sign}${pct.toFixed(0)}%)`, color, diff };
}

export default function AdminCardThumbEditor() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Card | null>(null);
  const [filter, setFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/card-thumbnails', { cache: 'no-store' });
      const data = await res.json();
      setCards(Array.isArray(data.cards) ? data.cards : []);
    } catch (err) {
      console.error('[admin-card-thumb] load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter(c =>
      c.name.toLowerCase().includes(q) ||
      String(c.collection || '').toLowerCase().includes(q)
    );
  }, [cards, filter]);

  return (
    <div className="min-h-screen bg-[#0a0a14] text-white pt-32 pb-20 px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
          <h1 className="text-3xl font-black">Card Thumbnail Editor</h1>
          <div className="flex gap-3 items-center">
            <input
              type="text"
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Filter by name or collection…"
              className="px-4 py-2 rounded-lg bg-black/40 border border-white/20 text-sm w-64 focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={load}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-bold transition disabled:opacity-50"
            >
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-white/50">Loading cards…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-white/40 italic">No cards match.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {filtered.map(card => (
              <button
                key={card.name}
                onClick={() => setSelected(card)}
                className="group relative bg-white/[0.03] border border-white/10 rounded-xl overflow-hidden text-left hover:border-white/30 transition"
              >
                <div className="aspect-square bg-black/50 overflow-hidden">
                  <img
                    src={card.thumbUrl || card.image}
                    alt={card.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="p-2">
                  <div className="text-sm font-bold truncate">{card.name}</div>
                  <div className="text-[10px] text-white/40 uppercase tracking-wider truncate">
                    {card.collection} · {card.rarity}
                  </div>
                  {card.override && (
                    <div className="mt-1 text-[9px] font-bold text-indigo-400">
                      ✎ Custom · Q{card.override.quality}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <CardEditorModal
          card={selected}
          onClose={() => setSelected(null)}
          onSaved={() => { setSelected(null); load(); }}
        />
      )}
    </div>
  );
}

function CardEditorModal({
  card,
  onClose,
  onSaved,
}: {
  card: Card;
  onClose: () => void;
  onSaved: () => void;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [imgLoaded, setImgLoaded] = useState(false);
  const [srcDims, setSrcDims] = useState({ w: 0, h: 0 });
  const [displayDims, setDisplayDims] = useState({ w: 0, h: 0 });
  const [crop, setCrop] = useState<Crop | null>(card.override?.crop ?? null);
  const [quality, setQuality] = useState(card.override?.quality ?? 78);

  const [preview, setPreview] = useState<{
    defaultDataUrl: string;
    defaultSize: number;
    customDataUrl: string;
    customSize: number;
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dragRef = useRef<{
    mode: 'move' | 'nw' | 'ne' | 'sw' | 'se';
    startX: number;
    startY: number;
    startCrop: Crop;
  } | null>(null);

  const handleImgLoad = () => {
    const img = imgRef.current;
    if (!img) return;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    setSrcDims({ w, h });
    setImgLoaded(true);

    const maxW = 700;
    const maxH = 500;
    const scale = Math.min(maxW / w, maxH / h, 1);
    setDisplayDims({ w: Math.round(w * scale), h: Math.round(h * scale) });

    if (!crop) {
      const side = Math.min(w, h);
      setCrop({
        left: Math.round((w - side) / 2),
        top: Math.round((h - side) / 2),
        width: side,
        height: side,
      });
    }
  };

  useEffect(() => {
    if (!imgLoaded || !crop) return;
    const t = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const res = await fetch('/api/admin/card-thumbnails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cardName: card.name,
            mode: 'preview',
            crop,
            quality,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        setPreview(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setPreviewLoading(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [imgLoaded, crop, quality, card.name]);

  const startDrag = useCallback((mode: 'move' | 'nw' | 'ne' | 'sw' | 'se') =>
    (e: React.PointerEvent) => {
      if (!crop) return;
      e.preventDefault();
      e.stopPropagation();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      dragRef.current = {
        mode,
        startX: e.clientX,
        startY: e.clientY,
        startCrop: { ...crop },
      };
    }, [crop]);

  const onMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current || !crop) return;
    e.preventDefault();

    const scaleX = srcDims.w / displayDims.w;
    const scaleY = srcDims.h / displayDims.h;
    const dx = (e.clientX - dragRef.current.startX) * scaleX;
    const dy = (e.clientY - dragRef.current.startY) * scaleY;
    const { mode, startCrop } = dragRef.current;

    let next: Crop = { ...startCrop };

    if (mode === 'move') {
      next.left = Math.max(0, Math.min(srcDims.w - startCrop.width, startCrop.left + dx));
      next.top = Math.max(0, Math.min(srcDims.h - startCrop.height, startCrop.top + dy));
    } else {
      // Aspect-locked (1:1) resize. Each corner anchors the opposite corner.
      let newSide = startCrop.width;
      let newLeft = startCrop.left;
      let newTop = startCrop.top;

      if (mode === 'se') {
        newSide = Math.max(50, startCrop.width + dx);
      } else if (mode === 'sw') {
        newSide = Math.max(50, startCrop.width - dx);
        newLeft = startCrop.left + startCrop.width - newSide;
      } else if (mode === 'ne') {
        newSide = Math.max(50, startCrop.width + dx);
        newTop = startCrop.top + startCrop.height - newSide;
      } else if (mode === 'nw') {
        newSide = Math.max(50, startCrop.width - dx);
        newLeft = startCrop.left + startCrop.width - newSide;
        newTop = startCrop.top + startCrop.height - newSide;
      }

      // Clamp to source bounds
      newLeft = Math.max(0, Math.min(srcDims.w - newSide, newLeft));
      newTop = Math.max(0, Math.min(srcDims.h - newSide, newTop));
      newSide = Math.min(newSide, srcDims.w - newLeft, srcDims.h - newTop);

      next = {
        left: Math.round(newLeft),
        top: Math.round(newTop),
        width: Math.round(newSide),
        height: Math.round(newSide),
      };
    }

    setCrop(next);
  }, [crop, srcDims, displayDims]);

  const onUp = useCallback((e: React.PointerEvent) => {
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
    dragRef.current = null;
  }, []);

  const handleSave = async () => {
    if (!crop) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/card-thumbnails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardName: card.name,
          mode: 'save',
          crop,
          quality,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      onSaved();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const displayCrop = crop && displayDims.w > 0 ? {
    left: (crop.left / srcDims.w) * displayDims.w,
    top: (crop.top / srcDims.h) * displayDims.h,
    width: (crop.width / srcDims.w) * displayDims.w,
    height: (crop.height / srcDims.h) * displayDims.h,
  } : null;

  const delta = preview
    ? sizeDelta(preview.defaultSize, preview.customSize)
    : null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative bg-[#0a0a14] border border-white/15 rounded-3xl w-full max-w-5xl p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white text-xl leading-none"
          aria-label="Close"
        >×</button>

        <h2 className="text-2xl font-black mb-1">{card.name}</h2>
        <p className="text-sm text-white/50 mb-6">
          {card.collection} · {card.rarity}
          {srcDims.w > 0 && ` · Source ${srcDims.w}×${srcDims.h}`}
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2">
              Crop position (square)
            </div>
            <div
              ref={containerRef}
              className="relative bg-black/50 rounded-xl overflow-hidden inline-block"
              style={{
                width: displayDims.w || 700,
                height: displayDims.h || 400,
              }}
            >
              <img
                ref={imgRef}
                src={card.image || card.thumbUrl}
                alt={card.name}
                onLoad={handleImgLoad}
                draggable={false}
                className="absolute inset-0 w-full h-full object-contain select-none"
                style={{ pointerEvents: 'none' }}
              />

              {displayCrop && imgLoaded && (
                <>
                  <div className="absolute bg-black/60 pointer-events-none"
                       style={{ left: 0, top: 0, right: 0, height: displayCrop.top }} />
                  <div className="absolute bg-black/60 pointer-events-none"
                       style={{ left: 0, top: displayCrop.top + displayCrop.height, right: 0, bottom: 0 }} />
                  <div className="absolute bg-black/60 pointer-events-none"
                       style={{ left: 0, top: displayCrop.top, width: displayCrop.left, height: displayCrop.height }} />
                  <div className="absolute bg-black/60 pointer-events-none"
                       style={{ left: displayCrop.left + displayCrop.width, top: displayCrop.top, right: 0, height: displayCrop.height }} />

                  <div
                    onPointerDown={startDrag('move')}
                    onPointerMove={onMove}
                    onPointerUp={onUp}
                    onPointerCancel={onUp}
                    className="absolute border-2 border-indigo-400 cursor-move touch-none"
                    style={{
                      left: displayCrop.left,
                      top: displayCrop.top,
                      width: displayCrop.width,
                      height: displayCrop.height,
                    }}
                  >
                    {(['nw', 'ne', 'sw', 'se'] as const).map(corner => {
                      const pos: React.CSSProperties = {
                        position: 'absolute',
                        width: 14,
                        height: 14,
                        background: '#fff',
                        border: '2px solid #6366f1',
                        borderRadius: 2,
                      };
                      if (corner.includes('n')) pos.top = -7; else pos.bottom = -7;
                      if (corner.includes('w')) pos.left = -7; else pos.right = -7;
                      return (
                        <div
                          key={corner}
                          onPointerDown={startDrag(corner)}
                          onPointerMove={onMove}
                          onPointerUp={onUp}
                          onPointerCancel={onUp}
                          style={{ ...pos, cursor: `${corner}-resize`, touchAction: 'none' }}
                        />
                      );
                    })}
                  </div>
                </>
              )}
            </div>
            <p className="text-[10px] text-white/40 mt-2 leading-relaxed">
              Drag the window or any corner to reposition the square crop. The
              card frame crops to portrait at display time — this square is the
              region that will be shown inside it.
            </p>
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2">
              Quality
            </div>
            <div className="flex items-center gap-3 mb-1">
              <input
                type="range"
                min={40}
                max={95}
                value={quality}
                onChange={e => setQuality(parseInt(e.target.value, 10))}
                className="flex-1 accent-indigo-500"
              />
              <span className="text-sm font-bold tabular-nums w-10 text-right">{quality}</span>
            </div>
            <p className="text-[10px] text-white/40 mb-4">
              Higher = crisper, larger. Default is 78.
            </p>

            <div className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2">
              Preview
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-black/50 rounded-lg p-2">
                <div className="text-[10px] font-bold text-white/40 uppercase mb-1">
                  Default (Q78)
                </div>
                <div className="aspect-square bg-white/5 rounded overflow-hidden flex items-center justify-center">
                  {preview?.defaultDataUrl ? (
                    <img src={preview.defaultDataUrl} alt="Default preview" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[10px] text-white/30">Loading…</span>
                  )}
                </div>
                <div className="mt-1.5 text-xs font-bold tabular-nums text-white/70">
                  {preview ? formatBytes(preview.defaultSize) : '—'}
                </div>
              </div>

              <div className="bg-black/50 rounded-lg p-2 border border-indigo-500/30">
                <div className="text-[10px] font-bold text-indigo-300 uppercase mb-1">
                  Yours (Q{quality})
                </div>
                <div className="aspect-square bg-white/5 rounded overflow-hidden flex items-center justify-center">
                  {preview?.customDataUrl ? (
                    <img src={preview.customDataUrl} alt="Custom preview" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[10px] text-white/30">
                      {previewLoading ? 'Loading…' : 'Adjust crop'}
                    </span>
                  )}
                </div>
                <div className="mt-1.5 flex justify-between items-baseline gap-2">
                  <span className="text-xs font-bold tabular-nums text-white/70">
                    {preview ? formatBytes(preview.customSize) : '—'}
                  </span>
                  {delta && (
                    <span className={`text-[10px] font-bold tabular-nums ${delta.color}`}>
                      {delta.label}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <p className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-300">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !crop || !preview}
            className="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}