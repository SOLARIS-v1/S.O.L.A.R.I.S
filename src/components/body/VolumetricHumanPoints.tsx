import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { generateHumanPointCloud } from './generateHumanPointCloud';

interface VolumetricHumanPointsProps {
  heartRate?: number;
  respiratoryRate?: number;
}

const vertexShader = `
  uniform float uTime;
  uniform float uHeartRate;
  uniform float uBreathing;

  attribute float aOrganType;
  attribute float aPhase;
  attribute vec3 aBaseColor;

  varying vec3 vColor;
  varying float vAlpha;
  varying float vOrganType;

  void main() {
    vOrganType = aOrganType;
    vec3 pos = position;

    // Heart pulsation (organType == 2.0)
    if (abs(aOrganType - 2.0) < 0.1) {
      // Cardiac cycle timing based on real HR (clamped to calm 55-95 bpm)
      float bps = clamp(uHeartRate, 55.0, 95.0) / 60.0;
      float cardiacPhase = fract(uTime * bps);
      
      // Lub-dub cardiac contraction & rebound curve
      float lub = sin(clamp(cardiacPhase * 4.0, 0.0, 3.14159));
      float dub = sin(clamp((cardiacPhase - 0.22) * 4.0, 0.0, 3.14159));
      float pulse = lub * 0.14 + dub * 0.08;

      vec3 heartCenter = vec3(-0.06, 1.02, 0.06);
      pos += (pos - heartCenter) * pulse;
    }

    // Lung breathing expansion (organType == 3.0)
    if (abs(aOrganType - 3.0) < 0.1) {
      // 6-second calm respiratory cycle
      float breath = sin(uTime * 1.05 + aPhase * 0.2) * 0.08;
      pos.x += sign(pos.x) * breath * 0.6;
      pos.z += breath * 0.5;
    }

    // Subtle slow vertical scan shimmer along the whole body
    float scan = sin(pos.y * 3.8 - uTime * 1.2);
    float scanHighlight = smoothstep(0.85, 1.0, scan);

    // Color mixing
    vec3 col = aBaseColor;
    if (scanHighlight > 0.0) {
      col += vec3(0.18, 0.22, 0.32) * scanHighlight;
    }

    vColor = col;

    // Point alpha based on organ type and scan
    if (aOrganType > 0.5) {
      // Organ points are brighter & denser
      vAlpha = 0.88 + 0.12 * sin(uTime * 2.0 + aPhase);
    } else {
      // Body shell points are soft and ethereal
      vAlpha = 0.42 + 0.15 * scanHighlight;
    }

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Size attenuation: points stay crisp across zoom
    float baseSize = (aOrganType > 0.5) ? 3.8 : 2.4;
    gl_PointSize = clamp(baseSize * (5.5 / -mvPosition.z), 1.5, 8.0);
  }
`;

const fragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;
  varying float vOrganType;

  void main() {
    // Soft round circle with gaussian falloff
    vec2 coord = gl_PointCoord - vec2(0.5);
    float distSq = dot(coord, coord);
    if (distSq > 0.25) discard;

    float alpha = smoothstep(0.25, 0.02, distSq) * vAlpha;

    // Center specular glint
    vec3 finalColor = vColor;
    if (distSq < 0.06) {
      finalColor += vec3(0.2, 0.25, 0.3);
    }

    gl_FragColor = vec4(finalColor, alpha);
  }
`;

export const VolumetricHumanPoints: React.FC<VolumetricHumanPointsProps> = ({
  heartRate = 72,
  respiratoryRate = 14,
}) => {
  const pointsRef = useRef<THREE.Points>(null);

  // Generate the 52k volumetric points once
  const pointData = useMemo(() => generateHumanPointCloud(), []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uHeartRate: { value: heartRate },
      uBreathing: { value: 0 },
    }),
    []
  );

  useFrame((state, delta) => {
    uniforms.uTime.value = state.clock.getElapsedTime();
    uniforms.uHeartRate.value = heartRate;
    uniforms.uBreathing.value = Math.sin(state.clock.getElapsedTime() * (respiratoryRate / 60) * Math.PI * 2);

    if (pointsRef.current) {
      // Subtle idle breathing rotation of the entire twin
      pointsRef.current.rotation.y = Math.sin(state.clock.getElapsedTime() * 0.15) * 0.025;
    }
  });

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pointData.positions, 3));
    geo.setAttribute('aOrganType', new THREE.BufferAttribute(pointData.organTypes, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(pointData.phases, 1));
    geo.setAttribute('aBaseColor', new THREE.BufferAttribute(pointData.baseColors, 3));
    return geo;
  }, [pointData]);

  return (
    <points ref={pointsRef} geometry={geometry}>
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};
