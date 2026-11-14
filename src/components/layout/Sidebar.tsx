import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAstraStore } from '../../api/mockClient';
import {
  Home,
  Activity,
  Box,
  ClipboardList,
  BarChart3,
  Stethoscope,
  Globe,
  Settings,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface SidebarProps {
  onOpenIdentify: () => void;
  onOpenAssistant: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenIdentify, onOpenAssistant }) => {
  const { activeSubjectId, crew, findings } = useAstraStore();
  const activeAstronaut = crew.find(c => c.id === activeSubjectId) || crew[1];
  const unackFindings = findings.filter(
    f => f.subject_id === activeSubjectId && f.status !== 'acknowledged' && f.level !== 'normal'
  ).length;

  const navItems = [
    { to: '/', label: 'Mission Overview', icon: Home },
    { to: '/monitoring', label: 'Live Monitoring', icon: Activity },
    { to: '/body', label: 'Body Explorer', icon: Box },
    { to: '/assessment', label: 'Health Assessment', icon: ClipboardList },
    { to: '/analytics', label: 'Health Analytics', icon: BarChart3 },
    { to: '/medical', label: 'Medical Review', icon: Stethoscope },
    { to: '/environment', label: 'Mission Environment', icon: Globe },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 shrink-0 bg-[#FFFFFF] border-r border-[#E2E8F0] flex flex-col justify-between h-screen sticky top-0 z-30 select-none shadow-sm">
      <div>
        {/* Brand Header */}
        <div className="p-4 border-b border-[#E2E8F0] bg-[#FFFFFF]">
          <div className="flex items-center gap-3">
            {/* Delta Rocket Icon Logo (matches image) */}
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0284C7] to-[#0EA5E9] flex items-center justify-center text-white shadow-glowCyan shrink-0">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold tracking-wider text-base text-[#0F172A]">ASTRA</span>
              </div>
              <p className="text-[10px] font-mono text-[#64748B] tracking-tight">
                Astronaut Health Intelligence
              </p>
            </div>
          </div>
        </div>

        {/* Navigation List matching image */}
        <nav className="p-3 space-y-1.5 font-mono">
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-[#0EA5E9]/15 to-[#38BDF8]/5 text-[#0284C7] border border-[#0EA5E9]/40 font-bold shadow-sm'
                      : 'text-[#475569] hover:text-[#0F172A] hover:bg-[#F8FAFC] border border-transparent'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {item.to === '/medical' && unackFindings > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#EF4444] text-white font-bold">
                    {unackFindings}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom Status & Astronaut Profile Card (matches image bottom left) */}
      <div className="p-3 border-t border-[#E2E8F0] bg-[#F8FAFC] space-y-3 font-mono text-xs">
        {/* Sensor & AI Assistant Connection Indicators */}
        <div className="space-y-1.5 px-1 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] shadow-sm animate-pulse" />
            <span className="text-[#334155] font-medium">Connected (Sensors)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] shadow-sm" />
            <span className="text-[#334155] font-medium">AI Assistant (Online)</span>
          </div>
        </div>

        {/* Astronaut Profile Card */}
        <div
          onClick={onOpenIdentify}
          className="flex items-center justify-between p-2.5 rounded-xl bg-[#FFFFFF] border border-[#E2E8F0] hover:border-[#0EA5E9]/50 cursor-pointer transition-all shadow-sm group"
          title="Switch Astronaut Profile"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Space Helmet Avatar */}
            <div className="w-9 h-9 rounded-full bg-[#E0F2FE] border border-[#0EA5E9]/30 flex items-center justify-center text-[#0284C7] font-bold text-xs shrink-0 overflow-hidden shadow-inner">
              <svg className="w-5 h-5 text-[#0284C7]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7a5 5 0 0 1 5 5v1a5 5 0 0 1-10 0v-1a5 5 0 0 1 5-5z" />
              </svg>
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-[#64748B] uppercase block">Astronaut</span>
              <span className="text-xs font-bold text-[#0F172A] block truncate group-hover:text-[#0284C7]">
                {activeAstronaut.name}
              </span>
              <span className="text-[10px] text-[#94A3B8] block truncate">
                ID: {activeAstronaut.id.replace('ASTRA-', 'AST-')}
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#94A3B8] group-hover:text-[#0284C7] shrink-0" />
        </div>
      </div>
    </aside>
  );
};
