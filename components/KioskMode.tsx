'use client';
import { useEffect, useState, useRef } from 'react';
import { useSimulationStore } from '@/store/simulation';
import { SCENARIOS } from '@/lib/scenarios';
import { Monitor, Play, RotateCcw } from 'lucide-react';
import clsx from 'clsx';

const PHASE_DELAYS: Record<string, number> = {
  scanning: 4000,
  target_acquired: 4000,
  tracking: 6000,
  confidence_building: 8000,
  alert_threshold: 5000,
  authorization_pending: 6000,
  authorized: 4000,
  // drone_dispatched and engagement advance automatically based on drone ticker progress,
  impact: 5000,
  assessment: 12000,
};

export function KioskMode() {
  const { phase, activeScenario, loadScenario, advancePhase, resetSimulation } = useSimulationStore();
  const [isKiosk, setIsKiosk] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(90);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pauseTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Check URL parameters for ?kiosk=true on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('kiosk') === 'true') {
      setIsKiosk(true);
    }
  }, []);

  // Listen to keyboard shortcuts: 'k' or 'K' toggles kiosk mode, 'Escape' exits
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k') {
        setIsKiosk((prev) => !prev);
      } else if (e.key === 'Escape') {
        setIsKiosk(false);
        setIsPaused(false);
      } else if (isKiosk && !isPaused) {
        // Any other key triggers manual control take-over
        setIsPaused(true);
        if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
        // Resume kiosk mode after 30 seconds of inactivity
        pauseTimerRef.current = setTimeout(() => {
          setIsPaused(false);
        }, 30000);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isKiosk, isPaused]);

  // Main Kiosk logic loop
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!isKiosk || isPaused) return;

    // 1. Idle state: boot up first scenario
    if (phase === 'idle') {
      loadScenario(SCENARIOS[0]);
      return;
    }

    // 2. Assessment phase: wait, then rotate to the next scenario
    if (phase === 'assessment') {
      timerRef.current = setTimeout(() => {
        const currentIdx = SCENARIOS.findIndex((s) => s.id === activeScenario?.id);
        const nextIdx = (currentIdx + 1) % SCENARIOS.length;
        resetSimulation();
        setTimeout(() => {
          loadScenario(SCENARIOS[nextIdx]);
        }, 1000);
      }, PHASE_DELAYS.assessment);
      return;
    }

    // 3. Drone dispatched and terminal engagement handle themselves (tick finishes them)
    if (phase === 'drone_dispatched' || phase === 'engagement') {
      return;
    }

    // 4. Default delay-based phase transitions
    const delay = PHASE_DELAYS[phase] ?? 5000;
    timerRef.current = setTimeout(() => {
      advancePhase();
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [phase, isKiosk, isPaused, activeScenario, loadScenario, advancePhase, resetSimulation]);

  // Handle countdown for scenario duration (useful visual info)
  useEffect(() => {
    if (!isKiosk || isPaused) return;
    setSecondsRemaining(90);

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 90));
    }, 1000);

    return () => clearInterval(interval);
  }, [activeScenario, isKiosk, isPaused]);

  if (!isKiosk) return null;

  return (
    <div className="fixed bottom-12 right-4 z-[80] font-mono pointer-events-none select-none">
      <div className={clsx(
        'flex items-center gap-3 px-3 py-2 bg-terminal-panel border rounded shadow-2xl pointer-events-auto transition-all duration-300',
        isPaused ? 'border-terminal-amber text-terminal-amber' : 'border-terminal-green text-terminal-green animate-pulse'
      )}>
        <Monitor className="w-4 h-4" />
        <div className="flex flex-col text-[10px] leading-tight">
          <span className="font-bold tracking-widest uppercase">
            {isPaused ? '⚠ KIOSK PAUSED' : '● KIOSK MODE ACTIVE'}
          </span>
          <span className="text-[8px] text-terminal-text-dim mt-0.5">
            {isPaused
              ? 'Press ESC to exit or wait 30s to resume'
              : `Next rotation in ${secondsRemaining}s · Press 'K' to exit`}
          </span>
        </div>

        {isPaused && (
          <button
            onClick={() => setIsPaused(false)}
            className="ml-2 flex items-center justify-center p-1 bg-terminal-green-dim border border-terminal-green rounded text-terminal-green hover:bg-terminal-green/20"
            title="Resume Auto-Advance"
          >
            <Play className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Transparent overlay when active but not paused to prompt users */}
      {!isPaused && phase === 'scanning' && (
        <div className="fixed inset-0 bg-transparent pointer-events-none flex items-center justify-center">
          <div className="px-4 py-2 bg-black/60 border border-terminal-green/30 text-terminal-green text-[10px] tracking-widest uppercase animate-bounce rounded-none">
            ⌨ PRESS ANY KEY TO INTERACT / TAKE CONTROL
          </div>
        </div>
      )}
    </div>
  );
}
