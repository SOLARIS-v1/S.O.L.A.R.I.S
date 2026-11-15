import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { GlobalHeader } from './GlobalHeader';
import { EnvironmentDrawer } from '../stage/EnvironmentDrawer';
import { TasksDrawer } from '../stage/TasksDrawer';
import { HazardSideDrawer } from '../hazards/HazardSideDrawer';
import { SimulatorDrawer } from '../simulator/SimulatorDrawer';
import { SettingsModal } from '../stage/SettingsModal';
import { AstronautIdentificationModal } from '../onboarding/AstronautIdentificationModal';
import { useAstraStore } from '../../api/mockClient';
import { useSolaris } from '../../context/SolarisContext';
import { AuthGateModal } from '../hud/AuthGateModal';
import { AstraVoiceHudBar } from '../hud/AstraVoiceHudBar';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const location = useLocation();
  const { records, activeSubjectId } = useAstraStore();
  const { isMicActive } = useSolaris();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [identifyModalOpen, setIdentifyModalOpen] = useState(false);
  const [envDrawerOpen, setEnvDrawerOpen] = useState(false);
  const [tasksDrawerOpen, setTasksDrawerOpen] = useState(false);
  const [hazardsDrawerOpen, setHazardsDrawerOpen] = useState(false);
  const [activeHazardId, setActiveHazardId] = useState<string | null>(null);
  const [simDrawerOpen, setSimDrawerOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  const subjectRecords = records.filter((r) => r.subject_id === activeSubjectId);

  // Routes that require fixed full-height without page-level scrollbars (e.g. 3D Holographic Stage)
  const isStageView =
    location.pathname === '/' ||
    location.pathname === '/stage' ||
    location.pathname === '/overview' ||
    location.pathname === '/body';

  return (
    <div className="relative w-screen h-screen overflow-hidden solaris-stage flex bg-[#F4F7FC] font-sans text-[#0F172A] select-none">
      {/* Authentication Gate Overlay (locks dashboard if activeCrew === null) */}
      <AuthGateModal />

      {/* Left Navigation Sidebar with SOLARIS identity and 10 mission links */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        onOpenIdentify={() => setIdentifyModalOpen(true)}
        onOpenAssistant={() => {}}
      />

      {/* Main Cockpit / Application Viewport */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header Strip */}
        <GlobalHeader
          onOpenSimulator={() => setSimDrawerOpen(true)}
          simulatorOpen={simDrawerOpen}
          onOpenIdentify={() => setIdentifyModalOpen(true)}
          onOpenAssistant={() => {}}
          onOpenEnvironment={() => setEnvDrawerOpen(true)}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          sidebarCollapsed={sidebarCollapsed}
        />

        {/* Dynamic Route Viewport */}
        <main
          className="flex-1 w-full min-h-0 overflow-y-auto p-3 sm:p-5 lg:p-6 pb-24 scrollbar-thin"
          role="main"
        >
          {children}
        </main>
      </div>

      {/* Unobtrusive Persistent Voice Control Bar */}
      <AstraVoiceHudBar />

      {/* Interactive Modal & Telemetry Drawers */}
      <AstronautIdentificationModal
        isOpen={identifyModalOpen}
        onClose={() => setIdentifyModalOpen(false)}
      />

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

export default AppLayout;
