'use client';
import { useEffect, useState } from 'react';
import { useSimulationStore, PHASE_LABELS } from '@/store/simulation';
import { AlertTriangle, Radio, Wifi, Lock } from 'lucide-react';
import clsx from 'clsx';

export function SystemHeader() {
  const { phase, systemTime, totalEngagements, activeScenario } = useSimulationStore();
  const [tick, setTick] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => !t), 1000);
    return () => clearInterval(id);
  }, []);

  const isAlert = phase === 'alert_threshold' || phase === 'engagement' || phase === 'impact';
  const isActive = phase !== 'idle';

  const timeStr = systemTime.toISOString().split('T')[1].split('.')[0] + ' UTC';
  const dateStr = systemTime.toISOString().split('T')[0];

  return (
    <header
      className={clsx(
        'relative flex items-center justify-between px-4 py-0 h-12 border-b font-mono text-xs select-none shrink-0 z-50',
        isAlert
          ? 'bg-terminal-red-dim border-terminal-red text-terminal-red animate-pulse-red'
          : 'bg-terminal-panel border-terminal-border text-terminal-text-dim'
      )}
    >
      {/* LEFT — system identity */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className={clsx(
            'w-2 h-2 rounded-full',
            isAlert ? 'bg-terminal-red animate-ping-red'
            : isActive ? 'bg-terminal-green animate-pulse'
            : 'bg-terminal-text-faint'
          )} />
          <span className={clsx(
            'font-bold tracking-widest text-[10px]',
            isAlert ? 'text-terminal-red' : isActive ? 'text-terminal-green' : 'text-terminal-text-dim'
          )}>
            LAWS-SIM
          </span>
          <span className="text-terminal-text-faint">v2.4.1</span>
        </div>

        <div className="hidden sm:flex items-center gap-1 text-terminal-text-faint">
          <Lock className="w-3 h-3" />
          <span>TS//SCI</span>
        </div>

        <div className="hidden md:flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1">
            <Radio className="w-3 h-3 text-terminal-green" />
            <span className="text-terminal-green">LINK ACTIVE</span>
          </span>
          <span className="flex items-center gap-1">
            <Wifi className="w-3 h-3 text-terminal-blue" />
            <span className="text-terminal-blue">SIGINT FEED</span>
          </span>
        </div>
      </div>

      {/* CENTER — current phase */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
        {isAlert && (
          <AlertTriangle className="w-4 h-4 text-terminal-red shrink-0" />
        )}
        <span className={clsx(
          'tracking-widest text-[11px] font-bold',
          isAlert ? 'text-terminal-red' : 'text-terminal-text'
        )}>
          {PHASE_LABELS[phase]}
        </span>
      </div>

      {/* RIGHT — clock + stats */}
      <div className="flex items-center gap-4 text-[10px]">
        <div className="hidden sm:flex flex-col items-end leading-tight">
          <span className="text-terminal-text-dim">{dateStr}</span>
          <span className={clsx('font-bold', tick ? 'text-terminal-green' : 'text-terminal-green/70')}>
            {timeStr}
          </span>
        </div>
        <div className="flex flex-col items-end leading-tight text-terminal-text-faint">
          <span>ENGAGEMENTS</span>
          <span className="text-terminal-amber font-bold">{String(totalEngagements).padStart(4, '0')}</span>
        </div>
      </div>
    </header>
  );
}
