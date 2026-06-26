'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useSimulationStore } from '@/store/simulation';
import { useMapLayerStore } from '@/store/mapLayers';
import { getTacticalData, offsetLatLng } from '@/lib/tacticalData';
import type { TacticalOverlayData } from '@/lib/types';

// ═══════════════════════════════════════════════════════════════════════════
// MQ-9 REAPER SVG — top-down silhouette as data URI for MapLibre icon
// ═══════════════════════════════════════════════════════════════════════════
const MQ9_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <!-- MQ-9 Reaper top-down silhouette -->
  <g fill="none" stroke="COLOR" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <!-- Fuselage -->
    <path d="M32 4 L34 10 L35 28 L34 52 L33 58 L32 60 L31 58 L30 52 L29 28 L30 10 Z" fill="COLORaa" stroke="COLOR"/>
    <!-- Main wings -->
    <path d="M29 22 L8 30 L7 32 L8 33 L29 28" fill="COLOR44" stroke="COLOR"/>
    <path d="M35 22 L56 30 L57 32 L56 33 L35 28" fill="COLOR44" stroke="COLOR"/>
    <!-- Tail wings -->
    <path d="M30 50 L20 54 L19 55 L20 56 L30 53" fill="COLOR44" stroke="COLOR"/>
    <path d="M34 50 L44 54 L45 55 L44 56 L34 53" fill="COLOR44" stroke="COLOR"/>
    <!-- V-tail -->
    <path d="M31 56 L28 62 L32 60 L36 62 L33 56" fill="COLOR44" stroke="COLOR"/>
    <!-- Engine nacelle -->
    <ellipse cx="32" cy="48" rx="3" ry="5" fill="COLOR33" stroke="COLOR" stroke-width="1"/>
    <!-- Sensor turret -->
    <circle cx="32" cy="8" r="2.5" fill="COLOR" stroke="COLOR" stroke-width="0.5"/>
  </g>
