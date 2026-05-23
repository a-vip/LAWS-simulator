'use client';
import { useState, useRef } from 'react';
import { Lock, Unlock, Settings, MapPin, Code, Copy, Plus, Trash2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import clsx from 'clsx';

export default function ScenarioBuilder() {
  const [passphrase, setPassphrase] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState(false);

  // Form states
  const [id, setId] = useState('custom-scenario-01');
  const [title, setTitle] = useState('UN Convention Target Nominations');
  const [subtitle, setSubtitle] = useState('Simulation based on debated CCW parameters');
  const [basedOn, setBasedOn] = useState('Based on proposed targeting parameters under UN Article 36 review');
  
  // Coordinates
  const [lat, setLat] = useState(15.3694);
  const [lng, setLng] = useState(44.1910);
  const [heading, setHeading] = useState(0);
  const [tilt, setTilt] = useState(60);
  const [range, setRange] = useState(800);
  const [threshold, setThreshold] = useState(70);

  // Targets
  const [targetId, setTargetId] = useState('t1');
  const [designator, setDesignator] = useState('SUBJECT FOCUS ECHO');
  const [targetType, setTargetType] = useState<'person' | 'building' | 'vehicle' | 'group'>('person');
  const [threatLevel, setThreatLevel] = useState<'low' | 'medium' | 'high' | 'critical'>('high');
  const [notes, setNotes] = useState('Subject identified in transit corridor. 3 signals intercepts confirm link.');

  // Narratives
  const [narrativeScanning, setNarrativeScanning] = useState('Surveillance sweep initiated. Filtering regional signatures.');
  const [narrativeAcquired, setNarrativeAcquired] = useState('Target match flagged by pattern correlation algorithm.');
  const [narrativeTracking, setNarrativeTracking] = useState('Active tracking locked. Signal cross-checks underway.');
  const [narrativeBuilding, setNarrativeBuilding] = useState('Running confidence logic. Profiling local structures.');
  const [narrativeAlert, setNarrativeAlert] = useState('Lethal threshold reached. Requesting engagement authorization.');
  const [narrativeAuthPending, setNarrativeAuthPending] = useState('Awaiting command signature loop confirmation.');
  const [narrativeAuthorized, setNarrativeAuthorized] = useState('Strike authorized. Proportionality filters completed.');
  const [narrativeDispatched, setNarrativeDispatched] = useState('Cinematic intercept launched. ETA 3 minutes.');
  const [narrativeEngagement, setNarrativeEngagement] = useState('Terminal homing active. Ordnance release confirmed.');
  const [narrativeImpact, setNarrativeImpact] = useState('Strike completed.');
  const [narrativeAssessment, setNarrativeAssessment] = useState('Post-strike review: Target neutralized. Collateral casualties: 0.');

  // Authorization Chain
  const [authChain, setAuthChain] = useState([
    { entity: 'PROFILING ALGORITHM', role: 'Target selection', status: 'autonomous' as const },
    { entity: 'LEGAL ANALYST', role: 'Proportionality review', status: 'approved' as const },
    { entity: 'TACTICAL COMMANDER', role: 'Strike authorization', status: 'approved' as const }
  ]);

  const [newAuthEntity, setNewAuthEntity] = useState('');
  const [newAuthRole, setNewAuthRole] = useState('');
  const [newAuthStatus, setNewAuthStatus] = useState<'approved' | 'autonomous'>('approved');

  // Copy indicator
  const [copied, setCopied] = useState(false);

  // Challenge passphrase
  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (passphrase === 'STOP_KILLER_ROBOTS_2026') {
      setIsAuthenticated(true);
      setError(false);
    } else {
      setError(true);
      setPassphrase('');
    }
  };

  // Compile JSON Scenario output
  const compiledScenario = {
    id,
    title,
    subtitle,
    basedOn,
    location: { lat, lng, alt: 0 },
    mapHeading: heading,
    mapTilt: tilt,
    mapRange: range,
    primaryTargetId: targetId,
    confidenceThreshold: threshold,
    targets: [
      {
        id: targetId,
        designator,
        type: targetType,
        position: { lat, lng },
        confidenceScore: 0,
        threatLevel,
        metadata: {
          notes,
          phoneMetadata: true,
          patternDays: 14
        }
      }
    ],
    droneOrigin: { lat: lat + 0.4, lng: lng + 0.6 },
    narrative: {
      scanning: narrativeScanning,
      target_acquired: narrativeAcquired,
      tracking: narrativeTracking,
      confidence_building: narrativeBuilding,
      alert_threshold: narrativeAlert,
      authorization_pending: narrativeAuthPending,
      authorized: narrativeAuthorized,
      drone_dispatched: narrativeDispatched,
      engagement: narrativeEngagement,
      impact: narrativeImpact,
      assessment: narrativeAssessment
    },
    authorizationChain: authChain,
    collateralEstimate: [
      { type: 'Primary target', count: 1 },
      { type: 'Civilian collateral casualties', count: 0 }
    ],
    legalContext: {
      applicableLaw: 'IHL Article 57 — Precautions in Attack',
      legalGap: 'Commanders are relying on AI target databases without individual verification, creating accountability gaps.',
      treatyStatus: 'CCW negotiations are currently gridlocked on binding restrictions.',
      advocacyAsk: 'A legally binding international moratorium on algorithmic targeting lists.'
    }
  };

  const handleAddAuth = () => {
    if (!newAuthEntity || !newAuthRole) return;
    setAuthChain([...authChain, { entity: newAuthEntity, role: newAuthRole, status: newAuthStatus }]);
    setNewAuthEntity('');
    setNewAuthRole('');
  };

  const handleRemoveAuth = (index: number) => {
    setAuthChain(authChain.filter((_, i) => i !== index));
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(compiledScenario, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Mock map grid picker click handler
  const handleMapGridClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const computedLat = 15.0 + (y / rect.height) * 0.8;
    const computedLng = 44.0 + (x / rect.width) * 1.2;
    setLat(parseFloat(computedLat.toFixed(5)));
    setLng(parseFloat(computedLng.toFixed(5)));
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-terminal-bg flex items-center justify-center font-mono p-4 select-none scanlines">
        <form onSubmit={handleAuth} className="max-w-md w-full bg-terminal-panel border border-terminal-border rounded shadow-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-terminal-border pb-3 mb-2 text-terminal-blue font-bold text-xs uppercase tracking-widest">
            <Lock className="w-4 h-4" />
            SECURE ACCESS AUTHORIZATION
          </div>
          
          <p className="text-[10px] text-terminal-text-dim leading-relaxed">
            INPUT ADVOCACY COMMAND PASSPHRASE TO INITIATE THE CUSTOM TARGETING SCENARIO BUILDER ENVIRONMENT.
          </p>

          <div className="space-y-1.5">
            <label className="text-[9px] text-terminal-text-faint uppercase font-bold tracking-widest">Passphrase Credentials</label>
            <input
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              className={clsx(
                'w-full bg-black border rounded p-3 text-xs outline-none font-mono text-center tracking-widest',
                error ? 'border-terminal-red text-terminal-red' : 'border-terminal-border text-terminal-green focus:border-terminal-blue'
              )}
              placeholder="••••••••••••••••"
              autoFocus
            />
            {error && (
              <span className="text-[8.5px] text-terminal-red block text-center font-bold uppercase animate-pulse">
                ❌ ACCESS DENIED // credentials invalid
              </span>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-2 bg-terminal-blue-dim border border-terminal-blue text-terminal-blue hover:bg-terminal-blue/20 rounded font-bold uppercase tracking-widest text-[10px] transition-colors"
          >
            Authenticate Token
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-terminal-bg font-mono text-terminal-text select-none flex flex-col p-4 space-y-4 overflow-y-auto">
      {/* ── HEADER ────────────────────────────────────────────────── */}
      <header className="flex justify-between items-center border-b border-terminal-border pb-3 shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/" className="px-2 py-1 border border-terminal-border text-terminal-text-dim hover:text-terminal-text hover:border-terminal-text rounded text-[9px] font-bold uppercase transition-colors flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" /> [ESC] Hub
          </Link>
          <div>
            <div className="text-[9px] text-terminal-text-faint uppercase tracking-widest">TACTICAL WORKSPACE</div>
            <div className="text-sm font-bold text-terminal-blue uppercase flex items-center gap-1.5 mt-0.5">
              <Settings className="w-4 h-4 text-terminal-blue" />
              SCENARIO GENERATOR TOOL
            </div>
          </div>
        </div>
        <span className="text-[8px] bg-terminal-green-dim border border-terminal-green text-terminal-green px-2.5 py-0.5 rounded font-bold uppercase">
          SECURE CHANNEL ONLINE
        </span>
      </header>

      {/* ── MAIN WORKSPACE GRID ───────────────────────────────────── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Side: Interactive Builder Form */}
        <div className="bg-terminal-panel/40 border border-terminal-border rounded p-4 space-y-4 overflow-y-auto max-h-[85vh]">
          {/* Metadata */}
          <div>
            <h3 className="text-[10px] font-bold text-terminal-blue uppercase tracking-wider mb-2 pb-1 border-b border-terminal-border">
              1. General Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[10px]">
              <div className="space-y-1">
                <label className="text-terminal-text-faint">Scenario ID</label>
                <input type="text" value={id} onChange={(e) => setId(e.target.value)} className="w-full bg-black border border-terminal-border p-2 rounded text-terminal-green outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-terminal-text-faint">Scenario Title</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-black border border-terminal-border p-2 rounded text-terminal-text outline-header outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-terminal-text-faint">Scenario Subtitle</label>
                <input type="text" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className="w-full bg-black border border-terminal-border p-2 rounded text-terminal-text outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-terminal-text-faint">Based On Incident Sourcing</label>
                <input type="text" value={basedOn} onChange={(e) => setBasedOn(e.target.value)} className="w-full bg-black border border-terminal-border p-2 rounded text-terminal-amber outline-none" />
              </div>
            </div>
          </div>

          {/* Location details */}
          <div>
            <h3 className="text-[10px] font-bold text-terminal-blue uppercase tracking-wider mb-2 pb-1 border-b border-terminal-border">
              2. Geography & Camera Presets
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-[10px]">
              <div className="space-y-1">
                <label className="text-terminal-text-faint">Latitude</label>
                <input type="number" step="0.0001" value={lat} onChange={(e) => setLat(parseFloat(e.target.value))} className="w-full bg-black border border-terminal-border p-2 rounded text-terminal-text font-mono outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-terminal-text-faint">Longitude</label>
                <input type="number" step="0.0001" value={lng} onChange={(e) => setLng(parseFloat(e.target.value))} className="w-full bg-black border border-terminal-border p-2 rounded text-terminal-text font-mono outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-terminal-text-faint">Heading (°)</label>
                <input type="number" value={heading} onChange={(e) => setHeading(parseInt(e.target.value))} className="w-full bg-black border border-terminal-border p-2 rounded text-terminal-text font-mono outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-terminal-text-faint">Tilt (°)</label>
                <input type="number" value={tilt} onChange={(e) => setTilt(parseInt(e.target.value))} className="w-full bg-black border border-terminal-border p-2 rounded text-terminal-text font-mono outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-terminal-text-faint">Range (m)</label>
                <input type="number" value={range} onChange={(e) => setRange(parseInt(e.target.value))} className="w-full bg-black border border-terminal-border p-2 rounded text-terminal-text font-mono outline-none" />
              </div>
            </div>
          </div>

          {/* Target Profile */}
          <div>
            <h3 className="text-[10px] font-bold text-terminal-blue uppercase tracking-wider mb-2 pb-1 border-b border-terminal-border">
              3. Lethal Target Profile
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[10px]">
              <div className="space-y-1">
                <label className="text-terminal-text-faint">Designator</label>
                <input type="text" value={designator} onChange={(e) => setDesignator(e.target.value)} className="w-full bg-black border border-terminal-border p-2 rounded text-terminal-red outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-terminal-text-faint">Target Type</label>
                <select value={targetType} onChange={(e: any) => setTargetType(e.target.value)} className="w-full bg-black border border-terminal-border p-2 rounded text-terminal-text outline-none">
                  <option value="person">Person</option>
                  <option value="building">Structure / Building</option>
                  <option value="vehicle">Vehicle</option>
                  <option value="group">Assembly / Group</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-terminal-text-faint">Threat Rating</label>
                <select value={threatLevel} onChange={(e: any) => setThreatLevel(e.target.value)} className="w-full bg-black border border-terminal-border p-2 rounded text-terminal-text outline-none">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-terminal-text-faint">Analyst Profile Notes</label>
                <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full bg-black border border-terminal-border p-2 rounded text-terminal-text outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-terminal-text-faint">Lethal Threshold (%)</label>
                <input type="number" value={threshold} onChange={(e) => setThreshold(parseInt(e.target.value))} className="w-full bg-black border border-terminal-border p-2 rounded text-terminal-amber outline-none" />
              </div>
            </div>
          </div>

          {/* Authorization Chain */}
          <div>
            <h3 className="text-[10px] font-bold text-terminal-blue uppercase tracking-wider mb-2 pb-1 border-b border-terminal-border">
              4. Chain of Command Approval Nodes
            </h3>
            
            {/* List */}
            <div className="space-y-2 mb-3">
              {authChain.map((step, i) => (
                <div key={i} className="flex justify-between items-center bg-black/40 border border-terminal-border p-2 rounded text-[9.5px]">
                  <div>
                    <span className="font-bold text-terminal-text-header">{step.entity}</span>
                    <span className="text-terminal-text-faint mx-2">·</span>
                    <span className="text-terminal-text-dim">{step.role}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={clsx(
                      'px-1.5 rounded text-[8px] font-bold uppercase',
                      step.status === 'autonomous' ? 'bg-terminal-red-dim border border-terminal-red text-terminal-red' : 'bg-terminal-green-dim border border-terminal-green text-terminal-green'
                    )}>
                      {step.status}
                    </span>
                    <button onClick={() => handleRemoveAuth(i)} className="text-terminal-text-faint hover:text-terminal-red">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[9.5px] bg-black/20 p-2.5 rounded border border-terminal-border/40">
              <div className="space-y-1">
                <label className="text-terminal-text-faint">Command Entity Name</label>
                <input type="text" value={newAuthEntity} onChange={(e) => setNewAuthEntity(e.target.value)} className="w-full bg-black border border-terminal-border p-1.5 rounded outline-none" placeholder="e.g. MISSION LEGAL CELL" />
              </div>
              <div className="space-y-1">
                <label className="text-terminal-text-faint">Assigned Role</label>
                <input type="text" value={newAuthRole} onChange={(e) => setNewAuthRole(e.target.value)} className="w-full bg-black border border-terminal-border p-1.5 rounded outline-none" placeholder="e.g. Proportionality Sign-off" />
              </div>
              <div className="space-y-1">
                <label className="text-terminal-text-faint">Auth Status</label>
                <select value={newAuthStatus} onChange={(e: any) => setNewAuthStatus(e.target.value)} className="w-full bg-black border border-terminal-border p-1.5 rounded outline-none">
                  <option value="approved">Approved (Human-in-Loop)</option>
                  <option value="autonomous">Autonomous (Machine Decision)</option>
                </select>
              </div>
              <button type="button" onClick={handleAddAuth} className="md:col-span-3 py-1.5 mt-1 bg-terminal-blue-dim border border-terminal-blue text-terminal-blue hover:bg-terminal-blue/20 rounded font-bold uppercase flex items-center justify-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Add Authorization Node
              </button>
            </div>
          </div>

          {/* Narrative Editor */}
          <div>
            <h3 className="text-[10px] font-bold text-terminal-blue uppercase tracking-wider mb-2 pb-1 border-b border-terminal-border">
              5. Narrative Chronology Text
            </h3>
            <div className="space-y-2.5 text-[9.5px]">
              <div className="space-y-1">
                <label className="text-terminal-text-faint uppercase font-bold">scanning phase</label>
                <textarea value={narrativeScanning} onChange={(e) => setNarrativeScanning(e.target.value)} className="w-full h-12 bg-black border border-terminal-border p-2 rounded outline-none text-terminal-text" />
              </div>
              <div className="space-y-1">
                <label className="text-terminal-text-faint uppercase font-bold">target acquired phase</label>
                <textarea value={narrativeAcquired} onChange={(e) => setNarrativeAcquired(e.target.value)} className="w-full h-12 bg-black border border-terminal-border p-2 rounded outline-none text-terminal-text" />
              </div>
              <div className="space-y-1">
                <label className="text-terminal-text-faint uppercase font-bold">alert threshold phase</label>
                <textarea value={narrativeAlert} onChange={(e) => setNarrativeAlert(e.target.value)} className="w-full h-12 bg-black border border-terminal-border p-2 rounded outline-none text-terminal-text" />
              </div>
              <div className="space-y-1">
                <label className="text-terminal-text-faint uppercase font-bold">post-strike assessment phase</label>
                <textarea value={narrativeAssessment} onChange={(e) => setNarrativeAssessment(e.target.value)} className="w-full h-12 bg-black border border-terminal-border p-2 rounded outline-none text-terminal-text" />
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Real-time Coordinate Map Grid & JSON Exporter */}
        <div className="flex flex-col space-y-4 max-h-[85vh]">
          {/* Simulated Map Picker Grid */}
          <div className="bg-terminal-card border border-terminal-border rounded p-3 flex flex-col space-y-2 shrink-0">
            <div className="flex justify-between items-center border-b border-terminal-border pb-1.5">
              <span className="text-[10px] text-terminal-blue font-bold uppercase tracking-wider flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> Geospatial Click Grid Picker
              </span>
              <span className="text-[8px] text-terminal-text-faint">
                Click grid to place coordinates
              </span>
            </div>
            
            <div
              onClick={handleMapGridClick}
              className="relative w-full aspect-video border border-terminal-border rounded cursor-crosshair overflow-hidden flex items-center justify-center bg-black/60 bg-grid"
            >
              {/* Radar rings */}
              <div className="absolute w-48 h-48 border border-terminal-blue/10 rounded-full" />
              <div className="absolute w-24 h-24 border border-terminal-blue/25 rounded-full" />

              {/* Cursor Target Reticle */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-px h-full bg-terminal-blue/15" />
                <div className="h-px w-full bg-terminal-blue/15" />
              </div>

              {/* Glowing Coordinate Lock Marker */}
              <div className="absolute w-5 h-5 border border-terminal-red rounded-full flex items-center justify-center animate-pulse pointer-events-none">
                <div className="w-1.5 h-1.5 bg-terminal-red rounded-full" />
              </div>

              <div className="absolute bottom-2 right-2 bg-terminal-panel/90 border border-terminal-border px-2 py-1 rounded text-[8px] text-terminal-green font-mono pointer-events-none">
                GRID LOCK LAT: {lat}°N · LNG: {lng}°E
              </div>
            </div>
          </div>

          {/* Compiled JSON Exporter */}
          <div className="flex-1 bg-terminal-card border border-terminal-border rounded p-3 flex flex-col overflow-hidden min-h-[250px]">
            <div className="flex justify-between items-center border-b border-terminal-border pb-1.5 shrink-0">
              <span className="text-[10px] text-terminal-blue font-bold uppercase tracking-wider flex items-center gap-1">
                <Code className="w-3.5 h-3.5" /> Compiled Scenario JSON Output
              </span>
              <button
                onClick={handleCopy}
                className="px-2 py-0.5 border border-terminal-blue text-terminal-blue hover:bg-terminal-blue/20 rounded font-bold text-[8.5px] uppercase transition-colors flex items-center gap-1"
              >
                <Copy className="w-3 h-3" /> {copied ? 'Copied!' : 'Copy JSON'}
              </button>
            </div>

            {/* Code Block */}
            <div className="flex-1 overflow-y-auto p-2 bg-black/40 border border-terminal-border rounded mt-2.5 text-[8.5px] font-mono text-terminal-green leading-normal select-all">
              <pre>{JSON.stringify(compiledScenario, null, 2)}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
