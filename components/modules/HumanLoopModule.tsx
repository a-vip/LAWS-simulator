'use client';
import { useCallback, useRef, useState, useEffect } from 'react';
import { ModuleCanvas, drawHUDText } from './ModuleCanvas';
import { Clock, Scale, AlertTriangle, ExternalLink, Zap, CheckSquare } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// M5: HUMAN LOOP — Meaningful Human Control vs. Rubber-Stamp Reality
//   Source: +972 Magazine / Local Call — Lavender investigation (Apr 2024)
//   ICRC — Autonomous Weapon Systems Policy Brief (2021)
//   Stop Killer Robots — Meaningful Human Control framework
//
//   THE MATH:
//     176 targets/day × 20s review = 3,520s = 58.7 min available
//     Meaningful review (per IHL): ~65 min/target × 176 = 190 hours/day
//     DEFICIT: 99.5% — the 20-second window is functionally a rubber stamp
// ─────────────────────────────────────────────────────────────────────────────

const T_PER_DAY    = 176;
const REVIEW_SECS  = 20;
const MHC_MINS     = 65;   // min per target for meaningful review
const REQ_HRS      = Math.round(T_PER_DAY * MHC_MINS / 60); // ~190
const AVAIL_HRS    = Number((T_PER_DAY * REVIEW_SECS / 3600).toFixed(1)); // ~0.98

interface StampCard { x: number; y: number; vy: number; id: string; }
interface CheckStep { label: string; detail: string; minutes: string; done: boolean; progress: number; }

const MHC_STEPS: CheckStep[] = [
  { label: 'Identity verification',     detail: 'Corroborate target across multiple intel sources',      minutes: '10–15 min', done: false, progress: 0 },
  { label: 'Intelligence assessment',   detail: 'Review signal data, humint, pattern-of-life evidence',  minutes: '15–20 min', done: false, progress: 0 },
  { label: 'Proportionality review',    detail: 'Legal analysis — civilian harm vs. military advantage', minutes: '20–30 min', done: false, progress: 0 },
  { label: 'Civilian proximity check',  detail: 'Verify collateral risk against IHL Art. 51(5)(b)',      minutes: '10–15 min', done: false, progress: 0 },
  { label: 'Authorisation & record',    detail: 'Formal sign-off, documented rationale, audit trail',   minutes: '10 min',    done: false, progress: 0 },
];

