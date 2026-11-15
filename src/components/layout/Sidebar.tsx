import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAstraStore } from '../../api/mockClient';
import { useAstra } from '../../context/AstraContext';
import {
  Compass,
  Activity,
  Box,
  ClipboardList,
  Gauge,
  BarChart3,
  Dumbbell,
  Stethoscope,
  Globe,
  Settings,
  ChevronRight,
  ChevronLeft,
  ShieldAlert,
  Radio,
  Cpu,
  User,
} from 'lucide-react';

interface SidebarProps {
  onOpenIdentify?: () => void;
  onOpenAssistant?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onOpenIdentify,
  onOpenAssistant,
  collapsed = false,
  onToggleCollapse,
  className = '',
}) => {
  const location = useLocation();
  const { activeSubjectId, crew, findings } = useAstraStore();
  const { activeCrew, backendOnline, isMicActive } = useAstra();

  // Find active crew member from store or context
  const storeCrew = crew.find((c) => c.id === activeSubjectId) || crew[0];
  const displayName = activeCrew?.name || storeCrew?.name || 'Commander Vance';
  const displayCallsign = activeCrew?.callsign || storeCrew?.callsign || 'VALKYRIE';

  const unackFindings = findings.filter(
    (f) =>
      f.subject_id === activeSubjectId &&
      f.status !== 'acknowledged' &&
      f.level !== 'normal'
  ).length;

  const customNavItems = [
    {
      to: '/',
      altMatches: ['/overview', '/stage'],
      label: 'Dashboard',
      shortLabel: 'Overview',
      icon: Compass,
    },
    {
      to: '/monitoring',
      altMatches: ['/health-monitoring'],
      label: 'Telemetry',
      shortLabel: 'Monitoring',
      icon: Activity,
    },
    {
      to: '/body',
      altMatches: ['/explorer', '/anatomy'],
      label: 'Patients & Body',
      shortLabel: 'Explorer',
      icon: Box,
    },
    {
      to: '/check-in',
      altMatches: ['/assessment'],
      label: 'Assessments',
      shortLabel: 'Assessment',
      icon: ClipboardList,
    },
    {
      to: '/analytics',
      altMatches: ['/analysis'],
      label: 'Reports & Trends',
      shortLabel: 'Analytics',
      icon: BarChart3,
    },
  ];

  const componentsNavItems = [
    {
      to: '/measure',
      altMatches: ['/measure/'],
      label: 'Diagnostics Lab',
      shortLabel: 'Measurement',
      icon: Gauge,
    },
    {
      to: '/exercise',
      altMatches: ['/routine'],
      label: 'Countermeasures',
      shortLabel: 'Exercise',
      icon: Dumbbell,
    },
    {
      to: '/medical',
      altMatches: ['/review', '/clinical'],
      label: 'Flight Surgeon Review',
      shortLabel: 'Medical',
      icon: Stethoscope,
      badge: unackFindings > 0 ? unackFindings : undefined,
    },
    {
      to: '/environment',
      altMatches: ['/habitat'],
      label: 'Mission Habitat',
      shortLabel: 'Environment',
      icon: Globe,
    },
    {
      to: '/settings',
      altMatches: ['/config'],
      label: 'Settings & System',
      shortLabel: 'Settings',
      icon: Settings,
    },
  ];

  const isItemActive = (to: string, altMatches?: string[]) => {
    if (location.pathname === to) return true;
    if (to === '/' && (location.pathname === '' || location.pathname === '/stage' || location.pathname === '/overview')) {
      return true;
    }
    if (altMatches && altMatches.some((m) => location.pathname.startsWith(m))) {
      return true;
    }
    if (to !== '/' && location.pathname.startsWith(to)) {
      return true;
    }
    return false;
  };

  return (
    <aside
      className={`h-screen sticky top-0 z-30 select-none flex flex-col justify-between transition-all duration-300 ease-in-out shrink-0 ${
        collapsed ? 'w-20' : 'w-64'
      } bg-white border-r border-slate-200/80 text-slate-800 font-sans ${className}`}
      aria-label="Solaris Mission Navigation"
    >
      {/* Top Header & Brand Identity */}
      <div className="flex flex-col">
        <div
          className={`border-b border-slate-100 bg-white/95 backdrop-blur-md transition-all ${
            collapsed ? 'p-3 flex flex-col items-center' : 'px-5 py-4'
          }`}
        >
          <div className="flex items-center justify-between">
            <NavLink
              to="/"
              className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg p-0.5"
              title="SOLARIS — Mission Home"
            >
              {/* Mission Patch / Official Solaris Logo */}
              <img
                src="/solaris-logo.png"
                alt="SOLARIS Mission Logo"
                className="w-10 h-10 rounded-xl object-cover shrink-0 border border-slate-200 shadow-sm group-hover:scale-105 transition-transform"
              />

              {!collapsed && (
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold tracking-tight text-base text-slate-900 group-hover:text-indigo-600 transition-colors">
                      SOLARIS
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200/60 font-semibold">
                      CLINICAL
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 tracking-tight truncate font-medium">
                    Dr. Vance / Medical Ops
                  </p>
                </div>
              )}
            </NavLink>

            {/* Collapse / Expand Toggle Button */}
            {onToggleCollapse && !collapsed && (
              <button
                onClick={onToggleCollapse}
                aria-label="Collapse sidebar"
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                title="Collapse sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Navigation Categories */}
        <nav
          className="px-3 py-3 space-y-4 text-xs overflow-y-auto max-h-[calc(100vh-210px)] scrollbar-thin"
          role="navigation"
          aria-label="Main Navigation"
        >
          {/* Section 1: CUSTOM */}
          <div>
            {!collapsed && (
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider px-3 mb-1.5 block">
                CUSTOM
              </span>
            )}
            <div className="space-y-1">
              {customNavItems.map((item) => {
                const Icon = item.icon;
                const active = isItemActive(item.to, item.altMatches);
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    title={collapsed ? item.label : undefined}
                    className={`flex items-center justify-between rounded-xl transition-all duration-150 group focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                      collapsed ? 'px-2.5 py-2.5 justify-center' : 'px-3 py-2.5'
                    } ${
                      active
                        ? 'bg-indigo-50/80 text-indigo-600 font-semibold shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          active ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'
                        }`}
                      />
                      {!collapsed && <span className="truncate text-xs">{item.label}</span>}
                    </div>

                    {!collapsed && (
                      <ChevronRight
                        className={`w-3.5 h-3.5 transition-colors ${
                          active ? 'text-indigo-600' : 'text-slate-300 group-hover:text-slate-400'
                        }`}
                      />
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>

          {/* Section 2: COMPONENTS */}
          <div>
            {!collapsed && (
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider px-3 mb-1.5 block">
                COMPONENTS
              </span>
            )}
            <div className="space-y-1">
              {componentsNavItems.map((item) => {
                const Icon = item.icon;
                const active = isItemActive(item.to, item.altMatches);
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    title={collapsed ? item.label : undefined}
                    className={`flex items-center justify-between rounded-xl transition-all duration-150 group focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                      collapsed ? 'px-2.5 py-2.5 justify-center' : 'px-3 py-2.5'
                    } ${
                      active
                        ? 'bg-indigo-50/80 text-indigo-600 font-semibold shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          active ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'
                        }`}
                      />
                      {!collapsed && <span className="truncate text-xs">{item.label}</span>}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {!collapsed && item.badge !== undefined && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500 text-white font-bold">
                          {item.badge}
                        </span>
                      )}
                      {!collapsed && (
                        <ChevronRight
                          className={`w-3.5 h-3.5 transition-colors ${
                            active ? 'text-indigo-600' : 'text-slate-300 group-hover:text-slate-400'
                          }`}
                        />
                      )}
                    </div>
                  </NavLink>
                );
              })}
            </div>
          </div>
        </nav>
      </div>

      {/* Bottom Section: Profile Card in Neumorphic Style */}
      <div className="p-3 border-t border-slate-100 bg-[#F8FAFC]">
        <div
          onClick={onOpenIdentify}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onOpenIdentify?.();
            }
          }}
          className={`flex items-center justify-between rounded-xl bg-white border border-slate-200/80 hover:border-indigo-300 hover:shadow-sm cursor-pointer transition-all duration-200 group focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
            collapsed ? 'p-2 justify-center' : 'p-2.5'
          }`}
          title="Switch Astronaut Profile"
        >
          <div className={`flex items-center gap-2.5 min-w-0 ${collapsed ? 'justify-center' : ''}`}>
            {/* Astronaut Avatar / Patch */}
            <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 font-bold text-xs shrink-0 shadow-sm">
              <User className="w-4 h-4 text-indigo-600" />
            </div>

            {!collapsed && (
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-semibold">
                    PATIENT / CREW
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                </div>
                <span className="text-xs font-bold text-slate-800 block truncate group-hover:text-indigo-600 transition-colors">
                  {displayName}
                </span>
                <span className="text-[10px] text-slate-500 font-mono block truncate">
                  {displayCallsign}
                </span>
              </div>
            )}
          </div>

          {!collapsed && (
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-transform group-hover:translate-x-0.5 shrink-0" />
          )}
        </div>

        {/* Expand button when collapsed */}
        {collapsed && onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            aria-label="Expand sidebar"
            className="w-full py-1 flex items-center justify-center rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[#8D97A6] hover:text-[#EDECE8] transition-colors"
            title="Expand sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
};
export default Sidebar;
