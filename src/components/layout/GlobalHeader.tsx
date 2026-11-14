import React, { useState, useEffect, useRef } from 'react';
import { useAstraStore } from '../../api/mockClient';
import { MissionEnvironment } from '../../api/types';
import {
  Bell,
  SlidersHorizontal,
  ChevronDown,
  Activity,
  CheckCircle2,
  HardDriveDownload,
  Globe,
  Radio,
  Compass,
} from 'lucide-react';

interface GlobalHeaderProps {
  onOpenSimulator: () => void;
  simulatorOpen: boolean;
  onOpenIdentify: () => void;
  onOpenAssistant: () => void;
}

export const GlobalHeader: React.FC<GlobalHeaderProps> = ({
  onOpenSimulator,
  simulatorOpen,
  onOpenIdentify,
  onOpenAssistant,
}) => {
  const {
    activeSubjectId,
    crew,
    findings,
    isSimulating,
    environment,
    setEnvironment,
  } = useAstraStore();

  const activeAstronaut = crew.find(c => c.id === activeSubjectId) || crew[1];
  const activeAlertsCount = findings.filter(
    f => f.subject_id === activeSubjectId && f.status !== 'acknowledged' && f.level !== 'normal'
  ).length;

  const [utcTime, setUtcTime] = useState<string>('14:37:22 UTC');
  const [dateStr, setDateStr] = useState<string>('Sat, Apr 26, 2025');
  const [modeDropdownOpen, setModeDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toISOString().substring(11, 19) + ' UTC');
      setDateStr(now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setModeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const envMeta: Record<string, { label: string; icon: string; gravity: string; delay: string }> = {
    space_station: { label: 'Space Station', icon: '🛰️', gravity: '0g (Microgravity)', delay: '0.2s' },
    station: { label: 'Space Station', icon: '🛰️', gravity: '0g (Microgravity)', delay: '0.2s' },
    mars_habitat: { label: 'Mars Habitat', icon: '🔴', gravity: '0.38g (Mars Surface)', delay: '14m 30s' },
    mars: { label: 'Mars Habitat', icon: '🔴', gravity: '0.38g (Mars Surface)', delay: '14m 30s' },
    rover: { label: 'Planetary Rover', icon: '🚜', gravity: '0.38g (Surface Sortie)', delay: '14m 30s' },
    satellite: { label: 'Satellite / Transit', icon: '📡', gravity: '0g (Deep Space)', delay: '22m 10s' },
    lunar: { label: 'Lunar Gateway', icon: '🌕', gravity: '0.16g (Lunar Orbit)', delay: '1.3s' },
  };

  const currentMode = envMeta[environment] || envMeta.space_station;

  const selectMode = (mode: MissionEnvironment) => {
    setEnvironment(mode);
    setModeDropdownOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#E2E8F0] bg-[#FFFFFF]/95 backdrop-blur-md px-6 py-2.5 select-none shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 font-mono">
        {/* Left: Astronaut Profile Pill */}
        <div className="flex items-center gap-6">
          <button
            onClick={onOpenIdentify}
            className="flex items-center gap-3 p-1.5 pr-4 rounded-xl bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] transition-all text-left group"
            title="Click to switch astronaut"
          >
            {/* Space Helmet Avatar */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0EA5E9] to-[#0284C7] p-0.5 shadow-sm">
              <div className="w-full h-full rounded-full bg-[#E0F2FE] flex items-center justify-center text-[#0284C7] font-bold text-xs">
                {activeAstronaut.callsign.substring(0, 2)}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-[#0F172A] group-hover:text-[#0284C7]">
                  {activeAstronaut.name}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8]" />
              </div>
              <span className="text-[11px] text-[#64748B]">
                EXP-64 / {currentMode.label}
              </span>
            </div>
          </button>

          {/* Mission Elapsed Time */}
          <div className="hidden md:flex flex-col text-xs">
            <span className="text-[10px] text-[#94A3B8] uppercase">Mission Elapsed</span>
            <span className="text-xs font-bold text-[#0F172A]">
              {activeAstronaut.mission_day}d 4h 32m
            </span>
          </div>

          {/* Date & UTC Clock */}
          <div className="hidden lg:flex flex-col text-xs">
            <span className="text-[10px] text-[#94A3B8]">{dateStr}</span>
            <span className="text-xs font-bold text-[#0F172A]">{utcTime}</span>
          </div>
        </div>

        {/* Center / Right Badges & Indicators */}
        <div className="flex items-center gap-3 text-xs">
          {/* Operational Mode Switcher Dropdown (Space Station, Mars Habitat, Rover, Satellite) */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setModeDropdownOpen(!modeDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F0F9FF] hover:bg-[#E0F2FE] border border-[#BAE6FD] text-[#0284C7] font-bold text-[11px] transition-all shadow-sm"
              title="Click to switch operational mode (Space Station, Mars Habitat, Rover, Satellite)"
            >
              <span>{currentMode.icon}</span>
              <span>{currentMode.label}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#0284C7]" />
            </button>

            {modeDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl bg-[#FFFFFF] border border-[#E2E8F0] shadow-lg py-1.5 z-50 text-left">
                <div className="px-3 py-1.5 border-b border-[#E2E8F0] text-[10px] text-[#94A3B8] uppercase tracking-wider font-bold">
                  Operational Mission Mode
                </div>

                {/* 1. Space Station */}
                <button
                  onClick={() => selectMode('space_station')}
                  className="w-full px-3 py-2 text-left hover:bg-[#F8FAFC] flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">🛰️</span>
                    <div>
                      <span className="text-xs font-bold text-[#0F172A] block leading-tight">Space Station</span>
                      <span className="text-[10px] text-[#64748B]">ISS / Low Earth Orbit • 0g</span>
                    </div>
                  </div>
                  {(environment === 'space_station' || environment === 'station') && (
                    <CheckCircle2 className="w-4 h-4 text-[#0EA5E9]" />
                  )}
                </button>

                {/* 2. Mars Habitat */}
                <button
                  onClick={() => selectMode('mars_habitat')}
                  className="w-full px-3 py-2 text-left hover:bg-[#F8FAFC] flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">🔴</span>
                    <div>
                      <span className="text-xs font-bold text-[#0F172A] block leading-tight">Mars Habitat</span>
                      <span className="text-[10px] text-[#64748B]">Surface Hab Dome • 0.38g</span>
                    </div>
                  </div>
                  {(environment === 'mars_habitat' || environment === 'mars') && (
                    <CheckCircle2 className="w-4 h-4 text-[#0EA5E9]" />
                  )}
                </button>

                {/* 3. Rover */}
                <button
                  onClick={() => selectMode('rover')}
                  className="w-full px-3 py-2 text-left hover:bg-[#F8FAFC] flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">🚜</span>
                    <div>
                      <span className="text-xs font-bold text-[#0F172A] block leading-tight">Planetary Rover</span>
                      <span className="text-[10px] text-[#64748B]">Pressurized Sortie • EVA</span>
                    </div>
                  </div>
                  {environment === 'rover' && (
                    <CheckCircle2 className="w-4 h-4 text-[#0EA5E9]" />
                  )}
                </button>

                {/* 4. Satellite */}
                <button
                  onClick={() => selectMode('satellite')}
                  className="w-full px-3 py-2 text-left hover:bg-[#F8FAFC] flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">📡</span>
                    <div>
                      <span className="text-xs font-bold text-[#0F172A] block leading-tight">Satellite / Transit</span>
                      <span className="text-[10px] text-[#64748B]">Deep Space Transit • Relay</span>
                    </div>
                  </div>
                  {environment === 'satellite' && (
                    <CheckCircle2 className="w-4 h-4 text-[#0EA5E9]" />
                  )}
                </button>
              </div>
            )}
          </div>

          {/* LOCAL SYSTEM (SIMULATED DATA) Green Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#10B981]/10 border border-[#10B981]/30 text-[#059669] font-bold text-[11px]">
            <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
            <span className="tracking-wide">LOCAL SYSTEM</span>
            <span className="text-[9px] text-[#059669]/80 font-normal hidden sm:inline">(SIMULATED DATA)</span>
          </div>

          {/* ASTRA Ready EKG Pulse */}
          <button
            onClick={onOpenAssistant}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0EA5E9]/10 hover:bg-[#0EA5E9]/20 border border-[#0EA5E9]/30 text-[#0284C7] font-bold text-[11px] transition-all shadow-glowCyan"
            title="Open ASTRA Neural Voice Assistant"
          >
            <Activity className="w-4 h-4 text-[#0284C7] animate-pulse" />
            <span>ASTRA Ready</span>
          </button>

          {/* Telemetry Simulator Toggle */}
          <button
            onClick={onOpenSimulator}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${
              simulatorOpen || isSimulating
                ? 'bg-[#0284C7] text-white border-[#0284C7] font-bold'
                : 'bg-[#F8FAFC] hover:bg-[#F1F5F9] border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A]'
            }`}
            title="Telemetry Simulator"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sim</span>
          </button>

          {/* Notification Bell with Badge */}
          <div className="relative cursor-pointer p-2 rounded-full hover:bg-[#F1F5F9] text-[#64748B] hover:text-[#0F172A] transition-colors">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#EF4444] text-white text-[9px] font-bold flex items-center justify-center">
              {activeAlertsCount > 0 ? activeAlertsCount : 2}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