export function HumanLoopModule() {
  // Stopwatch for 20-second cycle
  const [timeLeft,   setTimeLeft]   = useState(REVIEW_SECS);
  const [approved,   setApproved]   = useState(0);
  const [saturation, setSaturation] = useState(0); // 0-100%
  const [tryActive,  setTryActive]  = useState(false);
  const [tryTime,    setTryTime]    = useState(REVIEW_SECS);

  // Canvas animation refs
  const stamps       = useRef<StampCard[]>([]);
  const wavePhase    = useRef(0);
  const flashT       = useRef(-999);
  const timerRef     = useRef(REVIEW_SECS);
  const satRef       = useRef(0);
  const approvedRef  = useRef(0);
  const tryRef       = useRef(false);
  const tryTimeRef   = useRef(REVIEW_SECS);

  // 20-second auto-approval cycle
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        const next = prev - 0.1;
        timerRef.current = next;
        if (next <= 0) {
          const newApproved = approvedRef.current + 1;
          approvedRef.current = newApproved;
          setApproved(newApproved);
          flashT.current = performance.now() / 1000;
          const newSat = Math.min(100, satRef.current + 4.2);
          satRef.current = newSat;
          setSaturation(newSat);
          return REVIEW_SECS;
        }
        return next;
      });

      // "Try it" timer
      if (tryRef.current) {
        setTryTime(prev => {
          const next = prev - 0.1;
          tryTimeRef.current = next;
          if (next <= 0) {
            tryRef.current = false;
            setTryActive(false);
            return REVIEW_SECS;
          }
          return next;
        });
      }
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const startTry = useCallback(() => {
    tryRef.current = true;
    tryTimeRef.current = REVIEW_SECS;
    setTryTime(REVIEW_SECS);
    setTryActive(true);
  }, []);

  // ── CANVAS DRAW — [] deps ─────────────────────────────────────────────────
  const draw = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, t: number, dt: number) => {
    const panelY = 62;
    wavePhase.current += dt * 10;

    // ── LAYOUT ─────────────────────────────────────────────────────────────
    const leftW  = Math.floor(w * 0.33);   // IHL / MHC column
    const rightX = Math.floor(w * 0.67);   // Reality column
    const rightW = w - rightX - 8;
    const centX  = leftW;                   // center column x
    const centW  = rightX - leftW;          // center column width
    const centCX = centX + centW / 2;

    // Subtle vertical dividers
    ctx.strokeStyle = 'rgba(26,37,53,0.45)';
    ctx.lineWidth   = 0.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(leftW, panelY + 20); ctx.lineTo(leftW, h - 44); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rightX, panelY + 20); ctx.lineTo(rightX, h - 44); ctx.stroke();
    ctx.setLineDash([]);

    // Column header backgrounds
    ctx.fillStyle = 'rgba(0,150,255,0.03)';
    ctx.fillRect(0, panelY + 20, leftW, h - panelY - 64);
    ctx.fillStyle = 'rgba(255,170,0,0.025)';
    ctx.fillRect(centX, panelY + 20, centW, h - panelY - 64);
    ctx.fillStyle = 'rgba(255,26,46,0.03)';
    ctx.fillRect(rightX, panelY + 20, rightW, h - panelY - 64);

    // ─────────────────────────────────────────────────────────────────────
    // ① CENTRE COLUMN — The 20-Second Clock (focal point)
    // ─────────────────────────────────────────────────────────────────────
    const clkCY = panelY + 90;
    const clkR  = Math.min(centW * 0.28, 58);

    // Outer glow
    const glowFrac = 1 - timerRef.current / REVIEW_SECS;
    const glowA    = 0.12 + 0.18 * glowFrac;
    ctx.beginPath(); ctx.arc(centCX, clkCY, clkR + 12, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,${Math.floor(200 - 174 * glowFrac)},0,${glowA})`;
    ctx.fill();

    // Clock face
    ctx.beginPath(); ctx.arc(centCX, clkCY, clkR + 5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(4,4,8,0.96)'; ctx.fill();

    // Progress arc
    const arcAngle = ((REVIEW_SECS - timerRef.current) / REVIEW_SECS) * Math.PI * 2;
    const arcCol   = timerRef.current < 5 ? '#ff1a2e' : timerRef.current < 10 ? '#ff6600' : '#ffaa00';
    ctx.beginPath(); ctx.arc(centCX, clkCY, clkR + 5, -Math.PI / 2, -Math.PI / 2 + arcAngle);
    ctx.strokeStyle = arcCol; ctx.lineWidth = 4; ctx.stroke();

    // Tick marks (20 ticks = 1 per second)
    for (let m = 0; m < 20; m++) {
      const ang = (m / 20) * Math.PI * 2 - Math.PI / 2;
      const isFilled = m < (20 - timerRef.current);
      const inner = clkR + 1; const outer = clkR + (m % 5 === 0 ? 6 : 4);
      ctx.strokeStyle = isFilled ? arcCol : 'rgba(26,37,53,0.5)';
      ctx.lineWidth = m % 5 === 0 ? 1.5 : 0.8;
      ctx.beginPath();
      ctx.moveTo(centCX + Math.cos(ang) * inner, clkCY + Math.sin(ang) * inner);
      ctx.lineTo(centCX + Math.cos(ang) * outer, clkCY + Math.sin(ang) * outer);
      ctx.stroke();
    }

    // Hand
    const handAng = ((REVIEW_SECS - timerRef.current) / REVIEW_SECS) * Math.PI * 2 - Math.PI / 2;
    ctx.strokeStyle = arcCol; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centCX, clkCY);
    ctx.lineTo(centCX + Math.cos(handAng) * (clkR - 4), clkCY + Math.sin(handAng) * (clkR - 4));
    ctx.stroke();

    // Center dot
    ctx.beginPath(); ctx.arc(centCX, clkCY, 3, 0, Math.PI * 2);
    ctx.fillStyle = arcCol; ctx.fill();

    // Time text
    ctx.font    = `bold 18px "JetBrains Mono", monospace`;
    ctx.fillStyle = arcCol;
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.ceil(timerRef.current)}s`, centCX, clkCY + 6);
    ctx.textAlign = 'left';

    // Clock label (drawn by canvas, below clock)
    drawHUDText(ctx, 'ACTUAL REVIEW WINDOW', centCX - 62, clkCY + clkR + 18, '#536878', 7);
    drawHUDText(ctx, 'PER LAVENDER TARGET', centCX - 52, clkCY + clkR + 29, '#536878', 7);

    // ─── Waveform (voice-log check) ───────────────────────────────────────
    const waveY = clkCY + clkR + 46;
    const waveW = centW - 32;
    const waveX = centX + 16;
    ctx.strokeStyle = 'rgba(0,212,126,0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let wx = 0; wx < waveW; wx++) {
      const envelope = Math.sin(wx / waveW * Math.PI);
      const wy = waveY + 8 + Math.sin(wx * 0.32 + wavePhase.current) * 6 * envelope * (0.6 + 0.4 * Math.abs(Math.sin(wx * 0.8)));
      if (wx === 0) ctx.moveTo(waveX + wx, wy); else ctx.lineTo(waveX + wx, wy);
    }
    ctx.stroke();
    drawHUDText(ctx, 'VOICE LOG SIMULATION', centCX - 54, waveY + 22, '#00d47e', 6.5);

    // ─── Cognitive Saturation bar ──────────────────────────────────────────
    const satY = waveY + 34;
    const satW = waveW;
    const satFrac = Math.min(satRef.current / 100, 1);
    const satColor = satFrac > 0.8 ? '#ff1a2e' : satFrac > 0.5 ? '#ff6600' : '#ffaa00';
    ctx.fillStyle = 'rgba(26,37,53,0.4)';
    ctx.fillRect(waveX, satY, satW, 6);
    ctx.fillStyle = satColor;
    ctx.fillRect(waveX, satY, satW * satFrac, 6);
    ctx.strokeStyle = 'rgba(26,37,53,0.5)'; ctx.lineWidth = 0.5;
    ctx.strokeRect(waveX, satY, satW, 6);

    // Deficit gap visualization
    const defY = satY + 24;
    // Required bar (thin, blue, full width)
    ctx.fillStyle = 'rgba(0,150,255,0.15)';
    ctx.fillRect(waveX, defY, satW, 5);
    ctx.strokeStyle = 'rgba(0,150,255,0.3)'; ctx.lineWidth = 0.5;
    ctx.strokeRect(waveX, defY, satW, 5);
    // Available bar (tiny red sliver)
    const availPx = Math.max(3, satW * (AVAIL_HRS / REQ_HRS));
    ctx.fillStyle = '#ff1a2e';
    ctx.fillRect(waveX, defY, availPx, 5);
    drawHUDText(ctx, `AVAILABLE ${AVAIL_HRS}h`, waveX, defY + 14, '#ff1a2e', 6.5);
    drawHUDText(ctx, `REQUIRED ${REQ_HRS}h`, waveX + availPx + 4, defY + 14, '#0096ff', 6.5);
    drawHUDText(ctx, `DEFICIT: 99.5%`, centCX - 30, defY + 24, '#536878', 7);

    // ─── Approved flash ────────────────────────────────────────────────────
    const flashElapsed = t - flashT.current;
    if (flashElapsed < 0.6) {
      const fa = 1 - flashElapsed / 0.6;
      ctx.fillStyle = `rgba(255,26,46,${fa * 0.55})`;
      ctx.fillRect(centX + 4, clkCY - clkR - 8, centW - 8, clkR * 2 + 16);
      ctx.font = 'bold 14px "JetBrains Mono", monospace';
      ctx.fillStyle = `rgba(255,255,255,${fa})`;
      ctx.textAlign = 'center';
      ctx.fillText('APPROVED', centCX, clkCY + 5);
      ctx.textAlign = 'left';
    }

    // ─────────────────────────────────────────────────────────────────────
    // ② LEFT — MHC checklist animation (slow progress)
    // ─────────────────────────────────────────────────────────────────────
    const stepH = 44;
    const stepY = panelY + 56;
    const stepX = 12;
    const stepW = leftW - 20;

    MHC_STEPS.forEach((step, i) => {
      const baseProg = (t * 0.004 + i * 0.18) % 1;
      const sy       = stepY + i * stepH;

      // Step background
      ctx.fillStyle   = baseProg > 0.9 ? 'rgba(0,212,126,0.06)' : 'rgba(0,150,255,0.04)';
      ctx.strokeStyle = baseProg > 0.9 ? 'rgba(0,212,126,0.2)' : 'rgba(0,150,255,0.12)';
      ctx.lineWidth   = 0.5;
      ctx.fillRect(stepX, sy, stepW, stepH - 4);
      ctx.strokeRect(stepX, sy, stepW, stepH - 4);

      // Step number
      ctx.font      = 'bold 7px "JetBrains Mono", monospace';
      ctx.fillStyle = baseProg > 0.9 ? '#00d47e' : '#0096ff';
      ctx.fillText(`${String(i + 1).padStart(2, '0')}`, stepX + 4, sy + 12);

      // Step label
      ctx.font      = 'bold 7px "JetBrains Mono", monospace';
      ctx.fillStyle = '#ccd6e0';
      ctx.fillText(step.label, stepX + 20, sy + 12);

      // Time estimate
      ctx.font      = '6px "JetBrains Mono", monospace';
      ctx.fillStyle = '#536878';
      ctx.fillText(step.minutes, stepX + stepW - 44, sy + 12);

      // Progress bar
      ctx.fillStyle = 'rgba(26,37,53,0.5)';
      ctx.fillRect(stepX + 4, sy + stepH - 14, stepW - 8, 4);
      ctx.fillStyle = baseProg > 0.9 ? '#00d47e' : '#0096ff';
      ctx.fillRect(stepX + 4, sy + stepH - 14, (stepW - 8) * baseProg, 4);

      // Status label
      ctx.font = '6px "JetBrains Mono", monospace';
      ctx.fillStyle = baseProg > 0.9 ? '#00d47e' : baseProg > 0.5 ? '#ffaa00' : '#536878';
      ctx.fillText(baseProg > 0.9 ? '✓ COMPLETE' : baseProg > 0.5 ? 'IN REVIEW' : 'PENDING', stepX + 4, sy + stepH - 18);
    });

    // ─────────────────────────────────────────────────────────────────────
    // ③ RIGHT — Automated stamp cascade
    // ─────────────────────────────────────────────────────────────────────
    // Spawn stamps
    const spawnRate = 3;
    for (let sp = 0; sp < spawnRate; sp++) {
      if (stamps.current.length < 80 && Math.random() < 0.4) {
        stamps.current.push({
          x:  rightX + 6 + Math.random() * (rightW - 78),
          y:  panelY + 30 - Math.random() * 40,
          vy: 55 + Math.random() * 90,
          id: `TGT-${Math.floor(Math.random() * 99999).toString().padStart(5, '0')}`,
        });
      }
    }

    for (let i = stamps.current.length - 1; i >= 0; i--) {
      const s = stamps.current[i];
      s.y += s.vy * dt;

      const cardH = 28; const cardW = 70;
      ctx.fillStyle   = 'rgba(255,26,46,0.10)';
      ctx.strokeStyle = 'rgba(255,26,46,0.35)';
      ctx.lineWidth   = 0.6;
      ctx.fillRect(s.x, s.y, cardW, cardH);
      ctx.strokeRect(s.x, s.y, cardW, cardH);

      ctx.font = 'bold 7px "JetBrains Mono", monospace';
      ctx.fillStyle = '#ff1a2e';
      ctx.fillText('APPROVED', s.x + 4, s.y + 11);
      ctx.font = '5.5px "JetBrains Mono", monospace';
      ctx.fillStyle = '#536878';
      ctx.fillText(s.id, s.x + 4, s.y + 21);

      // Tiny red review-time tag
      ctx.fillStyle = 'rgba(255,26,46,0.5)';
      ctx.fillRect(s.x + cardW - 22, s.y, 22, 9);
      ctx.font = '5px "JetBrains Mono", monospace';
      ctx.fillStyle = '#fff';
      ctx.fillText('20s', s.x + cardW - 18, s.y + 7);

      if (s.y > h - 44) stamps.current.splice(i, 1);
    }

    // ─────────────────────────────────────────────────────────────────────
    // ④ BOTTOM HUD
    // ─────────────────────────────────────────────────────────────────────
    const hudY = h - 28;
    ctx.fillStyle   = 'rgba(4,4,8,0.95)';
    ctx.fillRect(0, hudY - 8, w, 36);
    ctx.strokeStyle = 'rgba(26,37,53,0.5)'; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(0, hudY - 8); ctx.lineTo(w, hudY - 8); ctx.stroke();

    drawHUDText(ctx, `APPROVED THIS SESSION: ${approvedRef.current}`,        16,       hudY + 8, '#ff1a2e', 9);
    drawHUDText(ctx, `LAVENDER RATE: 176 TARGETS/DAY`,                       w * 0.30, hudY + 8, '#ff1a2e', 8);
    drawHUDText(ctx, `REVIEW TIME: ${REVIEW_SECS}s  ·  MHC REQUIRED: 65 min`,w * 0.58, hudY + 8, '#536878', 8);
    drawHUDText(ctx, `COG. SATURATION: ${Math.min(100, Math.round(satRef.current))}%`, w * 0.87, hudY + 8, satRef.current > 80 ? '#ff1a2e' : '#ffaa00', 8);
  }, []);

  const satColor = saturation > 80 ? '#ff1a2e' : saturation > 50 ? '#ff6600' : '#ffaa00';

  return (
    <div className="relative w-full h-full">

      {/* Canvas */}
      <div className="absolute inset-0">
        <ModuleCanvas
          title="HUMAN INTERFACE COMMAND LAYER — THE BOTTLENECK OVERRIDE"
          subtitle="Meaningful Human Control vs. rubber-stamp approval  ·  +972 Magazine / ICRC"
          moduleId="MODULE 5 // HUMAN LOOP"
          draw={draw}
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          COLUMN HEADERS (HTML overlay — large, clear, readable at distance)
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="absolute inset-0 pointer-events-none font-mono" style={{ top: 62, zIndex: 10 }}>
        <div className="flex h-full">

          {/* ── LEFT: IHL/MHC Standard ──────────────────────────────────── */}
          <div className="flex flex-col" style={{ width: '33%', paddingTop: 6, paddingLeft: 12 }}>
            <div className="flex items-center gap-1.5 mb-0.5">
              <Scale className="w-3.5 h-3.5 shrink-0" style={{ color: '#0096ff' }} />
              <span className="font-bold text-[10px] tracking-wider" style={{ color: '#0096ff' }}>
                MEANINGFUL HUMAN CONTROL
              </span>
            </div>
            <div className="text-[7px] mb-1" style={{ color: '#536878' }}>What IHL requires</div>
            <div
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[7px] self-start"
              style={{ background: 'rgba(0,150,255,0.1)', border: '1px solid rgba(0,150,255,0.3)', color: '#0096ff' }}
            >
              ~65 MIN / TARGET — 2–3 TARGETS / WEEK
            </div>

            {/* Step list */}
            <div className="mt-1 space-y-px text-[6.5px]" style={{ color: '#2a3a4a' }}>
              {MHC_STEPS.map((s, i) => (
                <div key={i} style={{ color: '#2a3a4a', paddingLeft: 2 }}>
                  {i + 1}. {s.detail}
                </div>
              ))}
            </div>

            {/* Rate summary */}
            <div className="mt-auto mb-6 space-y-1 pr-3">
              <div
                className="rounded px-2 py-1.5"
                style={{ background: 'rgba(0,150,255,0.06)', border: '1px solid rgba(0,150,255,0.15)' }}
              >
                <div className="text-[7px] mb-0.5" style={{ color: '#536878' }}>REQUIRED DAILY REVIEW</div>
                <div className="font-bold text-[15px] tabular-nums" style={{ color: '#0096ff' }}>
                  {REQ_HRS} HOURS
                </div>
                <div className="text-[6.5px]" style={{ color: '#2a3a4a' }}>for {T_PER_DAY} targets at 65 min each</div>
              </div>

              <div className="pointer-events-auto">
                {!tryActive ? (
                  <button
                    onClick={() => { }}
                    className="w-full px-2 py-1.5 rounded text-[7px] font-bold border transition-all"
                    style={{ background: 'rgba(0,150,255,0.1)', borderColor: 'rgba(0,150,255,0.4)', color: '#0096ff' }}
                    title="Experience the 20-second window"
                  >
                    <CheckSquare className="inline w-2.5 h-2.5 mr-1" />
                    IDEAL REVIEW FLOW ↑ (THEORETICAL)
                  </button>
                ) : (
                  <div
                    className="w-full px-2 py-1.5 rounded text-[7px] font-bold text-center"
                    style={{ background: 'rgba(255,26,46,0.15)', border: '1px solid rgba(255,26,46,0.5)', color: '#ff1a2e' }}
                  >
                    ⏱ TIME REMAINING: {Math.ceil(tryTime)}s — APPROVE OR DENY?
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── CENTRE: Clock + Deficit ──────────────────────────────────── */}
          <div
            className="flex flex-col items-center"
            style={{ width: '34%', paddingTop: 6 }}
          >
            {/* Hero headline */}
            <div className="text-center mb-1">
              <div className="font-bold tracking-wide" style={{ fontSize: 11, color: '#ffaa00' }}>
                THE REVIEW WINDOW
              </div>
            </div>

            {/* Big number (below canvas clock, for conference readability) */}
            <div className="text-center" style={{ marginTop: 170 }}>
              <div className="font-bold tabular-nums" style={{ fontSize: 26, color: saturation > 80 ? '#ff1a2e' : '#ffaa00', letterSpacing: '-0.02em' }}>
                {Math.ceil(timeLeft)}
                <span className="text-[14px] ml-0.5" style={{ color: '#536878' }}>sec</span>
              </div>
              <div className="text-[7px] mt-0.5" style={{ color: '#536878' }}>countdown to auto-approval</div>
            </div>

            {/* Cognitive saturation label */}
            <div className="text-center mt-12 px-2 w-full">
              <div className="flex justify-between text-[6.5px] mb-0.5">
                <span style={{ color: '#536878' }}>COGNITIVE SATURATION</span>
                <span style={{ color: satColor, fontWeight: 700 }}>{Math.round(saturation)}%</span>
              </div>
            </div>

            {/* Deficit comparison labels */}
            <div className="mt-8 w-full px-3 text-[6.5px] text-center">
              <div style={{ color: '#536878' }}>
                <span style={{ color: '#0096ff', fontWeight: 700 }}>REQUIRED: {REQ_HRS}h</span>
                {'  ·  '}
                <span style={{ color: '#ff1a2e', fontWeight: 700 }}>AVAILABLE: {AVAIL_HRS}h</span>
              </div>
            </div>

            {/* Key quote */}
            <div
              className="mt-auto mb-6 mx-2 px-2 py-1.5 rounded text-[6.5px] text-center leading-relaxed"
              style={{ background: 'rgba(255,170,0,0.06)', border: '1px solid rgba(255,170,0,0.15)', color: '#536878' }}
            >
              <span style={{ color: '#ffaa00', fontWeight: 700 }}>
                "The system did everything automatically."
              </span>
              <br />
              — IDF officer, +972 Magazine (2024)
            </div>
          </div>

          {/* ── RIGHT: Lavender Reality ──────────────────────────────────── */}
          <div className="flex flex-col" style={{ width: '33%', paddingTop: 6, paddingRight: 12, alignItems: 'flex-end' }}>
            <div className="flex items-center gap-1.5 mb-0.5 justify-end">
              <span className="font-bold text-[10px] tracking-wider" style={{ color: '#ff1a2e' }}>
                LAVENDER REALITY
              </span>
              <Zap className="w-3.5 h-3.5 shrink-0" style={{ color: '#ff1a2e' }} />
            </div>
            <div className="text-[7px] mb-1 text-right" style={{ color: '#536878' }}>What actually happened</div>
            <div
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[7px] self-end"
              style={{ background: 'rgba(255,26,46,0.1)', border: '1px solid rgba(255,26,46,0.3)', color: '#ff1a2e' }}
            >
              20 SEC / TARGET — 176 TARGETS / DAY
            </div>

            {/* Stats boxes */}
            <div className="mt-auto mb-4 space-y-1.5 w-full">
              {/* Running counter */}
              <div
                className="rounded px-3 py-2 text-right"
                style={{ background: 'rgba(255,26,46,0.06)', border: '1px solid rgba(255,26,46,0.18)' }}
              >
                <div className="text-[7px] mb-0.5" style={{ color: '#536878' }}>APPROVED THIS SESSION</div>
                <div className="font-bold tabular-nums" style={{ fontSize: 22, color: '#ff1a2e' }}>
                  {approved}
                </div>
                <div className="text-[6.5px]" style={{ color: '#2a3a4a' }}>auto-approved (no review)</div>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {([
                  { label: 'Targets/day',   value: '176+',     col: '#ff1a2e' },
                  { label: 'Total targets', value: '37,000',   col: '#ff6600' },
                  { label: 'CDE threshold', value: '20 civ.',  col: '#ffaa00' },
                  { label: 'Human review',  value: '20 sec',   col: '#ff1a2e' },
                ] as { label: string; value: string; col: string }[]).map(({ label, value, col }) => (
                  <div
                    key={label}
                    className="rounded px-2 py-1"
                    style={{ background: 'rgba(255,26,46,0.04)', border: '1px solid rgba(255,26,46,0.12)' }}
                  >
                    <div className="font-bold text-[11px] tabular-nums leading-none" style={{ color: col }}>{value}</div>
                    <div className="text-[5.5px] mt-0.5" style={{ color: '#2a3a4a' }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* IHL note */}
              <div
                className="rounded px-2 py-1.5 flex items-start gap-1.5"
                style={{ background: 'rgba(255,26,46,0.06)', border: '1px solid rgba(255,26,46,0.18)' }}
              >
                <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" style={{ color: '#ff6600' }} />
                <div className="text-[6.5px] leading-relaxed" style={{ color: '#536878' }}>
                  <span style={{ color: '#ccd6e0', fontWeight: 700 }}>ICRC position: </span>
                  LAWS must allow humans to exercise "genuine" control — which requires sufficient time, information, and ability to prevent an attack. A 20-second rubber stamp does not qualify.
                </div>
              </div>

              {/* Source */}
              <div className="pointer-events-auto flex justify-end">
                <a
                  href="https://www.972mag.com/lavender-ai-israeli-army-gaza/"
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[6px] transition-colors"
                  style={{ color: '#2a3a4a' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#0096ff')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#2a3a4a')}
                >
                  <ExternalLink className="w-2 h-2 shrink-0" />
                  +972 Magazine — Lavender AI (Apr 2024)
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
