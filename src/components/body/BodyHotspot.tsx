import React, { useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { BodyRegion, FindingLevel } from '../../api/types';
import { StatusBadge } from '../common/StatusBadge';

interface BodyHotspotProps {
  region: BodyRegion;
  label: string;
  position: [number, number, number];
  level: FindingLevel;
  valueSnippet: string;
  isHovered: boolean;
  onHover: (region: BodyRegion | null) => void;
  onClick: (region: BodyRegion, pos: [number, number, number]) => void;
}

export const BodyHotspot: React.FC<BodyHotspotProps> = ({
  region,
  label,
  position,
  level,
  valueSnippet,
  isHovered,
  onHover,
  onClick,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const [internalHover, setInternalHover] = useState(false);

  const colors = {
    normal: '#5FB38A',
    watch: '#D9B35F',
    review: '#E08A4F',
    urgent: '#D8605B',
  };

  const statusColor = colors[level];
  const isAbnormal = level !== 'normal';

  // 2.5s slow pulse for abnormal states
  useFrame((state) => {
    if (ringRef.current && isAbnormal) {
      const t = state.clock.getElapsedTime();
      // Period is 2.5 seconds: frequency = 2*PI / 2.5 approx 2.513 rad/s
      const pulse = (Math.sin(t * 2.513) + 1) / 2; // 0 to 1
      const scale = 1.0 + pulse * 0.45;
      ringRef.current.scale.set(scale, scale, scale);
      if (ringRef.current.material instanceof THREE.MeshBasicMaterial) {
        ringRef.current.material.opacity = 0.85 - pulse * 0.4;
      }
    }
  });

  const active = isHovered || internalHover;

  return (
    <group position={position}>
      {/* Outer pulsing ring for attention */}
      {isAbnormal && (
        <mesh ref={ringRef} rotation={[0, 0, 0]}>
          <ringGeometry args={[0.024, 0.032, 24]} />
          <meshBasicMaterial
            color={statusColor}
            transparent
            opacity={0.8}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Core clickable target */}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick(region, position);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setInternalHover(true);
          onHover(region);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setInternalHover(false);
          onHover(null);
          document.body.style.cursor = 'auto';
        }}
      >
        <circleGeometry args={[active ? 0.022 : 0.016, 24]} />
        <meshBasicMaterial
          color={statusColor}
          transparent
          opacity={active ? 1.0 : 0.85}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Floating Compact Chip on Hover */}
      {active && (
        <Html distanceFactor={4} position={[0.04, 0.03, 0]} style={{ pointerEvents: 'none' }}>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FFFFFF]/95 border border-[#CBD5E1] shadow-md whitespace-nowrap backdrop-blur-sm -translate-y-1/2">
            <StatusBadge level={level} showLabel={false} size="sm" />
            <span className="text-[11px] font-bold text-[#0F172A] uppercase tracking-wider">
              {label}
            </span>
            <span className="text-[11px] font-mono font-bold text-[#0284C7]">
              {valueSnippet}
            </span>
          </div>
        </Html>
      )}
    </group>
  );
};
