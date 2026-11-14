import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

export const MovingStarfield: React.FC<{ count?: number }> = ({ count = 1800 }) => {
  const pointsRef = useRef<THREE.Points>(null);

  const [positions, phases, colors, speeds] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const pha = new Float32Array(count);
    const col = new Float32Array(count * 3);
    const spd = new Float32Array(count);

    let seed = 9876;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      // Spread stars widely across background
      pos[idx] = (rand() - 0.5) * 18.0;     // X: -9 to +9
      pos[idx + 1] = (rand() - 0.5) * 14.0; // Y: -7 to +7
      pos[idx + 2] = -8.0 + rand() * 10.0;  // Z: -8 to +2

      pha[i] = rand() * Math.PI * 2;
      spd[i] = 0.08 + rand() * 0.18; // Slow cosmic drift speed

      // Subtle celestial colors: 70% ice-white/blue, 20% pearl, 10% warm amber
      const type = rand();
      if (type > 0.85) {
        col[idx] = 0.95; col[idx + 1] = 0.88; col[idx + 2] = 0.72; // Warm amber star
      } else if (type > 0.4) {
        col[idx] = 0.85; col[idx + 1] = 0.92; col[idx + 2] = 1.0;  // Icy blue star
      } else {
        col[idx] = 0.95; col[idx + 1] = 0.96; col[idx + 2] = 0.98; // Pearl white star
      }
    }

    return [pos, pha, col, spd];
  }, [count]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
    }),
    []
  );

  useFrame((_, delta) => {
    uniforms.uTime.value += delta;

    if (pointsRef.current) {
      const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
      const array = posAttr.array as Float32Array;

      for (let i = 0; i < count; i++) {
        const zIdx = i * 3 + 2;
        // Move stars slowly forward toward camera to create real depth drift
        array[zIdx] += speeds[i] * delta * 0.5;

        // Reset if star passes camera
        if (array[zIdx] > 3.0) {
          array[zIdx] = -8.0;
        }
      }
      posAttr.needsUpdate = true;
    }
  });

  const vertexShader = `
    uniform float uTime;
    attribute float aPhase;
    attribute vec3 aColor;
    varying vec3 vColor;
    varying float vAlpha;

    void main() {
      vColor = aColor;
      
      // Twinkle twinkle subtle shimmer
      float twinkle = 0.5 + 0.5 * sin(uTime * 1.8 + aPhase);
      
      // Distance fade
      float distFade = smoothstep(3.0, 0.0, position.z);
      vAlpha = twinkle * 0.7 * distFade;

      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      
      // Point size attenuated by distance
      gl_PointSize = clamp(2.2 * (20.0 / -mvPosition.z), 1.0, 4.5);
    }
  `;

  const fragmentShader = `
    varying vec3 vColor;
    varying float vAlpha;

    void main() {
      vec2 coord = gl_PointCoord - vec2(0.5);
      float distSq = dot(coord, coord);
      if (distSq > 0.25) discard;

      float alpha = smoothstep(0.25, 0.01, distSq) * vAlpha;
      gl_FragColor = vec4(vColor, alpha);
    }
  `;

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    return geo;
  }, [positions, phases, colors]);

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
