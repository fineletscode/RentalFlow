import { useState, useMemo } from 'react';
import {
  Gauge,
  Fuel,
  Calendar,
  AlertTriangle,
  Shield,
  Image as ImageIcon,
  Check,
  Lock,
  User,
  Calculator,
} from 'lucide-react';
import type { RentalStore } from '@/lib/store';
import type { Inspection, ExtraCharges, PaymentMethod } from '@/types/rental';
import { Card, SectionTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, FieldRow } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { InfoGroup, InfoRow, ChargeRow } from '@/components/ui/InfoRow';
import { FileUpload } from '@/components/ui/FileUpload';
import { ConfirmDialog, Modal } from '@/components/ui/Tabs';
import {
  formatCurrency,
  formatDate,
  formatTime,
  formatDuration,
  calculateExtraCharges,
  calculateReturnTotal,
  getDepositKindLabel,
  getPaymentMethodLabel,
  hasMoneyDeposit,
} from '@/lib/rental-calculations';

interface ReturnTabProps {
  inspection: Inspection;
  store: RentalStore;
  onCompleteReturn: (data: Partial<Inspection>) => void;
}

export function ReturnTab({ inspection, store, onCompleteReturn }: ReturnTabProps) {
  const isReturned = inspection.lifecycle_status === 'RETURNED';
  const isDraft = inspection.lifecycle_status === 'DRAFT';
  const vehicle = store.getVehicle(inspection.car_id);

  const [endDate, setEndDate] = useState(inspection.return_date || '');
  const [endTime, setEndTime] = useState(
    inspection.rental_actual_end_time
      ? formatTime(inspection.rental_actual_end_time).includes(':')
        ? formatTime(inspection.rental_actual_end_time)
        : '10:00'
      : '10:00'
  );
  const [odometerReturn, setOdometerReturn] = useState(
    inspection.odometer_return?.toString() || ''
  );
  const [fuelPointsReturn, setFuelPointsReturn] = useState(
    inspection.fuel_points_return?.toString() || ''
  );
  const [damageCharge, setDamageCharge] = useState(
    inspection.damage_charge?.toString() || '0'
  );
  const [damageImage, setDamageImage] = useState(inspection.damage_image_url || '');
  const [odometerImage, setOdometerImage] = useState(
    inspection.odometer_return_image_url || ''
  );
  const [returnedBy, setReturnedBy] = useState(
    inspection.returned_by_member_id || store.members[0].id
  );
  const [discount, setDiscount] = useState(inspection.discount_amount?.toString() || '0');
  const [payMethod, setPayMethod] = useState<PaymentMethod>(
    inspection.payment_method || 'cash'
  );
  const [payProof, setPayProof] = useState(inspection.payment_proof_url || '');
  const [collectorId, setCollectorId] = useState(
    inspection.return_payment_collector_id || store.members[0].id
  );
  const [releasedByUserId, setReleasedByUserId] = useState(
    inspection.released_by_user_id || store.members[0].id
  );
  const [showConfirm, setShowConfirm] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  const returnIso = useMemo(() => {
    if (!endDate) return null;
    return new Date(`${endDate}T${endTime || '00:00'}`).toISOString();
  }, [endDate, endTime]);

  const extraCharges: ExtraCharges = useMemo(() => {
    if (!vehicle || !returnIso) {
      return {
        km_charge: 0,
        fuel_charge: 0,
        overdue_charge: 0,
        extra_kms: 0,
        fuel_shortfall: 0,
        extra_hours: 0,
      };
    }
    return calculateExtraCharges(vehicle, {
      ...inspection,
      odometer_return: Number(odometerReturn) || null,
      fuel_points_return: Number(fuelPointsReturn) || null,
      rental_actual_end_time: returnIso,
    });
  }, [vehicle, inspection, returnIso, odometerReturn, fuelPointsReturn]);

  const actualDuration = useMemo(() => {
    if (!returnIso) return null;
    const start = new Date(
      inspection.rental_actual_start_time ||
        inspection.rental_start_time ||
        inspection.issued_at ||
        Date.now()
    ).getTime();
    return Math.round((new Date(returnIso).getTime() - start) / 60000);
  }, [returnIso, inspection]);

  const memoCharge = useMemo(() => {
    const challans = store.getChallansFor(inspection.id);
    const issueNos = new Set(
      challans.filter((c) => c.capture_stage === 'at_issue').map((c) => c.challan_no)
    );
    return challans
      .filter((c) => c.capture_stage === 'at_return' && !issueNos.has(c.challan_no))
      .reduce((sum, c) => sum + (c.total_amount || c.fine_amount || 0), 0);
  }, [store, inspection.id]);

  const { calculatedTotal, totalToPay } = useMemo(() => {
    return calculateReturnTotal(
      extraCharges,
      Number(damageCharge) || 0,
      memoCharge,
      Number(discount) || 0
    );
  }, [extraCharges, damageCharge, memoCharge, discount]);

  if (isDraft) {
    return (
      <Card>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Lock className="h-10 w-10 text-ink-300" />
          <h3 className="mt-4 text-base font-semibold text-ink-700">Rental Not Issued</h3>
          <p className="mt-1 text-sm text-ink-500">
            This rental must be issued before you can process a return.
          </p>
        </div>
      </Card>
    );
  }

  if (isReturned) {
    return <ReturnedView inspection={inspection} store={store} />;
  }

  const validate = (): string | null => {
    if (!endDate) return 'Return date is required';
    if (!odometerReturn || Number(odometerReturn) < 0)
      return 'Return odometer is required';
    if (Number(odometerReturn) < (inspection.odometer_out ?? 0))
      return 'Return odometer cannot be less than issue odometer';
    if (!odometerImage) return 'Return odometer photo is required';
    if (!fuelPointsReturn || Number(fuelPointsReturn) < 0)
      return 'Return fuel points are required';
    if (Number(damageCharge) > 0 && !damageImage)
      return 'Damage photo is required when damage charge > 0';
    if (totalToPay > 0 && !payMethod) return 'Payment method is required';
    if (payMethod === 'online' && !payProof)
      return 'Payment proof is required for online payment';
    if (
      (inspection.deposit_kind === 'pledge' || inspection.deposit_kind === 'both') &&
      !releasedByUserId
    )
      return 'Pledge release actor is required for pledge deposits';
    return null;
  };

  const handleComplete = () => {
    const err = validate();
    if (err) return;
    setShowConfirm(true);
  };

  const confirmReturn = () => {
    setShowConfirm(false);
    onCompleteReturn({
      return_date: endDate,
      returned_at: returnIso,
      rental_actual_end_time: returnIso,
      actual_duration_minutes: actualDuration,
      odometer_return: Number(odometerReturn),
      odometer_return_image_url: odometerImage,
      fuel_points_return: Number(fuelPointsReturn),
      damage_charge: Number(damageCharge),
      damage_image_url: Number(damageCharge) > 0 ? damageImage : null,
      returned_by_member_id: returnedBy,
      calculated_total: calculatedTotal,
      discount_amount: Number(discount),
      extra_charges: extraCharges,
      total_to_pay: totalToPay,
      payment_method: totalToPay === 0 ? 'none' : payMethod,
      payment_proof_url: payMethod === 'online' ? payProof : null,
      return_payment_collector_id: payMethod === 'cash' ? collectorId : null,
      released_by_user_id:
        inspection.deposit_kind === 'pledge' || inspection.deposit_kind === 'both'
          ? releasedByUserId
          : null,
      released_at:
        inspection.deposit_kind === 'pledge' || inspection.deposit_kind === 'both'
          ? new Date().toISOString()
          : null,
    });
  };

  const needsPledgeRelease =
    inspection.deposit_kind === 'pledge' || inspection.deposit_kind === 'both';

  return (
    <div className="space-y-4">
      {/* Return Readings */}
      <Card>
        <SectionTitle
          title="Return Readings"
          subtitle="Record vehicle condition at return"
          icon={<Gauge className="h-5 w-5" />}
        />
        <div className="mt-5 space-y-4">
          <FieldRow cols={2}>
            <Input
              label="Return Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            <Input
              label="Return Time"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </FieldRow>
          <FieldRow cols={2}>
            <Input
              label="Odometer at Return (km)"
              type="number"
              min={0}
              value={odometerReturn}
              onChange={(e) => setOdometerReturn(e.target.value)}
              prefix={<Gauge className="h-4 w-4" />}
              hint={`Issue odometer: ${inspection.odometer_out ?? '—'}`}
            />
            <Input
              label="Fuel Points at Return"
              type="number"
              min={0}
              value={fuelPointsReturn}
              onChange={(e) => setFuelPointsReturn(e.target.value)}
              prefix={<Fuel className="h-4 w-4" />}
              hint={`Issue fuel: ${inspection.fuel_points_out ?? '—'}`}
            />
          </FieldRow>
          <FileUpload
            label="Return Odometer Photo"
            url={odometerImage}
            onChange={setOdometerImage}
            required
            icon={<ImageIcon className="h-5 w-5" />}
          />
        </div>
      </Card>

      {/* Damage */}
      <Card>
        <SectionTitle
          title="Damage Assessment"
          subtitle="Record any damage charges"
          icon={<AlertTriangle className="h-5 w-5" />}
        />
        <div className="mt-5 space-y-4">
          <Input
            label="Damage Charge"
            type="number"
            min={0}
            value={damageCharge}
            onChange={(e) => setDamageCharge(e.target.value)}
          />
          {Number(damageCharge) > 0 && (
            <FileUpload
              label="Damage Photo"
              url={damageImage}
              onChange={setDamageImage}
              required
              icon={<ImageIcon className="h-5 w-5" />}
            />
          )}
        </div>
      </Card>

      {/* Return Recipient */}
      <Card>
        <SectionTitle
          title="Return Recipient"
          subtitle="Who received the vehicle"
          icon={<User className="h-5 w-5" />}
        />
        <div className="mt-5">
          <Select
            label="Received By"
            value={returnedBy}
            onChange={(e) => setReturnedBy(e.target.value)}
          >
            {store.members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.role})
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {/* Pledge Release */}
      {needsPledgeRelease && (
        <Card>
          <SectionTitle
            title="Pledge Release"
            subtitle="Select who is releasing the pledged vehicle"
            icon={<Shield className="h-5 w-5" />}
          />
          <div className="mt-5">
            <Select
              label="Released By"
              value={releasedByUserId}
              onChange={(e) => setReleasedByUserId(e.target.value)}
            >
              {store.members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.role})
                </option>
              ))}
            </Select>
          </div>
        </Card>
      )}

      {/* Invoice Summary */}
      <Card>
        <SectionTitle
          title="Return Invoice"
          subtitle="Calculated charges for this rental"
          icon={<Calculator className="h-5 w-5" />}
        />
        <div className="mt-5 space-y-1">
          <ChargeRow label="Base Rental (collected at issue)" amount={inspection.rental_amount} type="muted" />
          {hasMoneyDeposit(inspection) && (
            <ChargeRow label="Security Deposit (refundable)" amount={inspection.deposit_amount} type="muted" />
          )}
          <div className="border-t border-ink-100 pt-2" />
          <ChargeRow
            label={`Extra KM (${extraCharges.extra_kms} km × ${formatCurrency(vehicle?.extra_charge_per_km ?? 0)})`}
            amount={extraCharges.km_charge}
            type={extraCharges.km_charge > 0 ? 'negative' : 'muted'}
          />
          <ChargeRow
            label={`Fuel Shortfall (${extraCharges.fuel_shortfall} pts × ${formatCurrency(vehicle?.rate_per_fuel_point ?? 0)})`}
            amount={extraCharges.fuel_charge}
            type={extraCharges.fuel_charge > 0 ? 'negative' : 'muted'}
          />
          <ChargeRow
            label={`Overdue (${extraCharges.extra_hours} hrs × ${formatCurrency(vehicle?.charge_per_extra_hour ?? 0)})`}
            amount={extraCharges.overdue_charge}
            type={extraCharges.overdue_charge > 0 ? 'negative' : 'muted'}
          />
          <ChargeRow
            label="Damage Charge"
            amount={Number(damageCharge) || 0}
            type={Number(damageCharge) > 0 ? 'negative' : 'muted'}
          />
          <ChargeRow label="New Challan Memos" amount={memoCharge} type={memoCharge > 0 ? 'negative' : 'muted'} />
          <div className="border-t border-ink-200 pt-2" />
          <ChargeRow label="Calculated Total" amount={calculatedTotal} type="bold" />
          <ChargeRow label="Discount" amount={-(Number(discount) || 0)} type="positive" />
          <div className="border-t border-ink-200 pt-2" />
          <div className="flex items-center justify-between py-2">
            <span className="text-base font-bold text-ink-900">Total to Pay</span>
            <span className="text-xl font-bold text-brand-700">{formatCurrency(totalToPay)}</span>
          </div>
        </div>

        {totalToPay > 0 && (
          <div className="mt-4 space-y-4 rounded-xl bg-ink-50 p-4">
            <FieldRow cols={2}>
              <Select
                label="Payment Method"
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
              >
                <option value="cash">Cash</option>
                <option value="online">Online (UPI)</option>
              </Select>
              <Input
                label="Discount Amount"
                type="number"
                min={0}
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
              />
            </FieldRow>
            {payMethod === 'online' && (
              <FileUpload
                label="Payment Proof"
                url={payProof}
                onChange={setPayProof}
                required
              />
            )}
            {payMethod === 'cash' && (
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
          </div>
        )}
      </Card>

      {/* Action */}
      <div className="flex justify-end">
        <Button variant="success" icon={<Check className="h-4 w-4" />} onClick={handleComplete}>
          Complete Return
        </Button>
      </div>

      <ConfirmDialog
        open={showConfirm}
        title="Complete Return"
        message={
          <div className="space-y-2">
            <p>The invoice has been prepared. After final submission:</p>
            <ul className="ml-4 list-disc text-xs text-ink-500">
              <li>The rental will be locked (docstatus = 1)</li>
              <li>Pledge will be released (if applicable)</li>
              <li>No further edits will be possible</li>
            </ul>
            <p className="text-sm font-semibold text-ink-700">
              Total to pay: {formatCurrency(totalToPay)}
            </p>
          </div>
        }
        confirmLabel="Confirm & Lock"
        variant="success"
        onConfirm={confirmReturn}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}

function ReturnedView({ inspection, store }: { inspection: Inspection; store: RentalStore }) {
  const vehicle = store.getVehicle(inspection.car_id);
  const returnedBy = store.getMember(inspection.returned_by_member_id);
  const releasedBy = store.getMember(inspection.released_by_user_id);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-lg bg-success-50 px-4 py-3 text-sm text-success-700">
        <Lock className="h-4 w-4" />
        This rental has been completed and locked. All fields are read-only.
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <InfoGroup title="Return Readings" icon={<Gauge className="h-4 w-4" />}>
          <InfoRow label="Return Date" value={formatDate(inspection.returned_at)} />
          <InfoRow label="Return Time" value={formatTime(inspection.returned_at)} />
          <InfoRow label="Odometer" value={`${inspection.odometer_out} → ${inspection.odometer_return}`} />
          <InfoRow label="Fuel Points" value={`${inspection.fuel_points_out} → ${inspection.fuel_points_return}`} />
          <InfoRow label="Duration Used" value={formatDuration(inspection.actual_duration_minutes)} />
        </InfoGroup>
        <InfoGroup title="Return Charges" icon={<Calculator className="h-4 w-4" />}>
          <ChargeRow label="Extra KM Charge" amount={inspection.extra_charges.km_charge} />
          <ChargeRow label="Fuel Charge" amount={inspection.extra_charges.fuel_charge} />
          <ChargeRow label="Overdue Charge" amount={inspection.extra_charges.overdue_charge} />
          <ChargeRow label="Damage" amount={inspection.damage_charge} />
          <div className="border-t border-ink-200 pt-2" />
          <ChargeRow label="Total Paid" amount={inspection.total_to_pay} type="bold" />
        </InfoGroup>
      </div>

      <InfoGroup title="Return Details" icon={<User className="h-4 w-4" />}>
        <InfoRow label="Received By" value={returnedBy?.name || '—'} />
        <InfoRow label="Payment Method" value={getPaymentMethodLabel(inspection.payment_method)} />
        {releasedBy && <InfoRow label="Pledge Released By" value={releasedBy.name} />}
      </InfoGroup>
    </div>
  );
}
