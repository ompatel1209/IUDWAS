import React from 'react';

interface AppleBadgeProps {
  children: React.ReactNode;
  variant?: 'blue' | 'purple' | 'green' | 'orange' | 'red' | 'teal' | 'gray' | 'indigo' | 'pink';
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

export const AppleBadge: React.FC<AppleBadgeProps> = ({
  children,
  variant = 'blue',
  size = 'sm',
  dot = false,
  className = '',
}) => {
  const variantStyles = {
    blue: 'bg-apple-blue/12 text-apple-blue dark:bg-apple-blue/20 dark:text-[#409CFF] border-apple-blue/20',
    purple: 'bg-apple-purple/12 text-apple-purple dark:bg-apple-purple/20 dark:text-[#BF6EFA] border-apple-purple/20',
    indigo: 'bg-[#5856D6]/12 text-[#5856D6] dark:bg-[#5856D6]/20 dark:text-[#7D7AFF] border-[#5856D6]/20',
    pink: 'bg-[#FF2D55]/12 text-[#FF2D55] dark:bg-[#FF2D55]/20 dark:text-[#FF6482] border-[#FF2D55]/20',
    green: 'bg-apple-green/12 text-[#248A3D] dark:bg-apple-green/20 dark:text-[#30D158] border-apple-green/20',
    orange: 'bg-apple-orange/12 text-[#C96800] dark:bg-apple-orange/20 dark:text-[#FF9F0A] border-apple-orange/20',
    red: 'bg-apple-red/12 text-apple-red dark:bg-apple-red/20 dark:text-[#FF453A] border-apple-red/20',
    teal: 'bg-apple-teal/12 text-[#1F8294] dark:bg-apple-teal/20 dark:text-[#64D2FF] border-apple-teal/20',
    gray: 'bg-black/5 text-[#636366] dark:bg-white/10 dark:text-[#AEAEB2] border-black/5 dark:border-white/10',
  }[variant];

  const dotColors = {
    blue: 'bg-apple-blue',
    purple: 'bg-apple-purple',
    indigo: 'bg-[#5856D6]',
    pink: 'bg-[#FF2D55]',
    green: 'bg-apple-green',
    orange: 'bg-apple-orange',
    red: 'bg-apple-red',
    teal: 'bg-apple-teal',
    gray: 'bg-[#8E8E93]',
  }[variant];

  const sizeStyles = {
    sm: 'px-2.5 py-0.5 text-[11px] font-semibold tracking-tight',
    md: 'px-3 py-1 text-xs font-semibold tracking-tight',
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border select-none ${variantStyles} ${sizeStyles} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors} shadow-xs`} />}
      {children}
    </span>
  );
};
