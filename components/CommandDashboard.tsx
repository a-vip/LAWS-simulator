'use client';
import { useState } from 'react';
import { useSimulationStore } from '@/store/simulation';
import { SCENARIOS } from '@/lib/scenarios';
import {
  Shield, Radio, Server, Activity, ArrowRight, Eye, ShieldAlert,
  Target, Users, MapPin, AlertTriangle, ChevronRight, Globe,
} from 'lucide-react';
import clsx from 'clsx';
import { IHLPolicyModal } from './IHLPolicyModal';

// Colour system per operational column
const COLS = [
  {
    id: 'surveillance',
    title: 'SURVEILLANCE & PROFILING',
    subtitle: 'Pattern-of-life analysis · Mass data collection',
    status: 'ACTIVE SCANNING',
    accent: '#0096ff',
    border: 'border-terminal-blue',
    headerBg: 'bg-terminal-blue/10',
    badgeBg: 'bg-terminal-blue/20 text-terminal-blue',
    scenarios: [SCENARIOS[0], SCENARIOS[4]],
  },
  {
    id: 'legal-audit',
    title: 'LEGAL AUDIT & THRESHOLD',
    subtitle: 'IHL compliance checks · Authorization chain',
    status: 'AWAITING CLEARANCE',
    accent: '#ffaa00',
    border: 'border-terminal-amber',
    headerBg: 'bg-terminal-amber/10',
    badgeBg: 'bg-terminal-amber/20 text-terminal-amber',
    scenarios: [SCENARIOS[1], SCENARIOS[2]],
  },
  {
    id: 'active-execution',
    title: 'TACTICAL EXECUTION',
    subtitle: 'Terminal engagement · Autonomous strike',
    status: 'AUTONOMOUS LAUNCH',
    accent: '#ff1a2e',
    border: 'border-terminal-red',
    headerBg: 'bg-terminal-red/10',
    badgeBg: 'bg-terminal-red/20 text-terminal-red',
    scenarios: [SCENARIOS[3]],
  },
];

function ThreatBadge({ level }: { level: string }) {
  const cfg = {
    low: { color: '#00d47e', label: 'LOW' },
    medium: { color: '#ffaa00', label: 'MED' },
    high: { color: '#ff6600', label: 'HIGH' },
    critical: { color: '#ff1a2e', label: 'CRITICAL' },
  }[level] ?? { color: '#536878', label: level.toUpperCase() };

  return (
    <span
      className="text-[7px] font-black px-1.5 py-0.5 rounded border uppercase tracking-widest"
      style={{ color: cfg.color, borderColor: cfg.color + '55', background: cfg.color + '14' }}
    >
      {cfg.label}
    </span>
  );
}

