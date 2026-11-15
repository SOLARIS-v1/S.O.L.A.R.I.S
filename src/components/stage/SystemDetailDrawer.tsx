import React from 'react';
import { BodyRegion, Finding, HealthRecord, IndicatorType, FindingLevel } from '../../api/types';
import { INDICATOR_THRESHOLDS } from '../../data/thresholds';
import { computeBaseline, computeRobustZScore } from '../../mock/engine';
import { BODY_SYSTEMS } from '../../data/nasaCatalog';
import { X, ExternalLink, Activity, ShieldCheck, AlertCircle, Info, Stethoscope } from 'lucide-react';

interface SystemDetailDrawerProps {
  region: BodyRegion | string | null;
  records: HealthRecord[];
  findings: Finding[];
  onClose: () => void;
  onOpenHazard: (hazardId: string) => void;
}

const STATUS_COLORS: Record<FindingLevel, string> = {
  normal: '#059669', // emerald-600
  watch: '#D97706',  // amber-600
  review: '#EA580C', // orange-600
  urgent: '#DC2626', // red-600
};

const SYSTEM_SENSOR_MAP: Record<string, { device: string; location: string; note: string }> = {
  cardiovascular: {
    device: 'Astroskin 3-Lead Thoracic ECG',
    location: 'Chest anterior thorax (T2-T6 dermatomes)',
    note: 'Physical sensor location is thoracic ECG; measures systemic hemodynamics and myocardial rhythm.',
  },
  heart: {
    device: 'Astroskin 3-Lead Thoracic ECG',
    location: 'Chest anterior thorax',
    note: 'Direct thoracic electrodes capture ventricular depolarization and autonomic HRV.',
  },
  respiratory: {
    device: 'Astroskin Dual-Band Inductive Plethysmography (RIP)',
    location: 'Ribcage and abdominal expansion bands',
    note: 'Physical sensor bands measure thoracic expansion; assesses alveolar gas exchange and ppCO2.',
  },
  lungs: {
    device: 'Astroskin Dual-Band RIP + Forehead PPG',
    location: 'Thorax and Forehead',
    note: 'Sensor records respiratory excursion and arterial oxygen saturation.',
  },
  musculoskeletal: {
    device: '3-Axis Trunk IMU + ARED Telemetry + Verbal Check-In',
    location: 'Lumbar spine belt (L3-L5) and ARED load sensors',
    note: 'IMU detects trunk elongation; ARED load cells record axial skeleton resistance.',
  },
  skeleton: {
    device: '3-Axis Trunk IMU + ARED Telemetry',
    location: 'Lumbar vertebrae and exercise harness',
    note: 'Monitors axial posture elongation and musculoskeletal fatigue recovery.',
  },
  neurological: {
    device: 'NASA Archer Actigraphy Wristband + Forehead Optical PPG',
    location: 'Non-dominant wrist and frontal bone',
    note: 'Physical wrist actigraphy assesses circadian phase; PPG captures cephalad fluid shift.',
  },
  head: {
    device: 'Astroskin Headband Optical PPG + Actiwatch',
    location: 'Forehead and Wrist',
    note: 'Measures cranial pulse transit time and sleep-wake cycles.',
  },
  immune: {
    device: 'HERA Radiation Dosimeter + Astroskin Skin Thermistor',
    location: 'Habitat / Suit torso clip and Axilla',
    note: 'Physical dosimeter detects ionizing radiation; thermistor monitors core thermal regulation.',
  },
  abdomen: {
    device: 'Continuous Capillary Bio-Monitor + Verbal Log',
    location: 'Upper abdominal strap',
    note: 'Monitors metabolic response and gastrointestinal adaptation to microgravity diet.',
  },
};

