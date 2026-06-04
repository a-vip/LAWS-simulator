'use client';
import { useSimulationStore } from '@/store/simulation';
import { ChevronRight } from 'lucide-react';
import clsx from 'clsx';

const MODULES = [
  { id: 'hub', label: 'COMMAND HUB', shortLabel: 'HUB', color: 'text-terminal-green' },
  { id: 'pipeline', label: 'M1: TARGET PIPELINE', shortLabel: 'M1', color: 'text-terminal-blue' },
  { id: 'lavender', label: 'M2: LAVENDER', shortLabel: 'M2', color: 'text-terminal-amber' },
  { id: 'habsora', label: 'M3: HAPSORA', shortLabel: 'M3', color: 'text-terminal-red' },
  { id: 'daddy', label: 'M4: WHERE\'S DADDY', shortLabel: 'M4', color: 'text-terminal-red' },
  { id: 'human', label: 'M5: HUMAN LOOP', shortLabel: 'M5', color: 'text-terminal-amber' },
  { id: 'compliance', label: 'M6: COMPLIANCE', shortLabel: 'M6', color: 'text-terminal-green' },
];

export function ModuleNav() {
  const { activeModule, setActiveModule } = useSimulationStore();

  return (
    <div className="flex items-center gap-0.5 bg-terminal-panel/80 border border-terminal-border rounded px-1 py-0.5 overflow-x-auto">
      {MODULES.map((mod, i) => (
        <div key={mod.id} className="flex items-center shrink-0">
          <button
            onClick={() => setActiveModule(mod.id)}
            className={clsx(
              'px-2 py-1 text-[8px] font-bold uppercase tracking-wider rounded transition-all whitespace-nowrap',
              activeModule === mod.id
                ? `${mod.color} bg-terminal-card border border-current/30`
                : 'text-terminal-text-faint hover:text-terminal-text-dim hover:bg-terminal-card/50'
            )}
          >
            <span className="hidden lg:inline">{mod.label}</span>
            <span className="lg:hidden">{mod.shortLabel}</span>
          </button>
          {i < MODULES.length - 1 && (
            <ChevronRight className="w-3 h-3 text-terminal-text-faint/40 shrink-0 mx-0.5" />
          )}
        </div>
      ))}
    </div>
  );
}
