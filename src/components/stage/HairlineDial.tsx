import React from 'react';
import { FindingLevel } from '../../api/types';

interface HairlineDialProps {
  label: string; // 3 words or fewer
  value: number;
  unit: string;
  min?: number;
  max?: number;
  level?: FindingLevel;
  size?: number; // default 52
}

const STATUS_COLORS: Record<FindingLevel, string> = {
  normal: '#6FBF9B',
  watch: '#E0BE6A',
  review: '#E58F55',
  urgent: '#DE6A64',
};

export const HairlineDial: React.FC<HairlineDialProps> = ({
  label,
  value,
  unit,
  min = 0,
  max = 100,
  level = 'normal',
  size = 52,
}) => {
  const signalColor = STATUS_COLORS[level];
  const radius = (size - 8) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  // Normalized fraction 0..1
  const fraction = Math.max(0, Math.min(1, (value - min) / (max - min || 1)));
  const strokeDashoffset = circumference * (1 - fraction);

  // Generate 12 perimeter tick marks
  const tickCount = 12;
  const ticks = Array.from({ length: tickCount }, (_, i) => {
    const angle = (i / tickCount) * 2 * Math.PI - Math.PI / 2;
    const rInner = radius + 2;
    const rOuter = radius + 5;
    return {
      x1: center + rInner * Math.cos(angle),
      y1: center + rInner * Math.sin(angle),
      x2: center + rOuter * Math.cos(angle),
      y2: center + rOuter * Math.sin(angle),
    };
  });

  return (
    <div className="flex flex-col items-center justify-center select-none">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full overflow-visible">
          {/* Tick marks around perimeter */}
          {ticks.map((t, i) => (
            <line
              key={i}
              x1={t.x1}
              y1={t.y1}
              x2={t.x2}
              y2={t.y2}
              stroke="rgba(255, 255, 255, 0.12)"
              strokeWidth="1"
            />
          ))}

          {/* Background track circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="1.25"
          />

          {/* Progress arc */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={signalColor}
            strokeWidth="1.25"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${center} ${center})`}
            style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.22, 1, 0.36, 1)' }}
          />

          {/* Center value */}
          <text
            x={center}
            y={center + 3}
            textAnchor="middle"
            fill="#ECE8E1"
            fontSize="11"
            fontFamily="'Geist Mono', monospace"
            fontWeight="300"
          >
            {value}
          </text>
        </svg>
      </div>

      <div className="flex items-center gap-1 mt-1 text-[9px] font-mono tracking-instrument text-[#8D97A6] uppercase">
        <span>{label}</span>
        <span className="text-[#5B6573]">{unit}</span>
      </div>
    </div>
  );
};
