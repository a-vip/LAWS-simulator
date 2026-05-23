'use client';
import { useSimulationStore } from '@/store/simulation';
import clsx from 'clsx';

export function ConfidenceDisplay() {
  const { confidenceScore, activeScenario, phase } = useSimulationStore();
  const threshold = activeScenario?.confidenceThreshold ?? 70;
  const isAbove = confidenceScore >= threshold;
  const isActive = phase !== 'idle';

  const color = confidenceScore >= 80 ? '#ff1a2e'
    : confidenceScore >= threshold ? '#ffaa00'
    : confidenceScore >= 40 ? '#ffd060'
    : '#00d47e';

  const thresholdPct = threshold;
  const scorePct = Math.min(confidenceScore, 100);

  return (
    <div className="bg-terminal-card border border-terminal-border rounded p-3 space-y-2 font-mono">
      {/* Header */}
      <div className="flex justify-between items-center">
        <span className="text-[10px] tracking-widest text-terminal-text-dim">CONFIDENCE SCORE</span>
        <span
          className="text-xs font-bold"
          style={{ color }}
        >
          {isActive ? `${confidenceScore.toFixed(1)}%` : '—'}
        </span>
      </div>

      {/* Bar */}
      <div className="relative h-3 bg-terminal-panel rounded-sm overflow-hidden border border-terminal-border">
        {/* Filled bar */}
        <div
          className="absolute inset-y-0 left-0 transition-all duration-300"
          style={{
            width: `${scorePct}%`,
            background: `linear-gradient(90deg, #005c36, ${color})`,
          }}
        />
        {/* Threshold marker */}
        <div
          className="absolute inset-y-0 w-px bg-terminal-amber/80 z-10"
          style={{ left: `${thresholdPct}%` }}
          title={`Threshold: ${threshold}%`}
        />
        {/* Threshold flag */}
        <div
          className="absolute -top-0.5 text-[8px] text-terminal-amber translate-x-1"
          style={{ left: `${thresholdPct}%` }}
        >
          ▼
        </div>
      </div>

      {/* Labels */}
      <div className="flex justify-between text-[9px] text-terminal-text-faint">
        <span>0%</span>
        <span className="text-terminal-amber">THRESHOLD: {threshold}%</span>
        <span>100%</span>
      </div>

      {/* Status row */}
      {isActive && (
        <div className={clsx(
          'mt-1 py-1 px-2 rounded text-center text-[10px] font-bold tracking-widest border',
          isAbove
            ? 'bg-terminal-red-dim border-terminal-red text-terminal-red'
            : 'bg-terminal-green-dim border-terminal-green text-terminal-green'
        )}>
          {isAbove ? '⚠ ENGAGEMENT ELIGIBLE' : 'ANALYSIS IN PROGRESS'}
        </div>
      )}

      {/* What this means */}
      {isActive && (
        <div className="text-[9px] text-terminal-text-faint leading-relaxed border-t border-terminal-border pt-2 mt-1">
          {isAbove ? (
            <>
              <span className="text-terminal-red">ABOVE LETHAL THRESHOLD.</span>{' '}
              System assesses {confidenceScore.toFixed(0)}% probability of target match. This means a{' '}
              <span className="text-terminal-amber">{(100 - confidenceScore).toFixed(0)}% probability</span> the assessment is wrong.
            </>
          ) : (
            <>Confidence at {confidenceScore.toFixed(0)}%. System requires {threshold}% to trigger engagement authorization.</>
          )}
        </div>
      )}
    </div>
  );
}
