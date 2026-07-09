'use client';
import { useCallback, useRef, useState } from 'react';
import { ModuleCanvas, drawHUDText, drawPersonIcon } from './ModuleCanvas';
import { Users, AlertTriangle, ExternalLink, Moon } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// "WHERE'S DADDY?" — PROXIMITY-BASED STRIKE TARGETING
//   Source: +972 Magazine / Local Call — "Lavender: The AI Machine" (Apr 2024)
//
//   The "Where's Daddy?" algorithm tracks when a designated target enters their
//   family home. The IDF then authorizes a strike on that home — KNOWING that
//   family members are likely present. This is explicitly documented.
//
//   Policy: IDF accepted up to 20 civilian deaths per junior-rank target.
//           Higher-rank targets: up to 100+ civilian deaths accepted.
// ─────────────────────────────────────────────────────────────────────────────

type MemberIcon = 'man' | 'woman' | 'child' | 'infant';

interface FamilyMember {
  label:    string;
  age:      number | string;
  isTarget: boolean;
  icon:     MemberIcon;
  col:      string;
}

interface ScenarioDef {
  id:            number;
  label:         string;
  tag:           string;
  headerColor:   string;
  description:   string;
  family:        FamilyMember[];
  cdeNote:       string;
  cdeColor:      string;
  cycleDuration: number;
  nightMode:     boolean;
  alarmText:     string;
}

const SCENARIOS: ScenarioDef[] = [
  {
    id:          0,
    label:       "WHERE'S DADDY",
    tag:         'STANDARD ALGORITHM',
    headerColor: '#ff1a2e',
    description: 'Target geofenced to family residence. Proximity threshold crossed. Strike window opens. Algorithm requests authorization.',
    family:      [
      { label: 'TARGET (MALE)', age: 34, isTarget: true, icon: 'man', col: '#ff1a2e' },
    ],
    cdeNote:    'Family presence not verified. Algorithm proceeds on target presence alone. Residence strike authorized.',
    cdeColor:   '#ff6600',
    cycleDuration: 20,
    nightMode:   false,
    alarmText:   '⚠  THRESHOLD CROSSED — TARGET AT FAMILY RESIDENCE  ⚠',
  },
  {
    id:          1,
    label:       'FAMILY HOME',
    tag:         'COLLATERAL SCENARIO',
    headerColor: '#ff1a2e',
    description: 'Target returns home. Signal intel detects wife and children also present. CDE assessed: ACCEPTABLE. Strike authorized.',
    family:      [
      { label: 'AHMAD (TARGET)', age: 34,    isTarget: true,  icon: 'man',    col: '#ff1a2e' },
      { label: 'FATIMA (WIFE)',  age: 29,    isTarget: false, icon: 'woman',  col: '#ffaa00' },
      { label: 'LAYLA',         age: 8,     isTarget: false, icon: 'child',  col: '#ffaa00' },
      { label: 'OMAR',          age: 5,     isTarget: false, icon: 'child',  col: '#ffaa00' },
      { label: 'SARA',          age: '7mo', isTarget: false, icon: 'infant', col: '#ffaa00' },
    ],
    cdeNote:    '4 confirmed civilians (wife + 3 children). IDF CDE threshold for junior-rank target: up to 20 civilians acceptable.',
    cdeColor:   '#ff1a2e',
    cycleDuration: 22,
    nightMode:   false,
    alarmText:   '⚠  THRESHOLD CROSSED — TARGET + FAMILY AT RESIDENCE  ⚠',
  },
  {
    id:          2,
    label:       'PRE-DAWN STRIKE',
    tag:         '03:17 LOCAL TIME',
    headerColor: 'rgba(80,120,255,0.9)',
    description: "Target visits parents overnight. Strike window: 03:17. Family sleeping. Elderly parents confirmed present by signals intelligence.",
    family:      [
      { label: 'MAHMOUD (TARGET)', age: 41, isTarget: true,  icon: 'man',   col: '#ff1a2e' },
      { label: 'FATHER (ELDERLY)', age: 71, isTarget: false, icon: 'man',   col: '#ffaa00' },
      { label: 'MOTHER (ELDERLY)', age: 68, isTarget: false, icon: 'woman', col: '#ffaa00' },
    ],
    cdeNote:    'Strike authorized 03:17 while civilians sleeping. Elderly parents killed as accepted collateral damage.',
    cdeColor:   '#ff1a2e',
    cycleDuration: 20,
    nightMode:   true,
    alarmText:   '⚠  03:17 LOCAL — STRIKE WINDOW — FAMILY SLEEPING  ⚠',
  },
];

interface Debris     { x: number; y: number; vx: number; vy: number; life: number; sz: number; }
interface Fire       { x: number; y: number; vx: number; vy: number; life: number; }
interface MapBuilding { x: number; y: number; w: number; h: number; }

