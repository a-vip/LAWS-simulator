'use client';
import { useState } from 'react';
import { X, ChevronDown, ExternalLink, ShieldAlert } from 'lucide-react';

// Real treaty data sourced from:
// - ICRC Treaty Database: https://ihl-databases.icrc.org
// - UN CCW Group of Governmental Experts documents
// - Stop Killer Robots country position tracker
// - UNIDIR LAWS database
// Last updated: June 2025

type TreatyStatus = 'party' | 'signatory' | 'observer' | '-';
type LawsPosition = 'PRO' | 'NEUTRAL' | 'MIXED' | 'AGAINST';

interface CountryData {
  name: string;
  position: LawsPosition;
  positionNote: string;
  gc: TreatyStatus;        // Geneva Conventions I-IV
  ccw: TreatyStatus;       // Convention on Certain Conventional Weapons
  ccw2: TreatyStatus;      // CCW Amended Protocol II (landmines)
  ccw5: TreatyStatus;      // CCW Protocol V (explosive remnants of war)
  icc: TreatyStatus;       // Rome Statute / ICC
  un: boolean;             // Submitted a LAWS working paper to CCW GGE
  source: string;
}

const TREATY_DATA: CountryData[] = [
  // AGAINST — Oppose/Block Binding Treaty
  {
    name: 'United States', position: 'AGAINST', positionNote: 'Opposes a binding instrument; advocates for non-binding political declaration only. DoD Directive 3000.09 governs autonomy.',
    gc: 'party', ccw: 'party', ccw2: 'party', ccw5: 'party', icc: '-', un: true,
    source: 'https://undocs.org/CCW/GGE.1/2023/WP.4',
  },
  {
    name: 'Russia', position: 'AGAINST', positionNote: 'Formally opposes any treaty on LAWS; considers existing IHL sufficient. Has submitted GGE papers opposing new instruments.',
    gc: 'party', ccw: 'party', ccw2: 'party', ccw5: 'party', icc: '-', un: true,
    source: 'https://undocs.org/CCW/GGE.1/2023/WP.5',
  },
  {
    name: 'Israel', position: 'AGAINST', positionNote: 'No binding treaty; existing IHL is adequate. Significant LAWS developer and user — Project Lavender, Gospel AI systems documented.',
    gc: 'party', ccw: '-', ccw2: '-', ccw5: '-', icc: '-', un: false,
    source: 'https://www.972mag.com/mass-assassination-factory-israel-calculated-bombing-gaza/',
  },
  {
    name: 'India', position: 'AGAINST', positionNote: 'Opposes a binding treaty; wants technology-neutral approach. Developing autonomous weapons capabilities.',
    gc: 'party', ccw: 'party', ccw2: 'party', ccw5: '-', icc: '-', un: true,
    source: 'https://disarmament.unoda.org/en/our-work/conventional-arms/convention-certain-conventional-weapons',
  },
  {
    name: 'South Korea', position: 'AGAINST', positionNote: 'Cautious; supports principles-based approach. Operates autonomous sentry guns (SGR-A1) along DMZ.',
    gc: 'party', ccw: 'party', ccw2: 'party', ccw5: '-', icc: 'party', un: false,
    source: 'https://undocs.org/CCW/GGE.1/2023/WP.4',
  },
  // NEUTRAL — Voluntary Regulation Only
  {
    name: 'United Kingdom', position: 'NEUTRAL', positionNote: 'Supports political declaration only; developing responsible AI in defence policy. Not committed to binding norms.',
    gc: 'party', ccw: 'party', ccw2: 'party', ccw5: 'party', icc: 'party', un: true,
    source: 'https://undocs.org/CCW/GGE.1/2023/WP.4',
  },
  {
    name: 'France', position: 'NEUTRAL', positionNote: 'Favours political declaration and code of conduct. Abstained from pro-treaty resolutions at UN First Committee 2023.',
    gc: 'party', ccw: 'party', ccw2: 'party', ccw5: 'party', icc: 'party', un: true,
    source: 'https://undocs.org/CCW/GGE.1/2023/WP.4',
  },
  {
    name: 'Germany', position: 'NEUTRAL', positionNote: 'Supports non-binding guiding principles in GGE. Signed the political declaration on LAWS with US, UK, France (Nov 2023).',
    gc: 'party', ccw: 'party', ccw2: 'party', ccw5: 'party', icc: 'party', un: true,
    source: 'https://undocs.org/CCW/GGE.1/2023/WP.4',
  },
  {
    name: 'Japan', position: 'NEUTRAL', positionNote: 'Cautious, national security concerns. Supports GGE process but no position on binding instrument.',
    gc: 'party', ccw: 'party', ccw2: 'party', ccw5: '-', icc: 'party', un: true,
    source: 'https://undocs.org/CCW/GGE.1/2023/WP.4',
  },
  {
    name: 'Australia', position: 'NEUTRAL', positionNote: 'Supports principles-based approach within CCW. Engages in AUKUS tech sharing including autonomy programmes.',
    gc: 'party', ccw: 'party', ccw2: 'party', ccw5: 'party', icc: 'party', un: true,
    source: 'https://undocs.org/CCW/GGE.1/2023/WP.4',
  },
  // MIXED — Conditional Support
  {
    name: 'China', position: 'MIXED', positionNote: 'Submitted prohibition proposal to CCW in 2019; unclear if genuine or tactical. Largest LAWS developer globally alongside US.',
    gc: 'party', ccw: 'party', ccw2: 'party', ccw5: 'party', icc: '-', un: true,
    source: 'https://undocs.org/CCW/GGE.1/2019/WP.1',
  },
  {
    name: 'Brazil', position: 'MIXED', positionNote: 'Co-sponsored 2023 UN First Committee resolution on LAWS. Supports negotiating a new legal instrument but not a total ban.',
    gc: 'party', ccw: 'party', ccw2: 'party', ccw5: 'party', icc: 'party', un: true,
    source: 'https://www.stopkillerrobots.org/',
  },
  {
    name: 'Turkey', position: 'MIXED', positionNote: 'Operates KARGU-2 loitering munition (documented in UN Libya report 2021). Officially supports developing international norms.',
    gc: 'party', ccw: 'party', ccw2: 'party', ccw5: '-', icc: '-', un: true,
    source: 'https://undocs.org/S/2021/229',
  },
  {
    name: 'Pakistan', position: 'MIXED', positionNote: 'Advocates new international legal instrument; concerned by LAWS proliferation. Submitted GGE working papers.',
    gc: 'party', ccw: 'party', ccw2: 'party', ccw5: '-', icc: '-', un: true,
    source: 'https://disarmament.unoda.org/en/our-work/conventional-arms/convention-certain-conventional-weapons',
  },
  // PRO — Support Binding Treaty
  {
    name: 'Austria', position: 'PRO', positionNote: 'Leading LAWS disarmament advocate. Submitted key working papers, co-hosts Vienna Conference on LAWS. Wants preemptive prohibition.',
    gc: 'party', ccw: 'party', ccw2: 'party', ccw5: 'party', icc: 'party', un: true,
    source: 'https://disarmament.unoda.org/en/our-work/conventional-arms/convention-certain-conventional-weapons',
  },
  {
    name: 'New Zealand', position: 'PRO', positionNote: 'Supports binding international treaty. Voted yes on UN First Committee resolution 2023. Member of the Group of Friends on LAWS.',
    gc: 'party', ccw: 'party', ccw2: 'party', ccw5: 'party', icc: 'party', un: true,
    source: 'https://www.stopkillerrobots.org/',
  },
  {
    name: 'Panama', position: 'PRO', positionNote: 'Co-sponsored 2023 UNGA LAWS resolution; strong advocate for new binding norms.',
    gc: 'party', ccw: 'party', ccw2: 'signatory', ccw5: 'party', icc: 'party', un: false,
    source: 'https://www.stopkillerrobots.org/',
  },
  {
    name: 'Costa Rica', position: 'PRO', positionNote: 'Diplomatically active in disarmament; supports preemptive prohibition of LAWS. Voted for 2023 UNGA resolution.',
    gc: 'party', ccw: 'party', ccw2: 'party', ccw5: 'party', icc: 'party', un: false,
    source: 'https://www.stopkillerrobots.org/',
  },
  {
    name: 'Mexico', position: 'PRO', positionNote: 'Strong advocate for a binding legal instrument within the UN framework. Co-authored Latin American LAWS joint paper.',
    gc: 'party', ccw: 'party', ccw2: 'party', ccw5: '-', icc: 'party', un: true,
    source: 'https://disarmament.unoda.org/en/our-work/conventional-arms/convention-certain-conventional-weapons',
  },
  {
    name: 'Egypt', position: 'PRO', positionNote: 'Speaks for African Group; supports new binding treaty at GGE. Submitted joint African position paper.',
    gc: 'party', ccw: 'party', ccw2: '-', ccw5: '-', icc: '-', un: true,
    source: 'https://disarmament.unoda.org/en/our-work/conventional-arms/convention-certain-conventional-weapons',
  },
];