function ScenarioCard({ sc, accent }: { sc: typeof SCENARIOS[0]; accent: string }) {
  const { loadScenario } = useSimulationStore();
  const [hovered, setHovered] = useState(false);
  const primary = sc.targets.find((t) => t.id === sc.primaryTargetId);

  const collateralCount = sc.collateralEstimate?.reduce((s, c) => s + c.count, 0) ?? 0;

  return (
    <div
      onClick={() => loadScenario(sc)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative bg-black/30 border border-terminal-border rounded cursor-pointer flex flex-col space-y-2 overflow-hidden transition-all duration-300 hover:border-opacity-70 p-3"
      style={{
        borderColor: hovered ? accent + '70' : undefined,
        boxShadow: hovered ? `0 0 18px ${accent}18, inset 0 0 12px ${accent}06` : 'none',
      }}
    >
      {/* Scanning line animation */}
      {hovered && (
        <div
          className="absolute left-0 right-0 h-px pointer-events-none animate-scan-line"
          style={{ background: `linear-gradient(90deg, transparent, ${accent}90, transparent)`, top: '40%' }}
        />
      )}

      {/* Title row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col min-w-0">
          <span
            className="text-[11px] font-black uppercase tracking-wide truncate transition-colors"
            style={{ color: hovered ? accent : '#ccd6e0' }}
          >
            {sc.title}
          </span>
          <span className="text-[8px] text-terminal-text-faint mt-0.5 truncate">{sc.subtitle}</span>
        </div>
        {primary && <ThreatBadge level={primary.threatLevel} />}
      </div>

      {/* Based-on citation */}
      {sc.basedOn && (
        <div
          className="text-[7px] leading-tight px-1.5 py-0.5 rounded border"
          style={{ color: accent + 'bb', borderColor: accent + '22', background: accent + '0a' }}
        >
          ◈ {sc.basedOn}
        </div>
      )}

      {/* Meta grid */}
      <div className="grid grid-cols-3 gap-1 text-[7.5px] border-t border-b border-terminal-border/40 py-1.5">
        <div>
          <div className="text-terminal-text-faint flex items-center gap-0.5 mb-0.5">
            <MapPin className="w-2.5 h-2.5" /> COORDS
          </div>
          <div className="text-terminal-green font-mono font-bold">
            {sc.location.lat.toFixed(2)}°N
          </div>
          <div className="text-terminal-green font-mono font-bold">
            {sc.location.lng.toFixed(2)}°E
          </div>
        </div>
        <div>
          <div className="text-terminal-text-faint flex items-center gap-0.5 mb-0.5">
            <Target className="w-2.5 h-2.5" /> TARGET
          </div>
          <div className="text-terminal-text font-bold uppercase">{primary?.type ?? '—'}</div>
          <div className="text-terminal-text-faint">{primary?.designator?.split(' ').slice(0, 2).join(' ')}</div>
        </div>
        <div>
          <div className="text-terminal-text-faint flex items-center gap-0.5 mb-0.5">
            <Users className="w-2.5 h-2.5" /> COLLAT.
          </div>
          <div className="font-bold" style={{ color: collateralCount > 3 ? '#ff1a2e' : '#ffaa00' }}>
            {collateralCount > 0 ? `EST. ${collateralCount}` : 'UNKNOWN'}
          </div>
          <div className="text-terminal-text-faint">casualties</div>
        </div>
      </div>

      {/* Legal context blurb */}
      {sc.legalContext?.legalGap && (
        <div className="text-[7px] text-terminal-text-dim leading-tight line-clamp-2">
          ⚖ {sc.legalContext.legalGap.substring(0, 120)}…
        </div>
      )}

      {/* CTA footer */}
      <div
        className="flex items-center justify-between text-[9px] font-black pt-0.5 border-t border-terminal-border/30"
        style={{ color: accent }}
      >
        <span className="flex items-center gap-1">
          <Eye className="w-3 h-3" />
          LOAD LIVE FEED
        </span>
        <ChevronRight
          className="w-4 h-4 transition-transform"
          style={{ transform: hovered ? 'translateX(3px)' : 'none' }}
        />
      </div>
    </div>
  );
}

export function CommandDashboard() {
  const { loadScenario, viewMode, setViewMode } = useSimulationStore();
  const [showIHL, setShowIHL] = useState(false);

  if (viewMode !== 'dashboard') return null;

  return (
    <>
      {showIHL && <IHLPolicyModal onClose={() => setShowIHL(false)} />}
      <div className="flex-1 flex flex-col p-4 font-mono overflow-y-auto bg-terminal-bg select-none animate-fade-in gap-4">

        {/* ── SYSTEM METRICS BAR ──────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
          <div className="bg-terminal-card border border-terminal-border rounded p-3 flex items-center justify-between">
            <div>
              <div className="text-[8px] text-terminal-text-faint uppercase tracking-widest">COMMAND SYSTEM</div>
              <div className="text-[12px] font-black text-terminal-green mt-1 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" /> ONLINE // DEPLOYED
              </div>
            </div>
            <Activity className="w-5 h-5 text-terminal-green/50 animate-pulse" />
          </div>

          <div className="bg-terminal-card border border-terminal-border rounded p-3 flex items-center justify-between">
            <div>
              <div className="text-[8px] text-terminal-text-faint uppercase tracking-widest">PLATFORM</div>
              <div className="text-[12px] font-black text-terminal-blue mt-1 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5" /> MQ-9 REAPER LINK
              </div>
            </div>
            <Server className="w-5 h-5 text-terminal-blue/50" />
          </div>

          <div className="bg-terminal-card border border-terminal-border rounded p-3 flex items-center justify-between">
            <div>
              <div className="text-[8px] text-terminal-text-faint uppercase tracking-widest">SCENARIOS LOADED</div>
              <div className="text-[14px] font-black text-terminal-text mt-0.5">
                {SCENARIOS.length} DOCUMENTED
              </div>
            </div>
            <Globe className="w-5 h-5 text-terminal-text-faint" />
          </div>

          <button
            onClick={() => setShowIHL(true)}
            className="bg-terminal-card border border-terminal-red/40 hover:border-terminal-red rounded p-3 flex items-center justify-between w-full text-left transition-all hover:bg-terminal-red-dim/10 group cursor-pointer"
            title="Click to view LAWS treaty status by country"
          >
            <div>
              <div className="text-[8px] text-terminal-text-faint uppercase tracking-widest">IHL POLICY FILTER</div>
              <div className="text-[12px] font-black text-terminal-red mt-1 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" /> NO BINDING TREATY
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-[8px] bg-terminal-red-dim border border-terminal-red text-terminal-red px-1 rounded animate-pulse">WARNING</span>
              <span className="text-[7px] text-terminal-text-faint group-hover:text-terminal-red transition-colors">VIEW DATA ↗</span>
            </div>
          </button>
        </div>

        {/* ── ADVOCACY BANNER ─────────────────────────────────────────────── */}
        <div
          className="shrink-0 rounded border px-3 py-2 text-[7.5px] leading-relaxed"
          style={{
            background: 'rgba(255,26,46,0.04)',
            borderColor: 'rgba(255,26,46,0.22)',
            color: '#8892a4',
          }}
        >
          <span style={{ color: '#ff1a2e', fontWeight: 900 }}>⚠ EDUCATIONAL SIMULATION — </span>
          The scenarios below are based on documented, real-world autonomous weapons deployments. Each demonstrates a distinct failure mode in the lawful conduct of war: target misidentification, mass-casualty errors, removed human accountability, and violations of IHL. 
          <span style={{ color: '#ffaa00' }}> Select any scenario to engage the live tactical feed.</span>
        </div>

        {/* ── 3-COLUMN KANBAN ─────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col md:flex-row gap-4 overflow-hidden min-h-[380px]">
          {COLS.map((col) => (
            <div
              key={col.id}
              className={clsx('flex-1 border rounded flex flex-col overflow-hidden', col.border)}
              style={{ background: 'rgba(5,8,14,0.7)' }}
            >
              {/* Column header */}
              <div className={clsx('px-3 py-2.5 border-b flex items-center justify-between shrink-0', col.border, col.headerBg)}>
                <div>
                  <div className="text-[9px] font-black uppercase tracking-widest" style={{ color: col.accent }}>
                    {col.title}
                  </div>
                  <div className="text-[7px] text-terminal-text-faint mt-0.5 uppercase">{col.subtitle}</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={clsx('text-[7px] px-1.5 py-0.5 rounded font-black uppercase', col.badgeBg)}>
                    {col.scenarios.length} NODE{col.scenarios.length !== 1 ? 'S' : ''}
                  </span>
                  <span className="text-[6.5px] text-terminal-text-faint animate-pulse">{col.status}</span>
                </div>
              </div>

              {/* Cards */}
              <div className="flex-1 p-3 overflow-y-auto space-y-3">
                {col.scenarios.map((sc) => (
                  <ScenarioCard key={sc.id} sc={sc} accent={col.accent} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ── BOTTOM ATTRIBUTION ──────────────────────────────────────────── */}
        <div className="shrink-0 text-[6.5px] text-terminal-text-faint text-center">
          Based on documented JSOC, IDF Lavender, UN CCW, and ICRC LAWS incident reports · For advocacy use only
        </div>

      </div>
    </>
  );
}
