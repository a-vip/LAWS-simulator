'use client';
import { useState } from 'react';
import { useSimulationStore } from '@/store/simulation';
import { SCENARIOS } from '@/lib/scenarios';
import { Shield, Radio, Server, Activity, ArrowRight, Eye, ShieldAlert } from 'lucide-react';
import clsx from 'clsx';
import { IHLPolicyModal } from './IHLPolicyModal';

export function CommandDashboard() {
  const { loadScenario, viewMode, setViewMode } = useSimulationStore();
  const [showIHL, setShowIHL] = useState(false);

  if (viewMode !== 'dashboard') return null;

  // Let's mock operational columns to distribute our scenarios realistically
  const columns = [
    {
      id: 'surveillance',
      title: 'surveillance & profiling',
      status: 'active scanning',
      color: 'border-terminal-blue text-terminal-blue bg-terminal-blue-dim/10',
      badge: 'bg-terminal-blue/20 text-terminal-blue',
      scenarios: [SCENARIOS[0], SCENARIOS[4]], // Pattern of life, Signature strike
    },
    {
      id: 'legal-audit',
      title: 'legal audit & threshold',
      status: 'awaiting clearance',
      color: 'border-terminal-amber text-terminal-amber bg-terminal-amber-dim/10',
      badge: 'bg-terminal-amber/20 text-terminal-amber',
      scenarios: [SCENARIOS[1], SCENARIOS[2]], // Structure strike, Wedding convoy
    },
    {
      id: 'active-execution',
      title: 'tactical execution',
      status: 'autonomous launch',
      color: 'border-terminal-red text-terminal-red bg-terminal-red-dim/10',
      badge: 'bg-terminal-red/20 text-terminal-red',
      scenarios: [SCENARIOS[3]], // Fully autonomous
    },
  ];

  return (
    <>
    {showIHL && <IHLPolicyModal onClose={() => setShowIHL(false)} />}
    <div className="flex-1 flex flex-col p-4 font-mono overflow-y-auto bg-terminal-bg select-none animate-fade-in space-y-4">
      {/* ── DIAGNOSTIC SYSTEM METRICS ──────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
        <div className="bg-terminal-card border border-terminal-border rounded p-3 flex items-center justify-between">
          <div>
            <div className="text-[9px] text-terminal-text-faint uppercase tracking-wider">COMMAND SYSTEM</div>
            <div className="text-[12px] font-bold text-terminal-green mt-1 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" /> ONLINE // DEPLOYED
            </div>
          </div>
          <Activity className="w-5 h-5 text-terminal-green/50 animate-pulse" />
        </div>

        <div className="bg-terminal-card border border-terminal-border rounded p-3 flex items-center justify-between">
          <div>
            <div className="text-[9px] text-terminal-text-faint uppercase tracking-wider">SECURE LINK</div>
            <div className="text-[12px] font-bold text-terminal-blue mt-1 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5" /> VERCEL EDGE
            </div>
          </div>
          <Server className="w-5 h-5 text-terminal-blue/50" />
        </div>

        <div className="bg-terminal-card border border-terminal-border rounded p-3 flex items-center justify-between">
          <div>
            <div className="text-[9px] text-terminal-text-faint uppercase tracking-wider">ACTIVE TARGET NODES</div>
            <div className="text-[13px] font-bold text-terminal-text mt-0.5">
              07 PROFILED
            </div>
          </div>
          <span className="text-[10px] text-terminal-amber-dim font-bold">GRID ACCURATE</span>
        </div>

        <button
          onClick={() => setShowIHL(true)}
          className="bg-terminal-card border border-terminal-red/40 hover:border-terminal-red rounded p-3 flex items-center justify-between w-full text-left transition-all hover:bg-terminal-red-dim/10 group cursor-pointer"
          title="Click to view LAWS treaty obligations by country"
        >
          <div>
            <div className="text-[9px] text-terminal-text-faint uppercase tracking-wider">IHL POLICY FILTER</div>
            <div className="text-[12px] font-bold text-terminal-red mt-1 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" /> NO BINDING TREATY
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-[8px] bg-terminal-red-dim border border-terminal-red text-terminal-red px-1 rounded animate-pulse">
              WARNING
            </span>
            <span className="text-[7px] text-terminal-text-faint group-hover:text-terminal-red transition-colors">VIEW TREATY DATA ↗</span>
          </div>
        </button>
      </div>

      {/* ── KANBAN WORKSPACE BOARD ────────────────────────────────── */}
      <div className="flex-1 flex flex-col md:flex-row gap-4 overflow-hidden min-h-[400px]">
        {columns.map((col) => (
          <div
            key={col.id}
            className="flex-1 bg-terminal-panel/40 border border-terminal-border rounded flex flex-col overflow-hidden"
          >
            {/* Column Header */}
            <div className={clsx('px-3 py-2.5 border-b flex justify-between items-center shrink-0', col.color)}>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider">{col.title}</span>
                <span className="text-[8px] opacity-75 uppercase mt-0.5">{col.status}</span>
              </div>
              <span className={clsx('text-[8px] px-1.5 py-0.5 rounded font-bold uppercase', col.badge)}>
                {col.scenarios.length} Nodes
              </span>
            </div>

            {/* Column Cards Container */}
            <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-black/20">
              {col.scenarios.map((sc) => {
                const primary = sc.targets.find((t) => t.id === sc.primaryTargetId);
                const threat = primary?.threatLevel ?? 'low';

                const threatColors = {
                  low: 'border-terminal-green/30 text-terminal-green bg-terminal-green-dim/10',
                  medium: 'border-terminal-amber/30 text-terminal-amber bg-terminal-amber-dim/10',
                  high: 'border-terminal-red/30 text-terminal-red bg-terminal-red-dim/10',
                  critical: 'border-terminal-red/40 text-terminal-red bg-terminal-red-dim/20 animate-pulse',
                }[threat];

                return (
                  <div
                    key={sc.id}
                    onClick={() => loadScenario(sc)}
                    className="bg-terminal-card border border-terminal-border hover:border-terminal-blue/60 transition-all duration-300 rounded p-3 cursor-pointer group flex flex-col space-y-2.5 hover:shadow-lg"
                  >
                    {/* Card Title */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-terminal-text-header group-hover:text-terminal-blue transition-colors">
                          {sc.title}
                        </span>
                        <span className="text-[8.5px] text-terminal-text-faint mt-0.5">
                          {sc.subtitle}
                        </span>
                      </div>
                      <span className={clsx('text-[7.5px] font-bold px-1.5 py-0.5 rounded border uppercase', threatColors)}>
                        {threat}
                      </span>
                    </div>

                    {/* Meta Details */}
                    <div className="grid grid-cols-2 gap-1.5 text-[8.5px] text-terminal-text-dim border-t border-b border-terminal-border py-1.5">
                      <div>
                        <span className="text-terminal-text-faint">LAT/LNG:</span><br />
                        <span className="text-terminal-green font-mono">{sc.location.lat.toFixed(3)}N / {sc.location.lng.toFixed(3)}E</span>
                      </div>
                      <div>
                        <span className="text-terminal-text-faint">TARGET CLASS:</span><br />
                        <span className="text-terminal-text uppercase font-bold">{primary?.type}</span>
                      </div>
                    </div>

                    {/* Trigger Action */}
                    <div className="flex items-center justify-between text-[9px] text-terminal-blue font-bold pt-0.5">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5 group-hover:animate-pulse" />
                        MONITOR LIVE FEED
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 translate-x-0 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
    </>
  );
}
