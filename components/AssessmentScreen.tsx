'use client';
import { useSimulationStore } from '@/store/simulation';
import { useEffect, useState, useRef } from 'react';
import { SCENARIOS } from '@/lib/scenarios';
import { Scale, HeartHandshake, ShieldAlert, ExternalLink } from 'lucide-react';
import clsx from 'clsx';
import QRCode from 'qrcode';

export function AssessmentScreen() {
  const { phase, activeScenario, resetSimulation, loadScenario } = useSimulationStore();
  const [visible, setVisible] = useState(false);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (phase === 'assessment') {
      const t = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(t);
    }
    setVisible(false);
  }, [phase]);

  // Generate QR code client-side on mount / visibility
  useEffect(() => {
    if (visible && qrCanvasRef.current) {
      QRCode.toCanvas(
        qrCanvasRef.current,
        'https://www.stopkillerrobots.org',
        {
          width: 72,
          margin: 1,
          color: {
            dark: '#050a12',
            light: '#ffffff',
          },
        },
        (error) => {
          if (error) console.error('QR code generation error', error);
        }
      );
    }
  }, [visible]);

  if (!visible || !activeScenario) return null;

  const collateral = activeScenario.collateralEstimate ?? [];
  const narrative = activeScenario.narrative.assessment ?? '';

  // Trigger next scenario rotation
  const handleNextScenario = () => {
    const currentIdx = SCENARIOS.findIndex((s) => s.id === activeScenario.id);
    const nextIdx = (currentIdx + 1) % SCENARIOS.length;
    resetSimulation();
    setTimeout(() => {
      loadScenario(SCENARIOS[nextIdx]);
    }, 500);
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center pointer-events-none font-mono p-4 overflow-y-auto"
      style={{ zIndex: 99999 }}
    >
      <div className="max-w-xl w-full pointer-events-auto bg-terminal-panel border border-terminal-border rounded shadow-2xl animate-fade-in my-8">
        {/* Header */}
        <div className="px-4 py-3 border-b border-terminal-border bg-terminal-card rounded-t flex justify-between items-center">
          <div>
            <div className="text-[10px] tracking-widest text-terminal-text-faint">POST-STRIKE</div>
            <div className="text-terminal-text font-bold text-sm">BATTLE DAMAGE ASSESSMENT</div>
            <div className="text-terminal-text-dim text-[10px] mt-0.5">{activeScenario.title}</div>
          </div>
          <span className="text-[9px] bg-terminal-red-dim border border-terminal-red text-terminal-red px-2 py-0.5 rounded font-bold uppercase animate-pulse">
            REPORT FILED
          </span>
        </div>

        {/* Assessment Text */}
        <div className="p-4 space-y-4">
          <p className="text-[11px] text-terminal-text leading-relaxed border-l-2 border-terminal-red pl-3 bg-black/10 py-1">
            {narrative}
          </p>

          {/* Casualty Table */}
          {collateral.length > 0 && (
            <div>
              <div className="text-[10px] tracking-widest text-terminal-text-dim mb-1.5 uppercase font-bold">CASUALTY RECORD</div>
              <div className="border border-terminal-border rounded overflow-hidden">
                {collateral.map((row, i) => (
                  <div
                    key={i}
                    className={clsx(
                      'flex justify-between px-3 py-1.5 text-[11px]',
                      i % 2 === 0 ? 'bg-terminal-panel' : 'bg-terminal-card',
                      row.type.toLowerCase().includes('children') || row.type.toLowerCase().includes('minor') || row.type.toLowerCase().includes('civilian')
                        ? 'text-terminal-red font-bold'
                        : row.type.toLowerCase().includes('confirmed combatant') || row.type.toLowerCase().includes('neutralized')
                        ? 'text-terminal-green'
                        : 'text-terminal-text'
                    )}
                  >
                    <span>{row.type}</span>
                    <span className="font-bold">{row.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ⚖️ Legal Framework Citation Section */}
          {activeScenario.legalContext && (
            <div className="border border-terminal-blue/30 rounded p-3 bg-terminal-blue-dim/10 text-[10px] leading-relaxed space-y-1.5">
              <div className="font-bold text-terminal-blue uppercase mb-1.5 flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-terminal-blue" />
                ADVOCACY LEGAL FRAMEWORK
              </div>
              <div>
                <span className="text-terminal-text font-bold block text-[9.5px]">Applicable Law:</span>
                <span className="text-terminal-text-dim">{activeScenario.legalContext.applicableLaw}</span>
              </div>
              <div>
                <span className="text-terminal-red font-bold block text-[9.5px]">Regulatory Vacuum:</span>
                <span className="text-terminal-text-dim">{activeScenario.legalContext.legalGap}</span>
              </div>
              <div>
                <span className="text-terminal-amber font-bold block text-[9.5px]">UN CCW Negotiation Status:</span>
                <span className="text-terminal-text-dim">{activeScenario.legalContext.treatyStatus}</span>
              </div>
              <div className="border-t border-terminal-blue/20 pt-1.5 mt-1">
                <span className="text-terminal-green font-bold block text-[9.5px]">Stop Killer Robots Policy Ask:</span>
                <span className="text-terminal-text font-bold">{activeScenario.legalContext.advocacyAsk}</span>
              </div>
            </div>
          )}

          {/* "What You Can Do" CTA Box with QR Code */}
          <div className="bg-terminal-green-dim/10 border border-terminal-green/30 rounded p-3 flex gap-3 items-center">
            <div className="flex-1 space-y-1.5 text-[10px]">
              <div className="font-bold text-terminal-green uppercase flex items-center gap-1.5">
                <HeartHandshake className="w-4 h-4 text-terminal-green" />
                TAKE ACTION TODAY
              </div>
              <p className="text-terminal-text-dim leading-normal">
                Autonomous killing by machines is not inevitable. You can help establish a legally binding instrument to ban lethal autonomous weapons.
              </p>
              <div className="flex flex-wrap gap-2 pt-0.5">
                <a
                  href="https://www.stopkillerrobots.org/join-us/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-terminal-blue hover:underline font-bold"
                >
                  Sign Open Letter <ExternalLink className="w-2.5 h-2.5" />
                </a>
                <span className="text-terminal-text-faint">•</span>
                <a
                  href="https://www.un.org/disarmament/the-convention-on-certain-conventional-weapons/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-terminal-blue hover:underline font-bold"
                >
                  UN CCW Consultations <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            </div>
            
            {/* Dynamic QR Handoff Canvas */}
            <div className="flex flex-col items-center gap-1 bg-white p-1 rounded shrink-0">
              <canvas ref={qrCanvasRef} className="w-[72px] h-[72px]" />
              <span className="text-[6.5px] text-[#050a12] font-bold uppercase tracking-wider">
                SCAN TO JOIN
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-2 border-t border-terminal-border">
            <button
              onClick={resetSimulation}
              className="flex-1 py-2 border border-terminal-border text-terminal-text-dim text-[10px] font-bold uppercase tracking-wider rounded hover:border-terminal-text-dim hover:text-terminal-text transition-colors"
            >
              [COMMAND HUB]
            </button>
            <button
              onClick={handleNextScenario}
              className="flex-1 py-2 bg-terminal-green-dim border border-terminal-green text-terminal-green text-[10px] font-bold uppercase tracking-wider rounded hover:bg-terminal-green/20 transition-colors"
            >
              Rotate Scenario →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
