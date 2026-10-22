/**
 * ============================================================================
 * MODULE: Dynamic Toast Notifications & Celebration Context (ToastContext.tsx)
 * ============================================================================
 *
 * ROLE & PURPOSE:
 * Provides application-wide user feedback notifications (success, error, warning, info)
 * and interactive celebration micro-animations (canvas confetti) for milestone events
 * such as workflow step approvals and successful uploads.
 *
 * WHAT THIS MODULE DOES:
 * 1. `showToast()`:
 *    - Pushes a new toast item with unique ID, type, title, message, and auto-dismiss timer.
 *    - Deduplicates an identical Notification-title+message that is already visible.
 *    - Caps the visible stack to keep feedback readable (oldest dropped first).
 * 2. `removeToast()`:
 *    - Manually or automatically removes toast by ID.
 * 3. `celebrate()`:
 *    - Fires Apple-themed colorful confetti particle bursts on key approval achievements.
 * ============================================================================
 */

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

// Maximum simultaneously visible toasts; extra pushes drop the oldest first.
const MAX_VISIBLE_TOASTS = 4;

interface ToastContextType {
  toasts: Toast[];
  showToast: (type: ToastType, title: string, message?: string, duration?: number) => void;
  removeToast: (id: string) => void;
  celebrate: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  // Tracks live auto-dismiss timers so manual dismissal can cancel them (L5).
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const removeToast = useCallback((id: string) => {
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((type: ToastType, title: string, message?: string, duration = 4000) => {
    setToasts(prev => {
      // Dedupe: skip an identical already-visible toast (e.g. repeated failures in a loop)
      const duplicate = prev.some(t => t.title === title && t.message === message && t.type === type);
      if (duplicate) return prev;

      const id = Math.random().toString(36).substring(2, 9);
      const newToast: Toast = { id, type, title, message, duration };

      const next = [...prev, newToast];
      // Keep the stack readable: drop oldest overflow beyond the cap
      const overflow = next.length - MAX_VISIBLE_TOASTS;
      if (overflow > 0) {
        const droppedIds = next.slice(0, overflow).map(t => t.id);
        droppedIds.forEach(droppedId => {
          if (timers.current[droppedId]) {
            clearTimeout(timers.current[droppedId]);
            delete timers.current[droppedId];
          }
        });
        const trimmed = next.slice(overflow);
        if (duration > 0) {
          timers.current[id] = setTimeout(() => removeToast(id), duration);
        }
        return trimmed;
      }

      if (duration > 0) {
        timers.current[id] = setTimeout(() => removeToast(id), duration);
      }
      return next;
    });
  }, [removeToast]);

  const celebrate = useCallback(() => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#007AFF', '#34C759', '#5856D6', '#FF9500', '#30B0C7'],
      });
    } catch {
      // Ignore
    }
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast, celebrate }}>
      {children}
    </ToastContext.Provider>
  );
};

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
}
