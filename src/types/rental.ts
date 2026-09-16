// ─── Core Domain Types ──────────────────────────────────────────────

export type LifecycleStatus = 'DRAFT' | 'ISSUED' | 'RETURNED' | 'CANCELLED';
export type DepositKind = 'money' | 'pledge' | 'both';
export type PledgeStatus = 'N/A' | 'HELD' | 'RELEASED';
export type PaymentMethod = 'online' | 'cash' | 'none';
export type PaymentStatus = 'PAID' | 'PENDING' | 'WAIVED';
export type ChallanCaptureStage = 'at_issue' | 'at_return' | 'vehicle_level';
export type ChargeUnit = 'hour' | 'day' | 'week' | 'month';

// ─── Vehicle ────────────────────────────────────────────────────────

export interface VehicleChargeRow {
  id: string;
  unit: ChargeUnit;
  value: number;
  price: number;
  allowed_kms: number;
}

export interface Vehicle {
  id: string;
  registration_number: string;
  brand: string;
  model: string;
  deposit_amount: number;
  extra_charge_per_km: number;
  charge_per_extra_hour: number;
  rate_per_fuel_point: number;
  charge_rows: VehicleChargeRow[];
}

// ─── Customer ───────────────────────────────────────────────────────

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  aadhar_number: string | null;
  dl_number: string | null;
  photo_url: string | null;
  dl_front_url: string | null;
  dl_back_url: string | null;
  aadhar_front_url: string | null;
  aadhar_back_url: string | null;
  pan_number: string | null;
  pan_front_url: string | null;
  pan_back_url: string | null;
}

// ─── Challan ─────────────────────────────────────────────────────────

export interface Challan {
  id: string;
  vehicle_id: string;
  inspection_id: string | null;
  challan_no: string;
  challan_date_time: string;
  challan_status: string;
  fine_amount: number;
  total_amount: number;
  offence_details: string;
  challan_place: string;
  capture_stage: ChallanCaptureStage;
  captured_at: string;
  cleared: boolean;
  cleared_at: string | null;
}

// ─── Pledge ──────────────────────────────────────────────────────────

export interface PledgeData {
  registration: string;
  makeModel: string;
  colour: string;
  notes: string;
  photo_urls: string[];
  rc_url: string | null;
  renter_photo_url: string | null;
}

// ─── Extra Charges Breakdown ────────────────────────────────────────

export interface ExtraCharges {
  km_charge: number;
  fuel_charge: number;
  overdue_charge: number;
  extra_kms: number;
  fuel_shortfall: number;
  extra_hours: number;
}

// ─── Inspection / Rental ────────────────────────────────────────────

export interface Inspection {
  id: string;
  rental_no: string;
  car_id: string;
  customer_id: string;

  lifecycle_status: LifecycleStatus;
  status: string;
  docstatus: 0 | 1;

  rental_start_date: string | null;
  rental_start_time: string | null;
  rental_actual_start_time: string | null;
  rental_end_time: string | null;
  duration_days: number;
  duration_hours: number;
  planned_duration_minutes: number;
  actual_duration_minutes: number | null;

  rental_amount: number;
  deposit_amount: number;
  deposit_kind: DepositKind;
  deposit_paid: boolean;
  deposit_payment_status: PaymentStatus;
  deposit_payment_method: PaymentMethod | null;
  deposit_proof_url: string | null;

  issue_adjustment_amount: number;
  issue_payment_method: PaymentMethod | null;
  issue_payment_proof_url: string | null;
  issue_payment_collector_id: string | null;
  issued_at: string | null;
  issued_by_member_id: string | null;

  odometer_out: number | null;
  odometer_out_image_url: string | null;
  fuel_points_out: number | null;

  return_date: string | null;
  returned_at: string | null;
  rental_actual_end_time: string | null;
  odometer_return: number | null;
  odometer_return_image_url: string | null;
  fuel_points_return: number | null;
  damage_charge: number;
  damage_image_url: string | null;
  returned_by_member_id: string | null;

  calculated_total: number;
  discount_amount: number;
  extra_charges: ExtraCharges;
  total_to_pay: number;

  payment_method: PaymentMethod | null;
  payment_proof_url: string | null;
  return_payment_collector_id: string | null;

  pledge_status: PledgeStatus;
  pledge_registration: string | null;
  pledge_make_model: string | null;
  pledge_colour: string | null;
  pledge_notes: string | null;
  pledge_photo_urls: string[] | null;
  pledge_rc_url: string | null;
  pledge_renter_photo_url: string | null;
  pledge_released_by_member_id: string | null;
  pledge_released_at: string | null;
  released_by_user_id: string | null;
  released_at: string | null;

  challans_synced_at_issue: boolean;
  challans_synced_at_return: boolean;

  confession_video_url: string | null;
  agreement_pdf_url: string | null;
}

// ─── Team Member ─────────────────────────────────────────────────────

export interface TeamMember {
  id: string;
  name: string;
  role: 'owner' | 'manager' | 'staff';
}

// ─── Pricing Result ──────────────────────────────────────────────────

export interface PricingBreakdownItem {
  label: string;
  price: number;
  allowedKms: number;
  count: number;
}

export interface PricingResult {
  total: number;
  allowedKms: number;
  breakdown: PricingBreakdownItem[];
}

// ─── Derived Status ──────────────────────────────────────────────────

export interface DerivedStatus {
  label: string;
  color: 'gray' | 'blue' | 'green' | 'amber' | 'red';
  icon: string;
}

// ─── View State ──────────────────────────────────────────────────────

export type ViewMode = 'dashboard' | 'new-rental' | 'rental-detail';
