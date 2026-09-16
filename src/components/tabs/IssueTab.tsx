import { useState } from 'react';
import {
  Car,
  User,
  Gauge,
  Fuel,
  Shield,
  FileText,
  Image as ImageIcon,
  Upload,
  Check,
  Lock,
} from 'lucide-react';
import type { RentalStore } from '@/lib/store';
import type { Inspection, DepositKind, PaymentMethod, PaymentStatus } from '@/types/rental';
import { Card, SectionTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, FieldRow } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { InfoGroup, InfoRow } from '@/components/ui/InfoRow';
import { FileUpload } from '@/components/ui/FileUpload';
import { ConfirmDialog } from '@/components/ui/Tabs';
import { Modal } from '@/components/ui/Modal';
import {
  formatCurrency,
  formatDate,
  formatTime,
  getDepositKindLabel,
  getIssueTotal,
  hasMoneyDeposit,
} from '@/lib/rental-calculations';

interface IssueTabProps {
  inspection: Inspection;
  store: RentalStore;
  onIssue: (data: Partial<Inspection>) => void;
}

export function IssueTab({ inspection, store, onIssue }: IssueTabProps) {
  const isLocked = inspection.lifecycle_status !== 'DRAFT';
  const vehicle = store.getVehicle(inspection.car_id);
  const customer = store.getCustomer(inspection.customer_id);

  const [odometer, setOdometer] = useState(inspection.odometer_out?.toString() || '');
  const [fuelPoints, setFuelPoints] = useState(inspection.fuel_points_out?.toString() || '');
  const [depositMethod, setDepositMethod] = useState<PaymentMethod>(
    inspection.deposit_payment_method || 'cash'
  );
  const [depositStatus, setDepositStatus] = useState<PaymentStatus>(
    inspection.deposit_payment_status
  );
  const [paymentProof, setPaymentProof] = useState(inspection.issue_payment_proof_url || '');
  const [odometerImage, setOdometerImage] = useState(inspection.odometer_out_image_url || '');
  const [collectorId, setCollectorId] = useState(inspection.issue_payment_collector_id || store.members[0].id);
  const [showConfirm, setShowConfirm] = useState(false);

  const issueTotal = getIssueTotal(inspection);

  const validate = (): string | null => {
    if (!odometer || Number(odometer) < 0) return 'Odometer reading is required';
    if (!fuelPoints || Number(fuelPoints) < 0) return 'Fuel points are required';
    if (!odometerImage) return 'Odometer photo is required';
    if (hasMoneyDeposit(inspection)) {
      if (depositStatus !== 'WAIVED' && depositStatus !== 'PAID' && depositStatus !== 'PENDING')
        return 'Select deposit payment status';
      if (depositMethod === 'online' && !paymentProof) return 'Payment proof is required for online payment';
      if (depositStatus === 'PAID' && depositMethod === 'online' && !paymentProof)
        return 'Payment proof required for paid online deposit';
    }
    return null;
  };

  const handleIssue = () => {
    const err = validate();
    if (err) return;
    setShowConfirm(true);
  };

  const confirmIssue = () => {
    setShowConfirm(false);
    const isPledgeOnly = !hasMoneyDeposit(inspection);
    onIssue({
      odometer_out: Number(odometer),
      odometer_out_image_url: odometerImage,
      fuel_points_out: Number(fuelPoints),
      deposit_payment_method: isPledgeOnly ? null : depositMethod,
      deposit_payment_status: isPledgeOnly ? 'WAIVED' : depositStatus,
      deposit_paid: isPledgeOnly ? false : depositStatus === 'PAID',
      deposit_proof_url: isPledgeOnly ? null : (paymentProof || null),
      issue_payment_method: isPledgeOnly ? null : depositMethod,
      issue_payment_proof_url: isPledgeOnly ? null : (paymentProof || null),
      issue_payment_collector_id: isPledgeOnly ? null : (depositMethod === 'cash' ? collectorId : null),
      rental_actual_start_time: new Date().toISOString(),
      issued_by_member_id: store.members[0].id,
    });
  };

  return (
    <div className="space-y-4">
      {isLocked && (
        <div className="flex items-center gap-2 rounded-lg bg-ink-100 px-4 py-3 text-sm text-ink-600">
          <Lock className="h-4 w-4" />
          This rental has been issued. Issue fields are now locked.
        </div>
      )}

      {/* Vehicle & Customer Summary */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <InfoGroup title="Vehicle" icon={<Car className="h-4 w-4" />}>
          <InfoRow label="Registration" value={vehicle?.registration_number} />
          <InfoRow label="Make & Model" value={`${vehicle?.brand} ${vehicle?.model}`} />
          {hasMoneyDeposit(inspection) && (
            <InfoRow label="Security Deposit" value={formatCurrency(inspection.deposit_amount)} highlight />
          )}
          {!hasMoneyDeposit(inspection) && (
            <InfoRow label="Deposit Type" value={getDepositKindLabel(inspection.deposit_kind)} />
          )}
        </InfoGroup>
        <InfoGroup title="Customer" icon={<User className="h-4 w-4" />}>
          <InfoRow label="Name" value={customer?.name} />
          <InfoRow label="Phone" value={customer?.phone} />
          <InfoRow label="Email" value={customer?.email || '—'} />
        </InfoGroup>
      </div>

      {/* Rental Period */}
      <InfoGroup title="Rental Period" icon={<FileText className="h-4 w-4" />}>
        <InfoRow label="Start Date" value={formatDate(inspection.rental_start_date)} />
        <InfoRow label="Start Time" value={formatTime(inspection.rental_start_time)} />
        <InfoRow
          label="Duration"
          value={`${inspection.duration_days}d ${inspection.duration_hours}h`}
        />
        <InfoRow label="Base Rental" value={formatCurrency(inspection.rental_amount)} highlight />
      </InfoGroup>

      {/* Issue Readings */}
      {!isLocked && (
        <Card>
          <SectionTitle
            title="Issue Readings"
            subtitle="Record vehicle condition at pickup"
            icon={<Gauge className="h-5 w-5" />}
          />
          <div className="mt-5 space-y-4">
            <FieldRow cols={2}>
              <Input
                label="Odometer Reading (km)"
                type="number"
                min={0}
                value={odometer}
                onChange={(e) => setOdometer(e.target.value)}
                prefix={<Gauge className="h-4 w-4" />}
                disabled={isLocked}
              />
              <Input
                label="Fuel Points"
                type="number"
                min={0}
                value={fuelPoints}
                onChange={(e) => setFuelPoints(e.target.value)}
                prefix={<Fuel className="h-4 w-4" />}
                disabled={isLocked}
              />
            </FieldRow>
            <FileUpload
              label="Odometer Photo"
              url={odometerImage}
              onChange={setOdometerImage}
              required
              hint="Photo of the odometer at pickup"
              icon={<ImageIcon className="h-5 w-5" />}
            />
          </div>
        </Card>
      )}

      {/* Deposit & Payment */}
      {!isLocked && (
        <Card>
          <SectionTitle
            title="Deposit & Payment"
            subtitle={hasMoneyDeposit(inspection) ? `Deposit type: ${getDepositKindLabel(inspection.deposit_kind)}` : 'Vehicle Pledge - no cash deposit collected'}
            icon={<Shield className="h-5 w-5" />}
          />
          <div className="mt-5 space-y-4">
            {hasMoneyDeposit(inspection) && (
              <FieldRow cols={2}>
                <Select
                  label="Payment Method"
                  value={depositMethod}
                  onChange={(e) => setDepositMethod(e.target.value as PaymentMethod)}
                >
                  <option value="cash">Cash</option>
                  <option value="online">Online (UPI)</option>
                </Select>
                <Select
                  label="Deposit Status"
                  value={depositStatus}
                  onChange={(e) => setDepositStatus(e.target.value as PaymentStatus)}
                >
                  <option value="PENDING">Pending</option>
                  <option value="PAID">Paid</option>
                  <option value="WAIVED">Waived</option>
                </Select>
              </FieldRow>
            )}
            {!hasMoneyDeposit(inspection) && (
              <div className="rounded-xl bg-ink-50 px-4 py-3 text-sm text-ink-500">
                No cash deposit is collected for vehicle pledge rentals. The pledge vehicle is held as security instead.
              </div>
            )}

            {depositMethod === 'online' && depositStatus === 'PAID' && (
              <FileUpload
                label="Payment Proof"
                url={paymentProof}
                onChange={setPaymentProof}
                required
                hint="Upload payment screenshot"
              />
            )}

            {depositMethod === 'cash' && (
              <Select
                label="Cash Collector"
                value={collectorId}
                onChange={(e) => setCollectorId(e.target.value)}
              >
                {store.members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.role})
                  </option>
                ))}
              </Select>
            )}

            <div className="rounded-xl bg-brand-50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-brand-700">Issue Total</span>
                <span className="text-xl font-bold text-brand-700">{formatCurrency(issueTotal)}</span>
              </div>
              <p className="mt-1 text-xs text-brand-600">
                Base {formatCurrency(inspection.rental_amount)}
                {hasMoneyDeposit(inspection) && ` + Deposit ${formatCurrency(inspection.deposit_amount)}`}
                {inspection.issue_adjustment_amount > 0 && ` - Adjustment ${formatCurrency(inspection.issue_adjustment_amount)}`}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Pledge Section */}
      {(inspection.deposit_kind === 'pledge' || inspection.deposit_kind === 'both') && (
        <Card>
          <SectionTitle
            title="Pledge Details"
            subtitle="Vehicle pledged as security"
            icon={<Shield className="h-5 w-5" />}
          />
          <div className="mt-4 space-y-2">
            <InfoRow label="Pledge Vehicle" value={inspection.pledge_make_model || '—'} />
            <InfoRow label="Registration" value={inspection.pledge_registration || '—'} />
            <InfoRow label="Colour" value={inspection.pledge_colour || '—'} />
            {inspection.pledge_notes && (
              <InfoRow label="Notes" value={inspection.pledge_notes} />
            )}
            <div className="flex flex-wrap gap-2 pt-2">
              {inspection.pledge_photo_urls?.map((url, idx) => (
                <Badge key={idx} color="brand">Photo {idx + 1}</Badge>
              ))}
              {inspection.pledge_rc_url && <Badge color="green">RC Document</Badge>}
              {inspection.pledge_renter_photo_url && <Badge color="green">Renter Photo</Badge>}
            </div>
          </div>
        </Card>
      )}

      {/* Action */}
      {!isLocked && (
        <div className="flex justify-end">
          <Button variant="success" icon={<Check className="h-4 w-4" />} onClick={handleIssue}>
            Confirm Issue
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={showConfirm}
        title="Confirm Issue"
        message={
          <div className="space-y-2">
            <p>Are you sure you want to issue this rental?</p>
            <p className="text-xs text-ink-500">
              This will change the rental status to "On Rent" and lock the issue fields.
              The vehicle will be marked as active.
            </p>
          </div>
        }
        confirmLabel="Yes, Issue Rental"
        variant="success"
        onConfirm={confirmIssue}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}
