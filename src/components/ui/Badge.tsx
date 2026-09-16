import { type ReactNode } from 'react';

type Color = 'gray' | 'blue' | 'green' | 'amber' | 'red' | 'brand';

interface BadgeProps {
  children: ReactNode;
  color?: Color;
  dot?: boolean;
  className?: string;
}

const colorClasses: Record<Color, { bg: string; text: string; dot: string }> = {
  gray: { bg: 'bg-ink-100', text: 'text-ink-700', dot: 'bg-ink-400' },
  blue: { bg: 'bg-brand-50', text: 'text-brand-700', dot: 'bg-brand-500' },
  green: { bg: 'bg-success-50', text: 'text-success-700', dot: 'bg-success-500' },
  amber: { bg: 'bg-warning-50', text: 'text-warning-700', dot: 'bg-warning-500' },
  red: { bg: 'bg-danger-50', text: 'text-danger-700', dot: 'bg-danger-500' },
  brand: { bg: 'bg-brand-100', text: 'text-brand-800', dot: 'bg-brand-600' },
};

export function Badge({ children, color = 'gray', dot, className = '' }: BadgeProps) {
  const c = colorClasses[color];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${c.bg} ${c.text} ${className}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />}
      {children}
    </span>
  );
}
