import React, { useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { BodyRegion, FindingLevel } from '../../api/types';
import { Activity, Eye, Heart, Wind, Flame, Bone, ShieldCheck, Waves } from 'lucide-react';

export interface HotspotData {
  id: string;
  region: BodyRegion;
  label: string;
  position: [number, number, number];
  cameraTarget: [number, number, number];
  cameraPosition: [number, number, number];
  level: FindingLevel;
  metricSnippet: string;
  unit?: string;
}

interface NocturneHotspotProps {
  hotspot: HotspotData;
  isSelected: boolean;
  onSelect: (hotspot: HotspotData) => void;
}

const STATUS_COLORS: Record<FindingLevel, string> = {
  normal: '#6FBF9B',
  watch: '#E0BE6A',
  review: '#E58F55',
  urgent: '#DE6A64',
};

const ICONS: Record<string, React.ElementType> = {
  head: Activity,
  eyes: Eye,
  heart: Heart,
  lungs: Wind,
  abdomen: Flame,
  skeleton: Bone,
  immune: ShieldCheck,
  arm: Waves,
  wrist: Waves,
  pelvis: Bone,
};

export const NocturneHotspot: React.FC<NocturneHotspotProps> = ({
  hotspot,
  isSelected,
  onSelect,
}) => {
  const [hovered, setHovered] = useState(false);
  const color = STATUS_COLORS[hotspot.level];
  const isAbnormal = hotspot.level !== 'normal';
  const IconComponent = ICONS[hotspot.region] || Activity;

  return (
    <group position={hotspot.position}>
      {/* 3D Interactive Point Target */}
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onSelect(hotspot);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
        visible={true}
      >
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* HTML Overlay Marker for crisp UI and accessibility */}
      <Html
        center
        distanceFactor={6}
        style={{
          pointerEvents: 'auto',
          transform: 'translate3d(-50%, -50%, 0)',
        }}
      >
        <div
          className="relative flex items-center justify-center cursor-pointer select-none group"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(hotspot);
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {/* Subtle Outer Halo Ring */}
          <div
            className={`w-6 h-6 rounded-full border transition-all duration-300 ${
              isAbnormal ? 'animate-signal-pulse' : ''
            }`}
            style={{
              borderColor: color,
              boxShadow: `0 0 10px ${color}33`,
              transform: isSelected || hovered ? 'scale(1.2)' : 'scale(1)',
            }}
          />

          {/* Central Point */}
          <div
            className="absolute w-2 h-2 rounded-full"
            style={{
              backgroundColor: color,
              boxShadow: `0 0 6px ${color}`,
            }}
          />

          {/* Compact Hover Chip (Icon, status mark, one number) */}
          {(hovered || isSelected) && (
            <div
              className="absolute left-7 top-1/2 -translate-y-1/2 flex items-center gap-2 px-2.5 py-1 rounded bg-[#0B1017]/90 backdrop-blur-md border border-white/10 whitespace-nowrap shadow-xl transition-all duration-200 z-50 pointer-events-none"
            >
              <IconComponent className="w-3.5 h-3.5" style={{ color }} strokeWidth={1.25} />
              <div className="flex items-baseline gap-1.5 font-mono text-xs">
                <span className="text-[#ECE8E1] font-medium tracking-wide">
                  {hotspot.metricSnippet}
                </span>
                {hotspot.unit && (
                  <span className="text-[#8D97A6] text-[10px]">{hotspot.unit}</span>
                )}
              </div>
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: color }}
              />
            </div>
          )}
        </div>
      </Html>
    </group>
  );
};
