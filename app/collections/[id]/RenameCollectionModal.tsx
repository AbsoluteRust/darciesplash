'use client';

import { useState } from 'react';
import {
  DISPLAY_NAME_MAX,
  PUBLIC_SLUG_MAX,
  slugify,
} from '@/lib/collection-meta';

export default function RenameCollectionModal({
  internalSlug,
  currentDisplayName,
  currentPublicSlug,
  canRename,
  cooldownRemainingMs,
  onClose,
  onRenamed,
}: {
  internalSlug: string;
  currentDisplayName: string;
  currentPublicSlug: string;
  canRename: boolean;
  cooldownRemainingMs: number;
  onClose: () => void;
  onRenamed: (next: { displayName: string; publicSlug: string }) => void;
}) {
  const [displayName, setDisplayName] = useState(currentDisplayName);
  const [publicSlug, setPublicSlug] = useState(currentPublicSlug);
  const [slugTouched, setSlugTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remainingDays = Math.ceil(cooldownRemainingMs / (24 * 60 * 60 * 1000));

  const handleDisplayNameChange = (v: string) => {
    setDisplayName(v.slice(0, DISPLAY_NAME_MAX));
    if (!slugTouched) setPublicSlug(slugify(v).slice(0, PUBLIC_SLUG_MAX));
  };

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch('/api/collections/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ internalSlug, displayName, publicSlug }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Rename failed');
      onRenamed({ displayName, publicSlug: slugify(publicSlug) });
    } catch (e: any) {
      setError(e?.message || 'Rename failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rename-modal-overlay" onClick={onClose}>
      <div className="rename-modal" onClick={e => e.stopPropagation()}>
        <h2>Rename collection</h2>

        {!canRename ? (
          <>
            <p className="rename-modal__warning">
              You've already renamed this collection. You can rename it again
              in <strong>{remainingDays} day{remainingDays === 1 ? '' : 's'}</strong>.
            </p>
            <div className="rename-modal__actions">
              <button
                type="button"
                className="collection-edit-btn collection-edit-btn--cancel"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </>
        ) : (
          <>
            <label className="rename-modal__label">
              Display name
              <input
                type="text"
                className="rename-modal__input"
                value={displayName}
                onChange={e => handleDisplayNameChange(e.target.value)}
                maxLength={DISPLAY_NAME_MAX}
              />
              <span className="rename-modal__counter">
                {displayName.length}/{DISPLAY_NAME_MAX}
              </span>
            </label>

            <label className="rename-modal__label">
              URL slug
              <input
                type="text"
                className="rename-modal__input"
                value={publicSlug}
                onChange={e => {
                  setSlugTouched(true);
                  setPublicSlug(slugify(e.target.value).slice(0, PUBLIC_SLUG_MAX));
                }}
                maxLength={PUBLIC_SLUG_MAX}
              />
              <span className="rename-modal__hint">
                Preview: <code>/collections/{publicSlug || '...'}</code>
              </span>
            </label>

            <p className="rename-modal__warning">
              ⚠️ The old URL (<code>/collections/{currentPublicSlug}</code>)
              will redirect to the new one. <br />
              This can be done once every <strong>90 days</strong>.
            </p>

            {error && <p className="rename-modal__error">{error}</p>}

            <div className="rename-modal__actions">
              <button
                type="button"
                className="collection-edit-btn collection-edit-btn--cancel"
                onClick={onClose}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="collection-edit-btn collection-edit-btn--save"
                onClick={submit}
                disabled={
                  busy ||
                  !displayName ||
                  !publicSlug ||
                  (displayName === currentDisplayName &&
                    publicSlug === currentPublicSlug)
                }
              >
                {busy ? 'Renaming…' : 'Rename'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}