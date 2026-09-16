import { useMemo } from 'react';
import {
  Car,
  User,
  Calendar,
  Gauge,
  Fuel,
  IndianRupee,
  FileText,
  ScrollText,
  Image as ImageIcon,
  Shield,
  Download,
  Clock,
} from 'lucide-react';
import type { RentalStore } from '@/lib/store';
import type { Inspection } from '@/types/rental';
import { Card, SectionTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { InfoGroup, InfoRow, ChargeRow } from '@/components/ui/InfoRow';
import {
  formatCurrency,
  formatDate,
  formatTime,
  formatDateTime,
  formatDuration,
  getPaymentMethodLabel,
  getDepositKindLabel,
  getPledgeStatusLabel,
  hasMoneyDeposit,
  outstandingChallanValue,
  totalOf,
  newChallansOf,
} from '@/lib/rental-calculations';

interface ReportTabProps {
  inspection: Inspection;
  store: RentalStore;
}

export function ReportTab({ inspection, store }: ReportTabProps) {
  const vehicle = store.getVehicle(inspection.car_id);
  const customer = store.getCustomer(inspection.customer_id);
  const issuedBy = store.getMember(inspection.issued_by_member_id);
  const returnedBy = store.getMember(inspection.returned_by_member_id);
  const challans = useMemo(
    () => store.getChallansFor(inspection.id),
    [store, inspection.id]
  );
  const outstanding = outstandingChallanValue(challans);
  const newChallans = newChallansOf(challans);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Report Header */}
      <Card className="print:shadow-none print:border-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white">
              <FileText className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-ink-900">Rental Report</h2>
              <p className="text-sm text-ink-500">{inspection.rental_no}</p>
            </div>
          </div>
          <Button variant="outline" icon={<Download className="h-4 w-4" />} onClick={handlePrint}>
            Download PDF
          </Button>
        </div>
      </Card>

      {/* Vehicle & Renter */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <InfoGroup title="Vehicle" icon={<Car className="h-4 w-4" />}>
          <InfoRow label="Registration" value={vehicle?.registration_number} />
          <InfoRow label="Make & Model" value={`${vehicle?.brand} ${vehicle?.model}`} />
        </InfoGroup>
        <InfoGroup title="Renter" icon={<User className="h-4 w-4" />}>
          <InfoRow label="Name" value={customer?.name} />
          <InfoRow label="Phone" value={customer?.phone} />
        </InfoGroup>
      </div>

      {/* Timing */}
      <InfoGroup title="Timing" icon={<Calendar className="h-4 w-4" />}>
        <InfoRow label="Issued At" value={formatDateTime(inspection.issued_at)} />
        <InfoRow label="Expected Return" value={formatDateTime(inspection.rental_end_time)} />
        <InfoRow label="Actual Return" value={formatDateTime(inspection.rental_actual_end_time)} />
        <InfoRow label="Issued By" value={issuedBy?.name || '—'} />
        <InfoRow label="Returned By" value={returnedBy?.name || '—'} />
        <InfoRow label="Duration Used" value={formatDuration(inspection.actual_duration_minutes)} />
      </InfoGroup>

      {/* Readings */}
      <InfoGroup title="Readings" icon={<Gauge className="h-4 w-4" />}>
        <InfoRow label="Odometer at Issue" value={inspection.odometer_out ?? '—'} />
        <InfoRow label="Odometer at Return" value={inspection.odometer_return ?? '—'} />
        <InfoRow label="Fuel Points at Issue" value={inspection.fuel_points_out ?? '—'} />
        <InfoRow label="Fuel Points at Return" value={inspection.fuel_points_return ?? '—'} />
      </InfoGroup>

      {/* Charges & Payment */}
      <Card>
        <SectionTitle
          title="Charges & Payment"
          icon={<IndianRupee className="h-5 w-5" />}
        />
        <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-1">
            <ChargeRow label="Base Rental" amount={inspection.rental_amount} />
            {hasMoneyDeposit(inspection) && (
              <ChargeRow label="Security Deposit" amount={inspection.deposit_amount} type="muted" />
            )}
            <ChargeRow label="Extra KM Charge" amount={inspection.extra_charges.km_charge} />
            <ChargeRow label="Fuel Charge" amount={inspection.extra_charges.fuel_charge} />
            <ChargeRow label="Overdue Charge" amount={inspection.extra_charges.overdue_charge} />
            <ChargeRow label="Damage Charge" amount={inspection.damage_charge} />
            <div className="border-t border-ink-200 pt-2" />
            <ChargeRow label="Calculated Total" amount={inspection.calculated_total} type="bold" />
            <ChargeRow label="Discount" amount={-inspection.discount_amount} type="positive" />
            <div className="border-t border-ink-200 pt-2" />
            <div className="flex items-center justify-between py-2">
              <span className="text-base font-bold text-ink-900">Total Paid</span>
              <span className="text-lg font-bold text-brand-700">{formatCurrency(inspection.total_to_pay)}</span>
            </div>
          </div>
          <div className="space-y-3">
            <InfoGroup title="Payment Info" icon={<IndianRupee className="h-4 w-4" />}>
              <InfoRow label="Payment Method" value={getPaymentMethodLabel(inspection.payment_method)} />
              <InfoRow label="Deposit Type" value={getDepositKindLabel(inspection.deposit_kind)} />
              <InfoRow label="Pledge Status" value={getPledgeStatusLabel(inspection.pledge_status)} />
            </InfoGroup>
          </div>
        </div>
      </Card>

      {/* Documents */}
      <InfoGroup title="Documents" icon={<ImageIcon className="h-4 w-4" />}>
        <InfoRow
          label="Odometer Photo - Issue"
          value={inspection.odometer_out_image_url ? 'Uploaded' : '—'}
        />
        <InfoRow
          label="Odometer Photo - Return"
          value={inspection.odometer_return_image_url ? 'Uploaded' : '—'}
        />
        <InfoRow
          label="Damage Photo"
          value={inspection.damage_image_url ? 'Uploaded' : '—'}
        />
        <InfoRow
          label="Payment Proof"
          value={inspection.payment_proof_url ? 'Uploaded' : '—'}
        />
        {(inspection.deposit_kind === 'pledge' || inspection.deposit_kind === 'both') && (
          <>
            <InfoRow label="Pledge RC" value={inspection.pledge_rc_url ? 'Uploaded' : '—'} />
            <InfoRow
              label="Pledge Renter Photo"
              value={inspection.pledge_renter_photo_url ? 'Uploaded' : '—'}
            />
          </>
        )}
      </InfoGroup>

      {/* Challans */}
      <Card>
        <SectionTitle
          title="Challans"
          subtitle={`${challans.length} challan(s) associated with this rental`}
          icon={<ScrollText className="h-5 w-5" />}
          action={
            outstanding > 0 ? (
              <Badge color="red" dot>
                {formatCurrency(outstanding)} outstanding
              </Badge>
            ) : (
              <Badge color="green" dot>All cleared</Badge>
            )
          }
        />
        <div className="mt-4">
          {challans.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-400">No challans recorded</p>
          ) : (
            <div className="space-y-2">
              {challans.map((ch) => (
                <div
                  key={ch.id}
                  className="flex items-center justify-between rounded-lg border border-ink-200 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-ink-900">{ch.challan_no}</p>
                    <p className="text-xs text-ink-500">
                      {ch.offence_details} - {ch.challan_place}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-ink-700">
                      {formatCurrency(ch.total_amount || ch.fine_amount)}
                    </span>
                    {ch.cleared ? (
                      <Badge color="green">Cleared</Badge>
                    ) : (
                      <Badge color="red">Uncleared</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {outstanding > 0 && (
            <div className="mt-4 flex items-center justify-between rounded-xl bg-danger-50 px-4 py-3">
              <span className="text-sm font-medium text-danger-700">Outstanding Challan Value</span>
              <span className="text-lg font-bold text-danger-700">{formatCurrency(outstanding)}</span>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
