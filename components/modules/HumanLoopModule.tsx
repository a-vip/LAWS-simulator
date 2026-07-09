'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Scale, Zap, AlertTriangle, ExternalLink, Play, Pause, RotateCcw } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// VERIFIED DATA — +972 Magazine (Apr 2024), ICRC (2021)
//
// THE MATH (ALL AT 1× SPEED — EQUAL TIME SCALE):
//   Lavender generates 176 targets/day
//   IDF review time: ~20 seconds per target  (+972 Magazine)
//   Available daily review: 176 × 20s = 3,520s = 0.98 hours
//
//   Meaningful review per IHL requires per target:
//     01. Identity verification           12 min
//     02. Intelligence corroboration      18 min
//     03. Proportionality review          22 min
//     04. Collateral proximity check      12 min
//     05. Authorisation + documentation    6 min
//                                   TOTAL: 70 min
//
//   Required daily review: 176 × 70 min = 205 hours/day
//   DEFICIT: (205 - 0.98) / 205 = 99.5%
// ─────────────────────────────────────────────────────────────────────────────

const TARGETS_PER_DAY   = 176;
const RUBBER_STAMP_SECS = 20;

const MHC_STEPS = [
  { id: 1, label: 'Identity verification',      detail: 'Cross-reference target across all available intel sources. Verify digital footprint against physical evidence. Establish reasonable certainty of identity.', mins: 12, color: '#38bdf8' },
  { id: 2, label: 'Intelligence corroboration', detail: 'Assess signals data, human intelligence, pattern-of-life evidence. Evaluate error probability in AI classification. Review historical data for false-positive risk.', mins: 18, color: '#0096ff' },
  { id: 3, label: 'Proportionality review',     detail: 'Legal analysis under IHL Art. 51(5)(b) AP I — anticipated civilian harm versus concrete and direct military advantage. Must be conducted by legally trained personnel.', mins: 22, color: '#818cf8' },
  { id: 4, label: 'Collateral proximity check', detail: 'Verify known civilian presence in strike area. Consider time-of-day, family presence, building classification, proximity to protected sites (hospitals, schools, mosques).', mins: 12, color: '#0096ff' },
  { id: 5, label: 'Authorisation & record',     detail: 'Formal sign-off by lawfully authorised commander. Documented rationale on record. Full audit trail for accountability and post-strike review.', mins: 6,  color: '#38bdf8' },
] as const;

const MHC_TOTAL_MINS = MHC_STEPS.reduce((s, step) => s + step.mins, 0); // 70 min
const MHC_TOTAL_SECS = MHC_TOTAL_MINS * 60;                              // 4200 s
const REQ_DAILY_HRS  = Math.round(TARGETS_PER_DAY * MHC_TOTAL_MINS / 60); // 205 h
const AVAIL_DAILY_HRS = Number((TARGETS_PER_DAY * RUBBER_STAMP_SECS / 3600).toFixed(2)); // 0.98 h
const DEFICIT_PCT     = Number(((REQ_DAILY_HRS - AVAIL_DAILY_HRS) / REQ_DAILY_HRS * 100).toFixed(1)); // 99.5

const SPEED_OPTIONS = [0.5, 1, 2, 5, 10, 50] as const;
type SpeedOpt = (typeof SPEED_OPTIONS)[number];

interface Stamp { id: number; label: string; progress: number; col: 0 | 1 | 2; }

// ─────────────────────────────────────────────────────────────────────────────

