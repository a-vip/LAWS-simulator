'use client';
import { useState } from 'react';
import { useSimulationStore } from '@/store/simulation';
import { HelpCircle, X, AlertOctagon, ShieldAlert, Cpu } from 'lucide-react';
import clsx from 'clsx';

export function ConfidenceDisplay() {
  const { confidenceScore, activeScenario, phase } = useSimulationStore();
  const [showModal, setShowModal] = useState(false);
  
  const threshold = activeScenario?.confidenceThreshold ?? 70;
  const isAbove = confidenceScore >= threshold;
  const isActive = phase !== 'idle';

  const color = confidenceScore >= 80 ? '#ff1a2e'
    : confidenceScore >= threshold ? '#ffaa00'
    : confidenceScore >= 40 ? '#ffd060'
    : '#00d47e';

  const thresholdPct = threshold;
  const scorePct = Math.min(confidenceScore, 100);

  return (
    <>
      <div 
        onClick={() => isActive && setShowModal(true)}
        className={clsx(
          'bg-terminal-card border rounded p-3 space-y-2 font-mono transition-all duration-300 relative group',
          isActive ? 'cursor-pointer hover:border-terminal-blue/50 hover:shadow-lg border-terminal-border' : 'border-terminal-border/40 opacity-75'
        )}
      >
        {/* Help icon indicator */}
        {isActive && (
          <div className="absolute top-2 right-2 text-terminal-text-faint group-hover:text-terminal-blue transition-colors pointer-events-none">
            <HelpCircle className="w-3.5 h-3.5 animate-pulse" />
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-center pr-4">
          <span className="text-[10px] tracking-widest text-terminal-text-dim">CONFIDENCE SCORE</span>
          <span
            className="text-xs font-bold"
            style={{ color }}
          >
            {isActive ? `${confidenceScore.toFixed(1)}%` : '—'}
          </span>
        </div>

        {/* Bar */}
        <div className="relative h-3 bg-terminal-panel rounded-sm overflow-hidden border border-terminal-border">
          {/* Filled bar */}
          <div
            className="absolute inset-y-0 left-0 transition-all duration-300"
            style={{
              width: `${scorePct}%`,
              background: `linear-gradient(90deg, #005c36, ${color})`,
            }}
          />
          {/* Threshold marker */}
          <div
            className="absolute inset-y-0 w-px bg-terminal-amber/80 z-10"
            style={{ left: `${thresholdPct}%` }}
            title={`Threshold: ${threshold}%`}
          />
          {/* Threshold flag */}
          <div
            className="absolute -top-0.5 text-[8px] text-terminal-amber translate-x-1"
            style={{ left: `${thresholdPct}%` }}
          >
            ▼
          </div>
        </div>

        {/* Labels */}
        <div className="flex justify-between text-[9px] text-terminal-text-faint">
          <span>0%</span>
          <span className="text-terminal-amber">THRESHOLD: {threshold}%</span>
          <span>100%</span>
        </div>

        {/* Status row */}
        {isActive && (
          <div className={clsx(
            'mt-1 py-1 px-2 rounded text-center text-[10px] font-bold tracking-widest border',
            isAbove
              ? 'bg-terminal-red-dim border-terminal-red text-terminal-red'
              : 'bg-terminal-green-dim border-terminal-green text-terminal-green'
          )}>
            {isAbove ? '⚠ ENGAGEMENT ELIGIBLE' : 'ANALYSIS IN PROGRESS'}
          </div>
        )}

        {/* What this means */}
        {isActive && (
          <div className="text-[9px] text-terminal-text-faint leading-relaxed border-t border-terminal-border pt-2 mt-1">
            {isAbove ? (
              <>
                <span className="text-terminal-red">ABOVE LETHAL THRESHOLD.</span>{' '}
                System assesses {confidenceScore.toFixed(0)}% probability of target match. This means a{' '}
                <span className="text-terminal-amber">{(100 - confidenceScore).toFixed(0)}% probability</span> the assessment is wrong.
              </>
            ) : (
              <>Confidence at {confidenceScore.toFixed(0)}%. System requires {threshold}% to trigger engagement authorization.</>
            )}
            <span className="block mt-1 text-[8px] text-terminal-blue underline group-hover:text-terminal-blue-bright">
              Click to view algorithmic analysis breakdown →
            </span>
          </div>
        )}
      </div>

      {/* Explanation Modal */}
      {showModal && isActive && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none font-mono p-4">
          <div className="max-w-md w-full pointer-events-auto bg-terminal-panel border border-terminal-blue rounded shadow-2xl overflow-hidden animate-fade-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-terminal-blue-dim/40 border-b border-terminal-blue/40">
              <div className="flex items-center gap-2 text-terminal-blue font-bold text-xs tracking-wider">
                <Cpu className="w-4 h-4 text-terminal-blue" />
                ALGORITHMIC TARGETING METRICS
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="text-terminal-text-dim hover:text-terminal-text"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 space-y-4 text-[11px] leading-relaxed">
              <div>
                <div className="text-[9px] tracking-widest text-terminal-text-dim mb-1 uppercase font-bold">What the Score Represents</div>
                <p className="text-terminal-text-dim">
                  In autonomous military systems, a "Confidence Score" is not a moral or visual certainty. It is a **heuristic math probability** based on incomplete sensor correlation, signal intelligence, and facial profiling algorithms.
                </p>
              </div>

              {/* Inverse box */}
              <div className="bg-terminal-red-dim/20 border border-terminal-red/30 rounded p-3">
                <div className="flex items-center gap-2 text-terminal-red font-bold text-[10px] mb-1">
                  <AlertOctagon className="w-4 h-4 shrink-0" />
                  THE DEADLY INVERSE
                </div>
                <p className="text-terminal-text-dim">
                  Currently, the system is <span className="text-terminal-red font-bold">{confidenceScore.toFixed(0)}% confident</span> of a target match. 
                  This leaves a <span className="text-terminal-amber font-bold">{(100 - confidenceScore).toFixed(0)}% probability</span> that the system is **incorrect**. 
                  In lethal terms, this represents a **{(100 - confidenceScore).toFixed(0)}% chance of executing an innocent person** due to machine error.
                </p>
              </div>

              {/* How it is calculated */}
              <div>
                <div className="text-[9px] tracking-widest text-terminal-text-dim mb-1.5 uppercase font-bold">Algorithmic Heuristics Weighting</div>
                <div className="space-y-1.5 border border-terminal-border rounded p-2.5 bg-black/20">
                  <div className="flex justify-between">
                    <span className="text-terminal-text">SIM signals tracking:</span>
                    <span className="font-bold text-terminal-blue">Weight: 40%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-terminal-text">Geospatial grouping history:</span>
                    <span className="font-bold text-terminal-blue">Weight: 30%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-terminal-text">Behavioral vector tracking:</span>
                    <span className="font-bold text-terminal-blue">Weight: 20%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-terminal-text">Sparsely-mapped associate link:</span>
                    <span className="font-bold text-terminal-blue">Weight: 10%</span>
                  </div>
                </div>
              </div>

              {/* Real world correlation */}
              <div className="bg-terminal-amber-dim/10 border border-terminal-amber/20 rounded p-3">
                <div className="flex items-center gap-1.5 text-terminal-amber font-bold text-[10px] mb-1">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  REAL-WORLD CASE STUDIES
                </div>
                <p className="text-terminal-text-dim text-[10px]">
                  During drone strikes in conflict theatres, strikes are regularly authorized at **50% to 70% confidence threshold levels**. The +972 Magazine investigation in 2024 revealed that systems like "Lavender" operated at a pre-set **10% error-tolerance threshold**, meaning up to **3,700 innocent people** were programmatically labeled as targets and executed with civilian families.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-4 py-3 border-t border-terminal-border bg-terminal-panel/50 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-1.5 bg-terminal-blue-dim border border-terminal-blue text-terminal-blue hover:bg-terminal-blue/20 rounded text-[10px] font-bold uppercase transition-colors"
              >
                Acknowledge & Close Briefing
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
