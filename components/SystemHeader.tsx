'use client';
import { useEffect, useState } from 'react';
import { useSimulationStore, PHASE_LABELS } from '@/store/simulation';
import { AlertTriangle, Radio, Wifi, Lock } from 'lucide-react';
import clsx from 'clsx';
import { ModuleNav } from './modules/ModuleNav';
import { SupportButton } from './SupportButton';
import { SimulatorChangelog } from './SimulatorChangelog';

export function SystemHeader() {
  const { phase, systemTime, totalEngagements, resetSimulation } = useSimulationStore();
  const [tick, setTick] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => !t), 1000);
    return () => clearInterval(id);
  }, []);

  const isAlert = phase === 'alert_threshold' || phase === 'engagement' || phase === 'impact';
  const isActive = phase !== 'idle';

  const timeStr = systemTime.toISOString().split('T')[1].split('.')[0] + ' UTC';
  const dateStr = systemTime.toISOString().split('T')[0];

  return (
    <>
      <header
        className={clsx(
          // Use min-w-0 on children to prevent overflow; use overflow-hidden on header itself
          'relative flex items-center justify-between px-3 py-0 h-11 border-b font-mono text-xs select-none shrink-0 z-50 overflow-hidden',
          isAlert
            ? 'bg-terminal-red-dim border-terminal-red text-terminal-red animate-pulse-red'
            : 'bg-terminal-panel border-terminal-border text-terminal-text-dim'
        )}
      >
        {/* ── LEFT — system identity (fixed width, no wrap) ── */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Status dot + name */}
          <div className="flex items-center gap-1.5">
            <div className={clsx(
              'w-1.5 h-1.5 rounded-full shrink-0',
              isAlert ? 'bg-terminal-red animate-ping-red'
              : isActive ? 'bg-terminal-green animate-pulse'
              : 'bg-terminal-text-faint'
            )} />
            <span className={clsx(
              'font-bold tracking-widest text-[10px] whitespace-nowrap',
              isAlert ? 'text-terminal-red' : isActive ? 'text-terminal-green' : 'text-terminal-text-dim'
            )}>
              LAWS-SIM
            </span>
            <span className="text-terminal-text-faint text-[9px]">v2.5.0</span>
          </div>

          {/* TS//SCI — hide on small */}
          <div className="hidden lg:flex items-center gap-1 text-terminal-text-faint text-[9px]">
            <Lock className="w-2.5 h-2.5" />
            <span>TS//SCI</span>
          </div>

          {/* Link status — hide on medium */}
          <div className="hidden xl:flex items-center gap-2 text-[9px]">
            <span className="flex items-center gap-1 text-terminal-green">
              <Radio className="w-2.5 h-2.5" />LINK ACTIVE
            </span>
            <span className="flex items-center gap-1 text-terminal-blue">
              <Wifi className="w-2.5 h-2.5" />SIGINT
            </span>
          </div>

          {/* Command Hub button — only when sim active */}
          {isActive && (
            <button
              onClick={() => resetSimulation()}
              className="ml-1 px-2 py-0.5 border border-terminal-blue/50 text-terminal-blue hover:bg-terminal-blue/20 rounded font-bold text-[8px] uppercase transition-colors whitespace-nowrap"
            >
              [COMMAND HUB]
            </button>
          )}
        </div>

        {/* ── CENTER — Module Navigation (absolute centred) ── */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-1.5">
            {isAlert && (
              <AlertTriangle className="w-3.5 h-3.5 text-terminal-red shrink-0 animate-pulse" />
            )}
            <ModuleNav />
            {isAlert && (
              <span className="text-terminal-red text-[8px] font-bold tracking-widest animate-pulse hidden xl:block whitespace-nowrap">
                {PHASE_LABELS[phase]}
              </span>
            )}
          </div>
        </div>

        {/* ── RIGHT — clock + support (fixed width, no wrap) ── */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Clock */}
          <div className="hidden md:flex flex-col items-end leading-tight">
            <span className="text-terminal-text-faint text-[8px]" suppressHydrationWarning>{dateStr}</span>
            <span
              className={clsx('font-bold text-[9px]', tick ? 'text-terminal-green' : 'text-terminal-green/70')}
              suppressHydrationWarning
            >
              {timeStr}
            </span>
          </div>

          {/* Support button — BY AVI + changelog inside dropdown */}
          <SupportButton onChangelogOpen={() => setShowChangelog(true)} />
        </div>
      </header>

      {/* Changelog modal */}
      {showChangelog && (
        <SimulatorChangelog onClose={() => setShowChangelog(false)} />
      )}
    </>
  );
}
