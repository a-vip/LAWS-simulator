'use client';
import { useSimulationStore } from '@/store/simulation';
import { CheckCircle, Clock, Cpu, AlertTriangle, FileCheck2, Timer, User, Shield } from 'lucide-react';
import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Rubber-stamp countdown timer for the "Intelligence Review" step
// ─────────────────────────────────────────────────────────────────────────────
function RubberStampReview({ onApprove, approved }: { onApprove: () => void; approved: boolean }) {
  const [seconds, setSeconds] = useState(30);
  const [stampVisible, setStampVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (approved) { setStampVisible(true); return; }
    setSeconds(30);
    timerRef.current = setInterval(() => {
      setSeconds(s => Math.max(0, s - 1));
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [approved]);

  const handleApprove = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setStampVisible(true);
    onApprove();
  };

  const urgency = seconds <= 10 ? 'text-terminal-red' : seconds <= 20 ? 'text-terminal-amber' : 'text-terminal-text-dim';

  return (
    <div className={clsx(
      'relative border rounded p-2.5 font-mono text-[9px] overflow-hidden transition-all',
      approved ? 'border-terminal-green/40 bg-terminal-green-dim/10' : 'border-terminal-amber/60 bg-terminal-amber-dim/10'
    )}>
      {/* Stamp overlay */}
      {stampVisible && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="border-[3px] border-terminal-red text-terminal-red rotate-[-15deg] px-3 py-1 font-black text-[20px] tracking-[4px] opacity-60 uppercase"
            style={{ fontFamily: 'var(--font-mono)', textShadow: '0 0 8px rgba(255,26,46,0.4)' }}>
            APPROVED
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="w-3 h-3 text-terminal-amber" />
          <span className="text-terminal-amber font-bold tracking-wider">INTELLIGENCE REVIEW</span>
        </div>
        {!approved && (
          <div className={clsx('flex items-center gap-1 font-bold', urgency)}>
            <Timer className="w-3 h-3" />
            <span>{seconds}s</span>
          </div>
        )}
      </div>

      {/* What the analyst sees / doesn't see */}
      <div className="space-y-1 mb-2 pl-0.5">
        <div className="text-terminal-green flex items-start gap-1.5">
          <span className="shrink-0 mt-0.5">✓</span>
          <span>Algorithm confidence: <span className="font-bold text-terminal-text">72%</span></span>
        </div>
        <div className="text-terminal-red/80 flex items-start gap-1.5">
          <span className="shrink-0 mt-0.5">✗</span>
          <span>Family members inside structure: <span className="font-bold">NOT SHOWN</span></span>
        </div>
        <div className="text-terminal-red/80 flex items-start gap-1.5">
          <span className="shrink-0 mt-0.5">✗</span>
          <span>Source reliability / data provenance: <span className="font-bold">NOT SHOWN</span></span>
        </div>
        <div className="text-terminal-red/80 flex items-start gap-1.5">
          <span className="shrink-0 mt-0.5">✗</span>
          <span>Model uncertainty range: <span className="font-bold">NOT SHOWN</span></span>
        </div>
      </div>

      {/* MHC quote */}
      <div className="border border-terminal-red/30 bg-terminal-red-dim/10 rounded p-1.5 mb-2 text-[8.5px] italic text-terminal-text-dim leading-relaxed">
        <span className="text-terminal-red not-italic font-bold">ICRC:</span>{' '}
        "Meaningful human control requires that a person understand and be able to predict system behaviour,
        and bear genuine legal and moral responsibility. A{' '}
        <span className={clsx('font-bold not-italic', approved ? 'text-terminal-red' : urgency)}>
          {approved ? '30' : seconds}-second
        </span>{' '}
        review window does not meet this standard."
      </div>

      {/* Warning */}
      {!approved && (
        <div className="text-terminal-amber/70 text-[8px] flex items-center gap-1 mb-2">
          <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
          This review window is <span className="font-bold text-terminal-red mx-1">not Meaningful Human Control</span>
        </div>
      )}

      {!approved && (
        <button
          onClick={handleApprove}
          className="w-full py-1.5 bg-terminal-amber/20 hover:bg-terminal-amber/30 border border-terminal-amber/50 text-terminal-amber text-[10px] font-bold tracking-widest rounded transition-all flex items-center justify-center gap-1.5"
        >
          <FileCheck2 className="w-3 h-3" />
          APPROVE — INTELLIGENCE CONCURRENCE
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Human Cost Counter — typed out after impact
// ─────────────────────────────────────────────────────────────────────────────
function HumanCostCounter({ collateralEstimate }: { collateralEstimate: { type: string; count: number }[] | undefined }) {
  if (!collateralEstimate || collateralEstimate.length === 0) {
    return (
      <div className="bg-terminal-card border border-terminal-red/50 rounded p-3 font-mono text-[9px] text-terminal-red animate-fade-in">
        <div className="font-bold tracking-widest flex items-center gap-1.5"><AlertTriangle className="w-3 h-3" /> POST-STRIKE CASUALTY ASSESSMENT</div>
        <div className="text-terminal-text-dim mt-1">Assessment data withheld. Engagement classified.</div>
      </div>
    );
  }
  const [revealed, setRevealed] = useState<number>(0);
  const [totalKilled, setTotalKilled] = useState<number>(0);

  useEffect(() => {
    setRevealed(0);
    setTotalKilled(0);
    const timer = setInterval(() => {
      setRevealed(r => {
        if (r >= collateralEstimate.length) { clearInterval(timer); return r; }
        return r + 1;
      });
    }, 1100);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const total = collateralEstimate.slice(0, revealed).reduce((sum, c) => sum + c.count, 0);
    setTotalKilled(total);
  }, [revealed]);

  return (
    <div className="bg-terminal-card border border-terminal-red/50 rounded p-3 font-mono animate-fade-in space-y-2">
      <div className="text-[9px] tracking-widest text-terminal-red font-bold flex items-center gap-1.5">
        <AlertTriangle className="w-3 h-3" />
        POST-STRIKE CASUALTY ASSESSMENT
      </div>

      <div className="text-[8.5px] text-terminal-text-dim">
        <span className="text-terminal-amber">TARGET STATUS:</span>{' '}
        <span className="text-terminal-red font-bold">UNCONFIRMED</span>
      </div>

      <div className="space-y-1">
        {collateralEstimate.slice(0, revealed).map((c, i) => (
          <div
            key={i}
            className="flex items-center gap-2 text-[9px] animate-fade-in"
          >
            <User className="w-2.5 h-2.5 text-terminal-red shrink-0" />
            <span className="text-terminal-text-dim">{c.type}:</span>
            <span className="font-bold text-terminal-red">{c.count} KILLED</span>
          </div>
        ))}
        {revealed < collateralEstimate.length && (
          <div className="text-[9px] text-terminal-text-faint flex items-center gap-1">
            <span className="animate-pulse">▋</span>
          </div>
        )}
      </div>

      {revealed >= collateralEstimate.length && (
        <div className="pt-1.5 border-t border-terminal-border text-[8.5px] text-terminal-red font-bold animate-fade-in">
          FILED AS: <span className="text-terminal-text">SUCCESSFUL ENGAGEMENT</span>
          <div className="text-[8px] text-terminal-amber/70 font-normal mt-0.5">
            ⚠ No accountability mechanism exists for this outcome.
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ENGAGEMENT WORKFLOW COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const PHASE_GROUPS = [
  'authorization_pending',
  'authorized',
  'drone_dispatched',
  'engagement',
  'impact',
  'assessment',
];

export function EngagementWorkflow() {
  const {
    phase,
    activeScenario,
    authorizationIndex,
    advancePhase,
    advanceAuthorization,
    confidenceScore,
  } = useSimulationStore();

  const isVisible = PHASE_GROUPS.includes(phase);
  if (!isVisible || !activeScenario) return null;

  const chain = activeScenario.authorizationChain;
  const isFullyAuthorized = authorizationIndex >= chain.length;

  // Impact / Assessment: show human cost counter
  if (phase === 'impact' || phase === 'assessment') {
    return (
      <div className="space-y-2 animate-fade-in">
        {/* Compact chain summary */}
        <div className="bg-terminal-card border border-terminal-red/40 rounded p-2 font-mono">
          <div className="text-[8px] text-terminal-text-faint flex items-center gap-1.5 mb-1.5">
            <Shield className="w-2.5 h-2.5 text-terminal-red" />
            <span className="tracking-widest">AUTHORIZATION CHAIN — COMPLETE</span>
          </div>
          <div className="flex gap-1 flex-wrap">
            {chain.map((s, i) => (
              <span key={i} className="text-[7.5px] font-bold text-terminal-green bg-terminal-green-dim/20 border border-terminal-green/30 px-1.5 py-0.5 rounded">✓ {s.entity}</span>
            ))}
          </div>
        </div>

        {phase === 'assessment' && (
          <HumanCostCounter collateralEstimate={activeScenario.collateralEstimate ?? []} />
        )}

        {phase === 'impact' && (
          <div className="bg-terminal-card border border-terminal-red rounded p-3 font-mono text-center animate-fade-in">
            <div className="text-terminal-red text-[11px] font-black tracking-widest animate-pulse">STRIKE COMPLETE</div>
            <div className="text-[8px] text-terminal-text-faint mt-1">Processing post-strike assessment...</div>
            <button
              onClick={() => advancePhase()}
              className="mt-2 w-full py-1.5 border border-terminal-border text-terminal-text-dim text-[9px] tracking-widest rounded hover:text-terminal-text transition-colors"
            >
              VIEW ASSESSMENT →
            </button>
          </div>
        )}
      </div>
    );
  }

  // Engagement phase: dramatic terminal countdown
  if (phase === 'engagement') {
    return (
      <div className="bg-terminal-card border-2 border-terminal-red rounded p-3 font-mono space-y-2 animate-fade-in">
        <div className="text-terminal-red text-[10px] font-black tracking-widest text-center animate-pulse flex items-center justify-center gap-2">
          <span className="w-2 h-2 bg-terminal-red rounded-full animate-ping" />
          TERMINAL PHASE — ASSET ON FINAL APPROACH
          <span className="w-2 h-2 bg-terminal-red rounded-full animate-ping" />
        </div>
        <div className="grid grid-cols-2 gap-1.5 text-[8.5px]">
          <div className="text-terminal-text-faint">BETA STATUS: <span className="text-terminal-red font-bold">WEAPONS FREE</span></div>
          <div className="text-terminal-text-faint">TARGET LOCK: <span className="text-terminal-green font-bold">CONFIRMED</span></div>
          <div className="text-terminal-text-faint">PLATFORM: <span className="text-terminal-text">MQ-9 BETA</span></div>
          <div className="text-terminal-text-faint">ORDNANCE: <span className="text-terminal-text">AGM-114 HELLFIRE</span></div>
        </div>
        <div className="text-[8px] text-terminal-amber/80 border-t border-terminal-border pt-2">
          ⚠ Subject has not been visually confirmed in the last 4 minutes. Strike proceeding on coordinate lock only.
        </div>
        <button
          onClick={() => advancePhase()}
          className="w-full py-2.5 bg-terminal-red text-white text-[11px] font-black tracking-[3px] rounded hover:bg-red-700 transition-colors animate-pulse-red"
        >
          FIRE MISSION — EXECUTE ▶
        </button>
      </div>
    );
  }

  // Drone dispatched: drones hunting
  if (phase === 'drone_dispatched') {
    return (
      <div className="bg-terminal-card border border-terminal-red/60 rounded p-3 font-mono space-y-2 animate-fade-in">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-terminal-red rounded-full animate-pulse shrink-0" />
          <span className="text-[10px] text-terminal-red font-bold tracking-widest">ASSETS IN FLIGHT — HUNTING</span>
        </div>
        <div className="space-y-1 text-[8.5px] text-terminal-text-dim">
          <div>MQ-9 ALPHA — ISR — <span className="text-terminal-blue">WIDE SEARCH PATTERN</span></div>
          <div>MQ-9 BETA — STRIKE — <span className="text-terminal-red">CONVERGING ON TARGET AREA</span></div>
          <div>MQ-9 GAMMA — OVERWATCH — <span className="text-terminal-amber">HIGH ALTITUDE HOLD</span></div>
        </div>
        <div className="text-[8px] text-terminal-amber/70 border-t border-terminal-border pt-1.5">
          ⚠ Drones are hunting based on last known coordinates. Target is mobile.
        </div>
        <button
          onClick={() => advancePhase()}
          className="w-full py-2 bg-terminal-red text-white text-[10px] font-bold tracking-widest rounded hover:bg-red-700 transition-colors animate-pulse-red"
        >
          TARGET ACQUIRED — INITIATE ENGAGEMENT →
        </button>
      </div>
    );
  }

  // Authorized: drones deploying
  if (phase === 'authorized') {
    return (
      <div className="bg-terminal-card border border-terminal-green/40 rounded p-3 font-mono space-y-2 animate-fade-in">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-3.5 h-3.5 text-terminal-green shrink-0" />
          <span className="text-[10px] text-terminal-green font-bold tracking-widest">ENGAGEMENT AUTHORIZED</span>
        </div>
        <div className="text-[8.5px] text-terminal-text-dim space-y-1">
          <div>Assets confirmed: <span className="text-terminal-blue font-bold">3× MQ-9 REAPER</span></div>
          <div>Breaking loiter orbit at <span className="text-terminal-text">FOB CERULEAN</span></div>
          <div>Transit to target: <span className="text-terminal-amber">~4 MINUTES</span></div>
        </div>
        <div className="text-[8px] text-terminal-text-faint border border-terminal-border rounded p-1.5 flex items-start gap-1">
          <AlertTriangle className="w-2.5 h-2.5 text-terminal-amber shrink-0 mt-0.5" />
          <span>The decision to strike was made without anyone physically seeing the target. Authorization was based on algorithmic output and a 30-second intelligence review.</span>
        </div>
        <button
          onClick={() => advancePhase()}
          className="w-full py-2 bg-terminal-red text-white text-[10px] font-bold tracking-widest rounded hover:bg-red-700 transition-colors"
        >
          CONFIRM ASSET DEPLOYMENT →
        </button>
      </div>
    );
  }

  // Authorization pending: the rubber-stamp chain
  return (
    <div className="bg-terminal-card border border-terminal-border rounded p-3 space-y-2.5 font-mono animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] tracking-widest text-terminal-text-dim">AUTHORIZATION CHAIN</span>
        <span className="text-[9px] px-2 py-0.5 rounded border font-bold border-terminal-amber text-terminal-amber bg-terminal-amber-dim/20">
          PENDING
        </span>
      </div>

      {/* Chain steps */}
      {chain.map((step, i) => {
        const isApproved = i < authorizationIndex;
        const isCurrent = i === authorizationIndex && phase === 'authorization_pending';
        const isWaiting = i > authorizationIndex;

        // Special "rubber stamp" treatment for intelligence review
        const isIntelReview = step.role.toLowerCase().includes('review') || step.role.toLowerCase().includes('intelligence') || step.role.toLowerCase().includes('analyst');

        if (isIntelReview && isCurrent) {
          return (
            <div key={i} className="space-y-1.5">
              <div className="text-[8px] text-terminal-text-faint flex items-center gap-1">
                <span className="text-terminal-amber font-bold">STEP {i + 1}:</span> {step.entity}
              </div>
              <RubberStampReview
                onApprove={() => {
                  if (!isFullyAuthorized) advanceAuthorization();
                  else advancePhase();
                }}
                approved={isApproved}
              />
            </div>
          );
        }

        return (
          <div
            key={i}
            className={clsx(
              'flex items-start gap-2 p-2 rounded border text-[9.5px] transition-all',
              isApproved ? 'border-terminal-green/40 bg-terminal-green-dim/15'
                : isCurrent ? 'border-terminal-amber/60 bg-terminal-amber-dim/20'
                : 'border-terminal-border bg-transparent opacity-40'
            )}
          >
            {/* Icon */}
            <div className="mt-0.5 shrink-0">
              {step.status === 'autonomous' ? (
                <Cpu className={clsx('w-3.5 h-3.5', isApproved ? 'text-terminal-amber' : 'text-terminal-text-faint')} />
              ) : isApproved ? (
                <CheckCircle className="w-3.5 h-3.5 text-terminal-green" />
              ) : (
                <Clock className="w-3.5 h-3.5 text-terminal-text-faint" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={clsx('font-bold', isApproved ? 'text-terminal-text' : isCurrent ? 'text-terminal-amber' : 'text-terminal-text-faint')}>
                  {step.entity}
                </span>
                {step.status === 'autonomous' && (
                  <span className="text-[7.5px] bg-terminal-red-dim text-terminal-red border border-terminal-red/40 px-1.5 rounded font-bold shrink-0">
                    ⚠ AUTONOMOUS
                  </span>
                )}
              </div>
              <div className="text-terminal-text-faint text-[8.5px] mt-0.5">{step.role}</div>
              {/* Autonomous step critique */}
              {step.status === 'autonomous' && (
                <div className="text-[8px] text-terminal-amber/60 mt-1 italic">
                  No person reviewed this flag before it entered the authorization queue.
                </div>
              )}
            </div>

            {/* Status */}
            <div className={clsx('shrink-0 text-[9px] font-bold', isApproved ? 'text-terminal-green' : isCurrent ? 'text-terminal-amber' : 'text-terminal-text-faint')}>
              {isApproved ? 'DONE' : isCurrent ? '...' : 'WAIT'}
            </div>
          </div>
        );
      })}

      {/* Action button (for non-intel-review steps) */}
      {phase === 'authorization_pending' && (() => {
        const curStep = chain[authorizationIndex];
        if (!curStep) return null;
        const isIntelReview = curStep.role.toLowerCase().includes('review') || curStep.role.toLowerCase().includes('intelligence') || curStep.role.toLowerCase().includes('analyst');
        if (isIntelReview) return null; // handled inside RubberStampReview

        return (
          <button
            onClick={() => {
              if (!isFullyAuthorized) advanceAuthorization();
              else advancePhase();
            }}
            className={clsx(
              'w-full py-2 text-[10px] font-bold tracking-widest rounded transition-colors',
              curStep.status === 'autonomous'
                ? 'bg-terminal-amber/20 border border-terminal-amber text-terminal-amber hover:bg-terminal-amber/30'
                : 'bg-terminal-red text-white hover:bg-red-700'
            )}
          >
            {isFullyAuthorized ? 'FINALIZE AUTHORIZATION →' : `APPROVE: ${curStep.role.toUpperCase()}`}
          </button>
        );
      })()}

      {/* Bottom disclaimer */}
      {chain.some(s => s.status === 'autonomous') && (
        <div className="text-[8px] text-terminal-red/70 border-t border-terminal-border pt-2 flex items-start gap-1">
          <AlertTriangle className="w-2.5 h-2.5 shrink-0 mt-0.5 text-terminal-red" />
          <span>
            One or more steps in this chain are executed autonomously — no human decision required.
            This process fails the ICRC standard for <span className="font-bold text-terminal-red">Meaningful Human Control</span>.
          </span>
        </div>
      )}
    </div>
  );
}
