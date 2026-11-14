import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { TopBarStrip } from '../stage/TopBarStrip';
import { EnvironmentDrawer } from '../stage/EnvironmentDrawer';
import { TasksDrawer } from '../stage/TasksDrawer';
import { HazardSideDrawer } from '../hazards/HazardSideDrawer';
import { SimulatorDrawer } from '../simulator/SimulatorDrawer';
import { SettingsModal } from '../stage/SettingsModal';
import { useAstraStore } from '../../api/mockClient';
import { AstraProvider, useAstra } from '../../context/AstraContext';
import { AuthGateModal } from '../hud/AuthGateModal';
import { AstraVoiceHudBar } from '../hud/AstraVoiceHudBar';

interface AppLayoutProps {
  children: React.ReactNode;
}

const LayoutInner: React.FC<AppLayoutProps> = ({ children }) => {
  const location = useLocation();
  const { records, activeSubjectId } = useAstraStore();
  const { isMicActive } = useAstra();

  const [envDrawerOpen, setEnvDrawerOpen] = useState(false);
  const [tasksDrawerOpen, setTasksDrawerOpen] = useState(false);
  const [hazardsDrawerOpen, setHazardsDrawerOpen] = useState(false);
  const [activeHazardId, setActiveHazardId] = useState<string | null>('gravity');
  const [simDrawerOpen, setSimDrawerOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  const subjectRecords = records.filter((r) => r.subject_id === activeSubjectId);
  const isStage = location.pathname === '/' || location.pathname === '/stage';

  return (
    <div className="relative w-screen h-screen overflow-hidden nocturne-stage flex flex-col font-sans text-[#ECE8E1] select-none">
      {/* Authentication Gate Overlay (locks dashboard if activeCrew === null) */}
      <AuthGateModal />

      {/* Slim Floating Top Strip with Dynamic Crew Profile & Lock */}
      <TopBarStrip
        onOpenEnvironment={() => setEnvDrawerOpen(true)}
        onOpenTasks={() => setTasksDrawerOpen(true)}
        onOpenHazards={() => {
          setActiveHazardId('gravity');
          setHazardsDrawerOpen(true);
        }}
        onOpenSimulator={() => setSimDrawerOpen(true)}
        onOpenSettings={() => setSettingsModalOpen(true)}
        micActive={isMicActive}
      />

      {/* Main Viewport Content Area */}
      <main
        className={`flex-1 w-full pt-11 ${
          isStage ? 'h-full overflow-hidden' : 'overflow-y-auto p-4 lg:p-6 pb-20'
        }`}
      >
        {children}
      </main>

      {/* Floating Bottom ASTRA Voice HUD Bar (visible across all 4 routes) */}
      <AstraVoiceHudBar />

      {/* Drawers & Modals */}
      <EnvironmentDrawer
        isOpen={envDrawerOpen}
        onClose={() => setEnvDrawerOpen(false)}
      />

      <TasksDrawer
        isOpen={tasksDrawerOpen}
        onClose={() => setTasksDrawerOpen(false)}
      />

      <HazardSideDrawer
        hazardId={activeHazardId}
        records={subjectRecords}
        onClose={() => {
          setHazardsDrawerOpen(false);
          setActiveHazardId(null);
        }}
      />

      <SimulatorDrawer
        isOpen={simDrawerOpen}
        onClose={() => setSimDrawerOpen(false)}
      />

      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
      />
    </div>
  );
};

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <AstraProvider>
      <LayoutInner>{children}</LayoutInner>
    </AstraProvider>
  );
};
