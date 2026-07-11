'use client';
import { useSimulationStore } from '@/store/simulation';
import clsx from 'clsx';

const MODULES = [
  { id: 'hub',        label: 'COMMAND HUB',       shortLabel: 'HUB', activeColor: '#00d47e',  dimColor: '#00d47e40'  },
  { id: 'pipeline',   label: 'M1: PIPELINE',       shortLabel: 'M1',  activeColor: '#38bdf8',  dimColor: '#38bdf840'  },
  { id: 'lavender',   label: 'M2: LAVENDER',       shortLabel: 'M2',  activeColor: '#ffaa00',  dimColor: '#ffaa0040'  },
  { id: 'habsora',    label: 'M3: HAPSORA',        shortLabel: 'M3',  activeColor: '#ff6600',  dimColor: '#ff660040'  },
  { id: 'daddy',      label: 'M4: WHERES DADDY',   shortLabel: 'M4',  activeColor: '#ff1a2e',  dimColor: '#ff1a2e40'  },
  { id: 'human',      label: 'M5: HUMAN LOOP',     shortLabel: 'M5',  activeColor: '#ffaa00',  dimColor: '#ffaa0040'  },
  { id: 'compliance', label: 'M6: COMPLIANCE',     shortLabel: 'M6',  activeColor: '#00d47e',  dimColor: '#00d47e40'  },
] as const;

export function ModuleNav() {
  const { activeModule, setActiveModule } = useSimulationStore();

  return (
    <div
      className="flex items-center overflow-x-auto"
      style={{
        background:  'rgba(4,6,12,0.7)',
        border:      '1px solid rgba(26,37,53,0.6)',
        borderRadius: 6,
        padding:     '2px 4px',
        gap:         2,
        maxWidth:    '100%',
        scrollbarWidth: 'none',
      }}
    >
      {MODULES.map((mod, i) => {
        const isActive = activeModule === mod.id;
        return (
          <button
            key={mod.id}
            onClick={() => setActiveModule(mod.id)}
            style={{
              padding:         '3px 8px',
              borderRadius:    4,
              fontSize:        8,
              fontWeight:      700,
              letterSpacing:   '0.06em',
              textTransform:   'uppercase',
              whiteSpace:      'nowrap',
              cursor:          'pointer',
              transition:      'all 0.18s',
              fontFamily:      'inherit',
              border:          isActive ? `1px solid ${mod.dimColor}` : '1px solid transparent',
              background:      isActive ? `${mod.activeColor}14` : 'transparent',
              color:           isActive ? mod.activeColor : '#2a3a4a',
              boxShadow:       isActive ? `0 0 8px ${mod.activeColor}22` : 'none',
            }}
            onMouseEnter={e => {
              if (!isActive) {
                e.currentTarget.style.color      = '#8892a4';
                e.currentTarget.style.background = 'rgba(26,37,53,0.35)';
              }
            }}
            onMouseLeave={e => {
              if (!isActive) {
                e.currentTarget.style.color      = '#2a3a4a';
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            {/* Full label on large, short on small */}
            <span className="hidden lg:inline">{mod.label}</span>
            <span className="lg:hidden">{mod.shortLabel}</span>
          </button>
        );
      })}
    </div>
  );
}
