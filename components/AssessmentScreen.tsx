'use client';
import { useSimulationStore } from '@/store/simulation';
import { useEffect, useState, useRef } from 'react';
import { SCENARIOS } from '@/lib/scenarios';
import { Scale, HeartHandshake, ExternalLink, BookOpen, AlertTriangle, X, ClipboardList } from 'lucide-react';
import clsx from 'clsx';
import QRCode from 'qrcode';

// ─────────────────────────────────────────────────────────────────────────────
// Verified primary sources per scenario
// ─────────────────────────────────────────────────────────────────────────────
const SCENARIO_SOURCES: Record<string, {
  label: string; org: string; year: string; url: string; quote?: string;
}> = {
  'pattern-of-life': {
    label: 'The Drone Papers — Leaked JSOC Targeting Documents',
    org: 'The Intercept', year: '2015',
    url: 'https://theintercept.com/drone-papers/',
    quote: 'Leaked Pentagon slides expose how "pattern of life" analysis drives lethal strikes without confirmed identity.',
  },
  'building-strike': {
    label: 'US-Led Coalition Civilian Harm Archive (Iraq/Syria, 2015–2019)',
    org: 'Airwars', year: '2015–2019',
    url: 'https://airwars.org/conflict/u-s-led-coalition-in-iraq-syria/',
    quote: 'Documented cases of structures struck on algorithmic intelligence with zero confirmed military occupants.',
  },
  'wedding-strike': {
    label: '"A Wedding That Became a Funeral" — US Drone Attack on Marriage Procession in Yemen',
    org: 'Human Rights Watch', year: 'Feb 2014',
    url: 'https://www.hrw.org/report/2014/02/19/wedding-became-funeral/us-drone-attack-marriage-procession-yemen',
    quote: '12 killed, 15 wounded. All casualties described by witnesses as civilians. The US never officially acknowledged the strike.',
  },
  'autonomous-engagement': {
    label: 'Autonomous Weapon Systems — ICRC Position Paper',
    org: 'International Committee of the Red Cross (ICRC)', year: '2021',
    url: 'https://www.icrc.org/en/document/icrc-position-autonomous-weapon-systems',
    quote: '"The ICRC calls for new rules of international humanitarian law to prohibit unpredictable autonomous weapon systems."',
  },
  'signature-strike': {
    label: 'Pakistan Drone War — Casualty Database',
    org: 'Bureau of Investigative Journalism', year: '2008–2015',
    url: 'https://www.thebureauinvestigates.com/projects/drone-war/pakistan',
    quote: 'Signature strikes killed hundreds of unidentified "military-age males" — none named, none confirmed combatants.',
  },
  'facial-recognition': {
    label: '"Lavender": The AI Machine Directing Israel\'s Bombing Spree in Gaza',
    org: '+972 Magazine / Local Call', year: 'Apr 2024',
    url: 'https://www.972mag.com/lavender-ai-israeli-army-gaza/',
    quote: '37,000 targets generated autonomously. Officers spent ~20 seconds reviewing each before approving lethal strikes.',
  },
  'drone-swarm': {
    label: 'OFFSET: Offensive Swarm-Enabled Tactics Programme',
    org: 'DARPA (Official)', year: '2017–present',
    url: 'https://www.darpa.mil/program/offensive-swarm-enabled-tactics',
    quote: 'Official US military research into 250-drone autonomous swarms capable of operating without individual human control.',
  },
};

const SKR_PETITION_URL = 'https://stopkillerrobots.org/take-action/sign-our-petition-now/';
const SKR_ACTION_URL = 'https://stopkillerrobots.org/take-action/';
// Wikipedia: CCW Group of Governmental Experts on LAWS — verified live 2026-07-25
const UN_CCW_GGE_URL = 'https://en.wikipedia.org/wiki/Group_of_Governmental_Experts_on_Lethal_Autonomous_Weapons_Systems';
// Wikipedia: Convention on Certain Conventional Weapons — verified live 2026-07-25
const UN_CCW_TREATY_URL = 'https://en.wikipedia.org/wiki/Convention_on_Certain_Conventional_Weapons';

