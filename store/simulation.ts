import { create } from 'zustand';
import type { SimulationState, SimPhase, Scenario, AlertRecord, Target } from '@/lib/types';

const PHASE_ORDER: SimPhase[] = [
  'idle',
  'scanning',
  'target_acquired',
  'tracking',
  'confidence_building',
  'alert_threshold',
  'authorization_pending',
  'authorized',
  'drone_dispatched',
  'engagement',
  'impact',
  'assessment',
];

interface SimulationStore extends SimulationState {
  // Actions
  loadScenario: (scenario: Scenario) => void;
  advancePhase: () => void;
  setPhase: (phase: SimPhase) => void;
  updateConfidence: (delta: number) => void;
  setConfidence: (score: number) => void;
  addAlert: (alert: Omit<AlertRecord, 'id' | 'timestamp'>) => void;
  updateDroneProgress: (progress: number) => void;
  resetSimulation: () => void;
  advanceAuthorization: () => void;
  tick: () => void;
  setViewMode: (mode: 'dashboard' | 'satellite' | 'drone') => void;
  setOrbitActive: (active: boolean) => void;
}

const initialState: SimulationState = {
  phase: 'idle',
  activeScenario: null,
  targets: [],
  primaryTarget: null,
  confidenceScore: 0,
  confidenceVelocity: 0.4,
  alerts: [],
  dronePosition: null,
  droneProgress: 0,
  authorizationIndex: 0,
  assessmentVisible: false,
  systemTime: new Date(),
  totalEngagements: 0,
  viewMode: 'dashboard',
  orbitActive: true,
};

