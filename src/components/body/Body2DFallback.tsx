import React from 'react';
import { BodyRegion, FindingLevel } from '../../api/types';

interface Body2DFallbackProps {
  hotspots: Array<{
    region: BodyRegion;
    label: string;
    level: FindingLevel;
    valueSnippet: string;
    unit?: string;
  }>;
  selectedRegion: BodyRegion | null;
  onSelectRegion: (region: BodyRegion) => void;
}

const STATUS_COLORS: Record<FindingLevel, string> = {
  normal: '#6FBF9B',
  watch: '#E0BE6A',
  review: '#E58F55',
  urgent: '#DE6A64',
};

export const Body2DFallback: React.FC<Body2DFallbackProps> = ({
  hotspots,
  selectedRegion,
  onSelectRegion,
}) => {
  const hotspotCoords: Record<string, { cx: number; cy: number }> = {
    head: { cx: 160, cy: 55 },
    eyes: { cx: 160, cy: 68 },
    lungs: { cx: 135, cy: 155 },
    heart: { cx: 185, cy: 155 },
    abdomen: { cx: 160, cy: 235 },
    skeleton: { cx: 160, cy: 300 },
    immune: { cx: 160, cy: 185 },
    arm: { cx: 85, cy: 190 },
    wrist: { cx: 60, cy: 260 },
    pelvis: { cx: 160, cy: 265 },
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center p-6">
      <svg
        viewBox="0 0 320 540"
        className="w-full max-w-[320px] h-full max-h-[580px] overflow-visible"
        aria-label="2D Anatomical Fallback Body Map"
      >
        <defs>
          <radialGradient id="nocturneBodyGlow" cx="50%" cy="40%" r="50%">
            <stop offset="0%" stopColor="#B8CCE6" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#06080C" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ambient Halo */}
        <circle cx="160" cy="240" r="150" fill="url(#nocturneBodyGlow)" />

        {/* Human Silhouette Blueprint */}
        <g fill="none" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="1">
          {/* Head & Neck */}
          <ellipse cx="160" cy="60" rx="28" ry="36" />
          <line x1="148" y1="96" x2="148" y2="118" />
          <line x1="172" y1="96" x2="172" y2="118" />

          {/* Torso & Ribcage contour */}
          <path d="M115 120 C125 116, 195 116, 205 120 L195 265 C185 275, 135 275, 125 265 Z" />
          
          {/* Arms */}
          <path d="M115 120 L80 180 L65 245" />
          <path d="M205 120 L240 180 L255 245" />

          {/* Spine indicator line */}
          <line x1="160" y1="118" x2="160" y2="265" strokeDasharray="3 4" stroke="rgba(255, 255, 255, 0.2)" />

          {/* Legs */}
          <path d="M135 272 L132 370 L130 470" />
          <path d="M185 272 L188 370 L190 470" />
        </g>

        {/* Hotspots */}
        {hotspots.map((h) => {
          const coords = hotspotCoords[h.region];
          if (!coords) return null;
          const isSelected = selectedRegion === h.region;
          const color = STATUS_COLORS[h.level];
          const isAbnormal = h.level !== 'normal';

          return (
            <g
              key={h.region}
              className="cursor-pointer group"
              onClick={() => onSelectRegion(h.region)}
            >
              {/* Pulsing ring for abnormal status */}
              {isAbnormal && (
                <circle
                  cx={coords.cx}
                  cy={coords.cy}
                  r="14"
                  fill="none"
                  stroke={color}
                  strokeWidth="1"
                  className="animate-signal-pulse"
                />
              )}

              {/* Selection Ring */}
              <circle
                cx={coords.cx}
                cy={coords.cy}
                r={isSelected ? '10' : '6'}
                fill="none"
                stroke={color}
                strokeWidth="1"
                opacity={isSelected ? 1 : 0.6}
              />

              {/* Center Dot */}
              <circle cx={coords.cx} cy={coords.cy} r="2.5" fill={color} />

              {/* Label */}
              <text
                x={coords.cx + 12}
                y={coords.cy + 4}
                fill="#ECE8E1"
                fontSize="10"
                fontFamily="'Geist Mono', monospace"
                className="opacity-70 group-hover:opacity-100 transition-opacity"
              >
                {h.valueSnippet}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Accessible Keyboard Hotspot List */}
      <div className="sr-only" role="region" aria-label="Anatomical Hotspots List">
        <ul>
          {hotspots.map((h) => (
            <li key={h.region}>
              <button onClick={() => onSelectRegion(h.region)}>
                {h.label}: {h.valueSnippet} ({h.level})
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
