'use client';
import { useState } from 'react';
import { ExternalLink, AlertTriangle, Shield, CheckCircle, XCircle, ChevronDown, ChevronRight } from 'lucide-react';

// ── Source-referenced data ─────────────────────────────────────────────────

interface IHLPrinciple {
  id: string;
  name: string;
  article: string;
  treaty: string;
  treatyUrl: string;
  description: string;
  lawsConflict: string;
  violated: boolean;
  caseNote: string;
  caseUrl: string;
}

const IHL_PRINCIPLES: IHLPrinciple[] = [
  {
    id: 'distinction',
    name: 'Principle of Distinction',
    article: 'API Art. 48, 51–52 | GCIV Art. 50',
    treaty: 'Additional Protocol I (1977)',
    treatyUrl: 'https://ihl-databases.icrc.org/en/ihl-treaties/api-1977/article-48',
    description: 'Parties must at all times distinguish between civilians and combatants. Attacks may only be directed against combatants and military objectives. Civilian objects must not be attacked.',
    lawsConflict: 'Algorithmic systems cannot reliably distinguish combatants from civilians in complex urban environments. Israel\'s "Lavender" AI marked 37,000 Palestinian men as potential targets based on behavioural patterns — pattern-of-life association is not individualised assessment.',
    violated: true,
    caseNote: '"+972 Magazine / Local Call, "Lavender: The AI machine directing Israel\'s bombing spree in Gaza" (2024)',
    caseUrl: 'https://www.972mag.com/lavender-ai-israeli-army-gaza/',
  },
  {
    id: 'proportionality',
    name: 'Principle of Proportionality',
    article: 'API Art. 51(5)(b), 57(2)(a)(iii)',
    treaty: 'Additional Protocol I (1977)',
    treatyUrl: 'https://ihl-databases.icrc.org/en/ihl-treaties/api-1977/article-51',
    description: 'An attack is prohibited if it may be expected to cause incidental civilian casualties, injury, or damage to civilian objects which would be excessive in relation to the concrete and direct military advantage anticipated.',
    lawsConflict: '"Where\'s Daddy?" system targeted individuals at home, maximising civilian co-location. The IDF permitted up to 20 civilian deaths per low-ranking target. Pre-programmed kill-ratios remove case-by-case proportionality assessment from human commanders.',
    violated: true,
    caseNote: 'Amnesty International, "Damning evidence of war crimes as Israeli attacks wipe out entire families in Gaza" (2023)',
    caseUrl: 'https://www.amnesty.org/en/latest/news/2023/10/damning-evidence-of-war-crimes-as-israeli-attacks-wipe-out-entire-families-in-gaza/',
  },
  {
    id: 'precaution',
    name: 'Principle of Precaution',
    article: 'API Art. 57',
    treaty: 'Additional Protocol I (1977)',
    treatyUrl: 'https://ihl-databases.icrc.org/en/ihl-treaties/api-1977/article-57',
    description: 'Constant care must be taken to spare civilians and civilian objects. All feasible precautions must be taken in the choice of means and methods of attack to avoid incidental civilian losses.',
    lawsConflict: '"Habsora" (Gospel) AI system generated 100 targets per day at a pace no human commander could verify. Human approval took as little as 20 seconds per target. This is not meaningful precautionary review — it is rubber-stamping at machine speed.',
    violated: true,
    caseNote: 'HRW, "Gaza: Israel\'s \'Smart\' Bombs Hit Homes, Civilians" (2024)',
    caseUrl: 'https://www.hrw.org/news/2024/04/01/gaza-israels-smart-bombs-hit-homes-civilians',
  },
  {
    id: 'humanity',
    name: 'Principle of Humanity / Martens Clause',
    article: 'HAGUE IV Preamble | API Art. 1(2)',
    treaty: 'Hague Convention IV (1907) / API (1977)',
    treatyUrl: 'https://ihl-databases.icrc.org/en/ihl-treaties/hague-conv-iv-1907',
    description: 'In cases not covered by treaty, civilians and combatants remain under the protection of the principles of the law of nations derived from established custom, humanity, and the dictates of public conscience.',
    lawsConflict: 'Fully autonomous weapons that kill without any human decision-making — even in legal grey areas — violate the spirit of humanity. No machine can exercise compassion, mercy, or conscience. Delegating life/death decisions to algorithms violates human dignity.',
    violated: true,
    caseNote: 'ICRC, "Autonomous Weapon Systems: Implications of Increasing Autonomy in the Critical Functions of Weapons" (2016)',
    caseUrl: 'https://www.icrc.org/en/publication/autonomous-weapon-systems-implications-increasing-autonomy-critical-functions-weapons',
  },
  {
    id: 'accountability',
    name: 'Command Responsibility & Accountability',
    article: 'API Art. 86–87 | Rome Statute Art. 28',
    treaty: 'Additional Protocol I / ICC Rome Statute',
    treatyUrl: 'https://ihl-databases.icrc.org/en/ihl-treaties/api-1977/article-86',
    description: 'Commanders are responsible for war crimes committed by subordinates if they knew or should have known of the crimes and failed to prevent or punish them. Full accountability requires a human decision-maker.',
    lawsConflict: 'When an AI system selects and engages a target autonomously, no legal accountability chain exists. Manufacturers cannot be prosecuted under IHL. No commander personally decided. This creates an accountability gap — a "responsibility vacuum" — in LAWS deployments.',
    violated: true,
    caseNote: 'UN Group of Governmental Experts, CCW/GGE.2/2019/3 — "Applicability of IHL"',
    caseUrl: 'https://documents.unoda.org/wp-content/uploads/2019/09/2019_GGE-LAWS_Session-3_Document3.pdf',
  },
];

