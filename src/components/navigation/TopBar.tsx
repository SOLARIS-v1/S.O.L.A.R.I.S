import React from 'react';
import { useAstraStore } from '../../api/mockClient';
import { MissionEnvironment, LinkState } from '../../api/types';
import {
  Wifi,
  WifiOff,
  Radio,
  Globe2,
  Moon,
  Rocket,
  SlidersHorizontal,
  ChevronDown,
  Activity,
  User,
} from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';

interface TopBarProps {
  onOpenSimulator: () => void;
  simulatorOpen: boolean;
  onOpenIdentify?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onOpenSimulator, simulatorOpen, onOpenIdentify }) => {
  const {
    crew,
    activeSubjectId,
    setActiveSubject,
    linkState,
    setLinkState,
    environment,
    setEnvironment,
    records,
    isSimulating,
  } = useAstraStore();

  const activeAstronaut = crew.find(c => c.id === activeSubjectId) || crew[1];
  const pendingSyncCount = records.filter(r => !r.synced).length;

  const envConfig: Record<
    MissionEnvironment,
    { label: string; icon: React.ComponentType<{ className?: string }>; latency: string }
  > = {
    space_station: { label: 'Space Station', icon: Globe2, latency: 'Near real-time' },
    station: { label: 'LEO Station', icon: Globe2, latency: 'Near real-time' },
    mars_habitat: { label: 'Mars Habitat', icon: Rocket, latency: '14m 30s delay' },
    rover: { label: 'Planetary Rover', icon: Rocket, latency: '14m 30s delay' },
    satellite: { label: 'Satellite Transit', icon: Radio, latency: '22m delay' },
    lunar: { label: 'Lunar Gateway', icon: Moon, latency: '1.3s delay' },
    mars: { label: 'Mars Transit', icon: Rocket, latency: 'Demo-scaled 14m' },
  };

  const linkConfig: Record<
    LinkState,
    { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
  > = {
    connected: { label: 'Connected', icon: Wifi, color: 'text-[#5FB38A] bg-[#5FB38A]/10 border-[#5FB38A]/30' },
    limited: { label: 'Limited Bandwidth', icon: Radio, color: 'text-[#D9B35F] bg-[#D9B35F]/10 border-[#D9B35F]/30' },
    down: { label: 'Link Down', icon: WifiOff, color: 'text-[#D8605B] bg-[#D8605B]/10 border-[#D8605B]/30' },
  };

  const CurrentEnvIcon = envConfig[environment].icon;
  const CurrentLinkIcon = linkConfig[linkState].icon;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.07] bg-[#0A0D12]/90 backdrop-blur-md px-4 lg:px-6 py-2.5">
      <div className="max-w-[1720px] mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Left: Brand & Mission Day Progress */}
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#151A23] border border-white/[0.08] flex items-center justify-center text-[#7CB6D6]">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-widest text-sm text-[#E8ECF2]">ASTRA</span>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-white/[0.05] text-[#9AA4B2] border border-white/[0.06]">
                  EXP-64
                </span>
              </div>
              <p className="text-[10px] text-[#667085] tracking-wider uppercase">Autonomous Health Intelligence</p>
            </div>
          </div>

          <div className="hidden sm:block h-7 w-px bg-white/[0.08]" />

          {/* Mission Progress */}
          <div className="hidden sm:flex flex-col gap-1 min-w-[160px]">
            <div className="flex justify-between items-center text-[10px] font-mono">
              <span className="text-[#9AA4B2] tracking-wider uppercase">Mission Day 142 / 500</span>
              <span className="text-[#7CB6D6]">28.4%</span>
            </div>
            <div className="w-full bg-[#151A23] h-1.5 rounded-full overflow-hidden border border-white/[0.05]">
              <div
                className="bg-[#7CB6D6] h-full rounded-full transition-all duration-500"
                style={{ width: '28.4%' }}
              />
            </div>
          </div>
        </div>

        {/* Center: Environment & Earth Link Chips */}
        <div className="flex items-center gap-2.5">
          {/* Environment Selector Dropdown */}
          <div className="relative group">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#151A23] hover:bg-[#1B212C] border border-white/[0.08] text-xs text-[#E8ECF2] transition-colors">
              <CurrentEnvIcon className="w-3.5 h-3.5 text-[#7CB6D6]" />
              <span className="font-medium tracking-wide">{envConfig[environment].label}</span>
              <ChevronDown className="w-3 h-3 text-[#667085]" />
            </button>
            <div className="absolute left-0 mt-1.5 hidden group-hover:block w-44 rounded-lg bg-[#151A23] border border-white/[0.1] shadow-soft p-1 z-50">
              {(Object.keys(envConfig) as MissionEnvironment[]).map(env => {
                const Icon = envConfig[env].icon;
                return (
                  <button
                    key={env}
                    onClick={() => setEnvironment(env)}
                    className={`w-full text-left px-2.5 py-1.5 rounded text-xs flex items-center justify-between transition-colors ${
                      environment === env ? 'bg-[#7CB6D6]/20 text-[#7CB6D6]' : 'text-[#9AA4B2] hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5" />
                      <span>{envConfig[env].label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Earth Link Chip with Pending Sync Counter */}
          <div className="relative group">
            <button
              onClick={() => {
                // Cycle link state for quick test
                const nextState: Record<LinkState, LinkState> = {
                  connected: 'limited',
                  limited: 'down',
                  down: 'connected',
                };
                setLinkState(nextState[linkState]);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors ${linkConfig[linkState].color}`}
              title="Click to cycle link state (Connected -> Limited -> Down)"
            >
              <CurrentLinkIcon className="w-3.5 h-3.5" />
              <span className="font-medium">{linkConfig[linkState].label}</span>
              {pendingSyncCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-[#D8605B] text-white text-[10px] font-bold">
                  {pendingSyncCount} pending
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Right: Astronaut Selector & Simulator Controls */}
        <div className="flex items-center gap-3">
          {/* Astronaut Switcher & Identification */}
          <div className="flex items-center bg-[#151A23] p-1 rounded-xl border border-white/[0.08] gap-1">
            {onOpenIdentify && (
              <button
                onClick={onOpenIdentify}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#64D2FF]/10 hover:bg-[#64D2FF]/20 border border-[#64D2FF]/30 text-xs font-mono text-[#64D2FF] transition-all"
                title="Identify crew member or register new astronaut profile"
              >
                <User className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">Identify / Switch</span>
              </button>
            )}
            {crew.map(c => {
              const isActive = c.id === activeSubjectId;
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveSubject(c.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all ${
                    isActive
                      ? 'bg-[#1B212C] text-[#E8ECF2] shadow-sm border border-white/[0.1]'
                      : 'text-[#9AA4B2] hover:text-[#E8ECF2] hover:bg-white/[0.03]'
                  }`}
                  title={`${c.name} (${c.role})`}
                >
                  <span className="font-medium">{c.callsign}</span>
                  <StatusBadge level={c.status} showLabel={false} size="sm" />
                </button>
              );
            })}
          </div>

          {/* Simulator Toggle Button */}
          <button
            onClick={onOpenSimulator}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              simulatorOpen || isSimulating
                ? 'bg-[#8E8AB8]/20 border-[#8E8AB8]/40 text-[#8E8AB8]'
                : 'bg-[#151A23] hover:bg-[#1B212C] border-white/[0.08] text-[#9AA4B2] hover:text-[#E8ECF2]'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Telemetry Sim</span>
            {isSimulating && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#8E8AB8] animate-ping" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
