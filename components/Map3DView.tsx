'use client';
import { useEffect, useRef, useState } from 'react';
import { useSimulationStore } from '@/store/simulation';
import { Compass, ZoomIn, Orbit, Eye, RefreshCw, Globe } from 'lucide-react';
import clsx from 'clsx';

interface Building3D {
  bx: number;
  by: number;
  bw: number;
  bd: number;
  bh: number;
  label: string;
  type: string;
}

const BUILDINGS_3D: Building3D[] = [
  { bx: 0, by: 0, bw: 32, bd: 28, bh: 18, label: 'PRIMARY RESIDENCE - SUBJECT ALPHA COMPOUND', type: 'target' },
  { bx: -45, by: 35, bw: 20, bd: 16, bh: 11, label: 'GUEST OUTBUILDING / STORAGE SHELTER', type: 'outbuilding' },
  { bx: 55, by: -45, bw: 26, bd: 22, bh: 13, label: 'CIVILIAN HOMESTEAD STRUCTURE', type: 'civilian' },
  { bx: -80, by: -75, bw: 45, bd: 35, bh: 20, label: 'CIVILIAN ASSEMBLY & MUNICIPAL COMPLEX', type: 'civilian_public' }
];

interface Vehicle3D {
  id: string;
  w: number;
  d: number;
  h: number;
  label: string;
  roadIndex: number;
  progress: number;
  speed: number;
}

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
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  heading: number,
  pitch: number,
  camZ: number
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
  return {
    x: w / 2 + rx * scale,
    y: h / 2 - rz * scale,
    scale: scale
  };
}

