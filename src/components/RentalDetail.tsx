import { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Car,
  User,
  Phone,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText,
  RotateCcw,
  Gauge,
  CreditCard,
  ScrollText,
  BarChart3,
} from 'lucide-react';
import type { RentalStore } from '@/lib/store';
import type { Inspection, PartialInspection } from '@/types/rental';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs, type TabItem } from '@/components/ui/Tabs';
import { Toast } from '@/components/ui/Tabs';
import {
  getRentalDerivedStatus,
  formatCurrency,
  formatDateTime,
  hasMoneyDeposit,
} from '@/lib/rental-calculations';
import { IssueTab } from '@/components/tabs/IssueTab';
import { ReturnTab } from '@/components/tabs/ReturnTab';
import { PaymentTab } from '@/components/tabs/PaymentTab';
import { ChallanTab } from '@/components/tabs/ChallanTab';
import { ReportTab } from '@/components/tabs/ReportTab';

interface RentalDetailProps {
  inspection: Inspection;
  store: RentalStore;
  onBack: () => void;
  onIssue: (data: Partial<Inspection>) => void;
  onCompleteReturn: (data: Partial<Inspection>) => void;
  onSyncChallans: () => void;
  onToggleChallanCleared: (challanId: string) => void;
}

type TabKey = 'issue' | 'return' | 'payment' | 'challan' | 'report';

