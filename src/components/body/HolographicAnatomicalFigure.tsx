import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { generateAnatomicalModelData } from './AnatomicalWireframeData';

interface HolographicAnatomicalFigureProps {
  heartRate?: number;
  respiratoryRate?: number;
  speechPulse?: number;
  highlightedZones?: Array<'heart' | 'spine' | 'head' | 'skin' | 'lungs' | 'abdomen'>;
}

// Line Vertex Shader for the structural wireframe skeleton & anatomical contours
const lineVertexShader = `
  uniform float uTime;
  uniform float uSpeechPulse;
  uniform float uHighlightSpine;
  uniform float uHighlightHead;
  uniform float uHighlightSkin;

  attribute vec3 aColor;
  attribute float aZone;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec3 pos = position;

    // Speech pulsation on wireframe
    if (uSpeechPulse > 0.01) {
      pos += normalize(vec3(pos.x, 0.0, pos.z)) * (uSpeechPulse * 0.03 * sin(pos.y * 6.0 - uTime * 5.0));
    }

    vec3 col = aColor;
    float alpha = 0.55;

    // Zone 3: Spine Highlight
    if (abs(aZone - 3.0) < 0.1 && uHighlightSpine > 0.5) {
      col = vec3(1.0, 0.88, 0.45); // Radiant gold-pearl
      alpha = 0.95;
    }

    // Zone 1: Head / Cranium Highlight
    if (abs(aZone - 1.0) < 0.1 && uHighlightHead > 0.5) {
      col = vec3(0.75, 0.9, 1.0); // Ethereal cyan-white
      alpha = 0.95;
    }

    // Zone 4: Skin / Limbs Highlight
    if (abs(aZone - 4.0) < 0.1 && uHighlightSkin > 0.5) {
      col = vec3(0.65, 0.92, 0.98);
      alpha = 0.85;
    }

    // Vertical holographic laser scan line sweeping smoothly up and down
    float scan = sin(pos.y * 3.5 - uTime * 1.5);
    float scanGlow = smoothstep(0.88, 1.0, scan);
    if (scanGlow > 0.0) {
      col += vec3(0.25, 0.35, 0.45) * scanGlow;
      alpha += 0.3 * scanGlow;
    }

    vColor = col;
    vAlpha = alpha + uSpeechPulse * 0.2;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const lineFragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    gl_FragColor = vec4(vColor, clamp(vAlpha, 0.0, 1.0));
  }
`;

// Point Matrix Vertex Shader for organs and structured holographic cloud
const pointVertexShader = `
  uniform float uTime;
  uniform float uHeartRate;
  uniform float uSpeechPulse;
  uniform float uHighlightHeart;
  uniform float uHighlightSpine;
  uniform float uHighlightHead;

  attribute vec3 aColor;
  attribute float aOrganType;
  attribute float aPhase;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec3 pos = position;

    // Cardiac ventricular contraction & rebound (Heart: aOrganType == 2.0)
    if (abs(aOrganType - 2.0) < 0.1) {
      float bps = clamp(uHeartRate, 55.0, 105.0) / 60.0;
      float cardiacPhase = fract(uTime * bps);
      float lub = sin(clamp(cardiacPhase * 4.0, 0.0, 3.14159));
      float dub = sin(clamp((cardiacPhase - 0.22) * 4.0, 0.0, 3.14159));
      float pulse = lub * 0.18 + dub * 0.10;
      vec3 heartCenter = vec3(-0.06, 1.02, 0.06);
      pos += (pos - heartCenter) * (pulse + uSpeechPulse * 0.12);
    }

    // Respiratory lung lobe expansion (Lungs: aOrganType == 3.0)
    if (abs(aOrganType - 3.0) < 0.1) {
      float breath = sin(uTime * 1.25 + aPhase * 0.2) * 0.08;
      pos.x += sign(pos.x) * breath * 0.6;
      pos.z += breath * 0.5;
    }

    vec3 col = aColor;
    float alpha = aOrganType > 0.5 ? 0.88 : 0.45;

    // Heart highlight
    if (abs(aOrganType - 2.0) < 0.1 && uHighlightHeart > 0.5) {
      col = mix(col, vec3(1.0, 0.25, 0.3), 0.85);
      alpha = 1.0;
    }

    // Brain highlight
    if (abs(aOrganType - 1.0) < 0.1 && uHighlightHead > 0.5) {
      col = vec3(0.85, 0.95, 1.0);
      alpha = 1.0;
    }

    // Spine cord highlight
    if (abs(aOrganType - 4.0) < 0.1 && uHighlightSpine > 0.5) {
      col = vec3(1.0, 0.92, 0.5);
      alpha = 1.0;
    }

    // Scan line glint
    float scan = sin(pos.y * 3.5 - uTime * 1.5);
    float scanGlow = smoothstep(0.88, 1.0, scan);
    if (scanGlow > 0.0) {
      col += vec3(0.2, 0.3, 0.4) * scanGlow;
      alpha += 0.25 * scanGlow;
    }

    vColor = col;
    vAlpha = alpha + uSpeechPulse * 0.15;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    float baseSize = (aOrganType > 0.5) ? 3.8 : 2.4;
    gl_PointSize = clamp(baseSize * (5.5 / -mvPosition.z), 1.5, 8.0);
  }
`;

const pointFragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);
    float distSq = dot(coord, coord);
    if (distSq > 0.25) discard;

    float alpha = smoothstep(0.25, 0.02, distSq) * vAlpha;
    gl_FragColor = vec4(vColor, alpha);
  }
`;

export const HolographicAnatomicalFigure: React.FC<HolographicAnatomicalFigureProps> = ({
  heartRate = 78,
  respiratoryRate = 14,
  speechPulse = 0,
  highlightedZones = [],
}) => {
  const groupRef = useRef<THREE.Group>(null);

  // Generate the high-definition anatomical geometry once
  const data = useMemo(() => generateAnatomicalModelData(), []);

  // Wireframe Line BufferGeometry
  const lineGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(data.linePositions, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(data.lineColors, 3));
    geo.setAttribute('aZone', new THREE.BufferAttribute(data.lineZoneTypes, 1));
    return geo;
  }, [data]);

  // Point Matrix BufferGeometry
  const pointGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(data.pointPositions, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(data.pointColors, 3));
    geo.setAttribute('aOrganType', new THREE.BufferAttribute(data.pointOrganTypes, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(data.pointPhases, 1));
    return geo;
  }, [data]);

  // Uniforms
  const lineUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSpeechPulse: { value: 0 },
      uHighlightSpine: { value: 0 },
      uHighlightHead: { value: 0 },
      uHighlightSkin: { value: 0 },
    }),
    []
  );

  const pointUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uHeartRate: { value: heartRate },
      uSpeechPulse: { value: 0 },
      uHighlightHeart: { value: 0 },
      uHighlightSpine: { value: 0 },
      uHighlightHead: { value: 0 },
    }),
    []
  );

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();

    lineUniforms.uTime.value = time;
    lineUniforms.uSpeechPulse.value = speechPulse;
    lineUniforms.uHighlightSpine.value = highlightedZones.includes('spine') ? 1.0 : 0.0;
    lineUniforms.uHighlightHead.value = highlightedZones.includes('head') ? 1.0 : 0.0;
    lineUniforms.uHighlightSkin.value = highlightedZones.includes('skin') ? 1.0 : 0.0;

    pointUniforms.uTime.value = time;
    pointUniforms.uHeartRate.value = heartRate;
    pointUniforms.uSpeechPulse.value = speechPulse;
    pointUniforms.uHighlightHeart.value = highlightedZones.includes('heart') ? 1.0 : 0.0;
    pointUniforms.uHighlightSpine.value = highlightedZones.includes('spine') ? 1.0 : 0.0;
    pointUniforms.uHighlightHead.value = highlightedZones.includes('head') ? 1.0 : 0.0;

    if (groupRef.current) {
      // Gentle idle holographic float
      groupRef.current.rotation.y = Math.sin(time * 0.15) * 0.035;
    }
  });

  return (
    <group ref={groupRef} position={[0, -0.05, 0]}>
      {/* 1. Structural Wireframe Lines (Spine, 12 paired Ribs, Skull, Girdles, Limbs) */}
      <lineSegments geometry={lineGeometry}>
        <shaderMaterial
          vertexShader={lineVertexShader}
          fragmentShader={lineFragmentShader}
          uniforms={lineUniforms}
          transparent={true}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>

      {/* 2. Structured Luminescent Point Matrix (Brain, Heart, Lungs, Spinal Cord, Surface Lattice) */}
      <points geometry={pointGeometry}>
        <shaderMaterial
          vertexShader={pointVertexShader}
          fragmentShader={pointFragmentShader}
          uniforms={pointUniforms}
          transparent={true}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* 3. Holographic Ground Projection Pedestal Rings */}
      <group position={[0, -1.48, 0]}>
        {/* Outer Ring */}
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.42, 0.43, 48]} />
          <meshBasicMaterial color="#B8CCE6" transparent opacity={0.35} side={THREE.DoubleSide} />
        </mesh>
        {/* Inner Ring */}
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.26, 0.27, 36]} />
          <meshBasicMaterial color="#B8CCE6" transparent opacity={0.25} side={THREE.DoubleSide} />
        </mesh>
        {/* Pedestal Crosshairs */}
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.9, 0.005]} />
          <meshBasicMaterial color="#B8CCE6" transparent opacity={0.15} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
          <planeGeometry args={[0.9, 0.005]} />
          <meshBasicMaterial color="#B8CCE6" transparent opacity={0.15} />
        </mesh>
      </group>
    </group>
  );
};
