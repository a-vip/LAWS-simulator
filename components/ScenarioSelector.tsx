'use client';
import { SCENARIOS } from '@/lib/scenarios';
import { useSimulationStore } from '@/store/simulation';
import clsx from 'clsx';
import { Play, AlertTriangle } from 'lucide-react';

export function ScenarioSelector() {
  const { loadScenario, activeScenario, phase, resetSimulation } = useSimulationStore();
  const isRunning = phase !== 'idle' && phase !== 'assessment';

  return (
    <div className="bg-terminal-card border border-terminal-border rounded p-3 font-mono">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] tracking-widest text-terminal-text-dim">SCENARIO LIBRARY</span>
        {phase !== 'idle' && (
          <button
            onClick={resetSimulation}
            className="text-[9px] border border-terminal-border text-terminal-text-dim px-2 py-0.5 rounded hover:border-terminal-text-dim transition-colors"
          >
            RESET
          </button>
        )}
      </div>

      <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
        {SCENARIOS.map((scenario) => {
          const isActive = activeScenario?.id === scenario.id;
          return (
            <button
              key={scenario.id}
              onClick={() => loadScenario(scenario)}
              disabled={isRunning && !isActive}
              className={clsx(
                'w-full text-left rounded border p-2 transition-all text-[10px] group',
                isActive
                  ? 'border-terminal-green bg-terminal-green-dim/30'
                  : 'border-terminal-border bg-terminal-panel hover:border-terminal-border-bright hover:bg-terminal-card',
                isRunning && !isActive ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className={clsx(
                    'font-bold truncate',
                    isActive ? 'text-terminal-green' : 'text-terminal-text group-hover:text-terminal-text-header'
                  )}>
                    {scenario.title}
                  </div>
                  <div className="text-terminal-text-faint mt-0.5 truncate">{scenario.subtitle}</div>
                </div>
                <Play className={clsx(
                  'w-3 h-3 shrink-0 mt-0.5 transition-colors',
                  isActive ? 'text-terminal-green' : 'text-terminal-text-faint group-hover:text-terminal-text'
                )} />
              </div>
              {scenario.basedOn && (
                <div className="mt-1 text-terminal-amber/60 text-[9px] truncate">
                  ℹ {scenario.basedOn.split('—')[0].trim()}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Advocacy note */}
      <div className="mt-2 pt-2 border-t border-terminal-border flex gap-1.5 text-[9px] text-terminal-amber/70">
        <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
        <span>Scenarios are based on documented incidents or published LAWS doctrine. This tool exists to make visible what automated targeting does.</span>
      </div>
    </div>
  );
}
