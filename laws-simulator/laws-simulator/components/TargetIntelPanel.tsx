'use client';
import { useSimulationStore } from '@/store/simulation';
import { MapPin, Phone, Users, Clock } from 'lucide-react';
import clsx from 'clsx';

const THREAT_COLORS = {
  low: 'text-terminal-green border-terminal-green bg-terminal-green-dim',
  medium: 'text-terminal-amber border-terminal-amber bg-terminal-amber-dim',
  high: 'text-terminal-red border-terminal-red bg-terminal-red-dim',
  critical: 'text-terminal-red border-terminal-red bg-terminal-red-dim',
};

export function TargetIntelPanel() {
  const { primaryTarget, phase, activeScenario, confidenceScore } = useSimulationStore();

  if (!primaryTarget || phase === 'idle') {
    return (
      <div className="bg-terminal-card border border-terminal-border rounded p-3 font-mono">
        <div className="text-[10px] tracking-widest text-terminal-text-dim mb-2">TARGET INTEL</div>
        <div className="text-center py-6 text-terminal-text-faint text-[11px]">
          — NO ACTIVE TARGET —<br />
          <span className="text-[9px]">select a scenario to begin</span>
        </div>
      </div>
    );
  }

  const isTracking = phase !== 'idle' && phase !== 'scanning';

  return (
    <div className="bg-terminal-card border border-terminal-border rounded p-3 space-y-2 font-mono">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[10px] tracking-widest text-terminal-text-dim">TARGET INTEL</div>
          <div className="text-terminal-text font-bold text-sm mt-0.5">{primaryTarget.designator}</div>
        </div>
        <div className={clsx(
          'shrink-0 text-[9px] font-bold px-2 py-0.5 rounded border',
          THREAT_COLORS[primaryTarget.threatLevel]
        )}>
          {primaryTarget.threatLevel.toUpperCase()}
        </div>
      </div>

      {/* Type + position */}
      <div className="grid grid-cols-2 gap-1.5">
        <div className="bg-terminal-panel rounded p-1.5 border border-terminal-border">
          <div className="text-[9px] text-terminal-text-faint">TYPE</div>
          <div className="text-[11px] text-terminal-text font-bold uppercase">{primaryTarget.type}</div>
        </div>
        <div className="bg-terminal-panel rounded p-1.5 border border-terminal-border">
          <div className="text-[9px] text-terminal-text-faint">STATUS</div>
          <div className={clsx(
            'text-[11px] font-bold',
            isTracking ? 'text-terminal-red' : 'text-terminal-text-dim'
          )}>
            {isTracking ? '● TRACKED' : '○ UNCONFIRMED'}
          </div>
        </div>
        <div className="bg-terminal-panel rounded p-1.5 border border-terminal-border">
          <div className="text-[9px] text-terminal-text-faint flex items-center gap-1"><MapPin className="w-2.5 h-2.5" /> LAT</div>
          <div className="text-[11px] text-terminal-green font-mono">{primaryTarget.position.lat.toFixed(4)}°N</div>
        </div>
        <div className="bg-terminal-panel rounded p-1.5 border border-terminal-border">
          <div className="text-[9px] text-terminal-text-faint flex items-center gap-1"><MapPin className="w-2.5 h-2.5" /> LNG</div>
          <div className="text-[11px] text-terminal-green font-mono">{primaryTarget.position.lng.toFixed(4)}°E</div>
        </div>
      </div>

      {/* Metadata flags */}
      <div className="flex flex-wrap gap-1">
        {primaryTarget.metadata.phoneMetadata && (
          <span className="flex items-center gap-1 text-[9px] bg-terminal-blue-dim border border-terminal-blue/40 text-terminal-blue px-1.5 py-0.5 rounded">
            <Phone className="w-2.5 h-2.5" /> SIM METADATA
          </span>
        )}
        {primaryTarget.metadata.patternDays && (
          <span className="flex items-center gap-1 text-[9px] bg-terminal-amber-dim border border-terminal-amber/40 text-terminal-amber px-1.5 py-0.5 rounded">
            <Clock className="w-2.5 h-2.5" /> {primaryTarget.metadata.patternDays}d PATTERN
          </span>
        )}
        {primaryTarget.metadata.associatedTargets?.length && (
          <span className="flex items-center gap-1 text-[9px] bg-terminal-red-dim border border-terminal-red/40 text-terminal-red px-1.5 py-0.5 rounded">
            <Users className="w-2.5 h-2.5" /> NETWORK LINK
          </span>
        )}
      </div>

      {/* Intel notes */}
      {primaryTarget.metadata.notes && (
        <div className="border-t border-terminal-border pt-2">
          <div className="text-[9px] text-terminal-text-faint mb-1 tracking-widest">ANALYST NOTES</div>
          <p className="text-[10px] text-terminal-text-dim leading-relaxed">
            {primaryTarget.metadata.notes}
          </p>
        </div>
      )}

      {/* Based on disclosure */}
      {activeScenario?.basedOn && (
        <div className="border-t border-terminal-border pt-2">
          <p className="text-[9px] text-terminal-amber/80 leading-relaxed">
            ℹ {activeScenario.basedOn}
          </p>
        </div>
      )}
    </div>
  );
}
