'use client';

import { useEffect, useState } from 'react';

const BADGE_KEYS = [
  { id: 'heart', label: 'Subscriber', defaultName: 'Subscriber', defaultIcon: '💖' },
  { id: 'banana', label: 'Referral', defaultName: 'Referrals', defaultIcon: '🍌' },
  { id: 'gift', label: 'Gifter', defaultName: 'Gifter', defaultIcon: '🎁' },
  { id: 'sparkle', label: 'Commissioner', defaultName: 'Commissioner', defaultIcon: '✨' },
  { id: 'love', label: 'Loyalty', defaultName: 'Loyalty', defaultIcon: '💜' },
];

export default function AdminBadgeManager() {
  const [overrides, setOverrides] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // In a real scenario, you'd fetch the emote list here to let them pick
  // For simplicity, we allow pasting an emote ID or URL

  useEffect(() => {
    fetch('/api/admin/badges')
      .then((r) => r.json())
      .then((data) => {
        setOverrides(data.overrides || {});
        setLoading(false);
      });
  }, []);

  const handleChange = (key: string, field: 'name' | 'iconUrl', value: string) => {
    setOverrides((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
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

  if (loading) return <div className="p-8 text-white/50">Loading...</div>;

  return (
    <div className="min-h-screen bg-[#0a0a14] text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-black">Badge Manager</h1>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-indigo-600 rounded-lg font-bold hover:bg-indigo-500 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save All Changes'}
          </button>
        </div>

        <div className="grid gap-6">
          {BADGE_KEYS.map((badge) => {
            const current = overrides[badge.id] || {};
            return (
              <div key={badge.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col md:flex-row gap-6 items-center">
                {/* Preview */}
                <div className="w-20 h-20 shrink-0 bg-black/50 border border-white/10 rounded-2xl flex items-center justify-center text-3xl">
                  {current.iconUrl?.startsWith('http') ? (
                    <img src={current.iconUrl} alt="badge" className="w-10 h-10 object-contain" />
                  ) : current.iconUrl?.startsWith('<:') || current.iconUrl?.startsWith('<a:') ? (
                    (() => {
                      const match = current.iconUrl.match(/<(a?):(\w+):(\d+)>/);
                      if (match) {
                        const ext = match[1] === 'a' ? 'gif' : 'png';
                        return <img src={`https://cdn.discordapp.com/emojis/${match[3]}.${ext}`} alt="badge" className="w-10 h-10 object-contain" />;
                      }
                      return badge.defaultIcon;
                    })()
                  ) : (
                    current.iconUrl || badge.defaultIcon
                  )}
                </div>

                {/* Inputs */}
                <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-white/50 uppercase mb-1">Display Name</label>
                    <input
                      type="text"
                      value={current.name ?? badge.defaultName}
                      onChange={(e) => handleChange(badge.id, 'name', e.target.value)}
                      placeholder={badge.defaultName}
                      className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-white/50 uppercase mb-1">Custom Icon (URL, Emoji, or Emote)</label>
                    <input
                      type="text"
                      value={current.iconUrl ?? ''}
                      onChange={(e) => handleChange(badge.id, 'iconUrl', e.target.value)}
                      placeholder={`e.g. ${badge.defaultIcon} or <:emote:123>`}
                      className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}