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
      className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[#0B1017]/95 backdrop-blur-xl border-l border-white/10 flex flex-col overflow-hidden animate-in slide-in-from-right duration-300 font-sans text-[#ECE8E1] select-none"
      aria-label="NASA Spaceflight Hazard Drawer"
    >
      {/* Header */}
      <div className="p-4 hairline-b flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ShieldAlert className="w-4 h-4 text-[#E0BE6A]" strokeWidth={1.25} />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/5 border border-white/10 text-[#B8CCE6]">
                {hazard.code}
              </span>
              <h2 className="text-xs font-mono tracking-instrument text-[#ECE8E1] font-medium uppercase">
                {hazard.name}
              </h2>
            </div>
            <span className="text-[10px] font-mono text-[#5B6573] uppercase">
              NASA HUMAN RESEARCH PROGRAM
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded text-[#8D97A6] hover:text-[#ECE8E1] hover:bg-white/5 transition-colors"
          title="Close drawer"
        >
          <X className="w-4 h-4" strokeWidth={1.25} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Description */}
        <div className="p-3.5 rounded bg-white/[0.02] border border-white/5 space-y-1">
          <span className="text-[10px] font-mono tracking-instrument text-[#5B6573] uppercase">
            OPERATIONAL HAZARD OVERVIEW
          </span>
          <p className="text-xs text-[#8D97A6] leading-relaxed">
            {hazard.description}
          </p>
        </div>

        {/* Preventative Focus */}
        <div className="p-3.5 rounded bg-white/[0.02] border border-white/5 space-y-1">
          <span className="text-[10px] font-mono tracking-instrument text-[#5B6573] uppercase">
            PRIMARY MITIGATION FOCUS
          </span>
          <p className="text-xs text-[#ECE8E1] leading-relaxed">
            {hazard.preventive_focus}
          </p>
        </div>

        {/* Operational Guidance */}
        <div className="p-3.5 rounded bg-white/[0.02] border border-white/5 space-y-1">
          <span className="text-[10px] font-mono tracking-instrument text-[#5B6573] uppercase">
            HRP COUNTERMEASURES
          </span>
          <p className="text-xs text-[#8D97A6] leading-relaxed">
            {hazard.mitigation_guidance}
          </p>
        </div>

        {/* Monitored Indicators */}
        <div className="space-y-2">
          <span className="text-[10px] font-mono tracking-instrument text-[#5B6573] uppercase">
            WATCHED INDICATORS
          </span>
          <div className="flex flex-wrap gap-1.5">
            {hazard.indicators_watched.map((ind) => {
              const meta = INDICATOR_THRESHOLDS[ind];
              return (
                <span
                  key={ind}
                  className="px-2 py-1 rounded bg-white/[0.03] border border-white/5 text-[11px] font-mono text-[#B8CCE6]"
                >
                  {meta?.label || ind}
                </span>
              );
            })}
          </div>
        </div>

        {/* Scientific Citation */}
        <div className="p-3 rounded bg-white/[0.02] border border-white/5 space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#5B6573] uppercase">
            <BookOpen className="w-3 h-3 text-[#B8CCE6]" strokeWidth={1.25} />
            <span>STANDARDS & EVIDENCE</span>
          </div>
          <p className="text-[11px] font-mono text-[#8D97A6]">
            {hazard.citation}
          </p>
        </div>
      </div>

      <div className="p-4 hairline-t text-[10px] font-mono text-[#5B6573]">
        Prototype decision support, not a medical device.
      </div>
    </aside>
  );
};
