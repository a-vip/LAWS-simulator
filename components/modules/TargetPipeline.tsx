'use client';
import { useCallback, useRef, useState, useEffect } from 'react';
import { ModuleCanvas, drawHUDText } from './ModuleCanvas';
import { ExternalLink } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// AUTHORITATIVE DATA SOURCES
//   • +972 Magazine / Local Call — "Lavender: The AI Machine Directing Israel's
//     Bombing Spree in Gaza" (Apr 3, 2024)
//   • UN OCHA — Gaza Population Data (2023)
//   • ICRC — Autonomous Weapon Systems Position Paper (2021)
// ─────────────────────────────────────────────────────────────────────────────
const GAZA_POPULATION      = 2_300_000;  // UN OCHA 2023
const LAVENDER_TARGETS     = 37_000;     // +972 Magazine — total targets generated
const LAVENDER_OP_DAYS     = 210;        // Oct 2023 → May 2024 (~7 months)
const TARGETS_PER_DAY      = LAVENDER_TARGETS / LAVENDER_OP_DAYS;  // 176.19 / day
const PROFILES_PER_DAY     = GAZA_POPULATION / LAVENDER_OP_DAYS;   // 10,952 / day
const SIM_DAYS             = 35;         // simulation window
const REVIEW_SECONDS       = 20;         // avg officer review per target (Lavender data)
const ERROR_RATE_LOW       = 10;         // % — conservative IHL estimate
const ERROR_RATE_HIGH      = 17;         // % — upper bound from casualty data

// These ratios represent the Lavender funnel population flow:
// 2.3M profiles → ~500K flagged → ~50K scored → ~37K classified → strike
const FUNNEL_STAGES = [
  { label: 'MASS INGESTION',       sub: '2.3M PROFILES',  hex: '#0096ff' },
  { label: 'SIGNALS MATCHING',     sub: '~500K FLAGGED',  hex: '#38bdf8' },
  { label: 'BEHAVIOURAL SCORING',  sub: '~50K SCORED',    hex: '#ffaa00' },
  { label: 'AI CLASSIFICATION',    sub: '~37K TARGETS',   hex: '#ff6600' },
  { label: 'STRIKE AUTHORIZATION', sub: '20-SEC REVIEW',  hex: '#ff1a2e' },
] as const;

const SPEED_OPTIONS = [0.25, 0.5, 1, 2, 5, 10] as const;
type Speed = typeof SPEED_OPTIONS[number];

interface Particle  { x: number; y: number; vy: number; sz: number; al: number; stage: number; }
interface Dot       { x: number; y: number; r: number; ph: number; }
interface TgtEntry  { id: string; conf: number; status: 'CLASSIFIED'|'FLAGGED'|'CLEARED'; }

// Seeded random (LCG) for reproducible Iraq dots
function lcgRand(seed: number): () => number {
  let s = seed;
  return () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 0xffffffff; };
}