// Fallback canvas-based map with high-tech standby globe and target zooming
function CanvasFallback({ className, spectralMode }: { className?: string; spectralMode: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { phase, droneProgress, activeScenario, viewMode } = useSimulationStore();
  const animRef = useRef<number>(0);
  const rotationAngle = useRef<number>(0);

  // Smooth camera values for space-to-ground zoom plunge
  const currentZ = useRef<number>(12000000);
  const currentPitch = useRef<number>(0.15);

  // Moving vehicles state (persisted across frames)
  const vehiclesRef = useRef<Vehicle3D[]>([
    { id: 'v1', w: 9, d: 5, h: 5, label: 'LOGISTICS CELL CONVOY', roadIndex: 0, progress: -180, speed: 0.75 },
    { id: 'v2', w: 8, d: 4, h: 4, label: 'SECURITY MOBILE ESCORT', roadIndex: 0, progress: 10, speed: 0.6 },
    { id: 'v3', w: 8, d: 5, h: 4, label: 'CIVILIAN TRANSIT TRUCK', roadIndex: 1, progress: -210, speed: 0.8 }
  ]);

  // Moving people thermal heat signatures state (persisted across frames)
  const peopleRef = useRef<Person3D[]>([
    { id: 'p1', bx: 0, by: 0, radius: 8, label: 'SUBJECT ALPHA (TARGET - SIM 967-xx)', isSubject: true, angle: 0, speed: 0.015 },
    { id: 'p2', bx: 55, by: -45, radius: 6, label: 'CIVILIAN ADULT (NON-HOSTILE)', isSubject: false, angle: 2.1, speed: 0.012 },
    { id: 'p3', bx: 0, by: 0, radius: 15, label: 'COLLATERAL MINOR (CHILD)', isSubject: false, angle: 0.8, speed: 0.02 },
    { id: 'p4', bx: -45, by: 35, radius: 8, label: 'CIVILIAN ADULT (ASSESSED INDIGENOUS)', isSubject: false, angle: 4.3, speed: 0.01 },
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const w = canvas.offsetWidth || (canvas.width / (window.devicePixelRatio || 1));
      const h = canvas.offsetHeight || (canvas.height / (window.devicePixelRatio || 1));
      const cx = w / 2;
      const cy = h / 2;

      // Animate camera rotation heading
      rotationAngle.current = (rotationAngle.current + 0.003) % (Math.PI * 2);
      const angle = rotationAngle.current;

      // Base style
      ctx.fillStyle = spectralMode ? '#010f05' : '#050a12';
      ctx.fillRect(0, 0, w, h);

      // STANDBY STATE: Render rotating 3D vector wireframe globe
      if (!activeScenario || phase === 'idle') {
        // Reset camera positions so they teleport/reset when scenario is linked
        currentZ.current = 12000000;
        currentPitch.current = 0.15;

        const R = Math.min(w, h) * 0.28; // Globe Radius
        
        ctx.save();
        ctx.strokeStyle = spectralMode ? 'rgba(0, 255, 149, 0.2)' : 'rgba(0, 150, 255, 0.2)';
        ctx.lineWidth = 0.5;

        // Draw Outer Ring / Atmosphere Glow
        ctx.beginPath();
        ctx.arc(cx, cy, R + 4, 0, Math.PI * 2);
        ctx.strokeStyle = spectralMode ? 'rgba(0, 255, 149, 0.4)' : 'rgba(0, 150, 255, 0.3)';
        ctx.stroke();

        // Draw Horizontal Latitude Rings
        const numLats = 6;
        for (let i = 1; i < numLats; i++) {
          const latAngle = (i / numLats) * Math.PI;
          const latY = cy + R * Math.cos(latAngle);
          const latR = R * Math.sin(latAngle);
          
          ctx.beginPath();
          ctx.ellipse(cx, latY, latR, latR * 0.22, 0, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Draw Rotating Vertical Longitude Ellipses
        const numLongs = 8;
        for (let i = 0; i < numLongs; i++) {
          const longAngle = (i / numLongs) * Math.PI + angle;
          const ellipseWidth = R * Math.sin(longAngle);
          
          ctx.beginPath();
          ctx.ellipse(cx, cy, Math.abs(ellipseWidth), R, 0, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Circling Satellite Orbit Node
        const satAngle = angle * 1.5;
        const satX = cx + (R * 1.35) * Math.cos(satAngle);
        const satY = cy + (R * 0.3) * Math.sin(satAngle);

        // Satellite Path
        ctx.beginPath();
        ctx.ellipse(cx, cy, R * 1.35, R * 0.3, 0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 170, 0, 0.15)';
        ctx.stroke();

        // Satellite Node Dot
        ctx.fillStyle = '#ffaa00';
        ctx.beginPath();
        ctx.arc(satX, satY, 3, 0, Math.PI * 2);
        ctx.fill();

        // Tracking lock line from Sat to Earth
        ctx.strokeStyle = 'rgba(255, 170, 0, 0.35)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(satX, satY);
        ctx.lineTo(cx, cy);
        ctx.stroke();

        // Satellite ID overlay text
        ctx.font = '7.5px "JetBrains Mono", monospace';
        ctx.fillStyle = '#ffaa00';
        ctx.fillText('SAT-NODE-08 [TRACKING]', satX + 6, satY - 2);

        ctx.restore();

        // Standby Screen Prompts
        ctx.font = '10px "JetBrains Mono", Courier, monospace';
        ctx.fillStyle = spectralMode ? '#00ff95' : '#00d47e';
        ctx.textAlign = 'center';
        ctx.fillText('● STANDBY - WAITING FOR NOMINATION FEED', cx, cy + R + 30);
        ctx.fillStyle = '#536878';
        ctx.font = '8px "JetBrains Mono", Courier, monospace';
        ctx.fillText("select a scenario operation card in the 'Scenario Library' to link feed", cx, cy + R + 42);
        ctx.textAlign = 'left'; // reset
        
        animRef.current = requestAnimationFrame(draw);
        return;
      }

      // ACTIVE STATE: Zoom camera in cinematically if just started
      const targetZ = viewMode === 'drone' ? 88 : 280;
      const targetPitch = viewMode === 'drone' ? 0.98 : 0.40;

      if (currentZ.current > 2000) {
        // Deep-space trigger plunge
        currentZ.current = 1400;
        currentPitch.current = 0.22;
      }

      currentZ.current += (targetZ - currentZ.current) * 0.055;
      currentPitch.current += (targetPitch - currentPitch.current) * 0.055;

      const camZ = currentZ.current;
      const pitch = currentPitch.current;

      // Draw Ground Terrain Grid (satellite photorealistic emulation)
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

            // Procedural land tile colors
            let fillStyle = '';
            if (spectralMode) {
              fillStyle = (tx + ty) % 160 === 0 
                ? 'rgba(10, 35, 18, 0.4)' 
                : tx % 240 === 0
                ? 'rgba(25, 45, 20, 0.45)' 
                : 'rgba(5, 20, 8, 0.3)';
            } else {
              fillStyle = (tx + ty) % 160 === 0
                ? 'rgba(14, 25, 18, 0.65)' 
                : tx % 240 === 0
                ? 'rgba(24, 30, 42, 0.7)' 
                : 'rgba(18, 20, 26, 0.5)';
            }
            ctx.fillStyle = fillStyle;
            ctx.fill();

            ctx.strokeStyle = spectralMode ? 'rgba(0, 255, 149, 0.05)' : 'rgba(0, 150, 255, 0.04)';
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // Draw Roads in perspective
      const drawRoad = (xStart: number, xEnd: number, yStart: number, yEnd: number, width: number) => {
        const steps = 14;
        for (let i = 0; i < steps; i++) {
          const t0 = i / steps;
          const t1 = (i + 1) / steps;
          const x0 = xStart + (xEnd - xStart) * t0;
          const y0 = yStart + (yEnd - yStart) * t0;
          const x1 = xStart + (xEnd - xStart) * t1;
          const y1 = yStart + (yEnd - yStart) * t1;

          const perpX = -(yEnd - yStart);
          const perpY = xEnd - xStart;
          const len = Math.sqrt(perpX * perpX + perpY * perpY);
          const nx = (perpX / len) * (width / 2);
          const ny = (perpY / len) * (width / 2);

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
            
            ctx.fillStyle = spectralMode ? 'rgba(30, 48, 25, 0.7)' : 'rgba(8, 12, 18, 0.9)';
            ctx.fill();

            const mid0 = project3D(x0, y0, 0, w, h, angle, pitch, camZ);
            const mid1 = project3D(x1, y1, 0, w, h, angle, pitch, camZ);
            if (mid0 && mid1 && i % 2 === 0) {
              ctx.beginPath();
              ctx.moveTo(mid0.x, mid0.y);
              ctx.lineTo(mid1.x, mid1.y);
              ctx.strokeStyle = spectralMode ? 'rgba(0, 255, 149, 0.35)' : 'rgba(255, 255, 255, 0.2)';
              ctx.lineWidth = 1;
              ctx.stroke();
            }
          }
        }
      };

      drawRoad(-240, 240, 70, 70, 14); // Main Highway
      drawRoad(-90, -90, -240, 240, 14); // Grid Avenue

      // Draw 3D Buildings
      BUILDINGS_3D.forEach((b) => {
        const vertices = [
          { x: b.bx - b.bw/2, y: b.by - b.bd/2, z: 0 },
          { x: b.bx + b.bw/2, y: b.by - b.bd/2, z: 0 },
          { x: b.bx + b.bw/2, y: b.by + b.bd/2, z: 0 },
          { x: b.bx - b.bw/2, y: b.by + b.bd/2, z: 0 },
          { x: b.bx - b.bw/2, y: b.by - b.bd/2, z: b.bh },
          { x: b.bx + b.bw/2, y: b.by - b.bd/2, z: b.bh },
          { x: b.bx + b.bw/2, y: b.by + b.bd/2, z: b.bh },
          { x: b.bx - b.bw/2, y: b.by + b.bd/2, z: b.bh }
        ];

        const projected = vertices.map(v => project3D(v.x, v.y, v.z, w, h, angle, pitch, camZ));

        if (projected.every(v => v !== null)) {
          const p = projected as { x: number; y: number; scale: number }[];

          // Draw foundation base
          ctx.beginPath();
          ctx.moveTo(p[0].x, p[0].y);
          ctx.lineTo(p[1].x, p[1].y);
          ctx.lineTo(p[2].x, p[2].y);
          ctx.lineTo(p[3].x, p[3].y);
          ctx.closePath();
          ctx.fillStyle = spectralMode ? 'rgba(5, 20, 8, 0.5)' : 'rgba(5, 8, 12, 0.7)';
          ctx.fill();

          // Draw 4 walls
          const wallFaces = [
            [0, 1, 5, 4], // South
            [1, 2, 6, 5], // East
            [2, 3, 7, 6], // North
            [3, 0, 4, 7]  // West
          ];

          wallFaces.forEach((face) => {
            ctx.beginPath();
            ctx.moveTo(p[face[0]].x, p[face[0]].y);
            ctx.lineTo(p[face[1]].x, p[face[1]].y);
            ctx.lineTo(p[face[2]].x, p[face[2]].y);
            ctx.lineTo(p[face[3]].x, p[face[3]].y);
            ctx.closePath();

            const baseColor = b.type === 'target' 
              ? (spectralMode ? 'rgba(45, 12, 12, 0.65)' : 'rgba(52, 16, 22, 0.65)')
              : (spectralMode ? 'rgba(10, 32, 16, 0.65)' : 'rgba(15, 32, 52, 0.65)');
            
            ctx.fillStyle = baseColor;
            ctx.fill();

            ctx.strokeStyle = b.type === 'target'
              ? (spectralMode ? 'rgba(255, 60, 80, 0.75)' : 'rgba(255, 26, 46, 0.65)')
              : (spectralMode ? 'rgba(0, 255, 149, 0.55)' : 'rgba(0, 150, 255, 0.55)');
            ctx.lineWidth = 1;
            ctx.stroke();
          });

          // Draw Roof
          ctx.beginPath();
          ctx.moveTo(p[4].x, p[4].y);
          ctx.lineTo(p[5].x, p[5].y);
          ctx.lineTo(p[6].x, p[6].y);
          ctx.lineTo(p[7].x, p[7].y);
          ctx.closePath();
          ctx.fillStyle = spectralMode ? 'rgba(18, 50, 24, 0.8)' : 'rgba(26, 42, 62, 0.85)';
          ctx.fill();
          ctx.stroke();

          // Roof division crossbars
          ctx.beginPath();
          ctx.moveTo(p[4].x, p[4].y); ctx.lineTo(p[6].x, p[6].y);
          ctx.moveTo(p[5].x, p[5].y); ctx.lineTo(p[7].x, p[7].y);
          ctx.strokeStyle = spectralMode ? 'rgba(0, 255, 149, 0.35)' : 'rgba(0, 150, 255, 0.35)';
          ctx.lineWidth = 0.5;
          ctx.stroke();

          // structural telemetry leader in drone view
          if (viewMode === 'drone') {
            const rxCenter = (p[4].x + p[5].x + p[6].x + p[7].x) / 4;
            const ryCenter = (p[4].y + p[5].y + p[6].y + p[7].y) / 4;

            ctx.beginPath();
            ctx.moveTo(rxCenter, ryCenter);
            ctx.lineTo(rxCenter + 30, ryCenter - 25);
            ctx.strokeStyle = spectralMode ? '#00ff95' : '#0096ff';
            ctx.lineWidth = 0.5;
            ctx.stroke();

            ctx.font = '6.5px "JetBrains Mono", monospace';
            ctx.fillStyle = spectralMode ? '#00ff95' : '#0096ff';
            ctx.fillText(b.label, rxCenter + 33, ryCenter - 23);
          }
        }
      });

      // Update and Draw Moving 3D Vehicles (Convoys / Patrols)
      vehiclesRef.current.forEach((veh) => {
        veh.progress += veh.speed;
        if (veh.progress > 240) veh.progress = -240;

        let vx = 0;
        let vy = 0;
        if (veh.roadIndex === 0) {
          vx = veh.progress;
          vy = 70;
        } else {
          vx = -90;
          vy = -veh.progress;
        }

        const vw = veh.w;
        const vd = veh.d;
        const vh = veh.h;

        const vVertices = [
          { x: vx - vw/2, y: vy - vd/2, z: 0 },
          { x: vx + vw/2, y: vy - vd/2, z: 0 },
          { x: vx + vw/2, y: vy + vd/2, z: 0 },
          { x: vx - vw/2, y: vy + vd/2, z: 0 },
          { x: vx - vw/2, y: vy - vd/2, z: vh },
          { x: vx + vw/2, y: vy - vd/2, z: vh },
          { x: vx + vw/2, y: vy + vd/2, z: vh },
          { x: vx - vw/2, y: vy + vd/2, z: vh }
        ];

        const vProjected = vVertices.map(v => project3D(v.x, v.y, v.z, w, h, angle, pitch, camZ));

        if (vProjected.every(vp => vp !== null)) {
          const vp = vProjected as { x: number; y: number; scale: number }[];

          ctx.beginPath();
          ctx.moveTo(vp[0].x, vp[0].y);
          ctx.lineTo(vp[1].x, vp[1].y);
          ctx.lineTo(vp[2].x, vp[2].y);
          ctx.lineTo(vp[3].x, vp[3].y);
          ctx.closePath();
          ctx.fillStyle = spectralMode ? 'rgba(255, 170, 0, 0.45)' : 'rgba(255, 90, 0, 0.4)';
          ctx.fill();

          const vWallFaces = [
            [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]
          ];
          vWallFaces.forEach(face => {
            ctx.beginPath();
            ctx.moveTo(vp[face[0]].x, vp[face[0]].y);
            ctx.lineTo(vp[face[1]].x, vp[face[1]].y);
            ctx.lineTo(vp[face[2]].x, vp[face[2]].y);
            ctx.lineTo(vp[face[3]].x, vp[face[3]].y);
            ctx.closePath();
            ctx.fillStyle = spectralMode ? 'rgba(255, 170, 0, 0.7)' : 'rgba(255, 90, 0, 0.7)';
            ctx.fill();
            ctx.strokeStyle = spectralMode ? '#ffaa00' : '#ff5500';
            ctx.lineWidth = 0.5;
            ctx.stroke();
          });

          ctx.beginPath();
          ctx.moveTo(vp[4].x, vp[4].y);
          ctx.lineTo(vp[5].x, vp[5].y);
          ctx.lineTo(vp[6].x, vp[6].y);
          ctx.lineTo(vp[7].x, vp[7].y);
          ctx.closePath();
          ctx.fillStyle = spectralMode ? '#ffbb00' : '#ff7700';
          ctx.fill();
          ctx.stroke();

          if (viewMode === 'drone') {
            ctx.font = '5px "JetBrains Mono", monospace';
            ctx.fillStyle = spectralMode ? '#ffaa00' : '#ff5500';
            ctx.fillText(veh.label, vp[4].x + 6, vp[4].y - 2);
          }
        }
      });

      // Update and Draw Moving Human Thermal Signatures (People)
      peopleRef.current.forEach((person) => {
        person.angle += person.speed;
        
        let px = person.bx + person.radius * Math.cos(person.angle);
        let py = person.by + person.radius * Math.sin(person.angle);
        let pz = 1.0; 

        const headProj = project3D(px, py, pz + 1.2, w, h, angle, pitch, camZ);
        const feetProj = project3D(px, py, 0, w, h, angle, pitch, camZ);

        if (headProj && feetProj) {
          const height2D = feetProj.y - headProj.y;
          const pulse = (Math.sin(Date.now() * 0.007 + person.angle) + 1) / 2;
          const bodyColor = person.isSubject
            ? `rgba(255, 26, 46, ${0.75 + pulse * 0.25})` 
            : `rgba(255, 170, 0, ${0.7 + pulse * 0.2})`;

          // Draw humanoid thermal hotspot
          ctx.beginPath();
          ctx.arc(headProj.x, headProj.y + height2D * 0.2, Math.max(2, height2D * 0.35), 0, Math.PI * 2);
          ctx.arc(headProj.x, headProj.y + height2D * 0.6, Math.max(3, height2D * 0.45), 0, Math.PI * 2);
          ctx.fillStyle = bodyColor;
          ctx.fill();

          if (viewMode === 'drone') {
            const bracketSize = Math.max(6, height2D * 0.85);
            ctx.strokeStyle = bodyColor;
            ctx.lineWidth = 0.75;
            
            ctx.beginPath();
            // Top Left
            ctx.moveTo(headProj.x - bracketSize, headProj.y - bracketSize/2);
            ctx.lineTo(headProj.x - bracketSize, headProj.y - bracketSize);
            ctx.lineTo(headProj.x - bracketSize/2, headProj.y - bracketSize);
            // Top Right
            ctx.moveTo(headProj.x + bracketSize/2, headProj.y - bracketSize);
            ctx.lineTo(headProj.x + bracketSize, headProj.y - bracketSize);
            ctx.lineTo(headProj.x + bracketSize, headProj.y - bracketSize/2);
            // Bottom Left
            ctx.moveTo(headProj.x - bracketSize, feetProj.y + bracketSize/2);
            ctx.lineTo(headProj.x - bracketSize, feetProj.y + bracketSize);
            ctx.lineTo(headProj.x - bracketSize/2, feetProj.y + bracketSize);
            // Bottom Right
            ctx.moveTo(headProj.x + bracketSize/2, feetProj.y + bracketSize);
            ctx.lineTo(headProj.x + bracketSize, feetProj.y + bracketSize);
            ctx.lineTo(headProj.x + bracketSize, feetProj.y + bracketSize/2);
            ctx.stroke();

            ctx.font = '5px "JetBrains Mono", monospace';
            ctx.fillStyle = bodyColor;
            ctx.fillText(person.label, headProj.x + bracketSize + 3, headProj.y);
          }
        }
      });

      // Draw stationary HUD center brackets
      const isActive = true;
      if (isActive) {
        const pulse = (Math.sin(Date.now() * 0.003) + 1) / 2;
        const color = phase === 'engagement' || phase === 'impact'
          ? `rgba(255,26,46,${0.5 + pulse * 0.5})`
          : phase === 'alert_threshold' || phase === 'authorized'
          ? `rgba(255,170,0,${0.6 + pulse * 0.4})`
          : spectralMode
          ? `rgba(0,255,149,${0.5 + pulse * 0.5})`
          : `rgba(0,212,126,${0.4 + pulse * 0.4})`;

        // Target crosshair
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        
        for (let i = 1; i <= 2; i++) {
          ctx.beginPath();
          ctx.arc(cx, cy, 25 * i, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.moveTo(cx - 45, cy); ctx.lineTo(cx - 10, cy);
        ctx.moveTo(cx + 10, cy); ctx.lineTo(cx + 45, cy);
        ctx.moveTo(cx, cy - 45); ctx.lineTo(cx, cy - 10);
        ctx.moveTo(cx, cy + 10); ctx.lineTo(cx, cy + 45);
        ctx.stroke();

        if (viewMode === 'drone') {
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.5;
          ctx.strokeRect(cx - 35, cy - 35, 70, 70);
          ctx.fillStyle = color;
          ctx.font = '8px "JetBrains Mono", Courier, monospace';
          ctx.fillText('TARGET LOCK ACQUIRED', cx - 50, cy - 42);
        }
      }

      // Drone flight vector overlay
      if (phase === 'drone_dispatched' || phase === 'engagement') {
        const droneLat = 0.2 + droneProgress * 0.6;
        const droneLng = 0.25 + droneProgress * 0.5;
        const dx = droneLng * w;
        const dy = droneLat * h;

        ctx.fillStyle = '#0096ff';
        ctx.strokeStyle = '#0096ff';
        ctx.lineWidth = 1.5;

        ctx.save();
        ctx.translate(dx, dy);
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(5, 5);
        ctx.lineTo(-5, 5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        ctx.strokeStyle = 'rgba(255, 170, 0, 0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(dx, dy);
        ctx.lineTo(cx, cy);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Impact shockwave rings
      if (phase === 'impact') {
        const elapsed = (Date.now() % 2000) / 2000;
        ctx.strokeStyle = `rgba(255, 26, 46, ${1 - elapsed})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, elapsed * 180, 0, Math.PI * 2);
        ctx.stroke();

        if (elapsed < 0.08) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
          ctx.fillRect(0, 0, w, h);
        }
      }

      ctx.font = '9px "JetBrains Mono", Courier, monospace';
      ctx.fillStyle = spectralMode ? '#00ff95' : '#536878';
      if (activeScenario) {
        ctx.fillText(`TARGET LAT: ${activeScenario.location.lat.toFixed(5)}°N`, 15, 22);
        ctx.fillText(`TARGET LNG: ${activeScenario.location.lng.toFixed(5)}°E`, 15, 34);
        ctx.fillText(`SENSOR PLATFORM: ${viewMode === 'drone' ? 'REAPER DRONE LOW-ALT' : 'ORBITAL SAT FEED'}`, 15, 46);
        ctx.fillText(`ALTITUDE: ${viewMode === 'drone' ? '450m AGL' : '3,500m MSL'}`, 15, 58);
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
    <canvas
      ref={canvasRef}
      className={clsx('w-full h-full block', className)}
      style={{ imageRendering: 'pixelated' }}
    />
  );
}

// Dynamic Leaflet-based Google Satellite view component
function LeafletSatellite({ className }: { className?: string }) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const { activeScenario, viewMode } = useSimulationStore();
  const [loaded, setLoaded] = useState(false);

  // Dynamic injection of Leaflet CSS & JS to bypass Next.js SSR build errors
  useEffect(() => {
    if ((window as any).L) {
      setLoaded(true);
      return;
    }

    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => setLoaded(true);
    document.head.appendChild(script);
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!loaded || !mapContainerRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    // Remove any previous map instance to prevent double-inits
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const center = activeScenario?.location ?? { lat: 20, lng: 10 };
    const zoom = activeScenario ? (viewMode === 'drone' ? 18 : 16) : 3;

    const map = L.map(mapContainerRef.current, {
      center: [center.lat, center.lng],
      zoom: zoom,
      zoomControl: false,
      attributionControl: false,
    });

    // Use Google Satellite/Hybrid tile maps for maximum photorealism with labels
    L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    }).addTo(map);

    // Custom tactical 3D rotating scanner cube and target sweeps
    if (activeScenario) {
      const customIcon = L.divIcon({
        className: 'custom-gps-reticle',
        html: `<div style="position: relative; width: 100px; height: 100px; left: -50px; top: -50px; display: flex; align-items: center; justify-content: center; perspective: 600px; transform-style: preserve-3d;">
          <!-- 3D rotating cube target bounding box -->
          <div class="tactical-3d-scanner">
            <div class="tactical-3d-face" style="transform: translateZ(24px);"></div>
            <div class="tactical-3d-face" style="transform: translateZ(-24px) rotateY(180deg);"></div>
            <div class="tactical-3d-face" style="transform: rotateY(-90deg) translateZ(24px);"></div>
            <div class="tactical-3d-face" style="transform: rotateY(90deg) translateZ(24px);"></div>
            <div class="tactical-3d-face" style="transform: rotateX(90deg) translateZ(24px);"></div>
            <div class="tactical-3d-face" style="transform: rotateX(-90deg) translateZ(24px);"></div>
          </div>
          <!-- 2D pulsing radar rings for target lock visual sweeps -->
          <div style="position: absolute; width: 80px; height: 80px; border: 1.5px dashed rgba(255, 26, 46, 0.4); border-radius: 50%; animation: spin 10s linear infinite;"></div>
          <div style="position: absolute; width: 50px; height: 50px; border: 1px solid rgba(255, 26, 46, 0.6); border-radius: 50%; animation: ping 2s infinite;"></div>
          <div style="position: absolute; width: 10px; height: 10px; background-color: #ff1a2e; border-radius: 50%; box-shadow: 0 0 12px 4px #ff1a2e; animation: pulse 1s infinite;"></div>
        </div>`,
        iconSize: [100, 100]
      });

      const marker = L.marker([center.lat, center.lng], { icon: customIcon }).addTo(map);
      markerRef.current = marker;
    }

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [loaded, activeScenario]);

  // Handle dynamic map camera pan/zoom on updates
  useEffect(() => {
    if (!mapRef.current || !activeScenario) return;
    const center = activeScenario.location;
    const zoom = viewMode === 'drone' ? 18 : 16;
    mapRef.current.setView([center.lat, center.lng], zoom, { animate: true });
    
    if (markerRef.current) {
      markerRef.current.setLatLng([center.lat, center.lng]);
    }
  }, [viewMode, activeScenario]);

  return (
    <div
      ref={mapContainerRef}
      className={clsx('w-full h-full block bg-[#050a12]', className)}
    />
  );
}

// Google Maps 3D view component
function GoogleMap3D({ className, onError }: { className?: string; onError?: () => void }) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const { activeScenario, phase, viewMode, orbitActive } = useSimulationStore();
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load Google Maps API Key
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setError('no-key');
      onError?.();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=beta&libraries=maps3d`;
    script.async = true;
    script.defer = true;
    script.onload = () => setLoaded(true);
    script.onerror = () => {
      setError('load-failed');
      onError?.();
    };
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, [onError]);

  // Initialize Map
  useEffect(() => {
    if (!loaded || !mapContainerRef.current) return;

    const initMap = async () => {
      try {
        const { Map3DElement, Marker3DElement } = (window as any).google.maps.maps3d;
        
        // Standby Globe default parameters: center at Earth coordinates high in orbit
        const scenario = activeScenario;
        const center = scenario?.location ?? { lat: 20, lng: 10, alt: 0 };
        const initialRange = scenario ? (viewMode === 'drone' ? 480 : 3500) : 12000000; // 12,000 km space globe!
        const initialTilt = scenario ? (viewMode === 'drone' ? 62 : 25) : 10;

        const map = new Map3DElement({
          center: { lat: center.lat, lng: center.lng, altitude: center.alt ?? 0 },
          tilt: initialTilt,
          heading: scenario?.mapHeading ?? 0,
          range: initialRange,
        });

        mapContainerRef.current!.innerHTML = ''; // clean container
        mapContainerRef.current!.appendChild(map);
        mapRef.current = map;

        if (scenario) {
          const marker = new Marker3DElement({
            position: { lat: scenario.location.lat, lng: scenario.location.lng, altitude: 0 },
            label: 'COORDS LOCK',
          });
          map.appendChild(marker);
          markerRef.current = marker;
        }
      } catch (e) {
        setError('init-failed');
        onError?.();
      }
    };

    initMap();
  }, [loaded, activeScenario, onError]);

  // Cinematic deep-space zoom flies when scenario loaded or viewMode switches
  useEffect(() => {
    if (!mapRef.current) return;

    if (activeScenario) {
      const { location, mapHeading } = activeScenario;
      const targetRange = viewMode === 'drone' ? 480 : 3500;
      const targetTilt = viewMode === 'drone' ? 64 : 22;

      try {
        mapRef.current.flyCameraTo({
          endCamera: {
            center: { lat: location.lat, lng: location.lng, altitude: 0 },
            tilt: targetTilt,
            heading: mapRef.current.heading ?? mapHeading ?? 0,
            range: targetRange,
          },
          durationMilliseconds: 3500, // Cinematic 3.5s plunge
        });
      } catch (e) {}
    } else {
      // Return camera to orbital space view
      try {
        mapRef.current.flyCameraTo({
          endCamera: {
            center: { lat: 20, lng: 10, altitude: 0 },
            tilt: 10,
            heading: 0,
            range: 12000000,
          },
          durationMilliseconds: 2500,
        });
      } catch (e) {}
    }
  }, [viewMode, activeScenario]);

  // Autopilot Camera Orbit Rotation loop
  useEffect(() => {
    if (!mapRef.current || !orbitActive) return;

    let animId: number;
    const rotate = () => {
      if (mapRef.current) {
        mapRef.current.heading = (mapRef.current.heading + 0.12) % 360;
      }
      animId = requestAnimationFrame(rotate);
    };

    animId = requestAnimationFrame(rotate);
    return () => cancelAnimationFrame(animId);
  }, [orbitActive, loaded]);

  if (error === 'no-key' || error === 'load-failed' || error === 'init-failed') {
    return null;
  }

  return (
    <div
      ref={mapContainerRef}
      className={clsx('w-full h-full block', className)}
    />
  );
}

// Master Map3DView Component
export function Map3DView({ className }: { className?: string }) {
  const [hasGoogleKey] = useState(
    () => !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  );
  const [googleFailed, setGoogleFailed] = useState(false);
  const [spectralMode, setSpectralMode] = useState(false);
  const [mapSource, setMapSource] = useState<'google' | 'leaflet' | 'canvas'>('leaflet');

  return (
    <div className={clsx(
      'relative bg-[#0a1520] overflow-hidden flex-1 transition-all duration-500 border border-terminal-border rounded',
      spectralMode && 'filter sepia(0.2) hue-rotate(85deg) brightness(1.1) contrast(1.2)',
      className
    )}>
      {mapSource === 'canvas' ? (
        <CanvasFallback spectralMode={spectralMode} />
      ) : mapSource === 'google' && !googleFailed ? (
        <GoogleMap3D onError={() => {
          setGoogleFailed(true);
          setMapSource('leaflet');
        }} />
      ) : (
        <LeafletSatellite />
      )}
      
      {/* Dynamic Tactical Overlay HUD */}
      <MapHUD 
        spectralMode={spectralMode} 
        setSpectralMode={setSpectralMode} 
        mapSource={mapSource}
        setMapSource={setMapSource}
        hasGoogleKey={hasGoogleKey}
        googleFailed={googleFailed}
      />
    </div>
  );
}

// Interactive Map HUD Telemetry Overlay
function MapHUD({ 
  spectralMode, 
  setSpectralMode,
  mapSource,
  setMapSource,
  hasGoogleKey,
  googleFailed
}: { 
  spectralMode: boolean; 
  setSpectralMode: (v: boolean) => void;
  mapSource: 'google' | 'leaflet' | 'canvas';
  setMapSource: (s: 'google' | 'leaflet' | 'canvas') => void;
  hasGoogleKey: boolean;
  googleFailed: boolean;
}) {
  const { phase, activeScenario, confidenceScore, viewMode, setViewMode, orbitActive, setOrbitActive } = useSimulationStore();
  const isAlert = phase === 'alert_threshold' || phase === 'engagement' || phase === 'impact';
  const hasActive = phase !== 'idle';

  return (
    <>
      {/* Top Left Diagnostics HUD */}
      <div className="absolute top-3 left-3 font-mono text-[9px] text-terminal-text-dim space-y-0.5 pointer-events-none z-10">
        <div className="text-terminal-green font-bold flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-terminal-green rounded-full animate-pulse" />
          {hasActive ? 'ISR FEED ACTIVE' : 'SYSTEM STANDBY'}
        </div>
        {activeScenario && (
          <>
            <div>LAT: {activeScenario.location.lat.toFixed(5)}°N</div>
            <div>LNG: {activeScenario.location.lng.toFixed(5)}°E</div>
            <div className="text-terminal-blue font-bold uppercase">
              {viewMode === 'drone' ? 'PLATFORM: MQ-9 LOW RECON' : 'PLATFORM: ORBITAL SAT-8'}
            </div>
          </>
        )}
      </div>

      {/* Top Right Confidence telemetry */}
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

      {/* Bottom Center interactive controls */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-terminal-panel/90 border border-terminal-border px-3 py-1.5 rounded shadow-2xl font-mono text-[9px] z-10 pointer-events-auto">
          {/* Sensor Feed Switch */}
          <div className="flex items-center border border-terminal-border rounded overflow-hidden">
            {hasGoogleKey && !googleFailed && (
              <button
                onClick={() => setMapSource('google')}
                className={clsx(
                  'px-2.5 py-1 font-bold uppercase transition-all',
                  mapSource === 'google' ? 'bg-terminal-green text-terminal-bg' : 'text-terminal-text-dim hover:text-terminal-text'
                )}
                title="Google Maps Photorealistic 3D Tiles"
              >
                Google 3D
              </button>
            )}
            <button
              onClick={() => setMapSource('leaflet')}
              className={clsx(
                'px-2.5 py-1 font-bold uppercase transition-all',
                hasGoogleKey && !googleFailed && 'border-l border-terminal-border',
                mapSource === 'leaflet' ? 'bg-terminal-green text-terminal-bg' : 'text-terminal-text-dim hover:text-terminal-text'
              )}
              title="High-Resolution Satellite Feed"
            >
              Satellite
            </button>
            <button
              onClick={() => setMapSource('canvas')}
              className={clsx(
                'px-2.5 py-1 font-bold uppercase transition-all border-l border-terminal-border',
                mapSource === 'canvas' ? 'bg-terminal-green text-terminal-bg' : 'text-terminal-text-dim hover:text-terminal-text'
              )}
              title="Tactical Canvas 3D Emulation Feed"
            >
              Tactical 3D
            </button>
          </div>

          {/* Zoom Toggle */}
          <div className="flex items-center border border-terminal-border rounded overflow-hidden">
            <button
              onClick={() => setViewMode('satellite')}
              className={clsx(
                'px-2.5 py-1 font-bold uppercase transition-all',
                viewMode === 'satellite' ? 'bg-terminal-blue text-terminal-bg' : 'text-terminal-text-dim hover:text-terminal-text'
              )}
            >
              Satellite
            </button>
            <button
              onClick={() => setViewMode('drone')}
              className={clsx(
                'px-2.5 py-1 font-bold uppercase transition-all flex items-center gap-1 border-l border-terminal-border',
                viewMode === 'drone' ? 'bg-terminal-blue text-terminal-bg' : 'text-terminal-text-dim hover:text-terminal-text'
              )}
            >
              <ZoomIn className="w-3 h-3" /> Drone 3D
            </button>
          </div>

          {/* Autopilot Orbit Toggle */}
          <button
            onClick={() => setOrbitActive(!orbitActive)}
            className={clsx(
              'px-2.5 py-1 border rounded font-bold uppercase flex items-center gap-1 transition-all',
              orbitActive ? 'bg-terminal-green-dim border-terminal-green text-terminal-green' : 'border-terminal-border text-terminal-text-dim hover:text-terminal-text'
            )}
            title="Auto-Orbit Orbit around target"
          >
            <Orbit className={clsx('w-3.5 h-3.5', orbitActive && 'animate-spin')} style={{ animationDuration: '6s' }} /> Orbit
          </button>

          {/* Spectral Mode Toggle */}
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

      {/* Warning Flash Border */}
      {isAlert && (
        <div className="absolute inset-0 border border-terminal-red pointer-events-none animate-pulse-red rounded-none" />
      )}

      {/* Bottom disclaimer HUD text */}
      <div className="absolute bottom-2 left-3 font-mono text-[7.5px] text-terminal-text-faint pointer-events-none uppercase tracking-widest">
        UN // STOP KILLER ROBOTS CAMPAIGN INCIDENT SIMULATOR v2.4.1
      </div>
    </>
  );
}
