import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAstraStore } from '../../api/mockClient';
import { useSolaris } from '../../context/SolarisContext';
import {
  Bell,
  ChevronDown,
  Clock,
  User,
  Menu,
  Search,
  Plus,
} from 'lucide-react';

interface GlobalHeaderProps {
  onOpenSimulator?: () => void;
  simulatorOpen?: boolean;
  onOpenIdentify?: () => void;
  onOpenAssistant?: () => void;
  onOpenEnvironment?: () => void;
  onToggleSidebar?: () => void;
  sidebarCollapsed?: boolean;
}

export const GlobalHeader: React.FC<GlobalHeaderProps> = ({
  onOpenSimulator,
  onOpenIdentify,
  onOpenAssistant,
  onToggleSidebar,
}) => {
  const {
    activeSubjectId,
    crew,
    findings,
  } = useAstraStore();

  const {
    activeCrew,
    isMicActive,
    toggleMic,
    astraMode,
  } = useSolaris();

  const storeCrew = crew.find((c) => c.id === activeSubjectId) || crew[0];
  const activeAstronaut = {
    name: activeCrew?.name || storeCrew?.name || 'Commander Vance',
    callsign: activeCrew?.callsign || storeCrew?.callsign || 'VALKYRIE',
    missionDay: storeCrew?.mission_day || 142,
  };

  const activeAlertsCount = findings.filter(
    (f) =>
      f.subject_id === activeSubjectId &&
      f.status !== 'acknowledged' &&
      f.level !== 'normal'
  ).length;

  const [utcTime, setUtcTime] = useState<string>('');

  // Live ticking UTC clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getUTCHours()).padStart(2, '0');
      const mins = String(now.getUTCMinutes()).padStart(2, '0');
      const secs = String(now.getUTCSeconds()).padStart(2, '0');
      setUtcTime(`${hours}:${mins}:${secs} UTC`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const getVoiceAssistantState = () => {
    if (!isMicActive) {
      return { label: 'STANDBY', active: false };
    }
    switch (astraMode) {
      case 'LISTENING':
        return { label: 'LISTENING', active: true };
      case 'NARRATING':
        return { label: 'SPEAKING', active: true };
      default:
        return { label: 'READY', active: true };
    }
  };

  const voiceState = getVoiceAssistantState();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-4 lg:px-6 py-3 select-none font-sans text-slate-800 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Left Section: "Patient Details" Title + Active Astronaut Profile */}
        <div className="flex items-center gap-4 lg:gap-6 min-w-0">
          {/* Mobile Sidebar Toggle */}
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              aria-label="Toggle Navigation Sidebar"
              title="Toggle Navigation Sidebar"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}

          {/* Page Heading matching screenshot */}
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
              Patient Details
            </h1>
          </div>

          {/* Active Astronaut Profile Pill */}
          <button
            onClick={onOpenIdentify}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition-all text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 shadow-sm"
            title="Click to switch active astronaut profile"
          >
            {/* Astronaut Avatar */}
            <div className="w-7 h-7 rounded-full bg-indigo-100 border border-indigo-200 p-0.5 flex items-center justify-center text-indigo-600 font-bold text-xs shrink-0">
              <User className="w-3.5 h-3.5 text-indigo-600" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 truncate transition-colors">
                  {activeAstronaut.name}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-indigo-600 shrink-0" />
              </div>
              <span className="text-[10px] text-slate-500 font-mono block truncate">
                {activeAstronaut.callsign} • EXP-64
              </span>
            </div>
          </button>

          {/* Mission Sol & Live UTC Clock */}
          <div className="hidden 2xl:flex items-center gap-3 pl-3 border-l border-slate-200 text-xs font-mono">
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold text-[10.5px]">
              SOL 142 / 500
            </span>
            <span className="text-slate-500 text-[11px] flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>{utcTime || '14:48:00 UTC'}</span>
            </span>
          </div>
        </div>

        {/* Central Top Navigation: Exactly Stage, Check-in, Measure, Analytics, Medical, Settings */}
        <nav className="hidden lg:flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/70" aria-label="Top Navigation">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                isActive
                  ? 'bg-white text-indigo-600 shadow-[2px_2px_6px_rgba(163,177,198,0.25)] font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`
            }
          >
            Stage
          </NavLink>
          <NavLink
            to="/check-in"
            className={({ isActive }) =>
              `px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                isActive
                  ? 'bg-white text-indigo-600 shadow-[2px_2px_6px_rgba(163,177,198,0.25)] font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`
            }
          >
            Check-in
          </NavLink>
          <NavLink
            to="/measure"
            className={({ isActive }) =>
              `px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                isActive
                  ? 'bg-white text-indigo-600 shadow-[2px_2px_6px_rgba(163,177,198,0.25)] font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`
            }
          >
            Measure
          </NavLink>
          <NavLink
            to="/analytics"
            className={({ isActive }) =>
              `px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                isActive
                  ? 'bg-white text-indigo-600 shadow-[2px_2px_6px_rgba(163,177,198,0.25)] font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`
            }
          >
            Analytics
          </NavLink>
          <NavLink
            to="/medical"
            className={({ isActive }) =>
              `px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                isActive
                  ? 'bg-white text-indigo-600 shadow-[2px_2px_6px_rgba(163,177,198,0.25)] font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`
            }
          >
            Medical
          </NavLink>
        </nav>

        {/* Right Section matching screenshot: Search Box + Add Record Button + Voice Pill + Bell */}
        <div className="flex items-center gap-3 text-xs shrink-0">
          {/* Search Box matching screenshot */}
          <div className="hidden sm:flex items-center rounded-xl bg-slate-50 border border-slate-200/80 overflow-hidden shadow-inner pl-3 pr-1 py-1 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
            <input
              type="text"
              placeholder="Search Patient..."
              className="bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none w-32 md:w-44"
            />
            <button className="p-1.5 rounded-lg bg-[#5850EC] hover:bg-[#4F46E5] text-white shadow-sm transition-colors">
              <Search className="w-3.5 h-3.5 text-white" />
            </button>
          </div>

          {/* + Add Record Button matching screenshot */}
          <button
            onClick={onOpenSimulator}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#5850EC] hover:bg-[#4F46E5] text-white font-semibold text-xs shadow-[0_4px_12px_rgba(88,80,236,0.25)] hover:shadow-[0_6px_16px_rgba(88,80,236,0.35)] transition-all"
            title="Log Telemetry / Add Clinical Record"
          >
            <Plus className="w-4 h-4" />
            <span>Add Record</span>
          </button>

          {/* Voice Assistant State Pill */}
          <button
            onClick={onOpenAssistant || toggleMic}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border font-mono font-medium text-[11px] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 shadow-sm ${
              isMicActive
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}
            title="SOLARIS Voice Assistant"
          >
            <span className={`w-2 h-2 rounded-full ${voiceState.active ? 'bg-indigo-600 animate-pulse' : 'bg-slate-400'}`} />
            <span>SOLARIS: {voiceState.label}</span>
          </button>

          {/* Notifications Bell */}
          <div
            className="relative cursor-pointer p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors shadow-sm"
            title={`${activeAlertsCount} active clinical findings`}
            role="button"
            tabIndex={0}
          >
            <Bell className="w-4 h-4" />
            {activeAlertsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center font-mono shadow-sm">
                {activeAlertsCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default GlobalHeader;
