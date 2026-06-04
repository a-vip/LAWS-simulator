'use client';
import { SystemHeader } from '@/components/SystemHeader';
import { Map3DView } from '@/components/Map3DView';
import { ScenarioSelector } from '@/components/ScenarioSelector';
import { TargetIntelPanel } from '@/components/TargetIntelPanel';
import { ConfidenceDisplay } from '@/components/ConfidenceDisplay';
import { NarrativePanel } from '@/components/NarrativePanel';
import { AlertFeed } from '@/components/AlertFeed';
import { EngagementWorkflow } from '@/components/EngagementWorkflow';
import { PhaseControls } from '@/components/PhaseControls';
import { AlertOverlay } from '@/components/AlertOverlay';
import { AssessmentScreen } from '@/components/AssessmentScreen';
import { SimulationTicker } from '@/components/SimulationTicker';
import { KioskMode } from '@/components/KioskMode';
import { PresenterPanel } from '@/components/PresenterPanel';
import { CommandDashboard } from '@/components/CommandDashboard';
import { TargetPipeline } from '@/components/modules/TargetPipeline';
import { LavenderModule } from '@/components/modules/LavenderModule';
import { HabsoraModule } from '@/components/modules/HabsoraModule';
import { WheresDaddyModule } from '@/components/modules/WheresDaddyModule';
import { HumanLoopModule } from '@/components/modules/HumanLoopModule';
import { ComplianceModule } from '@/components/modules/ComplianceModule';
import { useSimulationStore } from '@/store/simulation';

export default function Home() {
  const { viewMode, activeModule } = useSimulationStore();

  // Render active engine module full-screen
  const renderModule = () => {
    switch (activeModule) {
      case 'pipeline':   return <TargetPipeline />;
      case 'lavender':   return <LavenderModule />;
      case 'habsora':    return <HabsoraModule />;
      case 'daddy':      return <WheresDaddyModule />;
      case 'human':      return <HumanLoopModule />;
      case 'compliance': return <ComplianceModule />;
      default:           return null;
    }
  };

  const isModuleView = activeModule !== 'hub';

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden scanlines">
      <SimulationTicker />
      <KioskMode />
      <PresenterPanel />

      {/* Top bar */}
      <SystemHeader />

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden relative z-0">
        {isModuleView ? (
          /* Full-screen module canvas */
          <div className="flex-1 overflow-hidden">
            {renderModule()}
          </div>
        ) : viewMode === 'dashboard' ? (
          <CommandDashboard />
        ) : (
          <>
            {/* ── LEFT PANEL ─────────────────────────────── */}
            <aside className="w-72 shrink-0 flex flex-col gap-2 p-2 overflow-y-auto border-r border-terminal-border bg-terminal-panel">
              <ScenarioSelector />
              <TargetIntelPanel />
            </aside>

            {/* ── CENTER MAP ──────────────────────────────── */}
            <main className="flex-1 flex flex-col overflow-hidden">
              <Map3DView className="flex-1" />

              {/* Below map: narrative + phase controls */}
              <div className="shrink-0 grid grid-cols-2 gap-2 p-2 border-t border-terminal-border bg-terminal-panel">
                <NarrativePanel />
                <div className="flex flex-col gap-2">
                  <PhaseControls />
                  <EngagementWorkflow />
                </div>
              </div>
            </main>

            {/* ── RIGHT PANEL ─────────────────────────────── */}
            <aside className="w-64 shrink-0 flex flex-col gap-2 p-2 overflow-y-auto border-l border-terminal-border bg-terminal-panel">
              <ConfidenceDisplay />
              <AlertFeed />
            </aside>
          </>
        )}
      </div>

      {/* Modal overlays */}
      <AlertOverlay />
      <AssessmentScreen />
    </div>
  );
}
