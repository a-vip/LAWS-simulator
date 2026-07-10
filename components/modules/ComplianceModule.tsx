'use client';
import { useState, useEffect, useRef } from 'react';
import {
  ExternalLink, AlertTriangle, ChevronDown, ChevronRight,
  XCircle, CheckCircle, Scale, Shield, Zap, Eye, BookOpen,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// M6: IHL COMPLIANCE & ACCOUNTABILITY
// Sources: ICRC, +972 Magazine, HRW, Amnesty International, UN CCW GGE
// ─────────────────────────────────────────────────────────────────────────────

const IHL_PRINCIPLES = [
  {
    id: 'distinction',
    name: 'Distinction',
    article: 'API Art. 48, 51–52  ·  GCIV Art. 50',
    treaty: 'ICRC Customary IHL Rule 1 — Distinction Between Civilians and Combatants',
    treatyUrl: 'https://ihl-databases.icrc.org/en/customary-ihl/v1/rule1',
    rule: 'Parties must at all times distinguish between civilians and combatants. Attacks may only be directed at combatants and military objectives. The civilian population must not be the object of attack.',
    conflict: "Lavender AI assigned targeting probability scores to 37,000 Palestinian men based on behavioural patterns — phone associations, WhatsApp group membership, movement data. A 72% confidence score means a 28% probability the target is a civilian. Pattern-of-life association is not individualised assessment.",
    system: 'Lavender AI — Gaza 2023–24',
    conflictKey: '72% confidence · 28% civilian probability · 37,000 batch targets',
    caseNote: '+972 Magazine: "Lavender: The AI machine directing Israel\'s bombing spree in Gaza" (Apr 2024)',
    caseUrl: 'https://www.972mag.com/lavender-ai-israeli-army-gaza/',
    color: '#ff1a2e',
  },
  {
    id: 'proportionality',
    name: 'Proportionality',
    article: 'API Art. 51(5)(b), 57(2)(a)(iii)',
    treaty: 'ICRC Customary IHL Rule 14 — Proportionality in Attack',
    treatyUrl: 'https://ihl-databases.icrc.org/en/customary-ihl/v1/rule14',
    rule: 'An attack is prohibited if it may be expected to cause incidental civilian casualties excessive in relation to the concrete and direct military advantage anticipated. This assessment must be made individually for each attack.',
    conflict: "The IDF's 'Where's Daddy?' system targeted individuals at home to maximise civilian co-location. IDF pre-programmed kill ratios of up to 20 civilian deaths per low-ranking target into the approval pipeline. Pre-computed aggregate ratios cannot substitute for case-by-case proportionality assessment.",
    system: "Where's Daddy? / Lavender — Gaza 2023–24",
    conflictKey: '20 civilian deaths pre-approved per junior target · no per-case review',
    caseNote: 'Amnesty International: "Damning evidence of war crimes" (Oct 2023)',
    caseUrl: 'https://www.amnesty.org/en/latest/news/2023/10/damning-evidence-of-war-crimes-as-israeli-attacks-wipe-out-entire-families-in-gaza/',
    color: '#ff6600',
  },
  {
    id: 'precaution',
    name: 'Precaution',
    article: 'API Art. 57',
    treaty: 'ICRC Customary IHL Rule 15 — Precautions in Attack',
    treatyUrl: 'https://ihl-databases.icrc.org/en/customary-ihl/v1/rule15',
    rule: 'Constant care must be taken to spare civilians. All feasible precautions must be taken in choice of means and methods. Commanders must verify targets and select means to minimise civilian harm.',
    conflict: "Habsora (Gospel) AI generated up to 100 bombing targets per day — far beyond human capacity for genuine verification. Officers spent approximately 20 seconds approving each AI-generated strike on a residential building. This pace is physically incompatible with meaningful precautionary legal review.",
    system: 'Habsora (Gospel) AI — Gaza 2023',
    conflictKey: '100 targets/day · 20-second approval · impossible verification rate',
    caseNote: '+972 Magazine: "A mass assassination factory" (Nov 2023)',
    caseUrl: 'https://www.972mag.com/mass-assassination-factory-israel-calculated-bombing-gaza/',
    color: '#ffaa00',
  },
  {
    id: 'humanity',
    name: 'Humanity & Martens Clause',
    article: 'Hague IV Preamble (1907) · API Art. 1(2)',
    treaty: 'ICRC IHL Treaty Database — Hague Convention IV 1907',
    treatyUrl: 'https://ihl-databases.icrc.org/en/ihl-treaties/hciv-1907',
    rule: 'In cases not covered by treaty, civilians and combatants remain under the protection derived from the principles of humanity and the dictates of public conscience. Applies even in legal grey areas.',
    conflict: 'No algorithm can exercise mercy, compassion, or conscience. Delegating life-and-death decisions to machines — even in ambiguous situations — violates the principle that humanity must govern the conduct of war. This is the moral core of the LAWS ban movement.',
    system: 'All LAWS deployments — structural',
    conflictKey: 'No machine can exercise mercy, compassion, or conscience',
    caseNote: 'ICRC: "Autonomous Weapon Systems: Implications of Increasing Autonomy" (2016)',
    caseUrl: 'https://www.icrc.org/en/publication/autonomous-weapon-systems-implications-increasing-autonomy-critical-functions-weapons',
    color: '#818cf8',
  },
  {
    id: 'accountability',
    name: 'Command Responsibility',
    article: 'API Art. 86–87 · Rome Statute Art. 28',
    treaty: 'Additional Protocol I Art. 86 — ICRC Treaty Database',
    treatyUrl: 'https://ihl-databases.icrc.org/en/ihl-treaties/api-1977/article-86',
    rule: 'Commanders are legally responsible for war crimes by subordinates if they knew or should have known, and failed to prevent or punish. IHL requires an identifiable human decision-maker for every use of lethal force.',
    conflict: "When AI selects and engages targets autonomously, no accountability chain exists. Manufacturers cannot be prosecuted under IHL. No individual commander personally decided to fire. This creates a 'responsibility vacuum' — a fundamental gap in the law for LAWS deployments.",
    system: 'All autonomous targeting systems — structural gap',
    conflictKey: 'Responsibility vacuum · no legal person accountable for AI decisions',
    caseNote: 'UN CCW GGE Report 2019: "Applicability of IHL to Autonomous Weapon Systems"',
    caseUrl: 'https://undocs.org/CCW/GGE.1/2019/3',
    color: '#ec4899',
  },
] as const;

const RUBBER_STAMP_CASES = [
  {
    system: 'Habsora ("Gospel") AI',
    country: 'Israel / IDF — Gaza 2023–24',
    reviewTime: '~20 seconds per target',
    targetsPerDay: 100,
    source: '+972 Magazine / Local Call (Nov 2023)',
    sourceUrl: 'https://www.972mag.com/mass-assassination-factory-israel-calculated-bombing-gaza/',
    detail: "AI system generated up to 100 bombing target recommendations per day — a volume no commander could genuinely verify. Officers spent approximately 20 seconds reviewing each AI-generated strike on a residential building before approving. Officers described this as 'a rubber stamp'. One Air Force source: 'We were not targeting people; we were targeting targets.'",
  },
  {
    system: 'Lavender AI',
    country: 'Israel / IDF — Gaza 2023–24',
    reviewTime: '<1 minute — AI treated as fact',
    targetsPerDay: 37000,
    source: '+972 Magazine / Local Call (Apr 2024)',
    sourceUrl: 'https://www.972mag.com/lavender-ai-israeli-army-gaza/',
    detail: "Lavender assigned 1–10 probability scores to 37,000 Palestinian men marking them as suspected militants. Officers described treating AI output as 'fact', rarely overriding it. Machine confidence scores became de facto operational authority. One officer stated: 'The machine did it coldly. And that had an effect on me — the machine has no problem with that.'",
  },
  {
    system: 'KARGU-2 Loitering Munition',
    country: 'Turkey (export) — Libya 2020',
    reviewTime: 'Autonomous — no operator connection',
    targetsPerDay: 0,
    source: 'UN Panel of Experts Final Report S/2021/229',
    sourceUrl: 'https://undocs.org/S/2021/229',
    detail: "A 2021 UN Panel of Experts report on Libya documented that KARGU-2 loitering munitions 'hunted down and remotely engaged' retreating soldiers without requiring data connectivity — meaning no human issued the engagement command. If confirmed, this is the first documented case of an autonomous weapons system engaging humans without a human decision.",
  },
] as const;

const KEY_DOCUMENTS = [
  {
    title: 'UN Secretary-General: Joint Appeal on AWS (2023)',
    body: 'UN SG António Guterres called for a legally binding instrument to prohibit LAWS before 2026, warning that "machines with the power and discretion to take lives without human involvement are politically unacceptable, morally repugnant and should be prohibited by international law."',
    url: 'https://www.icrc.org/en/document/joint-appeal-un-secretary-general-and-president-icrc-autonomous-weapon-systems',
    tag: 'UN STATEMENT', tagColor: '#0096ff',
  },
  {
    title: '"Meaningful Human Control" — Article 36 / Stop Killer Robots Standard',
    body: '"Meaningful human control" requires that a person must understand and be able to predict system behaviour, be able to activate/deactivate the weapon, and bear genuine legal and moral responsibility. A 20-second rubber stamp does not meet this standard.',
    url: 'https://www.article36.org/weapons/autonomous-weapons/',
    tag: 'LEGAL STANDARD', tagColor: '#ffaa00',
  },
  {
    title: 'Stop Killer Robots — Campaign Overview',
    body: 'Coalition of 270+ NGOs in 70+ countries calling for new international law to retain human control over the use of force. Endorsed by the ICRC, UNHCR, and UN Secretary-General. Sign the petition.',
    url: 'https://stopkillerrobots.org/take-action/sign-our-petition-now/',
    tag: 'TAKE ACTION', tagColor: '#ec4899',
  },
  {
    title: 'ICRC Position: New Rules Needed for Autonomous Weapons (2021)',
    body: 'The ICRC calls for a new binding instrument to prohibit unpredictable LAWS and require meaningful human control over all weapons with autonomous targeting. As the foremost IHL authority, this position carries significant legal and moral weight.',
    url: 'https://www.icrc.org/en/document/icrc-position-autonomous-weapon-systems',
    tag: 'ICRC POLICY', tagColor: '#00d47e',
  },
  {
    title: 'UN General Assembly — Historic LAWS Resolution 78/241 (Dec 2023)',
    body: 'First-ever UNGA resolution specifically on lethal autonomous weapons systems passed with an overwhelming majority of 152 votes in favour. Requests a substantive report from the Secretary-General on the challenges posed by LAWS.',
    url: 'https://undocs.org/A/RES/78/241',
    tag: 'UN RESOLUTION', tagColor: '#a855f7',
  },
  {
    title: 'HRW: "Making the Case" — The Dangers of Killer Robots (2016)',
    body: 'Foundational Human Rights Watch legal analysis arguing that full autonomy in life-and-death decisions is incompatible with IHL requirements for distinction, proportionality, and precaution. Remains the definitive legal case for preemptive prohibition.',
    url: 'https://www.hrw.org/report/2016/12/19/making-case/dangers-killer-robots-and-need-preemptive-ban',
    tag: 'HRW LEGAL', tagColor: '#ff6b35',
  },
  {
    title: 'UN Convention on Certain Conventional Weapons — LAWS Negotiations',
    body: 'The CCW Group of Governmental Experts has been negotiating LAWS since 2014. Progress has stalled due to objections from major military powers. This page tracks the ongoing deliberations.',
    url: 'https://disarmament.unoda.org/the-convention-on-certain-conventional-weapons/',
    tag: 'UN CCW', tagColor: '#38bdf8',
  },
] as const;

type TabId = 'principles' | 'cases' | 'documents';

// ── Gauge SVG (compliance score) ──────────────────────────────────────────
function ComplianceGauge() {
  const R = 56;
  const stroke = 10;
  const circ = Math.PI * R; // semi-circle
  // 0% filled — the gauge shows 0 of 5 principles compliant
  return (
    <svg width={140} height={82} viewBox="0 0 140 82" style={{ overflow: 'visible' }}>
      {/* Glow effect */}
      <defs>
        <filter id="red-glow">
          <feGaussianBlur stdDeviation="4" result="coloredBlur" />
          <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {/* Track (full semi-circle) */}
      <path
        d={`M ${70 - R} 70 A ${R} ${R} 0 0 1 ${70 + R} 70`}
        fill="none"
        stroke="rgba(26,37,53,0.6)"
        strokeWidth={stroke}
        strokeLinecap="round"
      />
      {/* Filled portion — 0% (nothing filled, but we show a small red dot at start) */}
      <circle cx={70 - R} cy={70} r={stroke / 2} fill="#ff1a2e" filter="url(#red-glow)" />
      {/* Labels */}
      <text x={70} y={52} textAnchor="middle"
        fontFamily="JetBrains Mono, monospace" fontSize={26} fontWeight="bold" fill="#ff1a2e">
        0
      </text>
      <text x={70} y={67} textAnchor="middle"
        fontFamily="JetBrains Mono, monospace" fontSize={10} fill="#536878">
        / 5 PRINCIPLES MET
      </text>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export function ComplianceModule() {
  const [activeTab, setActiveTab]   = useState<TabId>('principles');
  const [expandedP, setExpandedP]   = useState<string | null>(null);
  const [expandedC, setExpandedC]   = useState<number | null>(null);
  const [pulseCount, setPulseCount] = useState(0); // for violation counter animation
  const pulseRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Animate violation counter on mount
  useEffect(() => {
    let count = 0;
    const id = setInterval(() => {
      count++;
      setPulseCount(count);
      if (count >= IHL_PRINCIPLES.length) clearInterval(id);
    }, 200);
    return () => clearInterval(id);
  }, []);

  const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'principles', label: 'IHL VIOLATIONS',    icon: <Scale className="w-3 h-3" /> },
    { id: 'cases',      label: 'DOCUMENTED CASES',  icon: <AlertTriangle className="w-3 h-3" /> },
    { id: 'documents',  label: 'KEY DOCUMENTS',     icon: <BookOpen className="w-3 h-3" /> },
  ];

  return (
    <div
      className="w-full h-full flex flex-col font-mono select-none"
      style={{ background: '#040408', color: '#ccd6e0', fontSize: 12 }}
    >

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 shrink-0"
        style={{ height: 62, borderBottom: '1px solid rgba(255,26,46,0.18)' }}
      >
        <div>
          <div className="text-[8px] tracking-widest mb-0.5" style={{ color: '#ff1a2e' }}>
            MODULE 6 // IHL COMPLIANCE & ACCOUNTABILITY
          </div>
          <div className="font-bold" style={{ fontSize: 13 }}>
            HUMANITARIAN COMPLIANCE ASSESSMENT
          </div>
          <div className="text-[7.5px]" style={{ color: '#536878' }}>
            International Humanitarian Law vs. documented LAWS deployments  ·  ICRC / HRW / UN CCW
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <a
            href="https://stopkillerrobots.org/take-action/sign-our-petition-now/"
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border font-bold text-[7px] transition-all"
            style={{ background: 'rgba(236,72,153,0.1)', borderColor: 'rgba(236,72,153,0.4)', color: '#ec4899' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(236,72,153,0.18)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(236,72,153,0.1)')}
          >
            <ExternalLink className="w-2.5 h-2.5" /> SIGN THE PETITION
          </a>
          <span
            className="px-2.5 py-1.5 rounded border text-[7.5px] font-bold"
            style={{ background: 'rgba(255,26,46,0.1)', borderColor: 'rgba(255,26,46,0.35)', color: '#ff1a2e' }}
          >
            NO BINDING TREATY
          </span>
        </div>
      </div>

      {/* ── HERO DASHBOARD ──────────────────────────────────────────────── */}
      <div
        className="flex shrink-0"
        style={{ height: 210, borderBottom: '1px solid rgba(26,37,53,0.5)' }}
      >
        {/* LEFT: What IHL requires */}
        <div
          className="flex flex-col justify-center p-4"
          style={{ width: '33%', borderRight: '1px solid rgba(26,37,53,0.4)' }}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <Scale className="w-3.5 h-3.5 shrink-0" style={{ color: '#0096ff' }} />
            <span className="font-bold text-[9px] tracking-wider" style={{ color: '#0096ff' }}>
              WHAT IHL REQUIRES
            </span>
          </div>
          <div className="text-[7px] mb-3 leading-relaxed" style={{ color: '#536878' }}>
            Five binding principles of international humanitarian law apply to every weapons system without exception — including fully autonomous systems.
          </div>
          <div className="space-y-1.5">
            {IHL_PRINCIPLES.map(p => (
              <div key={p.id} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: p.color }} />
                <span className="text-[7px]" style={{ color: '#ccd6e0' }}>{p.name}</span>
                <span className="text-[6px] ml-auto" style={{ color: '#2a3a4a' }}>{p.article.split('·')[0].trim()}</span>
              </div>
            ))}
          </div>
          <div
            className="mt-3 rounded px-2 py-1.5 text-[6.5px] leading-relaxed"
            style={{ background: 'rgba(0,150,255,0.05)', border: '1px solid rgba(0,150,255,0.15)', color: '#536878' }}
          >
            <span style={{ color: '#0096ff', fontWeight: 700 }}>ICRC: </span>
            "These principles are not optional — they apply to all states and all weapons, regardless of novelty or operational advantage."
          </div>
        </div>

        {/* CENTER: Compliance score */}
        <div
          className="flex flex-col items-center justify-center gap-2"
          style={{ flex: '1 1 0', borderRight: '1px solid rgba(26,37,53,0.4)' }}
        >
          <div className="text-[9px] font-bold tracking-widest" style={{ color: '#ff1a2e' }}>
            IHL COMPLIANCE SCORE
          </div>
          <ComplianceGauge />
          {/* Five principle dots */}
          <div className="flex gap-2 mt-1">
            {IHL_PRINCIPLES.map((p, i) => (
              <div
                key={p.id}
                className="flex flex-col items-center gap-0.5"
                title={`${p.name}: VIOLATED`}
              >
                <div
                  className="w-4 h-4 rounded-full flex items-center justify-center transition-all"
                  style={{
                    background:  i < pulseCount ? `rgba(${p.id === 'distinction' ? '255,26,46' : p.id === 'proportionality' ? '255,102,0' : p.id === 'precaution' ? '255,170,0' : p.id === 'humanity' ? '129,140,248' : '236,72,153'},0.2)` : 'rgba(26,37,53,0.3)',
                    border:      `1px solid ${i < pulseCount ? p.color : 'rgba(26,37,53,0.4)'}`,
                    boxShadow:   i < pulseCount ? `0 0 6px ${p.color}60` : 'none',
                  }}
                >
                  {i < pulseCount && <XCircle className="w-2.5 h-2.5" style={{ color: p.color }} />}
                </div>
                <div className="text-[5px] text-center" style={{ color: i < pulseCount ? p.color : '#2a3a4a', maxWidth: 28, lineHeight: 1.2 }}>
                  {p.name.split(' ')[0]}
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-1">
            <div className="font-bold text-[8px]" style={{ color: '#ff1a2e' }}>
              {pulseCount}/{IHL_PRINCIPLES.length} PRINCIPLES VIOLATED
            </div>
            <div className="text-[6.5px] mt-0.5" style={{ color: '#536878' }}>by documented LAWS deployments</div>
          </div>
        </div>

        {/* RIGHT: LAWS reality */}
        <div
          className="flex flex-col justify-center p-4"
          style={{ width: '33%' }}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <Zap className="w-3.5 h-3.5 shrink-0" style={{ color: '#ff1a2e' }} />
            <span className="font-bold text-[9px] tracking-wider" style={{ color: '#ff1a2e' }}>
              LAWS IN PRACTICE
            </span>
          </div>
          <div className="space-y-2">
            {[
              { label: 'Lavender batch targets',    value: '37,000',  col: '#ff1a2e', sub: 'pattern-of-life AI classification' },
              { label: 'Max. civilian deaths OK\'d', value: '20',      col: '#ff6600', sub: 'per junior-rank target (IDF policy)' },
              { label: 'Habsora review time',        value: '~20 sec', col: '#ffaa00', sub: 'per AI-generated strike recommendation' },
              { label: 'Binding international law',  value: '0',       col: '#818cf8', sub: 'treaties specifically regulating LAWS' },
            ].map(({ label, value, col, sub }) => (
              <div key={label} className="flex items-center gap-3">
                <div>
                  <div className="font-bold tabular-nums leading-none" style={{ fontSize: 14, color: col }}>{value}</div>
                  <div className="text-[5.5px] mt-0.5" style={{ color: '#2a3a4a' }}>{sub}</div>
                </div>
                <div className="text-[6.5px] ml-auto text-right" style={{ color: '#536878', maxWidth: 90 }}>{label}</div>
              </div>
            ))}
          </div>
          <div
            className="mt-3 rounded px-2 py-1.5 flex items-start gap-1.5"
            style={{ background: 'rgba(255,26,46,0.05)', border: '1px solid rgba(255,26,46,0.15)' }}
          >
            <AlertTriangle className="w-2.5 h-2.5 shrink-0 mt-0.5" style={{ color: '#ff6600' }} />
            <div className="text-[6.5px] leading-relaxed" style={{ color: '#536878' }}>
              <span style={{ color: '#ff1a2e', fontWeight: 700 }}>UN SG Guterres (2023): </span>
              "Machines with the power to take lives without human involvement are politically unacceptable and morally repugnant."
            </div>
          </div>
        </div>
      </div>

      {/* ── MHC ALERT BAR ────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-2 px-4 py-2 shrink-0"
        style={{ background: 'rgba(255,170,0,0.05)', borderBottom: '1px solid rgba(255,170,0,0.18)' }}
      >
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" style={{ color: '#ffaa00' }} />
        <span className="text-[7.5px] leading-relaxed" style={{ color: '#a07a20' }}>
          <strong style={{ color: '#ffaa00' }}>MEANINGFUL HUMAN CONTROL (MHC) </strong>
          requires: (1) understanding and predicting system behaviour, (2) genuine ability to intervene and abort, (3) traceable legal responsibility.
          A 20-second rubber stamp on an AI-generated kill list meets
          {' '}<strong style={{ color: '#ff1a2e' }}>none</strong>{' '}
          of these criteria.
          {' '}
          <a
            href="https://www.article36.org/weapons/autonomous-weapons/"
            target="_blank" rel="noopener noreferrer"
            className="underline transition-colors"
            style={{ color: '#ffaa00' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#ffd166')}
            onMouseLeave={e => (e.currentTarget.style.color = '#ffaa00')}
          >
            Full definition ↗
          </a>
        </span>
      </div>

      {/* ── STICKY TAB NAV ──────────────────────────────────────────────── */}
      <div
        className="flex gap-1 px-3 pt-2 shrink-0"
        style={{ borderBottom: '1px solid rgba(26,37,53,0.5)', background: 'rgba(4,4,8,0.97)' }}
      >
        {TABS.map(tab => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-t text-[7.5px] font-bold transition-all border-b-2"
              style={{
                background:   active ? 'rgba(255,26,46,0.08)' : 'transparent',
                color:        active ? '#ff8080' : '#536878',
                borderColor:  active ? '#ff1a2e' : 'transparent',
                borderBottom: `2px solid ${active ? '#ff1a2e' : 'transparent'}`,
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── TAB CONTENT ──────────────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto p-4"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,26,46,0.3) rgba(0,0,0,0.2)' }}
      >

        {/* ══ PRINCIPLES TAB ════════════════════════════════════════════ */}
        {activeTab === 'principles' && (
          <div className="space-y-2">
            <div className="text-[7.5px] mb-3" style={{ color: '#536878' }}>
              Five binding IHL principles applicable to all weapons systems. All are routinely bypassed by documented LAWS deployments. Click any row to expand the legal analysis.
            </div>

            {/* Law vs. Practice Header */}
            <div
              className="grid gap-0 text-[7px] font-bold mb-1"
              style={{ gridTemplateColumns: '1fr 1fr 1fr', padding: '4px 12px' }}
            >
              <span style={{ color: '#0096ff' }}>THE LAW (IHL REQUIREMENT)</span>
              <span className="text-center" style={{ color: '#536878' }}>→ THE GAP →</span>
              <span className="text-right" style={{ color: '#ff1a2e' }}>LAWS IN PRACTICE</span>
            </div>

            {IHL_PRINCIPLES.map(p => {
              const isOpen = expandedP === p.id;
              return (
                <div
                  key={p.id}
                  className="rounded overflow-hidden transition-all"
                  style={{
                    border:     `1px solid ${isOpen ? `${p.color}40` : 'rgba(26,37,53,0.4)'}`,
                    background: isOpen ? `${p.color}06` : 'rgba(26,37,53,0.08)',
                    boxShadow:  isOpen ? `0 0 16px ${p.color}18` : 'none',
                  }}
                >
                  {/* Row header */}
                  <div
                    className="grid cursor-pointer transition-all"
                    style={{
                      gridTemplateColumns: '1fr auto 1fr',
                      padding: '8px 12px',
                      gap: 12,
                      background: isOpen ? `${p.color}08` : 'transparent',
                    }}
                    onClick={() => setExpandedP(isOpen ? null : p.id)}
                    onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = 'rgba(26,37,53,0.15)'; }}
                    onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = 'transparent'; }}
                  >
                    {/* Left: IHL rule */}
                    <div className="flex items-start gap-2 min-w-0">
                      <div className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5" style={{ background: p.color }} />
                      <div>
                        <div className="font-bold text-[9px]" style={{ color: isOpen ? '#fff' : '#ccd6e0' }}>
                          {p.name}
                        </div>
                        <div className="text-[6.5px] mt-0.5" style={{ color: '#2a3a4a' }}>{p.article}</div>
                      </div>
                    </div>

                    {/* Center: status */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className="px-1.5 py-0.5 rounded text-[7px] font-bold"
                        style={{
                          background: `${p.color}18`,
                          border:     `1px solid ${p.color}50`,
                          color:      p.color,
                        }}
                      >
                        VIOLATED
                      </span>
                      {isOpen
                        ? <ChevronDown className="w-3 h-3" style={{ color: '#536878' }} />
                        : <ChevronRight className="w-3 h-3" style={{ color: '#536878' }} />}
                    </div>

                    {/* Right: violation key */}
                    <div className="text-right">
                      <div className="text-[7px]" style={{ color: '#ff1a2e' }}>{p.conflictKey}</div>
                      <div className="text-[6px] mt-0.5" style={{ color: '#2a3a4a' }}>{p.system}</div>
                    </div>
                  </div>

                  {/* Expanded content */}
                  {isOpen && (
                    <div
                      className="px-4 pb-4 pt-3 space-y-3"
                      style={{ borderTop: `1px solid ${p.color}20` }}
                    >
                      {/* Treaty link */}
                      <a
                        href={p.treatyUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-[7.5px] transition-colors"
                        style={{ color: '#0096ff' }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#38bdf8')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#0096ff')}
                      >
                        <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                        {p.treaty} ↗
                      </a>

                      {/* Two-column: law vs conflict */}
                      <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
                        <div
                          className="rounded p-3"
                          style={{ background: 'rgba(0,150,255,0.06)', border: '1px solid rgba(0,150,255,0.15)' }}
                        >
                          <div className="text-[7px] font-bold mb-1.5" style={{ color: '#38bdf8' }}>
                            THE RULE
                          </div>
                          <div className="text-[7.5px] leading-relaxed" style={{ color: '#8892a4' }}>
                            {p.rule}
                          </div>
                        </div>
                        <div
                          className="rounded p-3"
                          style={{ background: 'rgba(255,26,46,0.06)', border: `1px solid ${p.color}25` }}
                        >
                          <div className="text-[7px] font-bold mb-1.5" style={{ color: p.color }}>
                            LAWS CONFLICT
                          </div>
                          <div className="text-[7.5px] leading-relaxed" style={{ color: '#8892a4' }}>
                            {p.conflict}
                          </div>
                        </div>
                      </div>

                      {/* Source */}
                      <a
                        href={p.caseUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-[7px] transition-colors"
                        style={{ color: '#ffaa00' }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#ffd166')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#ffaa00')}
                      >
                        <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                        {p.caseNote} ↗
                      </a>
                    </div>
                  )}
                </div>
              );
            })}

            {/* MHC vs Rubber Stamp comparison */}
            <div
              className="rounded p-3 mt-4"
              style={{ background: 'rgba(26,37,53,0.15)', border: '1px solid rgba(26,37,53,0.4)' }}
            >
              <div className="text-[8px] font-bold mb-3" style={{ color: '#536878' }}>
                MEANINGFUL HUMAN CONTROL vs. RUBBER STAMP — DECISION CHAIN
              </div>
              <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
                {[
                  {
                    title: '✓ MHC (IHL STANDARD)',
                    col: '#00d47e',
                    items: [
                      'Commander reviews intelligence independently',
                      'Target identity verified from multiple sources',
                      'Proportionality assessed case-by-case',
                      'Feasible precautionary alternatives weighed',
                      'Deliberate, accountable authorisation',
                      'Legal responsibility is fully traceable',
                    ],
                  },
                  {
                    title: '✗ RUBBER STAMP (LAWS REALITY)',
                    col: '#ff1a2e',
                    items: [
                      'AI generates target list autonomously',
                      '20-second "review" per human life',
                      'No independent verification of AI output',
                      'Proportionality pre-computed in aggregate',
                      'Click to approve at machine pace',
                      'Responsibility vacuum — who actually decided?',
                    ],
                  },
                ].map(col => (
                  <div
                    key={col.title}
                    className="rounded p-2.5"
                    style={{ background: `${col.col}08`, border: `1px solid ${col.col}20` }}
                  >
                    <div className="font-bold text-[7.5px] mb-2" style={{ color: col.col }}>
                      {col.title}
                    </div>
                    {col.items.map((item, i) => (
                      <div key={i} className="flex items-start gap-1.5 mb-1.5">
                        {col.col === '#00d47e'
                          ? <CheckCircle className="w-2.5 h-2.5 shrink-0 mt-0.5" style={{ color: '#00d47e' }} />
                          : <XCircle    className="w-2.5 h-2.5 shrink-0 mt-0.5" style={{ color: '#ff1a2e' }} />}
                        <div className="text-[7px] leading-relaxed" style={{ color: '#8892a4' }}>{item}</div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ CASES TAB ═════════════════════════════════════════════════ */}
        {activeTab === 'cases' && (
          <div className="space-y-3">
            <div
              className="rounded p-2.5 mb-3"
              style={{ background: 'rgba(255,26,46,0.05)', border: '1px solid rgba(255,26,46,0.2)' }}
            >
              <div className="text-[7.5px] leading-relaxed" style={{ color: '#8892a4' }}>
                <span style={{ color: '#ff8080', fontWeight: 700 }}>THE RUBBER STAMP PROBLEM: </span>
                When humans approve AI kill lists at machine speed, oversight becomes legal fiction. The following cases are documented from investigative journalism and UN expert reports. Click any case for full detail and source.
              </div>
            </div>

            {RUBBER_STAMP_CASES.map((c, i) => {
              const isOpen = expandedC === i;
              return (
                <div
                  key={i}
                  className="rounded overflow-hidden transition-all"
                  style={{
                    border:     `1px solid ${isOpen ? 'rgba(255,170,0,0.35)' : 'rgba(26,37,53,0.4)'}`,
                    background: isOpen ? 'rgba(255,170,0,0.03)' : 'rgba(26,37,53,0.08)',
                  }}
                >
                  <div
                    className="flex items-center justify-between gap-3 p-3 cursor-pointer transition-all"
                    style={{ background: isOpen ? 'rgba(255,170,0,0.05)' : 'transparent' }}
                    onClick={() => setExpandedC(isOpen ? null : i)}
                    onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = 'rgba(26,37,53,0.15)'; }}
                    onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-[10px]" style={{ color: '#fff' }}>{c.system}</div>
                      <div className="text-[6.5px] mt-0.5" style={{ color: '#536878' }}>{c.country}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                      <span
                        className="px-2 py-0.5 rounded text-[7px] font-bold"
                        style={{ background: 'rgba(255,26,46,0.1)', border: '1px solid rgba(255,26,46,0.25)', color: '#ff8080' }}
                      >
                        ⏱ {c.reviewTime}
                      </span>
                      {c.targetsPerDay > 0 && (
                        <span
                          className="px-2 py-0.5 rounded text-[7px] font-bold"
                          style={{ background: 'rgba(255,170,0,0.08)', border: '1px solid rgba(255,170,0,0.25)', color: '#ffaa00' }}
                        >
                          {c.targetsPerDay.toLocaleString()}/DAY
                        </span>
                      )}
                      {isOpen ? <ChevronDown className="w-3 h-3" style={{ color: '#536878' }} /> : <ChevronRight className="w-3 h-3" style={{ color: '#536878' }} />}
                    </div>
                  </div>
                  {isOpen && (
                    <div
                      className="px-4 py-3 space-y-2"
                      style={{ borderTop: '1px solid rgba(255,170,0,0.15)' }}
                    >
                      <div className="text-[8px] leading-relaxed" style={{ color: '#8892a4' }}>
                        {c.detail}
                      </div>
                      <a
                        href={c.sourceUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-[7px] transition-colors"
                        style={{ color: '#0096ff' }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#38bdf8')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#0096ff')}
                      >
                        <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                        {c.source} ↗
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ══ DOCUMENTS TAB ═════════════════════════════════════════════ */}
        {activeTab === 'documents' && (
          <div className="space-y-2">
            <div className="text-[7.5px] mb-3" style={{ color: '#536878' }}>
              Primary sources, international law references, and advocacy documents. All links open verified, live pages.
            </div>
            {KEY_DOCUMENTS.map((doc, i) => (
              <a
                key={i}
                href={doc.url} target="_blank" rel="noopener noreferrer"
                className="block rounded p-3 transition-all"
                style={{
                  background:  'rgba(26,37,53,0.1)',
                  border:      '1px solid rgba(26,37,53,0.4)',
                  textDecoration: 'none',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background    = 'rgba(0,150,255,0.05)';
                  e.currentTarget.style.borderColor   = 'rgba(0,150,255,0.22)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background    = 'rgba(26,37,53,0.1)';
                  e.currentTarget.style.borderColor   = 'rgba(26,37,53,0.4)';
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <span
                      className="inline-block px-1.5 py-0.5 rounded text-[6.5px] font-bold mb-1.5"
                      style={{
                        background:  `${doc.tagColor}18`,
                        border:      `1px solid ${doc.tagColor}40`,
                        color:       doc.tagColor,
                        letterSpacing: '0.04em',
                      }}
                    >
                      {doc.tag}
                    </span>
                    <div className="font-bold text-[9px] leading-snug mb-1" style={{ color: '#ccd6e0' }}>
                      {doc.title}
                    </div>
                    <div className="text-[7.5px] leading-relaxed" style={{ color: '#536878' }}>
                      {doc.body}
                    </div>
                  </div>
                  <ExternalLink className="w-3 h-3 shrink-0 mt-0.5" style={{ color: '#0096ff' }} />
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* ── FOOTER HUD ───────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 shrink-0 text-[6.5px]"
        style={{ height: 30, background: 'rgba(4,4,8,0.97)', borderTop: '1px solid rgba(26,37,53,0.4)', color: '#2a3a4a' }}
      >
        <span>SOURCES: ICRC · +972 MAGAZINE · HRW · AMNESTY INTERNATIONAL · UN CCW GGE · STOP KILLER ROBOTS</span>
        <div className="flex gap-4">
          <a
            href="https://www.stopkillerrobots.org"
            target="_blank" rel="noopener noreferrer"
            className="font-bold transition-colors"
            style={{ color: '#ec4899', textDecoration: 'none' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#f472b6')}
            onMouseLeave={e => (e.currentTarget.style.color = '#ec4899')}
          >
            STOP KILLER ROBOTS ↗
          </a>
          <a
            href="https://ihl-databases.icrc.org"
            target="_blank" rel="noopener noreferrer"
            className="font-bold transition-colors"
            style={{ color: '#00d47e', textDecoration: 'none' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#4ade80')}
            onMouseLeave={e => (e.currentTarget.style.color = '#00d47e')}
          >
            ICRC IHL DATABASE ↗
          </a>
        </div>
      </div>
    </div>
  );
}
