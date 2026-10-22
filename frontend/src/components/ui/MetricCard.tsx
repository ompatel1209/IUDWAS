import React from 'react';
import { AppleCard } from './AppleCard';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: string;
    positive?: boolean;
  };
  color?: 'blue' | 'purple' | 'green' | 'orange' | 'red' | 'teal' | 'indigo';
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = 'blue',
  onClick,
}) => {
  const iconGradientStyles = {
    blue: 'bg-gradient-to-tr from-[#007AFF] to-[#5856D6] text-white shadow-sm',
    purple: 'bg-gradient-to-tr from-[#AF52DE] to-[#5856D6] text-white shadow-sm',
    indigo: 'bg-gradient-to-tr from-[#5856D6] to-[#007AFF] text-white shadow-sm',
    green: 'bg-gradient-to-tr from-[#34C759] to-[#30B0C7] text-white shadow-sm',
    orange: 'bg-gradient-to-tr from-[#FF9500] to-[#FF2D55] text-white shadow-sm',
    red: 'bg-gradient-to-tr from-[#FF3B30] to-[#FF2D55] text-white shadow-sm',
    teal: 'bg-gradient-to-tr from-[#30B0C7] to-[#007AFF] text-white shadow-sm',
  }[color];

  return (
    <AppleCard
      hoverable={Boolean(onClick)}
      onClick={onClick}
      className={`relative overflow-hidden flex flex-col justify-between ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            {title}
          </p>
          <h3 className="text-2xl sm:text-3xl font-extrabold mt-1 text-neutral-900 dark:text-white tracking-tight">
            {value}
          </h3>
        </div>
        <div className={`p-3 rounded-2xl flex-shrink-0 flex items-center justify-center ${iconGradientStyles}`}>
          {icon}
        </div>
      </div>

      {(subtitle || trend) && (
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-black/5 dark:border-white/5 text-xs">
          {subtitle && (
            <span className="text-neutral-500 dark:text-neutral-400 truncate">{subtitle}</span>
          )}
          {trend && (
            <span
              className={`font-semibold ml-auto ${
                trend.positive ? 'text-[#34C759]' : 'text-[#FF9500]'
              }`}
            >
              {trend.value}
            </span>
          )}
        </div>
      )}
    </AppleCard>
  );
};
