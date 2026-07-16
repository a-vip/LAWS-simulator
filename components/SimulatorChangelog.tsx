'use client';
import { useState, useEffect, useRef } from 'react';
import { X, ChevronDown, ChevronRight, Terminal } from 'lucide-react';

// Kept in-code — update this array with each git push to keep the changelog current
export const LAWS_CHANGELOG = [
  {
    version: 'v3.1.0',
    date: '2026-07-16',
    title: 'Command Hub Map Fix & Premium Redesign',
    isMajor: true,
    bullets: [
      'Fixed critical map-not-loading bug: added missing glyphs URL to MapLibre GL JS style — symbol-layer failures previously blocked map initialisation.',
      'Added map.resize() + ResizeObserver so the satellite map correctly fills its container when first mounted from the Command Hub view.',
      'Wrapped all MapLibre addSource/addLayer calls in try-catch so a single layer failure never prevents the rest of the map from loading.',
      'Added ← COMMAND HUB back-button on the satellite map view for easy navigation.',
      'Complete CommandDashboard redesign: richer scenario cards with real coordinates, collateral estimate, legal context excerpt, and source citations.',
      'Added advocacy banner per pipeline column explaining the educational purpose of each scenario.',
    ],
  },
  {
    version: 'v3.0.0',
    date: '2026-07-11',
    title: 'M2 Tooltips · M6 Center Fix · Feedback System',
    isMajor: true,
    bullets: [
      'M2 Lavender: Premium hover-tooltip system with hit zones on the LAVENDER box, 4 data-source labels, every profile node, SRV server, and stats panel.',
      'M6 Compliance: Rebuilt center panel as gauge (left) + vertical principle list (right) — eliminated all overlapping text.',
      'Feedback Modal: FEEDBACK button in the header with 6 report categories and anonymous submission.',
      'POST /api/feedback API route: logs to Vercel console; optionally sends Discord webhook via DISCORD_FEEDBACK_WEBHOOK env var.',
    ],
  },
  {
    version: 'v2.9.1',
    date: '2026-07-11',
    title: 'M4 Map Layout & NPC Behaviour Fixes',
    isMajor: false,
    bullets: [
      'Fixed occupant profile panel overlapping the house and map area on all three M4 scenarios.',
      'NPCs: surprise jump + exclamation mark on strike, then flee in the direction opposite the blast.',
      'Population density increased around the target house prior to the strike.',
      'Pedestrian speed tuned to realistic walking pace.',
    ],
  },
  {
    version: 'v2.9.0',
    date: '2026-07-11',
    title: "M4 Where's Daddy — Person Icons, NPCs, Flee Animation, Grid Buildings",
    isMajor: true,
    bullets: [
      'Person-shaped icons for all NPCs and the target (matching M2 Lavender style).',
      'Civilian NPCs walk naturally; on strike they react with ! and flee from blast zone.',
      'Grid-aligned building layout replaces overlapping random polygons.',
      'House interiors show occupants before the target arrives.',
      'Tooltips added for houses, target, radar, and NPC civilians.',
    ],
  },
  {
    version: 'v2.8.0',
    date: '2026-07-11',
    title: 'Reference Links Fixed · Header Cleanup · SIGINT Removed',
    isMajor: false,
    bullets: [
      'Fixed all broken/404 scenario reference links with verified live sources (UNODA, DARPA, bmeia.gv.at, +972 Magazine, HRW, Amnesty International).',
      'Removed SIGINT element from header.',
      'Fixed header overlap issue.',
    ],
  },
  {
    version: 'v2.7.0',
    date: '2026-07-09',
    title: 'M6 Compliance — Pure-HTML Redesign with Animated Gauge',
    isMajor: true,
    bullets: [
      'Rebuilt M6 Compliance entirely in pure React/HTML — no canvas dependency.',
      'Animated compliance gauge SVG (semi-circle arc, 0/5 principles met), fills red as violations are triggered.',
      'Live IHL principle violation stream: each of 5 principles pulses red when violated.',
      'Three-column layout: precedent timeline (left), live gauge (centre), real-world case studies (right).',
      'Advocacy CTA panel with UN CCW and Stop Killer Robots petition links.',
    ],
  },
  {
    version: 'v2.6.1',
    date: '2026-07-09',
    title: 'M5 Human Loop — SVG Clock, Speed Controls, Hover Citations',
    isMajor: false,
    bullets: [
      'Rebuilt M5 as pure HTML for stable rendering at all screen sizes.',
      'SVG decision clock showing 30-second countdown with live arc animation.',
      '4-speed playback control (0.5×, 1×, 2×, 4×) for conference pacing.',
      'Hover cards for all 6 cognitive bias factors reveal academic citations.',
    ],
  },
  {
    version: 'v2.6.0',
    date: '2026-07-09',
    title: 'M5 Human Loop — 3-Column Conference Redesign',
    isMajor: true,
    bullets: [
      'M5 redesigned as a 3-column IHL Decision Framework for conference and summit use.',
      'Left: legal timeline. Centre: real-time decision visualisation with cognitive bias indicators. Right: documented case studies.',
      'Conference-legible typography — readable from 5+ metres.',
    ],
  },
  {
    version: 'v2.5.5',
    date: '2026-07-04',
    title: "M4 Where's Daddy — 3 Scenarios, Radar, Family Collateral",
    isMajor: true,
    bullets: [
      "Launched M4 Where's Daddy: 3 selectable scenarios (Family Strike, School Zone, Hospital Proximity).",
      'Accurate radar display showing target and collateral proximity in real time.',
      "Based on documented IDF pattern-of-life targeting methodology (Yemen, Pakistan, Gaza).",
    ],
  },
  {
    version: 'v2.5.4',
    date: '2026-07-04',
    title: 'M3 Habsora — Premium Overhaul',
    isMajor: true,
    bullets: [
      'M3 Habsora completely rebuilt: building state machine (intact → damaged → destroyed → rubble).',
      'Hover tooltips on each building showing structure type, civilian use, and IHL status.',
      'Based on documented IDF Habsora (Gospel) AI system — 100+ strikes per day in Gaza 2023–24.',
    ],
  },
  {
    version: 'v2.5.3',
    date: '2026-07-04',
    title: 'M1 v2 — Timeline Scrubber & Density Map Labels',
    isMajor: true,
    bullets: [
      'M1 Target Pipeline rebuilt: interactive timeline scrubber with click-to-seek.',
      'Fixed density map label overlaps (country names and casualty counts).',
      'Animated phase transitions with IHL citation callouts at each stage.',
    ],
  },
  {
    version: 'v2.5.2',
    date: '2026-06-28',
    title: 'Phase 4 — UN CCW Link Fix, Assessment Close Button, M1 Premium',
    isMajor: false,
    bullets: [
      'Fixed broken UN CCW petition link.',
      'Added close button to post-strike Assessment overlay.',
      'M1 (Target Pipeline) premium visual overhaul.',
    ],
  },
  {
    version: 'v2.5.1',
    date: '2026-06-28',
    title: 'Phase 3 — Verified Sources, Drone Glow Rings, Hover Tooltips',
    isMajor: false,
    bullets: [
      'All scenario reference links verified against live page content.',
      'Added drone glow rings in MapLibre satellite view for visual clarity.',
      'Hover tooltips on drone assets and target reticle with IHL context and error-rate statistics.',
      'Phase 2 overhaul: visceral engagement sequence, drone lifecycle animation.',
    ],
  },
  {
    version: 'v2.5.0',
    date: '2026-06-20',
    title: 'MapLibre GL JS — Hyperrealistic Tactical Satellite Map',
    isMajor: true,
    bullets: [
      'Replaced Leaflet with MapLibre GL JS for high-performance WebGL satellite rendering.',
      'ArcGIS World Imagery — real-world satellite photography at every scenario coordinate.',
      'Full drone flight animation: FOB loiter → transit → hunting → terminal swoop → blast scatter → post-strike loiter.',
      'Missile projectile animation with expanding impact rings, debris ring, and smoke overlay.',
      'Per-phase cinematic camera flyTo animations (11 phases, unique zoom/pitch/bearing each).',
      'Sensor cone overlays, threat zone rings (lethal/danger/caution), no-strike zones, COA vectors.',
    ],
  },
  {
    version: 'v2.4.0',
    date: '2026-06-13',
    title: 'Palantir MAVEN Tactical Overlays',
    isMajor: true,
    bullets: [
      'Implemented full Palantir MAVEN-style tactical map overlay system: threat radials, sensor fan arcs, COA approach vector triangles, drone flight paths with direction arrows, and NATO-style military markers.',
      'Added MAP LAYERS panel with 5 layer groups and 15 sub-layer toggles — ISR Assets, Threat Analysis, Targeting, Battlefield Geometry, Reference.',
      'Added Support button (Patreon, Buy Me a Coffee, SovDash community), BY AVI credit, and simulator changelog.',
      'Fixed Google 3D crash caused by stale Leaflet map reference on mode switch.',
    ],
  },
  {
    version: 'v2.3.0',
    date: '2026-06-13',
    title: 'IHL Treaty Modal · Header & Support Fixes',
    isMajor: false,
    bullets: [
      'Added IHL Policy Modal with treaty status by country (US, UK, Israel, Russia, China, EU, Australia).',
      'Fixed IHL modal z-index and Support button portal overflow issues.',
      'Header cleanup, favicon update, compliance module link fixes.',
    ],
  },
  {
    version: 'v2.2.0',
    date: '2026-06-13',
    title: 'Module System & IHL Compliance Engine',
    isMajor: true,
    bullets: [
      "Released 6 intelligence modules: Target Pipeline (M1), Lavender (M2), Habsora (M3), Where's Daddy (M4), Human Loop (M5), Compliance (M6).",
      'IHL compliance scoring engine with proportionality assessment and legal override prompts.',
      'ENGAGEMENTS counter, alert feed, confidence threshold system.',
    ],
  },
  {
    version: 'v2.1.0',
    date: '2026-06-13',
    title: 'Command Dashboard & Scenario Library',
    isMajor: true,
    bullets: [
      'Built Command Dashboard with three-column pipeline view (Surveillance, Legal Audit, Tactical Execution).',
      'Implemented 7 documented scenarios: Pattern of Life, Structure Targeting, Wedding Strike, Autonomous Engagement, Signature Strike, Facial Recognition, Drone Swarm.',
      'System narrative with phase-aware text and ADVANCE simulation controls.',
    ],
  },
  {
    version: 'v2.0.0',
    date: '2026-06-13',
    title: 'Initial Public Release — LAWS-SIM',
    isMajor: true,
    bullets: [
      'Launched LAWS-SIM as a public educational tool documenting real-world autonomous weapons systems and their humanitarian implications.',
      'Core simulation engine with 11 phases: idle → scanning → target_acquired → tracking → confidence_building → alert_threshold → authorization_pending → authorized → drone_dispatched → engagement → impact → assessment.',
      'Scenarios based on documented JSOC targeting methodology and published LAWS doctrine. Deployed to sim.sovdash.com.',
    ],
  },
];

interface SimulatorChangelogProps {
  onClose: () => void;
}

export function SimulatorChangelog({ onClose }: SimulatorChangelogProps) {
  const [expandedVersions, setExpandedVersions] = useState<Record<string, boolean>>({ 'v3.1.0': true });
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
