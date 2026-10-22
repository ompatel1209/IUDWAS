import React from 'react';

interface AppleCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  glass?: boolean;
  inset?: boolean;
}

export const AppleCard: React.FC<AppleCardProps> = ({
  children,
  className = '',
  hoverable = false,
  glass = true,
  inset = false,
  ...props
}) => {
  const surfaceClasses = glass
    ? 'glass-card shadow-apple-card border-t border-white/60 dark:border-white/10'
    : 'bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/10 shadow-apple-card';

  const hoverClasses = hoverable
    ? 'apple-hover-lift cursor-pointer'
    : '';

  const insetClasses = inset ? 'rounded-3xl p-6 sm:p-7' : 'rounded-3xl p-5 sm:p-6';

  return (
    <div
      className={`relative overflow-hidden transition-all ${surfaceClasses} ${insetClasses} ${hoverClasses} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
