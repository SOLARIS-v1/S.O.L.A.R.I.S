import React from 'react';
import { useSolaris } from '../../context/SolarisContext';
import { Heart, Activity, Wind, Thermometer, Radio } from 'lucide-react';
import { SystemStatusDials } from './SystemStatusDials';

export const BiometricTelemetryPanel: React.FC = () => {
  const { activeCrew, activeHotspotId } = useSolaris();

  const vitals = activeCrew?.vitals || {
    heartRate: 78,
    hrv: 42,
    spo2: 98.4,
    respRate: 14.2,
    coreTemp: 37.1,
    radiation_mSv: 54.8,
    sleepHours: 6.8,
  };

  const isVance = activeCrew?.id === 'vance';
  const isChen = activeCrew?.id === 'chen';

  const cards = [
    {
      key: 'heart',
      label: 'HEART RATE',
      value: vitals.heartRate,
      unit: 'BPM',
      status: isVance ? 'CAUTION' : isChen ? 'WARNING' : 'NOMINAL',
      badgeClass: isVance
        ? 'border-[#E0BE6A]/40 text-[#E0BE6A] bg-[#E0BE6A]/10'
        : isChen
        ? 'border-[#E58F55]/40 text-[#E58F55] bg-[#E58F55]/10'
        : 'border-white/20 text-[#ECE8E1] bg-white/[0.03]',
      icon: Heart,
      delta: isVance ? 'ECTOPIC JUMPS DETECTED' : isChen ? 'AUTONOMIC STRAIN (+12%)' : 'RESTING SINUS NOMINAL',
      sparkline: isVance
        ? [72, 74, 94, 96, 76, 75, 95, 96, 74, 76]
        : isChen
        ? [82, 84, 86, 88, 87, 88, 89, 88, 88, 88]
        : [62, 63, 64, 64, 65, 64, 63, 64, 64, 64],
    },
    {
      key: 'archer',
      label: 'HEART VARIABILITY',
      value: vitals.hrv,
      unit: 'MS',
      status: isVance || isChen ? 'CAUTION' : 'NOMINAL',
      badgeClass: isVance || isChen
        ? 'border-[#E0BE6A]/40 text-[#E0BE6A] bg-[#E0BE6A]/10'
        : 'border-white/20 text-[#ECE8E1] bg-white/[0.03]',
      icon: Activity,
      delta: isVance ? 'TREND: -15% (DIP)' : isChen ? 'TREND: -22% (ACUTE DEFICIT)' : 'BASELINE STABLE (62ms)',
      sparkline: isVance
        ? [52, 48, 44, 41, 39, 38, 40, 38, 38, 38]
        : isChen
        ? [46, 42, 39, 36, 35, 35, 34, 35, 35, 35]
        : [60, 61, 62, 62, 63, 62, 61, 62, 62, 62],
    },
    {
      key: 'headband',
      label: 'OXYGEN SATURATION',
      value: vitals.spo2.toFixed(1),
      unit: '%',
      status: 'NOMINAL',
      badgeClass: 'border-white/20 text-[#ECE8E1] bg-white/[0.03]',
      icon: Wind,
      delta: 'ASTROSKIN PPG STABLE',
      sparkline: [98, 98.2, 98.4, 98.4, 98.5, 98.4, 98.4, 98.4, 98.4, vitals.spo2],
    },
    {
      key: 'lungs',
      label: 'CORE TEMPERATURE',
      value: vitals.coreTemp.toFixed(1),
      unit: '°C',
      status: 'NOMINAL',
      badgeClass: 'border-white/20 text-[#ECE8E1] bg-white/[0.03]',
      icon: Thermometer,
      delta: `RESP: ${vitals.respRate} BR/M (DUAL-BAND)`,
      sparkline: [36.8, 36.9, 37.0, 37.0, 37.1, 37.1, 37.1, 37.1, 37.1, vitals.coreTemp],
    },
    {
      key: 'dosimeter',
      label: 'CUMULATIVE RADIATION',
      value: vitals.radiation_mSv.toFixed(1),
      unit: 'MSV',
      status: vitals.radiation_mSv > 50 ? 'CAUTION' : 'NOMINAL',
      badgeClass: vitals.radiation_mSv > 50
        ? 'border-[#E0BE6A]/40 text-[#E0BE6A] bg-[#E0BE6A]/10'
        : 'border-white/20 text-[#ECE8E1] bg-white/[0.03]',
      icon: Radio,
      delta: 'HERA RATE: 0.12 MSV/D',
      sparkline: [48, 49, 50, 51, 52, 53, 53.5, 54, 54.5, vitals.radiation_mSv],
    },
  ];

  return (
    <aside className="w-full h-full flex flex-col justify-between p-2.5 lg:p-3 select-none overflow-hidden font-mono bg-[#111827]">
      {/* Header */}
      <div className="flex items-center justify-between pb-1.5 hairline-b flex-shrink-0 mb-2">
        <span className="text-[10px] font-mono tracking-instrument text-[#F9FAFB] uppercase font-bold">
          BIOMETRIC TELEMETRY
        </span>
        <span className="text-[9px] font-mono text-[#94A3B8] uppercase">LIVE STREAM</span>
      </div>

      {/* Holistic Overall Health Score Radial Graph */}
      <SystemStatusDials compact className="mb-2 shrink-0" />

      {/* 5 Hardware Cards Stacked */}
      <div className="space-y-1.5 flex-1 flex flex-col justify-between overflow-y-auto py-1 scrollbar-thin">
        {cards.map((card) => {
          const isHighlighted = activeHotspotId === card.key;
          const IconComp = card.icon;

          return (
            <div
              key={card.key}
              className={`p-2 rounded-lg border transition-all duration-200 relative overflow-hidden flex-1 flex flex-col justify-between ${
                isHighlighted
                  ? 'border-orange-500/60 bg-orange-500/10 shadow-sm'
                  : 'border-white/[0.08] hover:border-white/20 bg-[#172030]/60'
              }`}
            >
              {/* Top row: Icon + Label + Badge */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <IconComp className="w-3.5 h-3.5 text-[#ECE8E1]" strokeWidth={1.25} />
                  <span className="text-[9px] font-mono tracking-instrument text-[#8D97A6] uppercase">
                    {card.label}
                  </span>
                </div>

                <span className={`px-1.5 py-0.2 rounded text-[8px] font-mono border ${card.badgeClass}`}>
                  {card.status}
                </span>
              </div>

              {/* Value and Sparkline Row */}
              <div className="flex items-center justify-between my-0.5">
                <div className="flex items-baseline gap-1 font-mono">
                  <span className="text-xl lg:text-2xl font-bold tracking-tight text-[#F9FAFB]">
                    {card.value}
                  </span>
                  <span className="text-[10px] text-[#94A3B8]">{card.unit}</span>
                </div>

                {/* Sparkline curve */}
                <div className="w-20 h-4">
                  <svg viewBox="0 0 80 18" className="w-full h-full overflow-visible">
                    <polyline
                      fill="none"
                      stroke={isHighlighted ? '#F97316' : '#94A3B8'}
                      strokeWidth="1.5"
                      points={card.sparkline
                        .map((val, idx) => {
                          const min = Math.min(...card.sparkline);
                          const max = Math.max(...card.sparkline);
                          const range = max - min || 1;
                          const x = (idx / (card.sparkline.length - 1)) * 80;
                          const y = 16 - ((val - min) / range) * 14;
                          return `${x.toFixed(1)},${y.toFixed(1)}`;
                        })
                        .join(' ')}
                      opacity="0.9"
                    />
                  </svg>
                </div>
              </div>

              {/* Trend / Hardware Device Note */}
              <div className="text-[8.5px] font-mono text-[#64748B]">
                {card.delta}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};
