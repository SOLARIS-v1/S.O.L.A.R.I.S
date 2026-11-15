import React, { useState } from 'react';
import { useSolaris } from '../../context/SolarisContext';

export interface HardwareSensorNode {
  id: string;
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
  label: string;
  deviceBadge: string;
  getTelemetry: (activeCrew: any, verbalSymptoms: any) => { primary: string; secondary: string };
  isAlert?: (activeCrew: any, verbalSymptoms: any) => boolean;
}

export const HARDWARE_SENSORS: HardwareSensorNode[] = [
  {
    id: 'headband',
    x: 50,
    y: 8,
    label: 'Forehead Optical PPG & Fluid Shift',
    deviceBadge: '[ASTROSKIN HEADBAND]',
    getTelemetry: (crew) => ({
      primary: `SpO2: ${crew?.vitals.spo2?.toFixed(1) || '98.4'}%`,
      secondary: 'Cranial Pulse Transit Time: 142 ms (Cephalic fluid shift proxy)',
    }),
    isAlert: (crew) => (crew?.vitals.spo2 || 99) < 98.0,
  },
  {
    id: 'dosimeter',
    x: 38,
    y: 22,
    label: 'Active Radiation Dosimetry',
    deviceBadge: '[HERA / CPD DOSIMETER]',
    getTelemetry: (crew) => ({
      primary: `Daily Dose: 0.12 mSv/d`,
      secondary: `Cumulative: ${crew?.vitals.radiation_mSv?.toFixed(1) || '54.8'} mSv (Safe margin)`,
    }),
    isAlert: (crew) => (crew?.vitals.radiation_mSv || 0) > 55,
  },
  {
    id: 'heart',
    x: 53,
    y: 27,
    label: 'Cardiac 3-Lead ECG',
    deviceBadge: '[ASTROSKIN THORACIC ECG]',
    getTelemetry: (crew) => ({
      primary: `Live HR: ${crew?.vitals.heartRate || 78} BPM · HRV: ${crew?.vitals.hrv || 42} ms`,
      secondary:
        crew?.id === 'vance'
          ? 'Intermittent ectopic jumps up to 96 BPM'
          : crew?.id === 'chen'
          ? 'Autonomic strain & microgravity tachycardia'
          : 'Normal sinus rhythm confirmed',
    }),
    isAlert: (crew) => crew?.id === 'vance' || crew?.id === 'chen',
  },
  {
    id: 'lungs',
    x: 45,
    y: 32,
    label: 'Thoracic RIP Band & Thermal',
    deviceBadge: '[ASTROSKIN DUAL-BAND]',
    getTelemetry: (crew) => ({
      primary: `Resp Rate: ${crew?.vitals.respRate || 14.2} br/m · Tidal Vol: 520 mL`,
      secondary: `Skin/Estimated Core Temp: ${crew?.vitals.coreTemp?.toFixed(1) || '37.1'} °C`,
    }),
    isAlert: (crew) => (crew?.vitals.respRate || 14) > 15,
  },
  {
    id: 'spine_skin',
    x: 50,
    y: 43,
    label: 'Lumbar Spine & Dermal Status',
    deviceBadge: '[3-AXIS IMU + SOLARIS VERBAL]',
    getTelemetry: (_crew, symptoms) => ({
      primary: `Trunk Posture: +3.4 cm elongation unloading`,
      secondary:
        symptoms.spineIssue || symptoms.skinIssue
          ? `VERBAL REPORT: ${symptoms.lastTranscript || 'Lumbar ache / Dermal irritation'}`
          : 'Dermal hydration nominal · No acute spinal strain',
    }),
    isAlert: (_crew, symptoms) => symptoms.spineIssue || symptoms.skinIssue,
  },
  {
    id: 'archer',
    x: 26,
    y: 52,
    label: 'Sleep & Circadian Actigraphy',
    deviceBadge: '[NASA ARCHER WRISTBAND]',
    getTelemetry: (crew) => ({
      primary: `Sleep Duration: ${crew?.vitals.sleepHours?.toFixed(1) || '6.8'} hrs`,
      secondary:
        crew?.id === 'chen'
          ? 'Circadian Desynchrony (Acute 4.6h sleep deficit)'
          : 'Circadian Readiness: 94% (High sleep efficiency)',
    }),
    isAlert: (crew) => (crew?.vitals.sleepHours || 8) < 6.0,
  },
];

