import type { TacticalOverlayData } from './types';

// Helper: generate offset lat/lng from center, distance, bearing
export function offsetLatLng(lat: number, lng: number, distM: number, bearingDeg: number): { lat: number; lng: number } {
  const R = 6371000;
  const d = distM / R;
  const brng = (bearingDeg * Math.PI) / 180;
  const lat1 = (lat * Math.PI) / 180;
  const lng1 = (lng * Math.PI) / 180;
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng));
  const lng2 = lng1 + Math.atan2(Math.sin(brng) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
  return { lat: (lat2 * 180) / Math.PI, lng: (lng2 * 180) / Math.PI };
}

// ─── Scenario 1: Pattern of Life (Yemen) ─────────────────────────────────
const patternOfLife: TacticalOverlayData = {
  threatZones: [
    {
      id: 'tz-pol-1',
      center: { lat: 15.3694, lng: 44.1910 },
      lethalRadius: 500,
      dangerRadius: 1200,
      cautionRadius: 2500,
      label: 'PRIMARY TARGET ZONE',
      threatLevel: 'high',
    },
  ],
  friendlyAssets: [
    { id: 'fa-pol-1', position: { lat: 15.3750, lng: 44.1850 }, type: 'drone', designator: 'MQ-9 ALPHA', status: 'orbiting', altitude: 6500 },
    { id: 'fa-pol-2', position: { lat: 15.3620, lng: 44.1980 }, type: 'drone', designator: 'MQ-9 BETA', status: 'standby', altitude: 4200 },
    { id: 'fa-pol-3', position: { lat: 15.3800, lng: 44.2050 }, type: 'sigint', designator: 'SIGINT NODE-7', status: 'active' },
    { id: 'fa-pol-4', position: { lat: 15.8000, lng: 44.8000 }, type: 'fob', designator: 'FOB CERULEAN', status: 'active' },
  ],
  droneRoutes: [
    {
      id: 'dr-pol-1', droneId: 'MQ-9 ALPHA', color: '#0096ff', label: 'ALPHA INGRESS',
      type: 'ingress',
      waypoints: [
        { lat: 15.8000, lng: 44.8000 },
        { lat: 15.6200, lng: 44.5500 },
        { lat: 15.4800, lng: 44.3200 },
        { lat: 15.3850, lng: 44.2100 },
        { lat: 15.3750, lng: 44.1850 },
      ],
    },
    {
      id: 'dr-pol-2', droneId: 'MQ-9 BETA', color: '#ff1a2e', label: 'BETA APPROACH',
      type: 'strike',
      waypoints: [
        { lat: 15.8000, lng: 44.8000 },
        { lat: 15.5500, lng: 44.6200 },
        { lat: 15.4200, lng: 44.3800 },
        { lat: 15.3700, lng: 44.2200 },
        { lat: 15.3620, lng: 44.1980 },
      ],
    },
    {
      id: 'dr-pol-3', droneId: 'MQ-9 GAMMA', color: '#ffaa00', label: 'GAMMA LOITER',
      type: 'loiter',
      waypoints: [
        { lat: 15.3850, lng: 44.1750 },
        { lat: 15.3780, lng: 44.2050 },
        { lat: 15.3600, lng: 44.2000 },
        { lat: 15.3550, lng: 44.1800 },
        { lat: 15.3650, lng: 44.1700 },
        { lat: 15.3850, lng: 44.1750 },
      ],
    },
  ],
  sensorArcs: [
    { id: 'sa-pol-1', center: { lat: 15.3750, lng: 44.1850 }, radius: 1800, startBearing: 120, endBearing: 210, sensorType: 'EO/IR GIMBAL', color: 'rgba(0, 150, 255, 0.15)' },
    { id: 'sa-pol-2', center: { lat: 15.3620, lng: 44.1980 }, radius: 1500, startBearing: 250, endBearing: 340, sensorType: 'SAR RADAR', color: 'rgba(0, 150, 255, 0.12)' },
    { id: 'sa-pol-3', center: { lat: 15.3800, lng: 44.2050 }, radius: 3000, startBearing: 180, endBearing: 360, sensorType: 'SIGINT COLLECTOR', color: 'rgba(0, 212, 126, 0.08)' },
  ],
  noStrikeZones: [
    {
      id: 'nsz-pol-1', label: 'AL-NOOR SCHOOL', type: 'school',
      polygon: [
        { lat: 15.3710, lng: 44.1885 },
        { lat: 15.3710, lng: 44.1900 },
        { lat: 15.3700, lng: 44.1900 },
        { lat: 15.3700, lng: 44.1885 },
      ],
    },
    {
      id: 'nsz-pol-2', label: 'DISTRICT CLINIC', type: 'hospital',
      polygon: [
        { lat: 15.3675, lng: 44.1940 },
        { lat: 15.3675, lng: 44.1955 },
        { lat: 15.3665, lng: 44.1955 },
        { lat: 15.3665, lng: 44.1940 },
      ],
    },
  ],
  civilianInfra: [
    { id: 'ci-pol-1', position: { lat: 15.3710, lng: 44.1892 }, label: 'AL-NOOR PRIMARY SCHOOL', type: 'school' },
    { id: 'ci-pol-2', position: { lat: 15.3670, lng: 44.1948 }, label: 'DISTRICT MEDICAL CLINIC', type: 'hospital' },
    { id: 'ci-pol-3', position: { lat: 15.3680, lng: 44.1870 }, label: 'CENTRAL MARKET', type: 'market' },
    { id: 'ci-pol-4', position: { lat: 15.3720, lng: 44.1930 }, label: 'AL-IMAN MOSQUE', type: 'mosque' },
  ],
  patternTracks: [
    {
      id: 'pt-pol-1', targetId: 't1', label: 'SUBJECT ALPHA — 14-DAY PATTERN',
      positions: [
        { lat: 15.3694, lng: 44.1910, timestamp: 'D-14 08:00' },
        { lat: 15.3710, lng: 44.1892, timestamp: 'D-14 09:30' },
        { lat: 15.3680, lng: 44.1870, timestamp: 'D-14 12:00' },
        { lat: 15.3694, lng: 44.1910, timestamp: 'D-14 14:00' },
        { lat: 15.3720, lng: 44.1930, timestamp: 'D-13 08:15' },
        { lat: 15.3694, lng: 44.1910, timestamp: 'D-13 17:00' },
        { lat: 15.3670, lng: 44.1948, timestamp: 'D-12 10:00' },
        { lat: 15.3694, lng: 44.1910, timestamp: 'D-12 11:30' },
        { lat: 15.3680, lng: 44.1870, timestamp: 'D-11 09:00' },
        { lat: 15.3694, lng: 44.1910, timestamp: 'D-11 18:00' },
      ],
    },
  ],
  engagementZone: [
    { lat: 15.3730, lng: 44.1870 },
    { lat: 15.3730, lng: 44.1960 },
    { lat: 15.3660, lng: 44.1960 },
    { lat: 15.3660, lng: 44.1870 },
  ],
  coaVectors: [
    { id: 'coa-pol-1', origin: { lat: 15.3750, lng: 44.1850 }, bearing: 160, spreadAngle: 60, range: 2000, label: 'COA-1: ALPHA APPROACH', color: 'rgba(0, 120, 255, 0.18)' },
    { id: 'coa-pol-2', origin: { lat: 15.3620, lng: 44.1980 }, bearing: 290, spreadAngle: 45, range: 1800, label: 'COA-2: BETA FLANK', color: 'rgba(0, 120, 255, 0.14)' },
  ],
};

