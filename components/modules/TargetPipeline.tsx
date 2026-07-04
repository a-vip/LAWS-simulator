'use client';
import { useCallback, useRef, useState, useEffect } from 'react';
import { ModuleCanvas, drawHUDText, drawProgressBar } from './ModuleCanvas';
import { ExternalLink } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// AUTHORITATIVE DATA — from +972 Magazine Lavender investigation (Apr 2024)
//   & UN OCHA Gaza population data (2023)
// ─────────────────────────────────────────────────────────────────────────────
const GAZA_POPULATION     = 2_300_000; // UN OCHA 2023
const LAVENDER_TARGETS    = 37_000;    // +972 Magazine
const LAVENDER_DAYS       = 210;       // Oct 2023 → May 2024
const TARGETS_PER_DAY     = LAVENDER_TARGETS / LAVENDER_DAYS; // ≈ 176.2
const PROFILES_PER_DAY    = GAZA_POPULATION / LAVENDER_DAYS;  // ≈ 10,952
const SIM_OPERATIONAL_DAYS = 35;
const IRAQ_AREA_KM2       = 438_317;
const GAZA_AREA_KM2       = 365;

const SPEED_OPTIONS = [0.25, 0.5, 1, 2, 5, 10] as const;
type Speed = typeof SPEED_OPTIONS[number];

// ─────────────────────────────────────────────────────────────────────────────
// Funnel stage definitions
// ─────────────────────────────────────────────────────────────────────────────
const FUNNEL_STAGES = [
  { label: 'MASS INGESTION',        sublabel: '2.3M PROFILES', color: 'rgba(0,150,255,0.7)',   pct: 1.00 },
  { label: 'SIGNALS MATCHING',      sublabel: '~500K FLAGGED',  color: 'rgba(80,180,255,0.7)',  pct: 0.217 },
  { label: 'BEHAVIOURAL SCORING',   sublabel: '~50K SCORED',    color: 'rgba(255,170,0,0.7)',   pct: 0.022 },
  { label: 'AI CLASSIFICATION',     sublabel: '~37K TARGETS',   color: 'rgba(255,80,0,0.7)',    pct: 0.016 },
  { label: 'STRIKE AUTHORIZATION',  sublabel: '20-SEC REVIEW',  color: 'rgba(255,26,46,0.9)',   pct: 0.016 },
];

// ─────────────────────────────────────────────────────────────────────────────
// Target list entry
// ─────────────────────────────────────────────────────────────────────────────
interface TargetEntry { id: string; conf: number; status: 'CLASSIFIED' | 'FLAGGED' | 'REVIEWED'; day: number; }

function makeTargetId(n: number): string {
  return `TGT-${String(n).padStart(5, '0')}`;
}

function makeTarget(n: number, day: number): TargetEntry {
  const r = Math.random();
  const conf = 82 + Math.floor(Math.random() * 16); // 82–97%
  const status: TargetEntry['status'] = r < 0.72 ? 'CLASSIFIED' : r < 0.9 ? 'FLAGGED' : 'REVIEWED';
  return { id: makeTargetId(n), conf, status, day };
}

// Particle for funnel
interface FunnelParticle {
  x: number; y: number; vy: number; size: number; alpha: number;
  stage: number; // 0-4 matching FUNNEL_STAGES
}

// Density dot
interface DensityDot { x: number; y: number; radius: number; phase: number; }

