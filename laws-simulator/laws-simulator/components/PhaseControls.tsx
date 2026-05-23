'use client';
import { useSimulationStore, PHASE_LABELS } from '@/store/simulation';
import type { SimPhase } from '@/lib/types';
import clsx from 'clsx';
import { ChevronRight, SkipForward } from 'lucide-react';

const PHASE_ORDER: SimPhase[] = [
  'idle',
  'scanning',
  'target_acquired',
  'tracking',
  'confidence_building',
  'alert_threshold',
  'authorization_pending',
  'authorized',
  'drone_dispatched',
  'engagement',
  'impact',
  'assessment',
];

export function PhaseControls() {
  const { phase, activeScenario, advancePhase, droneProgress } = useSimulationStore();

  if (!activeScenario || phase === 'idle') return null;

  const currentIdx = PHASE_ORDER.indexOf(phase);
  const isLast = currentIdx >= PHASE_ORDER.length - 1;
  const isDronePhase = phase === 'drone_dispatched' || phase === 'engagement';
  const isAuthPhase = phase === 'authorization_pending';

  // Auth phase has its own buttons in EngagementWorkflow
  if (isAuthPhase) return null;

  return (
    <div className="bg-terminal-card border border-terminal-border rounded p-3 font-mono space-y-2">
      {/* Drone progress */}
      {isDronePhase && (
        <div className="space-y-1">
          <div className="flex justify-between text-[9px] text-terminal-text-faint">
            <span>ASSET PROGRESS</span>
            <span className="text-terminal-blue">{(droneProgress * 100).toFixed(0)}%</span>
          </div>
          <div className="h-1.5 bg-terminal-panel rounded-full overflow-hidden border border-terminal-border">
            <div
              className="h-full bg-terminal-blue transition-all duration-500"
              style={{ width: `${droneProgress * 100}%` }}
            />
          </div>
          <div className="text-[9px] text-terminal-blue">
            ✈ ASSET IN TRANSIT — {phase === 'engagement' ? 'TERMINAL APPROACH' : 'EN ROUTE TO TARGET'}
          </div>
        </div>
      )}

      {/* Phase step indicators */}
      <div className="flex gap-0.5 overflow-x-auto pb-1">
        {PHASE_ORDER.slice(1).map((p, i) => {
          const done = PHASE_ORDER.indexOf(p) < currentIdx;
          const active = p === phase;
          return (
            <div
              key={p}
              className={clsx(
                'h-1 flex-1 min-w-[8px] rounded-full transition-colors',
                active ? 'bg-terminal-amber'
                : done ? 'bg-terminal-green/60'
                : 'bg-terminal-text-faint/20'
              )}
              title={PHASE_LABELS[p]}
            />
          );
        })}
      </div>

      {/* Advance button */}
      {!isLast && phase !== 'impact' && (
        <button
          onClick={advancePhase}
          className={clsx(
            'w-full flex items-center justify-center gap-2 py-2 rounded text-[11px] font-bold tracking-wider border transition-colors',
            phase === 'authorized' || phase === 'alert_threshold'
              ? 'bg-terminal-red border-terminal-red text-white hover:bg-red-600'
              : 'border-terminal-border text-terminal-text-dim hover:border-terminal-border-bright hover:text-terminal-text'
          )}
        >
          <ChevronRight className="w-3.5 h-3.5" />
          ADVANCE: {PHASE_LABELS[PHASE_ORDER[currentIdx + 1]]}
        </button>
      )}
    </div>
  );
}
