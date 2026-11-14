import React, { useState } from 'react';
import { useAstraStore } from '../api/mockClient';
import { useAstra } from '../context/AstraContext';
import { BodyRegion } from '../api/types';
import { BiometricTelemetryPanel } from '../components/hud/BiometricTelemetryPanel';
import { HolographicBodyCenter } from '../components/hud/HolographicBodyCenter';
import { AssistantTranscriptPanel } from '../components/hud/AssistantTranscriptPanel';
import { TimeScrubber } from '../components/stage/TimeScrubber';
import { SystemDetailDrawer } from '../components/stage/SystemDetailDrawer';
import { HazardSideDrawer } from '../components/hazards/HazardSideDrawer';

export const StagePage: React.FC = () => {
  const { records, activeSubjectId, findings } = useAstraStore();
  const [selectedDay, setSelectedDay] = useState<number>(30); // 1 to 30
  const [selectedRegion, setSelectedRegion] = useState<BodyRegion | null>(null);
  const [activeHazardId, setActiveHazardId] = useState<string | null>(null);

  const subjectRecords = records.filter((r) => r.subject_id === activeSubjectId);

  return (
    <div className="relative w-full h-full overflow-hidden flex flex-col justify-between select-none">
      {/* 3-Panel HUD Main Cockpit Layout */}
      <div className="flex-1 w-full h-full grid grid-cols-12 gap-2 lg:gap-3 px-3 lg:px-4 pb-14 pt-1 overflow-hidden">
        {/* Left Panel (cols 1-3): Biometric Telemetry Cards */}
        <div className="col-span-12 md:col-span-4 lg:col-span-3 h-full overflow-hidden rounded-xl bg-[#0B1017]/50 backdrop-blur-md border border-white/10 z-20">
          <BiometricTelemetryPanel />
        </div>

        {/* Center Panel (cols 4-8): 3D Holographic Core & Body Wireframe */}
        <div className="col-span-12 md:col-span-8 lg:col-span-6 h-full relative flex flex-col items-center justify-center overflow-hidden z-10">
          <HolographicBodyCenter onSelectZone={(z) => setSelectedRegion(z as BodyRegion)} />
        </div>

        {/* Right Panel (cols 9-12): Live Transcript, Voice State, Manual Override & Countermeasures */}
        <div className="col-span-12 md:col-span-12 lg:col-span-3 h-full overflow-hidden rounded-xl bg-[#0B1017]/50 backdrop-blur-md border border-white/10 z-20">
          <AssistantTranscriptPanel />
        </div>
      </div>

      {/* 30-Day Time Scrubber along the bottom */}
      <div className="fixed bottom-0 inset-x-0 z-30 flex flex-col items-center pb-1 pointer-events-auto bg-gradient-to-t from-[#06080C] via-[#06080C]/90 to-transparent pt-1">
        <TimeScrubber
          currentDay={selectedDay}
          maxDay={30}
          missionDayNumber={142}
          findings={findings.filter((f) => f.subject_id === activeSubjectId)}
          onDayChange={(day) => setSelectedDay(day)}
        />
        <div className="text-[9px] font-mono text-[#5B6573] tracking-wide -mt-0.5">
          Prototype decision support, not a medical device.
        </div>
      </div>

      {/* System Detail Side Drawer (when a region is clicked) */}
      <SystemDetailDrawer
        region={selectedRegion}
        records={subjectRecords}
        findings={findings.filter((f) => f.subject_id === activeSubjectId)}
        onClose={() => setSelectedRegion(null)}
        onOpenHazard={(hid) => setActiveHazardId(hid)}
      />

      {/* NASA Spaceflight Hazards Drawer */}
      <HazardSideDrawer
        hazardId={activeHazardId}
        records={subjectRecords}
        onClose={() => setActiveHazardId(null)}
      />
    </div>
  );
};
