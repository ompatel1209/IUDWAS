import React from 'react';
import { useToast } from '../../context/ToastContext';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 z-[100] flex flex-col gap-2.5 max-w-sm sm:max-w-md w-[92vw] sm:w-full pointer-events-none">
      {toasts.map((toast) => {
        const icons = {
          success: <CheckCircle2 className="w-5 h-5 text-[#34C759] flex-shrink-0" />,
          error: <AlertCircle className="w-5 h-5 text-[#FF3B30] flex-shrink-0" />,
          warning: <AlertTriangle className="w-5 h-5 text-[#FF9500] flex-shrink-0" />,
          info: <Info className="w-5 h-5 text-[#007AFF] flex-shrink-0" />,
        }[toast.type];

        return (
          <div
            key={toast.id}
            className="pointer-events-auto glass-panel dark:bg-[#1C1C1E]/95 rounded-3xl p-3.5 sm:p-4 shadow-apple-modal border border-white/60 dark:border-white/15 flex items-start gap-3 animate-apple-spring"
          >
            <div className="mt-0.5">{icons}</div>
            <div className="flex-1 min-w-0">
              <h5 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white truncate">
                {toast.title}
              </h5>
              {toast.message && (
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">
                  {toast.message}
                </p>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              aria-label="Dismiss notification"
              className="w-6 h-6 rounded-full hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-white transition-colors p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