interface RubberStampCase {
  system: string;
  country: string;
  reviewTime: string;
  targetsPerDay: number;
  source: string;
  sourceUrl: string;
  detail: string;
}

const RUBBER_STAMP_CASES: RubberStampCase[] = [
  {
    system: 'Habsora (Gospel)',
    country: 'Israel (IDF)',
    reviewTime: '~20 seconds',
    targetsPerDay: 100,
    source: '+972 Magazine / Local Call (2024)',
    sourceUrl: 'https://www.972mag.com/mass-assassination-factory-israel-calculated-bombing-gaza/',
    detail: 'AI system generated target lists at machine pace. Human operators spent ~20 seconds reviewing each AI-generated target before approving strikes. This pace is physically incompatible with meaningful legal review.',
  },
  {
    system: 'Lavender',
    country: 'Israel (IDF)',
    reviewTime: '< 1 minute per target',
    targetsPerDay: 37000,
    source: '+972 Magazine / Local Call (2024)',
    sourceUrl: 'https://www.972mag.com/lavender-ai-israeli-army-gaza/',
    detail: 'Lavender AI assigned probability scores to 37,000 Palestinian men marking them as "suspected militants". Officers described treating AI output as "fact", rarely overriding it. Machine confidence became operational authority.',
  },
  {
    system: 'KARGU-2',
    country: 'Turkey (exported)',
    reviewTime: 'Autonomous — no review',
    targetsPerDay: 0,
    source: 'UN Panel of Experts, Libya Report S/2021/229',
    sourceUrl: 'https://documents.un.org/doc/undoc/gen/n21/037/72/pdf/n2103772.pdf',
    detail: '2020 Libya conflict: UN experts documented KARGU-2 loitering munitions that may have autonomously hunted and engaged targets without operator connection — the first confirmed LAWS combat incident.',
  },
];

interface KeyDocProps {
  title: string;
  body: string;
  url: string;
  tag: string;
  tagColor: string;
}

