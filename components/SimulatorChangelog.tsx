'use client';
import { useState, useEffect, useRef } from 'react';
import { X, ChevronDown, ChevronRight, Terminal } from 'lucide-react';

// Kept in-code — update this array with each git push to keep the changelog current
export const LAWS_CHANGELOG = [
  {
    version: 'v2.5.0',
    date: '2026-06-13',
    title: 'Palantir MAVEN Tactical Overlays',
    isMajor: true,
    bullets: [
      'Implemented full Palantir MAVEN-style tactical map overlay system: threat radials, sensor fan arcs, COA approach vector triangles, drone flight paths with direction arrows, and NATO-style military markers.',
      'Added MAP LAYERS panel with 5 layer groups and 15 sub-layer toggles — ISR Assets, Threat Analysis, Targeting, Battlefield Geometry, Reference.',
      'Deployed to sim.sovdash.com via Vercel. Added subdomain routing.',
      'Added Support button (Patreon, Buy Me a Coffee, SovDash community), BY AVI credit, and simulator changelog.',
      'Fixed Google 3D crash caused by stale Leaflet map reference on mode switch.',
      'Drones now phase-gated: only visible at drone_dispatched, engagement, and impact. Orbit speed and radius corrected to realistic values (~130s per orbit, ~350–660m radius).',
      'Each drone marker now shows a live EO/IR sensor fan triangle pointing toward the target.',
    ],
  },
  {
    version: 'v2.4.1',
    date: '2026-06-04',
    title: 'Memory & Stability Fixes',
    isMajor: false,
    bullets: [
      'Moved to focused Leaflet satellite view with 1,800m range limit to reduce tile load.',
      'Fixed TypeScript syntax error in Map3DView.tsx causing compilation failures.',
      'Resolved map blurring/blank issue after simulation timer completes.',
    ],
  },
  {
    version: 'v2.4.0',
    date: '2026-06-03',
    title: 'Satellite Map & 3D Drone Models',
    isMajor: true,
    bullets: [
      'Integrated Leaflet satellite view with Google Maps tile layer as primary tactical display.',
      'Added volumetric CSS 3D drone models with rotating blades and searchlight cones.',
      'Implemented 60fps animation loop with smooth LERP target tracking and impact shockwave bloom.',
      'Added orbital engagement mode, spectral filter mode, and drone 3D view.',
    ],
  },
  {
    version: 'v2.3.0',
    date: '2026-05-31',
    title: 'Module System & IHL Compliance Engine',
    isMajor: true,
    bullets: [
      'Released 6 intelligence modules: Target Pipeline, Lavender, Habsora, Where\'s Daddy, Human Loop, Compliance.',
      'Built IHL compliance scoring engine with proportionality assessment and legal override prompts.',
      'Added ENGAGEMENTS counter, alert feed, and confidence threshold system.',
    ],
  },
  {
    version: 'v2.2.0',
    date: '2026-05-31',
    title: 'Command Dashboard & Scenario Library',
    isMajor: true,
    bullets: [
      'Built Command Dashboard with three-column pipeline view (Surveillance, Legal Audit, Tactical Execution).',
      'Implemented 7 documented scenarios: Pattern of Life, Structure Targeting, Wedding Strike, Autonomous Engagement, Signature Strike, Facial Recognition, Drone Swarm.',
      'Added system narrative with phase-aware text and ADVANCE simulation controls.',
    ],
  },
  {
    version: 'v2.1.0',
    date: '2026-05-31',
    title: 'Initial Public Release',
    isMajor: true,
    bullets: [
      'Launched LAWS-SIM as a public educational tool documenting real-world autonomous weapons systems and their ethical implications.',
      'Core simulation engine with 8 phases: idle → scanning → assessment → target_acquired → tracking → drone_dispatched → engagement → impact.',
      'Scenarios based on documented JSOC targeting methodology and published LAWS doctrine.',
    ],
  },
];

interface SimulatorChangelogProps {
  onClose: () => void;
}

