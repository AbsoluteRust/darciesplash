'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

const BADGE_KEYS = [
  { id: 'heart', label: 'Subscriber', defaultName: 'Subscriber', defaultIcon: '💖', hasTiers: true },
  { id: 'banana', label: 'Referral', defaultName: 'Referrals', defaultIcon: '🍌', hasTiers: true },
  { id: 'gift', label: 'Gifter', defaultName: 'Gifter', defaultIcon: '🎁', hasTiers: true },
  { id: 'sparkle', label: 'Commissioner', defaultName: 'Commissioner', defaultIcon: '✨', hasTiers: false },
  { id: 'love', label: 'Loyalty', defaultName: 'Loyalty', defaultIcon: '💜', hasTiers: false },
];

const TIER_LABELS: Record<string, string[]> = {
  heart: ['1 Month', '3 Months', '6 Months', '1 Year'],
  banana: ['1 Referral', '5 Referrals', '10 Referrals', '15 Referrals'],
  gift: ['5 Gifts', '10 Gifts', '25 Gifts', '50 Gifts'],
};

export default function AdminBadgeManager() {
  const [overrides, setOverrides] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedTier, setExpandedTier] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null); // Tracks which input is uploading

  useEffect(() => {
    fetch('/api/admin/badges')
      .then((r) => r.json())
      .then((data) => {
        setOverrides(data.overrides || {});
        setLoading(false);
      });
  }, []);

  const handleChange = (key: string, field: string, value: string, tierIdx?: number) => {
    setOverrides((prev) => {
      const next = { ...prev };
      if (!next[key]) next[key] = {};
      
      if (tierIdx !== undefined) {
        if (!next[key].tiers) next[key].tiers = {};
        if (!next[key].tiers[tierIdx]) next[key].tiers[tierIdx] = {};
        next[key].tiers[tierIdx][field] = value;
      } else {
        next[key][field] = value;
      }
      return next;
    });
  };

  const handleUpload = async (file: File, key: string, tierIdx?: number) => {
    const uploadId = tierIdx !== undefined ? `${key}-tier-${tierIdx}` : key;
    setUploading(uploadId);
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Upload failed');
      }

      const data = await res.json();
      handleChange(key, 'iconUrl', data.url, tierIdx);
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setUploading(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/admin/badges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overrides }),
      });
      alert('Badges saved!');
    } finally {
      setSaving(false);
    }
  };

  const renderIconPreview = (url: string | undefined, fallback: string) => {
    if (url?.startsWith('http')) return <img src={url} alt="preview" className="w-10 h-10 object-contain" />;
    if (url?.startsWith('<')) {
      const match = url.match(/<(a?):(\w+):(\d+)>/);
      if (match) return <img src={`https://cdn.discordapp.com/emojis/${match[3]}.${match[1] === 'a' ? 'gif' : 'png'}`} className="w-10 h-10 object-contain" />;
    }
    return url || fallback;
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

        <div className="grid gap-6">
          {BADGE_KEYS.map((badge) => {
            const current = overrides[badge.id] || {};
            const isExpanded = expandedTier === badge.id;
            
            return (
              <div key={badge.id} className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="flex flex-col md:flex-row gap-6 items-center">
                  {/* Preview */}
                  <div className="w-20 h-20 shrink-0 bg-black/50 border border-white/10 rounded-2xl flex items-center justify-center text-3xl">
                    {renderIconPreview(current.iconUrl, badge.defaultIcon)}
                  </div>

                  {/* Base Inputs */}
                  <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-white/50 uppercase mb-1">Display Name</label>
                      <input
                        type="text"
                        value={current.name ?? ''}
                        onChange={(e) => handleChange(badge.id, 'name', e.target.value)}
                        placeholder={badge.defaultName}
                        className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-white/50 uppercase mb-1 flex justify-between">
                        <span>Base Icon</span>
                        <label className="text-indigo-400 hover:text-indigo-300 cursor-pointer transition">
                          {uploading === badge.id ? 'Uploading...' : 'Upload Icon'}
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleUpload(file, badge.id);
                            }}
                            disabled={uploading === badge.id}
                          />
                        </label>
                      </label>
                      <input
                        type="text"
                        value={current.iconUrl ?? ''}
                        onChange={(e) => handleChange(badge.id, 'iconUrl', e.target.value)}
                        placeholder={`URL or ${badge.defaultIcon}`}
                        className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500 text-sm"
                      />
                    </div>
                  </div>

                  {/* Tier Toggle */}
                  {badge.hasTiers && (
                    <button
                      onClick={() => setExpandedTier(isExpanded ? null : badge.id)}
                      className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-bold transition shrink-0"
                    >
                      {isExpanded ? 'Hide Tiers' : 'Edit Tiers'}
                    </button>
                  )}
                </div>

                {/* Expandable Tiers */}
                <AnimatePresence>
                  {badge.hasTiers && isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden mt-6 pt-6 border-t border-white/10"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {TIER_LABELS[badge.id]?.map((label, idx) => {
                          const tierData = current.tiers?.[idx] || {};
                          const uploadId = `${badge.id}-tier-${idx}`;
                          
                          return (
                            <div key={idx} className="bg-black/30 p-4 rounded-xl border border-white/5">
                              <label className="block text-xs font-bold text-indigo-400 uppercase mb-2 flex justify-between">
                                <span>{label} Icon</span>
                                <label className="text-indigo-400 hover:text-indigo-300 cursor-pointer transition normal-case font-normal">
                                  {uploading === uploadId ? 'Uploading...' : 'Upload Icon'}
                                  <input 
                                    type="file" 
                                    accept="image/*" 
                                    className="hidden" 
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleUpload(file, badge.id, idx);
                                    }}
                                    disabled={uploading === uploadId}
                                  />
                                </label>
                              </label>
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 shrink-0 bg-black/50 border border-white/10 rounded-lg flex items-center justify-center text-lg">
                                  {renderIconPreview(tierData.iconUrl, '❓')}
                                </div>
                                <input
                                  type="text"
                                  value={tierData.iconUrl ?? ''}
                                  onChange={(e) => handleChange(badge.id, 'iconUrl', e.target.value, idx)}
                                  placeholder="URL or Emote"
                                  className="w-full bg-black/50 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}