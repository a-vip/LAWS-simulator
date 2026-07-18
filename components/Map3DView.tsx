'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useSimulationStore } from '@/store/simulation';
import { ZoomIn, Orbit, Eye, ChevronLeft } from 'lucide-react';
import clsx from 'clsx';
import { TacticalLayersPanel } from './TacticalLayersPanel';
import { MapLibreSatellite } from './MapLibreSatellite';

// ═══════════════════════════════════════════════════════════════════════════
// CANVAS FALLBACK — Overhauled Tactical 3D View
// Full procedural tactical display with proper UAV silhouettes
// ═══════════════════════════════════════════════════════════════════════════

interface Person3D {
  id: string;
  bx: number;
  by: number;
  radius: number;
  label: string;
  isSubject: boolean;
  angle: number;
  speed: number;
}

function project3D(
  x: number, y: number, z: number,
  w: number, h: number,
  heading: number, pitch: number, camZ: number
) {
  const distance = camZ * 1.25;
  const camX = distance * Math.cos(heading) * Math.cos(pitch);
  const camY = distance * Math.sin(heading) * Math.cos(pitch);
  const camActualZ = camZ;

  let dx = x - camX;
  let dy = y - camY;
  let dz = z - camActualZ;

  const cosH = Math.cos(-heading - Math.PI / 2);
  const sinH = Math.sin(-heading - Math.PI / 2);
  let rx = dx * cosH - dy * sinH;
  let ry = dx * sinH + dy * cosH;

  const cosP = Math.cos(pitch);
  const sinP = Math.sin(pitch);
  let rz = dz * cosP - ry * sinP;
  let ry2 = dz * sinP + ry * cosP;

  const fov = 400;
  if (ry2 <= 10) return null;

  const scale = fov / ry2;
  return { x: w / 2 + rx * scale, y: h / 2 - rz * scale, scale };
}

