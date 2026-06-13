'use client';
import { useMapLayerStore } from '@/store/mapLayers';
import { Layers, ChevronRight, Eye, EyeOff, Radio, Target, Shield, Map, Crosshair } from 'lucide-react';
import clsx from 'clsx';

interface LayerGroup {
  key: keyof ReturnType<typeof useMapLayerStore.getState>['layers'];
  label: string;
  icon: React.ReactNode;
  subLayers: { key: string; label: string }[];
}

const LAYER_GROUPS: LayerGroup[] = [
  {
    key: 'isrAssets',
    label: 'ISR ASSETS',
    icon: <Radio className="w-3 h-3" />,
    subLayers: [
      { key: 'isr.droneTracks', label: 'MQ-9 Reaper tracks' },
      { key: 'isr.satCoverage', label: 'Orbital SAT coverage' },
      { key: 'isr.sigintArea', label: 'SIGINT collection area' },
    ],
  },
  {
    key: 'threatAnalysis',
    label: 'THREAT ANALYSIS',
    icon: <Target className="w-3 h-3" />,
    subLayers: [
      { key: 'threat.rangeRadials', label: 'Threat range radials' },
      { key: 'threat.hostileZone', label: 'Hostile zone overlay' },
      { key: 'threat.cdeRings', label: 'Collateral damage estimate' },
    ],
  },
  {
    key: 'targeting',
    label: 'TARGETING',
    icon: <Crosshair className="w-3 h-3" />,
    subLayers: [
      { key: 'target.primaryMarker', label: 'Primary target marker' },
      { key: 'target.secondaryMarkers', label: 'Secondary targets' },
      { key: 'target.patternTracks', label: 'Pattern-of-life tracks' },
    ],
  },
  {
    key: 'battlefield',
    label: 'BATTLEFIELD GEOMETRY',
    icon: <Shield className="w-3 h-3" />,
    subLayers: [
      { key: 'battle.engagementZone', label: 'Engagement zone' },
      { key: 'battle.sensorFans', label: 'Sensor fan coverage' },
      { key: 'battle.approachVectors', label: 'Drone approach vectors' },
    ],
  },
  {
    key: 'reference',
    label: 'REFERENCE',
    icon: <Map className="w-3 h-3" />,
    subLayers: [
      { key: 'ref.gridOverlay', label: 'Grid overlay' },
      { key: 'ref.civilianInfra', label: 'Civilian infrastructure' },
      { key: 'ref.noStrikeZones', label: 'No-strike zones' },
    ],
  },
];

export function TacticalLayersPanel() {
  const { layers, subLayers, panelOpen, toggleLayer, toggleSubLayer, setPanelOpen, setAllLayers } = useMapLayerStore();

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setPanelOpen(!panelOpen)}
        className={clsx(
          'absolute top-3 left-3 z-20 flex items-center gap-1.5 px-2 py-1.5 rounded font-mono text-[9px] font-bold uppercase transition-all duration-300 pointer-events-auto',
          panelOpen
            ? 'bg-terminal-blue/20 border border-terminal-blue text-terminal-blue'
            : 'bg-terminal-panel/90 border border-terminal-border text-terminal-text-dim hover:text-terminal-text hover:border-terminal-border-bright'
        )}
      >
        <Layers className="w-3.5 h-3.5" />
        MAP LAYERS
        <ChevronRight className={clsx('w-3 h-3 transition-transform duration-300', panelOpen && 'rotate-180')} />
      </button>

      {/* Panel */}
      <div
        className={clsx(
          'absolute top-12 left-3 z-20 w-56 bg-terminal-panel/95 border border-terminal-border rounded shadow-2xl font-mono text-[8.5px] transition-all duration-300 pointer-events-auto backdrop-blur-sm',
          panelOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none'
        )}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-terminal-border">
          <span className="text-terminal-text font-bold tracking-widest">MAP LAYERS</span>
          <div className="flex gap-1">
            <button
              onClick={() => setAllLayers(true)}
              className="px-1.5 py-0.5 text-terminal-green hover:bg-terminal-green/10 rounded transition-all"
              title="Show all"
            >
              <Eye className="w-3 h-3" />
            </button>
            <button
              onClick={() => setAllLayers(false)}
              className="px-1.5 py-0.5 text-terminal-text-dim hover:bg-terminal-red/10 hover:text-terminal-red rounded transition-all"
              title="Hide all"
            >
              <EyeOff className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-1.5 border-b border-terminal-border">
          <div className="text-terminal-text-faint italic">Search Overlays...</div>
        </div>

        {/* Layer groups */}
        <div className="max-h-[50vh] overflow-y-auto py-1">
          {LAYER_GROUPS.map((group) => {
            const isOn = layers[group.key];
            return (
              <div key={group.key} className="px-2 py-0.5">
                {/* Group header */}
                <button
                  onClick={() => toggleLayer(group.key)}
                  className={clsx(
                    'flex items-center gap-1.5 w-full px-1.5 py-1 rounded transition-all group',
                    isOn ? 'text-terminal-text' : 'text-terminal-text-faint'
                  )}
                >
                  <span className={clsx(
                    'w-3 h-3 rounded-sm border flex items-center justify-center transition-all',
                    isOn
                      ? 'bg-terminal-blue border-terminal-blue'
                      : 'border-terminal-border group-hover:border-terminal-text-dim'
                  )}>
                    {isOn && <span className="text-white text-[7px] font-bold">✓</span>}
                  </span>
                  <span className="flex items-center gap-1">
                    {group.icon}
                    <span className="font-bold tracking-wider">{group.label}</span>
                  </span>
                </button>

                {/* Sub-layers */}
                {isOn && (
                  <div className="ml-5 mt-0.5 space-y-0.5">
                    {group.subLayers.map((sub) => {
                      const subOn = subLayers[sub.key] ?? true;
                      return (
                        <button
                          key={sub.key}
                          onClick={() => toggleSubLayer(sub.key)}
                          className={clsx(
                            'flex items-center gap-1.5 w-full px-1.5 py-0.5 rounded transition-all',
                            subOn ? 'text-terminal-text-dim hover:text-terminal-text' : 'text-terminal-text-faint hover:text-terminal-text-dim'
                          )}
                        >
                          <span className={clsx(
                            'w-2.5 h-2.5 rounded-sm border flex items-center justify-center transition-all',
                            subOn
                              ? 'bg-terminal-green/60 border-terminal-green'
                              : 'border-terminal-border'
                          )}>
                            {subOn && <span className="text-white text-[6px]">✓</span>}
                          </span>
                          <span>{sub.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-3 py-1.5 border-t border-terminal-border text-terminal-text-faint text-center">
          PALANTIR MAVEN // TACTICAL OVERLAY ENGINE
        </div>
      </div>
    </>
  );
}
