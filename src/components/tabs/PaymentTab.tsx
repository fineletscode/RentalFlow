import { useMemo } from 'react';
import {
  IndianRupee,
  Shield,
  CreditCard,
  CheckCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import type { RentalStore } from '@/lib/store';
import type { Inspection } from '@/types/rental';
import { Card, SectionTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { InfoGroup, InfoRow, ChargeRow } from '@/components/ui/InfoRow';
import {
  formatCurrency,
  getPaymentMethodLabel,
  getIssueTotal,
  getDepositKindLabel,
  hasMoneyDeposit,
} from '@/lib/rental-calculations';

interface PaymentTabProps {
  inspection: Inspection;
  store: RentalStore;
}

export function PaymentTab({ inspection, store }: PaymentTabProps) {
  const issueTotal = useMemo(() => getIssueTotal(inspection), [inspection]);
  const collector = store.getMember(inspection.issue_payment_collector_id);
  const returnCollector = store.getMember(inspection.return_payment_collector_id);

  const showIssuePayment = inspection.issue_payment_method !== null;
  const showReturnPayment = inspection.lifecycle_status === 'RETURNED';

  if (!showIssuePayment && !showReturnPayment) {
    return (
      <Card>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <CreditCard className="h-10 w-10 text-ink-300" />
          <h3 className="mt-4 text-base font-semibold text-ink-700">No Payment Data</h3>
          <p className="mt-1 text-sm text-ink-500">
            Payment information will appear here after the rental is issued.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Issue Payment */}
      {showIssuePayment && (
        <Card>
          <SectionTitle
            title="Issue Payment"
            subtitle="Payment collected at the time of issue"
            icon={<IndianRupee className="h-5 w-5" />}
            action={
              <Badge
                color={inspection.deposit_payment_status === 'PAID' ? 'green' : inspection.deposit_payment_status === 'WAIVED' ? 'gray' : 'amber'}
                dot
              >
                {inspection.deposit_payment_status}
              </Badge>
            }
          />
          <div className="mt-5 space-y-1">
            <ChargeRow label="Base Rental" amount={inspection.rental_amount} />
            {hasMoneyDeposit(inspection) && (
              <ChargeRow label="Security Deposit (Refundable)" amount={inspection.deposit_amount} type="muted" />
            )}
            <ChargeRow label="Issue Adjustment" amount={-inspection.issue_adjustment_amount} type="positive" />
            <div className="border-t border-ink-200 pt-2" />
            <ChargeRow label="Issue Total Collected" amount={issueTotal} type="bold" />
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InfoGroup title="Payment Method" icon={<CreditCard className="h-4 w-4" />}>
              <InfoRow label="Method" value={getPaymentMethodLabel(inspection.issue_payment_method)} />
              {collector && <InfoRow label="Collector" value={collector.name} />}
              <InfoRow
                label="Proof"
                value={inspection.issue_payment_proof_url ? 'Uploaded' : '—'}
              />
            </InfoGroup>
            {hasMoneyDeposit(inspection) && (
              <InfoGroup title="Deposit" icon={<Shield className="h-4 w-4" />}>
              <InfoRow label="Type" value={getDepositKindLabel(inspection.deposit_kind)} />
              <InfoRow label="Status" value={inspection.deposit_payment_status} />
              <InfoRow label="Paid" value={inspection.deposit_paid ? 'Yes' : 'No'} />
            </InfoGroup>
            )}
            {!hasMoneyDeposit(inspection) && (
              <InfoGroup title="Deposit" icon={<Shield className="h-4 w-4" />}>
                <InfoRow label="Type" value={getDepositKindLabel(inspection.deposit_kind)} />
                <InfoRow label="Cash Deposit" value="None - pledge only" />
              </InfoGroup>
            )}
          </div>
        </Card>
      )}

      {/* Return Payment */}
      {showReturnPayment && (
        <Card>
          <SectionTitle
            title="Return Payment"
            subtitle="Payment collected at the time of return"
            icon={<CheckCircle className="h-5 w-5" />}
            action={
              <Badge
                color={inspection.total_to_pay === 0 ? 'gray' : 'green'}
                dot
              >
                {inspection.total_to_pay === 0 ? 'No Charge' : 'Settled'}
              </Badge>
            }
          />
          <div className="mt-5 space-y-1">
            <ChargeRow label="Base Rental (already collected)" amount={inspection.rental_amount} type="muted" />
            <div className="border-t border-ink-100 pt-2" />
            <ChargeRow label="Extra KM Charge" amount={inspection.extra_charges.km_charge} />
            <ChargeRow label="Fuel Charge" amount={inspection.extra_charges.fuel_charge} />
            <ChargeRow label="Overdue Charge" amount={inspection.extra_charges.overdue_charge} />
            <ChargeRow label="Damage Charge" amount={inspection.damage_charge} />
            <div className="border-t border-ink-100 pt-2" />
            <ChargeRow label="Calculated Total" amount={inspection.calculated_total} />
            <ChargeRow label="Discount" amount={-inspection.discount_amount} type="positive" />
            <div className="border-t border-ink-200 pt-2" />
            <div className="flex items-center justify-between py-2">
              <span className="text-base font-bold text-ink-900">Total Paid</span>
              <span className="text-xl font-bold text-success-600">
                {formatCurrency(inspection.total_to_pay)}
              </span>
            </div>
          </div>
          <div className="mt-4">
            <InfoGroup title="Payment Details" icon={<CreditCard className="h-4 w-4" />}>
              <InfoRow label="Method" value={getPaymentMethodLabel(inspection.payment_method)} />
              {returnCollector && <InfoRow label="Collector" value={returnCollector.name} />}
              <InfoRow
                label="Proof"
                value={inspection.payment_proof_url ? 'Uploaded' : '—'}
              />
            </InfoGroup>
          </div>
        </Card>
      )}

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card-surface p-5">
          <div className="flex items-center gap-2 text-ink-500">
            <IndianRupee className="h-4 w-4" />
            <span className="text-xs font-medium uppercase">Issue Collected</span>
          </div>
          <p className="mt-2 text-xl font-bold text-ink-900">{formatCurrency(issueTotal)}</p>
        </div>
        <div className="card-surface p-5">
          <div className="flex items-center gap-2 text-ink-500">
            <CheckCircle className="h-4 w-4" />
            <span className="text-xs font-medium uppercase">Return Collected</span>
          </div>
          <p className="mt-2 text-xl font-bold text-ink-900">{formatCurrency(inspection.total_to_pay)}</p>
        </div>
        <div className="card-surface p-5">
          <div className="flex items-center gap-2 text-ink-500">
            <Clock className="h-4 w-4" />
            <span className="text-xs font-medium uppercase">Deposit Refundable</span>
          </div>
          <p className="mt-2 text-xl font-bold text-success-600">
            {!hasMoneyDeposit(inspection)
              ? 'N/A (Pledge)'
              : inspection.deposit_payment_status === 'WAIVED'
              ? 'Waived'
              : formatCurrency(inspection.deposit_amount)}
          </p>
        </div>
      </div>
    </div>
  );
}
