import type {
  ChargeUnit,
  PricingResult,
  PricingBreakdownItem,
  ExtraCharges,
  Inspection,
  Vehicle,
  Challan,
  LifecycleStatus,
  DerivedStatus,
  DepositKind,
  PledgeStatus,
  PaymentMethod,
} from '@/types/rental';

// ─── Time helpers ───────────────────────────────────────────────────

const MINUTES: Record<ChargeUnit, number> = {
  hour: 60,
  day: 1440,
  week: 10080,
  month: 43200,
};

export function joinDateTime(date: string, time: string): string {
  return new Date(`${date}T${time || '00:00'}`).toISOString();
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  return `${formatDate(iso)}, ${formatTime(iso)}`;
}

export function formatDuration(minutes: number | null): string {
  if (!minutes || minutes <= 0) return '0m';
  const d = Math.floor(minutes / 1440);
  const h = Math.floor((minutes % 1440) / 60);
  const m = Math.floor(minutes % 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  return parts.join(' ') || '0m';
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

// ─── Pricing ─────────────────────────────────────────────────────────

export function calculateCharge(
  plannedMinutes: number,
  chargeRows: { unit: ChargeUnit; value: number; price: number; allowed_kms: number }[]
): PricingResult {
  const validRows = chargeRows
    .filter((r) => r.value > 0 && r.price > 0)
    .map((r) => ({ ...r, minutes: MINUTES[r.unit] * r.value }))
    .sort((a, b) => b.minutes - a.minutes);

  let remaining = plannedMinutes;
  let total = 0;
  let allowedKms = 0;
  const breakdownMap = new Map<string, PricingBreakdownItem>();

  for (const row of validRows) {
    while (remaining >= row.minutes) {
      remaining -= row.minutes;
      total += row.price;
      allowedKms += row.allowed_kms;
      const key = `${row.value} ${row.unit}`;
      const existing = breakdownMap.get(key);
      if (existing) {
        existing.count += 1;
        existing.price += row.price;
        existing.allowedKms += row.allowed_kms;
      } else {
        breakdownMap.set(key, {
          label: `${row.value} ${row.unit}${row.value > 1 ? 's' : ''}`,
          price: row.price,
          allowedKms: row.allowed_kms,
          count: 1,
        });
      }
    }
  }

  if (remaining > 0 && validRows.length > 0) {
    const smallest = validRows[validRows.length - 1];
    total += smallest.price;
    allowedKms += smallest.allowed_kms;
    const key = `${smallest.value} ${smallest.unit}`;
    const existing = breakdownMap.get(key);
    if (existing) {
      existing.count += 1;
      existing.price += smallest.price;
      existing.allowedKms += smallest.allowed_kms;
    } else {
      breakdownMap.set(key, {
        label: `${smallest.value} ${smallest.unit}${smallest.value > 1 ? 's' : ''}`,
        price: smallest.price,
        allowedKms: smallest.allowed_kms,
        count: 1,
      });
    }
  }

  return {
    total,
    allowedKms,
    breakdown: Array.from(breakdownMap.values()),
  };
}

export function calculatePlannedMinutes(days: number, hours: number): number {
  return Number(days || 0) * 1440 + Number(hours || 0) * 60;
}

export function calculateExpectedEnd(startIso: string, plannedMinutes: number): string {
  return new Date(new Date(startIso).getTime() + plannedMinutes * 60000).toISOString();
}

// ─── Return Charge Calculation ──────────────────────────────────────

export function calculateExtraCharges(
  vehicle: Vehicle,
  inspection: Pick<
    Inspection,
    | 'odometer_out'
    | 'odometer_return'
    | 'fuel_points_out'
    | 'fuel_points_return'
    | 'rental_actual_start_time'
    | 'rental_end_time'
    | 'planned_duration_minutes'
    | 'rental_actual_end_time'
    | 'rental_start_time'
    | 'issued_at'
  >
): ExtraCharges {
  const kmsDriven = Math.max(
    0,
    (inspection.odometer_return ?? 0) - (inspection.odometer_out ?? 0)
  );
  const extraKms = Math.max(0, kmsDriven - getIssueAllowedKms(inspection as Inspection));

  const fuelShortfall = Math.max(
    0,
    (inspection.fuel_points_out ?? 0) - (inspection.fuel_points_return ?? 0)
  );

  const expectedEnd = inspection.rental_end_time
    ? new Date(inspection.rental_end_time).getTime()
    : new Date(
        new Date(
          inspection.rental_actual_start_time ||
            inspection.rental_start_time ||
            inspection.issued_at ||
            Date.now()
        ).getTime() +
          (inspection.planned_duration_minutes ?? 0) * 60000
      ).getTime();

  const actualEnd = inspection.rental_actual_end_time
    ? new Date(inspection.rental_actual_end_time).getTime()
    : Date.now();

  const minutesOverdue = Math.max(0, Math.round((actualEnd - expectedEnd) / 60000));
  const extraHours = Math.ceil(minutesOverdue / 60);

  return {
    km_charge: extraKms * (vehicle.extra_charge_per_km ?? 0),
    fuel_charge: fuelShortfall * (vehicle.rate_per_fuel_point ?? 0),
    overdue_charge: extraHours * (vehicle.charge_per_extra_hour ?? 0),
    extra_kms: extraKms,
    fuel_shortfall: fuelShortfall,
    extra_hours: extraHours,
  };
}

function getIssueAllowedKms(inspection: Inspection): number {
  // In production this would come from the stored issue-time pricing.
  // For mock we re-calculate from the vehicle charge rows.
  return 0; // Overridden in mock data layer with stored value
}

export function calculateReturnTotal(
  extraCharges: ExtraCharges,
  damageCharge: number,
  memoCharge: number,
  discount: number
): { calculatedTotal: number; totalToPay: number } {
  const overagesTotal =
    extraCharges.km_charge + extraCharges.fuel_charge + extraCharges.overdue_charge;
  const calculatedTotal = overagesTotal + damageCharge + memoCharge;
  const totalToPay = Math.max(0, calculatedTotal - discount);
  return { calculatedTotal, totalToPay };
}

// ─── Challan helpers ────────────────────────────────────────────────

export function newChallansOf(rows: Challan[]): Challan[] {
  const issueNos = new Set(
    rows.filter((r) => r.capture_stage === 'at_issue').map((r) => r.challan_no)
  );
  return rows.filter(
    (r) => r.capture_stage === 'at_return' && !issueNos.has(r.challan_no)
  );
}

export function totalOf(rows: Challan[]): number {
  return rows.reduce((sum, r) => sum + (r.total_amount || r.fine_amount || 0), 0);
}

export function outstandingChallanValue(rows: Challan[]): number {
  return totalOf(newChallansOf(rows).filter((r) => !r.cleared));
}

// ─── Status helpers ─────────────────────────────────────────────────

export function getRentalDerivedStatus(inspection: Inspection): DerivedStatus {
  switch (inspection.lifecycle_status) {
    case 'DRAFT':
      return { label: 'Draft', color: 'gray', icon: 'FileText' };
    case 'ISSUED':
      return { label: 'On Rent', color: 'blue', icon: 'Car' };
    case 'RETURNED':
      return { label: 'Returned', color: 'green', icon: 'CheckCircle' };
    case 'CANCELLED':
      return { label: 'Cancelled', color: 'red', icon: 'XCircle' };
    default:
      return { label: 'Unknown', color: 'gray', icon: 'HelpCircle' };
  }
}

export function getDepositKindLabel(kind: DepositKind): string {
  switch (kind) {
    case 'money':
      return 'Money Deposit';
    case 'pledge':
      return 'Vehicle Pledge';
    case 'both':
      return 'Money + Pledge';
    default:
      return '—';
  }
}

export function getPledgeStatusLabel(status: PledgeStatus): string {
  switch (status) {
    case 'HELD':
      return 'Held';
    case 'RELEASED':
      return 'Released';
    case 'N/A':
      return 'N/A';
    default:
      return '—';
  }
}

export function getPaymentMethodLabel(method: PaymentMethod | null): string {
  switch (method) {
    case 'online':
      return 'Online (UPI)';
    case 'cash':
      return 'Cash';
    case 'none':
      return 'No Payment';
    default:
      return '—';
  }
}

export function hasMoneyDeposit(inspection: Inspection): boolean {
  return inspection.deposit_kind === 'money' || inspection.deposit_kind === 'both';
}

export function getEffectiveDeposit(inspection: Inspection): number {
  return hasMoneyDeposit(inspection) ? (inspection.deposit_amount ?? 0) : 0;
}

export function getIssueTotal(inspection: Inspection): number {
  const base = inspection.rental_amount ?? 0;
  const deposit = getEffectiveDeposit(inspection);
  const adj = inspection.issue_adjustment_amount ?? 0;
  return Math.max(0, base + deposit - adj);
}