export function RentalDetail({
  inspection,
  store,
  onBack,
  onIssue,
  onCompleteReturn,
  onSyncChallans,
  onToggleChallanCleared,
}: RentalDetailProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('issue');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const vehicle = store.getVehicle(inspection.car_id);
  const customer = store.getCustomer(inspection.customer_id);
  const status = getRentalDerivedStatus(inspection);
  const challans = useMemo(
    () => store.getChallansFor(inspection.id),
    [store, inspection.id]
  );
  const unclearedCount = challans.filter(
    (c) => c.capture_stage === 'at_return' && !c.cleared
  ).length;

  const isDraft = inspection.lifecycle_status === 'DRAFT';
  const isIssued = inspection.lifecycle_status === 'ISSUED';
  const isReturned = inspection.lifecycle_status === 'RETURNED';

  const tabs: TabItem[] = useMemo(() => {
    const list: TabItem[] = [
      {
        key: 'issue',
        label: 'On Issue',
        icon: <FileText className="h-4 w-4" />,
      },
    ];

    if (!isDraft) {
      list.push({
        key: 'return',
        label: 'On Return',
        icon: <RotateCcw className="h-4 w-4" />,
      });
    }

    if (inspection.issue_payment_method || isReturned) {
      list.push({
        key: 'payment',
        label: 'Payment',
        icon: <CreditCard className="h-4 w-4" />,
      });
    }

    if (!isDraft) {
      list.push({
        key: 'challan',
        label: 'Challan',
        icon: <ScrollText className="h-4 w-4" />,
        badge: unclearedCount,
      });
    }

    if (isReturned) {
      list.push({
        key: 'report',
        label: 'Report',
        icon: <BarChart3 className="h-4 w-4" />,
      });
    }

    return list;
  }, [isDraft, isReturned, inspection.issue_payment_method, unclearedCount]);

  const handleIssue = (data: Partial<Inspection>) => {
    onIssue(data);
    setToast({ message: 'Rental issued successfully! Vehicle is now on rent.', type: 'success' });
  };

  const handleReturn = (data: Partial<Inspection>) => {
    onCompleteReturn(data);
    setToast({ message: 'Return completed! Rental has been locked.', type: 'success' });
    setActiveTab('report');
  };

  const handleSync = () => {
    onSyncChallans();
    setToast({ message: 'Challans synced from eChallan provider.', type: 'info' });
  };

  const handleToggleCleared = (id: string) => {
    onToggleChallanCleared(id);
  };

  const statusColorMap = {
    gray: 'gray',
    blue: 'blue',
    green: 'green',
    amber: 'amber',
    red: 'red',
  } as const;

  return (
    <div className="space-y-5">
      {/* Back button */}
      <div>
        <Button variant="ghost" size="sm" icon={<ArrowLeft className="h-4 w-4" />} onClick={onBack}>
          Back to Dashboard
        </Button>
      </div>

      {/* Header Card */}
      <Card padding="lg" className="bg-gradient-to-br from-white to-ink-50">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/20">
              <Car className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-ink-900">{inspection.rental_no}</h1>
                <Badge color={statusColorMap[status.color]} dot>
                  {status.label}
                </Badge>
                {inspection.docstatus === 1 && (
                  <Badge color="gray">
                    <CheckCircle className="mr-1 h-3 w-3" /> Locked
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-ink-500">
                {vehicle?.brand} {vehicle?.model} - {vehicle?.registration_number}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-ink-600">
                <span className="flex items-center gap-1.5">
                  <User className="h-4 w-4 text-ink-400" />
                  {customer?.name}
                </span>
                <span className="flex items-center gap-1.5">
                  <Phone className="h-4 w-4 text-ink-400" />
                  {customer?.phone}
                </span>
                {inspection.issued_at && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-ink-400" />
                    {formatDateTime(inspection.issued_at)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="rounded-xl bg-white px-4 py-3 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Base Rental</p>
              <p className="mt-1 text-lg font-bold text-ink-900">{formatCurrency(inspection.rental_amount)}</p>
            </div>
            {hasMoneyDeposit(inspection) && (
              <div className="rounded-xl bg-white px-4 py-3 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Deposit</p>
                <p className="mt-1 text-lg font-bold text-ink-900">{formatCurrency(inspection.deposit_amount)}</p>
              </div>
            )}
            {isReturned && (
              <div className="rounded-xl bg-white px-4 py-3 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Total Paid</p>
                <p className="mt-1 text-lg font-bold text-success-600">{formatCurrency(inspection.total_to_pay)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Status indicators */}
        <div className="mt-4 flex flex-wrap gap-2 border-t border-ink-100 pt-4">
          {isDraft && (
            <Badge color="gray" dot>
              Draft - Not yet issued
            </Badge>
          )}
          {isIssued && (
            <Badge color="blue" dot>
              On Rent
            </Badge>
          )}
          {isReturned && (
            <Badge color="green" dot>
              Completed
            </Badge>
          )}
          {hasMoneyDeposit(inspection) && inspection.deposit_payment_status === 'PAID' && (
            <Badge color="green">Deposit Paid</Badge>
          )}
          {hasMoneyDeposit(inspection) && inspection.deposit_payment_status === 'PENDING' && (
            <Badge color="amber" dot>
              Deposit Pending
            </Badge>
          )}
          {hasMoneyDeposit(inspection) && inspection.deposit_payment_status === 'WAIVED' && (
            <Badge color="gray">Deposit Waived</Badge>
          )}
          {unclearedCount > 0 && (
            <Badge color="red" dot>
              <AlertTriangle className="mr-1 h-3 w-3" />
              {unclearedCount} uncleared challan{unclearedCount > 1 ? 's' : ''}
            </Badge>
          )}
          {(inspection.deposit_kind === 'pledge' || inspection.deposit_kind === 'both') && (
            <Badge color={inspection.pledge_status === 'RELEASED' ? 'green' : inspection.pledge_status === 'HELD' ? 'amber' : 'gray'}>
              Pledge: {inspection.pledge_status}
            </Badge>
          )}
        </div>
      </Card>

      {/* Tabs */}
      <Card padding="none">
        <div className="px-2 pt-2">
          <Tabs tabs={tabs} active={activeTab} onChange={(k) => setActiveTab(k as TabKey)} />
        </div>
        <div className="p-6">
          {activeTab === 'issue' && (
            <IssueTab inspection={inspection} store={store} onIssue={handleIssue} />
          )}
          {activeTab === 'return' && (
            <ReturnTab
              inspection={inspection}
              store={store}
              onCompleteReturn={handleReturn}
            />
          )}
          {activeTab === 'payment' && <PaymentTab inspection={inspection} store={store} />}
          {activeTab === 'challan' && (
            <ChallanTab
              inspection={inspection}
              store={store}
              onSyncChallans={handleSync}
              onToggleCleared={handleToggleCleared}
            />
          )}
          {activeTab === 'report' && <ReportTab inspection={inspection} store={store} />}
        </div>
      </Card>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
