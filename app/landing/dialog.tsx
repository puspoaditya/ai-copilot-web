"use client";

import { useEffect, useRef, type ReactNode } from "react";

export default function Dialog({
  open,
  onClose,
  className,
  titleId,
  closeLabel = "Tutup",
  busy = false,
  children,
}: {
  open: boolean;
  onClose: () => void;
  className: string;
  titleId: string;
  closeLabel?: string;
  busy?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={className}
      aria-labelledby={titleId}
      onClose={() => {
        if (open) onClose();
      }}
      onCancel={(event) => {
        if (busy) event.preventDefault();
      }}
      onClick={(event) => {
        if (busy || event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        )
          onClose();
      }}
    >
      <button
        type="button"
        className="dialog-close icon-button"
        onClick={onClose}
        disabled={busy}
        aria-label={closeLabel}
      >
        <svg className="icon">
          <use href="#i-close" />
        </svg>
      </button>
      {children}
    </dialog>
  );
}
