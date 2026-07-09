'use client';
import { useCallback, useRef, useState } from 'react';
import { ModuleCanvas, drawHUDText, drawPersonIcon } from './ModuleCanvas';
import { ExternalLink, Shield, AlertTriangle, BookOpen } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// GOSPEL / HABSORA — VERIFIED DATA
//   +972 Magazine / Local Call — "Lavender: The AI Machine" (Apr 3, 2024)
//   UNOSAT — Gaza Damage Assessment (Nov 2023)
//   Amnesty International — Gaza Infrastructure (2024)
// Key facts:
//   • The Gospel generated up to 100 building targets per day
//   • IDF lowered CDE threshold to accept up to 50-60 civilian deaths per target
//   • ~20,000 buildings destroyed/damaged in Gaza by May 2024
//   • 70%+ of structures in North Gaza destroyed by November 2023
//   • Targeting previously took weeks; Gospel AI reduced it to minutes
// ─────────────────────────────────────────────────────────────────────────────

type BuildState = 'unscanned' | 'scanning' | 'flagged' | 'cleared';
type BuildType  = 'RESIDENTIAL' | 'COMMERCIAL' | 'MIXED-USE';

interface Building {
  id:           string;
  x:            number;
  y:            number;
  w:            number;
  h:            number;
  floors:       number;
  residents:    number;
  cde:          number;       // 0–1
  flagged:      boolean;
  state:        BuildState;
  scanProgress: number;       // 0–1
  type:         BuildType;
  area:         number;       // m²
}

interface DataFlow { x: number; y: number; vy: number; }

const TYPES: BuildType[] = ['RESIDENTIAL', 'COMMERCIAL', 'MIXED-USE'];

