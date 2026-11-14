import React from 'react';
import { Finding } from '../../api/types';
import { StatusBadge } from '../common/StatusBadge';
import { AlertCircle, ChevronRight, Clock } from 'lucide-react';

interface FindingsTimelineStripProps {
  findings: Finding[];
  onSelectFinding: (finding: Finding) => void;
}

export const FindingsTimelineStrip: React.FC<FindingsTimelineStripProps> = ({
  findings,
  onSelectFinding,
}) => {
  const sortedFindings = [...findings].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="w-full rounded-xl bg-[#FFFFFF] border border-[#E2E8F0] p-3.5 flex flex-col gap-2 font-mono shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-[#0284C7]" />
          <span className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
            Findings Timeline Strip
          </span>
          <span className="text-[10px] text-[#64748B] px-1.5 py-0.2 rounded bg-[#F1F5F9] border border-[#E2E8F0]">
            {sortedFindings.length} Events Detected
          </span>
        </div>
        <span className="text-[10px] text-[#94A3B8] uppercase tracking-wider">
          Click event to inspect
        </span>
      </div>

      {/* Horizontal timeline scroll / list */}
      {sortedFindings.length === 0 ? (
        <div className="py-3 text-center text-xs text-[#64748B]">
          Nominal telemetry — No active findings recorded in window.
        </div>
      ) : (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none">
          {sortedFindings.map(f => {
            const dateStr = new Date(f.timestamp).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            });
            const isAck = f.status === 'acknowledged';

            return (
              <button
                key={f.id}
                onClick={() => onSelectFinding(f)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-left shrink-0 transition-all ${
                  isAck
                    ? 'bg-[#F8FAFC] border-[#E2E8F0] opacity-60 hover:opacity-100'
                    : 'bg-[#F0F9FF] border-[#BAE6FD] hover:border-[#0EA5E9]'
                }`}
              >
                <StatusBadge level={f.level} size="sm" showLabel={false} />

                <div className="flex flex-col">
                  <span className="text-xs font-medium text-[#0F172A] truncate max-w-[220px]">
                    {f.summary}
                  </span>
                  <div className="flex items-center gap-2 text-[10px] text-[#64748B]">
                    <span>{dateStr}</span>
                    <span>•</span>
                    <span className="font-semibold text-[#0284C7]">{f.observed_value}</span>
                  </div>
                </div>

                <ChevronRight className="w-3.5 h-3.5 text-[#94A3B8]" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