// ─── Scenario 2: Building Strike (Damascus) ─────────────────────────────
const buildingStrike: TacticalOverlayData = {
  threatZones: [
    {
      id: 'tz-bs-1',
      center: { lat: 33.5138, lng: 36.2765 },
      lethalRadius: 400,
      dangerRadius: 900,
      cautionRadius: 1800,
      label: 'STRUCTURE NOV-7 ZONE',
      threatLevel: 'medium',
    },
  ],
  friendlyAssets: [
    { id: 'fa-bs-1', position: { lat: 33.5200, lng: 36.2700 }, type: 'drone', designator: 'REAPER-3', status: 'orbiting', altitude: 5500 },
    { id: 'fa-bs-2', position: { lat: 34.0000, lng: 37.0000 }, type: 'fob', designator: 'FOB HORIZON', status: 'active' },
    { id: 'fa-bs-3', position: { lat: 33.5100, lng: 36.2850 }, type: 'sigint', designator: 'SIGINT RELAY-4', status: 'active' },
  ],
  droneRoutes: [
    {
      id: 'dr-bs-1', droneId: 'REAPER-3', color: '#0096ff', label: 'REAPER-3 INGRESS',
      type: 'ingress',
      waypoints: [
        { lat: 34.0000, lng: 37.0000 },
        { lat: 33.7500, lng: 36.6000 },
        { lat: 33.5800, lng: 36.3500 },
        { lat: 33.5200, lng: 36.2700 },
      ],
    },
  ],
  sensorArcs: [
    { id: 'sa-bs-1', center: { lat: 33.5200, lng: 36.2700 }, radius: 1500, startBearing: 100, endBearing: 220, sensorType: 'EO/IR', color: 'rgba(0, 150, 255, 0.15)' },
  ],
  noStrikeZones: [
    {
      id: 'nsz-bs-1', label: 'AL-AMAL SCHOOL (80m NW)', type: 'school',
      polygon: [
        { lat: 33.5148, lng: 36.2745 },
        { lat: 33.5148, lng: 36.2760 },
        { lat: 33.5142, lng: 36.2760 },
        { lat: 33.5142, lng: 36.2745 },
      ],
    },
    {
      id: 'nsz-bs-2', label: 'SOUQ AL-HAL MARKET (120m E)', type: 'market',
      polygon: [
        { lat: 33.5142, lng: 36.2780 },
        { lat: 33.5142, lng: 36.2800 },
        { lat: 33.5130, lng: 36.2800 },
        { lat: 33.5130, lng: 36.2780 },
      ],
    },
  ],
  civilianInfra: [
    { id: 'ci-bs-1', position: { lat: 33.5145, lng: 36.2752 }, label: 'AL-AMAL SCHOOL', type: 'school' },
    { id: 'ci-bs-2', position: { lat: 33.5136, lng: 36.2790 }, label: 'SOUQ AL-HAL MARKET', type: 'market' },
    { id: 'ci-bs-3', position: { lat: 33.5155, lng: 36.2780 }, label: 'RESIDENTIAL BLOCK 14', type: 'residence' },
  ],
  patternTracks: [],
  engagementZone: [
    { lat: 33.5158, lng: 36.2740 },
    { lat: 33.5158, lng: 36.2790 },
    { lat: 33.5118, lng: 36.2790 },
    { lat: 33.5118, lng: 36.2740 },
  ],
  coaVectors: [
    { id: 'coa-bs-1', origin: { lat: 33.5200, lng: 36.2700 }, bearing: 145, spreadAngle: 50, range: 1500, label: 'COA-1: PRIMARY STRIKE', color: 'rgba(0, 120, 255, 0.18)' },
  ],
};