const KEY_DOCUMENTS: KeyDocProps[] = [
  {
    title: 'ICRC Position on Autonomous Weapons (2021)',
    body: 'The ICRC calls for new rules to prohibit unpredictable LAWS and require meaningful human control over all weapons systems with autonomous functions in attacks.',
    url: 'https://www.icrc.org/en/document/icrc-position-autonomous-weapon-systems',
    tag: 'ICRC POLICY',
    tagColor: '#00d47e',
  },
  {
    title: 'UN Secretary-General: Ban Autonomous Weapons (2023)',
    body: 'UN SG António Guterres called for a legally binding instrument to prohibit LAWS before 2026, warning that "machines with the power and discretion to take lives without human involvement are politically unacceptable, morally repugnant and should be prohibited by international law."',
    url: 'https://www.un.org/sg/en/content/sg/statement/2023-11-01/secretary-generals-statement-the-high-level-meeting-autonomous-weapons',
    tag: 'UN STATEMENT',
    tagColor: '#0096ff',
  },
  {
    title: '"Meaningful Human Control" — ICRC Definition',
    body: '"Meaningful human control" requires that a person must understand and be able to predict system behaviour, be able to activate/deactivate the weapon, and bear genuine legal and moral responsibility. A 20-second rubber stamp does not meet this standard.',
    url: 'https://www.icrc.org/en/document/meaningful-human-control-autonomous-weapon-systems-2023',
    tag: 'LEGAL STANDARD',
    tagColor: '#ffaa00',
  },
  {
    title: 'Stop Killer Robots — Campaign Overview',
    body: 'Coalition of 270+ NGOs in 70+ countries calling for new international law to retain human control over the use of force. Endorsed by the ICRC, UNHCR, and UN Secretary-General.',
    url: 'https://www.stopkillerrobots.org/the-problem/',
    tag: 'ADVOCACY',
    tagColor: '#ec4899',
  },
  {
    title: 'UN First Committee Resolution (Oct 2023)',
    body: 'First-ever UN General Assembly First Committee resolution on LAWS passed with 164 states voting in favour. Calls for substantive discussions on a new international legal framework.',
    url: 'https://www.stopkillerrobots.org/2023/10/un-first-committee-takes-landmark-vote-on-killer-robots/',
    tag: 'UN RESOLUTION',
    tagColor: '#a855f7',
  },
  {
    title: 'Human Rights Watch: "Making the Case" (2023)',
    body: 'Comprehensive legal analysis arguing that the full autonomy in life-and-death decisions is incompatible with IHL requirements for distinction, proportionality, and precaution.',
    url: 'https://www.hrw.org/report/2016/12/19/making-case/dangers-killer-robots-and-need-preemptive-ban',
    tag: 'HRW LEGAL',
    tagColor: '#ff6b35',
  },
];

// ── Component ──────────────────────────────────────────────────────────────