/** Returns the official ICRC IHL database URL for a given applicableLaw string */
function getIhlUrl(law: string): string {
  if (/Article\s*4[89]|Article\s*51/.test(law))
    return 'https://ihl-databases.icrc.org/en/ihl-treaties/api-1977/article-48';
  if (/Article\s*57/.test(law))
    return 'https://ihl-databases.icrc.org/en/ihl-treaties/api-1977/article-57';
  if (/Article\s*50/.test(law))
    return 'https://ihl-databases.icrc.org/en/ihl-treaties/api-1977/article-50';
  if (/Article\s*52/.test(law))
    return 'https://ihl-databases.icrc.org/en/ihl-treaties/api-1977/article-52';
  if (/CCW\s*Protocol\s*II|Booby.Trap/i.test(law))
    return 'https://en.wikipedia.org/wiki/Protocol_on_Mines,_Booby-Traps_and_Other_Devices';
  if (/Protocol\s*I|Geneva/.test(law))
    return 'https://ihl-databases.icrc.org/en/ihl-treaties/api-1977';
  if (/Command\s*Responsibility/.test(law))
    return 'https://ihl-databases.icrc.org/en/ihl-treaties/api-1977/article-86';
  if (/Fourth\s*Amendment/i.test(law))
    return 'https://en.wikipedia.org/wiki/Fourth_Amendment_to_the_United_States_Constitution';
  // Fallback — ICRC IHL treaties database
  return 'https://ihl-databases.icrc.org/en/ihl-treaties';
}


