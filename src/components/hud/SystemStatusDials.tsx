import React from 'react';
import { useSolaris } from '../../context/SolarisContext';
import { Heart, Moon, Activity, ShieldCheck, AlertCircle, CheckCircle2, HelpCircle } from 'lucide-react';

interface SystemStatusDialsProps {
  compact?: boolean;
  className?: string;
}

type StatusLevel = 'nominal' | 'watch' | 'review' | 'no_data';

interface SystemState {
  id: string;
  name: string;
  icon: React.ElementType;
  level: StatusLevel;
  label: string;
  metricSummary: string;
}

export const SystemStatusDials: React.FC<SystemStatusDialsProps> = ({
  compact = false,
  className = '',
}) => {
  const { activeCrew, verbalSymptoms } = useSolaris();
  const vitals = activeCrew?.vitals;

  // 1. Cardiovascular
  let cardioLevel: StatusLevel = 'no_data';
  let cardioLabel = 'No data';
  let cardioMetric = 'No data';

  if (vitals?.heartRate !== undefined && vitals.heartRate !== null) {
    cardioMetric = `${vitals.heartRate} BPM`;
    if (vitals.heartRate > 95 || (vitals.hrv !== undefined && vitals.hrv !== null && vitals.hrv < 40)) {
      cardioLevel = 'review';
      cardioLabel = 'Review';
    } else if (vitals.heartRate > 85) {
      cardioLevel = 'watch';
      cardioLabel = 'Watch';
    } else {
      cardioLevel = 'nominal';
      cardioLabel = 'Nominal';
    }
  }

  // 2. Recovery / Sleep
  let recoveryLevel: StatusLevel = 'no_data';
  let recoveryLabel = 'No data';
  let recoveryMetric = 'No data';

  if (vitals?.sleepHours !== undefined && vitals.sleepHours !== null) {
    recoveryMetric = `${vitals.sleepHours} hrs`;
    if (vitals.sleepHours < 5 || verbalSymptoms?.sleepIssue) {
      recoveryLevel = 'review';
      recoveryLabel = 'Deficit';
    } else if (vitals.sleepHours < 6.5) {
      recoveryLevel = 'watch';
      recoveryLabel = 'Watch';
    } else {
      recoveryLevel = 'nominal';
      recoveryLabel = 'Nominal';
    }
  } else if (verbalSymptoms?.sleepIssue) {
    recoveryLevel = 'watch';
    recoveryLabel = 'Reported';
    recoveryMetric = 'Sleep concern';
  }

  // 3. Metabolic / Respiration
  let metabolicLevel: StatusLevel = 'no_data';
  let metabolicLabel = 'No data';
  let metabolicMetric = 'No data';

  if (vitals?.coreTemp !== undefined && vitals.coreTemp !== null) {
    metabolicMetric = `${vitals.coreTemp}°C`;
    if (vitals.coreTemp > 37.8 || (vitals.respRate && vitals.respRate > 20)) {
      metabolicLevel = 'review';
      metabolicLabel = 'Elevated';
    } else if (vitals.coreTemp > 37.2 || (vitals.respRate && vitals.respRate > 16)) {
      metabolicLevel = 'watch';
      metabolicLabel = 'Watch';
    } else {
      metabolicLevel = 'nominal';
      metabolicLabel = 'Nominal';
    }
  }

  // 4. Structural / Musculoskeletal
  let structuralLevel: StatusLevel = 'nominal';
  let structuralLabel = 'Nominal';
  let structuralMetric = 'Stable';

  if (verbalSymptoms?.spineIssue) {
    structuralLevel = 'watch';
    structuralLabel = 'Strain';
    structuralMetric = 'Spinal shift';
  } else if (activeCrew?.id === 'chen') {
    structuralLevel = 'watch';
    structuralLabel = 'Watch';
    structuralMetric = 'Unloading';
  }

  const systems: SystemState[] = [
    { id: 'cardio', name: 'Cardiovascular', icon: Heart, level: cardioLevel, label: cardioLabel, metricSummary: cardioMetric },
    { id: 'recovery', name: 'Recovery', icon: Moon, level: recoveryLevel, label: recoveryLabel, metricSummary: recoveryMetric },
    { id: 'metabolic', name: 'Metabolic', icon: Activity, level: metabolicLevel, label: metabolicLabel, metricSummary: metabolicMetric },
    { id: 'structural', name: 'Structural', icon: ShieldCheck, level: structuralLevel, label: structuralLabel, metricSummary: structuralMetric },
  ];

  const getStyle = (lvl: StatusLevel) => {
    switch (lvl) {
      case 'nominal':
        return {
          bg: 'bg-emerald-50/80 border-emerald-200/80 text-emerald-700',
          dot: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]',
          badge: 'bg-emerald-100 text-emerald-800',
        };
      case 'watch':
        return {
          bg: 'bg-amber-50/80 border-amber-200/80 text-amber-700',
          dot: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]',
          badge: 'bg-amber-100 text-amber-800',
        };
      case 'review':
        return {
          bg: 'bg-rose-50/80 border-rose-200/80 text-rose-700',
          dot: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]',
          badge: 'bg-rose-100 text-rose-800',
        };
      case 'no_data':
      default:
        return {
          bg: 'bg-slate-50 border-slate-200 text-slate-500',
          dot: 'bg-slate-400',
          badge: 'bg-slate-100 text-slate-600',
        };
    }
  };

  if (compact) {
    return (
      <div className={`grid grid-cols-2 gap-2 ${className}`}>
        {systems.map((sys) => {
          const style = getStyle(sys.level);
          const Icon = sys.icon;
          return (
            <div
              key={sys.id}
              className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${style.bg}`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${style.dot}`} />
                <Icon className="w-4 h-4 opacity-80" />
                <span className="text-xs font-semibold">{sys.name}</span>
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${style.badge}`}>
                {sys.label}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`p-4 bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-[6px_6px_16px_rgba(163,177,198,0.25),-6px_-6px_16px_rgba(255,255,255,0.9)] ${className}`}>
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Autonomous System Status</h3>
          <p className="text-[11px] text-slate-400">Clinical decision support telemetry triage</p>
        </div>
        <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
          Grounded Telemetry
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {systems.map((sys) => {
          const style = getStyle(sys.level);
          const Icon = sys.icon;
          return (
            <div
              key={sys.id}
              className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${style.bg}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-1.5 rounded-lg bg-white/80 shadow-sm">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${style.dot}`} />
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${style.badge}`}>
                    {sys.label}
                  </span>
                </div>
              </div>

              <div>
                <div className="text-[11px] font-medium text-slate-500">{sys.name}</div>
                <div className="text-xs font-bold text-slate-800 mt-0.5">{sys.metricSummary}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