export const useSimulationStore = create<SimulationStore>((set, get) => ({
  ...initialState,

  loadScenario: (scenario: Scenario) => {
    set({
      activeScenario: scenario,
      targets: scenario.targets,
      primaryTarget: scenario.targets.find((t) => t.id === scenario.primaryTargetId) ?? null,
      phase: 'scanning',
      confidenceScore: 0,
      confidenceVelocity: 0.5,
      alerts: [
        {
          id: crypto.randomUUID(),
          timestamp: new Date(),
          level: 'info',
          message: `SCENARIO LOADED: ${scenario.title.toUpperCase()}`,
        },
      ],
      dronePosition: null,
      droneProgress: 0,
      authorizationIndex: 0,
      assessmentVisible: false,
      viewMode: 'satellite', // Auto-switch to satellite feed on scenario load
      orbitActive: true,
    });
  },

  advancePhase: () => {
    const { phase, activeScenario, targets, primaryTarget, confidenceScore } = get();
    const idx = PHASE_ORDER.indexOf(phase);
    if (idx < 0 || idx >= PHASE_ORDER.length - 1) return;

    const next = PHASE_ORDER[idx + 1];

    // Update target confidence on transitions
    let updatedTargets = targets;
    let updatedPrimaryTarget = primaryTarget;
    if (primaryTarget) {
      const updated = { ...primaryTarget, confidenceScore };
      updatedTargets = targets.map((t) => (t.id === primaryTarget.id ? updated : t));
      updatedPrimaryTarget = updated;
    }

    // Auto-generate alert for new phase
    const narrativeText =
      activeScenario?.narrative?.[next as keyof typeof activeScenario.narrative];
    const newAlert: AlertRecord = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      level:
        next === 'alert_threshold' || next === 'engagement' || next === 'impact'
          ? 'critical'
          : next === 'authorization_pending' || next === 'authorized' || next === 'drone_dispatched'
          ? 'warning'
          : 'info',
      message: PHASE_LABELS[next] ?? next.replace(/_/g, ' ').toUpperCase(),
    };

    set((state) => ({
      phase: next,
      targets: updatedTargets,
      primaryTarget: updatedPrimaryTarget,
      assessmentVisible: next === 'assessment',
      totalEngagements: next === 'impact' ? state.totalEngagements + 1 : state.totalEngagements,
      alerts: [newAlert, ...state.alerts].slice(0, 30),
      // Increase confidence velocity as we approach the threshold
      confidenceVelocity:
        next === 'confidence_building' ? 1.2
        : next === 'alert_threshold' ? 0 // stop at threshold
        : state.confidenceVelocity,
      droneProgress: next === 'engagement' ? 0.7 : next === 'impact' ? 1 : state.droneProgress,
    }));
  },

  setPhase: (phase: SimPhase) => set({ phase }),

  updateConfidence: (delta: number) => {
    const { confidenceScore, activeScenario, phase } = get();
    if (phase !== 'confidence_building' && phase !== 'tracking' && phase !== 'scanning') return;
    const threshold = activeScenario?.confidenceThreshold ?? 70;
    const newScore = Math.min(confidenceScore + delta, 100);

    if (confidenceScore < threshold && newScore >= threshold) {
      // Auto-trigger alert phase
      const alert: AlertRecord = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        level: 'critical',
        message: `⚠ CONFIDENCE THRESHOLD REACHED: ${threshold}% — ENGAGEMENT ELIGIBLE`,
      };
      set((state) => ({
        confidenceScore: newScore,
        phase: 'alert_threshold',
        alerts: [alert, ...state.alerts].slice(0, 30),
      }));
    } else {
      set({ confidenceScore: newScore });
    }
  },

  setConfidence: (score: number) => set({ confidenceScore: score }),

  addAlert: (alert) =>
    set((state) => ({
      alerts: [
        { ...alert, id: crypto.randomUUID(), timestamp: new Date() },
        ...state.alerts,
      ].slice(0, 30),
    })),

  updateDroneProgress: (progress: number) => {
    const { activeScenario } = get();
    if (!activeScenario) return;
    const origin = activeScenario.droneOrigin ?? activeScenario.location;
    const target = activeScenario.location;
    const lat = origin.lat + (target.lat - origin.lat) * progress;
    const lng = origin.lng + (target.lng - origin.lng) * progress;
    set({ droneProgress: progress, dronePosition: { lat, lng } });
  },

  advanceAuthorization: () => {
    const { authorizationIndex, activeScenario } = get();
    const total = activeScenario?.authorizationChain.length ?? 0;
    if (authorizationIndex < total) {
      const nextIndex = authorizationIndex + 1;
      set({ authorizationIndex: nextIndex });
      if (nextIndex >= total) {
        get().advancePhase();
      }
    }
  },

  resetSimulation: () => set({ ...initialState, systemTime: new Date() }),

  setViewMode: (mode: 'dashboard' | 'satellite' | 'drone') => set({ viewMode: mode }),

  setOrbitActive: (active: boolean) => set({ orbitActive: active }),

  tick: () => {
    const { phase, confidenceVelocity, activeScenario, droneProgress } = get();
    // Update system clock
    set({ systemTime: new Date() });

    // Drive confidence during appropriate phases
    if (
      phase === 'scanning' ||
      phase === 'target_acquired' ||
      phase === 'tracking' ||
      phase === 'confidence_building'
    ) {
      get().updateConfidence(confidenceVelocity);
    }

    // Drive drone progress during flight phases
    if (phase === 'drone_dispatched' || phase === 'engagement') {
      const newProgress = Math.min(droneProgress + 0.008, 1);
      get().updateDroneProgress(newProgress);
      if (newProgress >= 1 && phase === 'drone_dispatched') {
        get().advancePhase();
      }
    }
  },
}));

export const PHASE_LABELS: Record<SimPhase, string> = {
  idle: 'SYSTEM STANDBY',
  scanning: 'INITIATING SCAN',
  target_acquired: 'TARGET ACQUIRED',
  tracking: 'ACTIVE TRACKING',
  confidence_building: 'CONFIDENCE ANALYSIS',
  alert_threshold: '⚠ THRESHOLD ALERT',
  authorization_pending: 'AUTHORIZATION PENDING',
  authorized: 'ENGAGEMENT AUTHORIZED',
  drone_dispatched: 'ASSET DEPLOYED',
  engagement: '🔴 TERMINAL ENGAGEMENT',
  impact: '🔴 STRIKE COMPLETE',
  assessment: 'POST-STRIKE ASSESSMENT',
};
