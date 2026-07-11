'use client';
import { useEffect, useState } from 'react';
import { useSimulationStore, PHASE_LABELS } from '@/store/simulation';
import { AlertTriangle, Radio, Lock, MessageSquare } from 'lucide-react';
import clsx from 'clsx';
import { ModuleNav } from './modules/ModuleNav';
import { SupportButton } from './SupportButton';
import { SimulatorChangelog } from './SimulatorChangelog';
import { FeedbackModal } from './FeedbackModal';

export function SystemHeader() {
  const { phase, systemTime, resetSimulation } = useSimulationStore();
  const [tick, setTick]             = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [showFeedback, setShowFeedback]   = useState(false);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => !t), 1000);
    return () => clearInterval(id);
  }, []);

  const isAlert  = phase === 'alert_threshold' || phase === 'engagement' || phase === 'impact';
  const isActive = phase !== 'idle';

  const timeStr = systemTime.toISOString().split('T')[1].split('.')[0] + ' UTC';
  const dateStr = systemTime.toISOString().split('T')[0];

  return (
    <>
      <header
        className={clsx(
          'flex items-center justify-between px-3 h-11 border-b font-mono text-xs select-none shrink-0 z-50 gap-2',
          isAlert
            ? 'bg-terminal-red-dim border-terminal-red'
            : 'bg-terminal-panel border-terminal-border text-terminal-text-dim'
        )}
      >
        {/* ── LEFT — system identity ─────────────────────────────────── */}
        <div className="flex items-center gap-2 shrink-0 min-w-0">
          {/* Status dot */}
          <div className={clsx(
            'w-1.5 h-1.5 rounded-full shrink-0',
            isAlert  ? 'bg-terminal-red animate-ping-red'
            : isActive ? 'bg-terminal-green animate-pulse'
            : 'bg-terminal-text-faint'
          )} />

          {/* Name + version */}
          <span className={clsx(
            'font-bold tracking-widest text-[10px] whitespace-nowrap',
            isAlert ? 'text-terminal-red' : isActive ? 'text-terminal-green' : 'text-terminal-text-dim'
          )}>
            LAWS-SIM
          </span>
          <span className="text-terminal-text-faint text-[9px] hidden sm:inline">v2.5.0</span>

          {/* TS//SCI */}
          <div className="hidden xl:flex items-center gap-1 text-terminal-text-faint text-[8px]">
            <Lock className="w-2 h-2" />
            <span>TS//SCI</span>
          </div>

          {/* Link status — no SIGINT */}
          <span className="hidden xl:flex items-center gap-1 text-terminal-green text-[8px]">
            <Radio className="w-2 h-2" />LINK ACTIVE
          </span>

          {/* Alert phase label */}
          {isAlert && (
            <span className="text-terminal-red text-[8px] font-bold tracking-widest animate-pulse whitespace-nowrap hidden lg:inline">
              ▲ {PHASE_LABELS[phase]}
            </span>
          )}
        </div>

        {/* ── CENTER — Module Navigation (flex-1, no absolute) ─────── */}
        <div className="flex-1 flex items-center justify-center min-w-0 overflow-hidden">
          <ModuleNav />
        </div>

        {/* ── RIGHT — clock + alert icon + support ─────────────────── */}
        <div className="flex items-center gap-2 shrink-0">
          {isAlert && (
            <AlertTriangle className="w-3.5 h-3.5 text-terminal-red animate-pulse shrink-0" />
          )}

          {/* Clock */}
          <div className="hidden md:flex flex-col items-end leading-tight">
            <span className="text-terminal-text-faint text-[8px]" suppressHydrationWarning>
              {dateStr}
            </span>
            <span
              className={clsx('font-bold text-[9px]', tick ? 'text-terminal-green' : 'text-terminal-green/70')}
              suppressHydrationWarning
            >
              {timeStr}
            </span>
          </div>

          {/* Feedback + Support + changelog */}
          <button
            onClick={() => setShowFeedback(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '4px 10px', borderRadius: 20,
              background: 'rgba(5,8,14,0.88)',
              border: '1px solid rgba(0,150,255,0.22)',
              color: '#8892a4', fontSize: '9.5px', fontWeight: 700,
              cursor: 'pointer', transition: 'all 0.2s', outline: 'none',
              fontFamily: 'monospace', whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,150,255,0.55)'; e.currentTarget.style.color = '#0096ff'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,150,255,0.22)'; e.currentTarget.style.color = '#8892a4'; }}
            title="Submit feedback, bugs, or feature requests"
          >
            <MessageSquare style={{ width: 11, height: 11 }} />
            FEEDBACK
          </button>
          <SupportButton onChangelogOpen={() => setShowChangelog(true)} />
        </div>
      </header>

      {showChangelog && (
        <SimulatorChangelog onClose={() => setShowChangelog(false)} />
      )}
      {showFeedback && (
        <FeedbackModal onClose={() => setShowFeedback(false)} />
      )}
    </>
  );
}
