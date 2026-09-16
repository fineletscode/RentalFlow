import { useMemo, useState } from 'react';
import {
  Car,
  CheckCircle,
  FileText,
  Plus,
  Search,
  TrendingUp,
  Users,
  Clock,
  Phone,
  ChevronRight,
} from 'lucide-react';
import type { RentalStore } from '@/lib/store';
import type { Inspection, LifecycleStatus } from '@/types/rental';
import { Card, SectionTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { StatCard } from '@/components/ui/StatCard';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/Tabs';
import { getRentalDerivedStatus, formatCurrency, formatDateTime } from '@/lib/rental-calculations';

interface DashboardProps {
  store: RentalStore;
  onNewRental: () => void;
  onOpenRental: (id: string) => void;
}

const statusFilters: { key: LifecycleStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'DRAFT', label: 'Drafts' },
  { key: 'ISSUED', label: 'On Rent' },
  { key: 'RETURNED', label: 'Returned' },
];

export function Dashboard({ store, onNewRental, onOpenRental }: DashboardProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<LifecycleStatus | 'all'>('all');

  const filtered = useMemo(() => {
    return store.inspections.filter((i) => {
      if (filter !== 'all' && i.lifecycle_status !== filter) return false;
      if (search) {
        const vehicle = store.getVehicle(i.car_id);
        const customer = store.getCustomer(i.customer_id);
        const q = search.toLowerCase();
        return (
          i.rental_no.toLowerCase().includes(q) ||
          vehicle?.registration_number.toLowerCase().includes(q) ||
          vehicle?.brand.toLowerCase().includes(q) ||
          customer?.name.toLowerCase().includes(q) ||
          customer?.phone.includes(q)
        );
      }
      return true;
    });
  }, [store, search, filter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Rental Dashboard</h1>
          <p className="mt-1 text-sm text-ink-500">Manage your vehicle rental lifecycle</p>
        </div>
        <Button icon={<Plus className="h-4 w-4" />} onClick={onNewRental}>
          New Rental
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Rentals"
          value={store.stats.total}
          icon={<FileText className="h-6 w-6" />}
          color="brand"
        />
        <StatCard
          label="On Rent"
          value={store.stats.issued}
          icon={<Car className="h-6 w-6" />}
          color="blue"
          trend="Active vehicles out"
        />
        <StatCard
          label="Completed"
          value={store.stats.returned}
          icon={<CheckCircle className="h-6 w-6" />}
          color="green"
        />
        <StatCard
          label="Revenue"
          value={formatCurrency(store.stats.revenue)}
          icon={<TrendingUp className="h-6 w-6" />}
          color="amber"
          trend="From completed rentals"
        />
      </div>

      {/* Search & Filters */}
      <Card padding="sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1">
            <Input
              placeholder="Search by rental no, vehicle, or customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              prefix={<Search className="h-4 w-4" />}
            />
          </div>
          <div className="flex gap-1.5">
            {statusFilters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                  filter === f.key
                    ? 'bg-brand-600 text-white'
                    : 'bg-ink-100 text-ink-600 hover:bg-ink-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Rental List */}
      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FileText className="h-8 w-8" />}
            title="No rentals found"
            message="Try adjusting your search or create a new rental to get started."
            action={<Button icon={<Plus className="h-4 w-4" />} onClick={onNewRental}>New Rental</Button>}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {filtered.map((inspection) => (
            <RentalCard
              key={inspection.id}
              inspection={inspection}
              store={store}
              onOpen={() => onOpenRental(inspection.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface RentalCardProps {
  inspection: Inspection;
  store: RentalStore;
  onOpen: () => void;
}

function RentalCard({ inspection, store, onOpen }: RentalCardProps) {
  const vehicle = store.getVehicle(inspection.car_id);
  const customer = store.getCustomer(inspection.customer_id);
  const status = getRentalDerivedStatus(inspection);

  const statusColor = {
    gray: 'gray',
    blue: 'blue',
    green: 'green',
    amber: 'amber',
    red: 'red',
  } as const;

  return (
    <div
      onClick={onOpen}
      className="card-surface group cursor-pointer p-5 transition-all hover:shadow-md hover:border-brand-300 animate-slide-up"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <Car className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-ink-900">{inspection.rental_no}</p>
            <p className="text-xs text-ink-500">
              {vehicle?.brand} {vehicle?.model} - {vehicle?.registration_number}
            </p>
          </div>
        </div>
        <Badge color={statusColor[status.color]} dot>
          {status.label}
        </Badge>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 border-t border-ink-100 pt-4">
        <div>
          <p className="flex items-center gap-1.5 text-xs text-ink-400">
            <Users className="h-3.5 w-3.5" /> Renter
          </p>
          <p className="mt-1 text-sm font-medium text-ink-800">{customer?.name ?? '—'}</p>
          <p className="flex items-center gap-1 text-xs text-ink-500">
            <Phone className="h-3 w-3" /> {customer?.phone ?? '—'}
          </p>
        </div>
        <div>
          <p className="flex items-center gap-1.5 text-xs text-ink-400">
            <Clock className="h-3.5 w-3.5" /> Period
          </p>
          <p className="mt-1 text-sm font-medium text-ink-800">
            {formatDateTime(inspection.issued_at || inspection.rental_start_time)}
          </p>
          <p className="text-xs text-ink-500">
            {inspection.duration_days}d {inspection.duration_hours}h
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-ink-100 pt-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-400">Base</span>
          <span className="text-sm font-bold text-ink-900">{formatCurrency(inspection.rental_amount)}</span>
          <span className="text-xs text-ink-300">|</span>
          {(inspection.deposit_kind === 'money' || inspection.deposit_kind === 'both') && (
            <>
              <span className="text-xs text-ink-400">Deposit</span>
              <span className="text-sm font-semibold text-ink-700">{formatCurrency(inspection.deposit_amount)}</span>
            </>
          )}
          {inspection.deposit_kind === 'pledge' && (
            <span className="text-xs font-medium text-ink-500">Pledge only</span>
          )}
        </div>
        <ChevronRight className="h-5 w-5 text-ink-300 transition-transform group-hover:translate-x-1 group-hover:text-brand-500" />
      </div>
    </div>
  );
}
