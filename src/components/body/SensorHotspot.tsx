import React, { useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { WearableSensor, FindingLevel } from '../../api/types';
import { Radio, Activity, Cpu } from 'lucide-react';

interface SensorHotspotProps {
  sensor: WearableSensor;
  position: [number, number, number];
  level: FindingLevel;
  valueSnippet: string;
  isHovered: boolean;
  onHover: (sensorId: string | null) => void;
  onClick: (sensor: WearableSensor, pos: [number, number, number]) => void;
}

export const SensorHotspot: React.FC<SensorHotspotProps> = ({
  sensor,
  position,
  level,
  valueSnippet,
  isHovered,
  onHover,
  onClick,
}) => {
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

  // 2.5s slow pulse
  useFrame((state) => {
    if (ringRef.current) {
      const t = state.clock.getElapsedTime();
      const pulse = (Math.sin(t * (isAbnormal ? 3.0 : 1.8)) + 1) / 2;
      const scale = 1.0 + pulse * (isAbnormal ? 0.45 : 0.25);
      ringRef.current.scale.set(scale, scale, scale);
      if (ringRef.current.material instanceof THREE.MeshBasicMaterial) {
        ringRef.current.material.opacity = (isAbnormal ? 0.9 : 0.6) - pulse * 0.35;
      }
    }
  });

  const active = isHovered || internalHover;

  return (
    <group position={position}>
      {/* Outer telemetry sensor beacon ring */}
      <mesh ref={ringRef} rotation={[0, 0, 0]}>
        <ringGeometry args={[0.020, 0.028, 24]} />
        <meshBasicMaterial
          color={statusColor}
          transparent
          opacity={0.7}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Sensor hardware dot core */}
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onClick(sensor, position);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setInternalHover(true);
          onHover(sensor.id);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setInternalHover(false);
          onHover(null);
          document.body.style.cursor = 'auto';
        }}
      >
        <circleGeometry args={[active ? 0.019 : 0.014, 24]} />
        <meshBasicMaterial
          color={statusColor}
          transparent
          opacity={active ? 1.0 : 0.9}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Floating Sensor Hardware HUD Card */}
      {active && (
        <Html distanceFactor={4} position={[0.04, 0.02, 0]} style={{ pointerEvents: 'none' }}>
          <div className="flex flex-col gap-1 p-2.5 rounded-xl bg-[#FFFFFF]/95 border border-[#E2E8F0] shadow-xl whitespace-nowrap backdrop-blur-md -translate-y-1/2">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-[#0EA5E9]/15 text-[#0284C7] border border-[#0EA5E9]/30">
                {sensor.code}
              </span>
              <span className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                {sensor.name}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 pt-1 border-t border-[#E2E8F0] text-[10px] font-mono">
              <span className="text-[#64748B] flex items-center gap-1">
                <Cpu className="w-3 h-3 text-[#0EA5E9]" />
                {sensor.anatomical_site}
              </span>
              <span className="font-bold text-[#0284C7]">
                {valueSnippet}
              </span>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
};