export const SystemDetailDrawer: React.FC<SystemDetailDrawerProps> = ({
  region,
  records,
  findings,
  onClose,
  onOpenHazard,
}) => {
  if (!region) return null;

  const regionKey = region.toLowerCase();
  const systemMeta =
    BODY_SYSTEMS[regionKey] ||
    BODY_SYSTEMS.cardiovascular;

  const sensorInfo = SYSTEM_SENSOR_MAP[regionKey] || SYSTEM_SENSOR_MAP.cardiovascular;

  // Indicators associated with this system
  const indicators: IndicatorType[] = systemMeta.metrics as IndicatorType[];

  // Filter findings for this system
  const systemFindings = findings.filter(
    (f) =>
      f.body_region === region ||
      indicators.some((i) => f.indicators.includes(i))
  );

  const highestLevel: FindingLevel = systemFindings.reduce<FindingLevel>((acc, curr) => {
    const order: FindingLevel[] = ['normal', 'watch', 'review', 'urgent'];
    return order.indexOf(curr.level) > order.indexOf(acc) ? curr.level : acc;
  }, 'normal');

  return (
    <aside
      className="fixed top-11 right-0 bottom-0 w-84 lg:w-[420px] bg-white/95 backdrop-blur-2xl border-l border-slate-200/80 shadow-2xl z-40 flex flex-col justify-between p-4 lg:p-5 overflow-y-auto select-none font-mono text-slate-800 animate-in slide-in-from-right duration-300"
      aria-label="System Detail Drawer"
    >
      <div>
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
          <div className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{
                backgroundColor: STATUS_COLORS[highestLevel],
                boxShadow: `0 0 8px ${STATUS_COLORS[highestLevel]}80`,
              }}
            />
            <div>
              <h2 className="text-xs font-bold tracking-wider text-slate-900 uppercase">
                {systemMeta.name}
              </h2>
              <span className="text-[9px] text-slate-500 font-semibold">{systemMeta.code}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Physical Sensor Distinction Banner */}
        <div className="p-2.5 my-3 rounded-lg bg-indigo-50/60 border border-indigo-100 text-[9.5px]">
          <div className="flex items-center gap-1.5 text-indigo-700 font-semibold mb-1">
            <Info className="w-3.5 h-3.5" />
            <span>PHYSICAL SENSOR LOCATION & HARDWARE</span>
          </div>
          <p className="text-slate-900 font-semibold">{sensorInfo.device}</p>
          <p className="text-slate-600 mt-0.5">{sensorInfo.location}</p>
          <p className="text-[8.5px] text-slate-500 italic mt-1">{sensorInfo.note}</p>
        </div>

        {/* Spaceflight Clinical Relevance */}
        <div className="p-2.5 mb-3 rounded-lg bg-slate-50 border border-slate-200/80 text-[10px] leading-relaxed">
          <span className="text-[8.5px] text-slate-500 uppercase tracking-wider block font-semibold mb-1">
            SPACEFLIGHT PHYSIOLOGICAL CONSIDERATIONS
          </span>
          <p className="text-slate-700">{systemMeta.spaceflightRelevance}</p>
        </div>

        {/* Active Telemetry & Baseline Comparisons */}
        <div className="space-y-2 mb-4">
          <span className="text-[9px] text-slate-500 uppercase tracking-wider block font-semibold">
            SYSTEM TELEMETRY & PERSONAL BASELINES
          </span>

          {indicators.map((ind) => {
            const indRecords = records.filter((r) => r.type === ind);
            const latest = indRecords[indRecords.length - 1];
            const baseline = computeBaseline(records, ind);
            const zScore = latest && baseline.is_established ? computeRobustZScore(latest.value, baseline) : null;
            const threshold = INDICATOR_THRESHOLDS[ind];

            return (
              <div
                key={ind}
                className="p-2.5 rounded-lg border border-slate-200/80 bg-white hover:bg-slate-50/80 shadow-sm transition-colors"
              >
                <div className="flex items-center justify-between text-[9px] mb-1">
                  <span className="text-slate-600 uppercase font-medium">
                    {threshold?.label || ind.replace('_', ' ')}
                  </span>
                  <span className="text-slate-400 text-[8px]">
                    {latest?.timestamp ? new Date(latest.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'RECENT'}
                  </span>
                </div>

                <div className="flex items-baseline justify-between">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-bold text-slate-900">
                      {latest ? (Number.isInteger(latest.value) ? latest.value : latest.value.toFixed(1)) : '--'}
                    </span>
                    <span className="text-[10px] text-slate-500">{threshold?.unit || ''}</span>
                  </div>

                  {/* Personal Baseline Comparison */}
                  <div className="text-right text-[8.5px]">
                    {baseline.is_established ? (
                      <div>
                        <span className="text-slate-500">
                          Baseline: {baseline.median.toFixed(1)} {threshold?.unit}
                        </span>
                        {zScore !== null && (
                          <span
                            className={`ml-1.5 font-bold ${
                              Math.abs(zScore) >= 2.0
                                ? 'text-rose-600'
                                : Math.abs(zScore) >= 1.0
                                ? 'text-amber-600'
                                : 'text-emerald-600'
                            }`}
                          >
                            ({zScore > 0 ? '+' : ''}{zScore.toFixed(1)}σ)
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">
                        Personal baseline not yet established
                      </span>
                    )}
                  </div>
                </div>

                {/* Trend sparkline if data points exist */}
                {indRecords.length > 2 && (
                  <div className="w-full h-3 mt-1.5 opacity-80">
                    <svg viewBox="0 0 100 12" className="w-full h-full overflow-visible">
                      <polyline
                        fill="none"
                        stroke="#4F46E5"
                        strokeWidth="1.5"
                        points={indRecords.slice(-10).map((r, idx, arr) => {
                          const min = Math.min(...arr.map((x) => x.value));
                          const max = Math.max(...arr.map((x) => x.value));
                          const range = max - min || 1;
                          const x = (idx / (arr.length - 1)) * 100;
                          const y = 10 - ((r.value - min) / range) * 8;
                          return `${x.toFixed(1)},${y.toFixed(1)}`;
                        }).join(' ')}
                      />
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Active Medical Findings */}
        {systemFindings.length > 0 && (
          <div className="mb-4">
            <span className="text-[9px] text-slate-500 uppercase tracking-wider block font-semibold mb-1.5">
              ACTIVE CLINICAL FINDINGS ({systemFindings.length})
            </span>
            <div className="space-y-1.5">
              {systemFindings.map((f) => (
                <div
                  key={f.id}
                  className="p-2 rounded-lg border text-[9.5px] shadow-sm"
                  style={{
                    borderColor: `${STATUS_COLORS[f.level]}40`,
                    backgroundColor: `${STATUS_COLORS[f.level]}0D`,
                  }}
                >
                  <div className="flex items-center justify-between font-bold mb-0.5">
                    <span style={{ color: STATUS_COLORS[f.level] }}>{f.summary}</span>
                    <span className="text-[8px] uppercase tracking-wider font-bold" style={{ color: STATUS_COLORS[f.level] }}>{f.level}</span>
                  </div>
                  <p className="text-slate-700 leading-snug">{f.detail}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommended Countermeasures & Guidance */}
        <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/50 text-[10px] mb-4 shadow-sm">
          <div className="flex items-center gap-1.5 text-emerald-700 font-bold mb-1">
            <Stethoscope className="w-3.5 h-3.5" />
            <span>APPROVED FLIGHT GUIDANCE</span>
          </div>
          <p className="text-slate-700 leading-relaxed">{systemMeta.recommendedGuidance}</p>
        </div>
      </div>

      {/* Footer Citations */}
      <div className="pt-3 border-t border-slate-200/80 text-[8.5px] text-slate-500">
        <span className="block font-semibold uppercase mb-0.5 text-slate-600">NASA Approved Standards:</span>
        {systemMeta.approvedSources.map((src, i) => (
          <div key={i} className="truncate">· {src}</div>
        ))}
      </div>
    </aside>
  );
};
