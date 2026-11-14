import React, { useRef, useState, useEffect, Suspense } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { HolographicAnatomicalFigure } from './HolographicAnatomicalFigure';
import { MovingStarfield } from './MovingStarfield';
import { NocturneHotspot, HotspotData } from './NocturneHotspot';
import { Body2DFallback } from './Body2DFallback';
import { BodyRegion } from '../../api/types';

interface BodySceneProps {
  heartRate?: number;
  respiratoryRate?: number;
  hotspots: HotspotData[];
  selectedRegion: BodyRegion | null;
  onSelectRegion: (region: BodyRegion | null) => void;
}

function CameraController({
  selectedHotspot,
}: {
  selectedHotspot: HotspotData | null;
}) {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);

  const defaultCamPos = useRef(new THREE.Vector3(0, 0.05, 3.1));
  const defaultTarget = useRef(new THREE.Vector3(0, 0.0, 0));

  const targetCamPos = useRef(defaultCamPos.current.clone());
  const targetLookAt = useRef(defaultTarget.current.clone());

  useEffect(() => {
    if (selectedHotspot) {
      targetLookAt.current.set(...selectedHotspot.cameraTarget);
      targetCamPos.current.set(...selectedHotspot.cameraPosition);
    } else {
      targetCamPos.current.copy(defaultCamPos.current);
      targetLookAt.current.copy(defaultTarget.current);
    }
  }, [selectedHotspot]);

  useFrame((_, delta) => {
    const lerpFactor = Math.min(delta * 3.5, 1);
    camera.position.lerp(targetCamPos.current, lerpFactor);

    if (controlsRef.current) {
      controlsRef.current.target.lerp(targetLookAt.current, lerpFactor);
      controlsRef.current.update();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      enableZoom={true}
      minDistance={1.8}
      maxDistance={4.2}
      minPolarAngle={Math.PI / 4}
      maxPolarAngle={Math.PI * 3 / 4}
      dampingFactor={0.06}
    />
  );
}

class ModelErrorBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: any) {
    console.warn('3D GLB model load error, rendering volumetric point-cloud:', err);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

function GhostGLTFModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const modelRef = useRef<THREE.Group>(null);

  // Apply translucent ghost rim material
  useEffect(() => {
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(0xd0e2f5),
          roughness: 0.25,
          metalness: 0.1,
          transparent: true,
          opacity: 0.35,
          depthWrite: false,
          side: THREE.DoubleSide,
        });
      }
    });
  }, [scene]);

  return <primitive ref={modelRef} object={scene} scale={1.8} position={[0, -1.5, 0]} />;
}

export const BodyScene: React.FC<BodySceneProps> = ({
  heartRate = 72,
  respiratoryRate = 14,
  hotspots,
  selectedRegion,
  onSelectRegion,
}) => {
  const [webGLAvailable, setWebGLAvailable] = useState<boolean>(true);
  const [hasGLBModel, setHasGLBModel] = useState<boolean>(false);

  // Check WebGL support and whether /models/human.glb exists
  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setWebGLAvailable(false);
      }
    } catch {
      setWebGLAvailable(false);
    }

    // Check if human.glb exists locally as an actual binary model (not SPA fallback HTML)
    fetch('/models/human.glb', { method: 'HEAD' })
      .then((res) => {
        const contentType = res.headers.get('content-type') || '';
        if (
          res.ok &&
          !contentType.includes('text/html') &&
          (contentType.includes('model') || contentType.includes('octet-stream') || contentType.includes('gltf'))
        ) {
          setHasGLBModel(true);
        } else {
          setHasGLBModel(false);
        }
      })
      .catch(() => {
        setHasGLBModel(false);
      });
  }, []);

  const selectedHotspot = hotspots.find((h) => h.region === selectedRegion) || null;

  if (!webGLAvailable) {
    return (
      <Body2DFallback
        hotspots={hotspots.map((h) => ({
          region: h.region,
          label: h.label,
          level: h.level,
          valueSnippet: h.metricSnippet,
          unit: h.unit,
        }))}
        selectedRegion={selectedRegion}
        onSelectRegion={(reg) => onSelectRegion(reg)}
      />
    );
  }

  return (
    <div className="relative w-full h-full select-none">
      <Canvas
        camera={{ position: [0, 0.05, 3.1], fov: 42 }}
        onPointerDown={(e) => {
          // If clicked on canvas background (not on an object), reset selection
          if (e.target === e.currentTarget) {
            onSelectRegion(null);
          }
        }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
      >
        {/* Moving Cosmic Stars in Background */}
        <MovingStarfield count={1600} />

        {/* Soft Local Instrument Lights */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[2, 3, 3]} intensity={0.8} color="#DCEBFA" />
        <directionalLight position={[-2, 1, -2]} intensity={0.4} color="#8E8AB8" />
        <pointLight position={[0, -1.8, 1]} intensity={0.3} color="#6FBF9B" />

        {/* High-Definition Anatomical Figure */}
        <Suspense fallback={null}>
          <HolographicAnatomicalFigure
            heartRate={heartRate}
            respiratoryRate={respiratoryRate}
            highlightedZones={selectedRegion ? [selectedRegion as any] : []}
          />
        </Suspense>

        {/* Hotspots */}
        {hotspots.map((h) => (
          <NocturneHotspot
            key={h.id}
            hotspot={h}
            isSelected={selectedRegion === h.region}
            onSelect={(selected) => onSelectRegion(selected.region)}
          />
        ))}

        {/* Smooth Camera Rig */}
        <CameraController selectedHotspot={selectedHotspot} />
      </Canvas>
    </div>
  );
};