// ─────────────────────────────────────────────────────────────────────────────
export function TargetPipeline() {
  // React state (only what the HTML overlays need)
  const [speed, setSpeed]           = useState<Speed>(1);
  const [displayDay, setDisplayDay] = useState(0);
  const [tgtList, setTgtList]       = useState<TgtEntry[]>([]);
  const [mapEndPx, setMapEndPx]     = useState(310); // dynamic: where density maps end in px

  // Refs — never cause re-renders
  const speedRef     = useRef<Speed>(1);
  const simDayRef    = useRef(0);          // master: 0–35, set by loop or scrubber
  const daySnapRef   = useRef(0);          // last value sent to React state (throttled)
  const particles    = useRef<Particle[]>([]);
  const gazaDots     = useRef<Dot[]>([]);
  const iraqDots     = useRef<Dot[]>([]);
  const tgtCountRef  = useRef(0);          // how many targets accumulated so far
  const tgtDataRef   = useRef<TgtEntry[]>([]);
  const initDone     = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef      = useRef<HTMLDivElement>(null);
  const isDragging   = useRef(false);

  // Sync speed ref whenever state changes
  useEffect(() => { speedRef.current = speed; }, [speed]);

  // Auto-scroll target list
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [tgtList]);

  // Compute where density maps end so we can position HTML overlays below them
  useEffect(() => {
    const compute = () => {
      if (!containerRef.current) return;
      const h   = containerRef.current.offsetHeight;
      const mapH = Math.min((h - 62) * 0.42, 220);
      setMapEndPx(62 + 18 + mapH); // panelY + mapTopOffset + mapH
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, []);

  // ── Timeline scrub helper (used by click + drag) ───────────────────────
  const applyScrub = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const day  = pct * SIM_DAYS;
    const prev = simDayRef.current;
    simDayRef.current = day;
    setDisplayDay(day);

    // Scrubbing backward — reset accumulated targets
    if (day < prev) {
      const exp = Math.floor(day * TARGETS_PER_DAY);
      tgtCountRef.current = exp;
      tgtDataRef.current  = tgtDataRef.current.slice(0, exp);
      setTgtList([...tgtDataRef.current.slice(-120)]);
      // Trim Gaza dots to match
      const dotTarget = Math.floor(day * TARGETS_PER_DAY / 20);
      while (gazaDots.current.length > dotTarget) gazaDots.current.pop();
    }
  }, []);

  // Jump to exact day (button)
  const jumpTo = useCallback((day: number) => {
    const prev = simDayRef.current;
    simDayRef.current = day;
    setDisplayDay(day);
    if (day < prev) {
      const exp = Math.floor(day * TARGETS_PER_DAY);
      tgtCountRef.current = exp;
      tgtDataRef.current  = tgtDataRef.current.slice(0, exp);
      setTgtList([...tgtDataRef.current.slice(-120)]);
      const dotTarget = Math.floor(day * TARGETS_PER_DAY / 20);
      while (gazaDots.current.length > dotTarget) gazaDots.current.pop();
    }
  }, []);

  // ── CANVAS DRAW ────────────────────────────────────────────────────────
  const draw = useCallback((
    ctx: CanvasRenderingContext2D, w: number, h: number, _t: number, dt: number
  ) => {
    // ── Time accumulation (speed-scaled, capped to avoid spiral-of-death)
    const clampedDt = Math.min(dt, 0.1);
    simDayRef.current = Math.min(
      simDayRef.current + (clampedDt * speedRef.current) / 60,
      SIM_DAYS
    );
    const day = simDayRef.current;

    // ── Derived metrics (mathematically precise, all from same `day` value)
    // These are the ONLY source of truth for every displayed number:
    const profilesIngested  = Math.min(Math.floor(day * PROFILES_PER_DAY), GAZA_POPULATION);
    const targetsGenerated  = Math.min(Math.floor(day * TARGETS_PER_DAY),  LAVENDER_TARGETS);
    const reviewSecTotal    = targetsGenerated * REVIEW_SECONDS;
    const reviewHours       = Math.floor(reviewSecTotal / 3600);
    const reviewMins        = Math.floor((reviewSecTotal % 3600) / 60);
    const errLow            = Math.floor(targetsGenerated * ERROR_RATE_LOW  / 100);
    const errHigh           = Math.floor(targetsGenerated * ERROR_RATE_HIGH / 100);
    const ratePerDay        = day > 0.05 ? (targetsGenerated / day).toFixed(0) : '0';

    // Throttle React state update (every ~100ms, not every frame)
    if (Math.abs(day - daySnapRef.current) > 0.016 || day === 0 || day === SIM_DAYS) {
      daySnapRef.current = day;
      setDisplayDay(day);
    }

    // ── Init: seeded Iraq dots (reproducible)
    if (!initDone.current) {
      initDone.current = true;
      const rand = lcgRand(0xdeadbeef);
      for (let i = 0; i < 120; i++) {
        iraqDots.current.push({ x: rand(), y: rand(), r: 2 + rand() * 2.5, ph: rand() * Math.PI * 2 });
      }
    }

    // Gaza dots grow proportionally to targetsGenerated
    const targetDots = Math.min(Math.floor(targetsGenerated / 20), 1850);
    while (gazaDots.current.length < targetDots) {
      gazaDots.current.push({
        x: Math.random(), y: Math.random(),
        r: 1.5 + Math.random() * 2.5,
        ph: Math.random() * Math.PI * 2,
      });
    }

    // Accumulate target list (forward only; backward reset handled in jumpTo/scrub)
    if (targetsGenerated > tgtCountRef.current) {
      const toAdd = Math.min(targetsGenerated - tgtCountRef.current, 10);
      for (let i = 0; i < toAdd; i++) {
        const n = tgtCountRef.current + i + 1;
        const r = Math.random();
        const entry: TgtEntry = {
          id:     `TGT-${String(n).padStart(5, '0')}`,
          conf:   82 + Math.floor(Math.random() * 16),
          status: r < 0.72 ? 'CLASSIFIED' : r < 0.90 ? 'FLAGGED' : 'CLEARED',
        };
        tgtDataRef.current.push(entry);
      }
      tgtCountRef.current = targetsGenerated;
      if (tgtDataRef.current.length > 120) tgtDataRef.current = tgtDataRef.current.slice(-120);
      setTgtList([...tgtDataRef.current]);
    }

    // ──────────────────────────────────────────────────────────────────────
    // LAYOUT CONSTANTS
    // ──────────────────────────────────────────────────────────────────────
    const panelY   = 62;
    const leftW    = Math.floor(w * 0.37);
    const mapY     = panelY + 20;
    const mapH     = Math.min((h - panelY) * 0.42, 220);
    const gap      = 8;
    const halfW    = (leftW - 14 * 2 - gap) / 2;
    const iraqX    = 14;
    const gazaX    = iraqX + halfW + gap;

    // ──────────────────────────────────────────────────────────────────────
    // ① THEATER DENSITY MAPPING
    // ──────────────────────────────────────────────────────────────────────
    drawHUDText(ctx, 'THEATER DENSITY MAPPING', 14, panelY + 12, '#0096ff', 8);

    // ── Iraq panel ──
    ctx.strokeStyle = 'rgba(0,212,126,0.22)';
    ctx.lineWidth   = 1;
    ctx.strokeRect(iraqX, mapY, halfW, mapH);

    // Label INSIDE box (top-left pip with dim background)
    ctx.fillStyle = 'rgba(5,5,8,0.72)';
    ctx.fillRect(iraqX + 2, mapY + 2, halfW - 4, 22);
    drawHUDText(ctx, 'IRAQ',          iraqX + 6, mapY + 11, '#00d47e', 7);
    drawHUDText(ctx, '438,317 km²',   iraqX + 6, mapY + 20, '#2a4a3a', 6);

    for (const dot of iraqDots.current) {
      ctx.beginPath();
      ctx.arc(
        iraqX + 4 + dot.x * (halfW - 8),
        mapY  + 4 + dot.y * (mapH  - 8),
        dot.r, 0, Math.PI * 2
      );
      ctx.fillStyle = `rgba(0,212,126,${0.22 + 0.14 * Math.sin(_t * 1.8 + dot.ph)})`;
      ctx.fill();
    }
    // Count badge bottom-left
    ctx.fillStyle = 'rgba(5,5,8,0.7)';
    ctx.fillRect(iraqX + 2, mapY + mapH - 20, halfW - 4, 18);
    drawHUDText(ctx, `${iraqDots.current.length} TARGETS`, iraqX + 6, mapY + mapH - 6, '#00d47e', 7);

    // ── Gaza panel ──
    ctx.strokeStyle = 'rgba(255,26,46,0.32)';
    ctx.lineWidth   = 1;
    ctx.strokeRect(gazaX, mapY, halfW, mapH);

    // Heat overlay grows with target density
    if (gazaDots.current.length > 150) {
      const density = Math.min(gazaDots.current.length / 1850, 1);
      const grd = ctx.createRadialGradient(
        gazaX + halfW * 0.5, mapY + mapH * 0.55, 4,
        gazaX + halfW * 0.5, mapY + mapH * 0.5,  halfW * 0.65
      );
      grd.addColorStop(0, `rgba(255,26,46,${0.18 * density})`);
      grd.addColorStop(1, 'rgba(255,26,46,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(gazaX, mapY, halfW, mapH);
    }

    // Label INSIDE box
    ctx.fillStyle = 'rgba(5,5,8,0.72)';
    ctx.fillRect(gazaX + 2, mapY + 2, halfW - 4, 22);
    drawHUDText(ctx, 'GAZA',     gazaX + 6, mapY + 11, '#ff1a2e', 7);
    drawHUDText(ctx, '365 km²',  gazaX + 6, mapY + 20, '#4a1a1a', 6);

    for (const dot of gazaDots.current) {
      ctx.beginPath();
      ctx.arc(
        gazaX + 4 + dot.x * (halfW - 8),
        mapY  + 4 + dot.y * (mapH  - 8),
        dot.r, 0, Math.PI * 2
      );
      ctx.fillStyle = `rgba(255,26,46,${0.14 + 0.11 * Math.sin(_t * 1.4 + dot.ph)})`;
      ctx.fill();
    }
    // Count badge bottom-left
    ctx.fillStyle = 'rgba(5,5,8,0.7)';
    ctx.fillRect(gazaX + 2, mapY + mapH - 20, halfW - 4, 18);
    const gazaTargetCount = gazaDots.current.length * 20;
    drawHUDText(ctx, `${gazaTargetCount.toLocaleString()} TARGETS`, gazaX + 6, mapY + mapH - 6, '#ff1a2e', 7);

    // Density comparison line
    const mapBotY = mapY + mapH + 10;
    const iraqDensity = iraqDots.current.length / 438317 * 1000;
    const gazaDensity = gazaDots.current.length * 20 / 365;
    drawHUDText(ctx, `DENSITY — IRAQ: ${iraqDensity.toFixed(3)}/km²  ·  GAZA: ${gazaDensity.toFixed(1)}/km²`, 14, mapBotY, '#2a3a4a', 6.5);

    if (gazaDensity > 5) {
      const blink = Math.sin(_t * 3) > 0;
      if (blink) drawHUDText(ctx, '⚠ SATURATION', gazaX + halfW - 60, mapY + mapH + 10, '#ff1a2e', 6.5);
    }

    // ── KEY STATS PANEL (below maps, above HTML timeline) ─────────────
    const statsY = mapBotY + 14;
    // Subtle background
    ctx.fillStyle = 'rgba(8,12,18,0.55)';
    ctx.fillRect(14, statsY, leftW - 28, 82);
    ctx.strokeStyle = 'rgba(26,37,53,0.4)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(14, statsY, leftW - 28, 82);

    const colW2 = (leftW - 28) / 2;

    // Row 1
    const r1y = statsY + 14;
    drawHUDText(ctx, 'AVG REVIEW TIME',       14 + 6,        r1y,      '#536878', 6);
    drawHUDText(ctx, `${REVIEW_SECONDS}s`,    14 + 6,        r1y + 13, '#ff1a2e', 11);
    drawHUDText(ctx, 'per target  (Lavender)', 14 + 6,       r1y + 23, '#2a3a4a', 6);

    drawHUDText(ctx, 'CUMULATIVE REVIEW',     14 + colW2 + 6, r1y,      '#536878', 6);
    const rLabel = targetsGenerated > 0 ? `${reviewHours}h ${reviewMins}m` : '0h 0m';
    drawHUDText(ctx, rLabel,                  14 + colW2 + 6, r1y + 13, '#ffaa00', 11);
    drawHUDText(ctx, 'total officer time',    14 + colW2 + 6, r1y + 23, '#2a3a4a', 6);

    // Row 2
    const r2y = statsY + 50;
    drawHUDText(ctx, 'EST. CIVILIAN ERROR',   14 + 6,         r2y,      '#536878', 6);
    drawHUDText(ctx, `${errLow}–${errHigh}`,  14 + 6,         r2y + 13, '#ff6600', 11);
    drawHUDText(ctx, `wrong target (10–17%)`, 14 + 6,         r2y + 23, '#2a3a4a', 6);

    drawHUDText(ctx, 'ALGORITHMIC RATE',      14 + colW2 + 6, r2y,      '#536878', 6);
    drawHUDText(ctx, `${ratePerDay}/day`,     14 + colW2 + 6, r2y + 13, '#0096ff', 11);
    drawHUDText(ctx, 'targets classified',    14 + colW2 + 6, r2y + 23, '#2a3a4a', 6);

    // ──────────────────────────────────────────────────────────────────────
    // ② POPULATION INGESTION FUNNEL (right 40%)
    // ──────────────────────────────────────────────────────────────────────
    const funnelX   = leftW + 12;
    const funnelW   = w * 0.39;
    const funnelCX  = funnelX + funnelW / 2;

    drawHUDText(ctx, 'POPULATION INGESTION FUNNEL', funnelX, panelY + 12, '#0096ff', 9);
    drawHUDText(ctx,
      `TOTAL DATABASE: ${GAZA_POPULATION.toLocaleString()} PROFILES  ·  LAVENDER AI SYSTEM, GAZA 2023–24`,
      funnelX, panelY + 25, '#2a3a4a', 7
    );

    const fTop  = panelY + 36;
    const fBot  = h - 90;
    const fH    = fBot - fTop;
    const fTopW = funnelW * 0.90;
    const fBotW = funnelW * 0.09;

    // Stage Y breakpoints (proportional, refined for visual clarity)
    const sBreaks = [0, 0.18, 0.40, 0.63, 0.84, 1.0];

    // Gradient fill
    const fg = ctx.createLinearGradient(0, fTop, 0, fBot);
    fg.addColorStop(0,    'rgba(0,150,255,0.04)');
    fg.addColorStop(0.35, 'rgba(255,170,0,0.08)');
    fg.addColorStop(0.72, 'rgba(255,80,0,0.12)');
    fg.addColorStop(1,    'rgba(255,26,46,0.20)');

    ctx.beginPath();
    ctx.moveTo(funnelCX - fTopW / 2, fTop);
    ctx.lineTo(funnelCX - fBotW / 2, fBot);
    ctx.lineTo(funnelCX + fBotW / 2, fBot);
    ctx.lineTo(funnelCX + fTopW / 2, fTop);
    ctx.closePath();
    ctx.fillStyle = fg;
    ctx.fill();

    // Stage bands + labels
    for (let si = 0; si < FUNNEL_STAGES.length; si++) {
      const stage  = FUNNEL_STAGES[si];
      const yPct   = sBreaks[si];
      const midPct = (sBreaks[si] + sBreaks[si + 1]) / 2;

      // Dashed divider
      const lineY  = fTop + fH * yPct;
      const lineHW = (fTopW * (1 - yPct) + fBotW * yPct) / 2;
      ctx.strokeStyle = `${stage.hex}33`;
      ctx.lineWidth   = 0.7;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(funnelCX - lineHW, lineY);
      ctx.lineTo(funnelCX + lineHW, lineY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Right-side label
      const midY   = fTop + fH * midPct;
      const midHW  = (fTopW * (1 - midPct) + fBotW * midPct) / 2;
      const lblX   = funnelCX + midHW + 6;
      ctx.font      = `bold 7px "JetBrains Mono", monospace`;
      ctx.fillStyle = stage.hex;
      ctx.fillText(stage.label, lblX, midY - 2);
      ctx.font      = `6px "JetBrains Mono", monospace`;
      ctx.fillStyle = 'rgba(140,160,180,0.5)';
      ctx.fillText(stage.sub, lblX, midY + 7);

      // Animated left bracket
      if (si < 4 && Math.sin(_t * 1.8 + si * 0.9) > 0.15) {
        const lbX = funnelCX - midHW - 4;
        ctx.strokeStyle = stage.hex;
        ctx.lineWidth   = 1.2;
        ctx.beginPath();
        ctx.moveTo(lbX, midY - 7); ctx.lineTo(lbX - 3, midY); ctx.lineTo(lbX, midY + 7);
        ctx.stroke();
      }
    }

    // Funnel outline — gradient from blue → red
    const og = ctx.createLinearGradient(0, fTop, 0, fBot);
    og.addColorStop(0,   'rgba(0,150,255,0.5)');
    og.addColorStop(0.5, 'rgba(255,100,0,0.5)');
    og.addColorStop(1,   'rgba(255,26,46,0.85)');
    ctx.strokeStyle = og;
    ctx.lineWidth   = 1.5;
    ctx.beginPath(); ctx.moveTo(funnelCX - fTopW/2, fTop); ctx.lineTo(funnelCX - fBotW/2, fBot); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(funnelCX + fTopW/2, fTop); ctx.lineTo(funnelCX + fBotW/2, fBot); ctx.stroke();

    // Neck pulsing glow
    const ng = Math.abs(Math.sin(_t * 2.4));
    ctx.strokeStyle = `rgba(255,26,46,${0.5 + ng * 0.45})`;
    ctx.lineWidth   = 1.5 + ng * 1.5;
    ctx.beginPath(); ctx.moveTo(funnelCX - fBotW/2, fBot); ctx.lineTo(funnelCX + fBotW/2, fBot); ctx.stroke();

    // ── PARTICLES ──────────────────────────────────────────────────────
    const MAX_P    = 700;
    const spawnR   = Math.max(1, Math.ceil(speedRef.current * 2));
    if (particles.current.length < MAX_P) {
      for (let i = 0; i < spawnR; i++) {
        particles.current.push({
          x:     funnelCX + (Math.random() - 0.5) * fTopW * 0.86,
          y:     fTop - 8 - Math.random() * 24,
          vy:    (28 + Math.random() * 62) * Math.max(speedRef.current, 0.5),
          sz:    1.2 + Math.random() * 1.8,
          al:    0.45 + Math.random() * 0.35,
          stage: 0,
        });
      }
    }

    const scaledDt = clampedDt * speedRef.current;
    const pColors  = ['rgba(180,210,240,', 'rgba(100,180,255,', 'rgba(255,170,0,', 'rgba(255,80,0,', 'rgba(255,26,46,'];

    for (let i = particles.current.length - 1; i >= 0; i--) {
      const p    = particles.current[i];
      p.y       += p.vy * scaledDt;
      const prog = (p.y - fTop) / fH;

      if (prog >= 0 && prog <= 1) {
        // Hard-clamp to funnel walls
        const maxHW = (fTopW * (1 - prog) + fBotW * prog) / 2;
        const dist  = p.x - funnelCX;
        if (Math.abs(dist) > maxHW * 0.88) {
          p.x = funnelCX + Math.sign(dist) * maxHW * 0.84;
        }
        p.x    += (funnelCX - p.x) * 0.005;
        p.stage = Math.min(Math.floor(prog / 0.21), 4);
      }

      if (p.y > fBot + 14) {
        p.y = fTop - 8 - Math.random() * 24;
        p.x = funnelCX + (Math.random() - 0.5) * fTopW * 0.86;
        p.vy    = (28 + Math.random() * 62) * Math.max(speedRef.current, 0.5);
        p.stage = 0;
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.sz + (p.stage > 2 ? 0.5 : 0), 0, Math.PI * 2);
      ctx.fillStyle = `${pColors[p.stage]}${p.al})`;
      ctx.fill();
    }

    // ── OUTPUT COUNTER ──────────────────────────────────────────────────
    const outY = fBot + 14;
    drawHUDText(ctx, 'TARGETS CLASSIFIED', funnelCX - 66, outY, '#536878', 7);
    ctx.font      = `bold 28px "JetBrains Mono", monospace`;
    ctx.fillStyle = '#ff1a2e';
    ctx.fillText(targetsGenerated.toLocaleString().padStart(6, ' '), funnelCX - 80, outY + 24);
    drawHUDText(ctx,
      `OF ${LAVENDER_TARGETS.toLocaleString()} TOTAL  ·  ${Number(ratePerDay).toFixed(0)}/DAY  vs ACTUAL 176/DAY`,
      funnelCX - 80, outY + 38, '#536878', 7
    );

    // ──────────────────────────────────────────────────────────────────────
    // ③ BOTTOM HUD BAR
    // ──────────────────────────────────────────────────────────────────────
    const hudY = h - 28;
    ctx.fillStyle   = 'rgba(4,4,8,0.95)';
    ctx.fillRect(0, hudY - 8, w, 36);
    ctx.strokeStyle = 'rgba(26,37,53,0.5)';
    ctx.lineWidth   = 0.5;
    ctx.beginPath(); ctx.moveTo(0, hudY - 8); ctx.lineTo(w, hudY - 8); ctx.stroke();

    // All four counters derived from the SAME `day` value — guaranteed in sync
    drawHUDText(ctx, `PROFILES INGESTED: ${profilesIngested.toLocaleString()}`,  14,       hudY + 8, '#0096ff', 9);
    drawHUDText(ctx, `TARGETS GENERATED: ${targetsGenerated.toLocaleString()}`,  w * 0.30, hudY + 8, '#ff1a2e', 9);
    drawHUDText(ctx, `DAY: ${day.toFixed(2)} / ${SIM_DAYS}`,                     w * 0.58, hudY + 8, '#ffaa00', 9);
    drawHUDText(ctx, `HUMAN REVIEW: ${reviewHours}h ${reviewMins}m total`,       w * 0.76, hudY + 8, '#536878', 8);
  }, []);

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────────────────────────────
  const dayPct = Math.min(displayDay / SIM_DAYS, 1);

  return (
    <div ref={containerRef} className="relative w-full h-full">

      {/* ── CANVAS (full area) ─────────────────────────────────────────── */}
      <div className="absolute inset-0">
        <ModuleCanvas
          title="HIGH-VOLUME TARGET GENERATION PIPELINE"
          subtitle="Automated mass surveillance → AI target extraction at machine pace  ·  Based on Lavender AI system (Gaza, 2023–2024)"
          moduleId="MODULE 1 // TARGET PIPELINE"
          draw={draw}
        />
      </div>

      {/* ── INTERACTIVE TIMELINE (HTML overlay, positioned below density maps) */}
      <div
        className="absolute font-mono pointer-events-auto"
        style={{ left: 14, width: 'calc(37% - 28px)', top: mapEndPx + 100, zIndex: 10 }}
      >
        <div className="space-y-2">
          {/* Label row */}
          <div className="flex justify-between text-[6.5px] font-bold">
            <span className="text-terminal-blue tracking-wider">{SIM_DAYS}-DAY OPERATIONAL WINDOW</span>
            <span className="text-terminal-amber tabular-nums">DAY {displayDay.toFixed(2)}</span>
          </div>

          {/* Scrub bar */}
          <div
            className="relative h-3 rounded cursor-pointer select-none group"
            style={{ background: 'rgba(8,12,18,0.85)', border: '1px solid rgba(26,37,53,0.6)' }}
            onClick={applyScrub}
            onMouseMove={(e) => { if (isDragging.current) applyScrub(e); }}
            onMouseDown={(e) => { isDragging.current = true; applyScrub(e); }}
            onMouseUp={() => { isDragging.current = false; }}
            onMouseLeave={() => { isDragging.current = false; }}
          >
            {/* Progress fill */}
            <div
              className="absolute top-0 left-0 h-full rounded-sm"
              style={{
                width: `${dayPct * 100}%`,
                background: 'linear-gradient(to right, #0096ff, #ffaa00, #ff1a2e)',
                transition: 'none',
              }}
            />
            {/* Week tick marks */}
            {[7, 14, 21, 28].map(d => (
              <div
                key={d}
                className="absolute top-0 h-full w-px"
                style={{ left: `${(d / SIM_DAYS) * 100}%`, background: 'rgba(255,255,255,0.12)' }}
              />
            ))}
            {/* Thumb */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border shadow-lg"
              style={{
                left: `calc(${dayPct * 100}% - 6px)`,
                background: '#ccd6e0',
                borderColor: 'rgba(0,150,255,0.6)',
                boxShadow: '0 0 6px rgba(0,150,255,0.4)',
                transition: 'none',
              }}
            />
          </div>

          {/* Tick labels */}
          <div className="relative h-3 text-[5.5px]" style={{ color: '#2a3a4a' }}>
            {[0, 7, 14, 21, 28, 35].map(d => (
              <span key={d} className="absolute -translate-x-1/2" style={{ left: `${(d / SIM_DAYS) * 100}%` }}>
                D{d}
              </span>
            ))}
          </div>

          {/* Jump buttons */}
          <div className="flex items-center gap-1">
            <span className="text-[6px] text-terminal-text-faint shrink-0">JUMP:</span>
            {[0, 7, 14, 21, 28, 35].map(d => (
              <button
                key={d}
                onClick={() => jumpTo(d)}
                className="px-1.5 py-0.5 rounded text-[6px] font-bold border transition-all hover:border-terminal-blue hover:text-terminal-blue"
                style={{ borderColor: 'rgba(26,37,53,0.6)', color: '#536878' }}
              >
                D{d}
              </button>
            ))}
            <button
              onClick={() => jumpTo(SIM_DAYS)}
              className="ml-auto px-1.5 py-0.5 rounded text-[6px] font-bold border border-terminal-red/40 text-terminal-red/70 hover:border-terminal-red hover:text-terminal-red transition-all"
            >
              END
            </button>
          </div>
        </div>
      </div>

      {/* ── SPEED CONTROLS ─────────────────────────────────────────────── */}
      <div
        className="absolute font-mono flex items-center gap-1.5 pointer-events-auto"
        style={{ bottom: 38, left: 14, zIndex: 10 }}
      >
        <span className="text-[6.5px] text-terminal-text-faint tracking-wider uppercase">Speed:</span>
        {SPEED_OPTIONS.map(s => (
          <button
            key={s}
            onClick={() => setSpeed(s)}
            className={`px-1.5 py-0.5 rounded text-[7px] font-bold border transition-all ${
              speed === s
                ? 'bg-terminal-blue/20 border-terminal-blue text-terminal-blue'
                : 'border-terminal-border/40 text-terminal-text-faint hover:border-terminal-text-dim hover:text-terminal-text'
            }`}
          >
            {s}×
          </button>
        ))}
      </div>

      {/* ── TARGET LOG (right 21%) ─────────────────────────────────────── */}
      <div
        className="absolute font-mono pointer-events-auto"
        style={{ top: 62, right: 8, width: '21%', bottom: 36, zIndex: 10 }}
      >
        <div className="h-full flex flex-col rounded overflow-hidden"
          style={{ background: 'rgba(5,5,8,0.82)', border: '1px solid rgba(26,37,53,0.45)', backdropFilter: 'blur(8px)' }}>

          {/* Header */}
          <div className="px-2 py-1.5 flex justify-between items-center shrink-0"
            style={{ borderBottom: '1px solid rgba(26,37,53,0.4)' }}>
            <span className="text-[8px] text-terminal-blue font-bold tracking-wider">TARGET LOG</span>
            <span className="text-[7px] text-terminal-text-faint tabular-nums">{tgtList.length} / {Math.floor(displayDay * TARGETS_PER_DAY).toLocaleString()}</span>
          </div>

          {/* Entries */}
          <div ref={listRef} className="flex-1 overflow-y-auto p-1 space-y-px">
            {tgtList.length === 0 ? (
              <p className="text-[7px] text-terminal-text-faint/40 text-center mt-4">AWAITING DATA...</p>
            ) : (
              tgtList.map((e, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center px-1.5 py-0.5 rounded text-[7px]"
                  style={{
                    borderLeft: `2px solid ${e.status === 'CLASSIFIED' ? 'rgba(255,26,46,0.6)' : e.status === 'FLAGGED' ? 'rgba(255,170,0,0.5)' : 'rgba(80,100,120,0.3)'}`,
                    background: e.status === 'CLASSIFIED' ? 'rgba(255,26,46,0.05)' : e.status === 'FLAGGED' ? 'rgba(255,170,0,0.04)' : 'transparent',
                  }}
                >
                  <span className="text-terminal-text-faint tabular-nums">{e.id}</span>
                  <span
                    className="font-bold tabular-nums"
                    style={{ color: e.status === 'CLASSIFIED' ? '#ff1a2e' : e.status === 'FLAGGED' ? '#ffaa00' : '#536878' }}
                  >
                    {e.conf}%
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Footer note */}
          <div className="px-2 py-1 shrink-0" style={{ borderTop: '1px solid rgba(26,37,53,0.4)' }}>
            <p className="text-[6px] leading-tight" style={{ color: 'rgba(255,26,46,0.55)' }}>
              ~20s avg review (Lavender)
            </p>
          </div>
        </div>
      </div>

      {/* ── SOURCE CITATIONS ───────────────────────────────────────────── */}
      <div
        className="absolute text-right pointer-events-auto"
        style={{ bottom: 38, right: 8, zIndex: 10 }}
      >
        <div className="space-y-0.5 font-mono text-[6px]" style={{ color: 'rgba(83,104,120,0.55)' }}>
          <a
            href="https://www.972mag.com/lavender-ai-israeli-army-gaza/"
            target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-end gap-0.5 hover:text-terminal-blue transition-colors"
          >
            +972 Magazine — Lavender AI (Apr 2024) <ExternalLink className="w-2 h-2" />
          </a>
          <a
            href="https://www.unocha.org/occupied-palestinian-territory"
            target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-end gap-0.5 hover:text-terminal-blue transition-colors"
          >
            UN OCHA — Gaza Population (2023) <ExternalLink className="w-2 h-2" />
          </a>
          <a
            href="https://www.icrc.org/en/document/icrc-position-autonomous-weapon-systems"
            target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-end gap-0.5 hover:text-terminal-blue transition-colors"
          >
            ICRC — Autonomous Weapons Position (2021) <ExternalLink className="w-2 h-2" />
          </a>
        </div>
      </div>
    </div>
  );
}
