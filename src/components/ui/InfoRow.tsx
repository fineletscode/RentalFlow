import { type ReactNode } from 'react';

interface InfoRowProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  highlight?: boolean;
}

export function InfoRow({ label, value, icon, highlight }: InfoRowProps) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <div className="flex items-center gap-2 text-sm text-ink-500">
        {icon}
        <span>{label}</span>
      </div>
      <span className={`text-sm font-semibold ${highlight ? 'text-brand-700' : 'text-ink-800'}`}>
        {value}
      </span>
    </div>
  );
}

interface InfoGroupProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function InfoGroup({ title, icon, children, className = '' }: InfoGroupProps) {
  return (
    <div className={`card-surface p-5 ${className}`}>
      <div className="mb-3 flex items-center gap-2 border-b border-ink-100 pb-3">
        {icon && <span className="text-brand-600">{icon}</span>}
        <h4 className="text-sm font-semibold uppercase tracking-wide text-ink-600">{title}</h4>
      </div>
      <div className="divide-y divide-ink-50">{children}</div>
    </div>
  );
}

interface ChargeRowProps {
  label: string;
  amount: number;
  type?: 'normal' | 'positive' | 'negative' | 'bold' | 'muted';
}

export function ChargeRow({ label, amount, type = 'normal' }: ChargeRowProps) {
  const typeClasses = {
    normal: 'text-ink-700',
    positive: 'text-success-600',
    negative: 'text-danger-600',
    bold: 'text-ink-900 font-bold text-base',
    muted: 'text-ink-400',
  };
  return (
    <div className="flex items-center justify-between py-2">
      <span className={`text-sm ${type === 'bold' ? 'font-semibold text-ink-800' : 'text-ink-500'}`}>
        {label}
      </span>
      <span className={`text-sm font-semibold tabular-nums ${typeClasses[type]}`}>
        {amount < 0 ? '-' : ''}
        {new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR',
          maximumFractionDigits: 0,
        }).format(Math.abs(amount))}
      </span>
    </div>
  );
}
