'use client';
import { useCallback, useRef } from 'react';
import { ModuleCanvas, drawHUDText, drawPersonIcon, drawProgressBar } from './ModuleCanvas';

interface ConveyorFile { x: number; stamped: boolean; stampT: number; }
interface PersonIcon { x: number; y: number; }

export function ComplianceModule() {
  const conveyorFiles = useRef<ConveyorFile[]>([]);
  const bellCurveProgress = useRef(0);
  const persons = useRef<PersonIcon[]>([]);
  const reticleRadius = useRef(0);
  const stampOffset = useRef(0);
  const initialized = useRef(false);

  const draw = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, t: number, dt: number) => {
    const panelY = 62;

    if (!initialized.current) {
      initialized.current = true;
      for (let i = 0; i < 20; i++) {
        conveyorFiles.current.push({ x: i * 70, stamped: false, stampT: -99 });
      }
      // Person crowd grid
      const cols = 14; const rows = 5;
      const crowdW = w * 0.45; const crowdH = 130;
      const crowdX = w * 0.52; const crowdY = h - 200;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          persons.current.push({
            x: crowdX + c * (crowdW / cols) + Math.random() * 8,
            y: crowdY + r * (crowdH / rows) + Math.random() * 6,
          });
        }
      }
    }

    bellCurveProgress.current = Math.min(bellCurveProgress.current + dt * 0.08, 1);
    stampOffset.current += dt * 55;
    reticleRadius.current = 20 + (t % 4) * 40;

    // ─── TOP: System vs Geneva Law Split UI ──────────────────────
    const splitH = h * 0.38;
    const midX = w / 2;

    // Section titles
    drawHUDText(ctx, 'LAVENDER SYSTEM', 16, panelY + 14, '#ff1a2e', 10);
    drawHUDText(ctx, 'GENEVA CONVENTIONS', midX + 16, panelY + 14, '#0096ff', 10);
    drawHUDText(ctx, 'PROBABILISTIC BATCH TARGETING', 16, panelY + 26, '#536878', 8);
    drawHUDText(ctx, 'ART. 50 — INDIVIDUALIZED ASSESSMENT', midX + 16, panelY + 26, '#536878', 8);

    // Divider
    ctx.strokeStyle = 'rgba(26, 37, 53, 0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(midX, panelY + 20); ctx.lineTo(midX, panelY + splitH + 10); ctx.stroke();
    ctx.setLineDash([]);

    // ─── LEFT: Bell Curve with error margin fill ──────────────────
    const curveX = 16;
    const curveY = panelY + splitH - 10;
    const curveW = midX - 48;
    const curveH = splitH - 70;

    // Draw bell curve
    ctx.beginPath();
    for (let px = 0; px <= curveW; px++) {
      const nx = (px / curveW - 0.5) * 6;
      const ny = Math.exp(-nx * nx / 2) / Math.sqrt(2 * Math.PI) * 2.5;
      if (px === 0) ctx.moveTo(curveX + px, curveY - ny * curveH);
      else ctx.lineTo(curveX + px, curveY - ny * curveH);
    }
    ctx.strokeStyle = '#ffaa00';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Error margin fill (right 10%)
    const errorStartX = curveX + curveW * 0.82;
    ctx.save();
    ctx.beginPath();
    for (let px = curveW * 0.82; px <= curveW; px++) {
      const nx = (px / curveW - 0.5) * 6;
      const ny = Math.exp(-nx * nx / 2) / Math.sqrt(2 * Math.PI) * 2.5;
      if (px === curveW * 0.82) ctx.moveTo(curveX + px, curveY);
      ctx.lineTo(curveX + px, curveY - ny * curveH);
    }
    ctx.lineTo(curveX + curveW, curveY);
    ctx.closePath();
    ctx.fillStyle = `rgba(255, 26, 46, ${bellCurveProgress.current * 0.6})`;
    ctx.fill();
    ctx.restore();

    // 10% label
    ctx.font = 'bold 8px "JetBrains Mono", monospace';
    ctx.fillStyle = '#ff1a2e';
    ctx.fillText('10% ERROR', errorStartX + 2, curveY - 30);
    ctx.font = '7px "JetBrains Mono", monospace';
    ctx.fillStyle = '#536878';
    ctx.fillText('NON-COMBATANTS', errorStartX - 5, curveY - 18);

    // Baseline
    ctx.strokeStyle = 'rgba(83, 104, 120, 0.3)';
    ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(curveX, curveY); ctx.lineTo(curveX + curveW, curveY); ctx.stroke();

    // Threshold line
    ctx.strokeStyle = 'rgba(255, 26, 46, 0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(errorStartX, curveY - curveH * 0.2); ctx.lineTo(errorStartX, curveY); ctx.stroke();
    ctx.setLineDash([]);

    // ─── RIGHT: Geneva Conventions Folder ────────────────────────
    const folderX = midX + 16;
    const folderY = panelY + 40;
    const folderW = w - folderX - 16;
    const folderH = splitH - 50;

    ctx.fillStyle = 'rgba(0, 150, 255, 0.05)';
    ctx.fillRect(folderX, folderY, folderW, folderH);
    ctx.strokeStyle = 'rgba(0, 150, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(folderX, folderY, folderW, folderH);

    // Folder tab
    ctx.fillStyle = 'rgba(0, 150, 255, 0.15)';
    ctx.fillRect(folderX, folderY - 12, 140, 12);
    ctx.font = 'bold 7px "JetBrains Mono", monospace';
    ctx.fillStyle = '#0096ff';
    ctx.fillText('GENEVA CONVENTION IV', folderX + 4, folderY - 2);

    // Law text lines
    const laws = [
      { text: '• Art. 50: Individualized Assessment', strikeout: false },
      { text: '• Presumption of Civilian Status', strikeout: false },
      { text: '• Positive Identification Required', strikeout: false },
      { text: '• Distinction: Combatant vs Civilian', strikeout: false },
    ];

    laws.forEach((law, i) => {
      const ly = folderY + 18 + i * 22;
      ctx.font = '8px "JetBrains Mono", monospace';
      ctx.fillStyle = law.strikeout ? '#2a3a4a' : '#ccd6e0';
      ctx.fillText(law.text, folderX + 8, ly);
    });

    // Red strikeout line (animated, grows over time)
    const strikeProgress = Math.min(t * 0.12, 1);
    if (strikeProgress > 0) {
      ctx.strokeStyle = '#ff1a2e';
      ctx.lineWidth = 2;
      const strikeY = folderY + 18 - 3;
      ctx.beginPath();
      ctx.moveTo(folderX + 8, strikeY);
      ctx.lineTo(folderX + 8 + (folderW - 16) * strikeProgress, strikeY);
      ctx.stroke();
      if (strikeProgress > 0.6) {
        ctx.font = 'bold 8px "JetBrains Mono", monospace';
        ctx.fillStyle = '#ff1a2e';
        ctx.fillText('⛔ SYSTEM OVERRIDE — COMPLIANCE BYPASSED', folderX + 8, folderY + 18 + 4 * 22);
      }
    }

    // ─── MIDDLE: Industrial Batch Stamping ────────────────────────
    const conveyorY = panelY + splitH + 20;
    const conveyorH = h * 0.22;
    const conveyorW = w - 32;

    drawHUDText(ctx, 'INDUSTRIAL BATCH APPROVAL — BATCH SIZE: UNLIMITED', 16, conveyorY - 8, '#ff1a2e', 9);

    // Conveyor belt
    ctx.fillStyle = 'rgba(13, 21, 32, 0.9)';
    ctx.fillRect(16, conveyorY, conveyorW, conveyorH);
    ctx.strokeStyle = 'rgba(26, 37, 53, 0.8)';
    ctx.lineWidth = 1;
    ctx.strokeRect(16, conveyorY, conveyorW, conveyorH);

    // Belt segments
    const beltSpeed = stampOffset.current % 40;
    for (let bx = -40 + beltSpeed; bx < conveyorW + 40; bx += 40) {
      ctx.strokeStyle = 'rgba(26, 37, 53, 0.4)';
      ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(16 + bx, conveyorY + conveyorH - 8); ctx.lineTo(16 + bx, conveyorY + conveyorH); ctx.stroke();
    }

    // Moving files on conveyor
    const fileW = 55; const fileH = conveyorH * 0.5;
    const fileGap = 80;
    for (let fi = 0; fi < 8; fi++) {
      const fx = 30 + (fi * fileGap - stampOffset.current % (fileGap * 8));
      if (fx < -fileW || fx > conveyorW + 32) continue;
      const fy = conveyorY + (conveyorH - fileH) / 2;

      ctx.fillStyle = 'rgba(255, 26, 46, 0.1)';
      ctx.fillRect(fx, fy, fileW, fileH);
      ctx.strokeStyle = 'rgba(255, 26, 46, 0.3)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(fx, fy, fileW, fileH);

      // Stamp overlay
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.fillStyle = 'rgba(255, 26, 46, 0.8)';
      ctx.save();
      ctx.translate(fx + fileW / 2, fy + fileH / 2);
      ctx.rotate(-0.2);
      ctx.strokeStyle = '#ff1a2e';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-18, -8, 36, 16);
      ctx.fillText('APPROVED', -18, 4);
      ctx.restore();
    }

    // Stamp arms (mechanical)
    const stampArms = [0.2, 0.5, 0.8];
    for (const pos of stampArms) {
      const sx = 16 + conveyorW * pos;
      const armCycle = (t * 2.5 + pos * 3) % 1;
      const armY = conveyorY + 8 + (armCycle < 0.4 ? armCycle * 0.5 * conveyorH : (1 - armCycle) * 0.8 * conveyorH * 0.6);
      ctx.fillStyle = 'rgba(83, 104, 120, 0.4)';
      ctx.fillRect(sx - 8, conveyorY - 2, 16, armY - conveyorY + 2);
      ctx.fillStyle = '#ffaa00';
      ctx.fillRect(sx - 12, armY, 24, 10);
      ctx.font = 'bold 5px "JetBrains Mono", monospace';
      ctx.fillStyle = '#050508';
      ctx.textAlign = 'center';
      ctx.fillText('STAMP', sx, armY + 8);
      ctx.textAlign = 'left';
    }

    // Batch counter
    const batchCount = Math.floor(t * 18);
    drawHUDText(ctx, `BATCH PROCESSED: ${batchCount.toLocaleString().padStart(6, '0')}`, 16, conveyorY + conveyorH + 14, '#ff1a2e', 9);
    drawHUDText(ctx, `INDIVIDUALLY REVIEWED: 000000`, w * 0.5, conveyorY + conveyorH + 14, '#0096ff', 9);

    // ─── BOTTOM: Area-Wide Reticle ────────────────────────────────
    const crowdBaseY = conveyorY + conveyorH + 32;
    drawHUDText(ctx, 'AREA-WIDE TARGETING — DISTINCTION PRINCIPLE VIOLATION', 16, crowdBaseY, '#ff1a2e', 9);

    // Crowd of person icons
    for (const p of persons.current) {
      const pY = crowdBaseY + 14 + (p.y - persons.current[0].y);
      // Thermal color based on reticle proximity
      const isInReticle = Math.hypot(p.x - w * 0.74, pY - (crowdBaseY + 65)) < reticleRadius.current;
      const color = isInReticle ? '#ff1a2e' : 'rgba(204, 214, 224, 0.4)';
      drawPersonIcon(ctx, p.x, pY, 7, color);
    }

    // Growing reticle crosshair
    const rCX = w * 0.74;
    const rCY = crowdBaseY + 65;
    const rR = Math.min(reticleRadius.current, 130);

    ctx.strokeStyle = `rgba(255, 26, 46, ${0.5 + 0.3 * Math.sin(t * 3)})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(rCX, rCY, rR, 0, Math.PI * 2);
    ctx.stroke();

    // Crosshair lines
    ctx.beginPath(); ctx.moveTo(rCX - rR, rCY); ctx.lineTo(rCX + rR, rCY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rCX, rCY - rR); ctx.lineTo(rCX, rCY + rR); ctx.stroke();

    // Thermal overlay
    const thermalR = rR * 0.85;
    const grad = ctx.createRadialGradient(rCX, rCY, 0, rCX, rCY, thermalR);
    grad.addColorStop(0, 'rgba(255, 80, 0, 0.35)');
    grad.addColorStop(0.5, 'rgba(255, 26, 46, 0.15)');
    grad.addColorStop(1, 'rgba(255, 26, 46, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(rCX, rCY, thermalR, 0, Math.PI * 2);
    ctx.fill();

    // Label
    const blink = Math.floor(t * 2) % 2 === 0;
    if (blink) {
      drawHUDText(ctx, `AREA WEAPON // DISTINCTION PRINCIPLE VIOLATED`, rCX - rR * 0.8, rCY + rR + 10, '#ff1a2e', 8);
    }
  }, []);

  return (
    <ModuleCanvas
      title="HUMANITARIAN COMPLIANCE ASSESSMENT PANEL"
      subtitle="Geneva Convention violations — batch processing, area targeting, individualized assessment bypassed"
      moduleId="MODULE 6 // COMPLIANCE"
      draw={draw}
    />
  );
}