// ─── Scenario 3: Wedding Strike (Yemen, Al-Radah) ───────────────────────
const weddingStrike: TacticalOverlayData = {
  threatZones: [
    {
      id: 'tz-ws-1',
      center: { lat: 14.2744, lng: 45.3527 },
      lethalRadius: 600,
      dangerRadius: 1500,
      cautionRadius: 3000,
      label: 'CONVOY INTERCEPT ZONE',
      threatLevel: 'high',
    },
  ],
  friendlyAssets: [
    { id: 'fa-ws-1', position: { lat: 14.2800, lng: 45.3450 }, type: 'drone', designator: 'PREDATOR-7', status: 'orbiting', altitude: 7500 },
    { id: 'fa-ws-2', position: { lat: 14.2680, lng: 45.3600 }, type: 'drone', designator: 'PREDATOR-8', status: 'inbound', altitude: 6000 },
  ],
  droneRoutes: [
    {
      id: 'dr-ws-1', droneId: 'PREDATOR-7', color: '#0096ff', label: 'PRED-7 TRACK',
      type: 'loiter',
      waypoints: [
        { lat: 14.2850, lng: 45.3400 },
        { lat: 14.2800, lng: 45.3600 },
        { lat: 14.2700, lng: 45.3650 },
        { lat: 14.2650, lng: 45.3450 },
        { lat: 14.2750, lng: 45.3350 },
        { lat: 14.2850, lng: 45.3400 },
      ],
    },
    {
      id: 'dr-ws-2', droneId: 'PREDATOR-8', color: '#ff1a2e', label: 'PRED-8 INGRESS',
      type: 'ingress',
      waypoints: [
        { lat: 14.8000, lng: 45.9000 },
        { lat: 14.5500, lng: 45.6500 },
        { lat: 14.3500, lng: 45.4500 },
        { lat: 14.2680, lng: 45.3600 },
      ],
    },
  ],
  sensorArcs: [
    { id: 'sa-ws-1', center: { lat: 14.2800, lng: 45.3450 }, radius: 2500, startBearing: 90, endBearing: 240, sensorType: 'WIDE-AREA MOTION', color: 'rgba(0, 150, 255, 0.12)' },
  ],
  noStrikeZones: [],
  civilianInfra: [
    { id: 'ci-ws-1', position: { lat: 14.2760, lng: 45.3550 }, label: 'AL-RADAH VILLAGE CENTER', type: 'market' },
    { id: 'ci-ws-2', position: { lat: 14.2730, lng: 45.3510 }, label: 'VILLAGE MOSQUE', type: 'mosque' },
  ],
  patternTracks: [
    {
      id: 'pt-ws-1', targetId: 'g1', label: 'CONVOY ROUTE (WEDDING PROCESSION)',
      positions: [
        { lat: 14.2900, lng: 45.3200, timestamp: '10:00' },
        { lat: 14.2850, lng: 45.3300, timestamp: '10:15' },
        { lat: 14.2800, lng: 45.3400, timestamp: '10:30' },
        { lat: 14.2770, lng: 45.3480, timestamp: '10:45' },
        { lat: 14.2744, lng: 45.3527, timestamp: '11:00' },
      ],
    },
  ],
  engagementZone: [
    { lat: 14.2790, lng: 45.3470 },
    { lat: 14.2790, lng: 45.3590 },
    { lat: 14.2700, lng: 45.3590 },
    { lat: 14.2700, lng: 45.3470 },
  ],
  coaVectors: [
    { id: 'coa-ws-1', origin: { lat: 14.2800, lng: 45.3450 }, bearing: 140, spreadAngle: 70, range: 2200, label: 'COA: INTERCEPT VECTOR', color: 'rgba(0, 120, 255, 0.16)' },
  ],
};

