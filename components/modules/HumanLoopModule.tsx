'use client';
import { useCallback, useRef } from 'react';
import { ModuleCanvas, drawHUDText, drawProgressBar } from './ModuleCanvas';

interface TargetFile { x: number; y: number; vy: number; approved: boolean; reviewTime: number; }
interface StopwatchState { timeLeft: number; active: boolean; approvedCount: number; }

export function HumanLoopModule() {
  const leftFiles = useRef<{ y: number; processed: boolean }[]>([]);
  const rightFiles = useRef<TargetFile[]>([]);
  const stopwatch = useRef<StopwatchState>({ timeLeft: 20, active: true, approvedCount: 0 });
  const waveformPhase = useRef(0);
  const approvalFlashT = useRef(-999);
  const initialized = useRef(false);

  const draw = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, t: number, dt: number) => {
    const panelY = 62;

    if (!initialized.current) {
      initialized.current = true;
      for (let i = 0; i < 6; i++) leftFiles.current.push({ y: panelY + 80 + i * 55, processed: false });
    }

    // Update stopwatch
    if (stopwatch.current.active) {
      stopwatch.current.timeLeft -= dt;
      if (stopwatch.current.timeLeft <= 0) {
        stopwatch.current.timeLeft = 20;
        stopwatch.current.approvedCount++;
        approvalFlashT.current = t;
      }
    }
    waveformPhase.current += dt * 12;

    const midX = w / 2;

    // ─── SPLIT DIVIDER ────────────────────────────────────────────
    ctx.strokeStyle = 'rgba(26, 37, 53, 0.6)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(midX, panelY + 20); ctx.lineTo(midX, h - 40); ctx.stroke();
    ctx.setLineDash([]);

    drawHUDText(ctx, 'HUMAN-IN-THE-LOOP', 16, panelY + 14, '#0096ff', 10);
    drawHUDText(ctx, 'AUTOMATED PIPELINE', midX + 16, panelY + 14, '#ff1a2e', 10);
    drawHUDText(ctx, '~50 TARGETS / YEAR', 16, panelY + 26, '#536878', 8);
    drawHUDText(ctx, '15,000 TARGETS / 35 DAYS', midX + 16, panelY + 26, '#ff1a2e', 8);

    // ─── LEFT: Manual Pipeline ────────────────────────────────────
    const leftW = midX - 32;

    // Analyst figure
    ctx.fillStyle = 'rgba(0, 150, 255, 0.15)';
    ctx.fillRect(24, panelY + 42, 60, 30);
    ctx.strokeStyle = '#0096ff';
    ctx.lineWidth = 1;
    ctx.strokeRect(24, panelY + 42, 60, 30);
    ctx.font = 'bold 8px "JetBrains Mono", monospace';
    ctx.fillStyle = '#0096ff';
    ctx.textAlign = 'center';
    ctx.fillText('ANALYST', 54, panelY + 60);
    ctx.textAlign = 'left';

    // Slow-drip folder files
    for (let i = 0; i < leftFiles.current.length; i++) {
      const lf = leftFiles.current[i];
      const fileX = 100;
      const fileY = lf.y;
      const progress = (t * 0.02) % 1; // Very slow processing

      ctx.fillStyle = 'rgba(0, 150, 255, 0.08)';
      ctx.fillRect(fileX, fileY, 80, 40);
      ctx.strokeStyle = 'rgba(0, 150, 255, 0.3)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(fileX, fileY, 80, 40);

      // Progress bar inside file
      drawProgressBar(ctx, fileX + 4, fileY + 26, 72, 4, (t * 0.018 + i * 0.16) % 1, '#0096ff');

      ctx.font = 'bold 7px "JetBrains Mono", monospace';
      ctx.fillStyle = '#536878';
      ctx.fillText(`FILE-${String(i + 1).padStart(3, '0')}`, fileX + 4, fileY + 14);
      ctx.font = '6px "JetBrains Mono", monospace';
      ctx.fillStyle = '#2a3a4a';
      ctx.fillText('UNDER REVIEW...', fileX + 4, fileY + 22);
    }

    // Manual velocity meter
    drawHUDText(ctx, 'PROCESSING VELOCITY', 16, h - 75, '#536878', 8);
    drawProgressBar(ctx, 16, h - 63, leftW, 6, 0.003, '#0096ff');
    drawHUDText(ctx, '0.14 TARGETS/DAY (MANUAL LIMIT)', 16, h - 50, '#0096ff', 8);

    // ─── RIGHT: Automated Cascade ─────────────────────────────────
    const rightX = midX + 16;
    const rightW2 = w - rightX - 16;

    // Spawn cascade files
    if (rightFiles.current.length < 60) {
      for (let s = 0; s < 3; s++) {
        rightFiles.current.push({
          x: rightX + Math.random() * (rightW2 - 80),
          y: panelY + 40,
          vy: 80 + Math.random() * 120,
          approved: Math.random() > 0.1,
          reviewTime: 0,
        });
      }
    }

    for (let i = rightFiles.current.length - 1; i >= 0; i--) {
      const rf = rightFiles.current[i];
      rf.y += rf.vy * dt;

      ctx.fillStyle = 'rgba(255, 26, 46, 0.12)';
      ctx.fillRect(rf.x, rf.y, 72, 32);
      ctx.strokeStyle = 'rgba(255, 26, 46, 0.4)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(rf.x, rf.y, 72, 32);

      ctx.font = 'bold 7px "JetBrains Mono", monospace';
      ctx.fillStyle = '#ff1a2e';
      ctx.fillText('APPROVED', rf.x + 4, rf.y + 13);
      ctx.font = '6px "JetBrains Mono", monospace';
      ctx.fillStyle = '#536878';
      ctx.fillText(`TGT-${Math.floor(Math.random() * 99999).toString().padStart(5, '0')}`, rf.x + 4, rf.y + 24);

      if (rf.y > h - 40) rightFiles.current.splice(i, 1);
    }

    // Velocity meter
    drawHUDText(ctx, 'PROCESSING VELOCITY', rightX, h - 75, '#536878', 8);
    drawProgressBar(ctx, rightX, h - 63, rightW2, 6, 1.0, '#ff1a2e');
    drawHUDText(ctx, '428 TARGETS/DAY (MACHINE PACE)', rightX, h - 50, '#ff1a2e', 8);

    // ─── CENTER BOTTOM: 20-Second Approver ───────────────────────
    const clockCX = midX;
    const clockCY = h - 140;
    const clockR = 35;

    // Clock face
    ctx.fillStyle = 'rgba(5, 5, 8, 0.95)';
    ctx.beginPath();
    ctx.arc(clockCX, clockCY, clockR + 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = stopwatch.current.timeLeft < 5 ? '#ff1a2e' : '#ffaa00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(clockCX, clockCY, clockR + 8, 0, Math.PI * 2);
    ctx.stroke();

    // Clock tick marks
    for (let m = 0; m < 20; m++) {
      const angle = (m / 20) * Math.PI * 2 - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(clockCX + Math.cos(angle) * (clockR + 2), clockCY + Math.sin(angle) * (clockR + 2));
      ctx.lineTo(clockCX + Math.cos(angle) * (clockR + 6), clockCY + Math.sin(angle) * (clockR + 6));
      ctx.strokeStyle = m < (20 - stopwatch.current.timeLeft) ? '#ff1a2e' : 'rgba(83, 104, 120, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Countdown hand
    const handAngle = ((20 - stopwatch.current.timeLeft) / 20) * Math.PI * 2 - Math.PI / 2;
    ctx.strokeStyle = stopwatch.current.timeLeft < 5 ? '#ff1a2e' : '#ffaa00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(clockCX, clockCY);
    ctx.lineTo(clockCX + Math.cos(handAngle) * clockR, clockCY + Math.sin(handAngle) * clockR);
    ctx.stroke();

    // Time text
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.fillStyle = stopwatch.current.timeLeft < 5 ? '#ff1a2e' : '#ffaa00';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.ceil(stopwatch.current.timeLeft)}s`, clockCX, clockCY + 4);
    ctx.textAlign = 'left';
    drawHUDText(ctx, '20-SEC REVIEW WINDOW', clockCX - 55, clockCY + clockR + 20, '#536878', 7);

    // ─── Waveform (voice log check) ───────────────────────────────
    const waveX = midX - 80;
    const waveY = clockCY + clockR + 30;
    const waveW = 160;
    const waveH = 20;

    ctx.strokeStyle = 'rgba(0, 212, 126, 0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let wx = 0; wx < waveW; wx++) {
      const wy = waveY + waveH / 2 + Math.sin(wx * 0.3 + waveformPhase.current) * (waveH / 2) * (0.3 + 0.7 * Math.random() * 0.3);
      if (wx === 0) ctx.moveTo(waveX + wx, wy);
      else ctx.lineTo(waveX + wx, wy);
    }
    ctx.stroke();
    drawHUDText(ctx, 'VOICE LOG CHECK', waveX, waveY + waveH + 12, '#00d47e', 7);

    // ─── Approval flash ───────────────────────────────────────────
    if (t - approvalFlashT.current < 0.4) {
      ctx.fillStyle = `rgba(255, 26, 46, ${0.6 - (t - approvalFlashT.current) * 1.5})`;
      ctx.fillRect(midX - 70, clockCY - 14, 140, 22);
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText('APPROVED', midX, clockCY + 4);
      ctx.textAlign = 'left';
    }

    // ─── Bypass Flow Diagram ──────────────────────────────────────
    const diagY = panelY + 30;
    const boxW = 90; const boxH = 22; const boxGap = 14;
    const boxes = ['AI PIPELINE', 'HUMAN VERIFY', 'TARGET APPROVED'];
    const boxColors = ['#0096ff', '#ffaa00', '#ff1a2e'];
    const totalW = boxes.length * boxW + (boxes.length - 1) * boxGap;
    const startBX = midX - totalW / 2;

    boxes.forEach((label, i) => {
      const bx = startBX + i * (boxW + boxGap);
      ctx.fillStyle = `rgba(${i === 0 ? '0,150,255' : i === 1 ? '255,170,0' : '255,26,46'}, 0.1)`;
      ctx.fillRect(bx, diagY, boxW, boxH);
      ctx.strokeStyle = boxColors[i];
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, diagY, boxW, boxH);
      ctx.font = 'bold 7px "JetBrains Mono", monospace';
      ctx.fillStyle = boxColors[i];
      ctx.textAlign = 'center';
      ctx.fillText(label, bx + boxW / 2, diagY + 14);
      ctx.textAlign = 'left';

      // Arrow to next
      if (i < boxes.length - 1) {
        const ax = bx + boxW;
        ctx.strokeStyle = 'rgba(83, 104, 120, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(ax, diagY + boxH / 2); ctx.lineTo(ax + boxGap, diagY + boxH / 2); ctx.stroke();
      }
    });

    // Bypass red arrow (AI → Approved, skipping verify)
    const bypassProgress = (t * 0.4) % 1;
    const bpStartX = startBX + boxW;
    const bpEndX = startBX + 2 * (boxW + boxGap);
    const bpY = diagY + boxH + 14;

    ctx.strokeStyle = 'rgba(255, 26, 46, 0.7)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(bpStartX, diagY + boxH);
    ctx.lineTo(bpStartX, bpY);
    ctx.lineTo(bpEndX, bpY);
    ctx.lineTo(bpEndX, diagY + boxH);
    ctx.stroke();

    // Animated dot on bypass
    const bpDotX = bpStartX + (bpEndX - bpStartX) * bypassProgress;
    ctx.beginPath();
    ctx.arc(bpDotX, bpY, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#ff1a2e';
    ctx.fill();

    ctx.font = 'bold 7px "JetBrains Mono", monospace';
    ctx.fillStyle = '#ff1a2e';
    ctx.textAlign = 'center';
    ctx.fillText('⚡ RUBBER STAMP BYPASS', midX, bpY + 14);
    ctx.textAlign = 'left';

    // ─── Bottom approved count ────────────────────────────────────
    drawHUDText(ctx, `APPROVED THIS SESSION: ${stopwatch.current.approvedCount}`, 16, h - 30, '#ff1a2e', 9);
    drawHUDText(ctx, `TIME PER TARGET: ~20s  //  COGNITIVE SATURATION: INEVITABLE`, midX - 180, h - 30, '#536878', 8);
  }, []);

  return (
    <ModuleCanvas
      title="HUMAN INTERFACE COMMAND LAYER — THE BOTTLENECK OVERRIDE"
      subtitle="Cognitive scaling degradation → rubber stamp approval → 20s review window per target"
      moduleId="MODULE 5 // HUMAN LOOP"
      draw={draw}
    />
  );
}