const POSITION_CONFIG: Record<LawsPosition, { label: string; color: string; bg: string; borderColor: string }> = {
  AGAINST: { label: 'AGAINST', color: '#ff1a2e', bg: 'rgba(255,26,46,0.12)', borderColor: 'rgba(255,26,46,0.35)' },
  NEUTRAL: { label: 'NEUTRAL', color: '#ffaa00', bg: 'rgba(255,170,0,0.12)', borderColor: 'rgba(255,170,0,0.35)' },
  MIXED:   { label: 'MIXED',   color: '#a855f7', bg: 'rgba(168,85,247,0.12)', borderColor: 'rgba(168,85,247,0.35)' },
  PRO:     { label: 'PRO',     color: '#00d47e', bg: 'rgba(0,212,126,0.12)',  borderColor: 'rgba(0,212,126,0.35)' },
};

const SECTION_LABELS: Record<LawsPosition, string> = {
  AGAINST: 'OPPOSE / BLOCK BINDING TREATY',
  NEUTRAL: 'NEUTRAL — VOLUNTARY REGULATION ONLY',
  MIXED:   'MIXED / CONDITIONAL SUPPORT',
  PRO:     'SUPPORT BINDING TREATY',
};

const GROUP_ORDER: LawsPosition[] = ['AGAINST', 'NEUTRAL', 'MIXED', 'PRO'];

