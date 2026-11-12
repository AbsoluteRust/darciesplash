'use client';

import { useEffect, useState } from 'react';

type TierEntry = {
  threshold: number;
  iconUrl: string;
};

type BadgeDef = {
  id: string;
  label: string;
  defaultName: string;
  defaultIcon: string;
  tiered: boolean;
  thresholdUnit?: string;
  defaultTiers?: number[];
};

const BADGE_DEFS: BadgeDef[] = [
  { id: 'heart',   label: 'Subscriber',   defaultName: 'Subscriber',   defaultIcon: '💖', tiered: true,  thresholdUnit: 'month',    defaultTiers: [1, 3, 6, 12] },
  { id: 'banana',  label: 'Referral',     defaultName: 'Referrals',    defaultIcon: '🍌', tiered: true,  thresholdUnit: 'referral', defaultTiers: [1, 5, 10, 15] },
  { id: 'gift',    label: 'Gifter',       defaultName: 'Gifter',       defaultIcon: '🎁', tiered: true,  thresholdUnit: 'gift',     defaultTiers: [5, 10, 25, 50] },
  { id: 'sparkle', label: 'Commissioner', defaultName: 'Commissioner', defaultIcon: '✨', tiered: false },
  { id: 'love',    label: 'Loyalty',      defaultName: 'Loyalty',      defaultIcon: '💜', tiered: false },
];

const ACHIEVEMENT_KEYS = [
  { id: 'The Darcie Collector', label: 'The Darcie Collector', defaultIcon: '🏆' },
  { id: 'The Tobi Collector', label: 'The Tobi Collector', defaultIcon: '🏆' },
  { id: 'The Madolche Collector', label: 'The Madolche Collector', defaultIcon: '🏆' },
  { id: 'The Celestial Collector', label: 'The Celestial Collector', defaultIcon: '🏆' },
  { id: 'The Lunalux Collector', label: 'The Lunalux Collector', defaultIcon: '🏆' },
  { id: 'Chromatic Fanatic: Darcie', label: 'Chromatic Fanatic: Darcie', defaultIcon: '🌈' },
  { id: 'Chromatic Fanatic: Tobi', label: 'Chromatic Fanatic: Tobi', defaultIcon: '🌈' },
  { id: 'Chromatic Fanatic: Madolche', label: 'Chromatic Fanatic: Madolche', defaultIcon: '🌈' },
  { id: 'Chromatic Fanatic: Celestial', label: 'Chromatic Fanatic: Celestial', defaultIcon: '🌈' },
  { id: 'Chromatic Fanatic: Lunalux', label: 'Chromatic Fanatic: Lunalux', defaultIcon: '🌈' },
  { id: 'High Reroller', label: 'High Reroller', defaultIcon: '🎲' },
  { id: 'Contraband Collector', label: 'Contraband Collector', defaultIcon: '🚫' },
];

// Migrates legacy { iconUrl, tiers: [{ iconUrl }] } data into threshold-based
// tiers, seeding thresholds from each badge's default tier list.
function normalizeOverrides(raw: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = { ...raw };
  for (const def of BADGE_DEFS) {
    if (!def.tiered) continue;
    const entry = out[def.id];
    if (!entry) continue;

    if (Array.isArray(entry.tiers)) {
      entry.tiers = entry.tiers.map((t: any, i: number) => ({
        threshold:
          typeof t.threshold === 'number' && t.threshold > 0
            ? t.threshold
            : (def.defaultTiers?.[i] ?? i + 1),
        iconUrl: typeof t.iconUrl === 'string' ? t.iconUrl : '',
      }));
    } else if (typeof entry.iconUrl === 'string' && entry.iconUrl) {
      // Legacy: only had a single base icon; promote it to tier 1
      entry.tiers = [{ threshold: def.defaultTiers?.[0] ?? 1, iconUrl: entry.iconUrl }];
      delete entry.iconUrl;
    }
  }
  return out;
}

// Suggests a sensible next threshold: extends the last gap, or +1 if only one tier.
function nextTierThreshold(tiers: TierEntry[]): number {
  if (tiers.length === 0) return 1;
  const sorted = [...tiers].sort((a, b) => a.threshold - b.threshold);
  if (sorted.length === 1) return sorted[0].threshold + 1;
  const max = sorted[sorted.length - 1].threshold;
  const prev = sorted[sorted.length - 2].threshold;
  return max + Math.max(1, max - prev);
}

function renderIconPreview(url: string | undefined, fallback: string) {
  if (!url) return fallback;
  if (url.startsWith('http')) {
    return <img src={url} alt="preview" className="w-8 h-8 object-contain" />;
  }
  if (url.startsWith('<')) {
    const match = url.match(/<(a?):(\w+):(\d+)>/);
    if (match) {
      return (
        <img
          src={`https://cdn.discordapp.com/emojis/${match[3]}.${match[1] === 'a' ? 'gif' : 'png'}`}
          alt="preview"
          className="w-8 h-8 object-contain"
        />
      );
    }
  }
  return <span>{url}</span>;
}

