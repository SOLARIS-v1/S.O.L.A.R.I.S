import React from 'react';
import { FindingLevel } from '../../api/types';

interface LeaderLineReadoutProps {
  label: string; // 3 words or fewer
  value: string | number;
  unit: string;
  level: FindingLevel;
  sparklineData?: number[];
  baselineMedian?: number;
  baselineMad?: number;
  side: 'left' | 'right';
  delta?: number;
  isSelected?: boolean;
  onSelect?: () => void;
}

const STATUS_COLORS: Record<FindingLevel, string> = {
  normal: '#6FBF9B',
  watch: '#E0BE6A',
  review: '#E58F55',
  urgent: '#DE6A64',
};

export const LeaderLineReadout: React.FC<LeaderLineReadoutProps> = ({
  label,
  value,
  unit,
  level,
  sparklineData = [],
  baselineMedian,
  baselineMad,
  side,
  delta,
  isSelected = false,
  onSelect,
}) => {
  const signalColor = STATUS_COLORS[level];

  // Generate lightweight SVG sparkline with baseline band
  const renderSparkline = () => {
    if (!sparklineData || sparklineData.length < 2) return null;

    const width = 80;
    const height = 22;
    const padding = 2;

    const minVal = Math.min(...sparklineData);
    const maxVal = Math.max(...sparklineData);
    const range = maxVal - minVal || 1;

    const getY = (val: number) =>
      height - padding - ((val - minVal) / range) * (height - padding * 2);

    const points = sparklineData
      .map((val, idx) => {
        const x = padding + (idx / (sparklineData.length - 1)) * (width - padding * 2);
        const y = getY(val);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

    // Area fill path
    const firstX = padding;
    const lastX = width - padding;
    const bottomY = height;
    const areaPath = `M ${firstX},${bottomY} L ${points} L ${lastX},${bottomY} Z`;

    // Baseline band coordinates (if available)
    let baselineTop = 0;
    let baselineHeight = 0;
    if (baselineMedian !== undefined && baselineMad !== undefined) {
      const bTop = getY(baselineMedian + baselineMad);
      const bBottom = getY(baselineMedian - baselineMad);
      baselineTop = Math.min(bTop, bBottom);
      baselineHeight = Math.max(Math.abs(bBottom - bTop), 2);
    }

    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-20 h-[22px] overflow-visible"
        aria-hidden="true"
      >
        {/* Baseline Band (shaded 8% opacity) */}
        {baselineHeight > 0 && (
          <rect
            x={padding}
            y={baselineTop}
            width={width - padding * 2}
            height={baselineHeight}
            fill="#B8CCE6"
            opacity="0.08"
          />
        )}

        {/* Shaded Area Fill (8% opacity) */}
        <path d={areaPath} fill="#B8CCE6" opacity="0.08" />

        {/* 1.25px Data Stroke */}
        <polyline
          fill="none"
          stroke="#ECE8E1"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
          opacity="0.85"
        />

        {/* Latest Reading Dot */}
        {sparklineData.length > 0 && (
          <circle
            cx={width - padding}
            cy={getY(sparklineData[sparklineData.length - 1])}
            r="1.8"
            fill={signalColor}
          />
        )}
      </svg>
    );
  };

  return (
    <div
      onClick={onSelect}
      className={`relative flex items-center gap-2 cursor-pointer transition-all duration-300 group py-1 select-none ${
        side === 'left' ? 'flex-row' : 'flex-row-reverse text-right'
      }`}
    >
      {/* Readout Content */}
      <div
        className={`flex flex-col transition-transform duration-300 ${
          isSelected ? 'scale-105' : 'group-hover:translate-y-[-1px]'
        }`}
      >
        {/* 11px uppercase label with 0.12em tracking */}
        <div
          className={`flex items-center gap-1.5 text-[10px] font-mono tracking-instrument text-[#8D97A6] uppercase ${
            side === 'right' ? 'justify-end' : 'justify-start'
          }`}
        >
          <span>{label}</span>
          {delta !== undefined && delta !== 0 && (
            <span
              className={`text-[9px] ${
                delta > 0 ? 'text-[#E0BE6A]' : 'text-[#6FBF9B]'
              }`}
            >
              {delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)}
            </span>
          )}
        </div>

        {/* Hero Numeral in Geist Mono with unit */}
        <div
          className={`flex items-baseline gap-1.5 my-0.5 ${
            side === 'right' ? 'justify-end' : 'justify-start'
          }`}
        >
          <span className="font-mono text-2xl lg:text-3xl font-light tracking-tight text-[#ECE8E1]">
            {value}
          </span>
          <span className="text-[11px] font-mono text-[#5B6573]">{unit}</span>
        </div>

        {/* Sparkline */}
        <div className={`mt-0.5 ${side === 'right' ? 'flex justify-end' : ''}`}>
          {renderSparkline()}
        </div>
      </div>

      {/* Elbow Scientific Leader Line with Signal Dot */}
      <div
        className={`relative flex items-center pointer-events-none ${
          side === 'left' ? 'w-12 lg:w-16' : 'w-12 lg:w-16 flex-row-reverse'
        }`}
      >
        <svg
          viewBox="0 0 60 20"
          className={`w-full h-5 overflow-visible ${
            side === 'right' ? 'scale-x-[-1]' : ''
          }`}
        >
          {/* Thin 1px Hairline Elbow Line */}
          <path
            d="M 0,10 L 38,10 L 52,10"
            fill="none"
            stroke="rgba(255, 255, 255, 0.12)"
            strokeWidth="1"
            className="animate-leader-draw"
          />

          {/* Line End Signal Dot (Status color ONLY on the line end dot) */}
          <circle
            cx="54"
            cy="10"
            r="2.5"
            fill={signalColor}
            style={{ filter: `drop-shadow(0 0 3px ${signalColor})` }}
          />
        </svg>
      </div>
    </div>
  );
};
