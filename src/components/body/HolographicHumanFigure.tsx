import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';

interface HolographicHumanFigureProps {
  heartRate?: number;
  speechPulse?: number;
  highlightedZones?: Array<'heart' | 'spine' | 'head' | 'skin' | 'lungs' | 'abdomen'>;
}

const humanVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  uniform float uTime;
  uniform float uSpeechPulse;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    
    vec3 pos = position;
    // Speech acoustic resonance ripple
    if (uSpeechPulse > 0.01) {
      pos.z += sin(pos.y * 12.0 - uTime * 6.0) * uSpeechPulse * 0.015;
    }

    vPosition = pos;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const humanFragmentShader = `
  uniform sampler2D uTexture;
  uniform float uTime;
  uniform float uHeartRate;
  uniform float uSpeechPulse;
  uniform float uHighlightHead;
  uniform float uHighlightSpine;
  uniform float uHighlightSkin;

  varying vec2 vUv;
  varying vec3 vPosition;

  void main() {
    vec4 tex = texture2D(uTexture, vUv);
    
    // Discard completely dark pixels
    if (tex.a < 0.01 && (tex.r + tex.g + tex.b) < 0.03) {
      discard;
    }

    vec3 col = tex.rgb;
    float alpha = tex.a;

    // 1. Cardiac Pulse: Heart is centered around UV (0.505, 0.725)
    vec2 heartUv = vec2(0.505, 0.725);
    float distToHeart = distance(vUv, heartUv);
    if (distToHeart < 0.18) {
      float bps = clamp(uHeartRate, 50.0, 120.0) / 60.0;
      float cardiacPhase = fract(uTime * bps);
      float lub = sin(clamp(cardiacPhase * 4.0, 0.0, 3.14159));
      float dub = sin(clamp((cardiacPhase - 0.22) * 4.0, 0.0, 3.14159));
      float beat = lub * 0.6 + dub * 0.35;
      
      float heartRadius = smoothstep(0.18, 0.0, distToHeart);
      // Radiant cardiac illumination
      col += vec3(0.9, 0.95, 1.0) * beat * heartRadius * 1.4;
      alpha += beat * heartRadius * 0.3;
    }

    // 2. Holographic Vertical Laser Scan Sweep
    float scanPos = sin(uTime * 1.4) * 0.45 + 0.5;
    float scanDist = abs(vUv.y - scanPos);
    if (scanDist < 0.035) {
      float scanIntensity = smoothstep(0.035, 0.0, scanDist);
      col += vec3(0.4, 0.6, 0.85) * scanIntensity * 0.6;
      alpha += 0.25 * scanIntensity;
    }

    // 3. Zone Highlights
    // Head zone: UV y > 0.82
    if (uHighlightHead > 0.5 && vUv.y > 0.82) {
      col = mix(col, vec3(0.7, 0.9, 1.0), 0.5);
      alpha = min(1.0, alpha + 0.3);
    }

    // Spine zone: center vertical column between y: 0.38 and 0.80
    if (uHighlightSpine > 0.5 && abs(vUv.x - 0.505) < 0.05 && vUv.y > 0.38 && vUv.y < 0.80) {
      col = mix(col, vec3(1.0, 0.88, 0.5), 0.7);
      alpha = min(1.0, alpha + 0.4);
    }

    // Skin zone: peripheral edges
    if (uHighlightSkin > 0.5 && (abs(vUv.x - 0.5) > 0.18 || vUv.y < 0.25)) {
      col = mix(col, vec3(0.55, 0.88, 0.95), 0.45);
      alpha = min(1.0, alpha + 0.25);
    }

    // 4. Speech reactivity: subtle luminescent aura boost
    if (uSpeechPulse > 0.01) {
      col += vec3(0.2, 0.3, 0.45) * uSpeechPulse * 0.5;
      alpha += uSpeechPulse * 0.15;
    }

    gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
  }
`;

export const HolographicHumanFigure: React.FC<HolographicHumanFigureProps> = ({
  heartRate = 78,
  speechPulse = 0,
  highlightedZones = [],
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const texture = useTexture('/holographic_human.png');

  // Configure texture parameters
  useMemo(() => {
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
  }, [texture]);

  // Shader Uniforms
  const uniforms = useMemo(
    () => ({
      uTexture: { value: texture },
      uTime: { value: 0 },
      uHeartRate: { value: heartRate },
      uSpeechPulse: { value: 0 },
      uHighlightHead: { value: 0 },
      uHighlightSpine: { value: 0 },
      uHighlightSkin: { value: 0 },
    }),
    [texture]
  );

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    uniforms.uTime.value = time;
    uniforms.uHeartRate.value = heartRate;
    uniforms.uSpeechPulse.value = speechPulse;
    uniforms.uHighlightHead.value = highlightedZones.includes('head') ? 1.0 : 0.0;
    uniforms.uHighlightSpine.value = highlightedZones.includes('spine') ? 1.0 : 0.0;
    uniforms.uHighlightSkin.value = highlightedZones.includes('skin') ? 1.0 : 0.0;

    // Very subtle natural holographic breathing idle movement
    if (groupRef.current) {
      groupRef.current.position.y = -0.02 + Math.sin(time * 0.8) * 0.015;
      groupRef.current.rotation.y = Math.sin(time * 0.25) * 0.03;
    }
  });

  return (
    <group ref={groupRef} position={[0, -0.02, 0]}>
      {/* High-Definition Holographic Human Mesh */}
      <mesh position={[0, 0.05, 0]}>
        <planeGeometry args={[1.55, 2.78, 48, 48]} />
        <shaderMaterial
          vertexShader={humanVertexShader}
          fragmentShader={humanFragmentShader}
          uniforms={uniforms}
          transparent={true}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Holographic Ground Pedestal Circles under feet */}
      <group position={[0, -1.36, 0]}>
        {/* Outer Ring */}
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.38, 0.395, 48]} />
          <meshBasicMaterial color="#B8CCE6" transparent opacity={0.3} side={THREE.DoubleSide} />
        </mesh>
        {/* Inner Ring */}
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.22, 0.23, 36]} />
          <meshBasicMaterial color="#B8CCE6" transparent opacity={0.2} side={THREE.DoubleSide} />
        </mesh>
        {/* Alignment Crosshairs */}
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.82, 0.004]} />
          <meshBasicMaterial color="#B8CCE6" transparent opacity={0.12} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
          <planeGeometry args={[0.82, 0.004]} />
          <meshBasicMaterial color="#B8CCE6" transparent opacity={0.12} />
        </mesh>
      </group>
    </group>
  );
};