export function TargetPipeline() {
  // ── React state for HTML overlay elements ──────────────────────────────
  const [speed, setSpeed] = useState<Speed>(1);
  const [targetList, setTargetList] = useState<TargetEntry[]>([]);
  const targetListRef = useRef<HTMLDivElement>(null);

  // ── Canvas animation refs ──────────────────────────────────────────────
  const speedRef = useRef<Speed>(1);
  const simTimeRef = useRef(0);       // accumulated sim-seconds (affected by speed)
  const lastRealTimeRef = useRef<number | null>(null);
  const funnelParticles = useRef<FunnelParticle[]>([]);
  const gazaDots = useRef<DensityDot[]>([]);
  const iraqDots = useRef<DensityDot[]>([]);
  const initialized = useRef(false);
  const targetCountRef = useRef(0);   // how many targets generated so far
  const targetListReactRef = useRef<TargetEntry[]>([]);

  // Keep speedRef in sync
  useEffect(() => { speedRef.current = speed; }, [speed]);

  // Scroll target list to bottom when new targets arrive
  useEffect(() => {
    if (targetListRef.current) {
      targetListRef.current.scrollTop = targetListRef.current.scrollHeight;
    }
  }, [targetList]);

  // ── Canvas draw callback ───────────────────────────────────────────────
  const draw = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, t: number, dt: number) => {
    // ── Sim-time accumulation (speed-scaled) ──────────────────────────
    const scaledDt = Math.min(dt, 0.1) * speedRef.current;
    simTimeRef.current += scaledDt;
    const simT = simTimeRef.current;

    // Day elapsed (0–35)
    const totalSimSeconds = SIM_OPERATIONAL_DAYS * (1 / speedRef.current) * 60; // 1 real-min per sim-day at 1×
    const dayElapsed = Math.min(simT / 60, SIM_OPERATIONAL_DAYS); // 1 real-second = 1 sim-day/60

    // Derived metrics (mathematically accurate)
    const profilesIngested = Math.min(Math.floor(dayElapsed * PROFILES_PER_DAY), GAZA_POPULATION);
    const targetsExpected  = Math.min(Math.floor(dayElapsed * TARGETS_PER_DAY), LAVENDER_TARGETS);

    // ── Init dots ────────────────────────────────────────────────────
    if (!initialized.current) {
      initialized.current = true;
      for (let i = 0; i < 110; i++) {
        iraqDots.current.push({ x: Math.random(), y: Math.random(), radius: 2 + Math.random() * 2.5, phase: Math.random() * Math.PI * 2 });
      }
    }

    // Grow Gaza dots to match targetsExpected
    while (gazaDots.current.length < Math.min(targetsExpected / 20, 1850)) {
      gazaDots.current.push({ x: Math.random(), y: Math.random(), radius: 1.5 + Math.random() * 2.5, phase: Math.random() * Math.PI * 2 });
    }

    // Push new target list entries to React state (throttled)
    if (targetsExpected > targetCountRef.current) {
      const newTargets: TargetEntry[] = [];
      const toAdd = Math.min(targetsExpected - targetCountRef.current, 8);
      for (let i = 0; i < toAdd; i++) {
        const entry = makeTarget(targetCountRef.current + i + 1, Math.floor(dayElapsed));
        newTargets.push(entry);
        targetListReactRef.current.push(entry);
      }
      targetCountRef.current = targetsExpected;
      // Keep list capped at last 120 entries
      if (targetListReactRef.current.length > 120) targetListReactRef.current = targetListReactRef.current.slice(-120);
      setTargetList([...targetListReactRef.current]);
    }

    // ─────────────────────────────────────────────────────────────────
    // LAYOUT
    // ─────────────────────────────────────────────────────────────────
    const panelY = 62;
    const panelH = h - panelY;
    const leftW = w * 0.38;
    const mapY = panelY + 20;
    const mapH = Math.min(panelH * 0.46, 240);

    // ─── LEFT: Theater Density Comparison ────────────────────────────
    drawHUDText(ctx, 'THEATER DENSITY MAPPING', 14, panelY + 13, '#0096ff', 9);

    // Iraq map
    const iraqX = 14;
    const iraqW = leftW * 0.46 - 8;
    ctx.strokeStyle = 'rgba(0, 212, 126, 0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(iraqX, mapY, iraqW, mapH);

    // Iraq label
    drawHUDText(ctx, `IRAQ`, iraqX + 4, mapY - 10, '#536878', 7);
    drawHUDText(ctx, `${IRAQ_AREA_KM2.toLocaleString()} km²`, iraqX + 4, mapY - 2, '#2a3a4a', 6);

    for (const dot of iraqDots.current) {
      const dx = iraqX + dot.x * iraqW;
      const dy = mapY + dot.y * mapH;
      const a = 0.25 + 0.15 * Math.sin(t * 1.8 + dot.phase);
      ctx.beginPath();
      ctx.arc(dx, dy, dot.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 212, 126, ${a})`;
      ctx.fill();
    }
    drawHUDText(ctx, `${iraqDots.current.length} TARGETS`, iraqX + 2, mapY + mapH + 12, '#00d47e', 8);

    // Gaza map
    const gazaX = iraqX + iraqW + 10;
    const gazaW = leftW * 0.48 - 6;
    ctx.strokeStyle = 'rgba(255, 26, 46, 0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(gazaX, mapY, gazaW, mapH);

    drawHUDText(ctx, `GAZA`, gazaX + 4, mapY - 10, '#536878', 7);
    drawHUDText(ctx, `${GAZA_AREA_KM2} km²`, gazaX + 4, mapY - 2, '#2a3a4a', 6);

    // Gaza dot density heat — gradient overlay
    if (gazaDots.current.length > 400) {
      const grd = ctx.createRadialGradient(gazaX + gazaW / 2, mapY + mapH * 0.6, 5, gazaX + gazaW / 2, mapY + mapH / 2, gazaW * 0.7);
      grd.addColorStop(0, 'rgba(255,26,46,0.12)');
      grd.addColorStop(1, 'rgba(255,26,46,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(gazaX, mapY, gazaW, mapH);
    }

    for (const dot of gazaDots.current) {
      const dx = gazaX + dot.x * gazaW;
      const dy = mapY + dot.y * mapH;
      const a = 0.15 + 0.12 * Math.sin(t * 1.4 + dot.phase);
      ctx.beginPath();
      ctx.arc(dx, dy, dot.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 26, 46, ${a})`;
      ctx.fill();
    }
    drawHUDText(ctx, `${gazaDots.current.length * 20} PROFILES`, gazaX + 2, mapY + mapH + 12, '#ff1a2e', 8);

    // Scale comparison label
    const scaleRatio = (IRAQ_AREA_KM2 / GAZA_AREA_KM2).toFixed(0);
    drawHUDText(ctx, `IRAQ IS ${scaleRatio}× LARGER THAN GAZA`, iraqX, mapY + mapH + 26, '#536878', 7);

    // Density saturation warning
    if (gazaDots.current.length > 900) {
      const blink = Math.sin(t * 2.5) > 0;
      if (blink) drawHUDText(ctx, '⚠ DENSITY SATURATION — LAVENDER TARGET THRESHOLD EXCEEDED', iraqX, mapY + mapH + 40, '#ff1a2e', 7);
    }

    // ─── LEFT BOTTOM: Timeline ────────────────────────────────────────
    const tlY = mapY + mapH + 56;
    drawHUDText(ctx, `${SIM_OPERATIONAL_DAYS}-DAY OPERATIONAL WINDOW`, 14, tlY, '#536878', 7);
    drawProgressBar(ctx, 14, tlY + 8, leftW - 28, 7, dayElapsed / SIM_OPERATIONAL_DAYS, '#ff1a2e');

    // Progress tick marks at 7-day intervals
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    for (let d = 7; d < SIM_OPERATIONAL_DAYS; d += 7) {
      const tx = 14 + (leftW - 28) * (d / SIM_OPERATIONAL_DAYS);
      ctx.beginPath(); ctx.moveTo(tx, tlY + 8); ctx.lineTo(tx, tlY + 15); ctx.stroke();
      drawHUDText(ctx, `${d}`, tx - 4, tlY + 24, '#2a3a4a', 6);
    }

    drawHUDText(ctx, `DAY ${dayElapsed.toFixed(1)} / ${SIM_OPERATIONAL_DAYS}`, 14, tlY + 32, '#ffaa00', 8);

    // Velocity metric
    const velocity = dayElapsed > 0.5 ? Math.round(targetsExpected / dayElapsed) : 0;
    drawHUDText(ctx, `${velocity} TARGETS/DAY  (LAVENDER ACTUAL: ~176/DAY)`, 14, tlY + 44, '#536878', 7);

    // ─────────────────────────────────────────────────────────────────
    // FUNNEL — POPULATION INGESTION PIPELINE
    // ─────────────────────────────────────────────────────────────────
    const funnelX = leftW + 14;
    const funnelW = w * 0.38;
    const funnelCX = funnelX + funnelW / 2;

    drawHUDText(ctx, 'POPULATION INGESTION FUNNEL', funnelX, panelY + 13, '#0096ff', 9);
    drawHUDText(ctx, `TOTAL DATABASE: ${GAZA_POPULATION.toLocaleString()} PROFILES  ·  SOURCE: +972 MAGAZINE / UN OCHA`, funnelX, panelY + 26, '#2a3a4a', 7);

    const funnelTop = panelY + 40;
    const funnelBot = h - 90;
    const funnelHeight = funnelBot - funnelTop;
    const funnelTopW = funnelW * 0.88;
    const funnelBotW = funnelW * 0.10;

    // Stage breakpoints along the funnel
    const stagePcts = [0, 0.2, 0.42, 0.65, 0.85, 1.0];

    // Funnel fill gradient (left side)
    const funnelGradL = ctx.createLinearGradient(0, funnelTop, 0, funnelBot);
    funnelGradL.addColorStop(0, 'rgba(0,150,255,0.05)');
    funnelGradL.addColorStop(0.4, 'rgba(255,170,0,0.08)');
    funnelGradL.addColorStop(0.8, 'rgba(255,80,0,0.12)');
    funnelGradL.addColorStop(1, 'rgba(255,26,46,0.18)');

    // Build funnel path (left wall + right wall + bottom)
    ctx.beginPath();
    ctx.moveTo(funnelCX - funnelTopW / 2, funnelTop);
    ctx.lineTo(funnelCX - funnelBotW / 2, funnelBot);
    ctx.lineTo(funnelCX + funnelBotW / 2, funnelBot);
    ctx.lineTo(funnelCX + funnelTopW / 2, funnelTop);
    ctx.closePath();
    ctx.fillStyle = funnelGradL;
    ctx.fill();

    // Stage dividers + labels inside funnel
    for (let si = 0; si < FUNNEL_STAGES.length; si++) {
      const stage = FUNNEL_STAGES[si];
      const pctY = stagePcts[si];
      const pctY2 = stagePcts[si + 1];
      const midPct = (pctY + pctY2) / 2;

      // Stage boundary line
      const lineY = funnelTop + funnelHeight * pctY;
      const lineW = funnelTopW + (funnelBotW - funnelTopW) * pctY;
      ctx.strokeStyle = stage.color.replace('0.7', '0.3').replace('0.9', '0.3');
      ctx.lineWidth = 0.8;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(funnelCX - lineW / 2, lineY);
      ctx.lineTo(funnelCX + lineW / 2, lineY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Label on right side of funnel
      const midY = funnelTop + funnelHeight * midPct;
      const midW = funnelTopW + (funnelBotW - funnelTopW) * midPct;
      const labelX = funnelCX + midW / 2 + 8;
      ctx.font = `bold 7px "JetBrains Mono", monospace`;
      ctx.fillStyle = stage.color;
      ctx.fillText(stage.label, labelX, midY - 4);
      ctx.font = `6px "JetBrains Mono", monospace`;
      ctx.fillStyle = 'rgba(150,170,190,0.6)';
      ctx.fillText(stage.sublabel, labelX, midY + 6);

      // Animated highlight bracket on left
      if (si < 4) {
        const animated = Math.sin(t * 1.5 + si * 0.8) > 0.2;
        if (animated) {
          const lx = funnelCX - midW / 2 - 6;
          ctx.strokeStyle = stage.color;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(lx, midY - 8);
          ctx.lineTo(lx - 4, midY);
          ctx.lineTo(lx, midY + 8);
          ctx.stroke();
        }
      }
    }

    // Funnel outline (on top of fill)
    const outlineGrad = ctx.createLinearGradient(0, funnelTop, 0, funnelBot);
    outlineGrad.addColorStop(0, 'rgba(0,150,255,0.5)');
    outlineGrad.addColorStop(0.6, 'rgba(255,100,0,0.5)');
    outlineGrad.addColorStop(1, 'rgba(255,26,46,0.8)');
    ctx.strokeStyle = outlineGrad;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(funnelCX - funnelTopW / 2, funnelTop);
    ctx.lineTo(funnelCX - funnelBotW / 2, funnelBot);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(funnelCX + funnelTopW / 2, funnelTop);
    ctx.lineTo(funnelCX + funnelBotW / 2, funnelBot);
    ctx.stroke();

    // Output neck glow
    const outGlow = Math.abs(Math.sin(t * 2));
    ctx.strokeStyle = `rgba(255,26,46,${0.4 + outGlow * 0.4})`;
    ctx.lineWidth = 2 + outGlow;
    ctx.beginPath();
    ctx.moveTo(funnelCX - funnelBotW / 2, funnelBot);
    ctx.lineTo(funnelCX + funnelBotW / 2, funnelBot);
    ctx.stroke();

    // ── PARTICLES ──────────────────────────────────────────────────────
    const MAX_PARTICLES = 600;
    // Spawn particles scaled to sim speed
    const spawnRate = Math.ceil(speedRef.current * 2);
    if (funnelParticles.current.length < MAX_PARTICLES) {
      for (let i = 0; i < spawnRate; i++) {
        funnelParticles.current.push({
          x: funnelCX + (Math.random() - 0.5) * funnelTopW * 0.88,
          y: funnelTop - 8 - Math.random() * 20,
          vy: (30 + Math.random() * 70) * speedRef.current,
          size: 1.2 + Math.random() * 1.8,
          alpha: 0.45 + Math.random() * 0.35,
          stage: 0,
        });
      }
    }

    for (let i = funnelParticles.current.length - 1; i >= 0; i--) {
      const p = funnelParticles.current[i];
      p.y += p.vy * scaledDt;

      const progress = (p.y - funnelTop) / funnelHeight;
      if (progress >= 0 && progress <= 1) {
        // Constrain to funnel walls
        const maxHalfW = (funnelTopW + (funnelBotW - funnelTopW) * progress) / 2;
        const distFromCenter = p.x - funnelCX;
        if (Math.abs(distFromCenter) > maxHalfW * 0.92) {
          p.x = funnelCX + Math.sign(distFromCenter) * maxHalfW * 0.85;
        }
        // Nudge toward center as falling
        p.x += (funnelCX - p.x) * 0.008;

        // Stage progression
        p.stage = Math.floor(progress / 0.22);
      }

      // Recycle
      if (p.y > funnelBot + 15) {
        p.y = funnelTop - 8 - Math.random() * 20;
        p.x = funnelCX + (Math.random() - 0.5) * funnelTopW * 0.88;
        p.stage = 0;
        p.vy = (30 + Math.random() * 70) * Math.max(speedRef.current, 0.5);
      }

      // Color by stage
      const stageColors = [
        `rgba(180,210,240,${p.alpha * 0.55})`,
        `rgba(100,180,255,${p.alpha * 0.7})`,
        `rgba(255,170,0,${p.alpha * 0.8})`,
        `rgba(255,80,0,${p.alpha * 0.9})`,
        `rgba(255,26,46,${p.alpha})`,
      ];
      const col = stageColors[Math.min(p.stage, 4)];

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size + (p.stage > 2 ? 0.5 : 0), 0, Math.PI * 2);
      ctx.fillStyle = col;
      ctx.fill();
    }

    // ── FUNNEL OUTPUT COUNTER ──────────────────────────────────────────
    const outY = funnelBot + 16;
    drawHUDText(ctx, 'TARGETS CLASSIFIED', funnelCX - 70, outY, '#536878', 7);
    ctx.font = 'bold 26px "JetBrains Mono", monospace';
    ctx.fillStyle = '#ff1a2e';
    ctx.fillText(targetsExpected.toLocaleString().padStart(6, ' '), funnelCX - 78, outY + 22);
    drawHUDText(ctx, `OF ${LAVENDER_TARGETS.toLocaleString()} TOTAL  ·  176 / DAY ACTUAL RATE`, funnelCX - 78, outY + 36, '#536878', 7);

    // ─────────────────────────────────────────────────────────────────
    // BOTTOM HUD BAR
    // ─────────────────────────────────────────────────────────────────
    const hudY = h - 28;
    ctx.fillStyle = 'rgba(5, 5, 8, 0.92)';
    ctx.fillRect(0, hudY - 8, w, 36);
    ctx.strokeStyle = 'rgba(26, 37, 53, 0.6)';
    ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(0, hudY - 8); ctx.lineTo(w, hudY - 8); ctx.stroke();

    drawHUDText(ctx, `PROFILES INGESTED: ${profilesIngested.toLocaleString()}`, 14, hudY + 7, '#0096ff', 9);
    drawHUDText(ctx, `TARGETS GENERATED: ${targetsExpected.toLocaleString()}`, w * 0.32, hudY + 7, '#ff1a2e', 9);
    drawHUDText(ctx, `OPERATIONAL DAY: ${dayElapsed.toFixed(1)} / ${SIM_OPERATIONAL_DAYS}`, w * 0.62, hudY + 7, '#ffaa00', 9);
  }, []);

  // ── RENDER: canvas + HTML overlays ──────────────────────────────────────
  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Canvas layer */}
      <div className="absolute inset-0">
        <ModuleCanvas
          title="HIGH-VOLUME TARGET GENERATION PIPELINE"
          subtitle="Automated mass surveillance data → target extraction at machine pace  ·  Based on Lavender AI system (Gaza, 2023–2024)"
          moduleId="MODULE 1 // TARGET PIPELINE"
          draw={draw}
        />
      </div>

      {/* ── TARGET LIST OVERLAY (right 22%) ──────────────────────────── */}
      <div
        className="absolute font-mono"
        style={{ top: 62, right: 8, width: '21%', bottom: 36, zIndex: 10 }}
      >
        <div className="h-full flex flex-col border border-terminal-border/40 rounded bg-[#050508]/80 backdrop-blur-sm overflow-hidden">
          {/* Header */}
          <div className="px-2 py-1.5 border-b border-terminal-border/40 flex justify-between items-center shrink-0">
            <span className="text-[8px] text-terminal-blue font-bold tracking-wider">TARGET LOG</span>
            <span className="text-[7px] text-terminal-text-faint">{targetList.length} ENTRIES</span>
          </div>
          {/* Scrolling list */}
          <div ref={targetListRef} className="flex-1 overflow-y-auto space-y-px p-1">
            {targetList.length === 0 ? (
              <div className="text-[7px] text-terminal-text-faint text-center mt-4 opacity-50">AWAITING DATA...</div>
            ) : (
              targetList.map((entry, i) => (
                <div
                  key={i}
                  className={`flex justify-between items-center px-1.5 py-0.5 rounded text-[7px] ${
                    entry.status === 'CLASSIFIED'
                      ? 'bg-terminal-red/8 border-l-2 border-terminal-red/60'
                      : entry.status === 'FLAGGED'
                      ? 'bg-terminal-amber/8 border-l-2 border-terminal-amber/50'
                      : 'border-l-2 border-terminal-text-faint/20'
                  }`}
                >
                  <span className="text-terminal-text-faint font-mono">{entry.id}</span>
                  <span className={
                    entry.status === 'CLASSIFIED' ? 'text-terminal-red font-bold' :
                    entry.status === 'FLAGGED' ? 'text-terminal-amber font-bold' :
                    'text-terminal-text-faint'
                  }>
                    {entry.conf}%
                  </span>
                </div>
              ))
            )}
          </div>
          {/* Footer */}
          <div className="px-2 py-1 border-t border-terminal-border/40 shrink-0">
            <div className="text-[6.5px] text-terminal-red/70 leading-tight">
              ~20s avg officer review (Lavender data)
            </div>
          </div>
        </div>
      </div>

      {/* ── SPEED CONTROLS OVERLAY (bottom-left) ─────────────────────── */}
      <div
        className="absolute font-mono flex items-center gap-1.5"
        style={{ bottom: 38, left: 14, zIndex: 10 }}
      >
        <span className="text-[7px] text-terminal-text-faint tracking-wider">SIM SPEED:</span>
        {SPEED_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setSpeed(s)}
            className={`px-1.5 py-0.5 rounded text-[7px] font-bold border transition-all ${
              speed === s
                ? 'bg-terminal-blue/20 border-terminal-blue text-terminal-blue'
                : 'border-terminal-border/40 text-terminal-text-faint hover:border-terminal-text-faint hover:text-terminal-text'
            }`}
          >
            {s}×
          </button>
        ))}
      </div>

      {/* ── SOURCE CITATIONS (bottom-right) ──────────────────────────── */}
      <div
        className="absolute font-mono text-right"
        style={{ bottom: 38, right: 8, zIndex: 10 }}
      >
        <div className="text-[6px] text-terminal-text-faint/60 space-y-0.5">
          <a href="https://www.972mag.com/lavender-ai-israeli-army-gaza/" target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-end gap-0.5 hover:text-terminal-blue transition-colors">
            +972 Magazine — Lavender AI (2024) <ExternalLink className="w-2 h-2" />
          </a>
          <a href="https://www.unocha.org/occupied-palestinian-territory" target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-end gap-0.5 hover:text-terminal-blue transition-colors">
            UN OCHA — Gaza Population (2023) <ExternalLink className="w-2 h-2" />
          </a>
        </div>
      </div>
    </div>
  );
}