export function AssessmentScreen() {
  const { phase, activeScenario, resetSimulation, loadScenario } = useSimulationStore();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (phase === 'assessment') {
      const t = setTimeout(() => { setVisible(true); setDismissed(false); }, 600);
      return () => clearTimeout(t);
    }
    setVisible(false);
    setDismissed(false);
  }, [phase]);

  // QR code → petition page
  useEffect(() => {
    if (visible && !dismissed && qrCanvasRef.current) {
      QRCode.toCanvas(
        qrCanvasRef.current,
        SKR_PETITION_URL,
        { width: 76, margin: 1, color: { dark: '#050a12', light: '#ffffff' } },
        (error) => { if (error) console.error('QR error', error); }
      );
    }
  }, [visible, dismissed]);

  const handleClose = () => setDismissed(true);
  const handleReopen = () => setDismissed(false);

  const handleNextScenario = () => {
    if (!activeScenario) return;
    const currentIdx = SCENARIOS.findIndex((s) => s.id === activeScenario.id);
    const nextIdx = (currentIdx + 1) % SCENARIOS.length;
    resetSimulation();
    setTimeout(() => { loadScenario(SCENARIOS[nextIdx]); }, 500);
  };

  if (phase !== 'assessment' || !activeScenario) return null;

  const collateral = activeScenario.collateralEstimate ?? [];
  const narrative = activeScenario.narrative.assessment ?? '';
  const source = SCENARIO_SOURCES[activeScenario.id];

  // ── REOPEN TAB (shown when dismissed) ──────────────────────────────────
  if (dismissed) {
    return (
      <div className="fixed bottom-6 right-6 z-[99998] pointer-events-auto">
        <button
          onClick={handleReopen}
          className="flex items-center gap-2 bg-terminal-panel border border-terminal-red/60 text-terminal-red font-mono text-[9px] font-bold uppercase tracking-wider px-3 py-2 rounded shadow-2xl hover:bg-terminal-red/10 hover:border-terminal-red transition-all animate-pulse"
        >
          <ClipboardList className="w-3.5 h-3.5" />
          VIEW DAMAGE ASSESSMENT
          <span className="text-[8px] opacity-60">↑</span>
        </button>
      </div>
    );
  }

  if (!visible) return null;

  // ── MAIN PANEL ───────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 flex items-center justify-center pointer-events-none font-mono p-4"
      style={{ zIndex: 99999, overflowY: 'auto' }}
    >
      <div className="max-w-xl w-full pointer-events-auto bg-terminal-panel border border-terminal-border rounded shadow-2xl animate-fade-in my-8 flex flex-col max-h-[90vh]">

        {/* ── HEADER ──────────────────────────────────────────────── */}
        <div className="px-4 py-3 border-b border-terminal-border bg-terminal-card rounded-t flex justify-between items-center shrink-0">
          <div>
            <div className="text-[10px] tracking-widest text-terminal-text-faint">POST-STRIKE</div>
            <div className="text-terminal-text font-bold text-sm">BATTLE DAMAGE ASSESSMENT</div>
            <div className="text-terminal-text-dim text-[10px] mt-0.5">{activeScenario.title}</div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] bg-terminal-red-dim border border-terminal-red text-terminal-red px-2 py-0.5 rounded font-bold uppercase animate-pulse">
              REPORT FILED
            </span>
            {/* Close button */}
            <button
              onClick={handleClose}
              title="Close assessment panel (map stays active)"
              className="w-6 h-6 flex items-center justify-center rounded border border-terminal-border text-terminal-text-faint hover:border-terminal-text-dim hover:text-terminal-text transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ── SCROLLABLE BODY ──────────────────────────────────────── */}
        <div className="p-4 space-y-3 overflow-y-auto flex-1">

          {/* Assessment narrative */}
          <p className="text-[11px] text-terminal-text leading-relaxed border-l-2 border-terminal-red pl-3 bg-black/10 py-1">
            {narrative}
          </p>

          {/* Casualty table */}
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
                      row.type.toLowerCase().includes('child') ||
                      row.type.toLowerCase().includes('minor') ||
                      row.type.toLowerCase().includes('civilian') ||
                      row.type.toLowerCase().includes('family') ||
                      row.type.toLowerCase().includes('wound')
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

          {/* ── VERIFIED PRIMARY SOURCE ─────────────────────────────── */}
          {source && (
            <div className="border border-terminal-amber/40 rounded bg-terminal-amber-dim/10 p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[9.5px] text-terminal-amber font-bold uppercase tracking-wider">
                <BookOpen className="w-3 h-3 shrink-0" />
                VERIFIED PRIMARY SOURCE — REAL DOCUMENTED EVENT
              </div>
              <div className="text-[10.5px] text-terminal-text font-bold leading-snug">{source.label}</div>
              <div className="text-[9px] text-terminal-text-dim">
                <span className="text-terminal-amber font-bold">{source.org}</span>{' '}·{' '}<span>{source.year}</span>
              </div>
              {source.quote && (
                <p className="text-[9px] text-terminal-text-dim italic leading-relaxed border-l border-terminal-amber/40 pl-2">
                  "{source.quote}"
                </p>
              )}
              <a
                href={source.url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[9.5px] text-terminal-amber hover:text-yellow-300 font-bold underline underline-offset-2 transition-colors"
              >
                Read Full Report / Source <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          )}

          {/* ── LEGAL FRAMEWORK ────────────────────────────────────── */}
          {activeScenario.legalContext && (
            <div className="border border-terminal-blue/30 rounded p-3 bg-terminal-blue-dim/10 text-[10px] leading-relaxed space-y-1.5">
              <div className="font-bold text-terminal-blue uppercase mb-1.5 flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5" />
                APPLICABLE INTERNATIONAL HUMANITARIAN LAW
              </div>
              <div>
                <span className="text-terminal-text font-bold block text-[9.5px]">Applicable Law:</span>
                <a
                  href={getIhlUrl(activeScenario.legalContext.applicableLaw)}
                  target="_blank" rel="noopener noreferrer"
                  className="text-terminal-text-dim hover:text-terminal-blue hover:underline transition-colors"
                >
                  {activeScenario.legalContext.applicableLaw} ↗
                </a>
              </div>
              <div>
                <span className="text-terminal-red font-bold block text-[9.5px]">Regulatory Vacuum:</span>
                <span className="text-terminal-text-dim">{activeScenario.legalContext.legalGap}</span>
              </div>
              <div>
                <span className="text-terminal-amber font-bold block text-[9.5px]">Treaty Negotiation Status:</span>
                <span className="text-terminal-text-dim">{activeScenario.legalContext.treatyStatus}</span>
                {' '}
                <a
                  href={UN_CCW_GGE_URL} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 text-terminal-blue hover:underline ml-1 text-[8.5px]"
                >
                  [CCW GGE History ↗]
                </a>
              </div>
              <div className="border-t border-terminal-blue/20 pt-1.5 mt-1">
                <span className="text-terminal-green font-bold block text-[9.5px]">Stop Killer Robots Policy Ask:</span>
                <span className="text-terminal-text font-bold">{activeScenario.legalContext.advocacyAsk}</span>
              </div>
            </div>
          )}

          {/* ── TAKE ACTION CTA ─────────────────────────────────────── */}
          <div className="bg-terminal-green-dim/10 border border-terminal-green/30 rounded p-3 flex gap-3 items-center">
            <div className="flex-1 space-y-1.5 text-[10px]">
              <div className="font-bold text-terminal-green uppercase flex items-center gap-1.5">
                <HeartHandshake className="w-4 h-4 text-terminal-green" />
                TAKE ACTION — STOP KILLER ROBOTS
              </div>
              <p className="text-terminal-text-dim leading-normal">
                Autonomous killing by machines is not inevitable. 270+ organisations in 70+ countries
                are fighting for a legally binding ban. Add your voice.
              </p>
              <div className="flex flex-wrap gap-2 pt-0.5">
                <a href={SKR_PETITION_URL} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-terminal-green hover:text-green-300 font-bold transition-colors">
                  ✍ Sign the Petition <ExternalLink className="w-2.5 h-2.5" />
                </a>
                <span className="text-terminal-text-faint">•</span>
                <a href={SKR_ACTION_URL} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-terminal-blue hover:underline font-bold">
                  All Actions <ExternalLink className="w-2.5 h-2.5" />
                </a>
                <span className="text-terminal-text-faint">•</span>
                <a href={UN_CCW_TREATY_URL} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-terminal-blue hover:underline font-bold">
                  CCW Treaty Progress <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            </div>
            <div className="flex flex-col items-center gap-1 bg-white p-1.5 rounded shrink-0">
              <canvas ref={qrCanvasRef} className="w-[76px] h-[76px]" />
              <span className="text-[6px] text-[#050a12] font-black uppercase tracking-widest leading-tight text-center">
                SCAN — STOP KILLER ROBOTS
              </span>
            </div>
          </div>

          {/* ── IHL WARNING ─────────────────────────────────────────── */}
          <div className="bg-terminal-red-dim/10 border border-terminal-red/30 rounded p-2.5 flex items-start gap-2 text-[9px]">
            <AlertTriangle className="w-3 h-3 text-terminal-red shrink-0 mt-0.5" />
            <p className="text-terminal-text-dim leading-relaxed">
              <span className="text-terminal-red font-bold">Accountability gap:</span>{' '}
              When autonomous systems make targeting decisions, no individual bears legal responsibility.
              This violates the principle of{' '}
              <span className="text-terminal-amber font-bold">Command Responsibility</span>{' '}
              under customary international humanitarian law.
            </p>
          </div>

          {/* ── ACTION BUTTONS ──────────────────────────────────────── */}
          <div className="flex gap-2 pt-1 border-t border-terminal-border">
            <button
              onClick={resetSimulation}
              className="flex-1 py-2 border border-terminal-border text-terminal-text-dim text-[10px] font-bold uppercase tracking-wider rounded hover:border-terminal-text-dim hover:text-terminal-text transition-colors"
            >
              ← COMMAND HUB
            </button>
            <button
              onClick={handleClose}
              className="px-3 py-2 border border-terminal-border text-terminal-text-faint text-[10px] font-bold uppercase tracking-wider rounded hover:border-terminal-text-dim hover:text-terminal-text transition-colors"
              title="Close to view map"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleNextScenario}
              className="flex-1 py-2 bg-terminal-green-dim border border-terminal-green text-terminal-green text-[10px] font-bold uppercase tracking-wider rounded hover:bg-terminal-green/20 transition-colors"
            >
              Next Scenario →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