// ─── Scenario 4: Fully Autonomous (Tel Aviv) ─────────────────────────────
const autonomousEngagement: TacticalOverlayData = {
  threatZones: [
    {
      id: 'tz-ae-1',
      center: { lat: 32.0853, lng: 34.7818 },
      lethalRadius: 300,
      dangerRadius: 700,
      cautionRadius: 1500,
      label: 'AUTO-TARGET ZONE',
      threatLevel: 'critical',
    },
  ],
  friendlyAssets: [
    { id: 'fa-ae-1', position: { lat: 32.0900, lng: 34.7750 }, type: 'drone', designator: 'LAWS-NODE-01', status: 'active', altitude: 3000 },
    { id: 'fa-ae-2', position: { lat: 32.0800, lng: 34.7880 }, type: 'drone', designator: 'LAWS-NODE-02', status: 'active', altitude: 2800 },
    { id: 'fa-ae-3', position: { lat: 32.0870, lng: 34.7900 }, type: 'relay', designator: 'MESH RELAY-A', status: 'active' },
  ],
  droneRoutes: [
    {
      id: 'dr-ae-1', droneId: 'LAWS-NODE-01', color: '#ff1a2e', label: 'AUTO STRIKE PATH',
      type: 'strike',
      waypoints: [
        { lat: 32.4000, lng: 35.1000 },
        { lat: 32.2500, lng: 34.9500 },
        { lat: 32.1200, lng: 34.8200 },
        { lat: 32.0900, lng: 34.7750 },
      ],
    },
  ],
  sensorArcs: [
    { id: 'sa-ae-1', center: { lat: 32.0900, lng: 34.7750 }, radius: 1200, startBearing: 100, endBearing: 250, sensorType: 'AUTONOMOUS SENSOR', color: 'rgba(255, 26, 46, 0.12)' },
    { id: 'sa-ae-2', center: { lat: 32.0800, lng: 34.7880 }, radius: 1000, startBearing: 270, endBearing: 60, sensorType: 'MESH SENSOR', color: 'rgba(255, 26, 46, 0.10)' },
  ],
  noStrikeZones: [],
  civilianInfra: [
    { id: 'ci-ae-1', position: { lat: 32.0860, lng: 34.7830 }, label: 'URBAN RESIDENTIAL AREA', type: 'residence' },
    { id: 'ci-ae-2', position: { lat: 32.0840, lng: 34.7800 }, label: 'COMMERCIAL DISTRICT', type: 'infrastructure' },
  ],
  patternTracks: [],
  engagementZone: [
    { lat: 32.0880, lng: 34.7780 },
    { lat: 32.0880, lng: 34.7860 },
    { lat: 32.0820, lng: 34.7860 },
    { lat: 32.0820, lng: 34.7780 },
  ],
  coaVectors: [
    { id: 'coa-ae-1', origin: { lat: 32.0900, lng: 34.7750 }, bearing: 145, spreadAngle: 55, range: 1500, label: 'AUTO CONVERGENCE', color: 'rgba(255, 26, 46, 0.15)' },
  ],
};

