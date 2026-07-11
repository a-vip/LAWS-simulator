'use client';
import { useCallback, useRef, useState } from 'react';
import { ModuleCanvas, drawHUDText, drawPersonIcon, drawProgressBar } from './ModuleCanvas';

interface ProfileNode { x: number; y: number; score: number; targetScore: number; classified: boolean; flashT: number; }
interface HitZone { x: number; y: number; r: number; label: string; lines: string[]; col: string; }

const GRID_COLS = 20;
const GRID_ROWS = 12;
const THRESHOLD = 75;

const SOURCE_DESCS: Record<string, string[]> = {
  'COMMS LOGS':      ['Phone call metadata, IMEI tracking,', 'SIM card associations, location pings'],
  'VISUAL TRACKING': ['Facial recognition, movement patterns,', 'checkpoint crossings, drone footage'],
  'GEO MOVEMENT':    ['Home/work routines, mosque attendance,', 'geofence threshold crossings'],
  'SOCIAL NETWORK':  ['WhatsApp group memberships, contact', 'graphs, family/associate links'],
};

export function LavenderModule() {
  const profiles    = useRef<ProfileNode[]>([]);
  const initialized = useRef(false);
  const ledgerOffset = useRef(0);
  const hitZones    = useRef<HitZone[]>([]);

  const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string; lines: string[]; col: string } | null>(null);

  const draw = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, t: number, dt: number) => {
    const panelY = 62;
    hitZones.current = [];

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

    // ─── Central LAVENDER Matrix Label ────────────────────────────────────
    const matrixCX = w / 2;
    const matrixCY = panelY + 34;

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

    // Register LAVENDER box hit zone
    hitZones.current.push({
      x: matrixCX, y: matrixCY, r: 86,
      label: '◆ LAVENDER — IDF AI Profiling System',
      lines: [
        'Developed by Unit 8200, deployed Gaza 2023–24',
        'Assigns 1–100 threat scores to Palestinian men',
        'Threshold ≥75 → designated as strike target',
        'Trained on behavioural patterns, not individual acts',
        'Source: +972 Magazine / Local Call, April 2024',
      ],
      col: '#ffaa00',
    });

    // ─── Data source labels ────────────────────────────────────────────────
    const sources = ['COMMS LOGS', 'VISUAL TRACKING', 'GEO MOVEMENT', 'SOCIAL NETWORK'];
    sources.forEach((s, i) => {
      const sx = matrixCX - 200 + i * 110;
      const sy = matrixCY - 30;
      ctx.font = 'bold 7px "JetBrains Mono", monospace';
      ctx.fillStyle = '#0096ff';
      ctx.fillText(s, sx, sy);
      ctx.strokeStyle = 'rgba(0, 150, 255, 0.2)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(sx + 30, sy + 4);
      ctx.lineTo(matrixCX, matrixCY - 14);
      ctx.stroke();

      // Register source label hit zone
      hitZones.current.push({
        x: sx + 35, y: sy - 4, r: 40,
        label: `◈ DATA SOURCE — ${s}`,
        lines: SOURCE_DESCS[s] || ['Intelligence feed ingested by Lavender AI'],
        col: '#0096ff',
      });
    });

    // ─── Classification Tree Threads ──────────────────────────────────────
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

    // ─── Profile nodes ────────────────────────────────────────────────────
    let classifiedCount = 0;
    for (let i = 0; i < profiles.current.length; i++) {
      const p = profiles.current[i];

      if (i < activeProfiles) {
        const tickSpeed = 0.8 + Math.random() * 0.5;
        p.score = Math.min(p.score + p.targetScore * dt * tickSpeed, p.targetScore);
        if (p.score >= THRESHOLD && !p.classified) {
          p.classified = true;
          p.flashT = t;
        }
      }
      if (p.classified) classifiedCount++;

      const iconColor = p.classified
        ? '#ff1a2e'
        : (p.score > 0 ? `rgba(204, 190, 160, ${0.3 + p.score / 200})` : 'rgba(83, 104, 120, 0.2)');
      drawPersonIcon(ctx, p.x, p.y, 10, iconColor);

      if (p.classified && t - p.flashT < 0.5) {
        const flashR = (t - p.flashT) * 40;
        ctx.beginPath();
        ctx.arc(p.x, p.y, flashR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 26, 46, ${0.6 - (t - p.flashT)})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      if (p.score > 0) {
        ctx.font = 'bold 6px "JetBrains Mono", monospace';
        ctx.fillStyle = p.classified ? '#ff1a2e' : '#536878';
        ctx.textAlign = 'center';
        ctx.fillText(Math.floor(p.score).toString(), p.x, p.y - 14);
        ctx.textAlign = 'left';
      }

      // Register hit zone per profile
      if (i < activeProfiles) {
        hitZones.current.push({
          x: p.x, y: p.y, r: 13,
          label: p.classified
            ? `⚠ PROFILE #${String(i+1).padStart(4,'0')} — DESIGNATED TARGET`
            : `◌ PROFILE #${String(i+1).padStart(4,'0')} — UNDER ANALYSIS`,
          lines: [
            `Threat score: ${Math.floor(p.score)}/100 (threshold: ${THRESHOLD})`,
            p.classified
              ? 'Status: CLASSIFIED — added to strike list'
              : p.score >= 50 ? 'Status: HIGH RISK — approaching threshold'
              : 'Status: MONITORING — below threshold',
            'Assessed by: Lavender AI (no individual human review)',
            'Error rate: 10% — ~1 in 10 may be non-combatant',
            'Source: +972 Magazine investigation, April 2024',
          ],
          col: p.classified ? '#ff1a2e' : '#ffaa00',
        });
      }
    }

    // ─── Error Margin Stream (Bottom Panel) ───────────────────────────────
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

    // Server hit zone
    hitZones.current.push({
      x: 36, y: streamY + 19, r: 28,
      label: '🖥  LAVENDER DATABASE SERVER',
      lines: [
        'Centralized target list — 37,000 Palestinians',
        'Continuously updated as scores change',
        'Officers access list for strike authorization',
        '"Treated as fact" — AI errors rarely questioned',
        'No individual review of pattern-of-life data',
      ],
      col: '#ffaa00',
    });

    // Scrolling ledger
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

    drawHUDText(ctx, `AUTHORIZED TARGET DATABASE // 10% ERROR MARGIN`, ledgerX, streamY + 38, '#ff1a2e', 9);
    const errorCount = Math.floor(classifiedCount * 0.1);
    const blink = Math.sin(t * 4) > 0;
    if (blink) {
      drawHUDText(ctx, `⚠ 1 IN 10 TARGETS MAY BE NON-COMBATANT — EST. ${errorCount} FALSE POSITIVES`, ledgerX, streamY + 52, '#ffaa00', 8);
    }

    // ─── Right side stats ─────────────────────────────────────────────────
    drawHUDText(ctx, `PROFILES SCANNED: ${activeProfiles}/${profiles.current.length}`, w - 240, panelY + 12, '#0096ff', 8);
    drawHUDText(ctx, `THREATS CLASSIFIED: ${classifiedCount}`, w - 240, panelY + 24, '#ff1a2e', 8);
    drawHUDText(ctx, `THRESHOLD: ${THRESHOLD}/100`, w - 240, panelY + 36, '#ffaa00', 8);
    drawProgressBar(ctx, w - 240, panelY + 42, 180, 5, activeProfiles / profiles.current.length, '#0096ff');

    // Stats hit zones
    hitZones.current.push({
      x: w - 150, y: panelY + 16, r: 96,
      label: '📊 LAVENDER PROCESSING STATISTICS',
      lines: [
        `${activeProfiles} / ${profiles.current.length} total profiles scanned`,
        `${classifiedCount} designated as strike targets (score ≥ ${THRESHOLD})`,
        `Est. ${Math.floor(classifiedCount * 0.1)} false positives (10% error rate)`,
        'Total Gaza database: ~37,000 Palestinian men',
        'Officers spent <1 min reviewing each designation',
      ],
      col: '#0096ff',
    });
  }, []);

  // ── Mouse tooltip handler ───────────────────────────────────────────────────
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    let found: HitZone | null = null, minD = Infinity;
    for (const hz of hitZones.current) {
      const d = Math.sqrt((mx - hz.x) ** 2 + (my - hz.y) ** 2);
      if (d < hz.r && d < minD) { found = hz; minD = d; }
    }
    setTooltip(found ? { x: mx, y: my, label: found.label, lines: found.lines, col: found.col } : null);
  }, []);

  return (
    <div className="relative w-full h-full">
      <div
        className="absolute inset-0"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
      >
        <ModuleCanvas
          title="LAVENDER — OPERATIVE CLASSIFICATION NODE"
          subtitle="Mass surveillance profiling → probabilistic threat scoring → automated target designation"
          moduleId="MODULE 2 // LAVENDER"
          draw={draw}
        />
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute pointer-events-none z-50 font-mono"
          style={{ left: Math.min(tooltip.x + 14, window.innerWidth - 260), top: Math.max(70, tooltip.y - 92), maxWidth: 250 }}
        >
          <div style={{
            background:    'rgba(4,6,12,0.97)',
            border:        `1px solid ${tooltip.col}42`,
            borderLeft:    `2.5px solid ${tooltip.col}`,
            borderRadius:  6, padding: '8px 12px',
            boxShadow:     `0 12px 40px rgba(0,0,0,0.9), 0 0 14px ${tooltip.col}12`,
          }}>
            <div style={{ color: tooltip.col, fontWeight: 800, fontSize: 7.5, letterSpacing: '0.07em', marginBottom: 6 }}>
              {tooltip.label}
            </div>
            {tooltip.lines.map((l, i) => (
              <div key={i} style={{ color: '#8892a4', fontSize: 7, lineHeight: 1.65 }}>{l}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
