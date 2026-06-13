import { create } from 'zustand';

export interface MapLayerState {
  layers: {
    isrAssets: boolean;
    threatAnalysis: boolean;
    targeting: boolean;
    battlefield: boolean;
    reference: boolean;
  };
  subLayers: Record<string, boolean>;
  panelOpen: boolean;
  toggleLayer: (layer: keyof MapLayerState['layers']) => void;
  toggleSubLayer: (key: string) => void;
  setAllLayers: (on: boolean) => void;
  setPanelOpen: (open: boolean) => void;
}

const DEFAULT_SUB_LAYERS: Record<string, boolean> = {
  // ISR Assets
  'isr.droneTracks': true,
  'isr.satCoverage': true,
  'isr.sigintArea': true,
  // Threat Analysis
  'threat.rangeRadials': true,
  'threat.hostileZone': true,
  'threat.cdeRings': true,
  // Targeting
  'target.primaryMarker': true,
  'target.secondaryMarkers': true,
  'target.patternTracks': true,
  // Battlefield Geometry
  'battle.engagementZone': true,
  'battle.sensorFans': true,
  'battle.approachVectors': true,
  // Reference
  'ref.gridOverlay': false,
  'ref.civilianInfra': true,
  'ref.noStrikeZones': true,
};

export const useMapLayerStore = create<MapLayerState>((set) => ({
  layers: {
    isrAssets: true,
    threatAnalysis: true,
    targeting: true,
    battlefield: true,
    reference: true,
  },
  subLayers: { ...DEFAULT_SUB_LAYERS },
  panelOpen: false,

  toggleLayer: (layer) =>
    set((state) => ({
      layers: { ...state.layers, [layer]: !state.layers[layer] },
    })),

  toggleSubLayer: (key) =>
    set((state) => ({
      subLayers: { ...state.subLayers, [key]: !state.subLayers[key] },
    })),

  setAllLayers: (on) =>
    set(() => ({
      layers: {
        isrAssets: on,
        threatAnalysis: on,
        targeting: on,
        battlefield: on,
        reference: on,
      },
      subLayers: Object.fromEntries(
        Object.entries(DEFAULT_SUB_LAYERS).map(([k]) => [k, on])
      ),
    })),

  setPanelOpen: (open) => set({ panelOpen: open }),
}));
