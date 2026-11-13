'use client';

import { X } from 'lucide-react';
import { type ReactNode, useEffect, useRef } from 'react';

export function Sheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element) {
      return;
    }
    if (open && !element.open) {
      element.showModal();
    }
    if (!open && element.open) {
      element.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialog}
      aria-label={title}
      onClose={onClose}
      className="m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-3xl bg-cemento p-0 text-ink backdrop:bg-ink/60 sm:m-auto sm:max-w-xl sm:rounded-3xl"
    >
      <div className="sticky top-0 z-10 flex justify-end bg-cemento/90 px-3 pt-3 backdrop-blur">
        <button
          type="button"
          aria-label="Cerrar"
          onClick={onClose}
          className="flex size-11 items-center justify-center rounded-full bg-white shadow"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>
      <div className="px-4 pb-6 sm:px-6">{children}</div>
    </dialog>
  );
}
