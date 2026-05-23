'use client';
import { useEffect, useRef, useState } from 'react';
import { useSimulationStore, PHASE_LABELS } from '@/store/simulation';
import clsx from 'clsx';

function useTypewriter(text: string, speed = 18) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed('');
    setDone(false);
    if (!text) return;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(id);
        setDone(true);
      }
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);

  return { displayed, done };
}

export function NarrativePanel() {
  const { phase, activeScenario } = useSimulationStore();
  const narrativeText =
    activeScenario?.narrative?.[phase as keyof typeof activeScenario.narrative] ?? '';

  const { displayed, done } = useTypewriter(narrativeText, 14);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [displayed]);

  const isAlert =
    phase === 'alert_threshold' ||
    phase === 'engagement' ||
    phase === 'impact';

  const isCritical = phase === 'impact' || phase === 'assessment';

  return (
    <div
      className={clsx(
        'bg-terminal-card border rounded p-3 flex flex-col font-mono transition-colors duration-500',
        isAlert ? 'border-terminal-red/60' : 'border-terminal-border'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2 shrink-0">
        <span className="text-[10px] tracking-widest text-terminal-text-dim">SYSTEM NARRATIVE</span>
        <span className={clsx(
          'text-[9px] px-2 py-0.5 rounded border',
          isAlert
            ? 'border-terminal-red text-terminal-red bg-terminal-red-dim'
            : 'border-terminal-green/40 text-terminal-green bg-terminal-green-dim/30'
        )}>
          {PHASE_LABELS[phase]}
        </span>
      </div>

      {/* Text area */}
      <div
        ref={containerRef}
        className="flex-1 min-h-[80px] max-h-[140px] overflow-y-auto text-[11px] leading-relaxed text-terminal-text"
      >
        {phase === 'idle' ? (
          <span className="text-terminal-text-faint">Select a scenario to begin simulation...</span>
        ) : (
          <>
            <span className={clsx(
              isCritical ? 'text-terminal-red' : 'text-terminal-text'
            )}>
              {displayed}
            </span>
            {!done && (
              <span className="inline-block w-1.5 h-3.5 bg-terminal-green ml-0.5 animate-blink align-text-bottom" />
            )}
          </>
        )}
      </div>

      {/* Phase timestamp */}
      {phase !== 'idle' && (
        <div className="mt-2 pt-2 border-t border-terminal-border text-[9px] text-terminal-text-faint shrink-0">
          {new Date().toISOString()} — PHASE: {phase.toUpperCase()}
        </div>
      )}
    </div>
  );
}
