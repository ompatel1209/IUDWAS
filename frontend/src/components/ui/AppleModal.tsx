import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface AppleModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
  actions?: React.ReactNode;
}

/**
 * Reference-counted body scroll lock so nested modals behave correctly:
 * opening modal B while A is open keeps the page locked; closing B must NOT
 * unlock it while A is still on screen.
 */
let scrollLockCount = 0;

const lockBodyScroll = () => {
  scrollLockCount += 1;
  if (scrollLockCount === 1) {
    document.body.style.overflow = 'hidden';
  }
};

const unlockBodyScroll = () => {
  scrollLockCount = Math.max(0, scrollLockCount - 1);
  if (scrollLockCount === 0) {
    document.body.style.overflow = '';
  }
};

export const AppleModal: React.FC<AppleModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'lg',
  actions,
}) => {
  const titleId = useRef(`apple-modal-title-${Math.random().toString(36).slice(2, 10)}`).current;
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Focus management: move focus into the dialog on open, restore it on close
  useEffect(() => {
    if (!isOpen) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;

    // Wait a tick so the panel is mounted in the DOM
    const raf = requestAnimationFrame(() => {
      const focusable = dialogRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      (focusable ?? dialogRef.current)?.focus();
    });

    return () => {
      cancelAnimationFrame(raf);
      previouslyFocused.current?.focus?.();
    };
  }, [isOpen]);

  // Escape to close + Tab focus trap
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => el.offsetParent !== null);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        } else if (!dialogRef.current.contains(document.activeElement)) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown, false);
    return () => document.removeEventListener('keydown', handleKeyDown, false);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [isOpen]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
  }[maxWidth];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Dimming & Frosted Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 dark:bg-black/70 backdrop-blur-md transition-opacity animate-apple-fade-in"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* iOS Modal / Sheet Surface */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`relative w-full ${maxWidthClasses} glass-panel dark:bg-[#1C1C1E]/95 rounded-3xl sm:rounded-4xl shadow-apple-modal border border-white/60 dark:border-white/10 overflow-hidden flex flex-col z-10 animate-apple-modal max-h-[90vh] my-auto outline-none`}
      >
        {/* iOS Sheet Drag Handle (Visual indicator) */}
        <div className="w-12 h-1.5 rounded-full bg-black/15 dark:bg-white/20 mx-auto mt-2.5 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-black/5 dark:border-white/10">
          <div className="min-w-0 pr-3">
            <h3 id={titleId} className="text-lg sm:text-xl font-bold tracking-tight text-neutral-900 dark:text-white truncate">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed truncate">
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="w-8 h-8 rounded-full bg-[#767680]/15 hover:bg-[#767680]/25 flex items-center justify-center text-neutral-600 dark:text-neutral-300 transition-colors apple-press flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">{children}</div>

        {/* Footer Actions */}
        {actions && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-black/5 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};
