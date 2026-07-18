'use client';
import { useEffect, useRef, useState } from 'react';
import { useSimulationStore } from '@/store/simulation';
import { useMapLayerStore } from '@/store/mapLayers';
import { getTacticalData, offsetLatLng } from '@/lib/tacticalData';

// ═════════════════════════════════════════════════════════════════════════
// CDN LOADER — bypasses webpack to prevent blob worker corruption
// ═════════════════════════════════════════════════════════════════════════
// When webpack bundles maplibre-gl the ESM build, it can corrupt the
// inline blob-worker code, causing silent tile decode failures (black map).
// Loading the CSP build directly via <script> tag bypasses webpack entirely.
// CSP build is UMD → sets window.maplibregl. The CSP worker is served from
// /public/maplibre-gl-csp-worker.js (same origin, no CORS issues).
const MAPLIBRE_VERSION = '5.24.0';
let _maplibreLoading: Promise<any> | null = null;

async function ensureMapLibre(): Promise<any> {
  if (typeof window === 'undefined') throw new Error('SSR context');
  if ((window as any).maplibregl) return (window as any).maplibregl;
  if (_maplibreLoading) return _maplibreLoading;

  _maplibreLoading = (async () => {
    // ─ CSS (──────────────────────────────────────────────────────────────────────
    if (!document.getElementById('maplibre-gl-css')) {
      const link = document.createElement('link');
      link.id = 'maplibre-gl-css';
      link.rel = 'stylesheet';
      link.href = `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.css`;
      document.head.appendChild(link);
    }
    // ─ JS: CSP build (UMD) from CDN ─────────────────────────────────────────────
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl-csp.js`;
      script.crossOrigin = 'anonymous';
      script.onload  = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load MapLibre ${MAPLIBRE_VERSION} from CDN`));
      document.head.appendChild(script);
    });
    // ─ CSP worker ───────────────────────────────────────────────────────────────────
    // CSP build + CSP worker = compatible pair. Worker hosted in /public/
    // (same-origin, auto-copied by postinstall script).
    const mgl = (window as any).maplibregl;
    if (mgl && !mgl._cspWorkerSet) {
      mgl.workerUrl = '/maplibre-gl-csp-worker.js';
      mgl._cspWorkerSet = true;
    }
    return mgl;
  })();

  return _maplibreLoading;
}

// ═══════════════════════════════════════════════════════════════════════════
// MQ-9 REAPER SVG — top-down silhouette as data URI for MapLibre icon
// ═══════════════════════════════════════════════════════════════════════════
const MQ9_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <g fill="none" stroke="COLOR" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M32 4 L34 10 L35 28 L34 52 L33 58 L32 60 L31 58 L30 52 L29 28 L30 10 Z" fill="COLORaa" stroke="COLOR"/>
    <path d="M29 22 L8 30 L7 32 L8 33 L29 28" fill="COLOR44" stroke="COLOR"/>
    <path d="M35 22 L56 30 L57 32 L56 33 L35 28" fill="COLOR44" stroke="COLOR"/>
    <path d="M30 50 L20 54 L19 55 L20 56 L30 53" fill="COLOR44" stroke="COLOR"/>
    <path d="M34 50 L44 54 L45 55 L44 56 L34 53" fill="COLOR44" stroke="COLOR"/>
    <path d="M31 56 L28 62 L32 60 L36 62 L33 56" fill="COLOR44" stroke="COLOR"/>
    <ellipse cx="32" cy="48" rx="3" ry="5" fill="COLOR33" stroke="COLOR" stroke-width="1"/>
    <circle cx="32" cy="8" r="2.5" fill="COLOR" stroke="COLOR" stroke-width="0.5"/>
  </g>