function TreatyCheck({ status }: { status: TreatyStatus }) {
  if (status === 'party') return <span style={{ color: '#00d47e', fontWeight: 700 }}>✓</span>;
  if (status === 'signatory') return <span style={{ color: '#ffaa00', fontWeight: 700 }}>◎</span>;
  if (status === 'observer') return <span style={{ color: '#536878' }}>○</span>;
  return <span style={{ color: '#2d3748' }}>—</span>;
}

interface IHLPolicyModalProps {
  onClose: () => void;
}

export function IHLPolicyModal({ onClose }: IHLPolicyModalProps) {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [sortGroup, setSortGroup] = useState<LawsPosition | 'ALL'>('ALL');

  const grouped = GROUP_ORDER.reduce((acc, pos) => {
    acc[pos] = TREATY_DATA.filter((c) => c.position === pos);
    return acc;
  }, {} as Record<LawsPosition, CountryData[]>);

  const filtered = sortGroup === 'ALL'
    ? TREATY_DATA
    : TREATY_DATA.filter((c) => c.position === sortGroup);

  const displayGroups = sortGroup === 'ALL'
    ? GROUP_ORDER.map((g) => ({ pos: g, countries: grouped[g] }))
    : [{ pos: sortGroup, countries: filtered }];

  const colStyle: React.CSSProperties = {
    fontFamily: 'monospace', fontSize: '8px', color: '#536878', fontWeight: 700,
    letterSpacing: '0.5px', padding: '4px 6px', textAlign: 'center' as const,
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)',
        zIndex: 99999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
        overflow: 'hidden',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '740px', maxWidth: '100%',
          height: 'min(680px, calc(100vh - 32px))',
          background: 'rgba(5, 8, 14, 0.99)',
          border: '1px solid rgba(0, 150, 255, 0.25)',
          borderRadius: '10px', display: 'flex', flexDirection: 'column', overflow: 'hidden',
          boxShadow: '0 24px 80px rgba(0,0,0,0.9), 0 0 40px rgba(0,150,255,0.08)',
          fontFamily: 'monospace',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '12px 16px', borderBottom: '1px solid rgba(0,150,255,0.15)',
          background: 'rgba(0,150,255,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldAlert size={14} style={{ color: '#ff1a2e' }} />
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#ffffff', letterSpacing: '0.12em' }}>
                LAWS TREATY &amp; INSTRUMENT OBLIGATIONS
              </div>
              <div style={{ fontSize: '8px', color: '#536878', marginTop: '1px', letterSpacing: '0.05em' }}>
                CCW GGE DATA · ICRC TREATY DB · UN FIRST COMMITTEE VOTES · STOP KILLER ROBOTS
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontSize: '8px', fontWeight: 700, color: '#00d47e',
              background: 'rgba(0,212,126,0.1)', border: '1px solid rgba(0,212,126,0.3)',
              padding: '2px 6px', borderRadius: '3px', letterSpacing: '0.5px',
            }}>STATUS</span>
            <button onClick={onClose} style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              color: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', padding: '5px', borderRadius: '5px', transition: 'all 0.2s',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
            ><X size={12} /></button>
          </div>
        </div>

        {/* Legend + filter */}
        <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0, background: 'rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '8.5px', color: '#536878', marginBottom: '8px' }}>
            <span><b style={{ color: '#ccd6e0' }}>GC</b> = Geneva Conventions I–IV</span>
            <span><b style={{ color: '#ccd6e0' }}>CCW</b> = Conv. Certain Conventional Weapons</span>
            <span><b style={{ color: '#ccd6e0' }}>CCW-II</b> = CCW Amended Protocol II (mines)</span>
            <span><b style={{ color: '#ccd6e0' }}>CCW-V</b> = CCW Protocol V (explosive remnants)</span>
            <span><b style={{ color: '#ccd6e0' }}>ICC</b> = Rome Statute</span>
            <span><span style={{ color: '#00d47e' }}>✓</span> = party &nbsp; <span style={{ color: '#ffaa00' }}>◎</span> = signatory &nbsp; <span style={{ color: '#2d3748' }}>—</span> = not party</span>
          </div>
          {/* Position filter tabs */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {(['ALL', ...GROUP_ORDER] as (LawsPosition | 'ALL')[]).map((pos) => {
              const cfg = pos === 'ALL' ? { color: '#0096ff', bg: 'rgba(0,150,255,0.1)', borderColor: 'rgba(0,150,255,0.3)', label: 'ALL' } : POSITION_CONFIG[pos];
              const active = sortGroup === pos;
              return (
                <button
                  key={pos}
                  onClick={() => setSortGroup(pos)}
                  style={{
                    fontSize: '8px', fontWeight: 700, padding: '3px 8px', borderRadius: '3px',
                    cursor: 'pointer', fontFamily: 'monospace', letterSpacing: '0.5px',
                    background: active ? cfg.bg : 'transparent',
                    color: active ? cfg.color : '#536878',
                    border: `1px solid ${active ? cfg.borderColor : 'rgba(255,255,255,0.08)'}`,
                    transition: 'all 0.15s',
                  }}
                >{pos === 'ALL' ? 'ALL STATES' : POSITION_CONFIG[pos].label}</button>
              );
            })}
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }} className="ihl-table-scroll">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, background: 'rgba(5,8,14,0.98)', zIndex: 1 }}>
              <tr>
                <th style={{ ...colStyle, textAlign: 'left', padding: '8px 16px', width: '160px' }}>STATE</th>
                <th style={{ ...colStyle, width: '100px' }}>POSITION</th>
                <th style={{ ...colStyle }}>GC</th>
                <th style={{ ...colStyle }}>CCW</th>
                <th style={{ ...colStyle }}>CCW-II</th>
                <th style={{ ...colStyle }}>CCW-V</th>
                <th style={{ ...colStyle }}>ICC</th>
                <th style={{ ...colStyle }}>GGE</th>
              </tr>
            </thead>
            <tbody>
              {displayGroups.map(({ pos, countries }) => (
                <>
                  {/* Group header row */}
                  <tr key={`group-${pos}`}>
                    <td colSpan={8} style={{
                      padding: '5px 16px', fontSize: '7.5px', fontWeight: 700,
                      letterSpacing: '0.8px', color: POSITION_CONFIG[pos].color,
                      background: POSITION_CONFIG[pos].bg, borderTop: '1px solid rgba(255,255,255,0.04)',
                    }}>
                      {SECTION_LABELS[pos]}
                    </td>
                  </tr>
                  {countries.map((c) => {
                    const cfg = POSITION_CONFIG[c.position];
                    const isHovered = hoveredRow === c.name;
                    const isExpanded = expandedRow === c.name;
                    return (
                      <>
                        <tr
                          key={c.name}
                          onClick={() => setExpandedRow(isExpanded ? null : c.name)}
                          onMouseEnter={() => setHoveredRow(c.name)}
                          onMouseLeave={() => setHoveredRow(null)}
                          style={{
                            cursor: 'pointer',
                            background: isHovered || isExpanded ? 'rgba(255,255,255,0.035)' : 'transparent',
                            borderBottom: '1px solid rgba(255,255,255,0.03)',
                            transition: 'background 0.15s',
                          }}
                        >
                          <td style={{ padding: '7px 16px', fontSize: '10.5px', fontWeight: isExpanded ? 700 : 500, color: isExpanded ? '#ffffff' : '#ccd6e0' }}>
                            {c.name}
                          </td>
                          <td style={{ textAlign: 'center', padding: '7px 6px' }}>
                            <span style={{
                              fontSize: '8px', fontWeight: 800, padding: '2px 6px', borderRadius: '3px',
                              color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.borderColor}`,
                              letterSpacing: '0.4px',
                            }}>{cfg.label}</span>
                          </td>
                          <td style={{ textAlign: 'center', fontSize: '11px', padding: '7px 6px' }}><TreatyCheck status={c.gc} /></td>
                          <td style={{ textAlign: 'center', fontSize: '11px', padding: '7px 6px' }}><TreatyCheck status={c.ccw} /></td>
                          <td style={{ textAlign: 'center', fontSize: '11px', padding: '7px 6px' }}><TreatyCheck status={c.ccw2} /></td>
                          <td style={{ textAlign: 'center', fontSize: '11px', padding: '7px 6px' }}><TreatyCheck status={c.ccw5} /></td>
                          <td style={{ textAlign: 'center', fontSize: '11px', padding: '7px 6px' }}><TreatyCheck status={c.icc} /></td>
                          <td style={{ textAlign: 'center', fontSize: '10px', padding: '7px 6px', color: c.un ? '#00d47e' : '#2d3748', fontWeight: 700 }}>
                            {c.un ? '✓' : '—'}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${c.name}-detail`}>
                            <td colSpan={8} style={{
                              padding: '8px 16px 12px 32px',
                              background: 'rgba(0,0,0,0.35)', borderBottom: '1px solid rgba(255,255,255,0.05)',
                            }}>
                              <div style={{ fontSize: '9px', color: '#8892a4', lineHeight: '1.55', marginBottom: '6px' }}>
                                {c.positionNote}
                              </div>
                              <a href={c.source} target="_blank" rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  fontSize: '8px', color: '#0096ff', textDecoration: 'none',
                                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                                  transition: 'color 0.15s',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = '#38bdf8')}
                                onMouseLeave={(e) => (e.currentTarget.style.color = '#0096ff')}
                              >
                                <ExternalLink size={10} /> SOURCE REFERENCE ↗
                              </a>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{
          padding: '8px 16px', borderTop: '1px solid rgba(255,255,255,0.05)',
          background: 'rgba(2,4,10,0.5)', display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', fontSize: '7.5px', color: '#2d3748', flexShrink: 0,
        }}>
          <span>DATA: ICRC · UN CCW GGE · STOP KILLER ROBOTS · UNIDIR · Jun 2025</span>
          <span style={{ color: '#ff1a2e', fontWeight: 700 }}>NO BINDING TREATY EXISTS</span>
        </div>
      </div>

      <style>{`
        .ihl-table-scroll::-webkit-scrollbar { width: 5px; }
        .ihl-table-scroll::-webkit-scrollbar-track { background: rgba(0,0,0,0.3); }
        .ihl-table-scroll::-webkit-scrollbar-thumb { background: rgba(0,150,255,0.25); border-radius: 3px; }
        .ihl-table-scroll::-webkit-scrollbar-thumb:hover { background: rgba(0,150,255,0.45); }
      `}</style>
    </div>
  );
}
