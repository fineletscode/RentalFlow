import { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Car,
  User,
  Calendar,
  IndianRupee,
  Shield,
  Check,
  Package,
  QrCode,
  Upload,
  Image as ImageIcon,
  FileText,
} from 'lucide-react';
import type { RentalStore } from '@/lib/store';
import type { Vehicle, DepositKind, PricingResult, PaymentMethod } from '@/types/rental';
import { Card, SectionTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, FieldRow } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { ChargeRow } from '@/components/ui/InfoRow';
import { FileUpload } from '@/components/ui/FileUpload';
import {
  calculateCharge,
  calculatePlannedMinutes,
  calculateExpectedEnd,
  joinDateTime,
  formatCurrency,
  formatDate,
  formatTime,
  getDepositKindLabel,
} from '@/lib/rental-calculations';

interface NewRentalProps {
  store: RentalStore;
  onBack: () => void;
  onCreated: (id: string) => void;
}

export function NewRentalForm({ store, onBack, onCreated }: NewRentalProps) {
  const [step, setStep] = useState(1);
  const [carId, setCarId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [days, setDays] = useState(1);
  const [hours, setHours] = useState(0);
  const [depositKind, setDepositKind] = useState<DepositKind>('money');
  const [customDeposit, setCustomDeposit] = useState(0);
  const [issueAdjustment, setIssueAdjustment] = useState(0);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash');
  const [payProof, setPayProof] = useState('');
  const [collectorId, setCollectorId] = useState(store.members[0]?.id || '');
  const [pledgeRegistration, setPledgeRegistration] = useState('');
  const [pledgeMakeModel, setPledgeMakeModel] = useState('');
  const [pledgeColour, setPledgeColour] = useState('');
  const [pledgeNotes, setPledgeNotes] = useState('');
  const [pledgePhotos, setPledgePhotos] = useState<string[]>([]);
  const [pledgeRc, setPledgeRc] = useState('');
  const [pledgeRenterPhoto, setPledgeRenterPhoto] = useState('');
  const [error, setError] = useState('');

  const selectedVehicle = useMemo(
    () => store.vehicles.find((v) => v.id === carId) ?? null,
    [store.vehicles, carId]
  );

  const plannedMinutes = useMemo(
    () => calculatePlannedMinutes(days, hours),
    [days, hours]
  );

  const pricing = useMemo<PricingResult | null>(() => {
    if (!selectedVehicle || plannedMinutes <= 0) return null;
    return calculateCharge(plannedMinutes, selectedVehicle.charge_rows);
  }, [selectedVehicle, plannedMinutes]);

  const expectedEnd = useMemo(() => {
    if (!startDate || !startTime) return null;
    const startIso = joinDateTime(startDate, startTime);
    return calculateExpectedEnd(startIso, plannedMinutes);
  }, [startDate, startTime, plannedMinutes]);

  const effectiveDeposit = useMemo(() => {
    if (depositKind === 'pledge') return 0;
    if (depositKind === 'both') return customDeposit;
    return selectedVehicle?.deposit_amount ?? 0;
  }, [depositKind, customDeposit, selectedVehicle]);

  const amountToCollect = useMemo(() => {
    if (!pricing) return 0;
    return Math.max(0, pricing.total + effectiveDeposit - issueAdjustment);
  }, [pricing, effectiveDeposit, issueAdjustment]);

  const hasPledge = depositKind === 'pledge' || depositKind === 'both';
  const hasMoney = depositKind === 'money' || depositKind === 'both';

  // Dynamic step list
  const steps = useMemo(() => {
    const base = [
      { n: 1, label: 'Vehicle' },
      { n: 2, label: 'Customer' },
      { n: 3, label: 'Pricing' },
      { n: 4, label: 'Payment' },
    ];
    if (hasPledge) base.push({ n: 5, label: 'Pledge' });
    base.push({ n: hasPledge ? 6 : 5, label: 'Review' });
    return base;
  }, [hasPledge]);

  const maxStep = steps.length;

  const validatePledge = (): string | null => {
    if (!hasPledge) return null;
    if (!pledgeRegistration.trim()) return 'Pledge vehicle registration is required';
    if (!pledgeMakeModel.trim()) return 'Pledge vehicle make/model is required';
    if (pledgePhotos.length === 0) return 'At least one pledge vehicle photo is required';
    if (!pledgeRc) return 'Pledge RC document is required';
    if (!pledgeRenterPhoto) return 'Pledge renter-with-vehicle photo is required';
    return null;
  };

  const validatePayment = (): string | null => {
    if (payMethod === 'online' && !payProof) return 'Payment screenshot is required for online payment';
    if (payMethod === 'cash' && !collectorId) return 'Please select a team member collecting the cash';
    return null;
  };

  const handleCreate = () => {
    if (!selectedVehicle || !pricing) return;
    if (!customerPhone.match(/^\d{10}$/)) {
      setError('Phone number must be 10 digits');
      return;
    }
    const customer = store.createCustomer({
      name: customerName,
      phone: customerPhone,
      email: customerEmail,
    });
    const inspection = store.createInspection({
      car_id: carId,
      customer_id: customer.id,
      rental_start_date: startDate,
      rental_start_time: startTime,
      rental_end_time: expectedEnd,
      duration_days: days,
      duration_hours: hours,
      planned_duration_minutes: plannedMinutes,
      rental_amount: pricing.total,
      deposit_amount: effectiveDeposit,
      deposit_kind: depositKind,
      deposit_paid: true,
      deposit_payment_status: 'PAID',
      deposit_payment_method: payMethod,
      deposit_proof_url: payMethod === 'online' ? payProof : null,
      issue_payment_method: payMethod,
      issue_payment_proof_url: payMethod === 'online' ? payProof : null,
      issue_payment_collector_id: payMethod === 'cash' ? collectorId : null,
      issue_adjustment_amount: issueAdjustment,
      pledge_registration: hasPledge ? pledgeRegistration : null,
      pledge_make_model: hasPledge ? pledgeMakeModel : null,
      pledge_colour: hasPledge ? pledgeColour : null,
      pledge_notes: hasPledge ? pledgeNotes : null,
      pledge_photo_urls: hasPledge ? pledgePhotos : null,
      pledge_rc_url: hasPledge ? pledgeRc : null,
      pledge_renter_photo_url: hasPledge ? pledgeRenterPhoto : null,
    });
    onCreated(inspection.id);
  };

  const canProceedStep = (s: number): boolean => {
    if (s === 1) return !!carId;
    if (s === 2) return !!customerName && !!customerPhone;
    if (s === 3) return !!startDate && !!pricing;
    if (s === 4) {
      if (payMethod === 'online') return !!payProof;
      if (payMethod === 'cash') return !!collectorId;
      return false;
    }
    if (s === 5 && hasPledge) {
      return !!pledgeRegistration && !!pledgeMakeModel && pledgePhotos.length > 0 && !!pledgeRc && !!pledgeRenterPhoto;
    }
    return true;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" icon={<ArrowLeft className="h-4 w-4" />} onClick={onBack}>
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-ink-900">New Rental</h1>
          <p className="mt-1 text-sm text-ink-500">Create a new rental agreement</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {steps.map((s, idx) => (
          <div key={s.n} className="flex flex-1 items-center min-w-fit">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-all ${
                step >= s.n
                  ? 'bg-brand-600 text-white'
                  : 'bg-ink-100 text-ink-400'
              }`}
            >
              {step > s.n ? <Check className="h-4 w-4" /> : s.n}
            </div>
            <span
              className={`ml-2 whitespace-nowrap text-sm font-medium ${
                step >= s.n ? 'text-ink-800' : 'text-ink-400'
              }`}
            >
              {s.label}
            </span>
            {idx < steps.length - 1 && (
              <div className={`mx-3 h-0.5 flex-1 ${step > s.n ? 'bg-brand-600' : 'bg-ink-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Vehicle */}
      {step === 1 && (
        <Card className="animate-fade-in">
          <SectionTitle
            title="Select Vehicle"
            subtitle="Choose an available vehicle for this rental"
            icon={<Car className="h-5 w-5" />}
          />
          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {store.vehicles.map((v) => (
              <VehicleSelectCard
                key={v.id}
                vehicle={v}
                selected={carId === v.id}
                onSelect={() => setCarId(v.id)}
              />
            ))}
          </div>
          <div className="mt-6 flex justify-end">
            <Button disabled={!carId} onClick={() => setStep(2)}>Continue</Button>
          </div>
        </Card>
      )}

      {/* Step 2: Customer */}
      {step === 2 && (
        <Card className="animate-fade-in">
          <SectionTitle
            title="Customer Details"
            subtitle="Enter the renter's information"
            icon={<User className="h-5 w-5" />}
          />
          <div className="mt-5 space-y-4">
            <FieldRow cols={2}>
              <Input label="Full Name" placeholder="John Doe" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              <Input label="Phone Number" placeholder="9876543210" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} maxLength={10} />
            </FieldRow>
            <Input label="Email (Optional)" placeholder="john@email.com" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
          </div>
          <div className="mt-6 flex justify-between">
            <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
            <Button disabled={!customerName || !customerPhone} onClick={() => setStep(3)}>Continue</Button>
          </div>
        </Card>
      )}

      {/* Step 3: Pricing & Deposit */}
      {step === 3 && selectedVehicle && (
        <div className="space-y-4 animate-fade-in">
          <Card>
            <SectionTitle title="Rental Period" subtitle="Set the rental dates and duration" icon={<Calendar className="h-5 w-5" />} />
            <div className="mt-5 space-y-4">
              <FieldRow cols={2}>
                <Input label="Start Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                <Input label="Start Time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </FieldRow>
              <FieldRow cols={2}>
                <Input label="Duration (Days)" type="number" min={0} value={days} onChange={(e) => setDays(Number(e.target.value))} />
                <Input label="Duration (Hours)" type="number" min={0} max={23} value={hours} onChange={(e) => setHours(Number(e.target.value))} />
              </FieldRow>
              {expectedEnd && (
                <div className="flex items-center gap-2 rounded-lg bg-brand-50 px-4 py-3">
                  <Calendar className="h-4 w-4 text-brand-600" />
                  <span className="text-sm text-brand-700">
                    Expected return: <strong>{formatDate(expectedEnd)}</strong> at <strong>{formatTime(expectedEnd)}</strong>
                  </span>
                </div>
              )}
            </div>
          </Card>

          {pricing && (
            <Card>
              <SectionTitle title="Pricing Breakdown" subtitle={`Base rental for ${days}d ${hours}h`} icon={<IndianRupee className="h-5 w-5" />} />
              <div className="mt-5 space-y-2">
                {pricing.breakdown.map((item, idx) => (
                  <ChargeRow key={idx} label={`${item.label} x ${item.count}`} amount={item.price} />
                ))}
                <div className="border-t border-ink-200 pt-2">
                  <ChargeRow label="Base Rental" amount={pricing.total} type="bold" />
                </div>
                <ChargeRow label="Allowed Kilometres" amount={pricing.allowedKms} type="muted" />
              </div>
            </Card>
          )}

          <Card>
            <SectionTitle title="Deposit Type" subtitle="Choose the security deposit method" icon={<Shield className="h-5 w-5" />} />
            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {([
                  { key: 'money', label: 'Money Deposit', desc: 'Cash or online deposit', icon: IndianRupee },
                  { key: 'pledge', label: 'Vehicle Pledge', desc: 'Customer vehicle as security', icon: Car },
                  { key: 'both', label: 'Money + Pledge', desc: 'Partial cash + vehicle pledge', icon: Shield },
                ] as const).map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setDepositKind(opt.key)}
                    className={`rounded-xl border-2 p-4 text-left transition-all ${
                      depositKind === opt.key
                        ? 'border-brand-600 bg-brand-50 shadow-sm'
                        : 'border-ink-200 bg-white hover:border-brand-300 hover:bg-ink-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <opt.icon className={`h-5 w-5 ${depositKind === opt.key ? 'text-brand-600' : 'text-ink-400'}`} />
                      {depositKind === opt.key && (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                    <p className="mt-2 text-sm font-semibold text-ink-900">{opt.label}</p>
                    <p className="text-xs text-ink-500">{opt.desc}</p>
                  </button>
                ))}
              </div>

              {depositKind === 'both' && (
                <Input
                  label="Deposit Amount to Collect"
                  type="number"
                  min={0}
                  value={customDeposit}
                  onChange={(e) => setCustomDeposit(Number(e.target.value))}
                  prefix={<IndianRupee className="h-4 w-4" />}
                  hint={`Vehicle deposit is ${formatCurrency(selectedVehicle.deposit_amount)}. Enter the amount you want to collect now.`}
                />
              )}

              <Input
                label="Issue Adjustment (Discount)"
                type="number"
                min={0}
                value={issueAdjustment}
                onChange={(e) => setIssueAdjustment(Number(e.target.value))}
                prefix={<IndianRupee className="h-4 w-4" />}
                hint="Amount to adjust from the issue total"
              />

              <div className="rounded-xl bg-brand-50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-brand-700">Amount to Collect</span>
                  <span className="text-xl font-bold text-brand-700">{formatCurrency(amountToCollect)}</span>
                </div>
                <p className="mt-1 text-xs text-brand-600">
                  Base {formatCurrency(pricing?.total ?? 0)}
                  {hasMoney && ` + Deposit ${formatCurrency(effectiveDeposit)}`}
                  {issueAdjustment > 0 && ` - Adjustment ${formatCurrency(issueAdjustment)}`}
                </p>
              </div>
            </div>
          </Card>

          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
            <Button disabled={!startDate || !pricing} onClick={() => setStep(4)}>Continue to Payment</Button>
          </div>
        </div>
      )}

      {/* Step 4: Payment */}
      {step === 4 && (
        <Card className="animate-fade-in">
          <SectionTitle
            title="Collect Payment"
            subtitle={`Amount to collect: ${formatCurrency(amountToCollect)}`}
            icon={<IndianRupee className="h-5 w-5" />}
          />
          <div className="mt-5 space-y-5">
            {/* Payment method toggle */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPayMethod('online')}
                className={`flex items-center gap-3 rounded-xl border-2 p-4 transition-all ${
                  payMethod === 'online' ? 'border-brand-600 bg-brand-50' : 'border-ink-200 hover:border-brand-300'
                }`}
              >
                <QrCode className={`h-6 w-6 ${payMethod === 'online' ? 'text-brand-600' : 'text-ink-400'}`} />
                <div className="text-left">
                  <p className="text-sm font-semibold text-ink-900">Online (QR)</p>
                  <p className="text-xs text-ink-500">UPI payment</p>
                </div>
              </button>
              <button
                onClick={() => setPayMethod('cash')}
                className={`flex items-center gap-3 rounded-xl border-2 p-4 transition-all ${
                  payMethod === 'cash' ? 'border-brand-600 bg-brand-50' : 'border-ink-200 hover:border-brand-300'
                }`}
              >
                <IndianRupee className={`h-6 w-6 ${payMethod === 'cash' ? 'text-brand-600' : 'text-ink-400'}`} />
                <div className="text-left">
                  <p className="text-sm font-semibold text-ink-900">Cash</p>
                  <p className="text-xs text-ink-500">Collect in person</p>
                </div>
              </button>
            </div>

            {/* QR Payment */}
            {payMethod === 'online' && (
              <div className="space-y-4">
                <div className="flex flex-col items-center rounded-xl bg-ink-50 p-6">
                  <QrPlaceholder amount={amountToCollect} />
                  <p className="mt-3 text-sm font-medium text-ink-700">Scan to pay {formatCurrency(amountToCollect)}</p>
                  <p className="text-xs text-ink-400">UPI QR Code - demo placeholder</p>
                </div>
                <FileUpload
                  label="Payment Screenshot"
                  url={payProof}
                  onChange={setPayProof}
                  required
                  hint="Upload screenshot after payment is done"
                  icon={<ImageIcon className="h-5 w-5" />}
                />
              </div>
            )}

            {/* Cash Payment */}
            {payMethod === 'cash' && (
              <div className="space-y-4">
                <div className="rounded-xl bg-brand-50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-brand-700">Amount to Collect</span>
                    <span className="text-xl font-bold text-brand-700">{formatCurrency(amountToCollect)}</span>
                  </div>
                </div>
                <Select
                  label="Collected By"
                  value={collectorId}
                  onChange={(e) => setCollectorId(e.target.value)}
                >
                  {store.members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.role})
                    </option>
                  ))}
                </Select>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-between">
            <Button variant="ghost" onClick={() => setStep(3)}>Back</Button>
            <Button
              disabled={!canProceedStep(4)}
              onClick={() => {
                const err = validatePayment();
                if (err) { setError(err); return; }
                setError('');
                setStep(hasPledge ? 5 : 6);
              }}
            >
              {hasPledge ? 'Continue to Pledge' : 'Continue to Review'}
            </Button>
          </div>
        </Card>
      )}

      {/* Step 5: Pledge (only if pledge or both) */}
      {step === 5 && hasPledge && (
        <Card className="animate-fade-in">
          <SectionTitle
            title="Pledge Vehicle Details"
            subtitle="Collect the pledged vehicle information and documents"
            icon={<Shield className="h-5 w-5" />}
          />
          <div className="mt-5 space-y-4">
            <FieldRow cols={2}>
              <Input
                label="Pledge Vehicle Registration"
                placeholder="MH 05 GH 7777"
                value={pledgeRegistration}
                onChange={(e) => setPledgeRegistration(e.target.value)}
              />
              <Input
                label="Make & Model"
                placeholder="Honda City"
                value={pledgeMakeModel}
                onChange={(e) => setPledgeMakeModel(e.target.value)}
              />
            </FieldRow>
            <FieldRow cols={2}>
              <Input
                label="Colour"
                placeholder="White"
                value={pledgeColour}
                onChange={(e) => setPledgeColour(e.target.value)}
              />
              <Input
                label="Notes"
                placeholder="Any additional notes"
                value={pledgeNotes}
                onChange={(e) => setPledgeNotes(e.target.value)}
              />
            </FieldRow>

            <div>
              <label className="label-text">Pledge Vehicle Photos <span className="text-danger-500">*</span></label>
              <div className="flex flex-wrap gap-3">
                {pledgePhotos.map((url, idx) => (
                  <div key={idx} className="relative">
                    <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-success-100 text-success-600">
                      <ImageIcon className="h-6 w-6" />
                    </div>
                    <button
                      onClick={() => setPledgePhotos(pledgePhotos.filter((_, i) => i !== idx))}
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-danger-500 text-white text-xs"
                    >
                      x
                    </button>
                  </div>
                ))}
                <FileUploadButton onUpload={(url) => setPledgePhotos([...pledgePhotos, url])} />
              </div>
            </div>

            <FieldRow cols={2}>
              <FileUpload
                label="RC Document"
                url={pledgeRc}
                onChange={setPledgeRc}
                required
                hint="RC book upload"
                icon={<FileText className="h-5 w-5" />}
              />
              <FileUpload
                label="Renter with Vehicle Photo"
                url={pledgeRenterPhoto}
                onChange={setPledgeRenterPhoto}
                required
                hint="Photo of renter with pledge vehicle"
                icon={<ImageIcon className="h-5 w-5" />}
              />
            </FieldRow>
          </div>

          <div className="mt-6 flex justify-between">
            <Button variant="ghost" onClick={() => setStep(4)}>Back</Button>
            <Button
              disabled={!canProceedStep(5)}
              onClick={() => {
                const err = validatePledge();
                if (err) { setError(err); return; }
                setError('');
                setStep(6);
              }}
            >
              Continue to Review
            </Button>
          </div>
        </Card>
      )}

      {/* Final Step: Review */}
      {step === (hasPledge ? 6 : 5) && selectedVehicle && pricing && (
        <Card className="animate-fade-in">
          <SectionTitle
            title="Review & Create"
            subtitle="Confirm all details before creating the rental"
            icon={<Check className="h-5 w-5" />}
          />
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-3 rounded-xl bg-ink-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Vehicle</p>
              <p className="text-sm font-bold text-ink-900">{selectedVehicle.brand} {selectedVehicle.model}</p>
              <p className="text-sm text-ink-600">{selectedVehicle.registration_number}</p>
              <Badge color="brand">{getDepositKindLabel(depositKind)}</Badge>
            </div>
            <div className="space-y-3 rounded-xl bg-ink-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Customer</p>
              <p className="text-sm font-bold text-ink-900">{customerName}</p>
              <p className="text-sm text-ink-600">{customerPhone}</p>
              {customerEmail && <p className="text-sm text-ink-500">{customerEmail}</p>}
            </div>
            <div className="space-y-3 rounded-xl bg-ink-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Period</p>
              <p className="text-sm font-bold text-ink-900">
                {formatDate(joinDateTime(startDate, startTime))} at {formatTime(joinDateTime(startDate, startTime))}
              </p>
              <p className="text-sm text-ink-600">{days} days, {hours} hours</p>
              {expectedEnd && (
                <p className="text-sm text-ink-500">Return by: {formatDate(expectedEnd)} at {formatTime(expectedEnd)}</p>
              )}
            </div>
            <div className="space-y-3 rounded-xl bg-ink-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Pricing & Payment</p>
              <div className="space-y-1">
                <ChargeRow label="Base Rental" amount={pricing.total} type="bold" />
                {hasMoney && <ChargeRow label="Deposit" amount={effectiveDeposit} type="muted" />}
                {issueAdjustment > 0 && <ChargeRow label="Adjustment" amount={-issueAdjustment} type="negative" />}
                <div className="border-t border-ink-200 pt-1">
                  <ChargeRow label="Total Collected" amount={amountToCollect} type="bold" />
                </div>
                <p className="pt-1 text-xs text-ink-500">
                  Method: {payMethod === 'online' ? 'Online (UPI)' : 'Cash'}
                  {payMethod === 'cash' && ` - ${store.members.find(m => m.id === collectorId)?.name ?? ''}`}
                </p>
              </div>
            </div>
            {hasPledge && (
              <div className="space-y-3 rounded-xl bg-ink-50 p-4 md:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Pledge Vehicle</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p><span className="text-ink-500">Registration:</span> <span className="font-medium text-ink-800">{pledgeRegistration}</span></p>
                  <p><span className="text-ink-500">Make & Model:</span> <span className="font-medium text-ink-800">{pledgeMakeModel}</span></p>
                  <p><span className="text-ink-500">Colour:</span> <span className="font-medium text-ink-800">{pledgeColour || '—'}</span></p>
                  <p><span className="text-ink-500">Photos:</span> <span className="font-medium text-ink-800">{pledgePhotos.length} uploaded</span></p>
                  <p><span className="text-ink-500">RC:</span> <span className="font-medium text-success-600">{pledgeRc ? 'Uploaded' : 'Missing'}</span></p>
                  <p><span className="text-ink-500">Renter Photo:</span> <span className="font-medium text-success-600">{pledgeRenterPhoto ? 'Uploaded' : 'Missing'}</span></p>
                </div>
              </div>
            )}
          </div>

          {error && <p className="mt-4 text-sm text-danger-600">{error}</p>}

          <div className="mt-6 flex justify-between">
            <Button variant="ghost" onClick={() => setStep(hasPledge ? 5 : 4)}>Back</Button>
            <Button variant="success" icon={<Check className="h-4 w-4" />} onClick={handleCreate}>
              Create Rental
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── QR Placeholder ─────────────────────────────────────────────────

function QrPlaceholder({ amount }: { amount: number }) {
  // Simple visual QR placeholder using a grid pattern
  const cells = Array.from({ length: 144 }, (_, i) => {
    const row = Math.floor(i / 12);
    const col = i % 12;
    // Corner squares
    const isCorner = (row < 3 && col < 3) || (row < 3 && col > 8) || (row > 8 && col < 3);
    // Pseudo-random pattern based on index
    const hash = (i * 37 + amount * 13) % 7;
    const filled = isCorner || hash < 3;
    return filled;
  });

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm border border-ink-200">
      <div className="grid grid-cols-12 gap-0.5">
        {cells.map((filled, i) => (
          <div
            key={i}
            className={`h-4 w-4 rounded-sm ${filled ? 'bg-ink-900' : 'bg-white'}`}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Small upload button for pledge photos ─────────────────────────

function FileUploadButton({ onUpload }: { onUpload: (url: string) => void }) {
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(`mock://${file.name}`);
  };
  return (
    <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-ink-300 bg-ink-50 transition-all hover:border-brand-400 hover:bg-brand-50">
      <Upload className="h-5 w-5 text-ink-400" />
      <input type="file" className="hidden" onChange={handleFile} accept="image/*" />
    </label>
  );
}

// ─── Vehicle Select Card ────────────────────────────────────────────

function VehicleSelectCard({ vehicle, selected, onSelect }: { vehicle: Vehicle; selected: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className={`rounded-xl border-2 p-4 text-left transition-all ${
        selected ? 'border-brand-600 bg-brand-50 shadow-md' : 'border-ink-200 bg-white hover:border-brand-300 hover:bg-ink-50'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${selected ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-500'}`}>
            <Car className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-ink-900">{vehicle.brand} {vehicle.model}</p>
            <p className="text-xs text-ink-500">{vehicle.registration_number}</p>
          </div>
        </div>
        {selected && (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white">
            <Check className="h-3 w-3" />
          </div>
        )}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Badge color="gray"><Package className="mr-1 h-3 w-3" /> {vehicle.charge_rows.length} plans</Badge>
        <Badge color="amber">{formatCurrency(vehicle.deposit_amount)} deposit</Badge>
      </div>
    </button>
  );
}
