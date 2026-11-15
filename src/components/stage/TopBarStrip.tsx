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
  const { environment, isSimulating } = useAstraStore();
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
    { label: 'OVERVIEW', path: '/' },
    { label: 'MONITORING', path: '/monitoring' },
    { label: 'BODY', path: '/body' },
    { label: 'ASSESSMENT', path: '/check-in' },
    { label: 'MEASURE', path: '/measure' },
    { label: 'EXERCISE', path: '/exercise' },
    { label: 'ANALYTICS', path: '/analytics' },
    { label: 'MEDICAL', path: '/medical' },
    { label: 'HABITAT', path: '/environment' },
  ];

  return (
    <header className="fixed top-0 inset-x-0 h-11 z-40 px-3 lg:px-6 flex items-center justify-between pointer-events-none select-none bg-[#06090F]/90 backdrop-blur-md border-b border-white/[0.08] text-[#EDECE8]">
      {/* Left: Mission Sol, Environment, and Dynamic Authenticated Crew Profile */}
      <div className="flex items-center gap-2 pointer-events-auto">
        <div className="flex items-center gap-1.5 mr-1">
          <div className="w-2 h-2 rounded-full bg-[#7CD4FD] shadow-[0_0_8px_#7CD4FD]" />
          <span className="text-xs font-mono font-bold tracking-widest text-[#EDECE8]">SOLARIS</span>
        </div>
        <span className="text-[#8D97A6] text-xs">·</span>
        <span className="text-[11px] font-mono tracking-instrument text-[#7CD4FD] font-semibold">
          SOL 142 / 500
        </span>
        <span className="text-[#8D97A6] text-xs">·</span>
        <button
          onClick={onOpenEnvironment}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono tracking-instrument text-[#EDECE8] hover:bg-white/5 transition-colors border border-white/10"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-[#4ECDC4]" />
          <span>{envLabels[environment] || 'MARS HABITAT'}</span>
        </button>

        {/* Dynamic Authenticated Crew Indicator */}
        <span className="text-[#8D97A6] text-xs">·</span>
        {activeCrew ? (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono border border-white/15 bg-white/[0.04]">
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: activeCrew.badgeColor || '#4EBE8E' }}
            />
            <span className="text-[#EDECE8] font-medium">{activeCrew.callsign}</span>
            <button
              onClick={lockDashboard}
              title="Switch Crew / Lock Telemetry"
              className="ml-1 text-[8.5px] text-[#8D97A6] hover:text-[#7CD4FD] underline"
            >
              Lock
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded text-[9.5px] font-mono border border-[#E0B042]/40 bg-[#E0B042]/10 text-[#E0B042]">
            <Lock className="w-2.5 h-2.5" />
            <span>AUTHENTICATION LOCKED</span>
          </div>
        )}
      </div>

      {/* Center: Nav Pills */}
      <nav className="flex items-center gap-1 pointer-events-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `px-2.5 py-0.5 rounded-full text-[10px] font-mono tracking-instrument transition-all duration-200 border ${
                isActive
                  ? 'bg-[#7CD4FD]/15 text-[#7CD4FD] border-[#7CD4FD]/40 shadow-sm font-semibold'
                  : 'text-[#8D97A6] border-transparent hover:text-[#EDECE8] hover:bg-white/5'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Right: Earth Link, Simulated Badge, Mic state */}
      <div className="flex items-center gap-2.5 pointer-events-auto">
        <div className="flex items-center gap-1 text-[10px] font-mono tracking-instrument text-[#8D97A6]">
          <span>LINK: 14m DELAY</span>
        </div>

        <div className="px-2 py-0.5 rounded text-[9px] font-mono tracking-instrument border border-[#9D8EC2]/40 text-[#9D8EC2] bg-[#9D8EC2]/10">
          {isSimulating ? 'SIMULATED' : 'NOMINAL'}
        </div>

        <button
          onClick={toggleMic}
          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono tracking-instrument border transition-colors ${
            isMicActive
              ? 'border-[#4ECDC4]/40 bg-[#4ECDC4]/10 text-[#4ECDC4]'
              : 'border-white/10 bg-white/[0.02] text-[#8D97A6]'
          }`}
        >
          {isMicActive ? (
            <Mic className="w-2.5 h-2.5 text-[#4ECDC4]" strokeWidth={1.5} />
          ) : (
            <MicOff className="w-2.5 h-2.5 text-[#8D97A6]" strokeWidth={1.5} />
          )}
          <span>{isMicActive ? (astraMode === 'SLEEPING' ? 'STANDBY' : 'MIC ON') : 'MIC MUTED'}</span>
        </button>
      </div>
    </header>
  );
};
export default TopBarStrip;
