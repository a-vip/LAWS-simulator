'use client';
import { useSimulationStore } from '@/store/simulation';
import { useEffect, useState } from 'react';
import clsx from 'clsx';

export function AssessmentScreen() {
  const { phase, activeScenario, resetSimulation } = useSimulationStore();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (phase === 'assessment') {
      const t = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(t);
    }
    setVisible(false);
  }, [phase]);

  if (!visible || !activeScenario) return null;

  const collateral = activeScenario.collateralEstimate ?? [];
  const narrative = activeScenario.narrative.assessment ?? '';

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/90 font-mono p-4">
      <div className="max-w-xl w-full bg-terminal-panel border border-terminal-border rounded shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="px-4 py-3 border-b border-terminal-border bg-terminal-card rounded-t">
          <div className="text-[10px] tracking-widest text-terminal-text-faint">POST-STRIKE</div>
          <div className="text-terminal-text font-bold text-sm">BATTLE DAMAGE ASSESSMENT</div>
          <div className="text-terminal-text-dim text-[10px] mt-0.5">{activeScenario.title}</div>
        </div>

        {/* Assessment text */}
        <div className="p-4 space-y-4">
          <p className="text-[11px] text-terminal-text leading-relaxed border-l-2 border-terminal-red pl-3">
            {narrative}
          </p>

          {/* Casualty table */}
          {collateral.length > 0 && (
            <div>
              <div className="text-[10px] tracking-widest text-terminal-text-dim mb-1.5">CASUALTY RECORD</div>
              <div className="border border-terminal-border rounded overflow-hidden">
                {collateral.map((row, i) => (
                  <div
                    key={i}
                    className={clsx(
                      'flex justify-between px-3 py-1.5 text-[11px]',
                      i % 2 === 0 ? 'bg-terminal-panel' : 'bg-terminal-card',
                      row.type.toLowerCase().includes('children') || row.type.toLowerCase().includes('minor') || row.type.toLowerCase().includes('civilian')
                        ? 'text-terminal-red'
                        : row.type.toLowerCase().includes('confirmed combatant')
                        ? 'text-terminal-green'
                        : 'text-terminal-text'
                    )}
                  >
                    <span>{row.type}</span>
                    <span className="font-bold">{row.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Accountability gap */}
          <div className="bg-black/40 border border-terminal-amber/30 rounded p-3 text-[10px] text-terminal-amber/80 leading-relaxed">
            <div className="font-bold text-terminal-amber mb-1">ACCOUNTABILITY NOTE</div>
            Under current international law frameworks, no individual may be held legally responsible for an engagement carried out autonomously below the human decision threshold. Campaign to Stop Killer Robots advocates for a legally binding international instrument to prohibit fully autonomous weapons.
          </div>

          {/* UN link */}
          <div className="text-[10px] text-terminal-blue border-t border-terminal-border pt-3">
            <span className="text-terminal-text-dim">Learn more: </span>
            <a
              href="https://www.stopkillerrobots.org"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-terminal-text"
            >
              stopkillerrobots.org
            </a>
            {' · '}
            <a
              href="https://www.un.org/disarmament/the-convention-on-certain-conventional-weapons/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-terminal-text"
            >
              UN CCW LAWS Negotiations
            </a>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={resetSimulation}
              className="flex-1 py-2 border border-terminal-border text-terminal-text-dim text-[11px] rounded hover:border-terminal-text-dim transition-colors"
            >
              RESET SYSTEM
            </button>
            <button
              onClick={resetSimulation}
              className="flex-1 py-2 bg-terminal-green-dim border border-terminal-green text-terminal-green text-[11px] font-bold tracking-wider rounded hover:bg-terminal-green/20 transition-colors"
            >
              RUN NEXT SCENARIO →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
