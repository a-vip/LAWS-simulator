'use client';
import { useState, useEffect } from 'react';
import { useSimulationStore, PHASE_LABELS } from '@/store/simulation';
import { AlertTriangle, X } from 'lucide-react';
import clsx from 'clsx';

export function AlertOverlay() {
  const { phase, activeScenario, confidenceScore, advancePhase } = useSimulationStore();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (phase === 'alert_threshold') {
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [phase]);

  if (!visible || !activeScenario) return null;

  const primaryTarget = activeScenario.targets.find(
    (t) => t.id === activeScenario.primaryTargetId
  );

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/80 font-mono"
      style={{ zIndex: 99999 }}
    >
      {/* Red border flash */}
      <div className="absolute inset-0 border-4 border-terminal-red animate-pulse-red pointer-events-none" />

      <div className="relative bg-terminal-panel border-2 border-terminal-red max-w-lg w-full mx-4 rounded shadow-2xl animate-slide-in-right">
        {/* Header bar */}
        <div className="flex items-center justify-between bg-terminal-red px-4 py-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-white" />
            <span className="text-white text-xs font-bold tracking-widest">
              ENGAGEMENT THRESHOLD ALERT
            </span>
          </div>
          <button
            onClick={() => setVisible(false)}
            className="text-white/60 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          {/* Target info */}
          <div className="border border-terminal-border rounded p-3 space-y-1">
            <div className="text-[10px] text-terminal-text-dim tracking-widest">TARGET DESIGNATOR</div>
            <div className="text-terminal-text font-bold">{primaryTarget?.designator ?? '—'}</div>
            <div className="text-[10px] text-terminal-text-dim mt-1">CONFIDENCE SCORE</div>
            <div className="text-2xl font-bold text-terminal-red">{confidenceScore.toFixed(0)}%</div>
          </div>

          {/* Narrative */}
          <p className="text-[11px] text-terminal-text leading-relaxed border-l-2 border-terminal-red pl-3">
            {activeScenario.narrative.alert_threshold}
          </p>

          {/* What the confidence means */}
          <div className="bg-black/40 border border-terminal-amber/40 rounded p-2 text-[10px] text-terminal-amber/80">
            <span className="font-bold">NOTE:</span> A {confidenceScore.toFixed(0)}% confidence score means a{' '}
            <span className="font-bold text-terminal-amber">{(100 - confidenceScore).toFixed(0)}% probability</span>{' '}
            this assessment is incorrect. In real LAWS deployments, lethal action would proceed at this score.
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => {
                setVisible(false);
                advancePhase();
              }}
              className="flex-1 py-2 bg-terminal-red text-white text-xs font-bold tracking-widest rounded hover:bg-red-600 transition-colors"
            >
              REQUEST AUTHORIZATION →
            </button>
            <button
              onClick={() => setVisible(false)}
              className="px-4 py-2 border border-terminal-border text-terminal-text-dim text-xs rounded hover:border-terminal-text-dim transition-colors"
            >
              OBSERVE
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-terminal-border text-[9px] text-terminal-text-faint">
          SIMULATED ALERT — STOP KILLER ROBOTS ADVOCACY TOOL — NOT A REAL TARGETING SYSTEM
        </div>
      </div>
    </div>
  );
}
