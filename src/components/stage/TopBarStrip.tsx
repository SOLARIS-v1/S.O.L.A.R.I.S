import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAstraStore } from '../../api/mockClient';
import { useAstra } from '../../context/AstraContext';
import { Radio, Mic, MicOff, Lock } from 'lucide-react';

interface TopBarStripProps {
  onOpenEnvironment?: () => void;
  onOpenTasks?: () => void;
  onOpenHazards?: () => void;
  onOpenSimulator?: () => void;
  onOpenSettings?: () => void;
  micActive?: boolean;
}

export const TopBarStrip: React.FC<TopBarStripProps> = ({
  onOpenEnvironment,
}) => {
  const { environment } = useAstraStore();
  const { activeCrew, lockDashboard, astraMode, isMicActive, toggleMic } = useAstra();

  const envLabels: Record<string, string> = {
    space_station: 'ORBITAL STATION',
    station: 'ORBITAL STATION',
    mars_habitat: 'MARS HABITAT',
    mars: 'MARS HABITAT',
    lunar: 'LUNAR GATEWAY',
    rover: 'PRESSURIZED ROVER',
    satellite: 'DEEP SPACE TRANSIT',
  };

  const navItems = [
    { label: 'STAGE', path: '/' },
    { label: 'ANALYSIS', path: '/analytics' },
    { label: 'CHECK-IN', path: '/check-in' },
    { label: 'MEDICAL', path: '/medical' },
  ];

  return (
    <header className="fixed top-0 inset-x-0 h-11 z-40 px-3 lg:px-6 flex items-center justify-between pointer-events-none select-none bg-[#06080C]/85 backdrop-blur-md border-b border-white/[0.06]">
      {/* Left: Mission Sol, Environment, and Dynamic Authenticated Crew Profile */}
      <div className="flex items-center gap-2 pointer-events-auto">
        <span className="text-[11px] font-mono tracking-instrument text-[#ECE8E1] font-medium">
          DAY 142 / 500
        </span>
        <span className="text-[#5B6573] text-xs">·</span>
        <button
          onClick={onOpenEnvironment}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono tracking-instrument text-[#ECE8E1] hover:bg-white/5 transition-colors border border-white/5"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-[#ECE8E1]" />
          <span>{envLabels[environment] || 'MARS HABITAT'}</span>
        </button>

        {/* Dynamic Authenticated Crew Indicator */}
        <span className="text-[#5B6573] text-xs">·</span>
        {activeCrew ? (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono border border-white/10 bg-white/[0.03]">
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: activeCrew.badgeColor }}
            />
            <span className="text-[#ECE8E1] font-medium">{activeCrew.callsign}</span>
            <button
              onClick={lockDashboard}
              title="Switch Crew / Lock Telemetry"
              className="ml-1 text-[8.5px] text-[#8D97A6] hover:text-[#ECE8E1] underline"
            >
              Lock
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded text-[9.5px] font-mono border border-amber-500/30 bg-amber-500/10 text-[#E0BE6A]">
            <Lock className="w-2.5 h-2.5" />
            <span>AUTHENTICATION LOCKED</span>
          </div>
        )}
      </div>

      {/* Center: 4 Nav Pills */}
      <nav className="flex items-center gap-1 pointer-events-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `px-3 py-1 rounded-full text-[10px] font-mono tracking-instrument transition-all duration-200 border ${
                isActive
                  ? 'bg-white/10 text-[#ECE8E1] border-white/20 shadow-sm font-medium'
                  : 'text-[#8D97A6] border-transparent hover:text-[#ECE8E1] hover:bg-white/5'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Right: Earth Link, Simulated Badge, Mic state */}
      <div className="flex items-center gap-2.5 pointer-events-auto">
        <div className="flex items-center gap-1 text-[10px] font-mono tracking-instrument text-[#ECE8E1]">
          <span>LINK: 14m DELAY</span>
        </div>

        <div className="px-2 py-0.5 rounded text-[9px] font-mono tracking-instrument border border-white/15 text-[#ECE8E1] bg-white/[0.04]">
          SIMULATED
        </div>

        <button
          onClick={toggleMic}
          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono tracking-instrument border transition-colors ${
            isMicActive
              ? 'border-white/15 bg-white/[0.04] text-[#ECE8E1]'
              : 'border-white/10 bg-white/[0.01] text-[#5B6573]'
          }`}
        >
          {isMicActive ? (
            <Mic className="w-2.5 h-2.5 text-[#6FBF9B]" strokeWidth={1.5} />
          ) : (
            <MicOff className="w-2.5 h-2.5 text-[#5B6573]" strokeWidth={1.5} />
          )}
          <span>{isMicActive ? (astraMode === 'SLEEPING' ? 'STANDBY' : 'MIC ON') : 'MIC MUTED'}</span>
        </button>
      </div>
    </header>
  );
};
