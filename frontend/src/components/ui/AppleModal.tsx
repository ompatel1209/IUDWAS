import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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

/**
 * Global window stack. Every open modal registers itself; Escape closes ONLY
 * the topmost window, and each window sits at a higher z-index than the one
 * beneath it — so approval/confirm dialogs that open on top of detail dialogs
 * stack cleanly instead of fighting over the same layer.
 */
const modalStack: string[] = [];

const AppleModal: React.FC<AppleModalProps> = ({
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
  const [stackLevel, setStackLevel] = useState(0);

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

  // Stack position: register while open, drops this window to the top of the
  // overlay order (z 60, 70…) so stacked windows always render above earlier ones.
  useEffect(() => {
    if (!isOpen) return;
    if (!modalStack.includes(titleId)) modalStack.push(titleId);
    setStackLevel(modalStack.indexOf(titleId));
    return () => {
      const idx = modalStack.indexOf(titleId);
      if (idx >= 0) modalStack.splice(idx, 1);
    };
  }, [isOpen, titleId]);

  // Escape closes ONLY the topmost window + Tab focus trap
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const topmost = modalStack[modalStack.length - 1];
        if (topmost !== titleId) return; // a window opened above us stays focused
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
  }, [isOpen, onClose, titleId]);

  useEffect(() => {
    if (!isOpen) return;
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [isOpen]);

  if (!isOpen) return null;

  // Responsive width ladder: each tier starts smaller on phones/laptops and
  // grows to use the available window width on large screens, so dialogs with
  // dense content (workflow timelines, version history, forms) never look
  // postage-stamped on a desktop monitor.
  const maxWidthClasses = {
    sm: 'w-full sm:max-w-sm',
    md: 'w-full sm:max-w-md',
    lg: 'w-full sm:max-w-lg md:max-w-2xl',
    xl: 'w-full sm:max-w-xl md:max-w-3xl',
    '2xl': 'w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl',
    '3xl': 'w-full sm:max-w-2xl md:max-w-3xl lg:max-w-5xl',
    '4xl': 'w-full sm:max-w-3xl md:max-w-4xl lg:max-w-6xl',
    '5xl': 'w-full sm:max-w-3xl md:max-w-5xl lg:max-w-6xl',
  }[maxWidth];

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      style={{ zIndex: 50 + stackLevel * 10 }}
    >
      {/* Dimming & Frosted Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 dark:bg-black/70 backdrop-blur-md transition-opacity animate-apple-fade-in"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* iOS Modal / Sheet Surface — rendered through a portal to <body> so it
          can never be trapped inside a parent's transform/stacking context
          ("window inside page") no matter where the page renders the JSX. */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`relative w-full ${maxWidthClasses} glass-panel dark:bg-[#1C1C1E]/95 rounded-3xl sm:rounded-4xl shadow-apple-modal border border-white/60 dark:border-white/10 overflow-hidden flex flex-col animate-apple-modal max-h-[90vh] my-auto outline-none`}
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
            <X className="w-5 h-5" />
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
    </div>,
    document.body
  );
};

export { AppleModal };