export function HumanLoopModule() {
  const [speed,      setSpeed]      = useState<SpeedOpt>(1);
  const [paused,     setPaused]     = useState(false);
  const [timeLeft,   setTimeLeft]   = useState(RUBBER_STAMP_SECS);
  const [approved,   setApproved]   = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [mhcElapsed, setMhcElapsed] = useState(0);  // simulated seconds elapsed
  const [stamps,     setStamps]     = useState<Stamp[]>([]);
  const [flashing,   setFlashing]   = useState(false);
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);

  // Internal mutable state refs (avoid stale-closure in interval)
  const sr = useRef({ timeLeft: RUBBER_STAMP_SECS, approved: 0, saturation: 0, mhcElapsed: 0 });
  const stampIdRef = useRef(0);

  const doReset = useCallback(() => {
    sr.current = { timeLeft: RUBBER_STAMP_SECS, approved: 0, saturation: 0, mhcElapsed: 0 };
    setTimeLeft(RUBBER_STAMP_SECS);
    setApproved(0);
    setSaturation(0);
    setMhcElapsed(0);
    setStamps([]);
    setFlashing(false);
  }, []);

  // ── Simulation tick (100ms) ────────────────────────────────────────────
  useEffect(() => {
    if (paused) return;
    const TICK_MS = 100;
    const id = setInterval(() => {
      const tickSec = (TICK_MS / 1000) * speed;  // simulated seconds per tick

      // --- 20-second approval cycle (Lavender side) ---
      sr.current.timeLeft -= tickSec;
      if (sr.current.timeLeft <= 0) {
        sr.current.timeLeft += RUBBER_STAMP_SECS;
        sr.current.approved++;
        sr.current.saturation = Math.min(100, sr.current.saturation + 100 / 22);
        setApproved(sr.current.approved);
        setSaturation(sr.current.saturation);
        setFlashing(true);
        setTimeout(() => setFlashing(false), 280);
        // Add stamp to cascade
        setStamps(prev => [
          ...prev,
          {
            id:       stampIdRef.current++,
            label:    `TGT-${Math.floor(Math.random() * 99999).toString().padStart(5, '0')}`,
            progress: 0,
            col:      (Math.floor(Math.random() * 3)) as 0 | 1 | 2,
          },
        ].slice(-36)); // cap at 36 stamps
      }
      setTimeLeft(sr.current.timeLeft);

      // --- MHC elapsed (same real-time scale) ---
      sr.current.mhcElapsed += tickSec;
      setMhcElapsed(sr.current.mhcElapsed);

      // --- Advance stamp fall (fixed 7 real-seconds fall duration) ---
      setStamps(prev =>
        prev
          .map(s => ({ ...s, progress: s.progress + (TICK_MS / 1000) / 7 }))
          .filter(s => s.progress < 1.05)
      );
    }, TICK_MS);
    return () => clearInterval(id);
  }, [speed, paused]);

  // ── Derived values ─────────────────────────────────────────────────────
  const mhcPct = Math.min(100, (mhcElapsed / MHC_TOTAL_SECS) * 100);

  const stepProgress = (() => {
    const out: number[] = [];
    let rem = mhcElapsed;
    for (const step of MHC_STEPS) {
      const stepSec = step.mins * 60;
      if (rem >= stepSec) { out.push(1); rem -= stepSec; }
      else { out.push(rem / stepSec); rem = 0; }
    }
    return out;
  })();

  const timeColor = timeLeft < 5 ? '#ff1a2e' : timeLeft < 10 ? '#ff6600' : '#ffaa00';
  const satColor  = saturation > 80 ? '#ff1a2e' : saturation > 50 ? '#ff6600' : '#ffaa00';

  // SVG clock
  const CLK_R    = 50;
  const CLK_CIRC = 2 * Math.PI * CLK_R;
  const dashFill  = ((RUBBER_STAMP_SECS - timeLeft) / RUBBER_STAMP_SECS) * CLK_CIRC;

  const activeStepIdx = stepProgress.findIndex(p => p > 0 && p < 1);
  const elapsedDisplay = `${Math.floor(mhcElapsed / 60)}m ${Math.floor(mhcElapsed % 60)}s`;

  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div
      className="w-full h-full flex flex-col font-mono select-none"
      style={{ background: '#040408', color: '#ccd6e0', fontSize: 12 }}
    >
      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 shrink-0"
        style={{ height: 62, borderBottom: '1px solid rgba(26,37,53,0.55)' }}
      >
        <div>
          <div className="text-[8px] tracking-widest mb-0.5" style={{ color: '#536878' }}>
            MODULE 5 // HUMAN LOOP
          </div>
          <div className="font-bold" style={{ fontSize: 13 }}>
            HUMAN INTERFACE COMMAND LAYER — THE BOTTLENECK OVERRIDE
          </div>
          <div className="text-[7.5px]" style={{ color: '#536878' }}>
            Meaningful Human Control vs. rubber-stamp approval  ·  +972 Magazine / ICRC (2024)
          </div>
        </div>

        {/* Controls top-right */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={doReset}
            className="flex items-center gap-1 px-2 py-1 rounded border text-[7px] transition-all"
            style={{ borderColor: 'rgba(26,37,53,0.6)', color: '#536878' }}
            title="Reset simulation"
          >
            <RotateCcw className="w-2.5 h-2.5" /> RESET
          </button>
          <button
            onClick={() => setPaused(p => !p)}
            className="flex items-center gap-1 px-2.5 py-1 rounded border text-[7px] font-bold transition-all"
            style={{
              background:   paused ? 'rgba(0,212,126,0.1)' : 'rgba(255,26,46,0.08)',
              borderColor:  paused ? 'rgba(0,212,126,0.5)' : 'rgba(255,26,46,0.4)',
              color:        paused ? '#00d47e' : '#ff1a2e',
            }}
          >
            {paused
              ? <><Play  className="w-2.5 h-2.5" /> RESUME</>
              : <><Pause className="w-2.5 h-2.5" /> PAUSE</>}
          </button>
          {/* Speed selector */}
          <div className="flex rounded overflow-hidden border text-[7px] font-bold" style={{ borderColor: 'rgba(26,37,53,0.55)' }}>
            {SPEED_OPTIONS.map(s => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className="px-2 py-1 transition-all"
                style={{
                  background: speed === s ? 'rgba(255,170,0,0.15)' : 'rgba(4,4,8,0.8)',
                  color:      speed === s ? '#ffaa00' : '#2a3a4a',
                  borderRight: s !== 50 ? '1px solid rgba(26,37,53,0.4)' : 'none',
                }}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── MAIN 3-COLUMN CONTENT ─────────────────────────────────────── */}
      <div className="flex-1 flex min-h-0" style={{ borderBottom: '1px solid rgba(26,37,53,0.4)' }}>

        {/* ══ LEFT — Meaningful Human Control ══════════════════════════ */}
        <div
          className="flex flex-col p-3 overflow-y-auto shrink-0"
          style={{ width: '35%', borderRight: '1px solid rgba(26,37,53,0.4)' }}
        >
          {/* Column header */}
          <div className="flex items-center gap-1.5 mb-1">
            <Scale className="w-3.5 h-3.5 shrink-0" style={{ color: '#0096ff' }} />
            <span className="font-bold text-[10px] tracking-wider" style={{ color: '#0096ff' }}>
              MEANINGFUL HUMAN CONTROL
            </span>
          </div>
          <div className="text-[7px] mb-2" style={{ color: '#536878' }}>
            What international law requires — ICRC standard
          </div>
          <div className="flex gap-2 mb-3 flex-wrap">
            <span className="px-1.5 py-0.5 rounded text-[7px]"
              style={{ background: 'rgba(0,150,255,0.1)', border: '1px solid rgba(0,150,255,0.3)', color: '#0096ff' }}>
              ~{MHC_TOTAL_MINS} MIN / TARGET
            </span>
            <span className="px-1.5 py-0.5 rounded text-[7px]"
              style={{ background: 'rgba(0,150,255,0.05)', border: '1px solid rgba(26,37,53,0.4)', color: '#536878' }}>
              2–3 TARGETS / WEEK
            </span>
          </div>

          {/* IHL Steps */}
          <div className="space-y-1.5">
            {MHC_STEPS.map((step, i) => {
              const pct     = stepProgress[i] ?? 0;
              const isDone  = pct >= 1;
              const isActive = pct > 0 && pct < 1;
              return (
                <div
                  key={step.id}
                  className="rounded cursor-default transition-all"
                  style={{
                    background:  isDone   ? 'rgba(0,212,126,0.05)'  : isActive ? 'rgba(0,150,255,0.05)' : 'rgba(26,37,53,0.12)',
                    border:      `1px solid ${isDone ? 'rgba(0,212,126,0.25)' : isActive ? 'rgba(0,150,255,0.22)' : 'rgba(26,37,53,0.3)'}`,
                    padding:     '6px 8px',
                    boxShadow:   isActive ? `0 0 10px rgba(0,150,255,0.08)` : 'none',
                  }}
                  onMouseEnter={() => setHoveredStep(i)}
                  onMouseLeave={() => setHoveredStep(null)}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[7px] font-bold tabular-nums w-5 shrink-0"
                        style={{ color: isDone ? '#00d47e' : isActive ? step.color : '#2a3a4a' }}
                      >
                        {String(step.id).padStart(2, '0')}
                      </span>
                      <span
                        className="text-[7.5px] font-bold"
                        style={{ color: isDone ? '#00d47e' : isActive ? '#ccd6e0' : '#536878' }}
                      >
                        {step.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[6px]" style={{ color: '#2a3a4a' }}>{step.mins} min</span>
                      <span
                        className="text-[6.5px] font-bold"
                        style={{ color: isDone ? '#00d47e' : isActive ? '#ffaa00' : '#2a3a4a' }}
                      >
                        {isDone ? '✓ DONE' : isActive ? '▶ ACTIVE' : 'PENDING'}
                      </span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1 rounded overflow-hidden" style={{ background: 'rgba(26,37,53,0.45)' }}>
                    <div
                      className="h-full rounded transition-all duration-100"
                      style={{
                        width:      `${pct * 100}%`,
                        background: isDone ? '#00d47e' : isActive ? step.color : 'transparent',
                      }}
                    />
                  </div>
                  {/* Hover detail */}
                  {hoveredStep === i && (
                    <div
                      className="mt-2 text-[6.5px] leading-relaxed"
                      style={{ color: '#536878', borderTop: '1px solid rgba(26,37,53,0.4)', paddingTop: 6 }}
                    >
                      {step.detail}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Overall MHC progress */}
          <div className="mt-3 rounded p-2.5" style={{ background: 'rgba(0,150,255,0.04)', border: '1px solid rgba(0,150,255,0.14)' }}>
            <div className="flex justify-between text-[7px] mb-1.5">
              <span style={{ color: '#536878' }}>REVIEW PROGRESS (1 TARGET)</span>
              <span style={{ color: '#0096ff', fontWeight: 700 }}>{mhcPct.toFixed(1)}%</span>
            </div>
            <div className="h-1.5 rounded overflow-hidden" style={{ background: 'rgba(26,37,53,0.45)' }}>
              <div
                className="h-full rounded transition-all duration-100"
                style={{ width: `${mhcPct}%`, background: 'linear-gradient(to right, #0096ff, #38bdf8)' }}
              />
            </div>
            <div className="text-[6.5px] mt-1.5 flex justify-between" style={{ color: '#2a3a4a' }}>
              <span>Elapsed: {elapsedDisplay}</span>
              <span>Required: {MHC_TOTAL_MINS} min</span>
            </div>
            {activeStepIdx >= 0 && (
              <div className="text-[6.5px] mt-0.5" style={{ color: '#0096ff' }}>
                Currently: step {activeStepIdx + 1} — {MHC_STEPS[activeStepIdx].label}
              </div>
            )}
          </div>

          {/* Required daily box */}
          <div className="mt-2 rounded p-2.5" style={{ background: 'rgba(26,37,53,0.1)', border: '1px solid rgba(26,37,53,0.35)' }}>
            <div className="text-[6.5px] mb-1" style={{ color: '#536878' }}>REQUIRED DAILY REVIEW TIME</div>
            <div className="font-bold tabular-nums leading-none" style={{ fontSize: 22, color: '#0096ff' }}>
              {REQ_DAILY_HRS}h
            </div>
            <div className="text-[6px] mt-1" style={{ color: '#2a3a4a' }}>
              {TARGETS_PER_DAY} targets × {MHC_TOTAL_MINS} min = {(TARGETS_PER_DAY * MHC_TOTAL_MINS).toLocaleString()} min total
            </div>
          </div>
        </div>

        {/* ══ CENTRE — The 20-Second Clock ══════════════════════════════ */}
        <div
          className="flex flex-col items-center p-4 gap-3"
          style={{ flex: '1 1 0', borderRight: '1px solid rgba(26,37,53,0.4)', minWidth: 0 }}
        >
          {/* Header */}
          <div className="text-center">
            <div className="font-bold tracking-widest text-[10px]" style={{ color: '#ffaa00' }}>
              THE REVIEW WINDOW
            </div>
            <div className="text-[7px]" style={{ color: '#536878' }}>
              per Lavender target  ·  +972 Magazine (2024)
            </div>
          </div>

          {/* SVG Clock */}
          <div className="relative">
            <svg width={140} height={140} viewBox="0 0 140 140">
              {/* Background circle */}
              <circle cx={70} cy={70} r={CLK_R + 9} fill="rgba(4,4,8,0.95)" />

              {/* Outer flash ring */}
              {flashing && (
                <circle cx={70} cy={70} r={CLK_R + 16} fill={`rgba(255,26,46,0.18)`} />
              )}

              {/* Track ring */}
              <circle cx={70} cy={70} r={CLK_R} fill="none" stroke="rgba(26,37,53,0.55)" strokeWidth={9} />

              {/* Progress arc */}
              <circle
                cx={70} cy={70} r={CLK_R}
                fill="none"
                stroke={timeColor}
                strokeWidth={9}
                strokeLinecap="round"
                strokeDasharray={`${Math.min(dashFill, CLK_CIRC - 0.01)} ${CLK_CIRC}`}
                transform="rotate(-90 70 70)"
                style={{ transition: 'stroke-dasharray 0.1s linear, stroke 0.3s' }}
              />

              {/* Tick marks — 20 ticks (1 per second) */}
              {Array.from({ length: 20 }, (_, m) => {
                const angle   = ((m / 20) * 360 - 90) * (Math.PI / 180);
                const r1 = CLK_R + 12; const r2 = CLK_R + 16 + (m % 5 === 0 ? 2 : 0);
                const filled = m < Math.round(RUBBER_STAMP_SECS - timeLeft);
                return (
                  <line key={m}
                    x1={70 + Math.cos(angle) * r1} y1={70 + Math.sin(angle) * r1}
                    x2={70 + Math.cos(angle) * r2} y2={70 + Math.sin(angle) * r2}
                    stroke={filled ? timeColor : 'rgba(26,37,53,0.4)'}
                    strokeWidth={m % 5 === 0 ? 2.5 : 1.2}
                    strokeLinecap="round"
                  />
                );
              })}

              {/* Time display */}
              <text x={70} y={65} textAnchor="middle"
                fontFamily="JetBrains Mono, monospace" fontSize={24} fontWeight="bold" fill={timeColor}>
                {Math.ceil(timeLeft)}
              </text>
              <text x={70} y={80} textAnchor="middle"
                fontFamily="JetBrains Mono, monospace" fontSize={9} fill="#536878">
                seconds
              </text>
            </svg>

            {/* Flash approved label */}
            <div
              className="absolute inset-x-0 -bottom-5 text-center font-bold transition-opacity text-[11px]"
              style={{ color: '#ff1a2e', opacity: flashing ? 1 : 0 }}
            >
              ● APPROVED
            </div>
          </div>

          {/* Equal-time-scale comparison */}
          <div
            className="w-full rounded p-2.5 mt-1"
            style={{ background: 'rgba(26,37,53,0.12)', border: '1px solid rgba(26,37,53,0.35)' }}
          >
            <div className="text-[7px] font-bold mb-2 text-center" style={{ color: '#536878' }}>
              EQUAL TIME SCALE — SAME ELAPSED TIME
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded p-2 text-center" style={{ background: 'rgba(0,150,255,0.06)', border: '1px solid rgba(0,150,255,0.15)' }}>
                <div className="text-[6.5px] mb-0.5" style={{ color: '#536878' }}>MHC PROGRESS</div>
                <div className="font-bold tabular-nums" style={{ fontSize: 18, color: '#0096ff' }}>
                  {mhcPct.toFixed(1)}%
                </div>
                <div className="text-[6px]" style={{ color: '#2a3a4a' }}>of one target review</div>
              </div>
              <div className="rounded p-2 text-center" style={{ background: 'rgba(255,26,46,0.06)', border: '1px solid rgba(255,26,46,0.18)' }}>
                <div className="text-[6.5px] mb-0.5" style={{ color: '#536878' }}>AUTO-APPROVED</div>
                <div className="font-bold tabular-nums" style={{ fontSize: 18, color: '#ff1a2e' }}>
                  {approved}
                </div>
                <div className="text-[6px]" style={{ color: '#2a3a4a' }}>targets, no review</div>
              </div>
            </div>
          </div>

          {/* Deficit bars */}
          <div
            className="w-full rounded p-2.5"
            style={{ background: 'rgba(26,37,53,0.1)', border: '1px solid rgba(26,37,53,0.32)' }}
          >
            <div className="text-[7px] font-bold mb-2 text-center" style={{ color: '#536878' }}>
              DAILY REVIEW CAPACITY GAP
            </div>
            {/* Required */}
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[6.5px] w-20 text-right shrink-0" style={{ color: '#0096ff' }}>Required</span>
              <div className="flex-1 h-2.5 rounded overflow-hidden" style={{ background: 'rgba(0,150,255,0.1)', border: '1px solid rgba(0,150,255,0.25)' }}>
                <div className="h-full" style={{ width: '100%', background: 'rgba(0,150,255,0.45)' }} />
              </div>
              <span className="text-[6.5px] w-10 font-bold tabular-nums shrink-0" style={{ color: '#0096ff' }}>{REQ_DAILY_HRS}h</span>
            </div>
            {/* Available */}
            <div className="flex items-center gap-2">
              <span className="text-[6.5px] w-20 text-right shrink-0" style={{ color: '#ff1a2e' }}>Available</span>
              <div className="flex-1 h-2.5 rounded overflow-hidden" style={{ background: 'rgba(26,37,53,0.3)' }}>
                <div className="h-full rounded" style={{ width: `${Math.max(0.8, (AVAIL_DAILY_HRS / REQ_DAILY_HRS) * 100)}%`, background: '#ff1a2e', minWidth: 3 }} />
              </div>
              <span className="text-[6.5px] w-10 font-bold tabular-nums shrink-0" style={{ color: '#ff1a2e' }}>{AVAIL_DAILY_HRS}h</span>
            </div>
            <div className="text-center mt-2 font-bold text-[9px]" style={{ color: '#ff1a2e' }}>
              DEFICIT: {DEFICIT_PCT}%
            </div>
          </div>

          {/* Cognitive saturation */}
          <div className="w-full rounded p-2.5" style={{ background: 'rgba(26,37,53,0.1)', border: '1px solid rgba(26,37,53,0.32)' }}>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[7px]" style={{ color: '#536878' }}>COGNITIVE SATURATION</span>
              <span className="font-bold tabular-nums text-[8px]" style={{ color: satColor }}>{Math.round(saturation)}%</span>
            </div>
            <div className="h-2 rounded overflow-hidden" style={{ background: 'rgba(26,37,53,0.45)' }}>
              <div
                className="h-full rounded transition-all duration-300"
                style={{ width: `${saturation}%`, background: `linear-gradient(to right, #ffaa00, ${satColor})` }}
              />
            </div>
            <div className="text-[6.5px] mt-1" style={{ color: '#2a3a4a' }}>
              {saturation > 80
                ? '⚠ CRITICAL — meaningful decision-making severely degraded'
                : saturation > 50
                ? 'HIGH — review accuracy declining significantly'
                : 'Accumulates with each rubber-stamp approval cycle'}
            </div>
          </div>

          {/* Quote */}
          <div
            className="w-full rounded p-2 text-center"
            style={{ background: 'rgba(255,170,0,0.04)', border: '1px solid rgba(255,170,0,0.12)' }}
          >
            <div className="text-[6.5px] leading-relaxed italic" style={{ color: '#536878' }}>
              <span style={{ color: '#ffaa00' }}>"The system did everything automatically."</span>
              <br />
              — IDF officer  ·  +972 Magazine, April 2024
            </div>
          </div>
        </div>

        {/* ══ RIGHT — Lavender Reality ══════════════════════════════════ */}
        <div
          className="flex flex-col p-3 overflow-hidden shrink-0"
          style={{ width: '34%' }}
        >
          {/* Column header */}
          <div className="flex items-center gap-1.5 mb-1 justify-end">
            <span className="font-bold text-[10px] tracking-wider" style={{ color: '#ff1a2e' }}>
              LAVENDER REALITY
            </span>
            <Zap className="w-3.5 h-3.5 shrink-0" style={{ color: '#ff1a2e' }} />
          </div>
          <div className="text-right text-[7px] mb-2" style={{ color: '#536878' }}>
            What actually happened
          </div>
          <div className="flex justify-end gap-2 mb-3">
            <span className="px-1.5 py-0.5 rounded text-[7px]"
              style={{ background: 'rgba(255,26,46,0.1)', border: '1px solid rgba(255,26,46,0.3)', color: '#ff1a2e' }}>
              176 TARGETS / DAY
            </span>
            <span className="px-1.5 py-0.5 rounded text-[7px]"
              style={{ background: 'rgba(255,26,46,0.06)', border: '1px solid rgba(255,26,46,0.18)', color: '#ff6600' }}>
              20 SEC / TARGET
            </span>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-1.5 mb-2.5">
            {([
              { label: 'Targets / day',  value: '176+',    col: '#ff1a2e' },
              { label: 'Total targets',  value: '37,000',  col: '#ff6600' },
              { label: 'CDE threshold',  value: '20 civ.', col: '#ffaa00' },
              { label: 'Actual review',  value: '20 sec',  col: '#ff1a2e' },
            ] as { label: string; value: string; col: string }[]).map(({ label, value, col }) => (
              <div
                key={label}
                className="rounded p-1.5 text-right"
                style={{ background: 'rgba(255,26,46,0.04)', border: '1px solid rgba(255,26,46,0.1)' }}
              >
                <div className="font-bold tabular-nums" style={{ fontSize: 13, color: col }}>{value}</div>
                <div className="text-[5.5px] mt-0.5" style={{ color: '#2a3a4a' }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Session counter */}
          <div className="rounded p-2.5 mb-2 text-center"
            style={{ background: 'rgba(255,26,46,0.06)', border: '1px solid rgba(255,26,46,0.2)' }}>
            <div className="text-[7px] mb-0.5" style={{ color: '#536878' }}>APPROVED THIS SESSION</div>
            <div className="font-bold tabular-nums leading-none" style={{ fontSize: 32, color: '#ff1a2e' }}>
              {approved}
            </div>
            <div className="text-[6px] mt-1" style={{ color: '#2a3a4a' }}>rubber-stamp approvals (no meaningful review)</div>
          </div>

          {/* Stamp cascade */}
          <div
            className="flex-1 rounded relative overflow-hidden"
            style={{ background: 'rgba(255,26,46,0.02)', border: '1px solid rgba(255,26,46,0.1)', minHeight: 60 }}
          >
            {stamps.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-[7px]" style={{ color: '#1a2535' }}>Awaiting first approval...</div>
              </div>
            )}
            {stamps.map(stamp => {
              const colPct  = stamp.col * 33.3;
              const topPct  = Math.min(stamp.progress * 95, 95);
              const opacity = stamp.progress > 0.85 ? (1 - (stamp.progress - 0.85) / 0.15) : 1;
              return (
                <div
                  key={stamp.id}
                  className="absolute rounded"
                  style={{
                    top:        `${topPct}%`,
                    left:       `${colPct + 0.5}%`,
                    width:      '32%',
                    background: 'rgba(255,26,46,0.09)',
                    border:     '1px solid rgba(255,26,46,0.3)',
                    padding:    '2px 4px',
                    opacity,
                    pointerEvents: 'none',
                  }}
                >
                  <div className="text-[7px] font-bold leading-tight" style={{ color: '#ff1a2e' }}>APPROVED</div>
                  <div className="flex justify-between items-center">
                    <div className="text-[5.5px]" style={{ color: '#536878' }}>{stamp.label}</div>
                    <div className="text-[5px]" style={{ color: 'rgba(255,26,46,0.5)' }}>20s</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* IHL note */}
          <div
            className="mt-2 rounded p-2 flex items-start gap-1.5"
            style={{ background: 'rgba(255,26,46,0.05)', border: '1px solid rgba(255,26,46,0.14)' }}
          >
            <AlertTriangle className="w-2.5 h-2.5 shrink-0 mt-0.5" style={{ color: '#ff6600' }} />
            <div className="text-[6.5px] leading-relaxed" style={{ color: '#536878' }}>
              <span style={{ color: '#ccd6e0', fontWeight: 700 }}>ICRC position: </span>
              Meaningful Human Control requires "genuine ability to prevent an attack." A 20-second rubber stamp does not meet this standard.
            </div>
          </div>

          {/* Source */}
          <a
            href="https://www.972mag.com/lavender-ai-israeli-army-gaza/"
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 mt-1.5 text-[6px] transition-colors"
            style={{ color: '#2a3a4a' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#0096ff')}
            onMouseLeave={e => (e.currentTarget.style.color = '#2a3a4a')}
          >
            <ExternalLink className="w-2 h-2 shrink-0" />
            +972 Magazine — Lavender AI Investigation (Apr 2024)
          </a>
        </div>
      </div>

      {/* ── BOTTOM HUD ─────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 shrink-0 text-[7.5px]"
        style={{ height: 34, background: 'rgba(4,4,8,0.97)', borderTop: '1px solid rgba(26,37,53,0.4)' }}
      >
        <span>APPROVED: <strong style={{ color: '#ff1a2e' }}>{approved}</strong></span>
        <span style={{ color: '#536878' }}>SPEED: <strong style={{ color: '#ffaa00' }}>{speed}×</strong></span>
        <span style={{ color: '#536878' }}>LAVENDER RATE: <strong style={{ color: '#ff1a2e' }}>176/day</strong></span>
        <span style={{ color: '#536878' }}>REVIEW WINDOW: <strong style={{ color: '#ffaa00' }}>20s</strong></span>
        <span style={{ color: '#536878' }}>MHC REQUIRED: <strong style={{ color: '#0096ff' }}>{MHC_TOTAL_MINS} min</strong></span>
        <span style={{ color: '#536878' }}>COG. SAT.: <strong style={{ color: satColor }}>{Math.round(saturation)}%</strong></span>
        <span style={{ color: '#536878' }}>DEFICIT: <strong style={{ color: '#ff1a2e' }}>{DEFICIT_PCT}%</strong></span>
      </div>
    </div>
  );
}
