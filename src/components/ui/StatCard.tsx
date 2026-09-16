import { type ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  color: 'blue' | 'green' | 'amber' | 'gray' | 'brand';
  trend?: string;
}

const colorMap = {
  blue: { bg: 'bg-brand-50', text: 'text-brand-600', icon: 'text-brand-500' },
  green: { bg: 'bg-success-50', text: 'text-success-600', icon: 'text-success-500' },
  amber: { bg: 'bg-warning-50', text: 'text-warning-600', icon: 'text-warning-500' },
  gray: { bg: 'bg-ink-100', text: 'text-ink-600', icon: 'text-ink-400' },
  brand: { bg: 'bg-brand-100', text: 'text-brand-700', icon: 'text-brand-600' },
};

export function StatCard({ label, value, icon, color, trend }: StatCardProps) {
  const c = colorMap[color];
  return (
    <div className="card-surface p-5 transition-all hover:shadow-md">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</p>
          <p className={`mt-2 text-2xl font-bold ${c.text}`}>{value}</p>
          {trend && <p className="mt-1 text-xs text-ink-400">{trend}</p>}
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${c.bg} ${c.icon}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