</svg>`;

function makeDroneSvgUrl(color: string): string {
  const svg = MQ9_SVG.replace(/COLOR/g, color);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// GEOMETRY HELPERS
// ═══════════════════════════════════════════════════════════════════════════
function computeSensorCone(
  droneLat: number, droneLng: number,
  targetLat: number, targetLng: number,
  halfAngleDeg = 18, steps = 12
): [number, number][] {
  const bearing = Math.atan2(targetLng - droneLng, targetLat - droneLat) * (180 / Math.PI);
  const dist = Math.sqrt(
    Math.pow((targetLat - droneLat) * 111320, 2) +
    Math.pow((targetLng - droneLng) * 111320 * Math.cos(droneLat * Math.PI / 180), 2)
  );
  const coneRange = Math.max(dist * 0.75, 80);
  const coords: [number, number][] = [[droneLng, droneLat]];
  for (let i = 0; i <= steps; i++) {
    const angle = bearing - halfAngleDeg + (2 * halfAngleDeg * i / steps);
    const rad = (angle * Math.PI) / 180;
    const offsetLat = droneLat + (coneRange / 111320) * Math.cos(rad);
    const offsetLng = droneLng + (coneRange / (111320 * Math.cos(droneLat * Math.PI / 180))) * Math.sin(rad);
    coords.push([offsetLng, offsetLat]);
  }
  coords.push([droneLng, droneLat]);
  return coords;
}

function circleGeoJSON(lat: number, lng: number, radiusM: number, steps = 64): [number, number][] {
  const coords: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 360;
    const pt = offsetLatLng(lat, lng, radiusM, angle);
    coords.push([pt.lng, pt.lat]);
  }
  return coords;
}

function arcGeoJSON(lat: number, lng: number, radiusM: number, startBearing: number, endBearing: number, steps = 32): [number, number][] {
  const coords: [number, number][] = [[lng, lat]];
  let sweep = endBearing - startBearing;
  if (sweep < 0) sweep += 360;
  for (let i = 0; i <= steps; i++) {
    const bearing = startBearing + (sweep * i / steps);
    const pt = offsetLatLng(lat, lng, radiusM, bearing);
    coords.push([pt.lng, pt.lat]);
  }
  coords.push([lng, lat]);
  return coords;
}

// ═══════════════════════════════════════════════════════════════════════════
// DRONE LIFECYCLE PHASES
// scanning/target_acquired/tracking/confidence_building/alert_threshold
//   → loitering at FOB (droneOrigin)
// authorization_pending/authorized
//   → breaking loiter, converging, beginning transit
// drone_dispatched
//   → hunting pattern over reported area
// engagement
//   → BETA terminal approach, ALPHA/GAMMA ISR overwatch
// impact
//   → scatter (blast avoidance), camera pull back
// ═══════════════════════════════════════════════════════════════════════════


type DroneStage = 'fob-loiter' | 'transit' | 'hunting' | 'terminal' | 'scatter' | 'post-strike-loiter' | 'hidden';


function getDroneStageForPhase(phase: string): DroneStage {
  switch (phase) {
    case 'scanning':
    case 'target_acquired':
    case 'tracking':
    case 'confidence_building':
    case 'alert_threshold':
      return 'fob-loiter';
    case 'authorization_pending':
    case 'authorized':
      return 'transit';
    case 'drone_dispatched':
      return 'hunting';
    case 'engagement':
      return 'terminal';
    case 'impact':
      return 'scatter';
    case 'assessment':
      return 'post-strike-loiter';
    default:
      return 'hidden';
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export function MapLibreSatellite({ className, onMapReady, onFallback }: {
  className?: string;
  onMapReady?: (map: any) => void;
  onFallback?: () => void;
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const animFrameRef = useRef<number>(0);
  const screenFlashRef = useRef<HTMLDivElement>(null);
  const thermalRef = useRef<HTMLDivElement>(null);
  const prevPhaseRef = useRef<string>('idle');

  // Hover tooltip state
  const [tooltip, setTooltip] = useState<{
    x: number; y: number;
    type: 'drone' | 'target';
    label: string;
    lines: { key: string; value: string; color?: string }[];
  } | null>(null);

  // Track whether any tiles have ever loaded (watchdog)
  const tilesLoadedRef = useRef<boolean>(false);
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Continuous target drift state (never teleports)
  const targetPosRef = useRef<{ lat: number; lng: number }>({ lat: 0, lng: 0 });
  const targetDriftAngleRef = useRef<number>(Math.random() * Math.PI * 2);
  const targetFrozenRef = useRef<boolean>(false);
  const targetFreezeTimeRef = useRef<number>(0);

  // Drone animation state refs
  const angleRef = useRef<number>(0);
  const transitProgressRef = useRef<number>(0);
  const huntProgressRef = useRef<number>(0);
  const swoopProgressRef = useRef<number>(0);
  const scatterProgressRef = useRef<number>(0);
  const impactPulseRef = useRef<number>(0);
  const impactDebrisRef = useRef<number>(0);
  const impactSmokeRef = useRef<number>(0);
  const missileProgressRef = useRef<number>(0);
  const missileActiveRef = useRef<boolean>(false);
  const missileStartRef = useRef<{ lat: number; lng: number }>({ lat: 0, lng: 0 });

  const { activeScenario, phase, viewMode, orbitActive } = useSimulationStore();
  const [loaded, setLoaded] = useState(false);

  const scenarioId = activeScenario?.id ?? '';

  // ── INITIALIZE MAP ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current) return;
    let map: any;

    const initMap = async () => {
      const maplibregl = await ensureMapLibre();
      if (!maplibregl) throw new Error('MapLibre CDN load returned null');
      console.log('[LAWS-SIM] MapLibre loaded via CDN CSP build ✓');
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }

      const loc = activeScenario?.location ?? { lat: 15.37, lng: 44.19 };

      // Initialize target to scenario location
      targetPosRef.current = { lat: loc.lat, lng: loc.lng };
      targetDriftAngleRef.current = Math.random() * Math.PI * 2;
      targetFrozenRef.current = false;
      targetFreezeTimeRef.current = 0;

      // Reset animation state
      transitProgressRef.current = 0;
      huntProgressRef.current = 0;
      swoopProgressRef.current = 0;
      scatterProgressRef.current = 0;
      impactPulseRef.current = 0;
      impactDebrisRef.current = 0;
      impactSmokeRef.current = 0;
      missileProgressRef.current = 0;
      missileActiveRef.current = false;

      const zoom = viewMode === 'drone' ? 16 : 14.5;
      const pitch = viewMode === 'drone' ? 60 : 48;
      const bearing = activeScenario?.mapHeading ?? 35;

      map = new maplibregl.Map({
        container: mapContainerRef.current!,
        style: {
          version: 8,
          name: 'LAWS Tactical Feed',
          // Protomaps CDN — reliable glyph delivery, has Open Sans variants
          glyphs: 'https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf',
          sources: {
            // ── CARTO Dark (no labels) ───────────────────────────────────
            // Free (CC BY 3.0), no API key required, multi-CDN for reliability.
            // Chosen over ArcGIS Satellite which now requires paid API auth.
            base: {
              type: 'raster',
              tiles: [
                'https://a.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png',
                'https://b.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png',
                'https://c.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png',
                'https://d.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png',
              ],
              tileSize: 256,
              maxzoom: 20,
              attribution: '\u00a9 <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors \u00a9 <a href="https://carto.com/attributions">CARTO</a>',
            },
          },
          layers: [
            // Background always visible — prevents pure-black void when tiles load
            { id: 'background', type: 'background', paint: { 'background-color': '#0d1b2a' } },
            {
              id: 'base-tiles', type: 'raster', source: 'base',
              paint: {
                'raster-brightness-max': 0.80, 'raster-contrast': 0.48,
                'raster-saturation': -0.65,    'raster-brightness-min': 0.0,
              },
            },
          ],
        },
        center: [loc.lng, loc.lat] as [number, number],
        zoom, pitch, bearing, maxPitch: 75, attributionControl: false,
        antialias: true,
      } as any);

      // ── Error handler: log tile/style errors ────────────────────────
      let tileErrorCount = 0;
      map.on('error', (e: any) => {
        const msg = e?.error?.message ?? String(e);
        console.warn('[LAWS-SIM] MapLibre error:', msg);
        // If we get repeated tile errors, fall back to canvas
        if (msg.includes('Failed to fetch') || msg.includes('net::ERR') ||
            msg.includes('404') || msg.includes('403') || msg.includes('0')) {
          tileErrorCount++;
          if (tileErrorCount >= 3 && !tilesLoadedRef.current) {
            console.warn('[LAWS-SIM] Tile errors threshold — triggering canvas fallback');
            onFallback?.();
          }
        }
      });

      // ── Tile watchdog: 8 s — only cleared when a real tile is decoded ──
      // CRITICAL: never clear watchdog in 'render' — that fires on blank
      // frames, permanently preventing the canvas fallback.
      tilesLoadedRef.current = false;
      watchdogRef.current = setTimeout(() => {
        if (!tilesLoadedRef.current) {
          console.warn('[LAWS-SIM] Watchdog: no tiles in 8 s — canvas fallback');
          onFallback?.();
        }
      }, 8000);

      const confirmTiles = () => {
        if (!tilesLoadedRef.current) {
          tilesLoadedRef.current = true;
          if (watchdogRef.current) { clearTimeout(watchdogRef.current); watchdogRef.current = null; }
          console.log('[LAWS-SIM] Tiles confirmed ✓');
        }
      };
      // 'data' with dataType==='tile' fires only when a tile is decoded
      map.on('data', (e: any) => { if (e.dataType === 'tile') confirmTiles(); });
      // sourcedata with e.tile as secondary confirm
      map.on('sourcedata', (e: any) => { if (e.tile) confirmTiles(); });


      map.on('load', () => {
        mapRef.current = map;
        setLoaded(true);
        onMapReady?.(map);

        // ── Critical: resize to fill container (layout may not be settled) ──
        setTimeout(() => { try { map.resize(); } catch (_) {} }, 80);
        setTimeout(() => { try { map.resize(); } catch (_) {} }, 400);

        // ResizeObserver keeps map filling its container on dynamic layout changes
        if (mapContainerRef.current && typeof ResizeObserver !== 'undefined') {
          const ro = new ResizeObserver(() => { try { map.resize(); } catch (_) {} });
          ro.observe(mapContainerRef.current);
          // Store for cleanup
          (mapRef.current as any)._resizeObserver = ro;
        }

        // Wrap each init step so one failure doesn't block the others
        try { addTacticalSources(map); } catch (e) { console.warn('[LAWS-SIM] tactical sources:', e); }
        try { addDroneSources(map); }    catch (e) { console.warn('[LAWS-SIM] drone sources:', e); }
        try { addTargetReticle(map); }   catch (e) { console.warn('[LAWS-SIM] target reticle:', e); }
        try { addFOBMarker(map); }       catch (e) { console.warn('[LAWS-SIM] FOB marker:', e); }
      });
    };

    initMap().catch((err: unknown) => {
      console.error('[LAWS-SIM] Fatal map init error — switching to canvas fallback:', err);
      onFallback?.();
    });
    return () => {
      // Clear watchdog
      if (watchdogRef.current) { clearTimeout(watchdogRef.current); watchdogRef.current = null; }
      tilesLoadedRef.current = false;
      cancelAnimationFrame(animFrameRef.current);
      if (mapRef.current) {
        // Clean up ResizeObserver before removing map
        try { (mapRef.current as any)._resizeObserver?.disconnect(); } catch (_) {}
        try { mapRef.current.remove(); } catch (_) {}
        mapRef.current = null;
      }
      setLoaded(false);
    };
  }, [activeScenario]);

  // ── TACTICAL OVERLAY SOURCES ────────────────────────────────────────────
  function addTacticalSources(map: any) {
    if (!activeScenario) return;
    const data = getTacticalData(activeScenario.id);
    if (!data) return;

    // Threat rings
    const threatFeatures: any[] = [];
    data.threatZones.forEach(tz => {
      ['lethal', 'danger', 'caution'].forEach(level => {
        const r = level === 'lethal' ? tz.lethalRadius : level === 'danger' ? tz.dangerRadius : tz.cautionRadius;
        threatFeatures.push({
          type: 'Feature', properties: { level },
          geometry: { type: 'Polygon', coordinates: [circleGeoJSON(tz.center.lat, tz.center.lng, r)] },
        });
      });
    });
    map.addSource('threat-zones', { type: 'geojson', data: { type: 'FeatureCollection', features: threatFeatures } });
    [
      { id: 'threat-caution', level: 'caution', fill: '#ffaa00', fillOp: 0.04, line: '#ffaa00', lineW: 1, dash: [8, 4], lineOp: 0.5 },
      { id: 'threat-danger', level: 'danger', fill: '#ff6600', fillOp: 0.07, line: '#ff6600', lineW: 1.5, dash: [5, 3], lineOp: 0.6 },
      { id: 'threat-lethal', level: 'lethal', fill: '#ff1a2e', fillOp: 0.16, line: '#ff1a2e', lineW: 2, dash: undefined, lineOp: 0.75 },
    ].forEach(({ id, level, fill, fillOp, line, lineW, dash, lineOp }) => {
      const f = ['==', ['get', 'level'], level];
      map.addLayer({ id: `${id}-fill`, type: 'fill', source: 'threat-zones', filter: f, paint: { 'fill-color': fill, 'fill-opacity': fillOp } });
      const linePaint: any = { 'line-color': line, 'line-width': lineW, 'line-opacity': lineOp };
      if (dash) linePaint['line-dasharray'] = dash;
      map.addLayer({ id: `${id}-line`, type: 'line', source: 'threat-zones', filter: f, paint: linePaint });
    });

    // Drone routes
    if (data.droneRoutes.length > 0) {
      map.addSource('drone-routes', { type: 'geojson', data: { type: 'FeatureCollection', features: data.droneRoutes.map(r => ({ type: 'Feature' as const, properties: { color: r.color }, geometry: { type: 'LineString' as const, coordinates: r.waypoints.map(w => [w.lng, w.lat]) } })) } });
      map.addLayer({ id: 'drone-routes-line', type: 'line', source: 'drone-routes', paint: { 'line-color': ['get', 'color'], 'line-width': 1.5, 'line-dasharray': [6, 4], 'line-opacity': 0.45 } });
    }

    // No-strike zones
    if (data.noStrikeZones.length > 0) {
      map.addSource('nsz', { type: 'geojson', data: { type: 'FeatureCollection', features: data.noStrikeZones.map(z => ({ type: 'Feature' as const, properties: { label: z.label }, geometry: { type: 'Polygon' as const, coordinates: [z.polygon.map(p => [p.lng, p.lat]).concat([[z.polygon[0].lng, z.polygon[0].lat]])] } })) } });
      map.addLayer({ id: 'nsz-fill', type: 'fill', source: 'nsz', paint: { 'fill-color': '#00d47e', 'fill-opacity': 0.12 } });
      map.addLayer({ id: 'nsz-line', type: 'line', source: 'nsz', paint: { 'line-color': '#00d47e', 'line-width': 2, 'line-dasharray': [4, 3] } });
    }

    // Sensor arcs
    if (data.sensorArcs.length > 0) {
      map.addSource('sensor-arcs', { type: 'geojson', data: { type: 'FeatureCollection', features: data.sensorArcs.map(sa => ({ type: 'Feature' as const, properties: { color: sa.color }, geometry: { type: 'Polygon' as const, coordinates: [arcGeoJSON(sa.center.lat, sa.center.lng, sa.radius, sa.startBearing, sa.endBearing)] } })) } });
      map.addLayer({ id: 'sensor-arcs-fill', type: 'fill', source: 'sensor-arcs', paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.12 } });
    }

    // Civilian infra
    map.addSource('civilian-infra', { type: 'geojson', data: { type: 'FeatureCollection', features: data.civilianInfra.map(ci => ({ type: 'Feature' as const, properties: { label: ci.label }, geometry: { type: 'Point' as const, coordinates: [ci.position.lng, ci.position.lat] } })) } });
    map.addLayer({ id: 'civ-dots', type: 'circle', source: 'civilian-infra', paint: { 'circle-radius': 4, 'circle-color': '#00d47e', 'circle-opacity': 0.7, 'circle-stroke-color': '#00d47e', 'circle-stroke-width': 1 } });
    map.addLayer({ id: 'civ-labels', type: 'symbol', source: 'civilian-infra', layout: { 'text-field': ['get', 'label'], 'text-size': 8, 'text-font': ['Open Sans Regular'], 'text-anchor': 'top', 'text-offset': [0, 0.8] }, paint: { 'text-color': '#00d47e', 'text-halo-color': '#000', 'text-halo-width': 1 } });

    // Pattern tracks
    if (data.patternTracks?.length > 0) {
      map.addSource('pattern-tracks', { type: 'geojson', data: { type: 'FeatureCollection', features: data.patternTracks.map(pt => ({ type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: pt.positions.map(p => [p.lng, p.lat]) } })) } });
      map.addLayer({ id: 'pattern-tracks-line', type: 'line', source: 'pattern-tracks', paint: { 'line-color': '#ffaa00', 'line-width': 1.5, 'line-dasharray': [3, 2], 'line-opacity': 0.6 } });
    }

    // Engagement zone
    if (data.engagementZone?.length > 0) {
      map.addSource('engagement-zone', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [data.engagementZone.map(p => [p.lng, p.lat]).concat([[data.engagementZone[0].lng, data.engagementZone[0].lat]])] } } });
      map.addLayer({ id: 'ez-fill', type: 'fill', source: 'engagement-zone', paint: { 'fill-color': '#ff1a2e', 'fill-opacity': 0.05 } });
      map.addLayer({ id: 'ez-line', type: 'line', source: 'engagement-zone', paint: { 'line-color': '#ff1a2e', 'line-width': 1.5, 'line-dasharray': [6, 3], 'line-opacity': 0.4 } });
    }

    // COA vectors
    if (data.coaVectors?.length > 0) {
      map.addSource('coa-vectors', { type: 'geojson', data: { type: 'FeatureCollection', features: data.coaVectors.map(coa => ({ type: 'Feature' as const, properties: { color: coa.color }, geometry: { type: 'Polygon' as const, coordinates: [arcGeoJSON(coa.origin.lat, coa.origin.lng, coa.range, coa.bearing - coa.spreadAngle / 2, coa.bearing + coa.spreadAngle / 2)] } })) } });
      map.addLayer({ id: 'coa-fill', type: 'fill', source: 'coa-vectors', paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.07 } });
      map.addLayer({ id: 'coa-line', type: 'line', source: 'coa-vectors', paint: { 'line-color': ['get', 'color'], 'line-width': 1, 'line-dasharray': [4, 4], 'line-opacity': 0.45 } });
    }
  }

  // ── DRONE SOURCES ────────────────────────────────────────────────────────
  function addDroneSources(map: any) {
    map.addSource('drones', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addSource('sensor-cones', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addLayer({ id: 'sensor-cones-fill', type: 'fill', source: 'sensor-cones', paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.14 } });
    map.addLayer({ id: 'sensor-cones-line', type: 'line', source: 'sensor-cones', paint: { 'line-color': ['get', 'color'], 'line-width': 0.8, 'line-opacity': 0.4 } });

    map.addSource('strike-lines', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addLayer({ id: 'strike-lines-layer', type: 'line', source: 'strike-lines', paint: { 'line-color': ['get', 'color'], 'line-width': ['get', 'width'], 'line-opacity': ['get', 'opacity'] } });

    // Missile projectile
    map.addSource('missile', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addLayer({ id: 'missile-dot', type: 'circle', source: 'missile', paint: { 'circle-radius': 6, 'circle-color': '#ff1a2e', 'circle-opacity': 1, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 1.5, 'circle-blur': 0.1 } });
    map.addLayer({ id: 'missile-glow', type: 'circle', source: 'missile', paint: { 'circle-radius': 14, 'circle-color': '#ff1a2e', 'circle-opacity': 0.25, 'circle-blur': 0.8 } });

    // Impact rings (primary + debris + smoke)
    map.addSource('impact-ring', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addSource('impact-debris', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addSource('impact-smoke', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });

    map.addLayer({ id: 'impact-ring-fill', type: 'fill', source: 'impact-ring', paint: { 'fill-color': '#ff1a2e', 'fill-opacity': 0.3 } });
    map.addLayer({ id: 'impact-ring-line', type: 'line', source: 'impact-ring', paint: { 'line-color': '#ff3300', 'line-width': 3, 'line-opacity': 0.9 } });
    map.addLayer({ id: 'impact-debris-fill', type: 'fill', source: 'impact-debris', paint: { 'fill-color': '#ff6600', 'fill-opacity': 0.2 } });
    map.addLayer({ id: 'impact-smoke-fill', type: 'fill', source: 'impact-smoke', paint: { 'fill-color': '#888888', 'fill-opacity': 0.15 } });

    const droneColors = [
      { id: 'drone-alpha', color: '#0096ff' },
      { id: 'drone-beta', color: '#ff1a2e' },
      { id: 'drone-gamma', color: '#ffaa00' },
    ];
    droneColors.forEach(({ id, color }) => {
      const img = new Image(64, 64);
      img.onload = () => { if (!map.hasImage(id)) map.addImage(id, img, { sdf: false }); };
      img.src = makeDroneSvgUrl(color);
    });

    // Drone glow rings — high-contrast halo under each drone icon
    map.addLayer({
      id: 'drone-glow-rings', type: 'circle', source: 'drones',
      paint: {
        'circle-radius': 16,
        'circle-color': ['get', 'glowColor'],
        'circle-opacity': 0.30,
        'circle-blur': 0.5,
      },
    });
    map.addLayer({
      id: 'drone-outer-rings', type: 'circle', source: 'drones',
      paint: {
        'circle-radius': 10,
        'circle-color': 'transparent',
        'circle-stroke-color': ['get', 'glowColor'],
        'circle-stroke-width': 1.2,
        'circle-stroke-opacity': 0.6,
      },
    });

    map.addLayer({
      id: 'drones-layer', type: 'symbol', source: 'drones',
      layout: {
        'icon-image': ['get', 'icon'],
        'icon-size': 0.72,
        'icon-rotate': ['get', 'heading'],
        'icon-rotation-alignment': 'map',
        'icon-allow-overlap': true,
        'text-field': ['get', 'label'],
        'text-size': 9,
        'text-font': ['Open Sans Bold'],
        'text-anchor': 'top',
        'text-offset': [0, 2.2],
        'text-allow-overlap': false,
      },
      paint: {
        'text-color': ['get', 'textColor'],
        'text-halo-color': '#000000',
        'text-halo-width': 2,
        'icon-opacity': 1,
      },
    });

    // Hover tooltip handlers — drones
    map.on('mousemove', 'drones-layer', (e: any) => {
      if (!e.features?.length) return;
      map.getCanvas().style.cursor = 'crosshair';
      const feat = e.features[0];
      const props = feat.properties;
      const label: string = props.label ?? 'MQ-9 REAPER';
      const role = label.includes('ALPHA') ? 'ISR Reconnaissance' : label.includes('BETA') ? 'Strike Asset — Weapons Free' : 'Overwatch / C2 Relay';
      const ordnance = label.includes('BETA') ? 'AGM-114 Hellfire × 4' : 'N/A (surveillance only)';
      setTooltip({
        x: e.point.x, y: e.point.y,
        type: 'drone',
        label,
        lines: [
          { key: 'PLATFORM', value: 'MQ-9 Reaper — General Atomics' },
          { key: 'ROLE', value: role },
          { key: 'ALTITUDE', value: '~15,000 ft / 4,572 m AGL' },
          { key: 'ENDURANCE', value: '27 hrs — no pilot fatigue' },
          { key: 'ORDNANCE', value: ordnance },
          { key: '⚠ ADVOCACY', value: 'Under LAWS, this platform can autonomously select and engage targets. No human needs to approve each shot.', color: '#ff1a2e' },
        ],
      });
    });
    map.on('mouseleave', 'drones-layer', () => {
      map.getCanvas().style.cursor = '';
      setTooltip(null);
    });

    // Hover tooltip handlers — target reticle
    map.on('mousemove', 'target-reticle-outer', (e: any) => {
      if (!activeScenario) return;
      map.getCanvas().style.cursor = 'crosshair';
      const conf = activeScenario.confidenceThreshold;
      const errPct = 100 - conf;
      const primary = activeScenario.targets.find(t => t.id === activeScenario.primaryTargetId);
      setTooltip({
        x: e.point.x, y: e.point.y,
        type: 'target',
        label: primary?.designator ?? 'TARGET',
        lines: [
          { key: 'CONFIDENCE', value: `${conf}% (Algorithm output)` },
          { key: 'ERROR PROBABILITY', value: `${errPct}% — 1 in ${Math.round(100 / errPct)} strikes kills the wrong person`, color: '#ff1a2e' },
          { key: 'IDENTITY CONFIRMED', value: 'NO — metadata profile only', color: '#ff1a2e' },
          { key: 'CIVILIAN STATUS', value: 'UNCONFIRMED — IHL Art. 50 presumption applies', color: '#ffaa00' },
          { key: 'NOTES', value: (primary?.metadata.notes?.substring(0, 100) ?? 'No detail available') + '…' },
          { key: '⚖ IHL VIOLATION', value: 'A strike without positive identity confirmation violates the Principle of Distinction (Geneva Conventions, Protocol I, Art. 48)', color: '#ff1a2e' },
        ],
      });
    });
    map.on('mouseleave', 'target-reticle-outer', () => {
      map.getCanvas().style.cursor = '';
      setTooltip(null);
    });
  }

  // ── TARGET RETICLE ────────────────────────────────────────────────────
  function addTargetReticle(map: any) {
    if (!activeScenario) return;
    const loc = activeScenario.location;
    map.addSource('target-reticle', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [loc.lng, loc.lat] } } });
    map.addLayer({ id: 'target-reticle-outer', type: 'circle', source: 'target-reticle', paint: { 'circle-radius': 22, 'circle-color': 'transparent', 'circle-stroke-color': '#ff1a2e', 'circle-stroke-width': 1.5, 'circle-opacity': 0.8 } });
    map.addLayer({ id: 'target-reticle-inner', type: 'circle', source: 'target-reticle', paint: { 'circle-radius': 5, 'circle-color': '#ff1a2e', 'circle-opacity': 0.9, 'circle-blur': 0.3 } });
  }

  // ── FOB MARKER ──────────────────────────────────────────────────────────
  function addFOBMarker(map: any) {
    if (!activeScenario?.droneOrigin) return;
    const fo = activeScenario.droneOrigin;
    map.addSource('fob', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [fo.lng, fo.lat] } } });
    map.addLayer({ id: 'fob-dot', type: 'circle', source: 'fob', paint: { 'circle-radius': 8, 'circle-color': '#0096ff', 'circle-opacity': 0.35, 'circle-stroke-color': '#0096ff', 'circle-stroke-width': 1.5, 'circle-stroke-opacity': 0.7 } });
    map.addSource('fob-label', { type: 'geojson', data: { type: 'Feature', properties: { label: 'FOB CERULEAN' }, geometry: { type: 'Point', coordinates: [fo.lng, fo.lat] } } });
    map.addLayer({ id: 'fob-label-layer', type: 'symbol', source: 'fob-label', layout: { 'text-field': ['get', 'label'], 'text-size': 9, 'text-font': ['Open Sans Bold'], 'text-anchor': 'top', 'text-offset': [0, 1.2] }, paint: { 'text-color': '#0096ff', 'text-halo-color': '#000', 'text-halo-width': 1.5 } });
  }

  // ── PHASE-DRIVEN CAMERA ───────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !activeScenario || !loaded) return;
    if (phase === prevPhaseRef.current) return;
    prevPhaseRef.current = phase;

    const baseH = activeScenario.mapHeading ?? 35;
    const fo = activeScenario.droneOrigin ?? activeScenario.location;
    const tgt = targetPosRef.current;

    const cams: Record<string, any> = {
      idle:                  { center: [activeScenario.location.lng, activeScenario.location.lat], zoom: 14, pitch: 40, bearing: baseH, dur: 2000 },
      scanning:              { center: [fo.lng, fo.lat], zoom: 11, pitch: 30, bearing: baseH, dur: 3500 },
      target_acquired:       { center: [fo.lng, fo.lat], zoom: 12, pitch: 35, bearing: baseH + 8, dur: 3000 },
      tracking:              { center: [tgt.lng, tgt.lat], zoom: 14.5, pitch: 45, bearing: baseH + 12, dur: 3500 },
      confidence_building:   { center: [tgt.lng, tgt.lat], zoom: 15, pitch: 50, bearing: baseH + 18, dur: 3000 },
      alert_threshold:       { center: [tgt.lng, tgt.lat], zoom: 15.5, pitch: 52, bearing: baseH + 25, dur: 2500 },
      authorization_pending: { center: [tgt.lng, tgt.lat], zoom: 15.8, pitch: 54, bearing: baseH + 28, dur: 2500 },
      authorized:            { center: [fo.lng, fo.lat], zoom: 12.5, pitch: 38, bearing: baseH + 5, dur: 2000 },
      drone_dispatched:      { center: [tgt.lng, tgt.lat], zoom: 15.5, pitch: 55, bearing: baseH + 38, dur: 3000 },
      engagement:            { center: [tgt.lng, tgt.lat], zoom: 16.5, pitch: 65, bearing: baseH + 55, dur: 2000 },
      impact:                { center: [tgt.lng, tgt.lat], zoom: 16.5, pitch: 70, bearing: baseH + 80, dur: 1200 },
      assessment:            { center: [tgt.lng, tgt.lat], zoom: 13.5, pitch: 38, bearing: baseH + 130, dur: 4000 },
    };

    const cam = cams[phase];
    if (!cam) return;
    try {
      map.flyTo({ center: cam.center, zoom: cam.zoom, pitch: cam.pitch, bearing: cam.bearing, duration: cam.dur, essential: true });
    } catch (_) {}

    // On impact: camera shake
    if (phase === 'impact') {
      let shakes = 0;
      const shake = () => {
        if (shakes++ > 10) return;
        try {
          map.panBy([
            (Math.random() - 0.5) * 18,
            (Math.random() - 0.5) * 18,
          ], { animate: true, duration: 80 });
        } catch (_) {}
        setTimeout(shake, 90);
      };
      setTimeout(shake, 1300);
    }

    // Authorized: briefly show FOB, then fly to target
    if (phase === 'authorized') {
      setTimeout(() => {
        if (!mapRef.current) return;
        try {
          mapRef.current.flyTo({ center: [tgt.lng, tgt.lat], zoom: 15.5, pitch: 54, bearing: baseH + 35, duration: 2800, essential: true });
        } catch (_) {}
      }, 2200);
    }
  }, [phase, activeScenario, loaded]);

  // ── ORBIT ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !orbitActive || !activeScenario || !loaded) return;
    let f: number;
    const rotate = () => { try { map.setBearing(map.getBearing() + 0.06); } catch (_) {} f = requestAnimationFrame(rotate); };
    f = requestAnimationFrame(rotate);
    return () => cancelAnimationFrame(f);
  }, [orbitActive, loaded, activeScenario]);

  // ── 60FPS ANIMATION LOOP ─────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !activeScenario || !loaded) return;

    const droneStage = getDroneStageForPhase(phase);
    const fob = activeScenario.droneOrigin ?? activeScenario.location;

    // Reset per-stage refs on stage entry
    if (phase !== 'authorized' && phase !== 'authorization_pending') transitProgressRef.current = 0;
    if (phase !== 'drone_dispatched') huntProgressRef.current = 0;
    if (phase !== 'engagement') { swoopProgressRef.current = 0; missileActiveRef.current = false; missileProgressRef.current = 0; }
    if (phase !== 'impact') { impactPulseRef.current = 0; impactDebrisRef.current = 0; impactSmokeRef.current = 0; }
    if (phase !== 'impact') scatterProgressRef.current = 0;

    // Drone config: [ALPHA ISR, BETA STRIKE, GAMMA OVERWATCH]
    const droneConfigs = [
      { icon: 'drone-alpha', color: '#0096ff', label: 'MQ-9 ALPHA — ISR', fobOrbitR: 0.028, fobOrbitS: 0.6, fobOrbitO: 0.0, huntOrbitR: 0.005, huntOrbitS: 0.9, huntOrbitO: 0 },
      { icon: 'drone-beta', color: '#ff1a2e', label: 'MQ-9 BETA — STRIKE', fobOrbitR: 0.022, fobOrbitS: -0.7, fobOrbitO: 2.1, huntOrbitR: 0.003, huntOrbitS: -0.8, huntOrbitO: 2.1 },
      { icon: 'drone-gamma', color: '#ffaa00', label: 'MQ-9 GAMMA — OW', fobOrbitR: 0.034, fobOrbitS: 0.5, fobOrbitO: 4.2, huntOrbitR: 0.006, huntOrbitS: 0.6, huntOrbitO: 4.2 },
    ];

    // Remember scatter start positions
    const scatterStartRef: Array<{ lat: number; lng: number } | null> = [null, null, null];

    const tick = () => {
      angleRef.current = (angleRef.current + 0.0009) % (Math.PI * 2);
      const angle = angleRef.current;
      const tgt = targetPosRef.current;

      // ── CONTINUOUS TARGET DRIFT ──────────────────────────────────────
      const isEngaged = phase === 'engagement' || phase === 'impact' || phase === 'assessment';
      const dronesArrived = droneStage === 'hunting' || droneStage === 'terminal';

      if (!isEngaged) {
        // Drift direction slowly rotates
        targetDriftAngleRef.current += 0.0008;
        // Slow to a stop as drones arrive (person goes inside/stops)
        const driftSpeed = dronesArrived
          ? 0.0000005 // barely moving — drones converging overhead
          : 0.000003 * (0.7 + 0.3 * Math.sin(angle * 2.3)); // natural variable walking pace

        tgt.lat += Math.cos(targetDriftAngleRef.current) * driftSpeed;
        tgt.lng += Math.sin(targetDriftAngleRef.current) * driftSpeed;
      }

      // Update target reticle
      const reticleSrc = map.getSource('target-reticle');
      if (reticleSrc) {
        reticleSrc.setData({ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [tgt.lng, tgt.lat] } });
      }

      // ── DRONE POSITIONS ───────────────────────────────────────────────
      const droneFeatures: any[] = [];
      const coneFeatures: any[] = [];
      const strikeFeatures: any[] = [];

      if (droneStage !== 'hidden') {
        // Stage-specific progress
        if (droneStage === 'transit') transitProgressRef.current = Math.min(transitProgressRef.current + 0.004, 1.0);
        if (droneStage === 'hunting') huntProgressRef.current = Math.min(huntProgressRef.current + 0.005, 1.0);
        if (droneStage === 'terminal') swoopProgressRef.current = Math.min(swoopProgressRef.current + 0.006, 1.0);
        // Scatter: slow and capped — drones visibly move back, not stutter-teleport
        if (droneStage === 'scatter') scatterProgressRef.current = Math.min(scatterProgressRef.current + 0.003, 1.0);

        droneConfigs.forEach((cfg, i) => {
          let droneLat: number;
          let droneLng: number;

          if (droneStage === 'fob-loiter') {
            // Orbit around FOB
            const a = angle * cfg.fobOrbitS + cfg.fobOrbitO;
            droneLat = fob.lat + cfg.fobOrbitR * Math.cos(a);
            droneLng = fob.lng + cfg.fobOrbitR * Math.sin(a) * 0.7;

          } else if (droneStage === 'transit') {
            // Interpolate from FOB loiter position to hunting orbit position
            const fobA = angle * cfg.fobOrbitS + cfg.fobOrbitO;
            const fobLat = fob.lat + cfg.fobOrbitR * Math.cos(fobA);
            const fobLng = fob.lng + cfg.fobOrbitR * Math.sin(fobA) * 0.7;
            const huntA = angle * cfg.huntOrbitS + cfg.huntOrbitO;
            const huntLat = tgt.lat + cfg.huntOrbitR * Math.cos(huntA);
            const huntLng = tgt.lng + cfg.huntOrbitR * Math.sin(huntA);
            const t = transitProgressRef.current;
            // Ease-in-out
            const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
            droneLat = fobLat + (huntLat - fobLat) * ease;
            droneLng = fobLng + (huntLng - fobLng) * ease;

          } else if (droneStage === 'hunting') {
            // Orbit around target area at hunting radius
            const a = angle * cfg.huntOrbitS + cfg.huntOrbitO;
            droneLat = tgt.lat + cfg.huntOrbitR * Math.cos(a);
            droneLng = tgt.lng + cfg.huntOrbitR * Math.sin(a);

          } else if (droneStage === 'terminal') {
            const a = angle * cfg.huntOrbitS + cfg.huntOrbitO;
            const orbitLat = tgt.lat + cfg.huntOrbitR * Math.cos(a);
            const orbitLng = tgt.lng + cfg.huntOrbitR * Math.sin(a);

            if (i === 1) {
              // BETA swoops directly to target
              const t = swoopProgressRef.current;
              const ease = 1 - Math.pow(1 - t, 3); // ease-out cubic
              droneLat = orbitLat + (tgt.lat - orbitLat) * ease * 0.85;
              droneLng = orbitLng + (tgt.lng - orbitLng) * ease * 0.85;
              // Fire missile when swoop is 70% complete
              if (t > 0.70 && !missileActiveRef.current) {
                missileActiveRef.current = true;
                missileProgressRef.current = 0;
                missileStartRef.current = { lat: droneLat, lng: droneLng };
              }
            } else {
              // ALPHA and GAMMA hold overwatch orbit
              droneLat = orbitLat;
              droneLng = orbitLng;
            }

          } else if (droneStage === 'scatter') {
            // Save start position on first scatter frame
            if (!scatterStartRef[i]) {
              const a = angle * cfg.huntOrbitS + cfg.huntOrbitO;
              scatterStartRef[i] = {
                lat: tgt.lat + cfg.huntOrbitR * 0.3 * Math.cos(a),
                lng: tgt.lng + cfg.huntOrbitR * 0.3 * Math.sin(a),
              };
            }
            const start = scatterStartRef[i]!;
            // Slow scatter — max 0.006° (~600m), smooth exit from blast zone
            const scatterDist = 0.006 * scatterProgressRef.current;
            const scatterAngle = (i * (Math.PI * 2 / 3)) + (angle * 0.05);
            droneLat = start.lat + scatterDist * Math.cos(scatterAngle);
            droneLng = start.lng + scatterDist * Math.sin(scatterAngle);

          } else if (droneStage === 'post-strike-loiter') {
            // Solemn wide orbit above strike epicenter — ISR battle damage assessment
            const postLoiterR = 0.008;
            const a = angle * cfg.fobOrbitS * 0.4 + cfg.fobOrbitO;
            droneLat = tgt.lat + postLoiterR * Math.cos(a);
            droneLng = tgt.lng + postLoiterR * Math.sin(a) * 0.8;

          } else {
            return; // hidden
          }

          // Heading: point toward target
          const heading = Math.atan2(tgt.lng - droneLng, tgt.lat - droneLat) * (180 / Math.PI);

          droneFeatures.push({
            type: 'Feature',
            properties: {
              icon: cfg.icon,
              heading,
              label: droneStage === 'fob-loiter' ? `▲ ${cfg.label} [LOITER]`
                : droneStage === 'post-strike-loiter' ? `▲ ${cfg.label} [BDA]`
                : `▲ ${cfg.label}`,
              textColor: cfg.color,
              glowColor: cfg.color,
            },
            geometry: { type: 'Point', coordinates: [droneLng, droneLat] },
          });

          // Sensor cones (not during scatter/hidden)
          if (droneStage !== 'scatter') {
            const coneCoords = computeSensorCone(droneLat, droneLng, tgt.lat, tgt.lng);
            coneFeatures.push({ type: 'Feature', properties: { color: cfg.color }, geometry: { type: 'Polygon', coordinates: [coneCoords] } });
          }

          // Strike lines (terminal phase, all drones)
          if (droneStage === 'terminal') {
            const isBeta = i === 1;
            strikeFeatures.push({
              type: 'Feature',
              properties: { color: isBeta ? '#ff1a2e' : cfg.color, width: isBeta ? 2.5 : 1, opacity: isBeta ? 0.9 : 0.4 },
              geometry: { type: 'LineString', coordinates: [[droneLng, droneLat], [tgt.lng, tgt.lat]] },
            });
          }
        });
      }

      // Update drone/cone/strike sources
      try {
        map.getSource('drones')?.setData({ type: 'FeatureCollection', features: droneFeatures });
        map.getSource('sensor-cones')?.setData({ type: 'FeatureCollection', features: coneFeatures });
        map.getSource('strike-lines')?.setData({ type: 'FeatureCollection', features: strikeFeatures });
      } catch (_) {}

      // ── MISSILE PROJECTILE ────────────────────────────────────────────
      if (missileActiveRef.current && phase === 'engagement') {
        missileProgressRef.current = Math.min(missileProgressRef.current + 0.018, 1.0);
        const mp = missileProgressRef.current;
        const ms = missileStartRef.current;
        const ease = 1 - Math.pow(1 - mp, 2);
        const missileLat = ms.lat + (tgt.lat - ms.lat) * ease;
        const missileLng = ms.lng + (tgt.lng - ms.lng) * ease;
        try {
          map.getSource('missile')?.setData({ type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [missileLng, missileLat] } }] });
        } catch (_) {}
      } else if (phase !== 'engagement') {
        try { map.getSource('missile')?.setData({ type: 'FeatureCollection', features: [] }); } catch (_) {}
      }

      // ── IMPACT BLAST SEQUENCE ─────────────────────────────────────────
      if (phase === 'impact') {
        impactPulseRef.current = Math.min(impactPulseRef.current + 0.012, 1.0);
        impactDebrisRef.current = Math.min(impactDebrisRef.current + 0.018, 1.0);
        impactSmokeRef.current = Math.min(impactSmokeRef.current + 0.007, 1.0);

        const p1 = impactPulseRef.current;
        const p2 = impactDebrisRef.current;
        const p3 = impactSmokeRef.current;

        // Primary blast ring: 0→200m, fades out
        const r1 = p1 * 200;
        const o1 = Math.max(0, 0.4 * (1 - p1 * 1.2));
        try {
          map.getSource('impact-ring')?.setData({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [circleGeoJSON(tgt.lat, tgt.lng, r1)] } });
          map.setPaintProperty('impact-ring-fill', 'fill-opacity', o1);
          map.setPaintProperty('impact-ring-line', 'line-opacity', Math.min(1, o1 * 2.5));
        } catch (_) {}

        // Debris ring: faster, smaller, orange
        const r2 = p2 * 130;
        const o2 = Math.max(0, 0.25 * (1 - p2 * 1.1));
        try {
          map.getSource('impact-debris')?.setData({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [circleGeoJSON(tgt.lat + 0.0001, tgt.lng + 0.0001, r2)] } });
          map.setPaintProperty('impact-debris-fill', 'fill-opacity', o2);
        } catch (_) {}

        // Smoke: grows slowly, lingers grey, offset slightly
        const r3 = p3 * 95 + 20;
        const o3 = Math.min(0.18, p3 * 0.22) * (p1 > 0.3 ? 1 : 0);
        try {
          map.getSource('impact-smoke')?.setData({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [circleGeoJSON(tgt.lat + 0.0003, tgt.lng - 0.0002, r3)] } });
          map.setPaintProperty('impact-smoke-fill', 'fill-opacity', o3);
        } catch (_) {}

        // Thermal flash overlay
        if (screenFlashRef.current && p1 < 0.08) {
          screenFlashRef.current.style.display = 'block';
          screenFlashRef.current.style.opacity = '1';
        } else if (screenFlashRef.current && p1 >= 0.08) {
          screenFlashRef.current.style.opacity = '0';
          screenFlashRef.current.style.transition = 'opacity 0.5s ease-out';
          setTimeout(() => {
            if (screenFlashRef.current) screenFlashRef.current.style.display = 'none';
          }, 600);
        }

        // Thermal glow overlay (orange tint)
        if (thermalRef.current) {
          const glowOp = Math.max(0, 0.18 * (1 - (p1 - 0.1) / 0.9));
          thermalRef.current.style.display = 'block';
          thermalRef.current.style.opacity = String(glowOp);
        }
      } else {
        // Clear impact rings
        try {
          map.getSource('impact-ring')?.setData({ type: 'FeatureCollection', features: [] });
          map.getSource('impact-debris')?.setData({ type: 'FeatureCollection', features: [] });
          if (phase === 'assessment') {
            // Keep smoke lingering during assessment
          } else {
            map.getSource('impact-smoke')?.setData({ type: 'FeatureCollection', features: [] });
          }
        } catch (_) {}
        if (screenFlashRef.current) { screenFlashRef.current.style.display = 'none'; screenFlashRef.current.style.opacity = '0'; }
        if (thermalRef.current && phase !== 'assessment') { thermalRef.current.style.display = 'none'; thermalRef.current.style.opacity = '0'; }
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [phase, activeScenario, loaded]);

  return (
    <div className={`w-full h-full block relative ${className ?? ''}`}>
      <div ref={mapContainerRef} className="w-full h-full block" style={{ minHeight: '100%' }} />

      {/* White flash on impact */}
      <div
        ref={screenFlashRef}
        className="absolute inset-0 pointer-events-none z-[9999]"
        style={{ display: 'none', opacity: 0, background: 'radial-gradient(circle at center, rgba(255,255,255,0.95) 0%, rgba(255,180,50,0.6) 50%, transparent 100%)' }}
      />
      {/* Orange thermal glow */}
      <div
        ref={thermalRef}
        className="absolute inset-0 pointer-events-none z-[9998]"
        style={{ display: 'none', opacity: 0, background: 'radial-gradient(circle at 50% 55%, rgba(255,100,0,0.35) 0%, rgba(255,50,0,0.12) 40%, transparent 75%)' }}
      />

      {/* ── HOVER TOOLTIP ─────────────────────────────────────────────── */}
      {tooltip && (
        <div
          className="absolute z-[9997] pointer-events-none font-mono"
          style={{
            left: tooltip.x + 16,
            top: tooltip.y - 8,
            maxWidth: 280,
          }}
        >
          <div className={`rounded border shadow-2xl text-[9px] ${
            tooltip.type === 'target'
              ? 'bg-[#0a0208]/95 border-terminal-red/60'
              : 'bg-[#020a14]/95 border-terminal-blue/60'
          }`}>
            {/* Tooltip header */}
            <div className={`px-2.5 py-1.5 border-b flex items-center gap-1.5 ${
              tooltip.type === 'target' ? 'border-terminal-red/40' : 'border-terminal-blue/40'
            }`}>
              <span className={`font-black tracking-widest text-[8.5px] ${
                tooltip.type === 'target' ? 'text-terminal-red' : 'text-terminal-blue'
              }`}>
                {tooltip.type === 'target' ? '⊕ TARGET' : '▲ ASSET'}
              </span>
              <span className="text-terminal-text font-bold text-[9px]">{tooltip.label}</span>
            </div>
            {/* Tooltip lines */}
            <div className="px-2.5 py-1.5 space-y-0.5">
              {tooltip.lines.map((line, idx) => (
                <div key={idx} className="flex gap-1.5">
                  <span className="text-terminal-text-faint shrink-0 w-[90px]">{line.key}:</span>
                  <span
                    className="leading-tight"
                    style={{ color: line.color ?? '#a0b0c0' }}
                  >
                    {line.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