export function HabsoraModule() {
  // ── Refs shared between draw loop and React (no re-renders from draw) ──
  const buildingsRef  = useRef<Building[]>([]);
  const dataFlows     = useRef<DataFlow[]>([]);
  const initDone      = useRef(false);
  const autoSelRef    = useRef(0);          // index of currently-scanned/auto building
  const hovIdxRef     = useRef<number | null>(null);  // ref used inside draw
  const displayIdxRef = useRef(0);          // which building the 3D panel shows

  // ── React state — only for JSX tooltip + hover effects ────────────────
  const [hovState, setHovState] = useState<{
    idx: number; x: number; y: number;
  } | null>(null);

  // ── Mouse handlers ─────────────────────────────────────────────────────
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx   = e.clientX - rect.left;
    const my   = e.clientY - rect.top;

    const idx = buildingsRef.current.findIndex(
      b => mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h
    );

    if (idx >= 0) {
      hovIdxRef.current = idx;
      displayIdxRef.current = idx;
      setHovState({ idx, x: e.clientX, y: e.clientY });
    } else {
      hovIdxRef.current = null;
      setHovState(null);
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    hovIdxRef.current = null;
    setHovState(null);
  }, []);

  // ── Canvas draw callback — deps: [] so ModuleCanvas never restarts ─────
  const draw = useCallback((
    ctx: CanvasRenderingContext2D, w: number, h: number, t: number, dt: number
  ) => {
    const panelY = 62;
    const mapW   = Math.floor(w * 0.57);

    // ── INIT BUILDINGS (once) ─────────────────────────────────────────────
    if (!initDone.current) {
      initDone.current = true;
      const cols  = 7;
      const rows  = 4;
      const cellW = (mapW - 32) / cols;
      const cellH = (h - panelY - 96) / rows;

      // Seeded RNG for reproducible layout
      let seed = 0xc0ffee;
      const rnd = () => { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed / 0xffffffff; };

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const bw      = cellW * 0.52 + rnd() * cellW * 0.22;
          const bh      = cellH * 0.44 + rnd() * cellH * 0.26;
          const bx      = 16 + c * cellW + (cellW - bw) / 2;
          const by      = panelY + 44 + r * cellH + (cellH - bh) / 2;
          const floors  = 2 + Math.floor(bh / 13);
          const type    = TYPES[Math.floor(rnd() * 3)];
          const flagged = rnd() < 0.32;
          const cde     = flagged ? 0.55 + rnd() * 0.45 : rnd() * 0.50;
          const n       = r * cols + c;

          buildingsRef.current.push({
            id: `APT-${String(n + 1).padStart(3, '0')}`,
            x: bx, y: by, w: bw, h: bh,
            floors,
            residents: 3 + Math.floor(rnd() * 22),
            cde, flagged,
            state: 'unscanned',
            scanProgress: 0,
            type,
            area: Math.floor(bw * bh * 0.82),
          });
        }
      }
    }

    // ── SCAN PROGRESSION ───────────────────────────────────────────────────
    // One building scanned every ~2.5 real-seconds
    const scanIdx = Math.min(Math.floor(t * 0.38), buildingsRef.current.length - 1);
    for (let i = 0; i < buildingsRef.current.length; i++) {
      const b = buildingsRef.current[i];
      if (i < scanIdx) {
        if (b.state === 'unscanned' || b.state === 'scanning') {
          b.scanProgress = 1;
          b.state        = b.flagged ? 'flagged' : 'cleared';
        }
      } else if (i === scanIdx) {
        if (b.state === 'unscanned') b.state = 'scanning';
        b.scanProgress = Math.min(b.scanProgress + dt * 0.45, 1);
        if (b.scanProgress >= 1) b.state = b.flagged ? 'flagged' : 'cleared';
      }
    }

    // Update auto-display index when no hover
    autoSelRef.current = scanIdx;
    if (hovIdxRef.current === null) displayIdxRef.current = scanIdx;

    // ── DATA FLOWS (amber particles flowing down) ─────────────────────────
    while (dataFlows.current.length < 22) {
      dataFlows.current.push({ x: 60 + Math.random() * (mapW - 100), y: panelY + 20, vy: 48 + Math.random() * 72 });
    }
    for (const f of dataFlows.current) {
      f.y += f.vy * dt;
      if (f.y > panelY + 46) { f.y = panelY + 20; f.x = 60 + Math.random() * (mapW - 100); }
      const a = Math.max(0, 0.75 - (f.y - panelY - 20) / 28);
      ctx.beginPath();
      ctx.arc(f.x, f.y, 1.4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,170,0,${a})`;
      ctx.fill();
    }

    // ── SECTION HEADER ────────────────────────────────────────────────────
    drawHUDText(ctx, 'STRUCTURAL TARGET MAPPING — HABSORA ALLOCATION', 16, panelY + 13, '#ff1a2e', 9);

    // HABSORA ENGINE badge
    const bp    = 0.35 + 0.25 * Math.sin(t * 3.2);
    const bdgX  = mapW / 2 - 62;
    const bdgW  = 124;
    ctx.fillStyle   = `rgba(255,26,46,${bp * 0.38})`;
    ctx.fillRect(bdgX, panelY + 22, bdgW, 16);
    ctx.strokeStyle = `rgba(255,26,46,${0.5 + bp * 0.45})`;
    ctx.lineWidth   = 0.9;
    ctx.strokeRect(bdgX, panelY + 22, bdgW, 16);
    ctx.font        = `bold 8px "JetBrains Mono", monospace`;
    ctx.textAlign   = 'center';
    ctx.fillStyle   = '#ff1a2e';
    ctx.fillText('HABSORA ENGINE  ▶  ACTIVE', mapW / 2, panelY + 33);
    ctx.textAlign   = 'left';

    // ── HEAT ZONES (radial gradient, soft) ────────────────────────────────
    const zones = [
      { cx: 90,  cy: panelY + 120, r: 68 },
      { cx: 230, cy: panelY + 160, r: 54 },
    ];
    for (const z of zones) {
      const pa = 0.055 + 0.035 * Math.sin(t * 1.8);
      const grd = ctx.createRadialGradient(z.cx, z.cy, 3, z.cx, z.cy, z.r);
      grd.addColorStop(0, `rgba(255,26,46,${pa * 2.8})`);
      grd.addColorStop(0.5, `rgba(255,26,46,${pa})`);
      grd.addColorStop(1, 'rgba(255,26,46,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(z.cx - z.r, z.cy - z.r, z.r * 2, z.r * 2);
      ctx.strokeStyle = `rgba(255,26,46,${0.22 + 0.10 * Math.sin(t * 1.8)})`;
      ctx.lineWidth   = 0.6;
      ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.ellipse(z.cx, z.cy, z.r, z.r * 0.72, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      drawHUDText(ctx, 'HIGH DENSITY', z.cx - 22, z.cy - z.r * 0.68 + 8, '#ff1a2e', 6);
    }

    // ── BUILDINGS ─────────────────────────────────────────────────────────
    for (let i = 0; i < buildingsRef.current.length; i++) {
      const b        = buildingsRef.current[i];
      const isHov    = i === hovIdxRef.current;
      const isDsp    = i === displayIdxRef.current;
      const { state } = b;

      // State-driven fill + stroke
      let fill: string, stroke: string, sw: number;
      switch (state) {
        case 'flagged':
          fill   = `rgba(255,26,46,${0.08 + 0.05 * Math.sin(t * 2.2 + i)})`;
          stroke = '#ff1a2e';
          sw     = isHov || isDsp ? 1.6 : 0.8;
          break;
        case 'scanning':
          fill   = 'rgba(0,100,200,0.13)';
          stroke = '#0096ff';
          sw     = 1.1;
          break;
        case 'cleared':
          fill   = 'rgba(0,28,14,0.55)';
          stroke = 'rgba(0,212,126,0.18)';
          sw     = 0.4;
          break;
        default:
          fill   = 'rgba(12,20,30,0.72)';
          stroke = 'rgba(26,37,53,0.45)';
          sw     = 0.4;
      }

      // Flagged glow
      if (state === 'flagged') {
        ctx.shadowColor = '#ff1a2e';
        ctx.shadowBlur  = isHov ? 20 : 8;
      }
      ctx.fillStyle   = fill;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.shadowBlur  = 0;
      ctx.strokeStyle = stroke;
      ctx.lineWidth   = sw;
      ctx.strokeRect(b.x, b.y, b.w, b.h);

      // Hover: white dashed ring
      if (isHov) {
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth   = 1.2;
        ctx.setLineDash([3, 2]);
        ctx.strokeRect(b.x - 2, b.y - 2, b.w + 4, b.h + 4);
        ctx.setLineDash([]);
      }

      // Floor lines
      for (let fl = 1; fl < b.floors; fl++) {
        const fy = b.y + (b.h / b.floors) * fl;
        ctx.strokeStyle = state === 'flagged' ? 'rgba(255,26,46,0.14)' : 'rgba(26,37,53,0.22)';
        ctx.lineWidth   = 0.35;
        ctx.beginPath(); ctx.moveTo(b.x + 2, fy); ctx.lineTo(b.x + b.w - 2, fy); ctx.stroke();
      }

      // Window grid
      if (b.w > 20 && b.h > 18) {
        const wCols = Math.min(4, Math.max(2, Math.floor(b.w / 12)));
        const wRows = Math.min(b.floors - 1, 3);
        const wW    = Math.max(3, (b.w - 6) / wCols - 3);
        const wH    = Math.max(3, (b.h / b.floors) * 0.44);
        const colSp = (b.w - 6) / wCols;
        const rowSp = b.h / b.floors;
        for (let wc = 0; wc < wCols; wc++) {
          for (let wr = 0; wr < wRows; wr++) {
            const wx = b.x + 3 + wc * colSp + (colSp - wW) / 2;
            const wy = b.y + 4 + wr * rowSp  + (rowSp  - wH) / 2;
            if (wx + wW > b.x + b.w - 1) continue;
            ctx.fillStyle = state === 'flagged'
              ? `rgba(255,26,46,0.22)`
              : state === 'scanning'
              ? `rgba(0,150,255,0.18)`
              : 'rgba(26,37,53,0.38)';
            ctx.fillRect(wx, wy, wW, wH);
          }
        }
      }

      // Active scan sweep
      if (state === 'scanning') {
        const sl = b.y + b.h * (1 - b.scanProgress);
        ctx.strokeStyle = `rgba(0,220,180,${0.7 + 0.25 * Math.sin(t * 9)})`;
        ctx.lineWidth   = 1;
        ctx.beginPath(); ctx.moveTo(b.x, sl); ctx.lineTo(b.x + b.w, sl); ctx.stroke();
        ctx.fillStyle   = 'rgba(0,150,255,0.07)';
        ctx.fillRect(b.x, sl, b.w, b.y + b.h - sl);
      }

      // Resident badge
      if (state === 'flagged' || isHov || isDsp) {
        ctx.fillStyle = 'rgba(4,4,8,0.86)';
        ctx.fillRect(b.x, b.y - 12, b.w, 12);
        ctx.font      = `bold 6.5px "JetBrains Mono", monospace`;
        ctx.fillStyle = state === 'flagged' ? '#ff1a2e' : '#ffaa00';
        ctx.fillText(`👤${b.residents}`, b.x + 2, b.y - 2);
      }
    }

    // ─────────────────────────────────────────────────────────────────────
    // RIGHT PANEL — 3D STRUCTURAL VIEW + DATA
    // ─────────────────────────────────────────────────────────────────────
    const rightX  = mapW + 12;
    const rightW  = w - rightX - 12;
    drawHUDText(ctx, '3D STRUCTURAL ANALYSIS', rightX, panelY + 13, '#0096ff', 9);

    const sel = buildingsRef.current[displayIdxRef.current];
    if (!sel) return;

    // Isometric building
    const isoX  = rightX + rightW * 0.46;
    const isoY  = panelY + 172;
    const isoW  = Math.min(rightW * 0.72, 102);
    const isoH  = Math.min(sel.floors * 15, 112);
    const isoD  = 26;
    const isCDE = sel.cde > 0.6;
    const iC    = isCDE ? '255,26,46' : '0,150,255';

    // Front face
    ctx.fillStyle   = `rgba(${iC},0.06)`;
    ctx.strokeStyle = `rgba(${iC},0.7)`;
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.moveTo(isoX - isoW/2, isoY);
    ctx.lineTo(isoX + isoW/2, isoY);
    ctx.lineTo(isoX + isoW/2, isoY - isoH);
    ctx.lineTo(isoX - isoW/2, isoY - isoH);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // Floor lines on front face
    for (let fl = 1; fl < sel.floors; fl++) {
      const fy = isoY - (isoH / sel.floors) * fl;
      ctx.strokeStyle = `rgba(${iC},0.25)`;
      ctx.lineWidth   = 0.5;
      ctx.beginPath(); ctx.moveTo(isoX - isoW/2 + 2, fy); ctx.lineTo(isoX + isoW/2 - 2, fy); ctx.stroke();
    }

    // Window grid on front face
    const wCols = 4; const wRows = Math.min(sel.floors, 3);
    const wColSp = isoW / (wCols + 1); const wRowSp = isoH / (wRows + 1);
    for (let wc = 1; wc <= wCols; wc++) {
      for (let wr = 1; wr <= wRows; wr++) {
        const wx = isoX - isoW/2 + wc * wColSp - 5;
        const wy = isoY - wr * wRowSp - 6;
        ctx.fillStyle   = `rgba(${iC},0.2)`;
        ctx.strokeStyle = `rgba(${iC},0.45)`;
        ctx.lineWidth   = 0.4;
        ctx.fillRect(wx, wy, 10, 10);
        ctx.strokeRect(wx, wy, 10, 10);
      }
    }

    // Right side face
    ctx.fillStyle   = `rgba(${iC},0.04)`;
    ctx.strokeStyle = `rgba(${iC},0.7)`;
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.moveTo(isoX + isoW/2,        isoY);
    ctx.lineTo(isoX + isoW/2 + isoD, isoY - isoD * 0.5);
    ctx.lineTo(isoX + isoW/2 + isoD, isoY - isoH - isoD * 0.5);
    ctx.lineTo(isoX + isoW/2,        isoY - isoH);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // Top face
    ctx.fillStyle   = `rgba(${iC},0.09)`;
    ctx.beginPath();
    ctx.moveTo(isoX - isoW/2,        isoY - isoH);
    ctx.lineTo(isoX + isoW/2,        isoY - isoH);
    ctx.lineTo(isoX + isoW/2 + isoD, isoY - isoH - isoD * 0.5);
    ctx.lineTo(isoX - isoW/2 + isoD, isoY - isoH - isoD * 0.5);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // Scan line (looping upward)
    const slProg = (t * 0.65) % 1;
    const slY    = isoY - slProg * isoH;
    if (slY > isoY - isoH) {
      const grd2 = ctx.createLinearGradient(0, slY - 10, 0, slY);
      grd2.addColorStop(0, 'rgba(0,220,180,0)');
      grd2.addColorStop(1, 'rgba(0,220,180,0.1)');
      ctx.fillStyle = grd2;
      ctx.fillRect(isoX - isoW/2, slY - 10, isoW, 10);
      ctx.strokeStyle = `rgba(0,220,180,${0.7 + 0.25 * Math.sin(t * 7)})`;
      ctx.lineWidth   = 1.2;
      ctx.beginPath(); ctx.moveTo(isoX - isoW/2, slY); ctx.lineTo(isoX + isoW/2, slY); ctx.stroke();
    }

    // Resident person icons above building
    const icY = isoY - isoH - isoD * 0.5 - 18;
    const maxIcons = Math.min(sel.residents, 14);
    for (let ri = 0; ri < maxIcons; ri++) {
      drawPersonIcon(ctx, rightX + 4 + ri * 9, icY, 6, isCDE ? '#ff1a2e' : '#ffaa00');
    }
    if (sel.residents > maxIcons) {
      drawHUDText(ctx, `+${sel.residents - maxIcons}`, rightX + 4 + maxIcons * 9, icY - 4, '#ffaa00', 6);
    }

    // ── DATA TABLE ────────────────────────────────────────────────────────
    const dpX = rightX + 2;
    const dpY = isoY + 18;
    const dpRows = [
      ['TARGET ID',  sel.id],
      ['TYPE',       sel.type],
      ['FLOORS',     `${sel.floors}`],
      ['AREA',       `${sel.area} m²`],
      ['RESIDENTS',  `${sel.residents} est.`],
      ['CDE SCORE',  `${Math.floor(sel.cde * 100)}%`],
      ['STATUS',     sel.state.toUpperCase()],
    ];
    dpRows.forEach(([k, v], i) => {
      ctx.font      = 'bold 7px "JetBrains Mono", monospace';
      ctx.fillStyle = '#2a3a4a';
      ctx.fillText(k + ':', dpX, dpY + i * 13);
      const vc =
        k === 'STATUS'
          ? (sel.state === 'flagged' ? '#ff1a2e' : sel.state === 'scanning' ? '#0096ff' : sel.state === 'cleared' ? '#00d47e' : '#536878')
          : k === 'CDE SCORE'
          ? (sel.cde > 0.6 ? '#ff1a2e' : '#00d47e')
          : k === 'RESIDENTS' ? '#ffaa00' : '#ccd6e0';
      ctx.fillStyle = vc;
      ctx.fillText(v, dpX + 72, dpY + i * 13);
    });

    // CDE card
    const cdeY = dpY + dpRows.length * 13 + 6;
    ctx.fillStyle   = isCDE ? 'rgba(255,26,46,0.11)' : 'rgba(0,212,126,0.07)';
    ctx.strokeStyle = isCDE ? '#ff1a2e' : '#00d47e';
    ctx.lineWidth   = 0.8;
    const cdeH = 30;
    ctx.fillRect(dpX, cdeY, rightW - 14, cdeH);
    ctx.strokeRect(dpX, cdeY, rightW - 14, cdeH);
    ctx.font      = 'bold 7.5px "JetBrains Mono", monospace';
    ctx.fillStyle = isCDE ? '#ff1a2e' : '#00d47e';
    ctx.fillText(`CDE: ${isCDE ? 'THRESHOLD EXCEEDED' : 'DIMINISHED'}`, dpX + 5, cdeY + 11);
    ctx.font      = '6.5px "JetBrains Mono", monospace';
    ctx.fillStyle = '#536878';
    ctx.fillText(
      isCDE
        ? `~${Math.floor(sel.residents * sel.cde)} residents at risk — STRIKE ALLOCATED`
        : `Strike NOT allocated this cycle`,
      dpX + 5, cdeY + 23
    );

    // ── BOTTOM HUD ────────────────────────────────────────────────────────
    const hudY    = h - 28;
    ctx.fillStyle = 'rgba(4,4,8,0.94)';
    ctx.fillRect(0, hudY - 8, w, 36);
    ctx.strokeStyle = 'rgba(26,37,53,0.5)'; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(0, hudY - 8); ctx.lineTo(w, hudY - 8); ctx.stroke();

    const total    = buildingsRef.current.length;
    const scannedN = buildingsRef.current.filter(b => b.state !== 'unscanned').length;
    const flaggedN = buildingsRef.current.filter(b => b.state === 'flagged').length;
    const totalRes = buildingsRef.current.filter(b => b.state === 'flagged').reduce((s, b) => s + b.residents, 0);
    const gospelRate = 100; // buildings/day — verified from +972 Magazine

    drawHUDText(ctx, `STRUCTURES MAPPED: ${total}`,            16,       hudY + 8, '#0096ff', 9);
    drawHUDText(ctx, `SCANNED: ${scannedN}/${total}`,          w * 0.24, hudY + 8, '#536878', 9);
    drawHUDText(ctx, `FLAGGED: ${flaggedN}`,                   w * 0.40, hudY + 8, '#ff1a2e', 9);
    drawHUDText(ctx, `COLLATERAL: ~${totalRes} RESIDENTS`,     w * 0.55, hudY + 8, '#ffaa00', 9);
    drawHUDText(ctx, `GOSPEL RATE: ${gospelRate} BLDGS/DAY`,  w * 0.78, hudY + 8, '#536878', 8);
  }, []); // ← no dependencies: all mutable state via refs

  // ── TOOLTIP DATA ────────────────────────────────────────────────────────
  const hovB = hovState !== null ? buildingsRef.current[hovState.idx] : null;

  return (
    <div className="relative w-full h-full">

      {/* Canvas */}
      <div className="absolute inset-0">
        <ModuleCanvas
          title="HAPSORA / THE GOSPEL — STRUCTURAL TARGETING ENGINE"
          subtitle="Personnel profiles → physical structure assignment → collateral damage estimation"
          moduleId="MODULE 3 // HABSORA"
          draw={draw}
        />
      </div>

      {/* Transparent mouse-capture overlay */}
      <div
        className="absolute inset-0 z-10"
        style={{ cursor: hovState ? 'crosshair' : 'default' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />

      {/* ── BUILDING HOVER TOOLTIP ─────────────────────────────────────── */}
      {hovB && (
        <div
          className="fixed z-50 font-mono pointer-events-none select-none"
          style={{
            left:     Math.min(hovState!.x + 16, window.innerWidth - 275),
            top:      hovState!.y - 10,
            width:    260,
          }}
        >
          <div
            className="rounded overflow-hidden text-[8px] leading-relaxed"
            style={{
              background:   'rgba(4,6,10,0.97)',
              border:       `1px solid ${hovB.state === 'flagged' ? 'rgba(255,26,46,0.55)' : hovB.state === 'scanning' ? 'rgba(0,150,255,0.45)' : hovB.state === 'cleared' ? 'rgba(0,212,126,0.3)' : 'rgba(26,37,53,0.5)'}`,
              backdropFilter: 'blur(14px)',
              boxShadow:    hovB.state === 'flagged' ? '0 0 28px rgba(255,26,46,0.2), 0 8px 32px rgba(0,0,0,0.7)' : '0 8px 32px rgba(0,0,0,0.6)',
            }}
          >
            {/* Header */}
            <div
              className="px-3 py-2 flex justify-between items-center"
              style={{
                borderBottom: '1px solid rgba(26,37,53,0.45)',
                background: hovB.state === 'flagged' ? 'rgba(255,26,46,0.07)' : 'rgba(0,0,0,0.15)',
              }}
            >
              <div>
                <span className="font-bold text-[10px]" style={{ color: '#ccd6e0' }}>{hovB.id}</span>
                <span className="ml-2 text-[7px]" style={{ color: '#2a3a4a' }}>{hovB.type}</span>
              </div>
              <span
                className="font-bold px-1.5 py-0.5 rounded text-[7px]"
                style={{
                  color:       hovB.state === 'flagged' ? '#ff1a2e' : hovB.state === 'scanning' ? '#0096ff' : hovB.state === 'cleared' ? '#00d47e' : '#536878',
                  background:  hovB.state === 'flagged' ? 'rgba(255,26,46,0.15)' : hovB.state === 'scanning' ? 'rgba(0,150,255,0.12)' : 'rgba(0,0,0,0.2)',
                  border:      `1px solid ${hovB.state === 'flagged' ? 'rgba(255,26,46,0.35)' : 'rgba(26,37,53,0.4)'}`,
                }}
              >
                {hovB.state === 'unscanned'
                  ? '○ UNSCANNED'
                  : hovB.state === 'scanning'
                  ? '◌ SCANNING'
                  : hovB.state === 'flagged'
                  ? '● STRIKE ALLOCATED'
                  : '◎ CLEARED'}
              </span>
            </div>

            {/* Body */}
            <div className="px-3 py-2 space-y-1.5">
              {hovB.state === 'unscanned' && (
                <>
                  <p style={{ color: '#536878' }}>RESIDENT DATA: <span style={{ color: '#ffaa00' }}>UNAVAILABLE</span></p>
                  <p style={{ color: '#536878' }}>CDE SCORE: <span style={{ color: '#536878' }}>PENDING ANALYSIS</span></p>
                  <div className="flex items-start gap-1.5 mt-1 pt-1.5" style={{ borderTop: '1px solid rgba(26,37,53,0.4)' }}>
                    <span style={{ color: '#ffaa00', flexShrink: 0 }}>⚠</span>
                    <p style={{ color: '#536878', fontSize: '7px', lineHeight: 1.5 }}>
                      HABSORA will estimate residents from Lavender profile data and pattern-of-life signals. No physical confirmation required before strike allocation.
                    </p>
                  </div>
                </>
              )}

              {hovB.state === 'scanning' && (
                <>
                  <p style={{ color: '#0096ff' }} className="font-bold">◌ HABSORA SCANNING...</p>
                  <div className="w-full h-1.5 rounded" style={{ background: 'rgba(26,37,53,0.5)' }}>
                    <div style={{ width: `${hovB.scanProgress * 100}%`, height: '100%', background: '#0096ff', borderRadius: 2 }} />
                  </div>
                  <p style={{ color: '#536878', fontSize: '7px' }}>
                    Cross-referencing surveillance profiles, mobile signal data, and pattern-of-life records to estimate resident count and military value...
                  </p>
                </>
              )}

              {(hovB.state === 'flagged' || hovB.state === 'cleared') && (
                <>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                    {([
                      ['FLOORS',     `${hovB.floors}`],
                      ['AREA',       `${hovB.area} m²`],
                      ['RESIDENTS',  `${hovB.residents} estimated`, '#ffaa00'],
                      ['CDE SCORE',  `${Math.floor(hovB.cde * 100)}%`, hovB.cde > 0.6 ? '#ff1a2e' : '#00d47e'],
                    ] as [string, string, string?][]).map(([k, v, c]) => (
                      <div key={k} className="flex gap-1">
                        <span style={{ color: '#2a3a4a' }}>{k}:</span>
                        <span style={{ color: c ?? '#ccd6e0', fontWeight: c ? 700 : 400 }}>{v}</span>
                      </div>
                    ))}
                  </div>

                  {hovB.state === 'flagged' && (
                    <div
                      className="mt-1 pt-1.5 space-y-0.5"
                      style={{ borderTop: '1px solid rgba(255,26,46,0.22)' }}
                    >
                      <p className="font-bold text-[7.5px]" style={{ color: '#ff1a2e' }}>
                        ⚖ IHL: PROPORTIONALITY CONCERN
                      </p>
                      <p style={{ color: '#536878', fontSize: '7px', lineHeight: 1.55 }}>
                        Strike allocated with ~{Math.floor(hovB.residents * hovB.cde)} civilians at risk.
                        Gospel CDE threshold may permit up to 50 civilian deaths per target.
                        This may violate Art.&nbsp;51(5)(b) AP&nbsp;I.
                      </p>
                    </div>
                  )}

                  {hovB.state === 'cleared' && (
                    <p style={{ color: '#00d47e', fontSize: '7.5px' }} className="font-bold">
                      ○ No target assigned — CDE below threshold <em>this cycle</em>.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── ADVOCACY PANEL — bottom-right quadrant ─────────────────────── */}
      <div
        className="absolute font-mono pointer-events-auto"
        style={{
          right:  12,
          bottom: 36,
          width:  'calc(43% - 24px)',
          zIndex: 10,
        }}
      >
        <div
          className="rounded overflow-hidden text-[7px] leading-relaxed"
          style={{ background: 'rgba(4,6,10,0.9)', border: '1px solid rgba(26,37,53,0.5)', backdropFilter: 'blur(10px)' }}
        >
          {/* Header */}
          <div
            className="px-3 py-1.5 flex items-center gap-1.5"
            style={{ borderBottom: '1px solid rgba(26,37,53,0.4)', background: 'rgba(255,26,46,0.05)' }}
          >
            <AlertTriangle className="w-3 h-3 shrink-0" style={{ color: '#ff1a2e' }} />
            <span className="font-bold text-[8px] tracking-wider" style={{ color: '#ff1a2e' }}>
              THE GOSPEL AI — VERIFIED FACTS
            </span>
          </div>

          <div className="px-3 py-2 space-y-2.5">
            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-x-2 gap-y-1.5">
              {([
                { val: '100+',     label: 'bldg targets / day',       col: '#ff1a2e' },
                { val: '50+',      label: 'civilians / target OK',     col: '#ff6600' },
                { val: '~20,000',  label: 'buildings destroyed',       col: '#ff1a2e' },
                { val: '70%+',     label: 'N.Gaza structures gone',    col: '#ffaa00' },
                { val: 'Wks→Mins', label: 'target compilation time',   col: '#0096ff' },
                { val: '0',        label: 'human authorisations',      col: '#536878' },
              ] as { val: string; label: string; col: string }[]).map(({ val, label, col }) => (
                <div key={label}>
                  <div className="font-bold text-[10px] tabular-nums leading-none" style={{ color: col }}>{val}</div>
                  <div style={{ color: '#2a3a4a' }}>{label}</div>
                </div>
              ))}
            </div>

            {/* IHL */}
            <div className="pt-2 space-y-1" style={{ borderTop: '1px solid rgba(26,37,53,0.4)' }}>
              <div className="flex items-center gap-1">
                <Shield className="w-2.5 h-2.5 shrink-0" style={{ color: '#0096ff' }} />
                <span className="font-bold tracking-wider" style={{ color: '#0096ff', fontSize: '7px' }}>APPLICABLE IHL</span>
              </div>
              <p style={{ color: '#536878', lineHeight: 1.65 }}>
                <span style={{ color: '#ccd6e0', fontWeight: 700 }}>Proportionality</span> (Art.&nbsp;51(5)(b), AP&nbsp;I) — Civilian harm must not be excessive relative to anticipated military advantage. No AI can make this legal judgement.
              </p>
              <p style={{ color: '#536878', lineHeight: 1.65 }}>
                <span style={{ color: '#ccd6e0', fontWeight: 700 }}>Distinction</span> (Art.&nbsp;48, AP&nbsp;I) — Parties must always distinguish between combatants and civilians.
              </p>
            </div>

            {/* Sources */}
            <div className="pt-1.5 space-y-1" style={{ borderTop: '1px solid rgba(26,37,53,0.4)' }}>
              <div className="flex items-center gap-1 mb-0.5">
                <BookOpen className="w-2.5 h-2.5 shrink-0" style={{ color: '#536878' }} />
                <span className="font-bold" style={{ color: '#2a3a4a' }}>PRIMARY SOURCES</span>
              </div>
              {([
                ['+972 Magazine — Lavender/Gospel AI (Apr 2024)', 'https://www.972mag.com/lavender-ai-israeli-army-gaza/'],
                ['UNOSAT — Gaza Damage Assessment (Nov 2023)',     'https://www.unitar.org/maps/unosat-rapid-mapping'],
                ['Amnesty International — Gaza Infrastructure',   'https://www.amnesty.org/en/location/middle-east-and-north-africa/israel-and-occupied-palestinian-territories/'],
              ] as [string, string][]).map(([label, url]) => (
                <a key={url} href={url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 transition-colors"
                  style={{ color: '#2a3a4a' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#0096ff')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#2a3a4a')}
                >
                  <ExternalLink className="w-2 h-2 shrink-0" />
                  <span>{label}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
