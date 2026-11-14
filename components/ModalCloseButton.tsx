// components/ModalCloseButton.tsx
'use client';

import './ModalCloseButton.css';

export default function ModalCloseButton({
  onClick,
  label = 'Close viewer',
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
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
    </button>
  );
}