import React from 'react';

/**
 * Authentic Apple iOS 12-Blade Activity Indicator
 */
export const AppleActivityIndicator: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({
  size = 'md',
  className = '',
}) => {
  const dimension = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  }[size];

  const bladeWidth = {
    sm: 'w-[2px] h-[5px]',
    md: 'w-[2.5px] h-[8px]',
    lg: 'w-[3.5px] h-[12px]',
  }[size];

  return (
    <div className={`relative flex items-center justify-center ${dimension} ${className}`}>
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className={`absolute bg-neutral-600 dark:bg-neutral-300 rounded-full origin-[center_160%] ${bladeWidth}`}
          style={{
            transform: `rotate(${i * 30}deg) translateY(-100%)`,
            opacity: 0.15 + (i / 12) * 0.85,
            animation: `iosSpinnerFade 1s linear infinite`,
            animationDelay: `${(i - 12) * (1 / 12)}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes iosSpinnerFade {
          0% { opacity: 1; }
          100% { opacity: 0.15; }
        }
      `}</style>
    </div>
  );
};

export const LoadingSpinner: React.FC<{ message?: string; size?: 'sm' | 'md' | 'lg' }> = ({
  message = 'Loading...',
  size = 'md',
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-neutral-500 dark:text-neutral-400 gap-3.5 animate-apple-fade-in">
      <AppleActivityIndicator size={size} />
      {message && <p className="text-xs sm:text-sm font-semibold tracking-tight text-neutral-600 dark:text-neutral-300">{message}</p>}
    </div>
  );
};

export const EmptyState: React.FC<{
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}> = ({
  title = 'No Data Available',
  description = 'There are no items to display at this time.',
  icon,
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto space-y-3.5 animate-apple-fade-in">
      <div className="p-4 rounded-3xl bg-black/[0.03] dark:bg-white/[0.05] text-neutral-400 dark:text-neutral-500 border border-black/5 dark:border-white/5 shadow-apple-card">
        {icon || (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        )}
      </div>
      <h4 className="text-base font-bold text-neutral-900 dark:text-white tracking-tight">{title}</h4>
      <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">{description}</p>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
};

export const ErrorBanner: React.FC<{
  title?: string;
  message: string;
  onRetry?: () => void;
}> = ({ title = 'Unable to complete request', message, onRetry }) => {
  return (
    <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-apple-red flex items-center justify-between gap-4 animate-apple-fade-in">
      <div>
        <h5 className="text-sm font-bold tracking-tight">{title}</h5>
        <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-apple-red text-white hover:bg-red-600 apple-press shadow-sm"
        >
          Retry
        </button>
      )}
    </div>
  );
};
