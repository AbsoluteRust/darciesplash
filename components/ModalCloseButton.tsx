'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import './ModalCloseButton.css';

export default function ModalCloseButton({
  onClick,
  label = 'Close viewer',
}: {
  onClick: () => void;
  label?: string;
}) {
  // Portals require document.body, which doesn't exist during SSR. Wait
  // for mount, then render the button as a direct child of <body> so it
  // lives outside any modal's stacking context. That makes its z-index
  // compete at the root level — above the navbar (z-50) and above any
  // backdrop-filter blur layer.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <button
      type="button"
      className="modal-close-btn"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={label}
      title="Close"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="22"
        height="22"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>,
    document.body
  );
}