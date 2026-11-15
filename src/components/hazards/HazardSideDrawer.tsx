import React from 'react';
import { HealthRecord } from '../../api/types';
import { NASA_HAZARDS } from '../../data/hazards';
import { INDICATOR_THRESHOLDS } from '../../data/thresholds';
import { X, ShieldAlert, BookOpen } from 'lucide-react';

interface HazardSideDrawerProps {
  hazardId: string | null;
  records: HealthRecord[];
  onClose: () => void;
}

export const HazardSideDrawer: React.FC<HazardSideDrawerProps> = ({
  hazardId,
  records,
  onClose,
}) => {
  if (!hazardId) return null;

  const hazard = NASA_HAZARDS.find((h) => h.id === hazardId);
  if (!hazard) return null;

  return (
    <aside
      className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white/95 backdrop-blur-xl border-l border-slate-200/80 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300 font-sans text-slate-800 select-none"
      aria-label="NASA Spaceflight Hazard Drawer"
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-600" strokeWidth={1.5} />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold">
                {hazard.code}
              </span>
              <h2 className="text-xs font-mono tracking-wider text-slate-900 font-bold uppercase">
                {hazard.name}
              </h2>
            </div>
            <span className="text-[10px] font-mono text-slate-500 uppercase font-semibold">
              NASA HUMAN RESEARCH PROGRAM
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          title="Close drawer"
        >
          <X className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Description */}
        <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1 shadow-sm">
          <span className="text-[10px] font-mono text-slate-500 uppercase font-semibold tracking-wider block">
            OPERATIONAL HAZARD OVERVIEW
          </span>
          <p className="text-xs text-slate-700 leading-relaxed">
            {hazard.description}
          </p>
        </div>

        {/* Preventative Focus */}
        <div className="p-3.5 rounded-lg bg-indigo-50/50 border border-indigo-100 space-y-1 shadow-sm">
          <span className="text-[10px] font-mono text-indigo-700 uppercase font-semibold tracking-wider block">
            PRIMARY MITIGATION FOCUS
          </span>
          <p className="text-xs text-slate-800 leading-relaxed font-medium">
            {hazard.preventive_focus}
          </p>
        </div>

        {/* Operational Guidance */}
        <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1 shadow-sm">
          <span className="text-[10px] font-mono text-slate-500 uppercase font-semibold tracking-wider block">
            HRP COUNTERMEASURES
          </span>
          <p className="text-xs text-slate-700 leading-relaxed">
            {hazard.mitigation_guidance}
          </p>
        </div>

        {/* Monitored Indicators */}
        <div className="space-y-2">
          <span className="text-[10px] font-mono text-slate-500 uppercase font-semibold tracking-wider block">
            WATCHED INDICATORS
          </span>
          <div className="flex flex-wrap gap-1.5">
            {hazard.indicators_watched.map((ind) => {
              const meta = INDICATOR_THRESHOLDS[ind];
              return (
                <span
                  key={ind}
                  className="px-2 py-1 rounded bg-white border border-slate-200 text-[11px] font-mono text-slate-700 shadow-sm font-medium"
                >
                  {meta?.label || ind}
                </span>
              );
            })}
          </div>
        </div>

        {/* Scientific Citation */}
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1 shadow-sm">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500 uppercase font-semibold">
            <BookOpen className="w-3 h-3 text-indigo-600" strokeWidth={1.5} />
            <span>STANDARDS & EVIDENCE</span>
          </div>
          <p className="text-[11px] font-mono text-slate-600">
            {hazard.citation}
          </p>
        </div>
      </div>

      <div className="p-4 border-t border-slate-200/80 text-[10px] font-mono text-slate-500">
        Prototype decision support, not a medical device.
      </div>
    </aside>
  );
};