// ─── Scenario 5: Signature Strike (Pakistan FATA) ────────────────────────
const signatureStrike: TacticalOverlayData = {
  threatZones: [
    {
      id: 'tz-ss-1',
      center: { lat: 32.9628, lng: 69.8567 },
      lethalRadius: 500,
      dangerRadius: 1200,
      cautionRadius: 2800,
      label: 'SIGNATURE PATTERN ZONE',
      threatLevel: 'high',
    },
  ],
  friendlyAssets: [
    { id: 'fa-ss-1', position: { lat: 32.9700, lng: 69.8500 }, type: 'drone', designator: 'PRED-SIGMA-1', status: 'orbiting', altitude: 8000 },
    { id: 'fa-ss-2', position: { lat: 33.3000, lng: 70.2000 }, type: 'fob', designator: 'FOB EAGLE', status: 'active' },
  ],
  droneRoutes: [
    {
      id: 'dr-ss-1', droneId: 'PRED-SIGMA-1', color: '#0096ff', label: 'SIGMA-1 ORBIT',
      type: 'loiter',
      waypoints: [
        { lat: 32.9750, lng: 69.8400 },
        { lat: 32.9700, lng: 69.8650 },
        { lat: 32.9550, lng: 69.8700 },
        { lat: 32.9500, lng: 69.8500 },
        { lat: 32.9600, lng: 69.8350 },
        { lat: 32.9750, lng: 69.8400 },
      ],
    },
  ],
  sensorArcs: [
    { id: 'sa-ss-1', center: { lat: 32.9700, lng: 69.8500 }, radius: 2200, startBearing: 140, endBearing: 260, sensorType: 'PATTERN ANALYZER', color: 'rgba(0, 150, 255, 0.14)' },
  ],
  noStrikeZones: [],
  civilianInfra: [
    { id: 'ci-ss-1', position: { lat: 32.9640, lng: 69.8600 }, label: 'TRIBAL VILLAGE CENTER', type: 'residence' },
    { id: 'ci-ss-2', position: { lat: 32.9610, lng: 69.8540 }, label: 'RURAL MOSQUE', type: 'mosque' },
  ],
  patternTracks: [
    {
      id: 'pt-ss-1', targetId: 's1', label: 'GROUP MOVEMENT PATTERN',
      positions: [
        { lat: 32.9660, lng: 69.8500, timestamp: '06:00' },
        { lat: 32.9650, lng: 69.8530, timestamp: '07:30' },
        { lat: 32.9640, lng: 69.8560, timestamp: '09:00' },
        { lat: 32.9628, lng: 69.8567, timestamp: '10:30' },
      ],
    },
  ],
  engagementZone: [
    { lat: 32.9670, lng: 69.8520 },
    { lat: 32.9670, lng: 69.8620 },
    { lat: 32.9590, lng: 69.8620 },
    { lat: 32.9590, lng: 69.8520 },
  ],
  coaVectors: [
    { id: 'coa-ss-1', origin: { lat: 32.9700, lng: 69.8500 }, bearing: 165, spreadAngle: 65, range: 2000, label: 'COA: PATTERN INTERCEPT', color: 'rgba(0, 120, 255, 0.16)' },
  ],
};

