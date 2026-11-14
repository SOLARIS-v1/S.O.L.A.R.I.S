import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ClipboardCheck, LineChart, AlertTriangle, ListTodo, Stethoscope, HelpCircle } from 'lucide-react';
import { useAstraStore } from '../../api/mockClient';

export const NavTabs: React.FC = () => {
  const { findings, activeSubjectId } = useAstraStore();
  const unackFindings = findings.filter(
    f => f.subject_id === activeSubjectId && f.status !== 'acknowledged' && f.level !== 'normal'
  ).length;

  const tabs = [
    { to: '/', label: 'COMMAND', icon: LayoutDashboard },
    { to: '/check-in', label: 'CHECK-IN', icon: ClipboardCheck },
    { to: '/assessments', label: 'RISK ASSESSMENTS', icon: HelpCircle },
    { to: '/analytics', label: 'ANALYTICS', icon: LineChart },
    {
      to: '/detection',
      label: 'DETECTION',
      icon: AlertTriangle,
      badge: unackFindings > 0 ? unackFindings : undefined,
    },
    { to: '/tasks', label: 'TASKS', icon: ListTodo },
    { to: '/medical', label: 'MEDICAL CONSOLE', icon: Stethoscope },
  ];

  return (
    <nav className="w-full border-b border-white/[0.07] bg-[#0A0D12]/70 px-4 lg:px-6">
      <div className="max-w-[1720px] mx-auto flex items-center gap-1 overflow-x-auto py-1 scrollbar-none">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold tracking-wider transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-[#151A23] text-[#7CB6D6] border border-[#7CB6D6]/30 shadow-sm'
                    : 'text-[#9AA4B2] hover:text-[#E8ECF2] hover:bg-white/[0.03]'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="px-1.5 py-0.2 rounded-full bg-[#E08A4F] text-white font-mono text-[10px] font-bold">
                  {tab.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
