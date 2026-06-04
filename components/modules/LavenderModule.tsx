'use client';
import { useCallback, useRef } from 'react';
import { ModuleCanvas, drawHUDText, drawPersonIcon, drawProgressBar } from './ModuleCanvas';

interface ProfileNode { x: number; y: number; score: number; targetScore: number; classified: boolean; flashT: number; }
interface ThreadLine { fromX: number; fromY: number; toIdx: number; alpha: number; }

const GRID_COLS = 20;
const GRID_ROWS = 12;
const THRESHOLD = 75;

export function LavenderModule() {
  const profiles = useRef<ProfileNode[]>([]);
  const threads = useRef<ThreadLine[]>([]);
  const ledgerOffset = useRef(0);
  const initialized = useRef(false);

  const draw = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, t: number, dt: number) => {
    const panelY = 62;

    // Initialize grid of profiles
    if (!initialized.current) {
      initialized.current = true;
      const cellW = (w - 32) / GRID_COLS;
      const cellH = (h - panelY - 120) / GRID_ROWS;
      const startY = panelY + 80;

      for (let row = 0; row < GRID_ROWS; row++) {
        for (let col = 0; col < GRID_COLS; col++) {
          profiles.current.push({
            x: 16 + col * cellW + cellW / 2,
            y: startY + row * cellH + cellH / 2,
            score: 0,
            targetScore: Math.floor(Math.random() * 100) + 1,
            classified: false,
            flashT: 0,
          });
        }
      }
    }

    // ─── Central LAVENDER Matrix Label ────────────────────────────
    const matrixCX = w / 2;
    const matrixCY = panelY + 34;

    // Pulsing glow
    const glow = 0.3 + 0.15 * Math.sin(t * 2);
    ctx.fillStyle = `rgba(255, 170, 0, ${glow * 0.15})`;
    ctx.fillRect(matrixCX - 80, matrixCY - 14, 160, 28);
    ctx.strokeStyle = `rgba(255, 170, 0, ${glow})`;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(matrixCX - 80, matrixCY - 14, 160, 28);

    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.fillStyle = '#ffaa00';
    ctx.textAlign = 'center';
    ctx.fillText('◆ LAVENDER ◆', matrixCX, matrixCY + 4);
    ctx.textAlign = 'left';

    // Data source labels
    const sources = ['COMMS LOGS', 'VISUAL TRACKING', 'GEO MOVEMENT', 'SOCIAL NETWORK'];
    sources.forEach((s, i) => {
      const sx = matrixCX - 200 + i * 110;
      const sy = matrixCY - 30;
      ctx.font = 'bold 7px "JetBrains Mono", monospace';
      ctx.fillStyle = '#0096ff';
      ctx.fillText(s, sx, sy);
      // Line to center
      ctx.strokeStyle = 'rgba(0, 150, 255, 0.2)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(sx + 30, sy + 4);
      ctx.lineTo(matrixCX, matrixCY - 14);
      ctx.stroke();
    });

    // ─── Classification Tree Threads ──────────────────────────────
    // Animate threads branching from center to profiles
    const activeProfiles = Math.min(Math.floor(t * 15), profiles.current.length);

    for (let i = 0; i < activeProfiles; i++) {
      const p = profiles.current[i];
      const threadAlpha = Math.min((t - i * 0.066) * 0.3, 0.25);
      if (threadAlpha <= 0) continue;

      ctx.strokeStyle = p.classified
        ? `rgba(255, 26, 46, ${threadAlpha})`
        : `rgba(83, 104, 120, ${threadAlpha})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(matrixCX, matrixCY + 14);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }

    // ─── Dynamic Probability Ledger ───────────────────────────────
    let classifiedCount = 0;
    for (let i = 0; i < profiles.current.length; i++) {
      const p = profiles.current[i];

      // Animate score ticking up
      if (i < activeProfiles) {
        const tickSpeed = 0.8 + Math.random() * 0.5;
        p.score = Math.min(p.score + p.targetScore * dt * tickSpeed, p.targetScore);

        // Classification flash
        if (p.score >= THRESHOLD && !p.classified) {
          p.classified = true;
          p.flashT = t;
        }
      }

      if (p.classified) classifiedCount++;

      // Draw person icon
      const iconColor = p.classified
        ? '#ff1a2e'
        : (p.score > 0 ? `rgba(204, 190, 160, ${0.3 + p.score / 200})` : 'rgba(83, 104, 120, 0.2)');
      drawPersonIcon(ctx, p.x, p.y, 10, iconColor);

      // Classification flash effect
      if (p.classified && t - p.flashT < 0.5) {
        const flashR = (t - p.flashT) * 40;
        ctx.beginPath();
        ctx.arc(p.x, p.y, flashR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 26, 46, ${0.6 - (t - p.flashT)})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Score counter above head
      if (p.score > 0) {
        ctx.font = 'bold 6px "JetBrains Mono", monospace';
        ctx.fillStyle = p.classified ? '#ff1a2e' : '#536878';
        ctx.textAlign = 'center';
        ctx.fillText(Math.floor(p.score).toString(), p.x, p.y - 14);
        ctx.textAlign = 'left';
      }
    }

    // ─── Error Margin Stream (Bottom Panel) ──────────────────────
    const streamY = h - 70;
    ctx.fillStyle = 'rgba(5, 5, 8, 0.9)';
    ctx.fillRect(0, streamY - 4, w, 74);
    ctx.strokeStyle = 'rgba(255, 26, 46, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, streamY - 4); ctx.lineTo(w, streamY - 4); ctx.stroke();

    // Server icon
    ctx.fillStyle = 'rgba(255, 170, 0, 0.15)';
    ctx.fillRect(16, streamY + 4, 40, 30);
    ctx.strokeStyle = '#ffaa00';
    ctx.lineWidth = 1;
    ctx.strokeRect(16, streamY + 4, 40, 30);
    ctx.font = 'bold 7px "JetBrains Mono", monospace';
    ctx.fillStyle = '#ffaa00';
    ctx.fillText('SRV', 24, streamY + 22);

    // Scrolling ledger data
    ledgerOffset.current += dt * 80;
    const ledgerX = 70;
    ctx.save();
    ctx.beginPath();
    ctx.rect(ledgerX, streamY, w - ledgerX - 16, 44);
    ctx.clip();

    for (let i = 0; i < 12; i++) {
      const lx = ledgerX + i * 120 - (ledgerOffset.current % 120);
      ctx.strokeStyle = 'rgba(83, 104, 120, 0.3)';
      ctx.strokeRect(lx, streamY + 4, 110, 16);
      ctx.font = 'bold 7px "JetBrains Mono", monospace';
      ctx.fillStyle = '#ff1a2e';
      ctx.fillText(`TGT-${(i * 317 + Math.floor(ledgerOffset.current / 120) * 12).toString().padStart(5, '0')}`, lx + 4, streamY + 14);
    }
    ctx.restore();

    // Stats line
    drawHUDText(ctx, `AUTHORIZED TARGET DATABASE // 10% ERROR MARGIN`, ledgerX, streamY + 38, '#ff1a2e', 9);
    const errorCount = Math.floor(classifiedCount * 0.1);
    const blink = Math.sin(t * 4) > 0;
    if (blink) {
      drawHUDText(ctx, `⚠ 1 IN 10 TARGETS MAY BE NON-COMBATANT — EST. ${errorCount} FALSE POSITIVES`, ledgerX, streamY + 52, '#ffaa00', 8);
    }

    // ─── Right Side Stats ─────────────────────────────────────────
    drawHUDText(ctx, `PROFILES SCANNED: ${activeProfiles}/${profiles.current.length}`, w - 240, panelY + 12, '#0096ff', 8);
    drawHUDText(ctx, `THREATS CLASSIFIED: ${classifiedCount}`, w - 240, panelY + 24, '#ff1a2e', 8);
    drawHUDText(ctx, `THRESHOLD: ${THRESHOLD}/100`, w - 240, panelY + 36, '#ffaa00', 8);
    drawProgressBar(ctx, w - 240, panelY + 42, 180, 5, activeProfiles / profiles.current.length, '#0096ff');
  }, []);

  return (
    <ModuleCanvas
      title="LAVENDER — OPERATIVE CLASSIFICATION NODE"
      subtitle="Mass surveillance profiling → probabilistic threat scoring → automated target designation"
      moduleId="MODULE 2 // LAVENDER"
      draw={draw}
    />
  );
}
