import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

interface PopoverProps {
  open: boolean;
  onClose: () => void;
  label?: string;
  children: ReactNode;
}

export function Popover({ open, onClose, label, children }: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  return (
    <div className="pop" ref={ref}>
      {children}
      {open && label === undefined && null}
    </div>
  );
}