export function SimulatorChangelog({ onClose }: SimulatorChangelogProps) {
  const [expandedVersions, setExpandedVersions] = useState<Record<string, boolean>>({ 'v2.5.0': true });
  const [pos, setPos] = useState({ x: 100, y: 80 });
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, startPosX: 0, startPosY: 0 });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const startX = Math.max(20, window.innerWidth - 480);
      const startY = Math.max(20, (window.innerHeight - 550) / 2);
      setPos({ x: startX, y: startY });
    }
  }, []);

  const handleDragStart = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setDragging(true);
    dragRef.current = { startX: e.clientX, startY: e.clientY, startPosX: pos.x, startPosY: pos.y };
  };

  useEffect(() => {
    const handleDrag = (e: MouseEvent) => {
      if (!dragging) return;
      setPos({
        x: dragRef.current.startPosX + (e.clientX - dragRef.current.startX),
        y: dragRef.current.startPosY + (e.clientY - dragRef.current.startY),
      });
    };
    const handleUp = () => setDragging(false);
    if (dragging) {
      window.addEventListener('mousemove', handleDrag);
      window.addEventListener('mouseup', handleUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleDrag);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [dragging]);

  const toggleVersion = (version: string) => {
    setExpandedVersions((prev) => ({ ...prev, [version]: !prev[version] }));
  };

  return (
    <div
      className="pointer-events-auto"
      style={{
        position: 'fixed',
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        width: '440px',
        maxWidth: 'calc(100vw - 24px)',
        height: '560px',
        maxHeight: 'calc(100vh - 80px)',
        background: 'rgba(5, 8, 14, 0.97)',
        border: '1px solid rgba(0, 150, 255, 0.3)',
        borderRadius: '10px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.9), 0 0 30px rgba(0, 150, 255, 0.1)',
        zIndex: 9000,
        fontFamily: "'JetBrains Mono', monospace",
        color: '#ccd6e0',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: dragging ? 'none' : 'box-shadow 0.2s ease',
      }}
    >
      {/* Drag Handle */}
      <div
        onMouseDown={handleDragStart}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          borderBottom: '1px solid rgba(0, 150, 255, 0.15)',
          cursor: dragging ? 'grabbing' : 'grab',
          background: 'rgba(0, 150, 255, 0.04)',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Terminal size={13} style={{ color: '#0096ff' }} />
          <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.12em', color: '#ffffff' }}>
            SIMULATOR CHANGELOG
          </span>
          <span style={{ fontSize: '8px', color: 'rgba(0, 150, 255, 0.7)', fontWeight: 700 }}>
            [UPDATE_LOGS]
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            color: '#ffffff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4px',
            borderRadius: '5px',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
          }}
        >
          <X size={12} />
        </button>
      </div>

      {/* Scrollable entries */}
      <div
        style={{ padding: '10px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}
        className="laws-changelog-scroll"
      >
        {LAWS_CHANGELOG.map((item) => {
          const isExpanded = !!expandedVersions[item.version];
          return (
            <div
              key={item.version}
              style={{
                border: isExpanded ? '1px solid rgba(0, 150, 255, 0.25)' : '1px solid rgba(255,255,255,0.04)',
                borderRadius: '6px',
                background: isExpanded ? 'rgba(0, 150, 255, 0.03)' : 'rgba(255,255,255,0.01)',
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              <div
                onClick={() => toggleVersion(item.version)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '9px 12px', cursor: 'pointer',
                  background: isExpanded ? 'rgba(0, 150, 255, 0.06)' : 'transparent',
                  gap: '10px',
                }}
                onMouseEnter={(e) => { if (!isExpanded) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                onMouseLeave={(e) => { if (!isExpanded) e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flex: 1, minWidth: 0 }}>
                  <span style={{
                    fontSize: '9px', fontWeight: 800,
                    color: item.isMajor ? '#0096ff' : '#38bdf8',
                    background: item.isMajor ? 'rgba(0, 150, 255, 0.15)' : 'rgba(56, 189, 248, 0.1)',
                    border: item.isMajor ? '1px solid rgba(0, 150, 255, 0.3)' : '1px solid rgba(56, 189, 248, 0.2)',
                    padding: '1px 5px', borderRadius: '3px', letterSpacing: '0.05em', flexShrink: 0,
                  }}>
                    {item.version}
                  </span>
                  <span style={{ fontSize: '8px', color: '#536878', flexShrink: 0 }}>{item.date}</span>
                  <span style={{ color: 'rgba(255,255,255,0.12)', flexShrink: 0 }}>|</span>
                  <span style={{ fontSize: '10px', fontWeight: isExpanded ? 700 : 500, color: isExpanded ? '#ffffff' : '#8892a4', flex: 1 }}>
                    {item.title}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                  {item.isMajor && !isExpanded && (
                    <span style={{ fontSize: '7px', color: '#ffaa00', background: 'rgba(255, 170, 0, 0.1)', border: '1px solid rgba(255, 170, 0, 0.2)', padding: '1px 4px', borderRadius: '3px', fontWeight: 700 }}>
                      MAJOR
                    </span>
                  )}
                  {isExpanded ? <ChevronDown size={12} color="#536878" /> : <ChevronRight size={12} color="#536878" />}
                </div>
              </div>

              {isExpanded && (
                <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.04)', background: 'rgba(0,0,0,0.25)' }}>
                  <ul style={{ margin: 0, paddingLeft: '14px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
                    {item.bullets.map((bullet, i) => (
                      <li key={i} style={{ fontSize: '9.5px', color: '#8892a4', lineHeight: '1.45', listStyleType: 'square' }}>
                        {bullet}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{
        padding: '7px 12px', borderTop: '1px solid rgba(255,255,255,0.05)',
        background: 'rgba(2, 4, 10, 0.5)', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', fontSize: '7.5px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.05em',
      }}>
        <span>LAWS-SIM // EDUCATIONAL USE ONLY</span>
        <a href="https://aviperera.com" target="_blank" rel="noopener noreferrer"
          style={{ color: '#0096ff', fontWeight: 700, textDecoration: 'none', letterSpacing: '0.05em' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#38bdf8')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#0096ff')}
        >
          BY AVI ↗
        </a>
      </div>

      <style>{`
        .laws-changelog-scroll::-webkit-scrollbar { width: 5px; }
        .laws-changelog-scroll::-webkit-scrollbar-track { background: rgba(0,0,0,0.3); border-radius: 3px; }
        .laws-changelog-scroll::-webkit-scrollbar-thumb { background: rgba(0, 150, 255, 0.3); border-radius: 3px; }
        .laws-changelog-scroll::-webkit-scrollbar-thumb:hover { background: rgba(0, 150, 255, 0.5); }
      `}</style>
    </div>
  );
}
