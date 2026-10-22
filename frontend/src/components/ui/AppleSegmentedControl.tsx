import React from 'react';

interface SegmentOption<T extends string | number> {
  value: T;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

interface AppleSegmentedControlProps<T extends string | number> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export function AppleSegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  className = '',
  size = 'md',
}: AppleSegmentedControlProps<T>) {
  const sizeClasses = size === 'sm' ? 'p-0.5 text-xs' : 'p-1 text-sm';
  const itemPadding = size === 'sm' ? 'px-3 py-1 text-xs' : 'px-4 py-1.5 text-sm';

  return (
    <div
      role="tablist"
      className={`inline-flex items-center rounded-2xl bg-[#767680]/12 dark:bg-[#767680]/24 backdrop-blur-apple p-1 select-none border border-black/5 dark:border-white/5 ${sizeClasses} ${className}`}
    >
      {options.map((opt) => {
        const isSelected = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            role="tab"
            aria-selected={isSelected}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`relative flex items-center justify-center gap-1.5 font-semibold rounded-xl transition-all duration-200 apple-press ${itemPadding} ${
              isSelected
                ? 'bg-white dark:bg-[#2C2C2E] text-neutral-900 dark:text-white shadow-sm border border-black/5 dark:border-white/10'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            {opt.icon && <span className="flex-shrink-0">{opt.icon}</span>}
            <span>{opt.label}</span>
            {opt.count !== undefined && (
              <span
                className={`ml-1 px-1.5 py-0.2 text-[10px] font-bold rounded-full transition-colors ${
                  isSelected
                    ? 'bg-apple-blue text-white shadow-xs'
                    : 'bg-black/10 dark:bg-white/15 text-neutral-600 dark:text-neutral-300'
                }`}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
