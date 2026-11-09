// app/adminEmoteManager/AdminEmoteManager.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';

type Assignment = {
  collections: string[];
  commissioners: string[];
  ignored: boolean;
  updatedBy?: string;
  updatedAt?: number;
};

type Emote = {
  id: string;
  name: string;
  animated: boolean;
  guildId: string;
  guildName: string;
  url: string;
  assignment: Assignment | null;
};

type Collection = { id: string; label: string };
type Commissioner = { id: string; label: string };
type Filter =
  | 'all' | 'unassigned' | 'ignored'
  | `collection:${string}` | `commissioner:${string}` | `guild:${string}`;

export default function AdminEmoteManager() {
  const [emotes, setEmotes] = useState<Emote[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [commissioners, setCommissioners] = useState<Commissioner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/admin/emotes', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setEmotes(data.emotes || []);
      setCollections(data.collections || []);
      setCommissioners(data.commissioners || []);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const guilds = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of emotes) m.set(e.guildId, e.guildName);
    return Array.from(m, ([id, name]) => ({ id, name }));
  }, [emotes]);

  const filtered = useMemo(() => {
    return emotes.filter(e => {
      if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false;
      const a = e.assignment;
      switch (filter) {
        case 'all': return true;
        case 'unassigned':
          return !a || (!a.ignored && a.collections.length === 0 && a.commissioners.length === 0);
        case 'ignored': return !!a?.ignored;
        default:
          if (filter.startsWith('collection:'))
            return !!a && !a.ignored && a.collections.includes(filter.slice(11));
          if (filter.startsWith('commissioner:'))
            return !!a && !a.ignored && a.commissioners.includes(filter.slice(13));
          if (filter.startsWith('guild:'))
            return e.guildId === filter.slice(6);
          return true;
      }
    });
  }, [emotes, search, filter]);

  const stats = useMemo(() => {
    let assigned = 0, ignored = 0, unassigned = 0;
    for (const e of emotes) {
      const a = e.assignment;
      if (a?.ignored) ignored++;
      else if (a && (a.collections.length || a.commissioners.length)) assigned++;
      else unassigned++;
    }
    return { total: emotes.length, assigned, ignored, unassigned };
  }, [emotes]);

  async function patchOne(emojiId: string, patch: any) {
    setEmotes(prev => prev.map(e => e.id === emojiId ? optimistic(e, patch) : e));
    try {
      const res = await fetch('/api/admin/emotes/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emojiId, patch }),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json();
      setEmotes(prev => prev.map(e => e.id === emojiId ? { ...e, assignment: updated } : e));
    } catch (e: any) {
      alert('Save failed: ' + e.message);
      await load();
    }
  }

  async function bulk(patch: any) {
    if (selected.size === 0) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/emotes/bulk-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emojiIds: Array.from(selected), patch }),
      });
      if (!res.ok) throw new Error(await res.text());
      setSelected(new Set());
      await load();
    } catch (e: any) { alert('Bulk failed: ' + e.message); }
    finally { setSaving(false); }
  }

  function toggleSel(id: string) {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }
  function selectAllVisible() { setSelected(new Set(filtered.map(e => e.id))); }
  function clearSel() { setSelected(new Set()); }

  if (loading) return <div className="p-8 text-white/60">Loading emotes…</div>;
  if (error) return (
    <div className="p-8">
      <p className="text-red-400 mb-2">Failed to load: {error}</p>
      <button onClick={load} className="px-4 py-2 bg-indigo-600 rounded-lg text-white">Retry</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a14] text-white">
      <div className="max-w-[1800px] mx-auto p-6 space-y-4">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black">Emote Manager</h1>
            <p className="text-white/50 text-sm mt-1">
              {stats.total} total · {stats.assigned} assigned · {stats.ignored} ignored · {stats.unassigned} unassigned
            </p>
          </div>
          <button onClick={load} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg">
            Refresh
          </button>
        </header>

        <div className="flex flex-wrap gap-3 items-center">
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name…"
            className="flex-1 min-w-[240px] px-4 py-2 bg-white/5 border border-white/10 rounded-lg placeholder-white/30"
          />
          <select
            value={filter} onChange={e => setFilter(e.target.value as Filter)}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg"
          >
            <option value="all">All</option>
            <option value="unassigned">Unassigned</option>
            <option value="ignored">Ignored</option>
            {collections.map(c => <option key={c.id} value={`collection:${c.id}`}>Collection: {c.label}</option>)}
            {commissioners.map(c => <option key={c.id} value={`commissioner:${c.id}`}>Commissioner: {c.label}</option>)}
            {guilds.map(g => <option key={g.id} value={`guild:${g.id}`}>Guild: {g.name}</option>)}
          </select>
          <button onClick={selectAllVisible} className="px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm">
            Select visible ({filtered.length})
          </button>
        </div>

        {selected.size > 0 && (
          <div className="sticky top-2 z-20 flex flex-wrap gap-2 items-center bg-indigo-950/90 border border-indigo-500/40 rounded-xl px-4 py-3 shadow-lg backdrop-blur">
            <span className="text-sm font-bold">{selected.size} selected</span>
            <BulkAddCollection collections={collections} onAdd={id => bulk({ addCollections: [id] })} />
            <BulkAddCommissioner commissioners={commissioners} onAdd={id => bulk({ addCommissioners: [id] })} />
            <button
              onClick={() => bulk({ ignored: true })}
              className="px-3 py-1.5 bg-red-600/80 hover:bg-red-600 rounded-md text-sm font-bold"
            >Mark ignored</button>
            <button
              onClick={() => bulk({ setCollections: [], setCommissioners: [], ignored: false })}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-md text-sm"
            >Clear</button>
            <button onClick={clearSel} className="ml-auto px-3 py-1.5 text-sm text-white/60 hover:text-white">
              Deselect
            </button>
          </div>
        )}

        {saving && <p className="text-yellow-400 text-sm">Saving…</p>}

        <div className="divide-y divide-white/5 border border-white/10 rounded-2xl overflow-hidden bg-white/[0.02]">
          {filtered.map(e => {
            const a = e.assignment;
            const isOpen = expanded === e.id;
            return (
              <div key={e.id} className="p-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox" checked={selected.has(e.id)} onChange={() => toggleSel(e.id)}
                    className="w-4 h-4 accent-indigo-500 shrink-0"
                  />
                  <img src={e.url} alt={e.name} className="w-8 h-8 object-contain shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold truncate">{e.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/40">
                        {e.guildName}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap mt-1">
                      {a?.ignored && <Chip color="red">ignored</Chip>}
                      {a?.collections?.map(id => (
                        <Chip key={id} color="indigo">
                          {collections.find(c => c.id === id)?.label || id}
                          <XButton onClick={() => patchOne(e.id, { removeCollections: [id] })} />
                        </Chip>
                      ))}
                      {a?.commissioners?.map(id => (
                        <Chip key={id} color="pink">
                          {commissioners.find(c => c.id === id)?.label || id}
                          <XButton onClick={() => patchOne(e.id, { removeCommissioners: [id] })} />
                        </Chip>
                      ))}
                      {!a?.ignored && a?.collections.length === 0 && a?.commissioners.length === 0 && (
                        <span className="text-[11px] text-white/30">unassigned</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setExpanded(isOpen ? null : e.id)}
                    className="px-3 py-1.5 text-sm bg-white/5 hover:bg-white/10 rounded-md shrink-0"
                  >{isOpen ? 'Close' : 'Edit'}</button>
                </div>

                {isOpen && (
                  <div className="mt-3 ml-8 grid gap-4 md:grid-cols-3">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-white/40 mb-2">Collections</p>
                      <div className="flex flex-wrap gap-2">
                        {collections.map(c => {
                          const on = a?.collections?.includes(c.id);
                          return (
                            <label key={c.id} className={`px-2 py-1 rounded border cursor-pointer text-xs ${on ? 'bg-indigo-600 border-indigo-400' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                              <input type="checkbox" checked={!!on} className="hidden" onChange={() => {
                                const next = new Set(a?.collections || []);
                                next.has(c.id) ? next.delete(c.id) : next.add(c.id);
                                patchOne(e.id, { setCollections: Array.from(next) });
                              }} />
                              {c.label}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-widest text-white/40 mb-2">Commissioners</p>
                      <div className="flex flex-wrap gap-2">
                        {commissioners.length === 0 && <span className="text-white/30 text-xs">No commissioners found on cards yet</span>}
                        {commissioners.map(c => {
                          const on = a?.commissioners?.includes(c.id);
                          return (
                            <label key={c.id} className={`px-2 py-1 rounded border cursor-pointer text-xs ${on ? 'bg-pink-600 border-pink-400' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                              <input type="checkbox" checked={!!on} className="hidden" onChange={() => {
                                const next = new Set(a?.commissioners || []);
                                next.has(c.id) ? next.delete(c.id) : next.add(c.id);
                                patchOne(e.id, { setCommissioners: Array.from(next) });
                              }} />
                              {c.label}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-widest text-white/40 mb-2">Darcie-related?</p>
                      <label className={`inline-flex items-center gap-2 px-2 py-1 rounded border cursor-pointer text-xs ${a?.ignored ? 'bg-red-600 border-red-400' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                        <input
                          type="checkbox" checked={!!a?.ignored} className="hidden"
                          onChange={() => patchOne(e.id, { ignored: !a?.ignored })}
                        />
                        {a?.ignored ? 'Ignored — not related' : 'Mark as not related to darcie'}
                      </label>
                      <p className="text-[11px] text-white/30 mt-2">Ignored emotes are excluded from the bot &amp; site everywhere.</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="p-10 text-center text-white/40">No emotes match this filter.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Chip({ children, color }: { children: React.ReactNode; color: 'indigo' | 'pink' | 'red' }) {
  const cls = color === 'indigo' ? 'bg-indigo-600/40 border-indigo-400/60'
            : color === 'pink'   ? 'bg-pink-600/40 border-pink-400/60'
            :                      'bg-red-600/40 border-red-400/60';
  return <span className={`inline-flex items-center gap-1 border text-[11px] px-1.5 py-0.5 rounded ${cls}`}>{children}</span>;
}

function XButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-white/60 hover:text-white text-[10px] leading-none"
      aria-label="Remove"
    >×</button>
  );
}

function BulkAddCollection({ collections, onAdd }: { collections: Collection[]; onAdd: (id: string) => void }) {
  return (
    <select
      value="" onChange={e => { if (e.target.value) { onAdd(e.target.value); e.currentTarget.value = ''; } }}
      className="px-2 py-1.5 bg-white/5 border border-white/10 rounded-md text-sm"
    >
      <option value="">+ Collection…</option>
      {collections.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
    </select>
  );
}

function BulkAddCommissioner({ commissioners, onAdd }: { commissioners: Commissioner[]; onAdd: (id: string) => void }) {
  return (
    <select
      value="" onChange={e => { if (e.target.value) { onAdd(e.target.value); e.currentTarget.value = ''; } }}
      className="px-2 py-1.5 bg-white/5 border border-white/10 rounded-md text-sm"
    >
      <option value="">+ Commissioner…</option>
      {commissioners.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
    </select>
  );
}

function optimistic(e: Emote, patch: any): Emote {
  const cur = e.assignment || { collections: [], commissioners: [], ignored: false };
  let collections = cur.collections;
  let commissioners = cur.commissioners;
  let ignored = cur.ignored;

  if (patch.ignored === true) { collections = []; commissioners = []; ignored = true; }
  else if (patch.ignored === false) { ignored = false; }

  if (Array.isArray(patch.setCollections)) collections = patch.setCollections;
  else {
    if (Array.isArray(patch.addCollections))
      collections = [...new Set([...collections, ...patch.addCollections])];
    if (Array.isArray(patch.removeCollections))
      collections = collections.filter(c => !patch.removeCollections.includes(c));
  }

  if (Array.isArray(patch.setCommissioners)) commissioners = patch.setCommissioners;
  else {
    if (Array.isArray(patch.addCommissioners))
      commissioners = [...new Set([...commissioners, ...patch.addCommissioners])];
    if (Array.isArray(patch.removeCommissioners))
      commissioners = commissioners.filter(c => !patch.removeCommissioners.includes(c));
  }

  return { ...e, assignment: { ...cur, collections, commissioners, ignored } };
}