import { useMemo } from 'react';
import {
  ScrollText,
  CheckCircle,
  AlertTriangle,
  MapPin,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import type { RentalStore } from '@/lib/store';
import type { Inspection, Challan } from '@/types/rental';
import { Card, SectionTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { InfoGroup, InfoRow } from '@/components/ui/InfoRow';
import {
  formatCurrency,
  formatDateTime,
  newChallansOf,
  totalOf,
  outstandingChallanValue,
} from '@/lib/rental-calculations';

interface ChallanTabProps {
  inspection: Inspection;
  store: RentalStore;
  onSyncChallans: () => void;
  onToggleCleared: (challanId: string) => void;
}

export function ChallanTab({ inspection, store, onSyncChallans, onToggleCleared }: ChallanTabProps) {
  const allChallans = useMemo(
    () => store.getChallansFor(inspection.id),
    [store, inspection.id]
  );

  const issueChallans = allChallans.filter((c) => c.capture_stage === 'at_issue');
  const returnChallans = allChallans.filter((c) => c.capture_stage === 'at_return');
  const newChallans = newChallansOf(allChallans);
  const outstanding = outstandingChallanValue(allChallans);

  const isIssued = inspection.lifecycle_status === 'ISSUED' || inspection.lifecycle_status === 'RETURNED';

  if (!isIssued) {
    return (
      <Card>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <ScrollText className="h-10 w-10 text-ink-300" />
          <h3 className="mt-4 text-base font-semibold text-ink-700">No Challans Yet</h3>
          <p className="mt-1 text-sm text-ink-500">
            Challans will appear after the rental is issued.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card-surface p-5">
          <div className="flex items-center gap-2 text-ink-500">
            <ScrollText className="h-4 w-4" />
            <span className="text-xs font-medium uppercase">At Issue</span>
          </div>
          <p className="mt-2 text-xl font-bold text-ink-900">{issueChallans.length}</p>
          <p className="text-xs text-ink-400">{formatCurrency(totalOf(issueChallans))}</p>
        </div>
        <div className="card-surface p-5">
          <div className="flex items-center gap-2 text-ink-500">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-xs font-medium uppercase">New at Return</span>
          </div>
          <p className="mt-2 text-xl font-bold text-warning-600">{newChallans.length}</p>
          <p className="text-xs text-ink-400">{formatCurrency(totalOf(newChallans))}</p>
        </div>
        <div className="card-surface p-5">
          <div className="flex items-center gap-2 text-ink-500">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-xs font-medium uppercase">Outstanding</span>
          </div>
          <p className="mt-2 text-xl font-bold text-danger-600">{formatCurrency(outstanding)}</p>
        </div>
      </div>

      {/* Sync button */}
      {inspection.lifecycle_status === 'ISSUED' && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            icon={<RefreshCw className="h-4 w-4" />}
            onClick={onSyncChallans}
          >
            Sync Challans
          </Button>
        </div>
      )}

      {/* Issue Challans */}
      {issueChallans.length > 0 && (
        <Card>
          <SectionTitle
            title="Challans at Issue"
            subtitle="Existing challans on the vehicle before rental"
            icon={<ScrollText className="h-5 w-5" />}
          />
          <div className="mt-4 space-y-3">
            {issueChallans.map((ch) => (
              <ChallanRow
                key={ch.id}
                challan={ch}
                onToggle={() => onToggleCleared(ch.id)}
              />
            ))}
          </div>
        </Card>
      )}

      {/* Return Challans */}
      {returnChallans.length > 0 && (
        <Card>
          <SectionTitle
            title="Challans at Return"
            subtitle="New challans discovered during the rental period"
            icon={<AlertTriangle className="h-5 w-5" />}
          />
          <div className="mt-4 space-y-3">
            {returnChallans.map((ch) => (
              <ChallanRow
                key={ch.id}
                challan={ch}
                onToggle={() => onToggleCleared(ch.id)}
                isNew
              />
            ))}
          </div>
        </Card>
      )}

      {allChallans.length === 0 && (
        <Card>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle className="h-10 w-10 text-success-300" />
            <h3 className="mt-4 text-base font-semibold text-ink-700">No Challans</h3>
            <p className="mt-1 text-sm text-ink-500">
              This vehicle has no challans recorded. You can sync to check for new ones.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}

function ChallanRow({
  challan,
  onToggle,
  isNew,
}: {
  challan: Challan;
  onToggle: () => void;
  isNew?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 transition-all ${
        isNew && !challan.cleared
          ? 'border-warning-200 bg-warning-50'
          : challan.cleared
          ? 'border-success-200 bg-success-50'
          : 'border-ink-200 bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-ink-900">{challan.challan_no}</span>
            {isNew && <Badge color="amber" dot>New</Badge>}
            {challan.cleared ? (
              <Badge color="green" dot>Cleared</Badge>
            ) : (
              <Badge color="red" dot>Uncleared</Badge>
            )}
          </div>
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            <p className="flex items-center gap-1.5 text-xs text-ink-500">
              <Calendar className="h-3 w-3" /> {formatDateTime(challan.challan_date_time)}
            </p>
            <p className="flex items-center gap-1.5 text-xs text-ink-500">
              <MapPin className="h-3 w-3" /> {challan.challan_place}
            </p>
          </div>
          <p className="text-sm text-ink-700">{challan.offence_details}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-ink-900">
            {formatCurrency(challan.total_amount || challan.fine_amount)}
          </p>
          <p className="text-xs text-ink-400">{challan.challan_status}</p>
        </div>
      </div>
      <div className="mt-3 flex justify-end">
        <Button
          variant={challan.cleared ? 'ghost' : 'outline'}
          size="sm"
          icon={<CheckCircle className="h-3.5 w-3.5" />}
          onClick={onToggle}
        >
          {challan.cleared ? 'Mark Uncleared' : 'Mark Cleared'}
        </Button>
      </div>
    </div>
  );
}
