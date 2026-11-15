import React, { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useSolaris } from '../../context/SolarisContext';
import { HolographicHumanFigure } from '../body/HolographicHumanFigure';
import { MovingStarfield } from '../body/MovingStarfield';
import { HardwareSensorsOverlay } from '../body/HardwareSensorsOverlay';
import { LayeredSvgAnatomy } from '../body/LayeredSvgAnatomy';
import { Body3D, type BodyView, type SkinMode } from '../body/anatomy3d/Body3D';
import { SOLARIS_ORGANS } from '../../data/solarisCatalog';
import { Mic, MicOff, Layers, Box, Eye } from 'lucide-react';

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
  } = useSolaris();

  const [viewMode, setViewMode] = useState<'3d' | 'anatomy' | '2d'>('3d');
  const [selectedSystem, setSelectedSystem] = useState<string | null>(null);
  const [anatomySkinMode, setAnatomySkinMode] = useState<SkinMode>('muscles');
  const [anatomyView, setAnatomyView] = useState<BodyView>('anatomy');

  const systems = [
    { id: 'cardiovascular', label: 'CARDIO', fullLabel: 'CARDIOVASCULAR' },
    { id: 'respiratory', label: 'RESP', fullLabel: 'RESPIRATORY' },
    { id: 'musculoskeletal', label: 'MUSC', fullLabel: 'MUSCULOSKELETAL' },
    { id: 'neurological', label: 'NEURO', fullLabel: 'NEUROLOGICAL' },
    { id: 'immune', label: 'IMMUNE', fullLabel: 'IMMUNE' },
  ];

  const zones = [
    { id: 'head', label: 'ZONE: HEAD' },
    { id: 'spine', label: 'ZONE: SPINE' },
    { id: 'skin', label: 'ZONE: SKIN' },
  ];

  const heartRate = activeCrew?.vitals.heartRate || 78;

  // Map activeHotspotId to highlighted zones in 3D shader
  const highlightedZones: Array<'heart' | 'spine' | 'head' | 'skin' | 'lungs' | 'abdomen'> = [];
  if (activeHotspotId === 'headband') highlightedZones.push('head');
  if (activeHotspotId === 'heart' || selectedSystem === 'cardiovascular') highlightedZones.push('heart');
  if (activeHotspotId === 'spine_skin' || selectedSystem === 'musculoskeletal') highlightedZones.push('spine');
  if (selectedSystem === 'respiratory') highlightedZones.push('lungs');
  if (selectedSystem === 'immune') highlightedZones.push('skin');

  const handleSelectSystem = (sysId: string | null) => {
    setSelectedSystem(sysId);
    if (sysId) {
      onSelectZone?.(sysId);
      sendInput(`Inspect ${sysId} system`);
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-between select-none overflow-hidden py-1">
      {/* Top Header: System Selectors + 2D/3D Mode Switcher */}
      <div className="w-full flex items-center justify-between px-3 z-20 pt-1 gap-2">
        {/* Physiological Systems Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          <button
            onClick={() => handleSelectSystem(null)}
            className={`px-2 py-0.5 rounded text-[9.5px] font-mono tracking-instrument border transition-colors shrink-0 ${
              selectedSystem === null
                ? 'border-orange-500/50 bg-orange-500/15 text-orange-400 font-bold'
                : 'border-white/10 hover:border-white/25 bg-[#172030] text-[#94A3B8] hover:text-[#F9FAFB]'
            }`}
          >
            ALL
          </button>
          {systems.map((s) => {
            const isSelected = selectedSystem === s.id;
            return (
              <button
                key={s.id}
                onClick={() => handleSelectSystem(isSelected ? null : s.id)}
                title={s.fullLabel}
                className={`px-2 py-0.5 rounded text-[9.5px] font-mono tracking-instrument border transition-colors shrink-0 ${
                  isSelected
                    ? 'border-orange-500/50 bg-orange-500/15 text-orange-400 font-bold shadow-sm'
                    : 'border-white/10 hover:border-white/25 bg-[#172030] text-[#94A3B8] hover:text-[#F9FAFB]'
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>

        {/* View Mode Switcher: 3D Twin vs 3D Anatomy vs 2D Schematic */}
        <div className="flex items-center gap-1 bg-white/[0.04] border border-white/10 rounded-full p-0.5 shrink-0">
          <button
            onClick={() => setViewMode('3d')}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono transition-all ${
              viewMode === '3d'
                ? 'bg-white/20 text-[#ECE8E1] font-medium shadow-sm'
                : 'text-[#8D97A6] hover:text-[#ECE8E1]'
            }`}
          >
            <Box className="w-2.5 h-2.5" />
            <span>3D TWIN</span>
          </button>
          <button
            onClick={() => setViewMode('anatomy')}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono transition-all ${
              viewMode === 'anatomy'
                ? 'bg-white/20 text-[#ECE8E1] font-medium shadow-sm'
                : 'text-[#8D97A6] hover:text-[#ECE8E1]'
            }`}
          >
            <Eye className="w-2.5 h-2.5" />
            <span>3D ANATOMY</span>
          </button>
          <button
            onClick={() => setViewMode('2d')}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono transition-all ${
              viewMode === '2d'
                ? 'bg-white/20 text-[#ECE8E1] font-medium shadow-sm'
                : 'text-[#8D97A6] hover:text-[#ECE8E1]'
            }`}
          >
            <Layers className="w-2.5 h-2.5" />
            <span>2D VECTOR</span>
          </button>
        </div>
      </div>

      {/* Layer sub-controls when in 3D ANATOMY mode */}
      {viewMode === 'anatomy' && (
        <div className="w-full flex items-center justify-between px-4 z-20 pt-1 text-[9px] font-mono text-[#8D97A6]">
          <div className="flex items-center gap-1">
            <span>LAYER:</span>
            {(['muscles', 'skeletal', 'xray'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setAnatomySkinMode(m)}
                className={`px-1.5 py-0.5 rounded uppercase border transition-colors ${
                  anatomySkinMode === m
                    ? 'border-[#B8CCE6] bg-white/20 text-[#ECE8E1]'
                    : 'border-white/5 hover:border-white/15 text-[#8D97A6]'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <span>VIEW:</span>
            {(['anatomy', 'status'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setAnatomyView(v)}
                className={`px-1.5 py-0.5 rounded uppercase border transition-colors ${
                  anatomyView === v
                    ? 'border-[#B8CCE6] bg-white/20 text-[#ECE8E1]'
                    : 'border-white/5 hover:border-white/15 text-[#8D97A6]'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Anatomical Display: 3D Holographic Twin OR 3D Anatomy Model OR 2D Schematic */}
      <div className="flex-1 w-full relative flex items-center justify-center min-h-[360px] overflow-hidden">
        {viewMode === '3d' && (
          <>
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
          </>
        )}

        {viewMode === 'anatomy' && (
          <div className="w-full h-full relative">
            <Suspense fallback={<div className="w-full h-full flex items-center justify-center text-xs font-mono text-[#8D97A6]">Loading BodyParts3D GLB Model...</div>}>
              <Body3D
                organs={SOLARIS_ORGANS}
                organStatus={{
                  heart: 'ok',
                  lungs: 'ok',
                  brain: 'ok',
                  musculo: activeCrew?.name === 'Chen' ? 'watch' : 'ok',
                  digestive: 'ok',
                  kidneys: 'ok',
                  eyes: 'ok',
                  immune: 'ok',
                }}
                grey={{}}
                focus={selectedSystem}
                hover={null}
                view={anatomyView}
                layers={{ skeleton: true, organs: true }}
                skinMode={anatomySkinMode}
                heartRate={heartRate}
                breathRate={activeCrew?.vitals.respRate || 14}
                crewName={activeCrew?.name || 'Astronaut'}
                onSelect={(id) => {
                  setSelectedSystem(id);
                  if (id) {
                    onSelectZone?.(id);
                    sendInput(`Inspect ${id} system`);
                  }
                }}
                onHover={() => {}}
              />
            </Suspense>
          </div>
        )}

        {viewMode === '2d' && (
          <div className="w-full h-full flex items-center justify-center p-2 relative">
            <div className="w-[300px] h-full flex items-center justify-center">
              <LayeredSvgAnatomy
                selectedSystem={selectedSystem}
                onSelectSystem={(sys) => {
                  setSelectedSystem(sys);
                  onSelectZone?.(sys);
                }}
                heartRate={heartRate}
              />
            </div>
          </div>
        )}
      </div>

      {/* Zone Quick Buttons Row */}
      <div className="flex items-center gap-2 z-20 mb-1">
        {zones.map((z) => {
          const isSelected = highlightedZones.includes(z.id as any);
          return (
            <button
              key={z.id}
              onClick={() => {
                onSelectZone?.(z.id);
                sendInput(`Inspect zone ${z.id}`);
              }}
              className={`px-2.5 py-0.5 rounded text-[9.5px] font-mono tracking-instrument border transition-colors ${
                isSelected
                  ? 'border-[#B8CCE6] bg-white/20 text-[#ECE8E1] shadow-[0_0_12px_rgba(184,204,230,0.35)]'
                  : 'border-white/10 hover:border-white/25 bg-black/40 hover:bg-white/[0.08] text-[#8D97A6] hover:text-[#ECE8E1]'
              }`}
            >
              {z.label}
            </button>
          );
        })}
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

          {/* Central Mic Button */}
          <button
            onClick={toggleMic}
            title={isMicActive ? 'Mute Microphone' : 'Enable Microphone'}
            className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all shadow-sm hover:scale-105 active:scale-95 ${
              isMicActive
                ? 'border-orange-500/50 bg-orange-500/20 text-orange-400'
                : 'border-white/10 bg-[#172030] text-[#64748B]'
            }`}
          >
            {isMicActive ? (
              <Mic className="w-3.5 h-3.5 text-orange-400" strokeWidth={1.5} />
            ) : (
              <MicOff className="w-3.5 h-3.5 text-[#64748B]" strokeWidth={1.5} />
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
