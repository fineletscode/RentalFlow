import { useState, useCallback } from 'react';
import { useRentalStore } from '@/lib/store';
import type { Inspection, ViewMode } from '@/types/rental';
import { Dashboard } from '@/components/Dashboard';
import { NewRentalForm } from '@/components/NewRentalForm';
import { RentalDetail } from '@/components/RentalDetail';

function App() {
  const store = useRentalStore();
  const [view, setView] = useState<ViewMode>('dashboard');
  const [activeRentalId, setActiveRentalId] = useState<string | null>(null);

  const handleNewRental = useCallback(() => {
    setView('new-rental');
  }, []);

  const handleOpenRental = useCallback((id: string) => {
    setActiveRentalId(id);
    setView('rental-detail');
  }, []);

  const handleBack = useCallback(() => {
    setView('dashboard');
    setActiveRentalId(null);
  }, []);

  const handleCreated = useCallback((id: string) => {
    setActiveRentalId(id);
    setView('rental-detail');
  }, []);

  const handleIssue = useCallback(
    (data: Partial<Inspection>) => {
      if (!activeRentalId) return;
      store.issueRental(activeRentalId, data);
    },
    [store, activeRentalId]
  );

  const handleCompleteReturn = useCallback(
    (data: Partial<Inspection>) => {
      if (!activeRentalId) return;
      store.completeReturn(activeRentalId, data);
    },
    [store, activeRentalId]
  );

  const handleSyncChallans = useCallback(() => {
    if (!activeRentalId) return;
    store.syncReturnChallans(activeRentalId);
  }, [store, activeRentalId]);

  const handleToggleChallanCleared = useCallback(
    (challanId: string) => {
      store.toggleChallanCleared(challanId);
    },
    [store]
  );

  const activeInspection = activeRentalId
    ? store.getInspection(activeRentalId)
    : null;

  return (
    <div className="min-h-screen bg-ink-50">
      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-40 border-b border-ink-200 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <button
            onClick={handleBack}
            className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-md shadow-brand-600/20">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H9z M9 17v2a1 1 0 001 1h4a1 1 0 001-1v-2" />
              </svg>
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-ink-900">RentalHub</p>
              <p className="text-xs text-ink-500">Lifecycle Manager</p>
            </div>
          </button>

          <div className="flex items-center gap-3">
            {view !== 'dashboard' && (
              <button
                onClick={handleBack}
                className="text-sm font-medium text-ink-600 transition-colors hover:text-brand-600"
              >
                Dashboard
              </button>
            )}
            <div className="flex items-center gap-2 rounded-lg bg-ink-100 px-3 py-1.5">
              <div className="h-7 w-7 rounded-full bg-brand-600 text-white flex items-center justify-center text-xs font-bold">
                AM
              </div>
              <span className="text-sm font-medium text-ink-700">Arjun Mehta</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {view === 'dashboard' && (
          <Dashboard
            store={store}
            onNewRental={handleNewRental}
            onOpenRental={handleOpenRental}
          />
        )}

        {view === 'new-rental' && (
          <NewRentalForm
            store={store}
            onBack={handleBack}
            onCreated={handleCreated}
          />
        )}

        {view === 'rental-detail' && activeInspection && (
          <RentalDetail
            inspection={activeInspection}
            store={store}
            onBack={handleBack}
            onIssue={handleIssue}
            onCompleteReturn={handleCompleteReturn}
            onSyncChallans={handleSyncChallans}
            onToggleChallanCleared={handleToggleChallanCleared}
          />
        )}
      </main>
    </div>
  );
}

export default App;