// ─── Scenario 6: Facial Recognition (Gaza) ───────────────────────────────
const facialRecognition: TacticalOverlayData = {
  threatZones: [
    {
      id: 'tz-fr-1',
      center: { lat: 31.5015, lng: 34.4668 },
      lethalRadius: 350,
      dangerRadius: 800,
      cautionRadius: 1600,
      label: 'LAVENDER TARGET ZONE',
      threatLevel: 'high',
    },
  ],
  friendlyAssets: [
    { id: 'fa-fr-1', position: { lat: 31.5060, lng: 34.4620 }, type: 'drone', designator: 'HERMES-900', status: 'orbiting', altitude: 5000 },
    { id: 'fa-fr-2', position: { lat: 31.5000, lng: 34.4720 }, type: 'sigint', designator: 'LAVENDER NODE', status: 'active' },
  ],
  droneRoutes: [
    {
      id: 'dr-fr-1', droneId: 'HERMES-900', color: '#0096ff', label: 'HERMES APPROACH',
      type: 'ingress',
      waypoints: [
        { lat: 31.8000, lng: 34.9000 },
        { lat: 31.6500, lng: 34.7000 },
        { lat: 31.5500, lng: 34.5200 },
        { lat: 31.5060, lng: 34.4620 },
      ],
    },
  ],
  sensorArcs: [
    { id: 'sa-fr-1', center: { lat: 31.5060, lng: 34.4620 }, radius: 1300, startBearing: 80, endBearing: 200, sensorType: 'FACIAL SCANNER', color: 'rgba(0, 150, 255, 0.15)' },
    { id: 'sa-fr-2', center: { lat: 31.5000, lng: 34.4720 }, radius: 2000, startBearing: 220, endBearing: 360, sensorType: 'METADATA COLLECTOR', color: 'rgba(0, 212, 126, 0.08)' },
  ],
  noStrikeZones: [
    {
      id: 'nsz-fr-1', label: 'AL-SHIFA HOSPITAL ZONE', type: 'hospital',
      polygon: [
        { lat: 31.5030, lng: 34.4640 },
        { lat: 31.5030, lng: 34.4660 },
        { lat: 31.5020, lng: 34.4660 },
        { lat: 31.5020, lng: 34.4640 },
      ],
    },
  ],
  civilianInfra: [
    { id: 'ci-fr-1', position: { lat: 31.5025, lng: 34.4650 }, label: 'HOSPITAL COMPLEX', type: 'hospital' },
    { id: 'ci-fr-2', position: { lat: 31.5010, lng: 34.4680 }, label: 'RESIDENTIAL TOWER BLOCK', type: 'residence' },
    { id: 'ci-fr-3', position: { lat: 31.5030, lng: 34.4690 }, label: 'COMMERCIAL MARKET', type: 'market' },
  ],
  patternTracks: [],
  engagementZone: [
    { lat: 31.5040, lng: 34.4640 },
    { lat: 31.5040, lng: 34.4700 },
    { lat: 31.4990, lng: 34.4700 },
    { lat: 31.4990, lng: 34.4640 },
  ],
  coaVectors: [
    { id: 'coa-fr-1', origin: { lat: 31.5060, lng: 34.4620 }, bearing: 130, spreadAngle: 50, range: 1400, label: 'COA: LAVENDER STRIKE', color: 'rgba(0, 120, 255, 0.18)' },
  ],
};