// Draw an MQ-9 Reaper top-down silhouette on canvas
function drawDroneOnCanvas(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  scale: number,
  heading: number,  // degrees
  color: string
) {
  const s = Math.max(scale * 4, 8);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((heading * Math.PI) / 180);
  ctx.scale(s / 24, s / 24);

  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.2 / (s / 24);
  ctx.globalAlpha = 0.95;

  // Fuselage
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.lineTo(2, -6);
  ctx.lineTo(2.5, 8);
  ctx.lineTo(1.5, 14);
  ctx.lineTo(0, 15);
  ctx.lineTo(-1.5, 14);
  ctx.lineTo(-2.5, 8);
  ctx.lineTo(-2, -6);
  ctx.closePath();
  ctx.fillStyle = color + 'cc';
  ctx.fill();
  ctx.stroke();

  // Left wing
  ctx.beginPath();
  ctx.moveTo(-2, -2);
  ctx.lineTo(-16, 4);
  ctx.lineTo(-16.5, 5.5);
  ctx.lineTo(-15, 6);
  ctx.lineTo(-2, 3);
  ctx.closePath();
  ctx.fillStyle = color + '88';
  ctx.fill();
  ctx.stroke();

  // Right wing
  ctx.beginPath();
  ctx.moveTo(2, -2);
  ctx.lineTo(16, 4);
  ctx.lineTo(16.5, 5.5);
  ctx.lineTo(15, 6);
  ctx.lineTo(2, 3);
  ctx.closePath();
  ctx.fillStyle = color + '88';
  ctx.fill();
  ctx.stroke();

  // Left tail
  ctx.beginPath();
  ctx.moveTo(-1.5, 11);
  ctx.lineTo(-7, 13.5);
  ctx.lineTo(-7.5, 15);
  ctx.lineTo(-6, 15.5);
  ctx.lineTo(-1.5, 13);
  ctx.closePath();
  ctx.fillStyle = color + '88';
  ctx.fill();
  ctx.stroke();

  // Right tail
  ctx.beginPath();
  ctx.moveTo(1.5, 11);
  ctx.lineTo(7, 13.5);
  ctx.lineTo(7.5, 15);
  ctx.lineTo(6, 15.5);
  ctx.lineTo(1.5, 13);
  ctx.closePath();
  ctx.fillStyle = color + '88';
  ctx.fill();
  ctx.stroke();

  // Engine pod
  ctx.beginPath();
  ctx.ellipse(0, 10, 1.8, 3, 0, 0, Math.PI * 2);
  ctx.fillStyle = color + 'aa';
  ctx.fill();

  // Sensor nose
  ctx.beginPath();
  ctx.arc(0, -13, 2, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  ctx.restore();
}

// Draw a sensor cone from drone toward target
function drawSensorCone(
  ctx: CanvasRenderingContext2D,
  dx: number, dy: number,
  tx: number, ty: number,
  color: string,
  halfAngle: number = 20
) {
  const bearing = Math.atan2(ty - dy, tx - dx);
  const dist = Math.sqrt((tx - dx) ** 2 + (ty - dy) ** 2) * 0.75;

  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(dx, dy);
  const steps = 16;
  for (let i = 0; i <= steps; i++) {
    const a = bearing - (halfAngle * Math.PI / 180) + (2 * halfAngle * Math.PI / 180 * i / steps);
    ctx.lineTo(dx + Math.cos(a) * dist, dy + Math.sin(a) * dist);
  }
  ctx.closePath();
  ctx.fill();

  // Cone outline
  ctx.globalAlpha = 0.3;
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.restore();
}

function CanvasFallback({ className, spectralMode }: { className?: string; spectralMode: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { phase, droneProgress, activeScenario, viewMode } = useSimulationStore();
  const animRef = useRef<number>(0);
  const rotationAngle = useRef<number>(0);
  const currentZ = useRef<number>(12000000);
  const currentPitch = useRef<number>(0.15);

  // Drone animation state
  const droneAngle = useRef<number>(0);
  const droneEntry = useRef<number>(0);
  const droneSwoop = useRef<number>(0);

  const peopleRef = useRef<Person3D[]>([
    { id: 'p1', bx: 0, by: 0, radius: 8, label: 'SUBJECT ALPHA (TARGET)', isSubject: true, angle: 0, speed: 0.015 },
    { id: 'p2', bx: 55, by: -45, radius: 6, label: 'CIVILIAN ADULT', isSubject: false, angle: 2.1, speed: 0.012 },
    { id: 'p3', bx: 0, by: 0, radius: 15, label: 'COLLATERAL MINOR', isSubject: false, angle: 0.8, speed: 0.02 },
    { id: 'p4', bx: -45, by: 35, radius: 8, label: 'CIVILIAN (INDIGENOUS)', isSubject: false, angle: 4.3, speed: 0.01 },
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const BUILDINGS = [
      { bx: 0, by: 0, bw: 32, bd: 28, bh: 18, label: 'PRIMARY COMPOUND — TARGET ALPHA', type: 'target' },
      { bx: -45, by: 35, bw: 20, bd: 16, bh: 11, label: 'OUTBUILDING / STORAGE', type: 'outbuilding' },
      { bx: 55, by: -45, bw: 26, bd: 22, bh: 13, label: 'CIVILIAN HOMESTEAD', type: 'civilian' },
      { bx: -80, by: -75, bw: 45, bd: 35, bh: 20, label: 'CIVILIAN ASSEMBLY COMPLEX', type: 'civilian_public' },
    ];

    const draw = () => {
      const w = canvas.offsetWidth || canvas.width / (window.devicePixelRatio || 1);
      const h = canvas.offsetHeight || canvas.height / (window.devicePixelRatio || 1);
      if (w === 0 || h === 0) { animRef.current = requestAnimationFrame(draw); return; }

      const cx = w / 2;
      const cy = h / 2;

      rotationAngle.current = (rotationAngle.current + 0.003) % (Math.PI * 2);
      const angle = rotationAngle.current;

      // ── BACKGROUND ──────────────────────────────────────────────────
      const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.7);
      bgGrad.addColorStop(0, spectralMode ? '#010f05' : '#060b14');
      bgGrad.addColorStop(1, spectralMode ? '#000500' : '#030608');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // ── IDLE STATE: Globe ────────────────────────────────────────────
      if (!activeScenario || phase === 'idle') {
        currentZ.current = 12000000;
        currentPitch.current = 0.15;

        const R = Math.min(w, h) * 0.28;

        // Globe atmosphere glow
        const atmosphereGrad = ctx.createRadialGradient(cx, cy, R * 0.85, cx, cy, R * 1.25);
        atmosphereGrad.addColorStop(0, spectralMode ? 'rgba(0,255,120,0.06)' : 'rgba(0,80,200,0.08)');
        atmosphereGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = atmosphereGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, R * 1.25, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.strokeStyle = spectralMode ? 'rgba(0,255,149,0.2)' : 'rgba(0,150,255,0.2)';
        ctx.lineWidth = 0.5;

        // Latitude rings
        for (let i = 1; i < 6; i++) {
          const latAngle = (i / 6) * Math.PI;
          const latY = cy + R * Math.cos(latAngle);
          const latR = R * Math.sin(latAngle);
          ctx.beginPath();
          ctx.ellipse(cx, latY, latR, latR * 0.22, 0, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Longitude meridians
        for (let i = 0; i < 9; i++) {
          const longAngle = (i / 9) * Math.PI + angle;
          const ellipseW = R * Math.sin(longAngle);
          ctx.beginPath();
          ctx.ellipse(cx, cy, Math.abs(ellipseW), R, 0, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Globe outline
        ctx.strokeStyle = spectralMode ? 'rgba(0,255,149,0.45)' : 'rgba(0,150,255,0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.stroke();

        // Satellite orbit
        const satAngle = angle * 1.5;
        const satX = cx + (R * 1.35) * Math.cos(satAngle);
        const satY = cy + (R * 0.3) * Math.sin(satAngle);
        ctx.beginPath();
        ctx.ellipse(cx, cy, R * 1.35, R * 0.3, 0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,170,0,0.18)';
        ctx.lineWidth = 0.5;
        ctx.stroke();

        ctx.fillStyle = '#ffaa00';
        ctx.beginPath();
        ctx.arc(satX, satY, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255,170,0,0.3)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(satX, satY);
        ctx.lineTo(cx, cy);
        ctx.stroke();

        ctx.font = '7.5px "JetBrains Mono", monospace';
        ctx.fillStyle = '#ffaa00';
        ctx.fillText('SAT-NODE-08 [TRACKING]', satX + 6, satY - 2);
        ctx.restore();

        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillStyle = spectralMode ? '#00ff95' : '#00d47e';
        ctx.textAlign = 'center';
        ctx.fillText('● STANDBY — AWAITING NOMINATION FEED', cx, cy + R + 30);
        ctx.fillStyle = '#536878';
        ctx.font = '8px "JetBrains Mono", monospace';
        ctx.fillText("select a scenario operation card to link feed", cx, cy + R + 44);
        ctx.textAlign = 'left';

        animRef.current = requestAnimationFrame(draw);
        return;
      }

      // ── ACTIVE STATE ──────────────────────────────────────────────────
      const targetZ = viewMode === 'drone' ? 85 : 260;
      const targetPitch = viewMode === 'drone' ? 1.0 : 0.40;

      if (currentZ.current > 2000) {
        currentZ.current = 1400;
        currentPitch.current = 0.22;
      }
      currentZ.current += (targetZ - currentZ.current) * 0.055;
      currentPitch.current += (targetPitch - currentPitch.current) * 0.055;

      const camZ = currentZ.current;
      const pitch = currentPitch.current;

      // ── TERRAIN GRID ──────────────────────────────────────────────────
      const tileSize = 80;
      for (let tx = -240; tx <= 240; tx += tileSize) {
        for (let ty = -240; ty <= 240; ty += tileSize) {
          const p0 = project3D(tx, ty, 0, w, h, angle, pitch, camZ);
          const p1 = project3D(tx + tileSize, ty, 0, w, h, angle, pitch, camZ);
          const p2 = project3D(tx + tileSize, ty + tileSize, 0, w, h, angle, pitch, camZ);
          const p3 = project3D(tx, ty + tileSize, 0, w, h, angle, pitch, camZ);

          if (p0 && p1 && p2 && p3) {
            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.lineTo(p3.x, p3.y);
            ctx.closePath();

            // Procedural terrain shading - vary by position for organic look
            const seed = Math.abs(Math.sin(tx * 0.03 + ty * 0.05)) * 0.5;
            if (spectralMode) {
              ctx.fillStyle = `rgba(${5 + seed * 15}, ${20 + seed * 25}, ${8 + seed * 10}, ${0.35 + seed * 0.15})`;
            } else {
              ctx.fillStyle = `rgba(${12 + seed * 16}, ${18 + seed * 14}, ${24 + seed * 12}, ${0.55 + seed * 0.15})`;
            }
            ctx.fill();
            ctx.strokeStyle = spectralMode ? 'rgba(0,255,149,0.04)' : 'rgba(0,150,255,0.04)';
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // ── ROADS ────────────────────────────────────────────────────────
      const drawRoad = (xStart: number, xEnd: number, yStart: number, yEnd: number, roadW: number) => {
        const steps = 16;
        for (let i = 0; i < steps; i++) {
          const t0 = i / steps, t1 = (i + 1) / steps;
          const x0 = xStart + (xEnd - xStart) * t0, y0 = yStart + (yEnd - yStart) * t0;
          const x1 = xStart + (xEnd - xStart) * t1, y1 = yStart + (yEnd - yStart) * t1;
          const perpX = -(yEnd - yStart), perpY = xEnd - xStart;
          const len = Math.sqrt(perpX * perpX + perpY * perpY);
          const nx = (perpX / len) * (roadW / 2), ny = (perpY / len) * (roadW / 2);

          const p0 = project3D(x0 - nx, y0 - ny, 0, w, h, angle, pitch, camZ);
          const p1 = project3D(x1 - nx, y1 - ny, 0, w, h, angle, pitch, camZ);
          const p2 = project3D(x1 + nx, y1 + ny, 0, w, h, angle, pitch, camZ);
          const p3 = project3D(x0 + nx, y0 + ny, 0, w, h, angle, pitch, camZ);

          if (p0 && p1 && p2 && p3) {
            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.lineTo(p3.x, p3.y);
            ctx.closePath();
            ctx.fillStyle = spectralMode ? 'rgba(28,45,22,0.75)' : 'rgba(6,10,16,0.9)';
            ctx.fill();

            if (i % 2 === 0) {
              const m0 = project3D(x0, y0, 0, w, h, angle, pitch, camZ);
              const m1 = project3D(x1, y1, 0, w, h, angle, pitch, camZ);
              if (m0 && m1) {
                ctx.beginPath();
                ctx.moveTo(m0.x, m0.y);
                ctx.lineTo(m1.x, m1.y);
                ctx.strokeStyle = spectralMode ? 'rgba(0,255,149,0.3)' : 'rgba(255,255,255,0.18)';
                ctx.lineWidth = 1;
                ctx.stroke();
              }
            }
          }
        }
      };
      drawRoad(-240, 240, 70, 70, 14);
      drawRoad(-90, -90, -240, 240, 14);

      // ── BUILDINGS ────────────────────────────────────────────────────
      BUILDINGS.forEach((b) => {
        const verts = [
          { x: b.bx - b.bw/2, y: b.by - b.bd/2, z: 0 },
          { x: b.bx + b.bw/2, y: b.by - b.bd/2, z: 0 },
          { x: b.bx + b.bw/2, y: b.by + b.bd/2, z: 0 },
          { x: b.bx - b.bw/2, y: b.by + b.bd/2, z: 0 },
          { x: b.bx - b.bw/2, y: b.by - b.bd/2, z: b.bh },
          { x: b.bx + b.bw/2, y: b.by - b.bd/2, z: b.bh },
          { x: b.bx + b.bw/2, y: b.by + b.bd/2, z: b.bh },
          { x: b.bx - b.bw/2, y: b.by + b.bd/2, z: b.bh },
        ];
        const proj = verts.map(v => project3D(v.x, v.y, v.z, w, h, angle, pitch, camZ));
        if (!proj.every(v => v !== null)) return;
        const p = proj as { x: number; y: number; scale: number }[];

        const isTarget = b.type === 'target';
        const baseColor = isTarget
          ? (spectralMode ? 'rgba(55,10,10,0.7)' : 'rgba(60,14,20,0.7)')
          : (spectralMode ? 'rgba(8,28,12,0.7)' : 'rgba(12,28,48,0.7)');
        const edgeColor = isTarget
          ? (spectralMode ? 'rgba(255,50,70,0.8)' : 'rgba(255,26,46,0.75)')
          : (spectralMode ? 'rgba(0,255,149,0.5)' : 'rgba(0,150,255,0.5)');

        // Ground shadow
        ctx.beginPath();
        ctx.moveTo(p[0].x + 2, p[0].y + 2);
        ctx.lineTo(p[1].x + 2, p[1].y + 2);
        ctx.lineTo(p[2].x + 2, p[2].y + 2);
        ctx.lineTo(p[3].x + 2, p[3].y + 2);
        ctx.closePath();
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fill();

        // Walls
        [[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]].forEach(face => {
          ctx.beginPath();
          ctx.moveTo(p[face[0]].x, p[face[0]].y);
          ctx.lineTo(p[face[1]].x, p[face[1]].y);
          ctx.lineTo(p[face[2]].x, p[face[2]].y);
          ctx.lineTo(p[face[3]].x, p[face[3]].y);
          ctx.closePath();
          ctx.fillStyle = baseColor;
          ctx.fill();
          ctx.strokeStyle = edgeColor;
          ctx.lineWidth = 1;
          ctx.stroke();

          // Window detail lines on walls
          if (b.bh > 12) {
            const midX = (p[face[0]].x + p[face[1]].x) / 2;
            const midTopX = (p[face[2]].x + p[face[3]].x) / 2;
            const midY = (p[face[0]].y + p[face[1]].y) / 2;
            const midTopY = (p[face[2]].y + p[face[3]].y) / 2;
            ctx.beginPath();
            ctx.moveTo(midX, midY);
            ctx.lineTo(midTopX, midTopY);
            ctx.strokeStyle = edgeColor.replace('0.75', '0.25').replace('0.5', '0.2');
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });

        // Roof
        ctx.beginPath();
        ctx.moveTo(p[4].x, p[4].y);
        ctx.lineTo(p[5].x, p[5].y);
        ctx.lineTo(p[6].x, p[6].y);
        ctx.lineTo(p[7].x, p[7].y);
        ctx.closePath();
        ctx.fillStyle = isTarget
          ? (spectralMode ? 'rgba(40,10,10,0.9)' : 'rgba(50,10,18,0.9)')
          : (spectralMode ? 'rgba(14,42,18,0.9)' : 'rgba(20,36,58,0.9)');
        ctx.fill();
        ctx.strokeStyle = edgeColor;
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Roof detail crosshatch
        ctx.beginPath();
        ctx.moveTo(p[4].x, p[4].y); ctx.lineTo(p[6].x, p[6].y);
        ctx.moveTo(p[5].x, p[5].y); ctx.lineTo(p[7].x, p[7].y);
        ctx.strokeStyle = edgeColor.replace('0.75','0.3').replace('0.5','0.25');
        ctx.lineWidth = 0.4;
        ctx.stroke();

        // Target label in drone view
        if (viewMode === 'drone') {
          const rCenter = {
            x: (p[4].x + p[5].x + p[6].x + p[7].x) / 4,
            y: (p[4].y + p[5].y + p[6].y + p[7].y) / 4,
          };
          ctx.beginPath();
          ctx.moveTo(rCenter.x, rCenter.y);
          ctx.lineTo(rCenter.x + 32, rCenter.y - 22);
          ctx.strokeStyle = edgeColor;
          ctx.lineWidth = 0.5;
          ctx.stroke();
          ctx.font = '6px "JetBrains Mono", monospace';
          ctx.fillStyle = edgeColor;
          ctx.fillText(b.label, rCenter.x + 35, rCenter.y - 20);
        }
      });

      // ── PEOPLE (THERMAL SIGNATURES) ───────────────────────────────
      peopleRef.current.forEach((person) => {
        person.angle += person.speed;
        const px = person.bx + person.radius * Math.cos(person.angle);
        const py = person.by + person.radius * Math.sin(person.angle);
        const pz = 1.0;

        const headProj = project3D(px, py, pz + 1.2, w, h, angle, pitch, camZ);
        const feetProj = project3D(px, py, 0, w, h, angle, pitch, camZ);

        if (headProj && feetProj) {
          const height2D = Math.max(feetProj.y - headProj.y, 4);
          const pulse = (Math.sin(Date.now() * 0.007 + person.angle) + 1) / 2;
          const bodyColor = person.isSubject
            ? `rgba(255,26,46,${0.8 + pulse * 0.2})`
            : `rgba(255,170,0,${0.7 + pulse * 0.2})`;

          // Thermal core glow
          const grad = ctx.createRadialGradient(headProj.x, headProj.y + height2D * 0.4, 0, headProj.x, headProj.y + height2D * 0.4, height2D * 0.8);
          grad.addColorStop(0, bodyColor);
          grad.addColorStop(1, 'transparent');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.ellipse(headProj.x, headProj.y + height2D * 0.4, height2D * 0.55, height2D * 0.8, 0, 0, Math.PI * 2);
          ctx.fill();

          if (viewMode === 'drone') {
            const bs = Math.max(8, height2D * 0.9);
            ctx.strokeStyle = bodyColor;
            ctx.lineWidth = 0.75;
            ctx.beginPath();
            ctx.moveTo(headProj.x - bs, headProj.y - bs/2);
            ctx.lineTo(headProj.x - bs, headProj.y - bs); ctx.lineTo(headProj.x - bs/2, headProj.y - bs);
            ctx.moveTo(headProj.x + bs/2, headProj.y - bs);
            ctx.lineTo(headProj.x + bs, headProj.y - bs); ctx.lineTo(headProj.x + bs, headProj.y - bs/2);
            ctx.moveTo(headProj.x - bs, feetProj.y + bs/2);
            ctx.lineTo(headProj.x - bs, feetProj.y + bs); ctx.lineTo(headProj.x - bs/2, feetProj.y + bs);
            ctx.moveTo(headProj.x + bs/2, feetProj.y + bs);
            ctx.lineTo(headProj.x + bs, feetProj.y + bs); ctx.lineTo(headProj.x + bs, feetProj.y + bs/2);
            ctx.stroke();
            ctx.font = '5px "JetBrains Mono", monospace';
            ctx.fillStyle = bodyColor;
            ctx.fillText(person.label, headProj.x + bs + 3, headProj.y);
          }
        }
      });

      // ── TARGET CROSSHAIR ─────────────────────────────────────────
      const pulse = (Math.sin(Date.now() * 0.003) + 1) / 2;
      const crossColor = phase === 'engagement' || phase === 'impact'
        ? `rgba(255,26,46,${0.6 + pulse * 0.4})`
        : phase === 'alert_threshold' || phase === 'authorized'
        ? `rgba(255,170,0,${0.7 + pulse * 0.3})`
        : spectralMode
        ? `rgba(0,255,149,${0.5 + pulse * 0.5})`
        : `rgba(0,212,126,${0.45 + pulse * 0.4})`;

      ctx.strokeStyle = crossColor;
      ctx.lineWidth = 1;
      for (let i = 1; i <= 2; i++) {
        ctx.beginPath();
        ctx.arc(cx, cy, 25 * i, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(cx - 50, cy); ctx.lineTo(cx - 12, cy);
      ctx.moveTo(cx + 12, cy); ctx.lineTo(cx + 50, cy);
      ctx.moveTo(cx, cy - 50); ctx.lineTo(cx, cy - 12);
      ctx.moveTo(cx, cy + 12); ctx.lineTo(cx, cy + 50);
      ctx.stroke();

      if (viewMode === 'drone') {
        ctx.strokeStyle = crossColor;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(cx - 38, cy - 38, 76, 76);
        ctx.font = '8px "JetBrains Mono", monospace';
        ctx.fillStyle = crossColor;
        ctx.textAlign = 'center';
        ctx.fillText('TARGET LOCK ACQUIRED', cx, cy - 45);
        ctx.textAlign = 'left';
      }

      // ── DRONE VISUALS (Canvas mode) ───────────────────────────────
      const shouldShowDrones = phase === 'drone_dispatched' || phase === 'engagement' || phase === 'impact';
      if (shouldShowDrones) {
        droneEntry.current = Math.min(droneEntry.current + 0.006, 1.0);
        droneAngle.current = (droneAngle.current + 0.0008) % (Math.PI * 2);
        if (phase === 'engagement') droneSwoop.current = Math.min(droneSwoop.current + 0.005, 0.85);

        const da = droneAngle.current;
        const de = droneEntry.current;
        const ds = droneSwoop.current;

        const drones = [
          { startOffset: [0.045, -0.055], orbitR: 0.38, orbitS: 1.0, orbitO: 0, color: '#0096ff', label: 'ALPHA' },
          { startOffset: [-0.05, 0.048], orbitR: 0.26, orbitS: -0.85, orbitO: 2.1, color: '#ff1a2e', label: 'BETA' },
          { startOffset: [0.04, 0.052], orbitR: 0.52, orbitS: 0.65, orbitO: 4.2, color: '#ffaa00', label: 'GAMMA' },
        ];

        drones.forEach((dr, i) => {
          // In canvas space, "orbit" around center in screen coords
          const orbitAngle = da * dr.orbitS + dr.orbitO;
          const orbitDist = dr.orbitR * Math.min(w, h) * 0.28;
          const orbitX = cx + orbitDist * Math.cos(orbitAngle);
          const orbitY = cy + orbitDist * Math.sin(orbitAngle) * 0.5;

          const startX = cx + dr.startOffset[1] * w * 0.7;
          const startY = cy + dr.startOffset[0] * h * 0.7;

          let droneX = startX + (orbitX - startX) * de;
          let droneY = startY + (orbitY - startY) * de;

          if (ds > 0 && i === 1) {
            droneX += (cx - droneX) * ds * 0.7;
            droneY += (cy - droneY) * ds * 0.7;
          }

          const heading = Math.atan2(cy - droneY, cx - droneX) * (180 / Math.PI) + 90;
          const droneScale = 14;

          // Sensor cone
          drawSensorCone(ctx, droneX, droneY, cx, cy, dr.color);

          // Strike line during engagement
          if (phase === 'engagement') {
            ctx.save();
            ctx.globalAlpha = i === 1 ? 0.9 : 0.45;
            ctx.strokeStyle = '#ff1a2e';
            ctx.lineWidth = i === 1 ? 2.5 : 1.2;
            ctx.shadowColor = '#ff1a2e';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.moveTo(droneX, droneY);
            ctx.lineTo(cx, cy);
            ctx.stroke();
            ctx.restore();
          }

          // Draw MQ-9 silhouette
          drawDroneOnCanvas(ctx, droneX, droneY, droneScale, heading, dr.color);

          // Drone label
          ctx.font = '6px "JetBrains Mono", monospace';
          ctx.fillStyle = dr.color;
          ctx.fillText(`MQ-9 ${dr.label}`, droneX + droneScale + 4, droneY - 2);
        });
      } else {
        droneEntry.current = 0;
        droneSwoop.current = 0;
      }

      // ── IMPACT SHOCKWAVE ────────────────────────────────────────
      if (phase === 'impact') {
        const elapsed = (Date.now() % 2200) / 2200;
        const maxR = Math.min(w, h) * 0.42;
        ctx.strokeStyle = `rgba(255,26,46,${1 - elapsed})`;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#ff1a2e';
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.arc(cx, cy, elapsed * maxR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;

        const elapsed2 = ((Date.now() + 700) % 2200) / 2200;
        ctx.strokeStyle = `rgba(255,80,0,${0.6 * (1 - elapsed2)})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, elapsed2 * maxR * 0.85, 0, Math.PI * 2);
        ctx.stroke();

        if (elapsed < 0.07) {
          ctx.fillStyle = 'rgba(255,255,255,0.92)';
          ctx.fillRect(0, 0, w, h);
        }
      }

      // ── HUD TELEMETRY ─────────────────────────────────────────
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.fillStyle = spectralMode ? '#00ff95' : '#536878';
      if (activeScenario) {
        ctx.fillText(`LAT: ${activeScenario.location.lat.toFixed(5)}°N`, 15, 22);
        ctx.fillText(`LNG: ${activeScenario.location.lng.toFixed(5)}°E`, 15, 34);
        ctx.fillText(`PLATFORM: ${viewMode === 'drone' ? 'REAPER MQ-9 LOW-ALT' : 'ORBITAL SAT-8'}`, 15, 46);
        ctx.fillText(`ALT: ${viewMode === 'drone' ? '450m AGL' : '3,500m MSL'}`, 15, 58);
        ctx.fillText(`PHASE: ${phase.replace(/_/g, ' ').toUpperCase()}`, 15, 70);
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [phase, droneProgress, activeScenario, viewMode, spectralMode]);

  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  return (
    <div className="absolute inset-0">
      <canvas
        ref={canvasRef}
        className={clsx('w-full h-full block', className)}
        style={{ imageRendering: 'auto', width: '100%', height: '100%' }}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Google Maps 3D — unchanged
// ═══════════════════════════════════════════════════════════════════════════

function getTargetState(phase: string, scenarioId: string) {
  const defaultCoords = { lat: 15.3694, lng: 44.1918 };
  if (scenarioId !== 'pattern-of-life') return { coords: defaultCoords, isCar: false };
  switch (phase) {
    case 'idle': case 'scanning': case 'target_acquired':
      return { coords: { lat: 15.3694, lng: 44.1918 }, isCar: false };
    case 'tracking':
      return { coords: { lat: 15.3697, lng: 44.1915 }, isCar: false };
    case 'confidence_building':
      return { coords: { lat: 15.3700, lng: 44.1912 }, isCar: false };
    case 'alert_threshold': case 'authorization_pending': case 'authorized':
      return { coords: { lat: 15.3702, lng: 44.1908 }, isCar: true };
    case 'drone_dispatched':
      return { coords: { lat: 15.3700, lng: 44.1880 }, isCar: true };
    default:
      return { coords: { lat: 15.3698, lng: 44.1860 }, isCar: true };
  }
}

function GoogleMap3D({ className, onError }: { className?: string; onError?: () => void }) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const targetMarkerRef = useRef<any>(null);
  const droneMarkersRef = useRef<any[]>([]);
  const laserPolylinesRef = useRef<any[]>([]);
  const impactPolygonRef = useRef<any>(null);
  const screenFlashRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);
  const angleRef = useRef<number>(0);
  const entryProgressRef = useRef<number>(0);
  const swoopProgressRef = useRef<number>(0);
  const impactPulseRef = useRef<number>(0);
  const targetAnimRef = useRef<{ lat: number; lng: number }>({ lat: 0, lng: 0 });
  const prevPhaseRef = useRef<string>('idle');
  const apiLoadedRef = useRef(false);

  const { activeScenario, phase, viewMode, orbitActive } = useSimulationStore();
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scenarioId = activeScenario?.id ?? '';
  const { coords: targetCoords, isCar } = getTargetState(phase, scenarioId);

  useEffect(() => {
    if (apiLoadedRef.current) { setLoaded(true); return; }
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) { setError('no-key'); onError?.(); return; }
    if ((window as any).google?.maps?.maps3d) { apiLoadedRef.current = true; setLoaded(true); return; }
    if (document.getElementById('gmap3d-script')) {
      const check = setInterval(() => {
        if ((window as any).google?.maps) { apiLoadedRef.current = true; setLoaded(true); clearInterval(check); }
      }, 200);
      return () => clearInterval(check);
    }
    const script = document.createElement('script');
    script.id = 'gmap3d-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=alpha&libraries=maps3d`;
    script.async = true; script.defer = true;
    script.onload = () => { apiLoadedRef.current = true; setLoaded(true); };
    script.onerror = () => { setError('load-failed'); onError?.(); };
    document.head.appendChild(script);
  }, [onError]);

  useEffect(() => {
    if (!loaded || !mapContainerRef.current) return;
    const initMap = async () => {
      try {
        const google = (window as any).google;
        if (!google?.maps) { setError('init-failed'); onError?.(); return; }
        const { Map3DElement, Marker3DElement } = await google.maps.importLibrary('maps3d');
        if (mapRef.current && mapContainerRef.current) { mapContainerRef.current.innerHTML = ''; mapRef.current = null; }
        const scenario = activeScenario;
        const center = scenario?.location ?? { lat: 20, lng: 10, alt: 0 };
        const startRange = viewMode === 'drone' ? 600 : 1800;
        const startTilt = viewMode === 'drone' ? 68 : 52;
        const map = new Map3DElement({
          center: { lat: center.lat, lng: center.lng, altitude: 0 },
          tilt: startTilt, heading: scenario?.mapHeading ?? 15,
          range: startRange, minRange: 300, maxRange: 4500, minTilt: 35, maxTilt: 82,
        });
        (map as any).mode = 'SATELLITE';
        (map as any).defaultUIDisabled = true;
        mapContainerRef.current!.appendChild(map);
        mapRef.current = map;
        if (scenario) { targetAnimRef.current = { lat: scenario.location.lat, lng: scenario.location.lng }; }
        if (scenario) {
          const targetMarker = new Marker3DElement({ position: { lat: scenario.location.lat, lng: scenario.location.lng, altitude: 2 }, altitudeMode: 'RELATIVE_TO_GROUND', collisionBehavior: 'REQUIRED' });
          const tmpl = document.createElement('template');
          tmpl.innerHTML = `<div class="gmap3d-target-reticle"><div class="reticle-ring reticle-ring-outer"></div><div class="reticle-ring reticle-ring-inner"></div><div class="reticle-crosshair"></div><div class="reticle-dot"></div><div class="reticle-label">TARGET LOCK</div></div>`;
          targetMarker.append(tmpl.content.cloneNode(true));
          map.append(targetMarker);
          targetMarkerRef.current = targetMarker;
          setTimeout(() => {
            if (!mapRef.current) return;
            const targetRange = viewMode === 'drone' ? 480 : (scenario.mapRange ?? 900);
            const targetTilt = viewMode === 'drone' ? 68 : (scenario.mapTilt ?? 58);
            try { (mapRef.current as any).flyCameraTo({ endCamera: { center: { lat: scenario.location.lat, lng: scenario.location.lng, altitude: 0 }, tilt: targetTilt, heading: scenario.mapHeading ?? 15, range: targetRange }, durationMillis: 2500 }); } catch (_) {}
          }, 600);
        }
      } catch (e) { setError('init-failed'); onError?.(); }
    };
    initMap();
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      droneMarkersRef.current.forEach(m => { try { m?.remove(); } catch (_) {} });
      droneMarkersRef.current = [];
      laserPolylinesRef.current.forEach(l => { try { l?.remove(); } catch (_) {} });
      laserPolylinesRef.current = [];
      try { impactPolygonRef.current?.remove(); } catch (_) {}
    };
  }, [loaded, activeScenario]);

  useEffect(() => {
    if (!mapRef.current || !activeScenario) return;
    if (phase !== prevPhaseRef.current) {
      prevPhaseRef.current = phase;
      const loc = activeScenario.location;
      const baseH = activeScenario.mapHeading ?? 15;
      const cams: Record<string, any> = {
        scanning: { range: 1600, tilt: 40, heading: baseH },
        tracking: { range: 1100, tilt: 52, heading: baseH + 10 },
        confidence_building: { range: 1100, tilt: 52, heading: baseH + 10 },
        alert_threshold: { range: 850, tilt: 58, heading: baseH + 22 },
        authorization_pending: { range: 850, tilt: 58, heading: baseH + 22 },
        authorized: { range: 850, tilt: 58, heading: baseH + 22 },
        drone_dispatched: { range: 700, tilt: 62, heading: baseH + 38 },
        engagement: { range: 550, tilt: 72, heading: baseH + 55 },
        impact: { range: 500, tilt: 75, heading: baseH + 80 },
        assessment: { range: 1200, tilt: 45, heading: baseH + 110 },
      };
      const cam = cams[phase] ?? { range: 900, tilt: 52, heading: baseH };
      const { coords } = getTargetState(phase, scenarioId);
      try { mapRef.current.flyCameraTo({ endCamera: { center: { lat: coords.lat, lng: coords.lng, altitude: 0 }, tilt: cam.tilt, heading: cam.heading, range: cam.range }, durationMillis: phase === 'impact' ? 1500 : 3000 }); } catch (_) {}
    }
  }, [phase, activeScenario, viewMode, scenarioId]);

  if (error === 'no-key' || error === 'load-failed' || error === 'init-failed') return null;

  return (
    <div className={clsx('w-full h-full block relative', className)}>
      <div ref={mapContainerRef} className="w-full h-full block" style={{ minHeight: '100%' }} />
      <div ref={screenFlashRef} className="absolute inset-0 bg-white pointer-events-none z-[9999]" style={{ display: 'none', opacity: 0 }} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MASTER MAP3DVIEW COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function Map3DView({ className }: { className?: string }) {
  const [hasGoogleKey] = useState(() => !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);
  const [googleFailed, setGoogleFailed] = useState(false);
  const [spectralMode, setSpectralMode] = useState(false);
  const [mapSource, setMapSource] = useState<'google' | 'satellite' | 'canvas'>('satellite');
  const { setViewMode, activeScenario } = useSimulationStore();

  const handleSetMapSource = useCallback((src: 'google' | 'satellite' | 'canvas') => {
    setMapSource(src);
  }, []);

  return (
    <div className={clsx(
      'relative bg-[#0a1520] overflow-hidden flex-1 h-full transition-all duration-500 border border-terminal-border rounded',
      spectralMode && 'filter sepia(0.15) hue-rotate(85deg) brightness(1.1) contrast(1.15)',
      className
    )}>
      {mapSource === 'canvas' ? (
        <CanvasFallback spectralMode={spectralMode} />
      ) : mapSource === 'google' && !googleFailed ? (
        <GoogleMap3D onError={() => { setGoogleFailed(true); handleSetMapSource('satellite'); }} />
      ) : (
        <MapLibreSatellite
          onFallback={() => {
            console.warn('[LAWS-SIM] MapLibre tile watchdog fired — switching to canvas');
            handleSetMapSource('canvas');
          }}
        />
      )}

      {/* Tactical layers panel — always shown in satellite mode */}
      {mapSource === 'satellite' && (
        <TacticalLayersPanel />
      )}

      {/* Back to Hub button — top-left corner */}
      <button
        onClick={() => setViewMode('dashboard')}
        className="absolute top-3 left-3 z-20 flex items-center gap-1 px-2.5 py-1.5 rounded border font-mono text-[9px] font-black uppercase tracking-wider transition-all hover:border-terminal-blue hover:text-terminal-blue group"
        style={{
          background: 'rgba(5,8,14,0.88)',
          borderColor: 'rgba(0,150,255,0.35)',
          color: '#536878',
          backdropFilter: 'blur(8px)',
        }}
        title="Return to Command Hub"
      >
        <ChevronLeft className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" />
        {activeScenario ? activeScenario.title.substring(0, 20) + (activeScenario.title.length > 20 ? '…' : '') : 'COMMAND HUB'}
      </button>

      {/* HUD overlay */}
      <MapHUD
        spectralMode={spectralMode}
        setSpectralMode={setSpectralMode}
        mapSource={mapSource}
        setMapSource={handleSetMapSource}
        hasGoogleKey={hasGoogleKey}
        googleFailed={googleFailed}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAP HUD — interactive tactical telemetry overlay
// ═══════════════════════════════════════════════════════════════════════════

function MapHUD({
  spectralMode, setSpectralMode,
  mapSource, setMapSource,
  hasGoogleKey, googleFailed,
}: {
  spectralMode: boolean;
  setSpectralMode: (v: boolean) => void;
  mapSource: 'google' | 'satellite' | 'canvas';
  setMapSource: (s: 'google' | 'satellite' | 'canvas') => void;
  hasGoogleKey: boolean;
  googleFailed: boolean;
}) {
  const { phase, activeScenario, confidenceScore, viewMode, setViewMode, orbitActive, setOrbitActive } = useSimulationStore();
  const isAlert = phase === 'alert_threshold' || phase === 'engagement' || phase === 'impact';
  const hasActive = phase !== 'idle';

  return (
    <>
      {/* Top Left Diagnostics — z-20 so they sit above other overlays */}
      <div className="absolute top-3 left-3 font-mono text-[9px] text-terminal-text-dim space-y-0.5 pointer-events-none z-20" style={{ marginLeft: '0px', marginTop: '28px' }}>
        <div className="text-terminal-green font-bold flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-terminal-green rounded-full animate-pulse" />
          {hasActive ? 'ISR FEED ACTIVE' : 'SYSTEM STANDBY'}
        </div>
        {activeScenario && (
          <>
            <div>LAT: {activeScenario.location.lat.toFixed(5)}°N</div>
            <div>LNG: {activeScenario.location.lng.toFixed(5)}°E</div>
            <div className="text-terminal-blue font-bold uppercase">
              {viewMode === 'drone' ? 'PLATFORM: MQ-9 LOW RECON' : 'FEED: TACTICAL MAP'}
            </div>
          </>
        )}
      </div>

      {/* Top Right Confidence */}
      {hasActive && (
        <div className={clsx(
          'absolute top-3 right-3 font-mono text-[10px] px-2.5 py-1 rounded border z-10 pointer-events-none font-bold',
          confidenceScore >= 70
            ? 'bg-terminal-red-dim/80 border-terminal-red text-terminal-red'
            : confidenceScore >= 40
            ? 'bg-terminal-amber-dim/80 border-terminal-amber text-terminal-amber'
            : 'bg-terminal-green-dim/80 border-terminal-green text-terminal-green'
        )}>
          CONF: {confidenceScore.toFixed(0)}%
        </div>
      )}

      {/* Bottom Center Controls */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-terminal-panel/90 border border-terminal-border px-3 py-1.5 rounded shadow-2xl font-mono text-[9px] z-10 pointer-events-auto">
        {/* Map Source Switch */}
        <div className="flex items-center border border-terminal-border rounded overflow-hidden">
          {hasGoogleKey && !googleFailed && (
            <button
              onClick={() => setMapSource('google')}
              className={clsx(
                'px-2.5 py-1 font-bold uppercase transition-all',
                mapSource === 'google' ? 'bg-terminal-green text-terminal-bg' : 'text-terminal-text-dim hover:text-terminal-text'
              )}
              title="Google Maps Photorealistic 3D"
            >
              Google 3D
            </button>
          )}
          <button
            onClick={() => setMapSource('satellite')}
            className={clsx(
              'px-2.5 py-1 font-bold uppercase transition-all',
              hasGoogleKey && !googleFailed && 'border-l border-terminal-border',
              mapSource === 'satellite' ? 'bg-terminal-green text-terminal-bg' : 'text-terminal-text-dim hover:text-terminal-text'
            )}
            title="Satellite Tactical Feed (MapLibre)"
          >
            Satellite
          </button>
          <button
            onClick={() => setMapSource('canvas')}
            className={clsx(
              'px-2.5 py-1 font-bold uppercase transition-all border-l border-terminal-border',
              mapSource === 'canvas' ? 'bg-terminal-green text-terminal-bg' : 'text-terminal-text-dim hover:text-terminal-text'
            )}
            title="Tactical 3D Canvas"
          >
            Tactical 3D
          </button>
        </div>

        {/* View Zoom */}
        <div className="flex items-center border border-terminal-border rounded overflow-hidden">
          <button
            onClick={() => setViewMode('satellite')}
            className={clsx(
              'px-2.5 py-1 font-bold uppercase transition-all',
              viewMode === 'satellite' ? 'bg-terminal-blue text-terminal-bg' : 'text-terminal-text-dim hover:text-terminal-text'
            )}
          >
            Wide
          </button>
          <button
            onClick={() => setViewMode('drone')}
            className={clsx(
              'px-2.5 py-1 font-bold uppercase transition-all flex items-center gap-1 border-l border-terminal-border',
              viewMode === 'drone' ? 'bg-terminal-blue text-terminal-bg' : 'text-terminal-text-dim hover:text-terminal-text'
            )}
          >
            <ZoomIn className="w-3 h-3" /> Drone POV
          </button>
        </div>

        {/* Orbit Toggle */}
        <button
          onClick={() => setOrbitActive(!orbitActive)}
          className={clsx(
            'px-2.5 py-1 border rounded font-bold uppercase flex items-center gap-1 transition-all',
            orbitActive ? 'bg-terminal-green-dim border-terminal-green text-terminal-green' : 'border-terminal-border text-terminal-text-dim hover:text-terminal-text'
          )}
          title="Auto-Orbit"
        >
          <Orbit className={clsx('w-3.5 h-3.5', orbitActive && 'animate-spin')} style={{ animationDuration: '6s' }} /> Orbit
        </button>

        {/* Spectral Mode */}
        <button
          onClick={() => setSpectralMode(!spectralMode)}
          className={clsx(
            'px-2.5 py-1 border rounded font-bold uppercase flex items-center gap-1 transition-all',
            spectralMode ? 'bg-terminal-amber-dim border-terminal-amber text-terminal-amber' : 'border-terminal-border text-terminal-text-dim hover:text-terminal-text'
          )}
        >
          <Eye className="w-3.5 h-3.5" /> Spectral
        </button>
      </div>

      {/* Alert border flash */}
      {isAlert && (
        <div className="absolute inset-0 border-2 border-terminal-red pointer-events-none animate-pulse-red rounded-none" />
      )}

      {/* Bottom disclaimer */}
      <div className="absolute bottom-2 left-3 font-mono text-[7.5px] text-terminal-text-faint pointer-events-none uppercase tracking-widest">
        UN // STOP KILLER ROBOTS CAMPAIGN INCIDENT SIMULATOR v2.5.0
      </div>
    </>
  );
}