export function ComplianceModule() {
  const [expandedPrinciple, setExpandedPrinciple] = useState<string | null>('distinction');
  const [expandedCase, setExpandedCase] = useState<number | null>(0);
  const [activeTab, setActiveTab] = useState<'principles' | 'rubber-stamp' | 'documents'>('principles');

  const tabs = [
    { id: 'principles' as const, label: 'IHL PRINCIPLES', icon: '⚖️' },
    { id: 'rubber-stamp' as const, label: 'RUBBER STAMP CASES', icon: '📋' },
    { id: 'documents' as const, label: 'KEY DOCUMENTS', icon: '📑' },
  ];

  const mono = "'JetBrains Mono', monospace";

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden',
      background: '#060a12', fontFamily: mono, color: '#ccd6e0',
    }}>
      {/* ── Module Header ── */}
      <div style={{
        padding: '14px 20px 10px', borderBottom: '1px solid rgba(255,26,46,0.2)',
        background: 'rgba(255,26,46,0.04)', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '10px', color: '#ff1a2e', fontWeight: 700, letterSpacing: '0.15em', marginBottom: '3px' }}>
              MODULE 6 // IHL COMPLIANCE & ACCOUNTABILITY
            </div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff', letterSpacing: '0.05em' }}>
              HUMANITARIAN COMPLIANCE ASSESSMENT
            </div>
            <div style={{ fontSize: '9px', color: '#536878', marginTop: '3px', letterSpacing: '0.05em' }}>
              Meaningful Human Control · Geneva Conventions · IHL Principles · Documented Violations · Advocacy Framework
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
            <span style={{
              fontSize: '8px', fontWeight: 800, padding: '3px 8px', borderRadius: '3px',
              background: 'rgba(255,26,46,0.15)', border: '1px solid rgba(255,26,46,0.4)', color: '#ff1a2e',
              letterSpacing: '0.5px', animation: 'pulse 2s infinite',
            }}>NO BINDING TREATY</span>
            <span style={{ fontSize: '7.5px', color: '#536878' }}>IHL VIOLATIONS DOCUMENTED</span>
          </div>
        </div>

        {/* MHC Alert Banner */}
        <div style={{
          marginTop: '10px', padding: '8px 12px', borderRadius: '6px',
          background: 'rgba(255,170,0,0.07)', border: '1px solid rgba(255,170,0,0.25)',
          display: 'flex', alignItems: 'flex-start', gap: '10px',
        }}>
          <AlertTriangle size={13} style={{ color: '#ffaa00', marginTop: '1px', flexShrink: 0 }} />
          <div style={{ fontSize: '9px', color: '#c8a63a', lineHeight: '1.55' }}>
            <strong style={{ color: '#ffaa00', letterSpacing: '0.05em' }}>MEANINGFUL HUMAN CONTROL (MHC)</strong> is the legal and ethical standard required under IHL for all weapons systems.
            A human must be able to: <strong>(1)</strong> understand system behaviour, <strong>(2)</strong> predict targeting outcomes,
            <strong>(3)</strong> intervene and abort, and <strong>(4)</strong> bear genuine legal responsibility.
            A 20-second approval of an AI-generated target list does <strong>not</strong> constitute MHC.
            {' '}<a href="https://www.icrc.org/en/document/meaningful-human-control-autonomous-weapon-systems-2023"
              target="_blank" rel="noopener noreferrer"
              style={{ color: '#ffaa00', textDecoration: 'underline' }}>ICRC Definition ↗</a>
          </div>
        </div>
      </div>

      {/* ── Tab Navigation ── */}
      <div style={{
        display: 'flex', gap: '2px', padding: '8px 20px 0', borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0, background: 'rgba(0,0,0,0.2)',
      }}>
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '6px 14px', borderRadius: '5px 5px 0 0', fontSize: '8.5px', fontWeight: 700,
                letterSpacing: '0.5px', cursor: 'pointer', fontFamily: mono, transition: 'all 0.15s',
                background: active ? 'rgba(255,26,46,0.1)' : 'transparent',
                color: active ? '#ff6b6b' : '#536878',
                border: active ? '1px solid rgba(255,26,46,0.25)' : '1px solid transparent',
                borderBottom: active ? '1px solid #060a12' : '1px solid transparent',
                outline: 'none',
              }}
            >
              {tab.icon} {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab Body ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }} className="compliance-scroll">

        {/* ══ TAB 1: IHL PRINCIPLES ══════════════════════════════════ */}
        {activeTab === 'principles' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '8px', color: '#536878', marginBottom: '4px', letterSpacing: '0.05em' }}>
              The following binding principles of International Humanitarian Law (IHL) apply to all weapons systems.
              Click any principle to see how autonomous weapons conflict with each rule and documented real-world cases.
            </div>
            {IHL_PRINCIPLES.map((p) => {
              const expanded = expandedPrinciple === p.id;
              return (
                <div key={p.id} style={{
                  border: expanded ? '1px solid rgba(255,26,46,0.3)' : '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '6px', overflow: 'hidden',
                  background: expanded ? 'rgba(255,26,46,0.03)' : 'rgba(255,255,255,0.01)',
                }}>
                  {/* Row header */}
                  <div
                    onClick={() => setExpandedPrinciple(expanded ? null : p.id)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 14px', cursor: 'pointer', gap: '12px',
                      background: expanded ? 'rgba(255,26,46,0.06)' : 'transparent',
                    }}
                    onMouseEnter={(e) => { if (!expanded) e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; }}
                    onMouseLeave={(e) => { if (!expanded) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                      <XCircle size={13} style={{ color: '#ff1a2e', flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '10.5px', fontWeight: 700, color: expanded ? '#ffffff' : '#ccd6e0' }}>
                          {p.name}
                        </div>
                        <div style={{ fontSize: '8px', color: '#536878', marginTop: '1px' }}>{p.article}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      <span style={{
                        fontSize: '7.5px', fontWeight: 800, padding: '2px 6px', borderRadius: '3px',
                        background: 'rgba(255,26,46,0.15)', border: '1px solid rgba(255,26,46,0.35)', color: '#ff1a2e',
                      }}>VIOLATED</span>
                      {expanded ? <ChevronDown size={12} color="#536878" /> : <ChevronRight size={12} color="#536878" />}
                    </div>
                  </div>

                  {/* Expanded content */}
                  {expanded && (
                    <div style={{ padding: '12px 14px 14px 38px', borderTop: '1px solid rgba(255,255,255,0.04)', background: 'rgba(0,0,0,0.25)' }}>
                      {/* Treaty source */}
                      <div style={{ marginBottom: '10px' }}>
                        <a href={p.treatyUrl} target="_blank" rel="noopener noreferrer"
                          style={{ fontSize: '8px', color: '#0096ff', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#38bdf8')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = '#0096ff')}
                        ><ExternalLink size={9} /> {p.treaty} — ICRC Treaty Database ↗</a>
                      </div>

                      {/* Rule text */}
                      <div style={{
                        padding: '8px 12px', borderRadius: '5px', marginBottom: '10px',
                        background: 'rgba(0,150,255,0.06)', border: '1px solid rgba(0,150,255,0.15)',
                        fontSize: '9px', color: '#8892a4', lineHeight: '1.6',
                      }}>
                        <span style={{ color: '#38bdf8', fontWeight: 700 }}>THE RULE: </span>{p.description}
                      </div>

                      {/* LAWS conflict */}
                      <div style={{
                        padding: '8px 12px', borderRadius: '5px', marginBottom: '10px',
                        background: 'rgba(255,26,46,0.06)', border: '1px solid rgba(255,26,46,0.15)',
                        fontSize: '9px', color: '#8892a4', lineHeight: '1.6',
                      }}>
                        <span style={{ color: '#ff1a2e', fontWeight: 700 }}>LAWS CONFLICT: </span>{p.lawsConflict}
                      </div>

                      {/* Case note with link */}
                      <a href={p.caseUrl} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: '8px', color: '#ffaa00', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#ffd166')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = '#ffaa00')}
                      >
                        <ExternalLink size={9} /> {p.caseNote} ↗
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ══ TAB 2: RUBBER STAMP CASES ══════════════════════════════ */}
        {activeTab === 'rubber-stamp' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Explainer */}
            <div style={{
              padding: '10px 14px', borderRadius: '6px',
              background: 'rgba(255,26,46,0.06)', border: '1px solid rgba(255,26,46,0.2)',
              fontSize: '9px', color: '#8892a4', lineHeight: '1.65',
            }}>
              <span style={{ color: '#ff6b6b', fontWeight: 700 }}>THE RUBBER STAMP PROBLEM: </span>
              When humans approve AI-generated kill lists at machine speed — without capacity for genuine review — the appearance of human oversight becomes a legal fiction.
              This "rubber stamping" is designed to provide legal cover for fully autonomous targeting, while maintaining the fiction of meaningful human control.
              The cases below are documented from investigative reporting and UN expert reports.
            </div>

            {RUBBER_STAMP_CASES.map((c, i) => {
              const expanded = expandedCase === i;
              return (
                <div key={i} style={{
                  border: expanded ? '1px solid rgba(255,170,0,0.35)' : '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '8px', overflow: 'hidden',
                  background: expanded ? 'rgba(255,170,0,0.03)' : 'rgba(255,255,255,0.01)',
                }}>
                  <div
                    onClick={() => setExpandedCase(expanded ? null : i)}
                    style={{
                      padding: '12px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      background: expanded ? 'rgba(255,170,0,0.05)' : 'transparent',
                    }}
                    onMouseEnter={(e) => { if (!expanded) e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; }}
                    onMouseLeave={(e) => { if (!expanded) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#ffffff' }}>{c.system}</div>
                        <div style={{ fontSize: '8px', color: '#536878', marginTop: '2px' }}>{c.country}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <div style={{
                          padding: '3px 8px', borderRadius: '4px', fontSize: '8px', fontWeight: 700,
                          background: 'rgba(255,26,46,0.1)', border: '1px solid rgba(255,26,46,0.25)', color: '#ff6b6b',
                        }}>
                          ⏱ {c.reviewTime}
                        </div>
                        {c.targetsPerDay > 0 && (
                          <div style={{
                            padding: '3px 8px', borderRadius: '4px', fontSize: '8px', fontWeight: 700,
                            background: 'rgba(255,170,0,0.08)', border: '1px solid rgba(255,170,0,0.2)', color: '#ffaa00',
                          }}>
                            {c.targetsPerDay.toLocaleString()} TARGETS/DAY
                          </div>
                        )}
                      </div>
                    </div>
                    {expanded ? <ChevronDown size={13} color="#536878" /> : <ChevronRight size={13} color="#536878" />}
                  </div>
                  {expanded && (
                    <div style={{ padding: '10px 16px 14px', borderTop: '1px solid rgba(255,255,255,0.04)', background: 'rgba(0,0,0,0.3)' }}>
                      <p style={{ fontSize: '9.5px', color: '#8892a4', lineHeight: '1.65', margin: '0 0 10px' }}>{c.detail}</p>
                      <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: '8px', color: '#0096ff', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#38bdf8')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = '#0096ff')}
                      ><ExternalLink size={10} /> {c.source} ↗</a>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Diagram — rubber stamp visual */}
            <div style={{
              marginTop: '4px', padding: '16px', borderRadius: '8px',
              background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{ fontSize: '9px', color: '#536878', fontWeight: 700, marginBottom: '12px', letterSpacing: '0.5px' }}>
                MHC vs. RUBBER STAMP — DECISION CHAIN COMPARISON
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {/* Meaningful Human Control */}
                <div style={{ padding: '10px', borderRadius: '6px', background: 'rgba(0,212,126,0.05)', border: '1px solid rgba(0,212,126,0.2)' }}>
                  <div style={{ fontSize: '8.5px', fontWeight: 800, color: '#00d47e', marginBottom: '8px', letterSpacing: '0.5px' }}>✓ MEANINGFUL HUMAN CONTROL</div>
                  {['Commander reviews intelligence', 'Independent target verification', 'Proportionality assessment', 'Precautionary alternatives considered', 'Deliberate authorisation', 'Legal accountability established'].map((s, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px', fontSize: '8.5px', color: '#8892a4' }}>
                      <CheckCircle size={9} style={{ color: '#00d47e', flexShrink: 0 }} /> {s}
                    </div>
                  ))}
                </div>
                {/* Rubber Stamp */}
                <div style={{ padding: '10px', borderRadius: '6px', background: 'rgba(255,26,46,0.05)', border: '1px solid rgba(255,26,46,0.2)' }}>
                  <div style={{ fontSize: '8.5px', fontWeight: 800, color: '#ff1a2e', marginBottom: '8px', letterSpacing: '0.5px' }}>✗ RUBBER STAMP (LAWS)</div>
                  {['AI generates target list', '20-second review per target', 'No independent verification', 'Proportionality pre-computed', 'Click to approve at machine pace', 'Accountability gap — no legal actor'].map((s, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px', fontSize: '8.5px', color: '#8892a4' }}>
                      <XCircle size={9} style={{ color: '#ff1a2e', flexShrink: 0 }} /> {s}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ TAB 3: KEY DOCUMENTS ═══════════════════════════════════ */}
        {activeTab === 'documents' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '8px', color: '#536878', marginBottom: '4px', letterSpacing: '0.05em' }}>
              Primary sources, international law references, and advocacy documents. All links open in a new tab.
            </div>
            {KEY_DOCUMENTS.map((doc, i) => (
              <a
                key={i}
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'block', padding: '12px 14px', borderRadius: '7px', textDecoration: 'none',
                  background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.06)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,150,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(0,150,255,0.25)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.015)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                      <span style={{
                        fontSize: '7px', fontWeight: 800, padding: '2px 6px', borderRadius: '3px', flexShrink: 0,
                        background: `${doc.tagColor}18`, border: `1px solid ${doc.tagColor}40`, color: doc.tagColor,
                        letterSpacing: '0.4px',
                      }}>{doc.tag}</span>
                    </div>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#ccd6e0', marginBottom: '5px', lineHeight: '1.4' }}>{doc.title}</div>
                    <div style={{ fontSize: '8.5px', color: '#536878', lineHeight: '1.55' }}>{doc.body}</div>
                  </div>
                  <ExternalLink size={12} style={{ color: '#0096ff', flexShrink: 0, marginTop: '2px' }} />
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div style={{
        padding: '7px 20px', borderTop: '1px solid rgba(255,255,255,0.05)',
        background: 'rgba(2,4,10,0.7)', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', fontSize: '7.5px', color: '#2d3748', flexShrink: 0,
      }}>
        <span>SOURCES: ICRC · UNODA · +972 MAGAZINE · HRW · AMNESTY · UN PANEL OF EXPERTS</span>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <a href="https://www.stopkillerrobots.org" target="_blank" rel="noopener noreferrer"
            style={{ color: '#ec4899', textDecoration: 'none', fontWeight: 700 }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#f472b6')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#ec4899')}
          >STOP KILLER ROBOTS ↗</a>
          <a href="https://www.icrc.org/en/war-and-law/weapons/new-weapons" target="_blank" rel="noopener noreferrer"
            style={{ color: '#00d47e', textDecoration: 'none', fontWeight: 700 }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#4ade80')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#00d47e')}
          >ICRC WEAPONS LAW ↗</a>
        </div>
      </div>

      <style>{`
        .compliance-scroll::-webkit-scrollbar { width: 5px; }
        .compliance-scroll::-webkit-scrollbar-track { background: rgba(0,0,0,0.3); }
        .compliance-scroll::-webkit-scrollbar-thumb { background: rgba(255,26,46,0.25); border-radius: 3px; }
        .compliance-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,26,46,0.45); }
      `}</style>
    </div>
  );
}
