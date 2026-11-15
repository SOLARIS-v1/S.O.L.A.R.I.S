import React, { useState, useEffect, useRef } from 'react';
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
    selectCrew,
    lockDashboard,
    isMicActive,
    toggleMic,
    astraMode,
  } = useSolaris();

  const [crewDropdownOpen, setCrewDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Click outside listener for crew dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setCrewDropdownOpen(false);
      }
    };
    if (crewDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [crewDropdownOpen]);

  const storeCrew = crew.find((c) => c.id === activeSubjectId) || crew[0];
  const activeAstronaut = {
    name: activeCrew?.name || (activeCrew === null ? 'Select Astronaut' : storeCrew?.name || 'Commander Vance'),
    callsign: activeCrew?.callsign || (activeCrew === null ? 'AUTH REQUIRED' : storeCrew?.callsign || 'EXPEDITION-64'),
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

          {/* Active Astronaut Profile Pill with Quick-Switcher Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setCrewDropdownOpen((prev) => !prev)}
              className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border transition-all text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 shadow-sm ${
                activeCrew === null
                  ? 'bg-amber-50 hover:bg-amber-100 border-amber-300 animate-pulse'
                  : 'bg-slate-50 hover:bg-slate-100 border-slate-200/80'
              }`}
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
                  <ChevronDown className={`w-3 h-3 text-slate-400 group-hover:text-indigo-600 shrink-0 transition-transform ${crewDropdownOpen ? 'rotate-180' : ''}`} />
                </div>
                <span className="text-[10px] text-slate-500 font-mono block truncate">
                  {activeAstronaut.callsign} • EXP-64
                </span>
              </div>
            </button>

            {/* Astronaut Quick-Switcher Dropdown Menu */}
            {crewDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-72 rounded-2xl bg-white border border-slate-200 shadow-[0_12px_36px_rgba(0,0,0,0.12)] p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 flex items-center justify-between mb-1">
                  <span>EXPEDITION CREW PROFILES</span>
                  <span className="text-[9px] text-indigo-600 font-mono">SOLARIS</span>
                </div>

                <div className="space-y-1">
                  {/* Vance */}
                  <button
                    onClick={() => {
                      selectCrew('vance');
                      setCrewDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-left transition-all ${
                      activeCrew?.id === 'vance'
                        ? 'bg-indigo-50 border border-indigo-200 text-indigo-900 font-bold'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                      AV
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold truncate">Cmdr. Alex Vance</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        <span>Commander</span>
                        <span>&bull;</span>
                        <span className="text-amber-600 font-medium">Ectopic HR (96)</span>
                      </div>
                    </div>
                  </button>

                  {/* Patel */}
                  <button
                    onClick={() => {
                      selectCrew('patel');
                      setCrewDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-left transition-all ${
                      activeCrew?.id === 'patel'
                        ? 'bg-indigo-50 border border-indigo-200 text-indigo-900 font-bold'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                      RP
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold truncate">Spec. R. Patel</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        <span>EVA Specialist</span>
                        <span>&bull;</span>
                        <span className="text-emerald-600 font-medium">Nominal (64)</span>
                      </div>
                    </div>
                  </button>

                  {/* Chen */}
                  <button
                    onClick={() => {
                      selectCrew('chen');
                      setCrewDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-left transition-all ${
                      activeCrew?.id === 'chen'
                        ? 'bg-indigo-50 border border-indigo-200 text-indigo-900 font-bold'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                      SC
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold truncate">Eng. Sarah Chen</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        <span>Flight Engineer</span>
                        <span>&bull;</span>
                        <span className="text-rose-600 font-medium">Sleep Deficit (4.5h)</span>
                      </div>
                    </div>
                  </button>
                </div>

                <div className="pt-1.5 mt-1 border-t border-slate-100 space-y-0.5">
                  <button
                    onClick={() => {
                      setCrewDropdownOpen(false);
                      onOpenIdentify?.();
                    }}
                    className="w-full text-left px-2.5 py-1.5 text-xs text-indigo-600 hover:bg-indigo-50 rounded-lg font-medium transition-colors flex items-center justify-between"
                  >
                    <span>Full Biometric Roster...</span>
                    <Plus className="w-3 h-3 text-indigo-400" />
                  </button>
                  <button
                    onClick={() => {
                      setCrewDropdownOpen(false);
                      lockDashboard();
                    }}
                    className="w-full text-left px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg font-medium transition-colors"
                  >
                    Lock Console / Logout
                  </button>
                </div>
              </div>
            )}
          </div>

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
