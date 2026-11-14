import React from 'react';
import { IndicatorType, HealthRecord } from '../../api/types';
import { INDICATOR_THRESHOLDS } from '../../data/thresholds';
import { computeBaseline, computeRobustZScore } from '../../mock/engine';
import { StatusBadge } from '../common/StatusBadge';
import { SimulatedBadge } from '../common/SimulatedBadge';
import { ArrowUpRight, ArrowDownRight, Minus, Info } from 'lucide-react';

interface IndicatorTileProps {
  indicator: IndicatorType;
  records: HealthRecord[];
  onSelect?: () => void;
  onInfoClick?: (e: React.MouseEvent) => void;
  isSelected?: boolean;
}

export const IndicatorTile: React.FC<IndicatorTileProps> = ({
  indicator,
  records,
  onSelect,
  onInfoClick,
  isSelected = false,
}) => {
  const threshold = INDICATOR_THRESHOLDS[indicator];
  const history = records
    .filter(r => r.type === indicator && r.quality === 'ok')
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const latest = history[history.length - 1];
  const baseline = computeBaseline(records, indicator);
  const currentVal = latest ? latest.value : threshold.default_baseline;
  const isSim = latest ? latest.is_simulated : true;

  // Calculate delta vs personal baseline
  const diff = currentVal - baseline.median;
  const zScore = computeRobustZScore(currentVal, baseline);

  // Determine status level
  let level: 'normal' | 'watch' | 'review' | 'urgent' = 'normal';
  if (threshold.urgent_low !== undefined && currentVal <= threshold.urgent_low) level = 'urgent';
  else if (threshold.urgent_high !== undefined && currentVal >= threshold.urgent_high) level = 'urgent';
  else if (Math.abs(zScore) >= 3.0) level = 'review';
  else if (Math.abs(zScore) >= 2.0) level = 'watch';

  // 14-day sparkline coordinates
  const sparkPoints = history.slice(-14).map(r => r.value);
  const points = sparkPoints.length >= 2 ? sparkPoints : [baseline.median, currentVal];

  const svgWidth = 140;
  const svgHeight = 36;
  const padding = 4;

  const minVal = Math.min(...points, baseline.median - baseline.mad * 2);
  const maxVal = Math.max(...points, baseline.median + baseline.mad * 2);
  const range = maxVal - minVal || 1;

  const getY = (val: number) => {
    return svgHeight - padding - ((val - minVal) / range) * (svgHeight - padding * 2);
  };

  const getX = (idx: number) => {
    return padding + (idx / (points.length - 1)) * (svgWidth - padding * 2);
  };

  const bandTopY = getY(baseline.median + baseline.mad);
  const bandBottomY = getY(baseline.median - baseline.mad);
  const bandHeight = Math.max(2, bandBottomY - bandTopY);

  const linePath = points
    .map((val, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(idx).toFixed(1)} ${getY(val).toFixed(1)}`)
    .join(' ');

  const strokeColor = {
    normal: '#10B981',
    watch: '#F59E0B',
    review: '#F59E0B',
    urgent: '#EF4444',
  }[level];

  const deltaPrecision = indicator === 'temperature' || indicator === 'sleep' ? 1 : 0;
  const deltaText = `${diff > 0 ? '+' : ''}${diff.toFixed(deltaPrecision)} ${threshold.unit}`;

  return (
    <div
      onClick={onSelect}
      className={`group relative rounded-xl bg-[#FFFFFF] p-3.5 border transition-all cursor-pointer font-mono shadow-sm ${
        isSelected
          ? 'border-[#0EA5E9] ring-2 ring-[#0EA5E9]/20 bg-[#F0F9FF]'
          : 'border-[#E2E8F0] hover:border-[#CBD5E1] hover:bg-[#F8FAFC]'
      }`}
    >
      {/* Top Row: Label & Status Mark */}
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#475569] truncate">
            {threshold.label}
          </span>
          {isSim && <SimulatedBadge size="sm" />}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={e => {
              e.stopPropagation();
              onInfoClick?.(e);
            }}
            className="p-1 rounded hover:bg-[#E2E8F0] text-[#94A3B8] hover:text-[#0F172A] transition-colors"
            title="How to measure & threshold guidance"
          >
            <Info className="w-3 h-3" />
          </button>
          <StatusBadge level={level} showLabel={false} size="sm" />
        </div>
      </div>

      {/* Middle Row: Big Tabular Value & Delta */}
      <div className="flex items-baseline justify-between gap-2 my-1">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[30px] leading-none font-bold tabular-nums text-[#0F172A]">
            {currentVal}
          </span>
          <span className="text-xs font-mono text-[#64748B]">{threshold.unit}</span>
        </div>

        {/* Delta arrow vs personal baseline */}
        <div
          className={`flex items-center text-xs font-mono font-medium ${
            Math.abs(diff) < 0.1
              ? 'text-[#64748B]'
              : diff > 0
              ? 'text-[#D97706]'
              : 'text-[#0284C7]'
          }`}
          title={`Baseline: ${baseline.median} ${threshold.unit}`}
        >
          {Math.abs(diff) < 0.1 ? (
            <Minus className="w-3.5 h-3.5 mr-0.5" />
          ) : diff > 0 ? (
            <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
          ) : (
            <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
          )}
          <span>{deltaText}</span>
        </div>
      </div>

      {/* Bottom Row: 14-day Sparkline with Baseline Band */}
      <div className="mt-2 pt-1 border-t border-[#F1F5F9] flex items-center justify-between">
        <span className="text-[10px] font-mono text-[#94A3B8]">14d trend</span>

        <svg width={svgWidth} height={svgHeight} className="overflow-visible">
          {/* Baseline band */}
          <rect
            x={padding}
            y={Math.max(0, bandTopY)}
            width={svgWidth - padding * 2}
            height={bandHeight}
            fill="#0EA5E9"
            fillOpacity={0.12}
            rx={2}
          />
          {/* Median baseline line */}
          <line
            x1={padding}
            y1={getY(baseline.median)}
            x2={svgWidth - padding}
            y2={getY(baseline.median)}
            stroke="#94A3B8"
            strokeDasharray="2 2"
            strokeWidth={1}
          />
          {/* 14-day trend line */}
          <path
            d={linePath}
            fill="none"
            stroke={strokeColor}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Latest value dot */}
          <circle
            cx={getX(points.length - 1)}
            cy={getY(currentVal)}
            r={2.5}
            fill={strokeColor}
          />
        </svg>
      </div>
    </div>
  );
};
