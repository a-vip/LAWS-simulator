'use client';
import { useSimulationStore } from '@/store/simulation';
import { CheckCircle, Clock, Cpu } from 'lucide-react';
import clsx from 'clsx';

const PHASE_GROUPS = [
  'authorization_pending',
  'authorized',
  'drone_dispatched',
  'engagement',
  'impact',
  'assessment',
];

export function EngagementWorkflow() {
  const {
    phase,
    activeScenario,
    authorizationIndex,
    advancePhase,
    advanceAuthorization,
    confidenceScore,
  } = useSimulationStore();

  const isVisible = PHASE_GROUPS.includes(phase);
  if (!isVisible || !activeScenario) return null;

  const chain = activeScenario.authorizationChain;
  const isFullyAuthorized = authorizationIndex >= chain.length;

  return (
    <div className="bg-terminal-card border border-terminal-border rounded p-3 space-y-3 font-mono animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] tracking-widest text-terminal-text-dim">ENGAGEMENT WORKFLOW</span>
        <span className={clsx(
          'text-[10px] px-2 py-0.5 rounded border font-bold',
          phase === 'authorized' || phase === 'drone_dispatched' || phase === 'engagement' || phase === 'impact'
            ? 'border-terminal-red text-terminal-red bg-terminal-red-dim'
            : 'border-terminal-amber text-terminal-amber bg-terminal-amber-dim'
        )}>
          {phase === 'authorization_pending' ? 'PENDING' : 'AUTHORIZED'}
        </span>
      </div>

      {/* Authorization chain */}
      <div className="space-y-1.5">
        {chain.map((step, i) => {
          const isApproved = i < authorizationIndex || phase === 'authorized' || phase === 'drone_dispatched' || phase === 'engagement' || phase === 'impact' || phase === 'assessment';
          const isCurrent = i === authorizationIndex && phase === 'authorization_pending';

          return (
            <div
              key={i}
              className={clsx(
                'flex items-start gap-2 p-2 rounded border text-[10px] transition-all',
                isApproved
                  ? 'border-terminal-green/40 bg-terminal-green-dim/20'
                  : isCurrent
                  ? 'border-terminal-amber/60 bg-terminal-amber-dim/30'
                  : 'border-terminal-border bg-transparent opacity-50'
              )}
            >
              {/* Icon */}
              <div className="mt-0.5 shrink-0">
                {step.status === 'autonomous' ? (
                  <Cpu className={clsx('w-3 h-3', isApproved ? 'text-terminal-green' : 'text-terminal-text-faint')} />
                ) : isApproved ? (
                  <CheckCircle className="w-3 h-3 text-terminal-green" />
                ) : (
                  <Clock className="w-3 h-3 text-terminal-text-faint" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={clsx(
                    'font-bold truncate',
                    isApproved ? 'text-terminal-text' : 'text-terminal-text-dim'
                  )}>
                    {step.entity}
                  </span>
                  {step.status === 'autonomous' && (
                    <span className="shrink-0 text-[8px] bg-terminal-amber-dim text-terminal-amber border border-terminal-amber/40 px-1 rounded">
                      AUTONOMOUS
                    </span>
                  )}
                </div>
                <div className="text-terminal-text-faint">{step.role}</div>
              </div>

              {/* Status */}
              <div className={clsx(
                'shrink-0 text-[9px] font-bold',
                isApproved ? 'text-terminal-green' : isCurrent ? 'text-terminal-amber' : 'text-terminal-text-faint'
              )}>
                {isApproved ? 'APPROVED' : isCurrent ? 'PENDING' : 'AWAITING'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Action button */}
      {phase === 'authorization_pending' && (
        <button
          onClick={() => {
            if (!isFullyAuthorized) {
              advanceAuthorization();
            } else {
              advancePhase();
            }
          }}
          className="w-full py-2 bg-terminal-red text-white text-[11px] font-bold tracking-widest rounded hover:bg-red-600 transition-colors"
        >
          {isFullyAuthorized ? 'FINALIZE AUTHORIZATION →' : `APPROVE: ${chain[authorizationIndex]?.role?.toUpperCase() ?? ''}` }
        </button>
      )}

      {phase === 'authorized' && (
        <button
          onClick={() => advancePhase()}
          className="w-full py-2 bg-terminal-red text-white text-[11px] font-bold tracking-widest rounded hover:bg-red-600 transition-colors animate-pulse-red"
        >
          DEPLOY ASSET →
        </button>
      )}

      {/* Autonomy note */}
      {chain.some((s) => s.status === 'autonomous') && (
        <div className="text-[9px] text-terminal-amber/70 border-t border-terminal-border pt-2">
          ⚠ One or more steps in this authorization chain are completed autonomously — no human decision required.
        </div>
      )}
    </div>
  );
}
