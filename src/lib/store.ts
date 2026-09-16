import { useState, useCallback, useMemo } from 'react';
import type { Inspection, Vehicle, Customer, TeamMember, Challan } from '@/types/rental';
import {
  mockVehicles,
  mockCustomers,
  mockInspections,
  mockMembers,
  mockChallans,
} from '@/lib/mock-data';

export function useRentalStore() {
  const [inspections, setInspections] = useState<Inspection[]>(mockInspections);
  const [vehicles] = useState<Vehicle[]>(mockVehicles);
  const [customers, setCustomers] = useState<Customer[]>(mockCustomers);
  const [members] = useState<TeamMember[]>(mockMembers);
  const [challans, setChallans] = useState<Challan[]>(mockChallans);

  const getVehicle = useCallback(
    (id: string) => vehicles.find((v) => v.id === id) ?? null,
    [vehicles]
  );

  const getCustomer = useCallback(
    (id: string) => customers.find((c) => c.id === id) ?? null,
    [customers]
  );

  const getMember = useCallback(
    (id: string | null) => (id ? members.find((m) => m.id === id) ?? null : null),
    [members]
  );

  const getChallansFor = useCallback(
    (inspectionId: string) => challans.filter((c) => c.inspection_id === inspectionId),
    [challans]
  );

  const getInspection = useCallback(
    (id: string) => inspections.find((i) => i.id === id) ?? null,
    [inspections]
  );

  const createCustomer = useCallback(
    (data: { name: string; phone: string; email: string }) => {
      const customer: Customer = {
        id: `c${Date.now()}`,
        name: data.name,
        phone: data.phone,
        email: data.email,
        aadhar_number: null,
        dl_number: null,
        photo_url: null,
        dl_front_url: null,
        dl_back_url: null,
        aadhar_front_url: null,
        aadhar_back_url: null,
        pan_number: null,
        pan_front_url: null,
        pan_back_url: null,
      };
      setCustomers((prev) => [...prev, customer]);
      return customer;
    },
    []
  );

  const createInspection = useCallback(
    (data: Partial<Inspection>) => {
      const id = `i${Date.now()}`;
      const rental_no = `RNT-2026-${String(inspections.length + 1).padStart(3, '0')}`;
      const inspection: Inspection = {
        id,
        rental_no,
        car_id: data.car_id ?? '',
        customer_id: data.customer_id ?? '',
        lifecycle_status: 'DRAFT',
        status: 'Draft',
        docstatus: 0,
        rental_start_date: data.rental_start_date ?? null,
        rental_start_time: data.rental_start_time ?? null,
        rental_actual_start_time: null,
        rental_end_time: data.rental_end_time ?? null,
        duration_days: data.duration_days ?? 0,
        duration_hours: data.duration_hours ?? 0,
        planned_duration_minutes: data.planned_duration_minutes ?? 0,
        actual_duration_minutes: null,
        rental_amount: data.rental_amount ?? 0,
        deposit_amount: data.deposit_amount ?? 0,
        deposit_kind: data.deposit_kind ?? 'money',
        deposit_paid: false,
        deposit_payment_status: 'PENDING',
        deposit_payment_method: null,
        deposit_proof_url: null,
        issue_adjustment_amount: data.issue_adjustment_amount ?? 0,
        issue_payment_method: null,
        issue_payment_proof_url: null,
        issue_payment_collector_id: null,
        issued_at: null,
        issued_by_member_id: null,
        odometer_out: null,
        odometer_out_image_url: null,
        fuel_points_out: null,
        return_date: null,
        returned_at: null,
        rental_actual_end_time: null,
        odometer_return: null,
        odometer_return_image_url: null,
        fuel_points_return: null,
        damage_charge: 0,
        damage_image_url: null,
        returned_by_member_id: null,
        calculated_total: 0,
        discount_amount: 0,
        extra_charges: {
          km_charge: 0,
          fuel_charge: 0,
          overdue_charge: 0,
          extra_kms: 0,
          fuel_shortfall: 0,
          extra_hours: 0,
        },
        total_to_pay: 0,
        payment_method: null,
        payment_proof_url: null,
        return_payment_collector_id: null,
        pledge_status: 'N/A',
        pledge_registration: data.pledge_registration ?? null,
        pledge_make_model: data.pledge_make_model ?? null,
        pledge_colour: data.pledge_colour ?? null,
        pledge_notes: data.pledge_notes ?? null,
        pledge_photo_urls: data.pledge_photo_urls ?? null,
        pledge_rc_url: data.pledge_rc_url ?? null,
        pledge_renter_photo_url: data.pledge_renter_photo_url ?? null,
        pledge_released_by_member_id: null,
        pledge_released_at: null,
        released_by_user_id: null,
        released_at: null,
        challans_synced_at_issue: false,
        challans_synced_at_return: false,
        confession_video_url: null,
        agreement_pdf_url: null,
      };
      setInspections((prev) => [inspection, ...prev]);
      return inspection;
    },
    [inspections.length]
  );

  const updateInspection = useCallback((id: string, patch: Partial<Inspection>) => {
    setInspections((prev) =>
      prev.map((i) => (i.id === id ? { ...i, ...patch } : i))
    );
  }, []);

  const issueRental = useCallback(
    (id: string, issueData: Partial<Inspection>) => {
      setInspections((prev) =>
        prev.map((i) =>
          i.id === id
            ? {
                ...i,
                ...issueData,
                lifecycle_status: 'ISSUED',
                status: 'Before Pending',
                issued_at:
                  issueData.rental_actual_start_time || new Date().toISOString(),
                pledge_status:
                  i.deposit_kind === 'pledge' || i.deposit_kind === 'both'
                    ? 'HELD'
                    : 'N/A',
                challans_synced_at_issue: true,
              }
            : i
        )
      );
    },
    []
  );

  const completeReturn = useCallback(
    (id: string, returnData: Partial<Inspection>) => {
      setInspections((prev) =>
        prev.map((i) =>
          i.id === id
            ? {
                ...i,
                ...returnData,
                lifecycle_status: 'RETURNED',
                status: 'Completed',
                docstatus: 1,
                pledge_status:
                  i.deposit_kind === 'pledge' || i.deposit_kind === 'both'
                    ? 'RELEASED'
                    : 'N/A',
                challans_synced_at_return: true,
              }
            : i
        )
      );
    },
    []
  );

  const toggleChallanCleared = useCallback((challanId: string) => {
    setChallans((prev) =>
      prev.map((c) =>
        c.id === challanId
          ? {
              ...c,
              cleared: !c.cleared,
              cleared_at: !c.cleared ? new Date().toISOString() : null,
            }
          : c
      )
    );
  }, []);

  const syncReturnChallans = useCallback(
    (inspectionId: string) => {
      const insp = inspections.find((i) => i.id === inspectionId);
      if (!insp) return;
      const existingIssueChallans = challans.filter(
        (c) => c.inspection_id === inspectionId && c.capture_stage === 'at_issue'
      );
      const newReturnChallan: Challan = {
        id: `ch${Date.now()}`,
        vehicle_id: insp.car_id,
        inspection_id: inspectionId,
        challan_no: `ECH${Date.now()}`,
        challan_date_time: new Date().toISOString(),
        challan_status: 'Pending',
        fine_amount: 750,
        total_amount: 750,
        offence_details: 'Signal jumping (synced at return)',
        challan_place: 'Juhu Circle',
        capture_stage: 'at_return',
        captured_at: new Date().toISOString(),
        cleared: false,
        cleared_at: null,
      };
      setChallans((prev) => [...prev, newReturnChallan]);
    },
    [inspections, challans]
  );

  const stats = useMemo(() => {
    const draft = inspections.filter((i) => i.lifecycle_status === 'DRAFT').length;
    const issued = inspections.filter((i) => i.lifecycle_status === 'ISSUED').length;
    const returned = inspections.filter((i) => i.lifecycle_status === 'RETURNED').length;
    const revenue = inspections
      .filter((i) => i.lifecycle_status === 'RETURNED')
      .reduce((sum, i) => sum + (i.rental_amount + i.total_to_pay), 0);
    return { draft, issued, returned, revenue, total: inspections.length };
  }, [inspections]);

  return {
    inspections,
    vehicles,
    customers,
    members,
    challans,
    stats,
    getVehicle,
    getCustomer,
    getMember,
    getChallansFor,
    getInspection,
    createCustomer,
    createInspection,
    updateInspection,
    issueRental,
    completeReturn,
    toggleChallanCleared,
    syncReturnChallans,
  };
}

export type RentalStore = ReturnType<typeof useRentalStore>;
