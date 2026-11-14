import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useAstra } from '../../context/AstraContext';
import { HolographicHumanFigure } from '../body/HolographicHumanFigure';
import { MovingStarfield } from '../body/MovingStarfield';
import { HardwareSensorsOverlay } from '../body/HardwareSensorsOverlay';
import { Mic, MicOff } from 'lucide-react';

interface HolographicBodyCenterProps {
  onSelectZone?: (zone: string) => void;
}

export const HolographicBodyCenter: React.FC<HolographicBodyCenterProps> = ({ onSelectZone }) => {
  const {
    activeCrew,
    astraMode,
    currentUtterance,
    activeHotspotId,
    isMicActive,
    toggleMic,
    sendInput,
  } = useAstra();

  const zones = [
    { id: 'head', label: 'ZONE: HEAD' },
    { id: 'spine', label: 'ZONE: SPINE' },
    { id: 'skin', label: 'ZONE: SKIN' },
  ];

  const heartRate = activeCrew?.vitals.heartRate || 78;

  // Map activeHotspotId to highlighted zones in 3D shader
  const highlightedZones: Array<'heart' | 'spine' | 'head' | 'skin' | 'lungs' | 'abdomen'> = [];
  if (activeHotspotId === 'headband') highlightedZones.push('head');
  if (activeHotspotId === 'heart') highlightedZones.push('heart');
  if (activeHotspotId === 'spine_skin') {
    highlightedZones.push('spine');
    highlightedZones.push('skin');
  }

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-between select-none overflow-hidden py-1">
      {/* Top Zone Selection Pills */}
      <div className="flex items-center gap-2 z-20 pt-1">
        {zones.map((z) => {
          const isSelected = highlightedZones.includes(z.id as any);
          return (
            <button
              key={z.id}
              onClick={() => {
                onSelectZone?.(z.id);
                sendInput(`Inspect zone ${z.id}`);
              }}
              className={`px-3 py-0.5 rounded text-[10px] font-mono tracking-instrument border transition-colors ${
                isSelected
                  ? 'border-[#B8CCE6] bg-white/20 text-[#ECE8E1] shadow-[0_0_12px_rgba(184,204,230,0.35)]'
                  : 'border-white/15 hover:border-white/30 bg-black/40 hover:bg-white/[0.08] text-[#8D97A6] hover:text-[#ECE8E1]'
              }`}
            >
              {z.label}
            </button>
          );
        })}
      </div>

      {/* 3D WebGL Canvas Centerpiece with Moving Stars, High-Def Anatomical Human & 6 Hardware Sensor Nodes */}
      <div className="flex-1 w-full relative flex items-center justify-center min-h-[360px] overflow-hidden">
        <Canvas
          camera={{ position: [0, 0.05, 3.2], fov: 42 }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
          }}
        >
          {/* Moving Cosmic Stars in Background */}
          <MovingStarfield count={1600} />

          {/* Local Soft Aerospace Lighting */}
          <ambientLight intensity={0.6} />
          <directionalLight position={[2, 3, 3]} intensity={0.8} color="#DCEBFA" />
          <directionalLight position={[-2, 1, -2]} intensity={0.4} color="#8E8AB8" />

          {/* High-Definition Anatomical Holographic Human Figure */}
          <Suspense fallback={null}>
            <HolographicHumanFigure
              heartRate={heartRate}
              speechPulse={astraMode === 'NARRATING' ? 0.7 : 0}
              highlightedZones={highlightedZones}
            />
          </Suspense>

          <OrbitControls
            enablePan={false}
            enableZoom={false}
            minPolarAngle={Math.PI / 2.2}
            maxPolarAngle={Math.PI / 1.8}
            minAzimuthAngle={-Math.PI / 4}
            maxAzimuthAngle={Math.PI / 4}
            dampingFactor={0.06}
          />
        </Canvas>

        {/* 6 Hardware-Accurate NASA Sensor Nodes Directly Over Anatomical Human */}
        <HardwareSensorsOverlay />
      </div>

      {/* Bottom Sub-HUD: Spoken Caption + Astronaut Callsign + Mic Waveform */}
      <div className="flex flex-col items-center text-center z-20 max-w-lg px-4 mb-2 pointer-events-auto">
        {/* Current Voice Utterance */}
        <p className="text-xs font-mono text-[#ECE8E1] truncate max-w-full drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
          {currentUtterance || 'How are you feeling today? Are you experiencing any issues with sleep, skin irritation, or spine pain?'}
        </p>

        {/* Astronaut Callsign */}
        <span className="text-[10px] font-mono text-[#8D97A6] tracking-wider mt-0.5 uppercase">
          {activeCrew ? `${activeCrew.name} · ${activeCrew.role}` : 'AUTHENTICATION REQUIRED'}
        </span>

        {/* Audio Waveform Flanking Glowing Mic Button */}
        <div className="flex items-center gap-2 mt-2">
          {/* Left waveform bars */}
          <div className="flex items-center gap-0.5">
            {[4, 8, 14, 18, 12, 16, 10, 6].map((h, i) => (
              <div
                key={i}
                className={`w-[2px] rounded-full transition-all duration-200 ${
                  astraMode === 'NARRATING' || astraMode === 'LISTENING'
                    ? 'bg-[#ECE8E1] opacity-80 animate-pulse'
                    : 'bg-[#5B6573] opacity-30'
                }`}
                style={{
                  height: `${h}px`,
                  animationDuration: `${0.8 + (i % 3) * 0.3}s`,
                  animationDelay: `${i * 100}ms`,
                }}
              />
            ))}
          </div>

          {/* Central Glowing Mic Button */}
          <button
            onClick={toggleMic}
            title={isMicActive ? 'Mute Microphone' : 'Enable Microphone'}
            className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all shadow-[0_0_15px_rgba(255,255,255,0.25)] hover:scale-105 active:scale-95 ${
              isMicActive
                ? 'border-white/25 bg-white/10 hover:bg-white/20 text-[#ECE8E1]'
                : 'border-white/10 bg-white/[0.02] text-[#5B6573]'
            }`}
          >
            {isMicActive ? (
              <Mic className="w-3.5 h-3.5 text-[#ECE8E1]" strokeWidth={1.5} />
            ) : (
              <MicOff className="w-3.5 h-3.5 text-[#5B6573]" strokeWidth={1.5} />
            )}
          </button>

          {/* Right waveform bars */}
          <div className="flex items-center gap-0.5">
            {[6, 10, 16, 12, 18, 14, 8, 4].map((h, i) => (
              <div
                key={i}
                className={`w-[2px] rounded-full transition-all duration-200 ${
                  astraMode === 'NARRATING' || astraMode === 'LISTENING'
                    ? 'bg-[#ECE8E1] opacity-80 animate-pulse'
                    : 'bg-[#5B6573] opacity-30'
                }`}
                style={{
                  height: `${h}px`,
                  animationDuration: `${0.8 + (i % 3) * 0.3}s`,
                  animationDelay: `${i * 100}ms`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
