'use client';
import { useCallback, useRef } from 'react';
import { ModuleCanvas, drawHUDText } from './ModuleCanvas';

interface TargetDot { x: number; y: number; phase: 'moving' | 'arrived' | 'struck'; pathProgress: number; pulseT: number; }
interface Debris { x: number; y: number; vx: number; vy: number; life: number; size: number; }

export function WheresDaddyModule() {
  const radarAngle = useRef(0);
  const radarBlips = useRef<{ x: number; y: number; a: number; intensity: number }[]>([]);
  const targetDot = useRef<TargetDot>({ x: 0, y: 0, phase: 'moving', pathProgress: 0, pulseT: 0 });
  const debris = useRef<Debris[]>([]);
  const alarmTriggered = useRef(false);
  const alarmT = useRef(0);
  const cycleT = useRef(0);
  const initialized = useRef(false);

  const draw = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, t: number, dt: number) => {
    const panelY = 62;

    // Cycle reset every 18 seconds
    const cycleDuration = 18;
    cycleT.current = t % cycleDuration;
    const ct = cycleT.current;

    if (!initialized.current || ct < 0.1) {
      initialized.current = true;
      alarmTriggered.current = false;
      alarmT.current = 0;
      debris.current = [];
      radarBlips.current = [];
      for (let i = 0; i < 8; i++) {
        radarBlips.current.push({ x: Math.random(), y: Math.random(), a: Math.random() * Math.PI * 2, intensity: 0.3 + Math.random() * 0.5 });
      }
    }

    // ─── LEFT: Radar Sweeper Panel ────────────────────────────────
    const radarSize = Math.min(w * 0.38, h * 0.55);
    const radarCX = 16 + radarSize / 2;
    const radarCY = panelY + 24 + radarSize / 2;
    radarAngle.current += dt * 1.4; // ~0.22 revolutions/sec

    // Radar background
    ctx.fillStyle = 'rgba(0, 20, 8, 0.9)';
    ctx.beginPath();
    ctx.arc(radarCX, radarCY, radarSize / 2, 0, Math.PI * 2);
    ctx.fill();

    // Radar rings
    for (let ring = 1; ring <= 4; ring++) {
      ctx.beginPath();
      ctx.arc(radarCX, radarCY, (radarSize / 2) * (ring / 4), 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0, 212, 126, 0.15)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // Crosshairs
    ctx.strokeStyle = 'rgba(0, 212, 126, 0.1)';
    ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(radarCX - radarSize / 2, radarCY); ctx.lineTo(radarCX + radarSize / 2, radarCY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(radarCX, radarCY - radarSize / 2); ctx.lineTo(radarCX, radarCY + radarSize / 2); ctx.stroke();

    // Sweep arc (fading trail)
    const sweepSteps = 20;
    for (let i = sweepSteps; i >= 0; i--) {
      const angle = radarAngle.current - (i / sweepSteps) * 1.2;
      const a = (1 - i / sweepSteps) * 0.5;
      ctx.fillStyle = `rgba(0, 212, 126, ${a * 0.15})`;
      ctx.beginPath();
      ctx.moveTo(radarCX, radarCY);
      ctx.arc(radarCX, radarCY, radarSize / 2, angle, angle + 1.2 / sweepSteps);
      ctx.closePath();
      ctx.fill();
    }

    // Sweep line
    ctx.strokeStyle = 'rgba(0, 212, 126, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(radarCX, radarCY);
    ctx.lineTo(radarCX + Math.cos(radarAngle.current) * radarSize / 2, radarCY + Math.sin(radarAngle.current) * radarSize / 2);
    ctx.stroke();

    // Blips
    for (const blip of radarBlips.current) {
      const bx = radarCX + (blip.x - 0.5) * radarSize * 0.85;
      const by = radarCY + (blip.y - 0.5) * radarSize * 0.85;
      // Only show blip recently swept
      const blipAngle = Math.atan2(by - radarCY, bx - radarCX);
      const angleDiff = ((radarAngle.current - blipAngle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      const fadedA = Math.max(0, blip.intensity * (1 - angleDiff / (Math.PI * 2)));
      if (fadedA > 0.05) {
        ctx.beginPath();
        ctx.arc(bx, by, 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 212, 126, ${fadedA})`;
        ctx.fill();
      }
    }

    // Target blip (brighter, red near threshold crossing)
    const targetAngle = Math.PI * 0.3;
    const targetR = radarSize * 0.25;
    const tbx = radarCX + Math.cos(targetAngle) * targetR;
    const tby = radarCY + Math.sin(targetAngle) * targetR;
    const targetBlipA = Math.max(0, 0.9 * (1 - ((radarAngle.current - targetAngle) % (Math.PI * 2)) / (Math.PI * 2)));
    ctx.beginPath();
    ctx.arc(tbx, tby, 4, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 26, 46, ${Math.max(0.2, targetBlipA)})`;
    ctx.fill();

    // Radar border
    ctx.beginPath();
    ctx.arc(radarCX, radarCY, radarSize / 2, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 212, 126, 0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Coord display
    drawHUDText(ctx, 'GEOFENCE RADAR // LIVE COORDINATE TRACK', radarCX - radarSize / 2, panelY + 14, '#00d47e', 8);
    drawHUDText(ctx, `SWEEP ANGLE: ${((radarAngle.current * 180 / Math.PI) % 360).toFixed(1)}°`, radarCX - radarSize / 2, radarCY + radarSize / 2 + 14, '#536878', 7);

    // ─── RIGHT: Geofence Street Track ────────────────────────────
    const trackX = 16 + radarSize + 16;
    const trackW = w - trackX - 16;
    const trackY = panelY + 24;
    const trackH = h - trackY - 80;
    drawHUDText(ctx, 'GEOFENCE TRACK // WHERE’S DADDY — REAL-TIME PROXIMITY ALERT', trackX, panelY + 14, '#ff1a2e', 10);

    // Street grid background
    ctx.fillStyle = 'rgba(5, 10, 8, 0.7)';
    ctx.fillRect(trackX, trackY, trackW, trackH);
    ctx.strokeStyle = 'rgba(0, 212, 126, 0.08)';
    ctx.lineWidth = 0.5;
    for (let gx = trackX; gx < trackX + trackW; gx += 24) {
      ctx.beginPath(); ctx.moveTo(gx, trackY); ctx.lineTo(gx, trackY + trackH); ctx.stroke();
    }
    for (let gy = trackY; gy < trackY + trackH; gy += 24) {
      ctx.beginPath(); ctx.moveTo(trackX, gy); ctx.lineTo(trackX + trackW, gy); ctx.stroke();
    }

    // Streets (horizontal and vertical)
    const streets = [{ axis: 'h', pos: 0.35 }, { axis: 'h', pos: 0.65 }, { axis: 'v', pos: 0.4 }, { axis: 'v', pos: 0.7 }];
    for (const s of streets) {
      ctx.fillStyle = 'rgba(0, 212, 126, 0.06)';
      if (s.axis === 'h') ctx.fillRect(trackX, trackY + trackH * s.pos - 8, trackW, 16);
      else ctx.fillRect(trackX + trackW * s.pos - 8, trackY, 16, trackH);
    }

    // House icon (target residence) — at 70% across, 35% down
    const houseX = trackX + trackW * 0.7;
    const houseY = trackY + trackH * 0.35;
    const houseW = 36;
    const houseH = 28;

    const isCollapsed = alarmTriggered.current && ct - alarmT.current > 2.5;
    const isAlarm = alarmTriggered.current && ct - alarmT.current < 2.5;

    if (isCollapsed) {
      // Collapsed state
      ctx.fillStyle = 'rgba(255, 26, 46, 0.3)';
      ctx.fillRect(houseX - houseW / 2, houseY + houseH * 0.5, houseW, houseH * 0.5);
      // Debris
      if (debris.current.length < 30 && ct - alarmT.current < 3.0) {
        for (let d = 0; d < 3; d++) {
          debris.current.push({
            x: houseX + (Math.random() - 0.5) * houseW,
            y: houseY + houseH * 0.5,
            vx: (Math.random() - 0.5) * 60,
            vy: -40 - Math.random() * 60,
            life: 1.0,
            size: 1.5 + Math.random() * 2.5,
          });
        }
      }
      // Update debris
      for (const d of debris.current) {
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.vy += 120 * dt;
        d.life -= dt * 0.5;
        if (d.life > 0) {
          ctx.beginPath();
          ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 100, 26, ${d.life})`;
          ctx.fill();
        }
      }
      drawHUDText(ctx, 'STRIKE EXECUTED', houseX - 40, houseY + houseH + 16, '#ff1a2e', 9);
    } else {
      // Normal / alarm house
      const houseColor = isAlarm ? '#ff1a2e' : '#00d47e';
      // Roof
      ctx.fillStyle = isAlarm ? 'rgba(255, 26, 46, 0.2)' : 'rgba(0, 212, 126, 0.1)';
      ctx.beginPath();
      ctx.moveTo(houseX - houseW / 2 - 4, houseY);
      ctx.lineTo(houseX, houseY - houseH * 0.4);
      ctx.lineTo(houseX + houseW / 2 + 4, houseY);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = houseColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Body
      ctx.fillStyle = isAlarm ? 'rgba(255, 26, 46, 0.15)' : 'rgba(0, 212, 126, 0.08)';
      ctx.fillRect(houseX - houseW / 2, houseY, houseW, houseH);
      ctx.strokeStyle = houseColor;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(houseX - houseW / 2, houseY, houseW, houseH);

      // Door
      ctx.fillStyle = isAlarm ? 'rgba(255, 26, 46, 0.4)' : 'rgba(0, 212, 126, 0.2)';
      ctx.fillRect(houseX - 6, houseY + houseH - 14, 12, 14);

      // Pulsing geofence ring
      if (!isCollapsed) {
        const pulseFactor = 1 + 0.15 * Math.sin(t * 3);
        ctx.beginPath();
        ctx.arc(houseX, houseY + houseH * 0.5, houseW * pulseFactor, 0, Math.PI * 2);
        ctx.strokeStyle = isAlarm ? 'rgba(255, 26, 46, 0.5)' : 'rgba(0, 212, 126, 0.25)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Target dot path — walks street then enters house
    const pathPoints = [
      { x: trackX + trackW * 0.05, y: trackY + trackH * 0.65 }, // start (left)
      { x: trackX + trackW * 0.4, y: trackY + trackH * 0.65 },  // walk right
      { x: trackX + trackW * 0.4, y: trackY + trackH * 0.35 },  // walk up
      { x: trackX + trackW * 0.7, y: trackY + trackH * 0.35 },  // walk right toward house
      { x: houseX, y: houseY + houseH * 0.5 },                   // enter house
    ];

    const totalSteps = pathPoints.length - 1;
    const walkDuration = 8; // seconds to traverse full path
    const pathProgress = Math.min(ct / walkDuration, 1.0);
    const segIdx = Math.min(Math.floor(pathProgress * totalSteps), totalSteps - 1);
    const segProgress = pathProgress * totalSteps - segIdx;

    const from = pathPoints[segIdx];
    const to = pathPoints[segIdx + 1] || pathPoints[totalSteps];
    const dotX = from.x + (to.x - from.x) * segProgress;
    const dotY = from.y + (to.y - from.y) * segProgress;

    // Draw path trail
    for (let pi = 0; pi < pathPoints.length - 1; pi++) {
      ctx.strokeStyle = 'rgba(0, 212, 126, 0.2)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(pathPoints[pi].x, pathPoints[pi].y);
      ctx.lineTo(pathPoints[pi + 1].x, pathPoints[pi + 1].y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Target entered house?
    if (pathProgress >= 0.92 && !alarmTriggered.current) {
      alarmTriggered.current = true;
      alarmT.current = ct;
    }

    // Draw target dot
    if (!isCollapsed || ct - alarmT.current < 0.5) {
      ctx.beginPath();
      ctx.arc(dotX, dotY, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#ff1a2e';
      ctx.fill();
      // Pulse ring
      const pr = 5 + 8 * Math.sin(t * 4);
      ctx.beginPath();
      ctx.arc(dotX, dotY, Math.abs(pr), 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 26, 46, 0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();
      drawHUDText(ctx, 'TARGET', dotX + 8, dotY - 2, '#ff1a2e', 7);
    }

    // ─── ALARM BANNER ─────────────────────────────────────────────
    if (isAlarm) {
      const blink = Math.floor(t * 4) % 2 === 0;
      if (blink) {
        ctx.fillStyle = 'rgba(255, 26, 46, 0.92)';
        ctx.fillRect(trackX, h - 75, trackW, 28);
        ctx.font = 'bold 13px "JetBrains Mono", monospace';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText('⚠  THRESHOLD CROSSED — TARGET AT FAMILY RESIDENCE  ⚠', trackX + trackW / 2, h - 56);
        ctx.textAlign = 'left';
      }
    }

    // ─── Bottom HUD ───────────────────────────────────────────────
    const hudY = h - 32;
    ctx.fillStyle = 'rgba(5, 5, 8, 0.9)';
    ctx.fillRect(0, hudY - 4, w, 36);
    ctx.strokeStyle = 'rgba(26, 37, 53, 0.5)';
    ctx.beginPath(); ctx.moveTo(0, hudY - 4); ctx.lineTo(w, hudY - 4); ctx.stroke();
    drawHUDText(ctx, `CYCLE: ${Math.floor(ct)}s / ${cycleDuration}s`, 16, hudY + 8, '#536878', 8);
    drawHUDText(ctx, `PATH PROGRESS: ${(pathProgress * 100).toFixed(0)}%`, 16, hudY + 20, '#00d47e', 8);
    drawHUDText(ctx, `THRESHOLD CROSSINGS DETECTED: ${alarmTriggered.current ? 1 : 0}`, w * 0.35, hudY + 8, '#ff1a2e', 8);
    drawHUDText(ctx, alarmTriggered.current && isCollapsed ? 'STRIKE EXECUTED // TARGET AT FAMILY RESIDENCE' : 'SUPPRESSED — TARGET NOT AT RESIDENCE', w * 0.35, hudY + 20, alarmTriggered.current ? '#ff1a2e' : '#536878', 8);
  }, []);

  return (
    <ModuleCanvas
      title="WHERE’S DADDY — REAL-TIME PROXIMITY ALERT SYSTEM"
      subtitle="Geofence tracking → residence threshold crossing → strike trigger"
      moduleId="MODULE 4 // PROXIMITY ALERT"
      draw={draw}
    />
  );
}
