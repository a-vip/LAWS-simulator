'use client';
import { useSimulationStore } from '@/store/simulation';
import clsx from 'clsx';

const LEVEL_STYLES = {
  info: 'text-terminal-text-dim',
  warning: 'text-terminal-amber',
  critical: 'text-terminal-red font-bold',
};

const LEVEL_PREFIX = {
  info: '[INFO]  ',
  warning: '[WARN]  ',
  critical: '[CRIT]  ',
};

export function AlertFeed() {
  const { alerts } = useSimulationStore();

  return (
    <div className="bg-terminal-card border border-terminal-border rounded p-3 font-mono flex flex-col h-full">
      <div className="flex items-center justify-between mb-2 shrink-0">
        <span className="text-[10px] tracking-widest text-terminal-text-dim">ALERT FEED</span>
        <span className="text-[9px] text-terminal-green">
          {alerts.length > 0 ? `${alerts.length} EVENTS` : 'NO EVENTS'}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-0.5 min-h-[80px]">
        {alerts.length === 0 ? (
          <div className="text-[10px] text-terminal-text-faint py-2">— awaiting events —</div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={clsx('flex gap-2 text-[10px] leading-relaxed', LEVEL_STYLES[alert.level])}
            >
              <span className="shrink-0 text-terminal-text-faint">
                {alert.timestamp.toISOString().split('T')[1].slice(0, 8)}
              </span>
              <span className="shrink-0">{LEVEL_PREFIX[alert.level]}</span>
              <span>{alert.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
