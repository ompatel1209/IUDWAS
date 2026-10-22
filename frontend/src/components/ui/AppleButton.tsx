import React from 'react';
import { Loader2 } from 'lucide-react';

interface AppleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'tinted' | 'secondary' | 'destructive' | 'destructive-tinted' | 'ghost' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export const AppleButton: React.FC<AppleButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center font-semibold rounded-2xl apple-press focus:outline-none focus:ring-2 focus:ring-apple-blue/40 disabled:opacity-45 disabled:pointer-events-none disabled:cursor-not-allowed select-none transition-all duration-150';

  const sizeClasses = {
    sm: 'px-4 py-2 text-[13px] gap-1.5 rounded-xl min-h-[36px]',
    md: 'px-5 py-2.5 text-sm gap-2 rounded-2xl min-h-[44px]',
    lg: 'px-7 py-3 text-base gap-2.5 rounded-2xl min-h-[50px]',
  }[size];

  const variantClasses = {
    primary:
      'bg-apple-blue text-white shadow-sm hover:bg-[#0071E3] active:bg-[#005bb5] border-t border-white/25',
    tinted:
      'bg-apple-blue/12 text-apple-blue dark:bg-apple-blue/20 hover:bg-apple-blue/20 active:bg-apple-blue/30 border border-apple-blue/15',
    secondary:
      'bg-[#E5E5EA] dark:bg-[#2C2C2E] text-[#1C1C1E] dark:text-[#F2F2F7] hover:bg-[#D1D1D6] dark:hover:bg-[#3A3A3C] active:bg-[#C7C7CC]',
    destructive:
      'bg-apple-red text-white shadow-sm hover:bg-[#E02D23] active:bg-[#C92219] border-t border-white/25',
    'destructive-tinted':
      'bg-apple-red/12 text-apple-red dark:bg-apple-red/20 hover:bg-apple-red/20 active:bg-apple-red/30 border border-apple-red/15',
    ghost:
      'text-neutral-700 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/10 active:bg-black/10 dark:active:bg-white/15',
    glass:
      'glass-panel text-neutral-900 dark:text-white hover:bg-white/90 dark:hover:bg-white/15 active:bg-white/60 shadow-sm border border-white/40 dark:border-white/10',
  }[variant];

  return (
    <button
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin text-current" />
      ) : (
        icon && <span className="flex-shrink-0">{icon}</span>
      )}
      {children}
    </button>
  );
};