export const HardwareSensorsOverlay: React.FC = () => {
  const { activeCrew, activeHotspotId, verbalSymptoms, sendInput } = useSolaris();
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  return (
    <div className="absolute inset-0 pointer-events-none z-20">
      {HARDWARE_SENSORS.map((sensor) => {
        const isActive = activeHotspotId === sensor.id;
        const isHovered = hoveredNodeId === sensor.id;
        const isAlert = sensor.isAlert?.(activeCrew, verbalSymptoms);
        const telemetry = sensor.getTelemetry(activeCrew, verbalSymptoms);

        // Highlight spine_skin specifically in amber/red when verbal symptoms reported
        const isSpineSkinAlert = sensor.id === 'spine_skin' && (verbalSymptoms.spineIssue || verbalSymptoms.skinIssue);

        const nodeColor = isSpineSkinAlert
          ? '#E0BE6A'
          : isAlert
          ? '#E58F55'
          : isActive
          ? '#B8CCE6'
          : '#ECE8E1';

        const showCallout = isActive || isHovered;

        return (
          <div
            key={sensor.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
            style={{ left: `${sensor.x}%`, top: `${sensor.y}%` }}
            onMouseEnter={() => setHoveredNodeId(sensor.id)}
            onMouseLeave={() => setHoveredNodeId(null)}
          >
            {/* Interactive Sensor Node Mark */}
            <button
              onClick={() => sendInput(`Check ${sensor.label}`)}
              className="relative group p-1.5 focus:outline-none"
            >
              {/* Outer Pulsing Concentric Radar Ring */}
              <div
                className={`absolute inset-0 rounded-full border transition-all duration-300 ${
                  isActive || isSpineSkinAlert
                    ? 'animate-ping opacity-75'
                    : 'opacity-40 group-hover:scale-125'
                }`}
                style={{ borderColor: nodeColor }}
              />

              {/* Center Glowing Sensor Core */}
              <div
                className="w-2.5 h-2.5 rounded-full border shadow-sm transition-all duration-300 relative z-10"
                style={{
                  backgroundColor: isActive || isHovered ? nodeColor : 'rgba(255,255,255,0.2)',
                  borderColor: nodeColor,
                  boxShadow: isActive || isSpineSkinAlert ? `0 0 14px ${nodeColor}` : 'none',
                }}
              />
            </button>

            {/* Hardware Telemetry Callout Card */}
            {showCallout && (
              <div
                className={`absolute z-30 min-w-[210px] max-w-[260px] p-2.5 rounded-lg border backdrop-blur-md font-mono text-left shadow-[0_4px_24px_rgba(0,0,0,0.8)] pointer-events-none transition-all duration-200 animate-in fade-in zoom-in-95 ${
                  sensor.x > 50
                    ? 'left-full ml-3 top-1/2 -translate-y-1/2'
                    : 'right-full mr-3 top-1/2 -translate-y-1/2'
                }`}
                style={{
                  backgroundColor: 'rgba(11, 16, 23, 0.94)',
                  borderColor: isSpineSkinAlert ? 'rgba(224, 190, 106, 0.6)' : isAlert ? 'rgba(229, 143, 85, 0.6)' : 'rgba(255, 255, 255, 0.2)',
                }}
              >
                {/* Hardware Device Badge */}
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span
                    className="text-[8px] font-bold tracking-wider px-1 py-0.2 rounded"
                    style={{
                      color: isSpineSkinAlert ? '#E0BE6A' : '#B8CCE6',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    }}
                  >
                    {sensor.deviceBadge}
                  </span>
                  {isSpineSkinAlert && (
                    <span className="text-[7.5px] px-1 py-0.2 rounded bg-amber-500/20 text-[#E0BE6A] font-bold">
                      VERBAL SYMPTOM
                    </span>
                  )}
                </div>

                {/* Sensor Label */}
                <div className="text-[9.5px] font-medium text-[#ECE8E1] mb-1 leading-tight">
                  {sensor.label}
                </div>

                {/* Primary Reading */}
                <div
                  className="text-[10px] font-semibold mb-0.5"
                  style={{ color: isSpineSkinAlert ? '#E0BE6A' : '#ECE8E1' }}
                >
                  {telemetry.primary}
                </div>

                {/* Secondary Physiological Meaning */}
                <div className="text-[8.5px] text-[#8D97A6] leading-tight">
                  {telemetry.secondary}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
