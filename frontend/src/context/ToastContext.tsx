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
 * 2. `removeToast()`:
 *    - Manually or automatically removes toast by ID.
 * 3. `celebrate()`:
 *    - Fires Apple-themed colorful confetti particle bursts on key approval achievements.
 * ============================================================================
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import confetti from 'canvas-confetti';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (type: ToastType, title: string, message?: string, duration?: number) => void;
  removeToast: (id: string) => void;
  celebrate: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((type: ToastType, title: string, message?: string, duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = { id, type, title, message, duration };

    setToasts(prev => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
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