export default function AdminBadgeManager() {
  const [overrides, setOverrides] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/badges')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => setOverrides(normalizeOverrides(data.overrides || {})))
      .catch((err) => {
        console.error('[admin-badges] load failed:', err);
        alert(`Failed to load badge overrides: ${err.message}`);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (key: string, field: string, value: string) => {
    setOverrides((prev) => {
      const next = { ...prev };
      const current = { ...(next[key] || {}) };
      current[field] = value;
      next[key] = current;
      return next;
    });
  };

  const updateTiers = (badgeId: string, updater: (tiers: TierEntry[]) => TierEntry[]) => {
    setOverrides((prev) => {
      const next = { ...prev };
      const current = { ...(next[badgeId] || {}) };
      const tiers: TierEntry[] = Array.isArray(current.tiers) ? [...current.tiers] : [];
      current.tiers = updater(tiers);
      next[badgeId] = current;
      return next;
    });
  };

  const handleAddTier = (def: BadgeDef) => {
    updateTiers(def.id, (tiers) => [...tiers, { threshold: nextTierThreshold(tiers), iconUrl: '' }]);
  };

  const handleRemoveTier = (badgeId: string, idx: number) => {
    updateTiers(badgeId, (tiers) => tiers.filter((_, i) => i !== idx));
  };

  const handleTierChange = (
    badgeId: string,
    idx: number,
    field: 'threshold' | 'iconUrl',
    value: string | number,
  ) => {
    updateTiers(badgeId, (tiers) =>
      tiers.map((t, i) => (i === idx ? { ...t, [field]: value } : t)),
    );
  };

  const handleUpload = async (file: File, key: string, tierIdx?: number) => {
    const uploadId = tierIdx !== undefined ? `${key}-tier-${tierIdx}` : key;
    setUploading(uploadId);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Upload failed');
      }
      const data = await res.json();
      if (tierIdx !== undefined) {
        handleTierChange(key, tierIdx, 'iconUrl', data.url);
      } else {
        handleChange(key, 'iconUrl', data.url);
      }
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setUploading(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/badges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overrides }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Save failed (HTTP ${res.status})`);
      }
      alert('Badges saved!');
    } catch (err: any) {
      console.error('[admin-badges] save failed:', err);
      alert(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-white/50 text-center mt-20">Loading...</div>;

  return (
    <div className="min-h-screen bg-[#0a0a14] text-white pt-32 pb-20 px-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-black">Badge Manager</h1>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-indigo-600 rounded-lg font-bold hover:bg-indigo-500 disabled:opacity-50 transition"
          >
            {saving ? 'Saving...' : 'Save All Changes'}
          </button>
        </div>

        {/* ─── Badge Cards ─── */}
        <div className="grid gap-6">
          {BADGE_DEFS.map((def) => {
            const current = overrides[def.id] || {};
            const tiers: TierEntry[] =
              def.tiered && Array.isArray(current.tiers) ? current.tiers : [];
            const previewIcon = def.tiered ? tiers[0]?.iconUrl || '' : current.iconUrl || '';

            return (
              <div key={def.id} className="bg-white/5 border border-white/10 rounded-2xl p-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row gap-4 items-center mb-4">
                  <div className="w-16 h-16 shrink-0 bg-black/50 border border-white/10 rounded-2xl flex items-center justify-center text-3xl">
                    {renderIconPreview(previewIcon, def.defaultIcon)}
                  </div>
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-bold text-white/50 uppercase mb-1">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={current.name ?? ''}
                      onChange={(e) => handleChange(def.id, 'name', e.target.value)}
                      placeholder={def.defaultName}
                      className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Tier editor OR single icon */}
                {def.tiered ? (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="flex justify-between items-start gap-3 mb-3">
                      <div>
                        <p className="text-sm font-bold text-white">Icon Tiers</p>
                        <p className="text-xs text-white/40 mt-0.5">
                          Users with {def.thresholdUnit} count ≥ a tier's threshold show that
                          tier's icon. The highest qualifying tier wins.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddTier(def)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-bold transition shrink-0"
                      >
                        + Add Tier
                      </button>
                    </div>

                    {tiers.length === 0 ? (
                      <div className="text-center py-6 text-white/30 italic text-sm bg-black/20 rounded-xl border border-white/5">
                        No tiers yet — users will see the default icon ({def.defaultIcon}) until
                        a tier is added.
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {tiers.map((tier, idx) => {
                          const uploadId = `${def.id}-tier-${idx}`;
                          return (
                            <div
                              key={idx}
                              className="flex items-center gap-3 p-3 rounded-xl bg-black/30 border border-white/5"
                            >
                              <div className="w-12 h-12 shrink-0 bg-black/50 border border-white/10 rounded-lg flex items-center justify-center text-lg">
                                {renderIconPreview(tier.iconUrl, '❓')}
                              </div>
                              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[10px] font-bold text-white/40 uppercase mb-1">
                                    Threshold
                                  </label>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      min={1}
                                      value={tier.threshold}
                                      onChange={(e) =>
                                        handleTierChange(
                                          def.id,
                                          idx,
                                          'threshold',
                                          Math.max(1, parseInt(e.target.value) || 1),
                                        )
                                      }
                                      className="w-20 bg-black/50 border border-white/20 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-indigo-500 tabular-nums"
                                    />
                                    <span className="text-xs text-white/40">
                                      {def.thresholdUnit}
                                      {tier.threshold === 1 ? '' : 's'}
                                    </span>
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-white/40 uppercase mb-1 flex justify-between">
                                    <span>Icon</span>
                                    <label className="text-indigo-400 hover:text-indigo-300 cursor-pointer normal-case font-normal">
                                      {uploading === uploadId ? 'Uploading…' : 'Upload'}
                                      <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                          const f = e.target.files?.[0];
                                          if (f) handleUpload(f, def.id, idx);
                                        }}
                                        disabled={uploading === uploadId}
                                      />
                                    </label>
                                  </label>
                                  <input
                                    type="text"
                                    value={tier.iconUrl}
                                    onChange={(e) =>
                                      handleTierChange(def.id, idx, 'iconUrl', e.target.value)
                                    }
                                    placeholder="URL or emote"
                                    className="w-full bg-black/50 border border-white/20 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-indigo-500"
                                  />
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveTier(def.id, idx)}
                                className="w-8 h-8 shrink-0 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-bold transition"
                                title="Remove tier"
                              >
                                ×
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <label className="block text-xs font-bold text-white/50 uppercase mb-1 flex justify-between">
                      <span>Icon</span>
                      <label className="text-indigo-400 hover:text-indigo-300 cursor-pointer transition">
                        {uploading === def.id ? 'Uploading...' : 'Upload Icon'}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUpload(file, def.id);
                          }}
                          disabled={uploading === def.id}
                        />
                      </label>
                    </label>
                    <input
                      type="text"
                      value={current.iconUrl ?? ''}
                      onChange={(e) => handleChange(def.id, 'iconUrl', e.target.value)}
                      placeholder={`URL or ${def.defaultIcon}`}
                      className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500 text-sm"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ─── Achievement Badges ─── */}
        <div className="mt-12 mb-4">
          <h2 className="text-2xl font-black text-white">Achievement Badges</h2>
          <p className="text-white/50 text-sm mt-1">
            Customize the icons, names, and highlight colors for achievements. Leave the color
            blank to inherit the achievement's rarity color from the game.
          </p>
        </div>

        <div className="grid gap-4">
          {ACHIEVEMENT_KEYS.map((ach) => {
            const current = overrides[ach.id] || {};
            const hasColorOverride = typeof current.color === 'string' && current.color.length > 0;
            return (
              <div key={ach.id} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <div className="flex flex-col md:flex-row gap-4 items-center">
                  <div
                    className="w-16 h-16 shrink-0 rounded-2xl flex items-center justify-center text-3xl border"
                    style={{
                      background: hasColorOverride
                        ? `linear-gradient(135deg, ${current.color}33, ${current.color}1a)`
                        : undefined,
                      borderColor: hasColorOverride ? `${current.color}4d` : undefined,
                    }}
                  >
                    {renderIconPreview(current.iconUrl, ach.defaultIcon)}
                  </div>

                  <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-white/50 uppercase mb-1">
                        Display Name
                      </label>
                      <input
                        type="text"
                        value={current.name ?? ''}
                        onChange={(e) => handleChange(ach.id, 'name', e.target.value)}
                        placeholder={ach.label}
                        className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-white/50 uppercase mb-1 flex justify-between">
                        <span>Icon</span>
                        <label className="text-indigo-400 hover:text-indigo-300 cursor-pointer transition">
                          {uploading === ach.id ? 'Uploading...' : 'Upload Icon'}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleUpload(file, ach.id);
                            }}
                            disabled={uploading === ach.id}
                          />
                        </label>
                      </label>
                      <input
                        type="text"
                        value={current.iconUrl ?? ''}
                        onChange={(e) => handleChange(ach.id, 'iconUrl', e.target.value)}
                        placeholder={`URL or ${ach.defaultIcon}`}
                        className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-white/50 uppercase mb-1">
                        Highlight Color
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={hasColorOverride ? current.color : '#6366f1'}
                          onChange={(e) => handleChange(ach.id, 'color', e.target.value)}
                          className="w-12 h-10 shrink-0 bg-black/50 border border-white/20 rounded-lg cursor-pointer p-1"
                          title="Pick a highlight color"
                        />
                        <input
                          type="text"
                          value={current.color ?? ''}
                          onChange={(e) => handleChange(ach.id, 'color', e.target.value)}
                          placeholder="Inherit rarity color"
                          className="flex-1 min-w-0 bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 font-mono"
                        />
                        {hasColorOverride && (
                          <button
                            onClick={() => handleChange(ach.id, 'color', '')}
                            className="px-2 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold transition shrink-0"
                            title="Clear override, inherit rarity color"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-white/25 mt-3 pl-1">
                  Key: <code className="text-white/40">{ach.id}</code>
                  {!hasColorOverride && (
                    <span className="ml-3 text-white/30">
                      · Highlight inherits the rarity color from the game
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}