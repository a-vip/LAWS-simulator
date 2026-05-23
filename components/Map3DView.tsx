'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useSimulationStore } from '@/store/simulation';
import clsx from 'clsx';

// Fallback canvas-based map for when no API key is provided
function CanvasFallback({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { phase, droneProgress, primaryTarget, activeScenario } = useSimulationStore();
  const animRef = useRef<number>(0);
  const pulseRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = (t: number) => {
      const w = canvas.width;
      const h = canvas.height;
      pulseRef.current = t;

      ctx.fillStyle = '#0a1520';
      ctx.fillRect(0, 0, w, h);

      // Grid overlay
      ctx.strokeStyle = '#1a2535';
      ctx.lineWidth = 0.5;
      const gridSize = 40;
      for (let x = 0; x < w; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      // Simulated terrain blobs
      const terrainBlobs = [
        { x: 0.3, y: 0.4, r: 0.15, color: '#0d2a14' },
        { x: 0.65, y: 0.55, r: 0.18, color: '#0a2010' },
        { x: 0.2, y: 0.7, r: 0.1, color: '#0d2a14' },
        { x: 0.8, y: 0.3, r: 0.12, color: '#0a2010' },
      ];
      terrainBlobs.forEach(({ x, y, r, color }) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x * w, y * h, r * Math.min(w, h), 0, Math.PI * 2);
        ctx.fill();
      });

      // Road-like lines
      ctx.strokeStyle = '#1a3048';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, h * 0.5); ctx.lineTo(w, h * 0.52); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(w * 0.45, 0); ctx.lineTo(w * 0.48, h); ctx.stroke();

      const cx = w / 2;
      const cy = h / 2;

      // Target crosshair
      const isActive = phase !== 'idle';
      const pulse = (Math.sin(t * 0.003) + 1) / 2;

      if (isActive) {
        const crossColor = phase === 'engagement' || phase === 'impact'
          ? `rgba(255,26,46,${0.5 + pulse * 0.5})`
          : phase === 'alert_threshold' || phase === 'authorized'
          ? `rgba(255,170,0,${0.6 + pulse * 0.4})`
          : `rgba(0,212,126,${0.4 + pulse * 0.4})`;

        // Rings
        for (let i = 1; i <= 3; i++) {
          ctx.strokeStyle = crossColor;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.arc(cx, cy, 30 * i, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Crosshair lines
        ctx.strokeStyle = crossColor;
        ctx.lineWidth = 1;
        const size = 60;
        ctx.beginPath();
        ctx.moveTo(cx - size, cy); ctx.lineTo(cx - 20, cy);
        ctx.moveTo(cx + 20, cy); ctx.lineTo(cx + size, cy);
        ctx.moveTo(cx, cy - size); ctx.lineTo(cx, cy - 20);
        ctx.moveTo(cx, cy + 20); ctx.lineTo(cx, cy + size);
        ctx.stroke();

        // Corner brackets
        const bSize = 16;
        const bOff = 55;
        const corners = [[-1,-1],[1,-1],[1,1],[-1,1]] as const;
        corners.forEach(([sx, sy]) => {
          ctx.strokeStyle = crossColor;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(cx + sx * bOff, cy + sy * (bOff - bSize));
          ctx.lineTo(cx + sx * bOff, cy + sy * bOff);
          ctx.lineTo(cx + (sx * (bOff - bSize)), cy + sy * bOff);
          ctx.stroke();
        });
      }

      // Drone icon
      if (phase === 'drone_dispatched' || phase === 'engagement') {
        const droneLat = 0.2 + droneProgress * 0.6;
        const droneLng = 0.25 + droneProgress * 0.5;
        const dx = droneLng * w;
        const dy = droneLat * h;

        ctx.fillStyle = '#0096ff';
        ctx.strokeStyle = '#0096ff';
        ctx.lineWidth = 1;

        // Simple drone shape
        ctx.beginPath();
        ctx.arc(dx, dy, 4, 0, Math.PI * 2);
        ctx.fill();

        // Drone trail
        ctx.strokeStyle = 'rgba(0,150,255,0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(dx - 80, dy - 60);
        ctx.lineTo(dx, dy);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw path to target
        ctx.strokeStyle = 'rgba(255,170,0,0.3)';
        ctx.lineWidth = 0.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(dx, dy);
        ctx.lineTo(cx, cy);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Impact flash
      if (phase === 'impact') {
        const flash = Math.max(0, 1 - (t % 2000) / 500);
        ctx.fillStyle = `rgba(255,50,0,${flash * 0.4})`;
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = `rgba(255,80,0,${0.3 + pulse * 0.3})`;
        ctx.beginPath();
        ctx.arc(cx, cy, 80 + pulse * 20, 0, Math.PI * 2);
        ctx.fill();
      }

      // Scanning line
      if (phase === 'scanning' || phase === 'target_acquired') {
        const scanY = (t * 0.08) % h;
        const grad = ctx.createLinearGradient(0, scanY - 20, 0, scanY + 2);
        grad.addColorStop(0, 'rgba(0,212,126,0)');
        grad.addColorStop(1, 'rgba(0,212,126,0.15)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, scanY - 20, w, 22);
      }

      // HUD info text
      ctx.font = '10px "Courier New", monospace';
      ctx.fillStyle = '#536878';
      if (activeScenario) {
        ctx.fillText(`LAT: ${activeScenario.location.lat.toFixed(4)}N`, 12, 20);
        ctx.fillText(`LNG: ${activeScenario.location.lng.toFixed(4)}E`, 12, 34);
        ctx.fillText(`ALT: 10,000ft  ISR FEED`, 12, 48);
      }
      ctx.fillText('UNCLASSIFIED // FOR DEMONSTRATION PURPOSES', w - 8, h - 8);

      // Bottom right
      if (isActive) {
        ctx.fillStyle = '#00d47e';
        ctx.fillText('● LIVE FEED', w - 90, 20);
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [phase, droneProgress, activeScenario]);

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
      className={clsx('w-full h-full', className)}
      style={{ imageRendering: 'pixelated' }}
    />
  );
}

// Google Maps 3D view component
function GoogleMap3D({ className, onError }: { className?: string; onError?: () => void }) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const { activeScenario, phase, dronePosition } = useSimulationStore();
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setError('no-key');
      onError?.();
      return;
    }

    // Dynamically load Google Maps
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

  useEffect(() => {
    if (!loaded || !mapContainerRef.current) return;

    const initMap = async () => {
      try {
        const { Map3DElement, Marker3DElement } = (window as any).google.maps.maps3d;

        const scenario = activeScenario;
        const center = scenario?.location ?? { lat: 15.3694, lng: 44.191, alt: 0 };

        const map = new Map3DElement({
          center: { lat: center.lat, lng: center.lng, altitude: center.alt ?? 0 },
          tilt: scenario?.mapTilt ?? 60,
          heading: scenario?.mapHeading ?? 0,
          range: scenario?.mapRange ?? 1000,
        });

        mapContainerRef.current!.appendChild(map);
        mapRef.current = map;

        // Add target marker if we have a scenario
        if (scenario) {
          const marker = new Marker3DElement({
            position: {
              lat: scenario.location.lat,
              lng: scenario.location.lng,
              altitude: 0,
            },
            label: 'TARGET',
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

  // Fly camera to target when scenario changes or phase advances
  useEffect(() => {
    if (!mapRef.current || !activeScenario) return;
    const { location, mapTilt, mapHeading, mapRange } = activeScenario;

    try {
      mapRef.current.flyCameraTo({
        endCamera: {
          center: { lat: location.lat, lng: location.lng, altitude: 0 },
          tilt: mapTilt ?? 60,
          heading: mapHeading ?? 0,
          range: mapRange ?? 800,
        },
        durationMilliseconds: 2000,
      });
    } catch (e) {
      // flyCameraTo may not be available in all versions
    }
  }, [activeScenario, phase]);

  if (error === 'no-key' || error === 'load-failed' || error === 'init-failed') {
    return null; // Fall back to canvas
  }

  return (
    <div
      ref={mapContainerRef}
      className={clsx('w-full h-full', className)}
    />
  );
}

export function Map3DView({ className }: { className?: string }) {
  const [hasGoogleKey] = useState(
    () => !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  );
  const [googleFailed, setGoogleFailed] = useState(false);

  return (
    <div className={clsx('relative bg-[#0a1520] overflow-hidden', className)}>
      {!hasGoogleKey || googleFailed ? (
        <CanvasFallback />
      ) : (
        <GoogleMap3D onError={() => setGoogleFailed(true)} />
      )}
      <MapHUD />
    </div>
  );
}

// Overlay HUD elements on top of the map
function MapHUD() {
  const { phase, activeScenario, confidenceScore } = useSimulationStore();
  const isAlert = phase === 'alert_threshold' || phase === 'engagement' || phase === 'impact';

  return (
    <>
      {/* Top left corner info */}
      <div className="absolute top-3 left-3 font-mono text-[10px] text-terminal-text-dim space-y-0.5 pointer-events-none">
        <div className="text-terminal-green">● ISR LIVE FEED</div>
        {activeScenario && (
          <>
            <div>{activeScenario.location.lat.toFixed(4)}°N {activeScenario.location.lng.toFixed(4)}°E</div>
            <div>ALT: 10,000 FT MSL</div>
            <div>SENSOR: MQ-9 REAPER EO/IR</div>
          </>
        )}
      </div>

      {/* Top right — confidence badge */}
      {phase !== 'idle' && (
        <div className={clsx(
          'absolute top-3 right-3 font-mono text-xs px-2 py-1 rounded border pointer-events-none',
          confidenceScore >= 70
            ? 'bg-terminal-red-dim border-terminal-red text-terminal-red'
            : confidenceScore >= 40
            ? 'bg-terminal-amber-dim border-terminal-amber text-terminal-amber'
            : 'bg-terminal-green-dim border-terminal-green text-terminal-green'
        )}>
          CONF: {confidenceScore.toFixed(0)}%
        </div>
      )}

      {/* Alert flash border */}
      {isAlert && (
        <div className="absolute inset-0 border-2 border-terminal-red pointer-events-none animate-pulse-red rounded-none" />
      )}

      {/* Disclaimer overlay */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 font-mono text-[9px] text-terminal-text-faint pointer-events-none whitespace-nowrap">
        SIMULATION — STOP KILLER ROBOTS DISARMAMENT ADVOCACY TOOL
      </div>
    </>
  );
}