export function WheresDaddyModule() {
  const [activeScen, setActiveScen] = useState(0);

  // Refs — shared with draw callback (no re-render overhead)
  const scenRef       = useRef(0);
  const radarAngle    = useRef(0);
  const debris        = useRef<Debris[]>([]);
  const fire          = useRef<Fire[]>([]);
  const alarmOn       = useRef(false);
  const alarmT        = useRef(0);
  const prevScen      = useRef(-1);
  const cycleStart    = useRef(0);
  const mapBuildings  = useRef<MapBuilding[]>([]);
  const mapInitDone   = useRef(false);

  const handleScenario = useCallback((id: number) => {
    setActiveScen(id);
    scenRef.current = id;
    // Reset will happen in draw via prevScen check
  }, []);

  // ── CANVAS DRAW — [] deps (all state via refs) ─────────────────────────
  const draw = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, t: number, dt: number) => {
    const panelY = 62;
    const scen   = SCENARIOS[scenRef.current];
    if (!scen) return;

    // ── Scenario reset ──────────────────────────────────────────────────
    if (prevScen.current !== scenRef.current) {
      prevScen.current = scenRef.current;
      cycleStart.current = t;
      alarmOn.current    = false;
      alarmT.current     = 0;
      debris.current     = [];
      fire.current       = [];
    }

    const ct = (t - cycleStart.current) % scen.cycleDuration;

    // Cycle wrap reset
    if (ct < 0.08 && alarmOn.current && (t - cycleStart.current) > 1) {
      cycleStart.current = Math.floor((t - cycleStart.current) / scen.cycleDuration) * scen.cycleDuration + cycleStart.current;
      alarmOn.current    = false;
      alarmT.current     = 0;
      debris.current     = [];
      fire.current       = [];
    }

    // ── LAYOUT ─────────────────────────────────────────────────────────
    const radarDiam = Math.min(w * 0.34, h * 0.50, 260);
    const radarR    = radarDiam / 2;
    const radarCX   = 16 + radarR;
    const radarCY   = panelY + 30 + radarR;

    const mapX  = 16 + radarDiam + 20;
    const mapW2 = w - mapX - 16;
    const mapY  = panelY + 30;
    const mapH2 = h - mapY - 88;

    // Map coordinate helpers
    const mapCX   = mapX + mapW2 * 0.5;
    const mapCY   = mapY + mapH2 * 0.5;
    const mapMaxR = Math.min(mapW2, mapH2) * 0.5;

    // Convert any map (x,y) → radar (rx,ry) preserving exact relative position
    const toRadar = (mx: number, my: number) => {
      const dx = (mx - mapCX) / mapMaxR;
      const dy = (my - mapCY) / mapMaxR;
      return { rx: radarCX + dx * radarR * 0.9, ry: radarCY + dy * radarR * 0.9 };
    };

    // ── INIT MAP BUILDINGS (seeded) ──────────────────────────────────────
    if (!mapInitDone.current) {
      mapInitDone.current = true;
      let seed = 0x7e57c0de;
      const rnd = () => { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed / 0xffffffff; };

      // 4×3 city blocks with buildings inside
      const cols = 4; const rows = 3;
      const blkW = mapW2 * 0.82 / cols;
      const blkH = mapH2 * 0.78 / rows;

      for (let bc = 0; bc < cols; bc++) {
        for (let br = 0; br < rows; br++) {
          const bx0 = mapX + mapW2 * 0.09 + bc * blkW;
          const by0 = mapY + mapH2 * 0.12 + br * blkH;
          // 2-4 buildings per block
          const n = 2 + Math.floor(rnd() * 3);
          for (let bi = 0; bi < n; bi++) {
            const bw = blkW * (0.18 + rnd() * 0.26);
            const bh = blkH * (0.18 + rnd() * 0.28);
            mapBuildings.current.push({
              x: bx0 + rnd() * (blkW - bw - 4),
              y: by0 + rnd() * (blkH - bh - 4),
              w: bw, h: bh,
            });
          }
        }
      }
    }

    // ── TARGET PATH & TIMING ─────────────────────────────────────────────
    const walkDur  = scen.cycleDuration * 0.45;
    const pathPct  = Math.min(ct / walkDur, 1.0);

    // Target residence — consistent across scenarios
    const houseX = mapX + mapW2 * 0.68;
    const houseY = mapY + mapH2 * 0.30;
    const houseW = 40;
    const houseH = 32;

    // Path follows street grid
    const pathPts = [
      { x: mapX + mapW2 * 0.05,  y: mapY + mapH2 * 0.63 },
      { x: mapX + mapW2 * 0.40,  y: mapY + mapH2 * 0.63 },
      { x: mapX + mapW2 * 0.40,  y: mapY + mapH2 * 0.30 },
      { x: mapX + mapW2 * 0.62,  y: mapY + mapH2 * 0.30 },
      { x: houseX,                y: houseY + houseH * 0.5 },
    ];

    const totalSegs = pathPts.length - 1;
    const segIdx    = Math.min(Math.floor(pathPct * totalSegs), totalSegs - 1);
    const segPct    = pathPct * totalSegs - segIdx;
    const pfrom     = pathPts[segIdx];
    const pto       = pathPts[Math.min(segIdx + 1, totalSegs)];
    const dotX      = pfrom.x + (pto.x - pfrom.x) * segPct;
    const dotY      = pfrom.y + (pto.y - pfrom.y) * segPct;

    // Strike trigger
    if (pathPct >= 0.97 && !alarmOn.current) {
      alarmOn.current = true;
      alarmT.current  = ct;
    }
    const strikeDelay  = 1.8;  // seconds after alarm before strike
    const isStruck     = alarmOn.current && (ct - alarmT.current) > strikeDelay;
    const isAlarmFlash = alarmOn.current && !isStruck;
    const timeSinceStrike = isStruck ? ct - alarmT.current - strikeDelay : 0;

    // ── NIGHT MODE OVERLAY ────────────────────────────────────────────────
    if (scen.nightMode) {
      ctx.fillStyle = 'rgba(0,3,14,0.40)';
      ctx.fillRect(0, panelY, w, h - panelY);
      // Stars
      for (let s = 0; s < 40; s++) {
        const sx = ((s * 137 + 7) % (w - 30)) + 15;
        const sy = panelY + 5 + ((s * 97) % (mapH2 * 0.55));
        const sa = 0.2 + 0.5 * Math.sin(t * 0.5 + s);
        ctx.beginPath(); ctx.arc(sx, sy, 0.6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,215,255,${sa})`; ctx.fill();
      }
      // Time indicator
      drawHUDText(ctx, '03:17:42 LOCAL', w - 100, panelY + 16, 'rgba(80,120,255,0.7)', 8);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ① RADAR PANEL — positions mirror the street map exactly
    // ═══════════════════════════════════════════════════════════════════════
    drawHUDText(ctx, 'GEOFENCE RADAR — LIVE COORDINATE TRACK', 16, panelY + 16, '#00d47e', 8);

    // Radar background
    const rbg = ctx.createRadialGradient(radarCX, radarCY, 0, radarCX, radarCY, radarR);
    rbg.addColorStop(0,   scen.nightMode ? 'rgba(0,6,22,0.97)' : 'rgba(0,16,8,0.97)');
    rbg.addColorStop(1,   scen.nightMode ? 'rgba(0,3,14,0.97)' : 'rgba(0,10,5,0.97)');
    ctx.fillStyle = rbg;
    ctx.beginPath(); ctx.arc(radarCX, radarCY, radarR, 0, Math.PI * 2); ctx.fill();

    // Range rings + distance labels
    for (let ring = 1; ring <= 4; ring++) {
      ctx.beginPath(); ctx.arc(radarCX, radarCY, radarR * ring / 4, 0, Math.PI * 2);
      ctx.strokeStyle = scen.nightMode ? 'rgba(60,90,200,0.16)' : 'rgba(0,212,126,0.14)';
      ctx.lineWidth   = 0.5; ctx.stroke();
      ctx.font        = '5.5px "JetBrains Mono", monospace';
      ctx.fillStyle   = scen.nightMode ? 'rgba(60,90,200,0.28)' : 'rgba(0,212,126,0.22)';
      ctx.fillText(`${ring * 200}m`, radarCX + 3, radarCY - radarR * ring / 4 + 4);
    }

    // Crosshair lines + diagonals
    ctx.strokeStyle = scen.nightMode ? 'rgba(60,90,200,0.1)' : 'rgba(0,212,126,0.1)';
    ctx.lineWidth   = 0.4;
    [[radarCX - radarR, radarCY, radarCX + radarR, radarCY],
     [radarCX, radarCY - radarR, radarCX, radarCY + radarR],
     [radarCX - radarR * 0.7, radarCY - radarR * 0.7, radarCX + radarR * 0.7, radarCY + radarR * 0.7],
     [radarCX + radarR * 0.7, radarCY - radarR * 0.7, radarCX - radarR * 0.7, radarCY + radarR * 0.7],
    ].forEach(([x1, y1, x2, y2]) => {
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    });

    // Sweep trail
    radarAngle.current += dt * 1.15;
    const swSteps = 28;
    for (let i = swSteps; i >= 0; i--) {
      const ang = radarAngle.current - (i / swSteps) * 1.4;
      const a   = (1 - i / swSteps) * 0.4;
      ctx.fillStyle = scen.nightMode ? `rgba(60,100,255,${a * 0.13})` : `rgba(0,212,126,${a * 0.13})`;
      ctx.beginPath(); ctx.moveTo(radarCX, radarCY);
      ctx.arc(radarCX, radarCY, radarR, ang, ang + 1.4 / swSteps);
      ctx.closePath(); ctx.fill();
    }

    // Sweep line
    ctx.strokeStyle = scen.nightMode ? 'rgba(80,130,255,0.85)' : 'rgba(0,212,126,0.85)';
    ctx.lineWidth   = 1.5;
    ctx.beginPath(); ctx.moveTo(radarCX, radarCY);
    ctx.lineTo(radarCX + Math.cos(radarAngle.current) * radarR, radarCY + Math.sin(radarAngle.current) * radarR);
    ctx.stroke();

    // Helper: draw a blip that fades after sweep passes
    const drawBlip = (mx: number, my: number, sz: number, baseCol: string, alwaysOn = false) => {
      const { rx, ry } = toRadar(mx, my);
      const dist = Math.sqrt((rx - radarCX) ** 2 + (ry - radarCY) ** 2);
      if (dist > radarR * 0.98) return;
      const ang     = Math.atan2(ry - radarCY, rx - radarCX);
      const diff    = ((radarAngle.current - ang) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      const fadeA   = alwaysOn ? 0.8 : Math.max(0, 0.85 * (1 - diff / (Math.PI * 2)));
      if (fadeA < 0.04) return;
      ctx.beginPath(); ctx.arc(rx, ry, sz, 0, Math.PI * 2);
      ctx.fillStyle = baseCol.replace(')', `,${fadeA})`).replace('rgb(', 'rgba(');
      // Crude alpha inject — just set globalAlpha
      const prev = ctx.globalAlpha;
      ctx.globalAlpha = fadeA;
      ctx.fillStyle   = baseCol;
      ctx.fill();
      ctx.globalAlpha = prev;
    };

    // Building blips — exact map positions
    for (const b of mapBuildings.current) {
      drawBlip(b.x + b.w / 2, b.y + b.h / 2, 1.8, scen.nightMode ? 'rgb(60,90,200)' : 'rgb(0,180,100)');
    }

    // Target house blip (always visible, colour shifts when struck)
    {
      const { rx, ry } = toRadar(houseX, houseY + houseH / 2);
      const dist = Math.sqrt((rx - radarCX) ** 2 + (ry - radarCY) ** 2);
      if (dist < radarR) {
        const prevA = ctx.globalAlpha;
        ctx.globalAlpha = isStruck ? 0.9 : 0.55 + 0.3 * Math.abs(Math.sin(t * 2));
        ctx.beginPath(); ctx.arc(rx, ry, isStruck ? 4 : 3, 0, Math.PI * 2);
        ctx.fillStyle = isStruck ? '#ff1a2e' : '#ffaa00';
        ctx.fill();
        // Outer ring
        ctx.beginPath(); ctx.arc(rx, ry, 6 + 3 * Math.abs(Math.sin(t * 3)), 0, Math.PI * 2);
        ctx.strokeStyle = isStruck ? 'rgba(255,26,46,0.5)' : 'rgba(255,170,0,0.35)';
        ctx.lineWidth = 0.8; ctx.stroke();
        ctx.globalAlpha = prevA;
        // Label
        ctx.font = '5.5px "JetBrains Mono", monospace';
        ctx.fillStyle = isStruck ? 'rgba(255,26,46,0.7)' : 'rgba(255,170,0,0.6)';
        ctx.fillText('HOME', rx + 5, ry + 2);
      }
    }

    // Target dot on radar — mirrors map position exactly
    if (!isStruck || timeSinceStrike < 0.8) {
      const { rx, ry } = toRadar(dotX, dotY);
      const dist = Math.sqrt((rx - radarCX) ** 2 + (ry - radarCY) ** 2);
      if (dist < radarR) {
        ctx.beginPath(); ctx.arc(rx, ry, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ff1a2e'; ctx.fill();
        ctx.shadowColor = '#ff1a2e'; ctx.shadowBlur = 8; ctx.fill();
        ctx.shadowBlur  = 0;
        ctx.beginPath(); ctx.arc(rx, ry, 4 + 6 * Math.abs(Math.sin(t * 4)), 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,26,46,0.4)'; ctx.lineWidth = 0.8; ctx.stroke();
        ctx.font = '5.5px "JetBrains Mono", monospace';
        ctx.fillStyle = 'rgba(255,26,46,0.8)';
        ctx.fillText('TGT', rx + 5, ry + 2);
      }
    }

    // Radar border
    ctx.beginPath(); ctx.arc(radarCX, radarCY, radarR, 0, Math.PI * 2);
    ctx.strokeStyle = scen.nightMode ? 'rgba(60,90,200,0.45)' : 'rgba(0,212,126,0.4)';
    ctx.lineWidth   = 1.2; ctx.stroke();

    // Radar status below
    const radBot = radarCY + radarR + 12;
    drawHUDText(ctx, `SWEEP: ${((radarAngle.current * 180 / Math.PI) % 360).toFixed(0)}°`, 16, radBot,      '#536878', 7);
    drawHUDText(ctx, `STATUS: ${pathPct >= 0.97 ? 'AT RESIDENCE' : 'EN ROUTE'}`, 16, radBot + 12, pathPct >= 0.97 ? '#ff1a2e' : '#00d47e', 7);
    if (scen.nightMode) drawHUDText(ctx, '03:17 LOCAL — FAMILY SLEEPING', 16, radBot + 24, 'rgba(80,120,255,0.75)', 7);

    // ═══════════════════════════════════════════════════════════════════════
    // ② STREET MAP — main view
    // ═══════════════════════════════════════════════════════════════════════
    drawHUDText(ctx, "GEOFENCE TRACK // WHERE'S DADDY", mapX, panelY + 16, '#ff1a2e', 10);
    drawHUDText(ctx, '— REAL-TIME PROXIMITY ALERT', mapX + 214, panelY + 16, '#536878', 8);

    // Map background
    ctx.fillStyle = scen.nightMode ? 'rgba(2,4,16,0.9)' : 'rgba(4,8,14,0.85)';
    ctx.fillRect(mapX, mapY, mapW2, mapH2);

    // Fine grid
    ctx.strokeStyle = scen.nightMode ? 'rgba(30,50,120,0.07)' : 'rgba(0,212,126,0.055)';
    ctx.lineWidth = 0.4;
    for (let gx = mapX; gx < mapX + mapW2; gx += 22) { ctx.beginPath(); ctx.moveTo(gx, mapY); ctx.lineTo(gx, mapY + mapH2); ctx.stroke(); }
    for (let gy = mapY; gy < mapY + mapH2; gy += 22) { ctx.beginPath(); ctx.moveTo(mapX, gy); ctx.lineTo(mapX + mapW2, gy); ctx.stroke(); }

    // Street bands
    const streets = [
      { axis: 'h', pos: 0.63 }, { axis: 'h', pos: 0.30 },
      { axis: 'v', pos: 0.40 }, { axis: 'v', pos: 0.68 },
    ];
    for (const s of streets) {
      ctx.fillStyle = scen.nightMode ? 'rgba(20,32,90,0.28)' : 'rgba(0,212,126,0.038)';
      if (s.axis === 'h') {
        ctx.fillRect(mapX, mapY + mapH2 * s.pos - 10, mapW2, 20);
        ctx.strokeStyle = scen.nightMode ? 'rgba(40,60,150,0.14)' : 'rgba(0,212,126,0.09)';
        ctx.lineWidth = 0.6;
        ctx.beginPath(); ctx.moveTo(mapX, mapY + mapH2 * s.pos); ctx.lineTo(mapX + mapW2, mapY + mapH2 * s.pos); ctx.stroke();
      } else {
        ctx.fillRect(mapX + mapW2 * s.pos - 10, mapY, 20, mapH2);
        ctx.strokeStyle = scen.nightMode ? 'rgba(40,60,150,0.14)' : 'rgba(0,212,126,0.09)';
        ctx.lineWidth = 0.6;
        ctx.beginPath(); ctx.moveTo(mapX + mapW2 * s.pos, mapY); ctx.lineTo(mapX + mapW2 * s.pos, mapY + mapH2); ctx.stroke();
      }
    }

    // Map buildings
    for (const b of mapBuildings.current) {
      ctx.fillStyle   = scen.nightMode ? 'rgba(8,12,36,0.72)' : 'rgba(9,16,24,0.72)';
      ctx.strokeStyle = scen.nightMode ? 'rgba(35,50,130,0.35)' : 'rgba(26,37,53,0.45)';
      ctx.lineWidth   = 0.5;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeRect(b.x, b.y, b.w, b.h);
      // Night: random lit windows
      if (scen.nightMode && b.w > 14) {
        const winA = ((b.x * 7 + b.y * 3) % 10) > 5 ? 0.4 : 0.08;
        ctx.fillStyle = `rgba(255,200,100,${winA})`;
        ctx.fillRect(b.x + 3, b.y + 4, 5, 5);
        if (b.w > 22) { ctx.fillRect(b.x + 12, b.y + 4, 5, 5); }
      }
    }

    // ── TARGET HOUSE ──────────────────────────────────────────────────────
    const houseBaseCol = isStruck ? '#ff1a2e' : isAlarmFlash ? '#ff1a2e' : '#00d47e';
    const houseFlicker = isAlarmFlash ? (0.5 + 0.4 * Math.sin(t * 9)) : 1;

    if (!isStruck) {
      // Geofence circles
      const gfR1 = houseW * (1.5 + 0.18 * Math.sin(t * 3));
      const gfR2 = gfR1 + 12 + 8 * Math.sin(t * 2.5);
      const gfIntensity = pathPct >= 0.96 ? 0.7 : 0.22;
      [gfR1, gfR2].forEach((r, ri) => {
        ctx.beginPath(); ctx.arc(houseX, houseY + houseH / 2, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,26,46,${gfIntensity * houseFlicker * (ri === 1 ? 0.35 : 1)})`;
        ctx.lineWidth   = pathPct >= 0.96 ? 1.5 : 0.7;
        ctx.setLineDash([4, 3]); ctx.stroke(); ctx.setLineDash([]);
      });
    }

    if (isStruck) {
      // Rubble
      ctx.fillStyle   = 'rgba(255,26,46,0.18)';
      ctx.strokeStyle = '#ff1a2e'; ctx.lineWidth = 0.8;
      ctx.fillRect(houseX - houseW / 2, houseY + houseH * 0.5, houseW, houseH * 0.5);
      ctx.strokeRect(houseX - houseW / 2, houseY + houseH * 0.5, houseW, houseH * 0.5);

      // Scorch / blast radius
      const scorch = ctx.createRadialGradient(houseX, houseY + houseH * 0.75, 2, houseX, houseY + houseH * 0.75, houseW * 1.4);
      scorch.addColorStop(0, 'rgba(255,80,0,0.15)');
      scorch.addColorStop(1, 'rgba(255,26,46,0)');
      ctx.fillStyle = scorch;
      ctx.fillRect(houseX - houseW * 1.5, houseY - 10, houseW * 3, houseH * 2.5);

      // Fire particles
      if (timeSinceStrike < 5) {
        for (let i = 0; i < 3; i++) {
          fire.current.push({
            x:    houseX + (Math.random() - 0.5) * houseW * 0.7,
            y:    houseY + houseH * 0.35,
            vx:   (Math.random() - 0.5) * 28,
            vy:   -(18 + Math.random() * 38),
            life: 1,
          });
        }
      }
      for (const fp of fire.current) {
        fp.x += fp.vx * dt; fp.y += fp.vy * dt; fp.vy -= 8 * dt; fp.life -= dt * 1.1;
        if (fp.life > 0) {
          ctx.beginPath(); ctx.arc(fp.x, fp.y, 2 + fp.life * 3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,${Math.floor(60 + fp.life * 130)},0,${fp.life * 0.85})`;
          ctx.fill();
        }
      }
      fire.current = fire.current.filter(fp => fp.life > 0);

      // Debris
      if (debris.current.length < 44 && timeSinceStrike < 1.6) {
        for (let i = 0; i < 5; i++) {
          debris.current.push({
            x: houseX + (Math.random() - 0.5) * houseW * 0.8,
            y: houseY + houseH * 0.4,
            vx: (Math.random() - 0.5) * 90, vy: -55 - Math.random() * 85,
            life: 1, sz: 1.5 + Math.random() * 2.5,
          });
        }
      }
      for (const d of debris.current) {
        d.x += d.vx * dt; d.y += d.vy * dt; d.vy += 160 * dt; d.life -= dt * 0.55;
        if (d.life > 0) {
          ctx.beginPath(); ctx.arc(d.x, d.y, d.sz, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(190,130,40,${d.life * 0.85})`; ctx.fill();
        }
      }
      debris.current = debris.current.filter(d => d.life > 0);

      drawHUDText(ctx, 'STRIKE EXECUTED', houseX - 38, houseY + houseH * 1.4 + 12, '#ff1a2e', 8);

      // Casualty labels (scenario 1 & 2 only)
      if ((scen.id === 1 || scen.id === 2) && timeSinceStrike > 0.5) {
        const civilianCount = scen.family.filter(m => !m.isTarget).length;
        drawHUDText(ctx,
          `${civilianCount + 1} KILLED — ${civilianCount} CIVILIAN${civilianCount > 1 ? 'S' : ''}`,
          houseX - 52, houseY + houseH * 1.4 + 26, '#ff6600', 8
        );
      }
    } else {
      // House drawing
      ctx.shadowColor = isAlarmFlash ? '#ff1a2e' : 'transparent';
      ctx.shadowBlur  = isAlarmFlash ? 18 : 0;

      // Roof
      ctx.fillStyle   = isAlarmFlash ? `rgba(255,26,46,${0.15 * houseFlicker})` : scen.nightMode ? 'rgba(15,20,55,0.5)' : 'rgba(0,212,126,0.07)';
      ctx.strokeStyle = houseBaseCol; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(houseX - houseW / 2 - 4, houseY);
      ctx.lineTo(houseX, houseY - houseH * 0.40);
      ctx.lineTo(houseX + houseW / 2 + 4, houseY);
      ctx.closePath(); ctx.fill(); ctx.stroke();

      // Body
      ctx.fillStyle = isAlarmFlash
        ? `rgba(255,26,46,${0.12 * houseFlicker})`
        : scen.nightMode ? 'rgba(10,16,50,0.55)' : 'rgba(0,212,126,0.055)';
      ctx.fillRect(houseX - houseW / 2, houseY, houseW, houseH);
      ctx.strokeStyle = houseBaseCol; ctx.lineWidth = 1.5;
      ctx.strokeRect(houseX - houseW / 2, houseY, houseW, houseH);

      // Door
      ctx.fillStyle = isAlarmFlash ? `rgba(255,26,46,${0.35 * houseFlicker})` : 'rgba(0,212,126,0.15)';
      ctx.fillRect(houseX - 5, houseY + houseH - 12, 10, 12);

      // Night: lit windows
      if (scen.nightMode) {
        ctx.fillStyle = `rgba(255,200,100,0.4)`;
        ctx.fillRect(houseX - houseW / 2 + 6, houseY + 7, 8, 8);
        ctx.fillRect(houseX + 4, houseY + 7, 8, 8);
      }

      ctx.shadowBlur = 0;
    }

    // House labels
    const lbY = houseY - houseH * 0.40 - 14;
    drawHUDText(ctx, 'TARGET RESIDENCE', houseX - houseW / 2 - 2, lbY, pathPct >= 0.96 ? '#ff1a2e' : '#ccd6e0', 7);
    if (scen.id === 1) drawHUDText(ctx, 'FAMILY PRESENT — 5 OCCUPANTS', houseX - houseW / 2 - 2, lbY + 10, '#ffaa00', 6.5);
    if (scen.id === 2) drawHUDText(ctx, "PARENTS' HOME — SLEEPING", houseX - houseW / 2 - 2, lbY + 10, '#ffaa00', 6.5);

    // ── FAMILY ICONS (above/at house when present) ─────────────────────
    if ((scen.id === 1 || scen.id === 2) && pathPct >= 0.88) {
      const members = scen.family;
      const iconY   = houseY - 8;
      members.forEach((m, mi) => {
        const iconX = houseX - houseW / 2 + 4 + mi * 11;
        const col   = isStruck ? 'rgba(255,26,46,0.35)' : m.col;
        const sz    = m.icon === 'infant' ? 4 : m.icon === 'child' ? 5 : 7;
        drawPersonIcon(ctx, iconX, iconY, sz, col);

        if (isStruck) {
          // Cross over each person
          ctx.strokeStyle = 'rgba(255,26,46,0.6)'; ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.moveTo(iconX - 3, iconY - 9); ctx.lineTo(iconX + 3, iconY - 3); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(iconX + 3, iconY - 9); ctx.lineTo(iconX - 3, iconY - 3); ctx.stroke();
        }
      });
    }

    // ── PATH TRAIL ─────────────────────────────────────────────────────────
    for (let pi = 0; pi < pathPts.length - 1; pi++) {
      ctx.strokeStyle = scen.nightMode ? 'rgba(60,100,200,0.15)' : 'rgba(0,212,126,0.16)';
      ctx.lineWidth = 1; ctx.setLineDash([2, 5]);
      ctx.beginPath(); ctx.moveTo(pathPts[pi].x, pathPts[pi].y); ctx.lineTo(pathPts[pi + 1].x, pathPts[pi + 1].y);
      ctx.stroke(); ctx.setLineDash([]);
    }

    // ── TARGET DOT ─────────────────────────────────────────────────────────
    if (!isStruck || timeSinceStrike < 0.5) {
      ctx.beginPath(); ctx.arc(dotX, dotY, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ff1a2e';
      ctx.shadowColor = '#ff1a2e'; ctx.shadowBlur = 10; ctx.fill(); ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.arc(dotX, dotY, 5.5 + 8 * Math.abs(Math.sin(t * 3.8)), 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,26,46,0.35)'; ctx.lineWidth = 1; ctx.stroke();
      drawHUDText(ctx, scen.family[0].label.split(' ')[0].toUpperCase(), dotX + 8, dotY + 3, '#ff1a2e', 7);
    }

    // ── ALARM BANNER ─────────────────────────────────────────────────────
    if (isAlarmFlash && Math.floor(t * 5) % 2 === 0) {
      ctx.fillStyle = 'rgba(255,26,46,0.93)';
      ctx.fillRect(mapX, mapY + mapH2 - 28, mapW2, 26);
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center';
      ctx.fillText(scen.alarmText, mapX + mapW2 / 2, mapY + mapH2 - 11);
      ctx.textAlign = 'left';
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ③ BOTTOM HUD
    // ═══════════════════════════════════════════════════════════════════════
    const hudY = h - 28;
    ctx.fillStyle = 'rgba(4,4,8,0.94)'; ctx.fillRect(0, hudY - 8, w, 36);
    ctx.strokeStyle = 'rgba(26,37,53,0.5)'; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(0, hudY - 8); ctx.lineTo(w, hudY - 8); ctx.stroke();

    const civCount = scen.family.filter(m => !m.isTarget).length;
    drawHUDText(ctx, `CT: ${ct.toFixed(1)}s`,               16,       hudY + 8, '#536878', 8);
    drawHUDText(ctx, `PATH: ${(pathPct * 100).toFixed(0)}%`, w*0.13,  hudY + 8, '#00d47e', 8);
    drawHUDText(ctx, `THRESHOLD: ${alarmOn.current ? 'CROSSED ●' : 'CLEAR ○'}`, w*0.27, hudY+8, alarmOn.current ? '#ff1a2e' : '#536878', 8);
    drawHUDText(ctx, `CIVILIANS IN RADIUS: ${civCount}`,     w*0.52,  hudY + 8, '#ffaa00', 8);
    drawHUDText(ctx, isStruck ? '▶ STRIKE EXECUTED' : isAlarmFlash ? '▶ STRIKE PENDING' : '○ MONITORING', w*0.76, hudY+8, isStruck ? '#ff1a2e' : isAlarmFlash ? '#ff6600' : '#536878', 8);
  }, []);

  const scen = SCENARIOS[activeScen];
  const civCount = scen.family.filter(m => !m.isTarget).length;

  return (
    <div className="relative w-full h-full">

      {/* Canvas */}
      <div className="absolute inset-0">
        <ModuleCanvas
          title="WHERE'S DADDY — REAL-TIME PROXIMITY ALERT SYSTEM"
          subtitle={`Geofence tracking → residence threshold crossing → strike trigger  ·  IDF algorithm, Gaza 2023–24`}
          moduleId="MODULE 4 // PROXIMITY ALERT"
          draw={draw}
        />
      </div>

      {/* ── SCENARIO SELECTOR ──────────────────────────────────────────── */}
      <div
        className="absolute font-mono flex flex-col gap-1 pointer-events-auto"
        style={{ left: 14, bottom: 36, zIndex: 10 }}
      >
        <span className="text-[6px] text-terminal-text-faint tracking-widest uppercase mb-0.5">Scenario</span>
        {SCENARIOS.map(s => (
          <button
            key={s.id}
            onClick={() => handleScenario(s.id)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded border text-left transition-all text-[7.5px] font-bold"
            style={{
              background:  activeScen === s.id ? 'rgba(255,26,46,0.12)' : 'rgba(5,5,8,0.55)',
              borderColor: activeScen === s.id ? 'rgba(255,26,46,0.55)' : 'rgba(26,37,53,0.5)',
              color:       activeScen === s.id ? '#ff1a2e' : '#536878',
            }}
          >
            <span style={{ fontSize: 10 }}>{activeScen === s.id ? '▶' : '○'}</span>
            <span className="flex-1">{s.label}</span>
            {s.nightMode && <Moon className="w-2.5 h-2.5 shrink-0" style={{ color: 'rgba(80,120,255,0.7)' }} />}
            <span className="text-[5.5px] font-normal shrink-0" style={{ color: activeScen === s.id ? 'rgba(255,26,46,0.5)' : '#2a3a4a' }}>
              {s.tag}
            </span>
          </button>
        ))}
      </div>

      {/* ── COLLATERAL / FAMILY PANEL (right side) ──────────────────────── */}
      <div
        className="absolute font-mono pointer-events-auto"
        style={{ right: 14, top: 66, width: 220, zIndex: 10 }}
      >
        <div
          className="rounded overflow-hidden text-[7px] leading-relaxed"
          style={{
            background:   'rgba(4,6,10,0.92)',
            border:       `1px solid ${civCount > 0 ? 'rgba(255,26,46,0.38)' : 'rgba(26,37,53,0.45)'}`,
            backdropFilter: 'blur(10px)',
          }}
        >
          {/* Header */}
          <div
            className="px-2.5 py-1.5 flex items-center gap-1.5"
            style={{ borderBottom: '1px solid rgba(255,26,46,0.18)', background: civCount > 0 ? 'rgba(255,26,46,0.06)' : 'rgba(0,0,0,0.15)' }}
          >
            <Users className="w-3 h-3 shrink-0" style={{ color: civCount > 0 ? '#ff1a2e' : '#536878' }} />
            <span className="font-bold text-[8px] tracking-wider" style={{ color: civCount > 0 ? '#ff1a2e' : '#536878' }}>
              OCCUPANT PROFILE
            </span>
          </div>

          {/* Members list */}
          <div className="px-2.5 py-2 space-y-0.5">
            {scen.family.map((m, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-2 px-1.5 py-0.5 rounded text-[7.5px]"
                style={{
                  background: m.isTarget ? 'rgba(255,26,46,0.1)' : 'rgba(26,37,53,0.18)',
                  borderLeft: `2px solid ${m.isTarget ? '#ff1a2e' : 'rgba(255,170,0,0.4)'}`,
                }}
              >
                <div className="flex items-center gap-1.5">
                  <span style={{ color: m.isTarget ? '#ff1a2e' : '#ffaa00', fontSize: 10 }}>
                    {m.icon === 'man' ? '♂' : m.icon === 'woman' ? '♀' : m.icon === 'infant' ? '◉' : '♂'}
                  </span>
                  <span style={{ color: m.isTarget ? '#ff1a2e' : '#ccd6e0', fontWeight: 700 }}>{m.label}</span>
                </div>
                <span style={{ color: '#536878', flexShrink: 0, fontSize: '6.5px' }}>
                  {typeof m.age === 'number' ? `${m.age}y` : m.age}
                </span>
              </div>
            ))}
          </div>

          {/* CDE Assessment */}
          <div
            className="px-2.5 py-2 space-y-1.5"
            style={{ borderTop: '1px solid rgba(26,37,53,0.4)' }}
          >
            <div className="flex items-center gap-1">
              <AlertTriangle className="w-2.5 h-2.5 shrink-0" style={{ color: scen.cdeColor }} />
              <span className="font-bold tracking-wider" style={{ color: scen.cdeColor, fontSize: '6.5px' }}>
                CDE ASSESSMENT
              </span>
            </div>
            <p style={{ color: '#536878', lineHeight: 1.65 }}>{scen.cdeNote}</p>

            <div style={{ borderTop: '1px solid rgba(26,37,53,0.3)', paddingTop: 6 }}>
              <p style={{ color: '#536878', fontSize: '6.5px', lineHeight: 1.6 }}>
                <span style={{ color: '#ccd6e0', fontWeight: 700 }}>AP I Art.&nbsp;51(5)(b): </span>
                Civilian harm must not be excessive relative to military advantage. No algorithm can make this legal determination.
              </p>
            </div>
          </div>

          {/* Source */}
          <div
            className="px-2.5 py-1.5"
            style={{ borderTop: '1px solid rgba(26,37,53,0.35)' }}
          >
            <a
              href="https://www.972mag.com/lavender-ai-israeli-army-gaza/"
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-[6px] transition-colors"
              style={{ color: '#2a3a4a' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#0096ff')}
              onMouseLeave={e => (e.currentTarget.style.color = '#2a3a4a')}
            >
              <ExternalLink className="w-2 h-2 shrink-0" />
              +972 Magazine — "Where's Daddy?" investigation
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
