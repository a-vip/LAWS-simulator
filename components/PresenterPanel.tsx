'use client';
import { useEffect, useState } from 'react';
import { useSimulationStore } from '@/store/simulation';
import { Info, HelpCircle, ShieldAlert, BookOpen } from 'lucide-react';
import clsx from 'clsx';

const ADVOCACY_NOTES: Record<string, Record<string, string>> = {
  'pattern-of-life': {
    general: 'Based on JSOC "Pattern of Life" targeting in Yemen/Pakistan. Demonstrates the danger of targeting based on digital signatures and signals intelligence rather than visual confirmation of hostile intent.',
    doctrine: 'Phase represents "Find, Fix, Track" doctrine. In real systems, metadata correlations (e.g. mobile SIM tracking) are treated as physical target identifiers.',
    law: 'Violates IHL Distinction principle (Article 48, 51, 52). Profiling based on movement models cannot distinguish between a combatant and a civilian returning home.',
    ask: 'Moratorium on signals-intelligence-only strikes. Human operators must visually verify target identity and intent before lethal authorization.',
  },
  'building-strike': {
    general: 'Based on urban strikes in Iraq and Syria. Highlights the unacceptable practice of authorizing attacks on civilian structures based on low-confidence algorithmic match percentages.',
    doctrine: 'Structure targeting models process static sensor feeds to predict occupancy and command value. 63% confidence represents a 37% chance of strike on a civilian shelter.',
    law: 'Violates IHL Proportionality principle. When target status is uncertain, the presumption of civilian status must hold (Geneva Conventions Protocol I, Art. 50.1).',
    ask: 'International treaty requiring positive, high-confidence human identification of military objectives before target classification.',
  },
  'wedding-strike': {
    general: 'Based on the tragic Al-Radah wedding convoy strike (Yemen, 2013). Shows how group movement algorithms classify peaceful social activities as military convoys.',
    doctrine: 'Convoy threat classification uses velocity, grouping index, and coordinates to classify formations. Trust in automated sensor fusion leads directly to tragedy.',
    law: 'Violates IHL Article 57 (Precautions in Attack). Operators failed to take all feasible precautions to verify the group was not civilian before deploying ordnance.',
    ask: 'A legally binding instrument ensuring meaningful human control over weapon selection and the cognitive capability to cancel engagements.',
  },
  'autonomous-engagement': {
    general: 'Simulates a fully autonomous killer robot. Eliminates the human from the decision-making loop entirely. This is the ultimate danger of the LAWS capability.',
    doctrine: 'Sensor-to-shooter loop is fully closed. Algorithms select, track, authorize, and strike in milliseconds, exceeding human cognitive feedback limits.',
    law: 'Accountability Gap. Under current frameworks, no commander, analyst, or programmer can be held individually responsible for autonomous machine error.',
    ask: 'A total ban on fully autonomous lethal weapons systems. Human control must be legally mandated at the point of weapon release.',
  },
  'signature-strike': {
    general: 'Based on the controversial Signature Strike protocols in the Pakistan FATA regions. Targets are chosen based on behaviors (carrying objects, grouping) without knowing names.',
    doctrine: 'Behavioral profiling matches. The system profiles individuals based on object length (farms tools vs. rifles) observed from 10,000 feet.',
    law: 'Violates the basic right to life and due process. Target is treated as combatant based purely on geographic profiling, without combat participation.',
    ask: 'Universal declaration outlawing signature strike practices. Prohibition of profiling military-age males as automatic targets.',
  },
  'facial-recognition': {
    general: 'Based on investigations into Israeli AI systems like "Lavender" (Gaza, 2024). Explores the industrial scale of algorithmic selection that flags tens of thousands of targets.',
    doctrine: 'Mass target generation. The machine processes vast surveillance streams to automatically add citizens to "kill lists" with low-confidence margins.',
    law: 'Violates distinction and precautions. Treats entire residential populations as target pools and accepts massive collateral structures for low-rank targets.',
    ask: 'Prohibition on AI-generated target databases and automatic "kill list" registries without individual human case review.',
  },
  'drone-swarm': {
    general: 'Simulates a DARPA OFFSET style Perdix drone swarm. Multiple targets are processed in parallel, making human oversight a cognitive impossibility.',
    doctrine: 'Distributed cooperative engagement. Swarm nodes communicate, assign targets, and request authorization simultaneously, creating severe cognitive overload.',
    law: 'Failure of meaningful control. When one operator oversees 50 simultaneous actions, human supervision is reduced to a meaningless "rubber stamp".',
    ask: 'Treaty limits restricting swarm deployment size to levels that can be fully, individually, and actively supervised by human minds in real-time.',
  },
};

export function PresenterPanel() {
  const { phase, activeScenario } = useSimulationStore();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'p') {
        setVisible((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!visible) return null;

  const scenarioId = activeScenario?.id ?? 'pattern-of-life';
  const notes = ADVOCACY_NOTES[scenarioId] || ADVOCACY_NOTES['pattern-of-life'];

  return (
    <div className="fixed top-14 left-4 z-[80] max-w-sm w-full bg-terminal-panel/95 border border-terminal-blue/60 text-terminal-text rounded shadow-2xl font-mono text-[11px] backdrop-blur pointer-events-auto p-3 animate-slide-in-right">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-terminal-blue/30 pb-1.5 mb-2">
        <div className="flex items-center gap-1.5 text-terminal-blue font-bold tracking-widest text-[10px]">
          <BookOpen className="w-3.5 h-3.5" />
          PRESENTER BRIEFING PANEL
        </div>
        <span className="text-[8px] bg-terminal-blue-dim border border-terminal-blue text-terminal-blue px-1 rounded">
          KEY: P TOGGLES
        </span>
      </div>

      <div className="space-y-2.5">
        {/* Scenario Context */}
        <div className="bg-terminal-blue-dim/20 border border-terminal-blue/20 rounded p-2">
          <div className="font-bold text-terminal-blue text-[9px] mb-1 uppercase tracking-wider">
            SCENARIO ORIGINS & CONTEXT
          </div>
          <p className="text-[10px] text-terminal-text-dim leading-relaxed">
            {notes.general}
          </p>
        </div>

        {/* Phase Notes */}
        <div className="space-y-1.5 border-t border-terminal-border pt-2">
          <div className="font-bold text-terminal-amber text-[9px] uppercase tracking-wider">
            PHASE OBSERVATIONS ({phase.replace(/_/g, ' ').toUpperCase()})
          </div>

          <div className="space-y-2">
            <div className="flex gap-2">
              <Info className="w-3.5 h-3.5 text-terminal-blue shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-terminal-text-header block text-[9px]">Targeting Doctrine:</span>
                <span className="text-terminal-text-dim text-[10px]">{notes.doctrine}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <ShieldAlert className="w-3.5 h-3.5 text-terminal-red shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-terminal-red block text-[9px]">Legal Framework / Gaps:</span>
                <span className="text-terminal-text-dim text-[10px]">{notes.law}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <HelpCircle className="w-3.5 h-3.5 text-terminal-green shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-terminal-green block text-[9px]">Advocacy Request:</span>
                <span className="text-terminal-text-dim text-[10px] font-bold">{notes.ask}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