</svg>`;

function makeDroneSvgUrl(color: string): string {
  const svg = MQ9_SVG.replace(/COLOR/g, color);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// SENSOR CONE GEOMETRY — compute a GeoJSON polygon from drone→target bearing
// ═══════════════════════════════════════════════════════════════════════════
function computeSensorCone(
  droneLat: number, droneLng: number,
  targetLat: number, targetLng: number,
  halfAngleDeg: number = 18,
  steps: number = 12
): [number, number][] {
  const bearing = Math.atan2(targetLng - droneLng, targetLat - droneLat) * (180 / Math.PI);
  const dist = Math.sqrt(
    Math.pow((targetLat - droneLat) * 111320, 2) +
    Math.pow((targetLng - droneLng) * 111320 * Math.cos(droneLat * Math.PI / 180), 2)
  );
  // Cone reaches 80% of distance to target
  const coneRange = Math.max(dist * 0.8, 100);

  const coords: [number, number][] = [[droneLng, droneLat]];
  for (let i = 0; i <= steps; i++) {
    const angle = bearing - halfAngleDeg + (2 * halfAngleDeg * i / steps);
    const rad = (angle * Math.PI) / 180;
    const offsetLat = droneLat + (coneRange / 111320) * Math.cos(rad);
    const offsetLng = droneLng + (coneRange / (111320 * Math.cos(droneLat * Math.PI / 180))) * Math.sin(rad);
    coords.push([offsetLng, offsetLat]);
  }
  coords.push([droneLng, droneLat]); // close
  return coords;
}

// ═══════════════════════════════════════════════════════════════════════════
// CIRCLE GEOMETRY — generate circle polygon for threat rings
// ═══════════════════════════════════════════════════════════════════════════
function circleGeoJSON(
  centerLat: number, centerLng: number,
  radiusM: number, steps: number = 64
): [number, number][] {
  const coords: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 360;
    const pt = offsetLatLng(centerLat, centerLng, radiusM, angle);
    coords.push([pt.lng, pt.lat]);
  }
  return coords;
}

// ═══════════════════════════════════════════════════════════════════════════
// ARC (SENSOR FAN) GEOMETRY
// ═══════════════════════════════════════════════════════════════════════════
function arcGeoJSON(
  centerLat: number, centerLng: number,
  radiusM: number, startBearing: number, endBearing: number,
  steps: number = 32
): [number, number][] {
  const coords: [number, number][] = [[centerLng, centerLat]];
  let sweep = endBearing - startBearing;
  if (sweep < 0) sweep += 360;
  for (let i = 0; i <= steps; i++) {
    const bearing = startBearing + (sweep * i / steps);
    const pt = offsetLatLng(centerLat, centerLng, radiusM, bearing);
    coords.push([pt.lng, pt.lat]);
  }
  coords.push([centerLng, centerLat]);
  return coords;
}

// ═══════════════════════════════════════════════════════════════════════════
// Dynamic target coordinate trajectory based on phase (same logic as before)
// ═══════════════════════════════════════════════════════════════════════════
function getTargetState(phase: string, scenarioId: string) {
  const defaultCoords = { lat: 15.3694, lng: 44.1918 };
  if (scenarioId !== 'pattern-of-life') {
    return { coords: defaultCoords, isCar: false };
  }
  switch (phase) {
    case 'idle': case 'scanning': case 'target_acquired':
      return { coords: { lat: 15.3694, lng: 44.1918 }, isCar: false };
    case 'tracking':
      return { coords: { lat: 15.3697, lng: 44.1915 }, isCar: false };
    case 'confidence_building':
      return { coords: { lat: 15.3700, lng: 44.1912 }, isCar: false };
    case 'alert_threshold': case 'authorization_pending': case 'authorized':
      return { coords: { lat: 15.3702, lng: 44.1908 }, isCar: true };
    case 'drone_dispatched':
      return { coords: { lat: 15.3700, lng: 44.1880 }, isCar: true };
    default:
      return { coords: { lat: 15.3698, lng: 44.1860 }, isCar: true };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export function MapLibreSatellite({
  className,
  onMapReady,
}: {
  className?: string;
  onMapReady?: (map: any) => void;
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const animFrameRef = useRef<number>(0);
  const screenFlashRef = useRef<HTMLDivElement>(null);
  const prevPhaseRef = useRef<string>('idle');

  // Animation state refs
  const angleRef = useRef<number>(0);
  const entryProgressRef = useRef<number>(0);
  const swoopProgressRef = useRef<number>(0);
  const impactPulseRef = useRef<number>(0);
  const targetAnimRef = useRef<{ lat: number; lng: number }>({ lat: 0, lng: 0 });

  const { activeScenario, phase, viewMode, confidenceScore, orbitActive } = useSimulationStore();
  const { layers, subLayers } = useMapLayerStore();
  const [loaded, setLoaded] = useState(false);

  const scenarioId = activeScenario?.id ?? '';
  const { coords: targetCoords } = getTargetState(phase, scenarioId);

  // ── INITIALIZE MAP ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current) return;
    let map: any;

    const initMap = async () => {
      // Dynamic import to avoid SSR issues
      const maplibregl = (await import('maplibre-gl')).default;

      // Clean up previous map
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      const center = activeScenario
        ? [activeScenario.location.lng, activeScenario.location.lat]
        : [44.19, 15.37];

      const zoom = activeScenario
        ? (viewMode === 'drone' ? 17 : 15)
        : 3;

      const pitch = activeScenario ? (viewMode === 'drone' ? 60 : 50) : 0;
      const bearing = activeScenario ? (activeScenario.mapHeading ?? 35) : 0;

      map = new maplibregl.Map({
        container: mapContainerRef.current!,
        style: {
          version: 8,
          name: 'Tactical Satellite',
          sources: {
            'satellite': {
              type: 'raster',
              tiles: [
                'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
              ],
              tileSize: 256,
              maxzoom: 19,
              attribution: '© Esri',
            },
          },
          layers: [
            {
              id: 'satellite-tiles',
              type: 'raster',
              source: 'satellite',
              paint: {
                'raster-brightness-max': 0.65,
                'raster-contrast': 0.35,
                'raster-saturation': -0.15,
              },
            },
          ],
        },
        center: center as [number, number],
        zoom,
        pitch,
        bearing,
        maxPitch: 75,
        attributionControl: false,
      } as any);


      map.on('load', () => {
        mapRef.current = map;
        setLoaded(true);
        onMapReady?.(map);

        // Initialize target animated position
        if (activeScenario) {
          targetAnimRef.current = {
            lat: activeScenario.location.lat,
            lng: activeScenario.location.lng,
          };
        }

        // ── ADD TACTICAL OVERLAY SOURCES ────────────────────────────
        addTacticalSources(map);

        // ── ADD DRONE SOURCES ──────────────────────────────────────
        addDroneSources(map);

        // ── ADD TARGET RETICLE ─────────────────────────────────────
        addTargetReticle(map);
      });
    };

    initMap();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      setLoaded(false);
    };
  }, [activeScenario]); // Re-init when scenario changes

  // ── ADD TACTICAL DATA SOURCES & LAYERS ──────────────────────────────────
  function addTacticalSources(map: any) {
    if (!activeScenario) return;
    const data = getTacticalData(activeScenario.id);
    if (!data) return;

    // Threat zone circles (lethal, danger, caution)
    const threatFeatures: any[] = [];
    data.threatZones.forEach(tz => {
      // Lethal ring
      threatFeatures.push({
        type: 'Feature',
        properties: { level: 'lethal', label: `${tz.lethalRadius}m LETHAL` },
        geometry: { type: 'Polygon', coordinates: [circleGeoJSON(tz.center.lat, tz.center.lng, tz.lethalRadius)] },
      });
      // Danger ring
      threatFeatures.push({
        type: 'Feature',
        properties: { level: 'danger', label: `${tz.dangerRadius}m DANGER` },
        geometry: { type: 'Polygon', coordinates: [circleGeoJSON(tz.center.lat, tz.center.lng, tz.dangerRadius)] },
      });
      // Caution ring
      threatFeatures.push({
        type: 'Feature',
        properties: { level: 'caution', label: `${tz.cautionRadius}m CAUTION` },
        geometry: { type: 'Polygon', coordinates: [circleGeoJSON(tz.center.lat, tz.center.lng, tz.cautionRadius)] },
      });
    });

    map.addSource('threat-zones', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: threatFeatures },
    });
    // Caution fill
    map.addLayer({
      id: 'threat-caution-fill', type: 'fill', source: 'threat-zones',
      filter: ['==', ['get', 'level'], 'caution'],
      paint: { 'fill-color': '#ffaa00', 'fill-opacity': 0.04 },
    });
    map.addLayer({
      id: 'threat-caution-line', type: 'line', source: 'threat-zones',
      filter: ['==', ['get', 'level'], 'caution'],
      paint: { 'line-color': '#ffaa00', 'line-width': 1, 'line-dasharray': [8, 4], 'line-opacity': 0.5 },
    });
    // Danger fill
    map.addLayer({
      id: 'threat-danger-fill', type: 'fill', source: 'threat-zones',
      filter: ['==', ['get', 'level'], 'danger'],
      paint: { 'fill-color': '#ff6600', 'fill-opacity': 0.07 },
    });
    map.addLayer({
      id: 'threat-danger-line', type: 'line', source: 'threat-zones',
      filter: ['==', ['get', 'level'], 'danger'],
      paint: { 'line-color': '#ff6600', 'line-width': 1.5, 'line-dasharray': [5, 3], 'line-opacity': 0.6 },
    });
    // Lethal fill
    map.addLayer({
      id: 'threat-lethal-fill', type: 'fill', source: 'threat-zones',
      filter: ['==', ['get', 'level'], 'lethal'],
      paint: { 'fill-color': '#ff1a2e', 'fill-opacity': 0.16 },
    });
    map.addLayer({
      id: 'threat-lethal-line', type: 'line', source: 'threat-zones',
      filter: ['==', ['get', 'level'], 'lethal'],
      paint: { 'line-color': '#ff1a2e', 'line-width': 2, 'line-opacity': 0.75 },
    });

    // Drone route lines
    const routeFeatures = data.droneRoutes.map(route => ({
      type: 'Feature' as const,
      properties: { color: route.color, label: route.label, type: route.type },
      geometry: {
        type: 'LineString' as const,
        coordinates: route.waypoints.map(wp => [wp.lng, wp.lat]),
      },
    }));
    map.addSource('drone-routes', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: routeFeatures },
    });
    map.addLayer({
      id: 'drone-routes-line', type: 'line', source: 'drone-routes',
      paint: {
        'line-color': ['get', 'color'],
        'line-width': 1.5,
        'line-dasharray': [6, 4],
        'line-opacity': 0.55,
      },
    });

    // No-Strike Zones
    const nszFeatures = data.noStrikeZones.map(nsz => ({
      type: 'Feature' as const,
      properties: { label: nsz.label, type: nsz.type },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [nsz.polygon.map(p => [p.lng, p.lat]).concat([[nsz.polygon[0].lng, nsz.polygon[0].lat]])],
      },
    }));
    map.addSource('no-strike-zones', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: nszFeatures },
    });
    map.addLayer({
      id: 'nsz-fill', type: 'fill', source: 'no-strike-zones',
      paint: { 'fill-color': '#00d47e', 'fill-opacity': 0.12 },
    });
    map.addLayer({
      id: 'nsz-line', type: 'line', source: 'no-strike-zones',
      paint: { 'line-color': '#00d47e', 'line-width': 2, 'line-dasharray': [4, 3] },
    });

    // Sensor arcs
    const arcFeatures = data.sensorArcs.map(sa => ({
      type: 'Feature' as const,
      properties: { sensorType: sa.sensorType, color: sa.color },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [arcGeoJSON(sa.center.lat, sa.center.lng, sa.radius, sa.startBearing, sa.endBearing)],
      },
    }));
    map.addSource('sensor-arcs', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: arcFeatures },
    });
    map.addLayer({
      id: 'sensor-arcs-fill', type: 'fill', source: 'sensor-arcs',
      paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.12 },
    });

    // Civilian infrastructure markers
    const civFeatures = data.civilianInfra.map(ci => ({
      type: 'Feature' as const,
      properties: { label: ci.label, type: ci.type },
      geometry: { type: 'Point' as const, coordinates: [ci.position.lng, ci.position.lat] },
    }));
    map.addSource('civilian-infra', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: civFeatures },
    });
    map.addLayer({
      id: 'civilian-infra-labels', type: 'symbol', source: 'civilian-infra',
      layout: {
        'text-field': ['get', 'label'],
        'text-size': 8,
        'text-font': ['Open Sans Regular'],
        'text-anchor': 'top',
        'text-offset': [0, 0.8],
      },
      paint: {
        'text-color': '#00d47e',
        'text-halo-color': '#000000',
        'text-halo-width': 1,
      },
    });
    map.addLayer({
      id: 'civilian-infra-dots', type: 'circle', source: 'civilian-infra',
      paint: {
        'circle-radius': 4,
        'circle-color': '#00d47e',
        'circle-opacity': 0.7,
        'circle-stroke-color': '#00d47e',
        'circle-stroke-width': 1,
      },
    });

    // Friendly assets (static drone/fob/sigint markers)
    const assetFeatures = data.friendlyAssets.map(fa => ({
      type: 'Feature' as const,
      properties: { designator: fa.designator, type: fa.type, status: fa.status },
      geometry: { type: 'Point' as const, coordinates: [fa.position.lng, fa.position.lat] },
    }));
    map.addSource('friendly-assets', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: assetFeatures },
    });
    map.addLayer({
      id: 'friendly-assets-labels', type: 'symbol', source: 'friendly-assets',
      layout: {
        'text-field': ['get', 'designator'],
        'text-size': 7,
        'text-font': ['Open Sans Regular'],
        'text-anchor': 'top',
        'text-offset': [0, 1],
      },
      paint: {
        'text-color': '#0096ff',
        'text-halo-color': '#000000',
        'text-halo-width': 1,
      },
    });

    // Pattern tracks
    if (data.patternTracks?.length > 0) {
      const trackFeatures = data.patternTracks.map(pt => ({
        type: 'Feature' as const,
        properties: { label: pt.label },
        geometry: {
          type: 'LineString' as const,
          coordinates: pt.positions.map(p => [p.lng, p.lat]),
        },
      }));
      map.addSource('pattern-tracks', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: trackFeatures },
      });
      map.addLayer({
        id: 'pattern-tracks-line', type: 'line', source: 'pattern-tracks',
        paint: { 'line-color': '#ffaa00', 'line-width': 1.5, 'line-dasharray': [3, 2], 'line-opacity': 0.6 },
      });
    }

    // Engagement zone
    if (data.engagementZone?.length > 0) {
      map.addSource('engagement-zone', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: [data.engagementZone.map(p => [p.lng, p.lat]).concat([[data.engagementZone[0].lng, data.engagementZone[0].lat]])],
          },
        },
      });
      map.addLayer({
        id: 'engagement-zone-fill', type: 'fill', source: 'engagement-zone',
        paint: { 'fill-color': '#ff1a2e', 'fill-opacity': 0.06 },
      });
      map.addLayer({
        id: 'engagement-zone-line', type: 'line', source: 'engagement-zone',
        paint: { 'line-color': '#ff1a2e', 'line-width': 1.5, 'line-dasharray': [6, 3], 'line-opacity': 0.4 },
      });
    }

    // COA Vectors
    if (data.coaVectors?.length > 0) {
      const coaFeatures = data.coaVectors.map(coa => {
        const coords = arcGeoJSON(coa.origin.lat, coa.origin.lng, coa.range, coa.bearing - coa.spreadAngle / 2, coa.bearing + coa.spreadAngle / 2);
        return {
          type: 'Feature' as const,
          properties: { label: coa.label, color: coa.color },
          geometry: { type: 'Polygon' as const, coordinates: [coords] },
        };
      });
      map.addSource('coa-vectors', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: coaFeatures },
      });
      map.addLayer({
        id: 'coa-vectors-fill', type: 'fill', source: 'coa-vectors',
        paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.08 },
      });
      map.addLayer({
        id: 'coa-vectors-line', type: 'line', source: 'coa-vectors',
        paint: { 'line-color': ['get', 'color'], 'line-width': 1, 'line-dasharray': [4, 4], 'line-opacity': 0.5 },
      });
    }
  }

  // ── ADD DRONE SOURCES ─────────────────────────────────────────────────
  function addDroneSources(map: any) {
    // Drone positions (GeoJSON source updated each frame)
    map.addSource('drones', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });

    // Sensor cones
    map.addSource('sensor-cones', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });
    map.addLayer({
      id: 'sensor-cones-fill', type: 'fill', source: 'sensor-cones',
      paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.15 },
    });
    map.addLayer({
      id: 'sensor-cones-line', type: 'line', source: 'sensor-cones',
      paint: { 'line-color': ['get', 'color'], 'line-width': 0.8, 'line-opacity': 0.4 },
    });

    // Strike lines
    map.addSource('strike-lines', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });
    map.addLayer({
      id: 'strike-lines-layer', type: 'line', source: 'strike-lines',
      paint: {
        'line-color': '#ff1a2e',
        'line-width': ['get', 'width'],
        'line-opacity': ['get', 'opacity'],
      },
    });

    // Impact shockwave ring
    map.addSource('impact-ring', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });
    map.addLayer({
      id: 'impact-ring-fill', type: 'fill', source: 'impact-ring',
      paint: { 'fill-color': '#ff1a2e', 'fill-opacity': 0.25 },
    });
    map.addLayer({
      id: 'impact-ring-line', type: 'line', source: 'impact-ring',
      paint: { 'line-color': '#ff1a2e', 'line-width': 2.5, 'line-opacity': 0.8 },
    });

    // Load drone SVG icons for each color
    const droneColors = [
      { id: 'drone-alpha', color: '#0096ff' },
      { id: 'drone-beta', color: '#ff1a2e' },
      { id: 'drone-gamma', color: '#ffaa00' },
    ];

    droneColors.forEach(({ id, color }) => {
      const img = new Image(64, 64);
      img.onload = () => {
        if (!map.hasImage(id)) {
          map.addImage(id, img, { sdf: false });
        }
      };
      img.src = makeDroneSvgUrl(color);
    });

    // Add drone symbol layer (rendered AFTER icons load)
    map.addLayer({
      id: 'drones-layer', type: 'symbol', source: 'drones',
      layout: {
        'icon-image': ['get', 'icon'],
        'icon-size': 0.55,
        'icon-rotate': ['get', 'heading'],
        'icon-rotation-alignment': 'map',
        'icon-allow-overlap': true,
        'text-field': ['get', 'label'],
        'text-size': 8,
        'text-font': ['Open Sans Regular'],
        'text-anchor': 'top',
        'text-offset': [0, 2],
      },
      paint: {
        'text-color': ['get', 'textColor'],
        'text-halo-color': '#000000',
        'text-halo-width': 1.5,
        'icon-opacity': 1,
      },
    });
  }

  // ── ADD TARGET RETICLE ────────────────────────────────────────────────
  function addTargetReticle(map: any) {
    if (!activeScenario) return;
    const loc = activeScenario.location;

    map.addSource('target-reticle', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: { type: 'Point', coordinates: [loc.lng, loc.lat] },
      },
    });
    // Outer pulsing ring
    map.addLayer({
      id: 'target-reticle-outer', type: 'circle', source: 'target-reticle',
      paint: {
        'circle-radius': 22,
        'circle-color': 'transparent',
        'circle-stroke-color': '#ff1a2e',
        'circle-stroke-width': 1.5,
        'circle-opacity': 0.8,
      },
    });
    // Inner dot
    map.addLayer({
      id: 'target-reticle-inner', type: 'circle', source: 'target-reticle',
      paint: {
        'circle-radius': 5,
        'circle-color': '#ff1a2e',
        'circle-opacity': 0.9,
        'circle-blur': 0.3,
      },
    });
  }

  // ── PHASE-DRIVEN CAMERA TRANSITIONS ─────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !activeScenario || !loaded) return;

    const getCameraForPhase = (p: string) => {
      const baseHeading = activeScenario.mapHeading ?? 35;
      switch (p) {
        case 'scanning': case 'target_acquired':
          return { zoom: viewMode === 'drone' ? 16.5 : 14.5, pitch: viewMode === 'drone' ? 55 : 40, bearing: baseHeading };
        case 'tracking': case 'confidence_building':
          return { zoom: viewMode === 'drone' ? 17 : 15.5, pitch: viewMode === 'drone' ? 58 : 48, bearing: baseHeading + 10 };
        case 'alert_threshold': case 'authorization_pending': case 'authorized':
          return { zoom: viewMode === 'drone' ? 17.3 : 16, pitch: viewMode === 'drone' ? 60 : 52, bearing: baseHeading + 22 };
        case 'drone_dispatched':
          return { zoom: viewMode === 'drone' ? 17.5 : 16.2, pitch: viewMode === 'drone' ? 62 : 55, bearing: baseHeading + 38 };
        case 'engagement':
          return { zoom: viewMode === 'drone' ? 17.8 : 16.5, pitch: 64, bearing: baseHeading + 55 };
        case 'impact':
          return { zoom: viewMode === 'drone' ? 17.8 : 16.5, pitch: 68, bearing: baseHeading + 80 };
        case 'assessment':
          return { zoom: viewMode === 'drone' ? 16 : 14, pitch: 40, bearing: baseHeading + 110 };
        default:
          return { zoom: 15, pitch: 50, bearing: baseHeading };
      }
    };

    if (phase !== prevPhaseRef.current) {
      prevPhaseRef.current = phase;
      const cam = getCameraForPhase(phase);
      const { coords } = getTargetState(phase, scenarioId);

      map.flyTo({
        center: [coords.lng, coords.lat],
        zoom: cam.zoom,
        pitch: cam.pitch,
        bearing: cam.bearing,
        duration: phase === 'impact' ? 1500 : 3000,
        essential: true,
      });
    }
  }, [phase, activeScenario, loaded, viewMode, scenarioId]);

  // ── VIEW MODE CAMERA TRANSITION ─────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !activeScenario || !loaded) return;

    map.flyTo({
      center: [targetCoords.lng, targetCoords.lat],
      zoom: viewMode === 'drone' ? 17.5 : 15.5,
      pitch: viewMode === 'drone' ? 60 : 50,
      duration: 2500,
      essential: true,
    });
  }, [viewMode]);

  // ── AUTOPILOT ORBIT ─────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !orbitActive || !activeScenario || !loaded) return;

    let orbitFrame: number;
    const rotate = () => {
      const currentBearing = map.getBearing();
      map.setBearing(currentBearing + 0.06);
      orbitFrame = requestAnimationFrame(rotate);
    };
    orbitFrame = requestAnimationFrame(rotate);
    return () => cancelAnimationFrame(orbitFrame);
  }, [orbitActive, loaded, activeScenario]);

  // ── 60FPS ANIMATION LOOP — Drone orbits, sensor cones, strikes ──────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !activeScenario || !loaded) return;

    // Reset animation refs
    if (phase !== 'engagement') swoopProgressRef.current = 0;
    if (phase !== 'impact') impactPulseRef.current = 0;

    const shouldShowDrones =
      phase === 'drone_dispatched' ||
      phase === 'engagement' ||
      phase === 'impact';

    const droneConfigs = [
      {
        startOffset: { lat: 0.045, lng: -0.055 },
        orbitRadius: 0.004,
        orbitSpeed: 1.0,
        orbitOffset: 0,
        color: '#0096ff',
        icon: 'drone-alpha',
        label: 'MQ-9 ALPHA — ISR',
        role: 'ISR RECON',
      },
      {
        startOffset: { lat: -0.05, lng: 0.048 },
        orbitRadius: 0.0028,
        orbitSpeed: -0.85,
        orbitOffset: 2.1,
        color: '#ff1a2e',
        icon: 'drone-beta',
        label: 'MQ-9 BETA — STRIKE',
        role: 'STRIKE ASSET',
      },
      {
        startOffset: { lat: 0.04, lng: 0.052 },
        orbitRadius: 0.0055,
        orbitSpeed: 0.65,
        orbitOffset: 4.2,
        color: '#ffaa00',
        icon: 'drone-gamma',
        label: 'MQ-9 GAMMA — OVERWATCH',
        role: 'OVERWATCH',
      },
    ];

    const tick = () => {
      // 1. Smooth target coordinate interpolation
      const anim = targetAnimRef.current;
      anim.lat += (targetCoords.lat - anim.lat) * 0.05;
      anim.lng += (targetCoords.lng - anim.lng) * 0.05;

      // Update target reticle
      const reticleSrc = map.getSource('target-reticle');
      if (reticleSrc) {
        reticleSrc.setData({
          type: 'Feature',
          properties: {},
          geometry: { type: 'Point', coordinates: [anim.lng, anim.lat] },
        });
      }

      // 2. Animate drones
      if (shouldShowDrones) {
        entryProgressRef.current = Math.min(entryProgressRef.current + 0.006, 1.0);
        angleRef.current = (angleRef.current + 0.0008) % (Math.PI * 2);

        if (phase === 'engagement') {
          swoopProgressRef.current = Math.min(swoopProgressRef.current + 0.005, 1.0);
        }

        const angle = angleRef.current;
        const entry = entryProgressRef.current;
        const swoop = swoopProgressRef.current;

        const droneFeatures: any[] = [];
        const coneFeatures: any[] = [];
        const strikeFeatures: any[] = [];

        droneConfigs.forEach((cfg, i) => {
          const startLat = targetCoords.lat + cfg.startOffset.lat;
          const startLng = targetCoords.lng + cfg.startOffset.lng;

          const orbitAngle = angle * cfg.orbitSpeed + cfg.orbitOffset;
          const orbitLat = anim.lat + cfg.orbitRadius * Math.cos(orbitAngle);
          const orbitLng = anim.lng + cfg.orbitRadius * Math.sin(orbitAngle);

          let droneLat = startLat + (orbitLat - startLat) * entry;
          let droneLng = startLng + (orbitLng - startLng) * entry;

          // Engagement swoop
          if (swoop > 0 && i === 1) { // Only BETA swoops
            droneLat += (anim.lat - droneLat) * swoop * 0.7;
            droneLng += (anim.lng - droneLng) * swoop * 0.7;
          }

          // Compute heading (bearing toward target)
          const dLat = anim.lat - droneLat;
          const dLng = anim.lng - droneLng;
          const heading = Math.atan2(dLng, dLat) * (180 / Math.PI);

          droneFeatures.push({
            type: 'Feature',
            properties: {
              icon: cfg.icon,
              heading: heading,
              label: cfg.label,
              textColor: cfg.color,
            },
            geometry: { type: 'Point', coordinates: [droneLng, droneLat] },
          });

          // Sensor cone
          const coneCoords = computeSensorCone(droneLat, droneLng, anim.lat, anim.lng);
          coneFeatures.push({
            type: 'Feature',
            properties: { color: cfg.color },
            geometry: { type: 'Polygon', coordinates: [coneCoords] },
          });

          // Strike lines during engagement
          if (phase === 'engagement') {
            strikeFeatures.push({
              type: 'Feature',
              properties: { width: i === 1 ? 3 : 1.5, opacity: i === 1 ? 0.95 : 0.5 },
              geometry: {
                type: 'LineString',
                coordinates: [[droneLng, droneLat], [anim.lng, anim.lat]],
              },
            });
          }
        });

        // Update sources
        const dronesSrc = map.getSource('drones');
        if (dronesSrc) dronesSrc.setData({ type: 'FeatureCollection', features: droneFeatures });

        const conesSrc = map.getSource('sensor-cones');
        if (conesSrc) conesSrc.setData({ type: 'FeatureCollection', features: coneFeatures });

        const strikesSrc = map.getSource('strike-lines');
        if (strikesSrc) strikesSrc.setData({ type: 'FeatureCollection', features: strikeFeatures });
      } else {
        // Clear drones when not active
        entryProgressRef.current = 0;
        const dronesSrc = map.getSource('drones');
        if (dronesSrc) dronesSrc.setData({ type: 'FeatureCollection', features: [] });
        const conesSrc = map.getSource('sensor-cones');
        if (conesSrc) conesSrc.setData({ type: 'FeatureCollection', features: [] });
        const strikesSrc = map.getSource('strike-lines');
        if (strikesSrc) strikesSrc.setData({ type: 'FeatureCollection', features: [] });
      }

      // 3. Impact shockwave
      if (phase === 'impact') {
        impactPulseRef.current = Math.min(impactPulseRef.current + 0.01, 1.0);
        const radius = impactPulseRef.current * 200;
        const ringCoords = circleGeoJSON(anim.lat, anim.lng, radius);

        const impactSrc = map.getSource('impact-ring');
        if (impactSrc) {
          impactSrc.setData({
            type: 'Feature',
            properties: {},
            geometry: { type: 'Polygon', coordinates: [ringCoords] },
          });
        }

        // Update layer opacity as ring expands
        try {
          map.setPaintProperty('impact-ring-fill', 'fill-opacity', 0.3 * (1 - impactPulseRef.current));
          map.setPaintProperty('impact-ring-line', 'line-opacity', 1.0 * (1 - impactPulseRef.current));
        } catch (_) {}

        // Thermal flash
        if (screenFlashRef.current) {
          if (impactPulseRef.current < 0.1) {
            screenFlashRef.current.style.opacity = '1';
            screenFlashRef.current.style.display = 'block';
          } else {
            screenFlashRef.current.style.opacity = '0';
            screenFlashRef.current.style.transition = 'opacity 0.6s ease-out';
          }
        }
      } else {
        // Clear impact ring
        const impactSrc = map.getSource('impact-ring');
        if (impactSrc) impactSrc.setData({ type: 'FeatureCollection', features: [] });
        if (screenFlashRef.current) {
          screenFlashRef.current.style.display = 'none';
          screenFlashRef.current.style.opacity = '0';
        }
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [phase, activeScenario, loaded, targetCoords, viewMode, scenarioId]);

  return (
    <div className={`w-full h-full block relative ${className ?? ''}`}>
      <div
        ref={mapContainerRef}
        className="w-full h-full block"
        style={{ minHeight: '100%' }}
      />
      {/* Thermal flash overlay */}
      <div
        ref={screenFlashRef}
        className="absolute inset-0 bg-white pointer-events-none z-[9999]"
        style={{ display: 'none', opacity: 0 }}
      />
    </div>
  );
}