// ─── Scenario 7: Drone Swarm (Fort Benning, GA) ─────────────────────────
const droneSwarm: TacticalOverlayData = {
  threatZones: [
    {
      id: 'tz-ds-1',
      center: { lat: 32.3615, lng: -84.8821 },
      lethalRadius: 800,
      dangerRadius: 2000,
      cautionRadius: 4000,
      label: 'SWARM CONVERGENCE ZONE',
      threatLevel: 'critical',
    },
  ],
  friendlyAssets: [
    { id: 'fa-ds-1', position: { lat: 32.3680, lng: -84.8900 }, type: 'drone', designator: 'SWARM-NODE-01', status: 'active', altitude: 400 },
    { id: 'fa-ds-2', position: { lat: 32.3550, lng: -84.8750 }, type: 'drone', designator: 'SWARM-NODE-12', status: 'active', altitude: 350 },
    { id: 'fa-ds-3', position: { lat: 32.3650, lng: -84.8700 }, type: 'drone', designator: 'SWARM-NODE-25', status: 'active', altitude: 380 },
    { id: 'fa-ds-4', position: { lat: 32.3580, lng: -84.8950 }, type: 'drone', designator: 'SWARM-NODE-37', status: 'active', altitude: 420 },
    { id: 'fa-ds-5', position: { lat: 32.3700, lng: -84.8800 }, type: 'relay', designator: 'MESH COORDINATOR', status: 'active' },
    { id: 'fa-ds-6', position: { lat: 32.7000, lng: -84.4000 }, type: 'fob', designator: 'SWARM LAUNCH SITE', status: 'active' },
  ],
  droneRoutes: [
    {
      id: 'dr-ds-1', droneId: 'SWARM-ALPHA', color: '#0096ff', label: 'SWARM ALPHA VECTOR',
      type: 'strike',
      waypoints: [
        { lat: 32.7000, lng: -84.4000 },
        { lat: 32.5500, lng: -84.6500 },
        { lat: 32.4200, lng: -84.8000 },
        { lat: 32.3680, lng: -84.8900 },
      ],
    },
    {
      id: 'dr-ds-2', droneId: 'SWARM-BETA', color: '#ff1a2e', label: 'SWARM BETA VECTOR',
      type: 'strike',
      waypoints: [
        { lat: 32.7000, lng: -84.4000 },
        { lat: 32.5000, lng: -84.5500 },
        { lat: 32.3900, lng: -84.7500 },
        { lat: 32.3550, lng: -84.8750 },
      ],
    },
    {
      id: 'dr-ds-3', droneId: 'SWARM-GAMMA', color: '#ffaa00', label: 'SWARM GAMMA VECTOR',
      type: 'strike',
      waypoints: [
        { lat: 32.7000, lng: -84.4000 },
        { lat: 32.5800, lng: -84.7000 },
        { lat: 32.4500, lng: -84.8200 },
        { lat: 32.3650, lng: -84.8700 },
      ],
    },
  ],
  sensorArcs: [
    { id: 'sa-ds-1', center: { lat: 32.3680, lng: -84.8900 }, radius: 1500, startBearing: 60, endBearing: 180, sensorType: 'SWARM MESH', color: 'rgba(0, 150, 255, 0.10)' },
    { id: 'sa-ds-2', center: { lat: 32.3550, lng: -84.8750 }, radius: 1500, startBearing: 300, endBearing: 60, sensorType: 'SWARM MESH', color: 'rgba(0, 150, 255, 0.10)' },
    { id: 'sa-ds-3', center: { lat: 32.3650, lng: -84.8700 }, radius: 1500, startBearing: 180, endBearing: 300, sensorType: 'SWARM MESH', color: 'rgba(0, 150, 255, 0.10)' },
  ],
  noStrikeZones: [],
  civilianInfra: [],
  patternTracks: [],
  engagementZone: [
    { lat: 32.3700, lng: -84.8980 },
    { lat: 32.3700, lng: -84.8660 },
    { lat: 32.3530, lng: -84.8660 },
    { lat: 32.3530, lng: -84.8980 },
  ],
  coaVectors: [
    { id: 'coa-ds-1', origin: { lat: 32.3680, lng: -84.8900 }, bearing: 150, spreadAngle: 40, range: 2500, label: 'SWARM ALPHA COA', color: 'rgba(0, 120, 255, 0.14)' },
    { id: 'coa-ds-2', origin: { lat: 32.3550, lng: -84.8750 }, bearing: 320, spreadAngle: 40, range: 2500, label: 'SWARM BETA COA', color: 'rgba(0, 120, 255, 0.14)' },
    { id: 'coa-ds-3', origin: { lat: 32.3650, lng: -84.8700 }, bearing: 230, spreadAngle: 40, range: 2500, label: 'SWARM GAMMA COA', color: 'rgba(0, 120, 255, 0.14)' },
  ],
};

// ─── Lookup ──────────────────────────────────────────────────────────────
export const TACTICAL_DATA: Record<string, TacticalOverlayData> = {
  'pattern-of-life': patternOfLife,
  'building-strike': buildingStrike,
  'wedding-strike': weddingStrike,
  'autonomous-engagement': autonomousEngagement,
  'signature-strike': signatureStrike,
  'facial-recognition': facialRecognition,
  'drone-swarm': droneSwarm,
};

export function getTacticalData(scenarioId: string): TacticalOverlayData | null {
  return TACTICAL_DATA[scenarioId] ?? null;
}
