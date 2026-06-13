// Core geographic types
export interface LatLng {
  lat: number;
  lng: number;
  alt?: number;
}

// Simulation phases — the state machine
export type SimPhase =
  | 'idle'
  | 'scanning'
  | 'target_acquired'
  | 'tracking'
  | 'confidence_building'
  | 'alert_threshold'
  | 'authorization_pending'
  | 'authorized'
  | 'drone_dispatched'
  | 'engagement'
  | 'impact'
  | 'assessment';

// Target profile
export interface Target {
  id: string;
  designator: string; // e.g. "SUBJECT ALPHA", "STRUCTURE 7"
  type: 'person' | 'building' | 'vehicle' | 'group';
  position: LatLng;
  confidenceScore: number; // 0–100
  threatLevel: 'low' | 'medium' | 'high' | 'critical';
  metadata: {
    patternDays?: number;
    phoneMetadata?: boolean;
    associatedTargets?: string[];
    locationHistory?: LatLng[];
    notes?: string;
  };
}

// Collateral detail — shows up in assessment phase
export interface CollateralRecord {
  type: string; // "adult civilian", "child", "unidentified"
  count: number;
}

export interface LegalContext {
  applicableLaw: string;
  legalGap: string;
  treatyStatus: string;
  advocacyAsk: string;
}

// A full scenario definition
export interface Scenario {
  id: string;
  title: string;
  subtitle: string;
  basedOn?: string; // e.g. "Based on documented incidents in Yemen, 2013–2021"
  location: LatLng;
  mapHeading?: number;
  mapTilt?: number;
  mapRange?: number;
  targets: Target[];
  primaryTargetId: string;
  narrative: ScenarioNarrative;
  droneOrigin?: LatLng;
  confidenceThreshold: number; // score at which alert fires
  authorizationChain: AuthorizationStep[];
  collateralEstimate?: CollateralRecord[];
  legalContext?: LegalContext;
}

// Narrative text for each phase
export interface ScenarioNarrative {
  scanning?: string;
  target_acquired?: string;
  tracking?: string;
  confidence_building?: string;
  alert_threshold?: string;
  authorization_pending?: string;
  authorized?: string;
  drone_dispatched?: string;
  engagement?: string;
  impact?: string;
  assessment?: string;
}

// Who or what authorizes engagement
export interface AuthorizationStep {
  entity: string;
  role: string;
  status: 'pending' | 'approved' | 'autonomous';
  timestamp?: string;
}

// Alert records shown in the alert feed
export interface AlertRecord {
  id: string;
  timestamp: Date;
  level: 'info' | 'warning' | 'critical';
  message: string;
}

// The overall simulation state
export interface SimulationState {
  phase: SimPhase;
  activeScenario: Scenario | null;
  targets: Target[];
  primaryTarget: Target | null;
  confidenceScore: number;
  confidenceVelocity: number; // how fast confidence is rising
  alerts: AlertRecord[];
  dronePosition: LatLng | null;
  droneProgress: number; // 0–1 along path to target
  authorizationIndex: number; // which step in the auth chain is current
  assessmentVisible: boolean;
  systemTime: Date;
  totalEngagements: number; // session counter
  viewMode: 'dashboard' | 'satellite' | 'drone';
  orbitActive: boolean;
}

// ── Tactical Overlay Types (Palantir MAVEN style) ───────────────────────

export interface ThreatZone {
  id: string;
  center: LatLng;
  lethalRadius: number;    // meters
  dangerRadius: number;
  cautionRadius: number;
  label: string;
  threatLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface FriendlyAsset {
  id: string;
  position: LatLng;
  type: 'drone' | 'satellite' | 'fob' | 'sigint' | 'relay';
  designator: string;
  status: 'active' | 'standby' | 'inbound' | 'orbiting';
  altitude?: number;
}

export interface DroneRoute {
  id: string;
  waypoints: LatLng[];
  droneId: string;
  color: string;
  label: string;
  type: 'ingress' | 'egress' | 'loiter' | 'strike';
}

export interface SensorArc {
  id: string;
  center: LatLng;
  radius: number;          // meters
  startBearing: number;    // degrees
  endBearing: number;
  sensorType: string;
  color: string;
}

export interface NoStrikeZone {
  id: string;
  polygon: LatLng[];
  label: string;
  type: 'school' | 'hospital' | 'mosque' | 'market' | 'shelter';
}

export interface CivilianMarker {
  id: string;
  position: LatLng;
  label: string;
  type: 'school' | 'hospital' | 'mosque' | 'market' | 'residence' | 'infrastructure';
}

export interface PatternTrack {
  id: string;
  targetId: string;
  positions: (LatLng & { timestamp?: string })[];
  label: string;
}

export interface COAVector {
  id: string;
  origin: LatLng;
  bearing: number;
  spreadAngle: number;     // degrees — total fan width
  range: number;            // meters
  label: string;
  color: string;
}

export interface TacticalOverlayData {
  threatZones: ThreatZone[];
  friendlyAssets: FriendlyAsset[];
  droneRoutes: DroneRoute[];
  sensorArcs: SensorArc[];
  noStrikeZones: NoStrikeZone[];
  civilianInfra: CivilianMarker[];
  patternTracks: PatternTrack[];
  engagementZone: LatLng[];
  coaVectors: COAVector[];
}
