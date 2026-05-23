'use client';
import { useEffect, useRef, useState } from 'react';
import { useSimulationStore } from '@/store/simulation';
import { Compass, ZoomIn, Orbit, Eye, RefreshCw } from 'lucide-react';
import clsx from 'clsx';

// Simulated building structures for Canvas Fallback drone zoom mode
interface MockBuilding {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
}

const MOCK_BUILDINGS: MockBuilding[] = [
  { x: -70, y: -80, w: 50, h: 45, label: 'SECTOR ALPHA - DEPLOYED NODES' },
  { x: 30, y: -90, w: 60, h: 50, label: 'LOGISTICS CELL CONVOY' },
  { x: -90, y: 20, w: 70, h: 60, label: 'COMMAND POST (ASSESSED)' },
  { x: 40, y: 30, w: 55, h: 65, label: 'CIVILIAN HOUSING COMPLEX' }
];

// Fallback canvas-based map with orbital rotation and building overlays
function CanvasFallback({ className, spectralMode }: { className?: string; spectralMode: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { phase, droneProgress, activeScenario, viewMode } = useSimulationStore();
  const animRef = useRef<number>(0);
  const rotationAngle = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;

      // Animate orbital rotation angle
      rotationAngle.current = (rotationAngle.current + 0.002) % (Math.PI * 2);
      const angle = rotationAngle.current;

      // Base style
      ctx.fillStyle = spectralMode ? '#010f05' : '#050a12';
      ctx.fillRect(0, 0, w, h);

      // Grid overlay (rotates dynamically to simulate orbital rotation)
      ctx.strokeStyle = spectralMode ? 'rgba(0, 255, 149, 0.08)' : 'rgba(26, 37, 53, 0.5)';
      ctx.lineWidth = 0.5;
      const gridSpacing = 40;
      const maxDim = Math.max(w, h) * 1.5;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-angle); // Orbital rotate grid

      for (let x = -maxDim / 2; x < maxDim / 2; x += gridSpacing) {
        ctx.beginPath(); ctx.moveTo(x, -maxDim / 2); ctx.lineTo(x, maxDim / 2); ctx.stroke();
      }
      for (let y = -maxDim / 2; y < maxDim / 2; y += gridSpacing) {
        ctx.beginPath(); ctx.moveTo(-maxDim / 2, y); ctx.lineTo(maxDim / 2, y); ctx.stroke();
      }
      ctx.restore();

      const scale = viewMode === 'drone' ? 2.5 : 1.0;

      // Render roads and terrain structures
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-angle);
      ctx.scale(scale, scale);

      // Draw road intersections
      ctx.strokeStyle = spectralMode ? 'rgba(0, 255, 149, 0.15)' : 'rgba(30, 45, 68, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-w, 0); ctx.lineTo(w, 0);
      ctx.moveTo(0, -h); ctx.lineTo(0, h);
      ctx.stroke();

      // Render photorealistic building stubs in Drone mode
      if (viewMode === 'drone') {
        MOCK_BUILDINGS.forEach((b) => {
          // Glow and border
          ctx.fillStyle = spectralMode ? 'rgba(0, 255, 149, 0.04)' : 'rgba(0, 150, 255, 0.03)';
          ctx.strokeStyle = spectralMode ? 'rgba(0, 255, 149, 0.4)' : 'rgba(26, 120, 245, 0.4)';
          ctx.lineWidth = 1;
          ctx.fillRect(b.x, b.y, b.w, b.h);
          ctx.strokeRect(b.x, b.y, b.w, b.h);

          // Tiny diagnostics on structures
          ctx.font = '7px "JetBrains Mono", Courier, monospace';
          ctx.fillStyle = spectralMode ? '#00ff95' : '#0096ff';
          ctx.fillText(b.label, b.x + 3, b.y + b.h - 5);
        });
      }
      ctx.restore();

      // Draw stationary HUD center brackets
      const isActive = phase !== 'idle';
      if (isActive) {
        const pulse = (Math.sin(Date.now() * 0.003) + 1) / 2;
        const color = phase === 'engagement' || phase === 'impact'
          ? `rgba(255,26,46,${0.5 + pulse * 0.5})`
          : phase === 'alert_threshold' || phase === 'authorized'
          ? `rgba(255,170,0,${0.6 + pulse * 0.4})`
          : spectralMode
          ? `rgba(0,255,149,${0.5 + pulse * 0.5})`
          : `rgba(0,212,126,${0.4 + pulse * 0.4})`;

        // Target crosshair
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        
        // Circular brackets
        for (let i = 1; i <= 2; i++) {
          ctx.beginPath();
          ctx.arc(cx, cy, 25 * i, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Cross lines
        ctx.beginPath();
        ctx.moveTo(cx - 45, cy); ctx.lineTo(cx - 10, cy);
        ctx.moveTo(cx + 10, cy); ctx.lineTo(cx + 45, cy);
        ctx.moveTo(cx, cy - 45); ctx.lineTo(cx, cy - 10);
        ctx.moveTo(cx, cy + 10); ctx.lineTo(cx, cy + 45);
        ctx.stroke();

        // Target box locked
        if (viewMode === 'drone') {
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.5;
          ctx.strokeRect(cx - 35, cy - 35, 70, 70);
          ctx.fillStyle = color;
          ctx.font = '8px "JetBrains Mono", Courier, monospace';
          ctx.fillText('TARGET LOCK ACQUIRED', cx - 50, cy - 42);
        }
      }

      // Drone flight vector overlay
      if (phase === 'drone_dispatched' || phase === 'engagement') {
        const droneLat = 0.2 + droneProgress * 0.6;
        const droneLng = 0.25 + droneProgress * 0.5;
        const dx = droneLng * w;
        const dy = droneLat * h;

        ctx.fillStyle = '#0096ff';
        ctx.strokeStyle = '#0096ff';
        ctx.lineWidth = 1.5;

        // Draw drone triangle
        ctx.save();
        ctx.translate(dx, dy);
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(5, 5);
        ctx.lineTo(-5, 5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Path line from drone to center target
        ctx.strokeStyle = 'rgba(255, 170, 0, 0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(dx, dy);
        ctx.lineTo(cx, cy);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Impact shockwave rings
      if (phase === 'impact') {
        const elapsed = (Date.now() % 2000) / 2000;
        ctx.strokeStyle = `rgba(255, 26, 46, ${1 - elapsed})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, elapsed * 180, 0, Math.PI * 2);
        ctx.stroke();

        // Bright white flash frame at very start of impact
        if (elapsed < 0.08) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
          ctx.fillRect(0, 0, w, h);
        }
      }

      // Live Feed top tags
      ctx.font = '9px "JetBrains Mono", Courier, monospace';
      ctx.fillStyle = spectralMode ? '#00ff95' : '#536878';
      if (activeScenario) {
        ctx.fillText(`TARGET LAT: ${activeScenario.location.lat.toFixed(5)}°N`, 15, 22);
        ctx.fillText(`TARGET LNG: ${activeScenario.location.lng.toFixed(5)}°E`, 15, 34);
        ctx.fillText(`SENSOR PLATFORM: ${viewMode === 'drone' ? 'REAPER DRONE LOW-ALT' : 'ORBITAL SAT FEED'}`, 15, 46);
        ctx.fillText(`ALTITUDE: ${viewMode === 'drone' ? '450m AGL' : '3,500m MSL'}`, 15, 58);
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [phase, droneProgress, activeScenario, viewMode, spectralMode]);

  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={clsx('w-full h-full block', className)}
      style={{ imageRendering: 'pixelated' }}
    />
  );
}

// Google Maps 3D view component
function GoogleMap3D({ className, onError }: { className?: string; onError?: () => void }) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const { activeScenario, phase, viewMode, orbitActive } = useSimulationStore();
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load Google Maps API Key
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setError('no-key');
      onError?.();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=beta&libraries=maps3d`;
    script.async = true;
    script.defer = true;
    script.onload = () => setLoaded(true);
    script.onerror = () => {
      setError('load-failed');
      onError?.();
    };
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, [onError]);

  // Initialize Map
  useEffect(() => {
    if (!loaded || !mapContainerRef.current) return;

    const initMap = async () => {
      try {
        const { Map3DElement, Marker3DElement } = (window as any).google.maps.maps3d;
        const scenario = activeScenario;
        const center = scenario?.location ?? { lat: 15.3694, lng: 44.191, alt: 0 };

        // Set default zoom characteristics based on mode
        const initialRange = viewMode === 'drone' ? 480 : 3500;
        const initialTilt = viewMode === 'drone' ? 62 : 25;

        const map = new Map3DElement({
          center: { lat: center.lat, lng: center.lng, altitude: center.alt ?? 0 },
          tilt: initialTilt,
          heading: scenario?.mapHeading ?? 0,
          range: initialRange,
        });

        mapContainerRef.current!.innerHTML = ''; // clean container
        mapContainerRef.current!.appendChild(map);
        mapRef.current = map;

        if (scenario) {
          const marker = new Marker3DElement({
            position: { lat: scenario.location.lat, lng: scenario.location.lng, altitude: 0 },
            label: 'COORDS LOCK',
          });
          map.appendChild(marker);
          markerRef.current = marker;
        }
      } catch (e) {
        setError('init-failed');
        onError?.();
      }
    };

    initMap();
  }, [loaded, activeScenario, onError]);

  // Smooth zoom-in/out fly animations when viewMode switches
  useEffect(() => {
    if (!mapRef.current || !activeScenario) return;
    const { location, mapHeading } = activeScenario;

    const targetRange = viewMode === 'drone' ? 480 : 3500;
    const targetTilt = viewMode === 'drone' ? 64 : 22;

    try {
      mapRef.current.flyCameraTo({
        endCamera: {
          center: { lat: location.lat, lng: location.lng, altitude: 0 },
          tilt: targetTilt,
          heading: mapRef.current.heading ?? mapHeading ?? 0,
          range: targetRange,
        },
        durationMilliseconds: 2500,
      });
    } catch (e) {
      // flyCameraTo fallback
    }
  }, [viewMode, activeScenario]);

  // Autopilot Camera Orbit Rotation loop
  useEffect(() => {
    if (!mapRef.current || !orbitActive) return;

    let animId: number;
    const rotate = () => {
      if (mapRef.current) {
        mapRef.current.heading = (mapRef.current.heading + 0.12) % 360;
      }
      animId = requestAnimationFrame(rotate);
    };

    animId = requestAnimationFrame(rotate);
    return () => cancelAnimationFrame(animId);
  }, [orbitActive, loaded]);

  if (error === 'no-key' || error === 'load-failed' || error === 'init-failed') {
    return null;
  }

  return (
    <div
      ref={mapContainerRef}
      className={clsx('w-full h-full block', className)}
    />
  );
}

// Master Map3DView Component
export function Map3DView({ className }: { className?: string }) {
  const [hasGoogleKey] = useState(
    () => !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  );
  const [googleFailed, setGoogleFailed] = useState(false);
  const [spectralMode, setSpectralMode] = useState(false);

  return (
    <div className={clsx(
      'relative bg-[#0a1520] overflow-hidden flex-1 transition-all duration-500 border border-terminal-border rounded',
      spectralMode && 'filter sepia(0.2) hue-rotate(85deg) brightness(1.1) contrast(1.2)',
      className
    )}>
      {!hasGoogleKey || googleFailed ? (
        <CanvasFallback spectralMode={spectralMode} />
      ) : (
        <GoogleMap3D onError={() => setGoogleFailed(true)} />
      )}
      
      {/* Dynamic Tactical Overlay HUD */}
      <MapHUD spectralMode={spectralMode} setSpectralMode={setSpectralMode} />
    </div>
  );
}

// Interactive Map HUD Telemetry Overlay
function MapHUD({ spectralMode, setSpectralMode }: { spectralMode: boolean; setSpectralMode: (v: boolean) => void }) {
  const { phase, activeScenario, confidenceScore, viewMode, setViewMode, orbitActive, setOrbitActive } = useSimulationStore();
  const isAlert = phase === 'alert_threshold' || phase === 'engagement' || phase === 'impact';

  return (
    <>
      {/* Top Left Diagnostics HUD */}
      <div className="absolute top-3 left-3 font-mono text-[9px] text-terminal-text-dim space-y-0.5 pointer-events-none z-10">
        <div className="text-terminal-green font-bold flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-terminal-green rounded-full animate-pulse" />
          ISR FEED ACTIVE
        </div>
        {activeScenario && (
          <>
            <div>LAT: {activeScenario.location.lat.toFixed(5)}°N</div>
            <div>LNG: {activeScenario.location.lng.toFixed(5)}°E</div>
            <div className="text-terminal-blue font-bold uppercase">
              {viewMode === 'drone' ? 'PLATFORM: MQ-9 LOW RECON' : 'PLATFORM: ORBITAL SAT-8'}
            </div>
          </>
        )}
      </div>

      {/* Top Right Confidence telemetry */}
      {phase !== 'idle' && (
        <div className={clsx(
          'absolute top-3 right-3 font-mono text-[10px] px-2.5 py-1 rounded border z-10 pointer-events-none font-bold',
          confidenceScore >= 70
            ? 'bg-terminal-red-dim/80 border-terminal-red text-terminal-red'
            : confidenceScore >= 40
            ? 'bg-terminal-amber-dim/80 border-terminal-amber text-terminal-amber'
            : 'bg-terminal-green-dim/80 border-terminal-green text-terminal-green'
        )}>
          CONF: {confidenceScore.toFixed(0)}%
        </div>
      )}

      {/* Bottom Center interactive controls */}
      {phase !== 'idle' && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-terminal-panel/90 border border-terminal-border px-3 py-1.5 rounded shadow-2xl font-mono text-[9px] z-10 pointer-events-auto">
          {/* Zoom Toggle */}
          <div className="flex items-center border border-terminal-border rounded overflow-hidden">
            <button
              onClick={() => setViewMode('satellite')}
              className={clsx(
                'px-2.5 py-1 font-bold uppercase transition-all',
                viewMode === 'satellite' ? 'bg-terminal-blue text-terminal-bg' : 'text-terminal-text-dim hover:text-terminal-text'
              )}
            >
              Satellite
            </button>
            <button
              onClick={() => setViewMode('drone')}
              className={clsx(
                'px-2.5 py-1 font-bold uppercase transition-all flex items-center gap-1 border-l border-terminal-border',
                viewMode === 'drone' ? 'bg-terminal-blue text-terminal-bg' : 'text-terminal-text-dim hover:text-terminal-text'
              )}
            >
              <ZoomIn className="w-3 h-3" /> Drone 3D
            </button>
          </div>

          {/* Autopilot Orbit Toggle */}
          <button
            onClick={() => setOrbitActive(!orbitActive)}
            className={clsx(
              'px-2.5 py-1 border rounded font-bold uppercase flex items-center gap-1 transition-all',
              orbitActive ? 'bg-terminal-green-dim border-terminal-green text-terminal-green' : 'border-terminal-border text-terminal-text-dim hover:text-terminal-text'
            )}
            title="Auto-Orbit Orbit around target"
          >
            <Orbit className={clsx('w-3.5 h-3.5', orbitActive && 'animate-spin')} style={{ animationDuration: '6s' }} /> Orbit
          </button>

          {/* Spectral Mode Toggle */}
          <button
            onClick={() => setSpectralMode(!spectralMode)}
            className={clsx(
              'px-2.5 py-1 border rounded font-bold uppercase flex items-center gap-1 transition-all',
              spectralMode ? 'bg-terminal-amber-dim border-terminal-amber text-terminal-amber' : 'border-terminal-border text-terminal-text-dim hover:text-terminal-text'
            )}
          >
            <Eye className="w-3.5 h-3.5" /> Spectral
          </button>
        </div>
      )}

      {/* Warning Flash Border */}
      {isAlert && (
        <div className="absolute inset-0 border border-terminal-red pointer-events-none animate-pulse-red rounded-none" />
      )}

      {/* Bottom disclaimer HUD text */}
      <div className="absolute bottom-2 left-3 font-mono text-[7.5px] text-terminal-text-faint pointer-events-none uppercase tracking-widest">
        UN // STOP KILLER ROBOTS CAMPAIGN INCIDENT SIMULATOR v2.4.1
      </div>
    </>
  );
}
