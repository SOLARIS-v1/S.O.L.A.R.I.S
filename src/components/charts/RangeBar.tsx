import React from 'react';
import { STATUS_LABEL, type Status } from '../../data/solarisFormat';

interface RangeBarProps {
  value: number;
  ok: [number, number];
  watch?: [number, number];
  axis?: [number, number];
  status: Status;
  unit: string;
  baseline?: number | null;
}

export const RangeBar: React.FC<RangeBarProps> = ({
  value,
  ok,
  watch = [ok[0] * 0.85, ok[1] * 1.15],
  axis = [Math.min(ok[0] * 0.7, value * 0.9), Math.max(ok[1] * 1.3, value * 1.1)],
  status,
  unit,
  baseline,
}) => {
  const a0 = Math.min(axis[0], value, watch[0]);
  const a1 = Math.max(axis[1], value, watch[1]);
  const span = a1 - a0 || 1;
  const pct = (v: number) => Math.max(0, Math.min(100, ((v - a0) / span) * 100));

  const valPct = pct(value);
  const basePct = baseline !== undefined && baseline !== null ? pct(baseline) : null;

  const normalText = `Nominal range: ${ok[0]} – ${ok[1]} ${unit}`;

  const statusColor = status === 'ok' ? '#6FBF9B' : status === 'watch' ? '#E0BE6A' : '#DE6A64';

  return (
    <div className="w-full py-2 select-none" role="img" aria-label={`Reading ${value} ${unit}, status ${STATUS_LABEL[status]}`}>
      <div className="relative h-6 flex items-center">
        {/* Track */}
        <div className="absolute inset-x-0 h-2 rounded-full overflow-hidden flex bg-white/[0.06] border border-white/10">
          {/* Below watch */}
          <div style={{ width: `${pct(watch[0])}%` }} className="bg-[#DE6A64]/30" />
          {/* Lower watch */}
          <div style={{ width: `${pct(ok[0]) - pct(watch[0])}%` }} className="bg-[#E0BE6A]/40" />
          {/* Nominal */}
          <div style={{ width: `${pct(ok[1]) - pct(ok[0])}%` }} className="bg-[#6FBF9B]/60" />
          {/* Upper watch */}
          <div style={{ width: `${pct(watch[1]) - pct(ok[1])}%` }} className="bg-[#E0BE6A]/40" />
          {/* Above watch */}
          <div style={{ width: `${100 - pct(watch[1])}%` }} className="bg-[#DE6A64]/30" />
        </div>

        {/* Baseline marker if available */}
        {basePct !== null && (
          <div
            title={`Baseline: ${baseline} ${unit}`}
            className="absolute top-1/2 -translate-y-1/2 w-0.5 h-4 bg-[#8D97A6] rounded z-10"
            style={{ left: `${basePct}%` }}
          />
        )}

        {/* Current Value Indicator Marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center z-20 transition-all duration-300"
          style={{ left: `${valPct}%` }}
        >
          <div
            className="w-3.5 h-3.5 rounded-full border-2 border-[#0B1017] shadow-lg animate-pulse"
            style={{ backgroundColor: statusColor, boxShadow: `0 0 10px ${statusColor}` }}
          />
        </div>
      </div>

      <div className="flex justify-between items-center text-[10px] font-mono text-[#8D97A6] mt-1">
        <span>{normalText}</span>
        {baseline !== undefined && baseline !== null && <span>Baseline: {baseline} {unit}</span>}
      </div>
    </div>
  );
};
