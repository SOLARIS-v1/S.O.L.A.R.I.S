import React from 'react';
import { BodyRegion, Finding, HealthRecord, IndicatorType, FindingLevel } from '../../api/types';
import { INDICATOR_THRESHOLDS } from '../../data/thresholds';
import { computeBaseline, computeRobustZScore } from '../../mock/engine';
import { X, ExternalLink, Activity } from 'lucide-react';

interface SystemDetailDrawerProps {
  region: BodyRegion | null;
  records: HealthRecord[];
  findings: Finding[];
  onClose: () => void;
  onOpenHazard: (hazardId: string) => void;
}

const STATUS_COLORS: Record<FindingLevel, string> = {
  normal: '#6FBF9B',
  watch: '#E0BE6A',
  review: '#E58F55',
  urgent: '#DE6A64',
};

export const SystemDetailDrawer: React.FC<SystemDetailDrawerProps> = ({
  region,
  records,
  findings,
  onClose,
  onOpenHazard,
}) => {
  if (!region) return null;

  const configMap: Record<
    string,
    { title: string; indicators: IndicatorType[]; hazardId: string; rationale: string; countermeasure: string }
  > = {
    head: {
      title: 'NEUROBEHAVIORAL',
      indicators: ['sleep', 'mood', 'fatigue'],
      hazardId: 'isolation',
      rationale:
        'Circadian misalignment and operational isolation diminish cognitive fidelity. Recovery sleep is vital for crew executive function.',
      countermeasure: 'Adhere to scheduled 8-hour dark sleep block. Use 480nm blue light exposure 30 min post-wake.',
    },
    eyes: {
      title: 'OCULAR & VISUAL',
      indicators: ['blood_pressure_sys'],
      hazardId: 'gravity',
      rationale:
        'Cephalad fluid redistribution elevates intracranial pressure and causes optic disc edema. Microgravity impairs ocular venous return.',
      countermeasure: 'Conduct weekly optical coherence tomography. Apply lower body negative pressure (LBNP) sessions.',
    },
    heart: {
      title: 'CARDIOVASCULAR',
      indicators: ['heart_rate', 'blood_pressure_sys', 'blood_pressure_dia', 'hrv'],
      hazardId: 'gravity',
      rationale:
        'Absence of hydrostatic pressure reduces circulating plasma volume and leads to myocardial deconditioning. Baroreceptor reflex sensitivity decreases.',
      countermeasure: 'Perform 30-min high-intensity aerobic cycling. Maintain oral electrolyte rehydration protocol.',
    },
    lungs: {
      title: 'CARDIOPULMONARY',
      indicators: ['spo2', 'respiratory_rate'],
      hazardId: 'environment',
      rationale:
        'Closed habitability air loops are susceptible to partial pressure CO2 pockets. Hypoxia and hypercapnia degrade decision reaction time.',
      countermeasure: 'Verify cabin ECLSS ppCO2 < 2.5 mmHg. Inspect personal cabin ventilation diffuser flow.',
    },
    abdomen: {
      title: 'METABOLIC & NUTRITION',
      indicators: ['glucose'],
      hazardId: 'environment',
      rationale:
        'Microgravity alters nutrient absorption, glucose tolerance, and gut microbiome balance. Stable metabolism supports physical workload.',
      countermeasure: 'Ensure macronutrient caloric target compliance. Supplement Vitamin D3 and dietary polyphenols.',
    },
    skeleton: {
      title: 'MUSCULOSKELETAL',
      indicators: ['fatigue'],
      hazardId: 'gravity',
      rationale:
        'Lack of axial loading triggers progressive bone mineral density loss and postural slow-twitch muscle atrophy. Lumbar spine elongation occurs.',
      countermeasure: 'Execute prescribed ARED heavy resistive loading (deadlifts, squats) at 85% 1-rep maximum.',
    },
    immune: {
      title: 'IMMUNE & THERMAL',
      indicators: ['temperature', 'heart_rate', 'radiation_rate'],
      hazardId: 'radiation',
      rationale:
        'Deep space galactic cosmic radiation and confinement provoke subclinical immune dysregulation. Elevated temperature warrants active surveillance.',
      countermeasure: 'Verify passive radiation dosimeter badge. Administer prophylactic micronutrient antioxidant regimen.',
    },
    arm: {
      title: 'INTEGUMENTARY SENSORS',
      indicators: ['spo2', 'heart_rate', 'temperature'],
      hazardId: 'environment',
      rationale:
        'Dermal microflora shifts and garment contact friction can alter dry electrode contact impedance. Sensor integrity is continuous.',
      countermeasure: 'Cleanse AstroSkin dry-contact electrodes every 48 hours. Inspect dermal contact sites for erythema.',
    },
  };

  const sysConfig = configMap[region] || {
    title: region.toUpperCase(),
    indicators: ['heart_rate'],
    hazardId: 'gravity',
    rationale: 'Active subsystem telemetry monitored under standard NASA flight envelope.',
    countermeasure: 'Continue baseline physiological tracking.',
  };

  // Check recent findings for this system
  const systemFindings = findings.filter(
    (f) => f.body_region === region || sysConfig.indicators.some((i) => f.indicators.includes(i))
  );

  const highestLevel: FindingLevel = systemFindings.reduce<FindingLevel>((acc, curr) => {
    const order: FindingLevel[] = ['normal', 'watch', 'review', 'urgent'];
    return order.indexOf(curr.level) > order.indexOf(acc) ? curr.level : acc;
  }, 'normal');

  return (
    <aside
      className="fixed top-12 right-0 bottom-0 w-80 lg:w-96 bg-[#0B1017]/95 backdrop-blur-xl border-l border-white/10 z-30 flex flex-col justify-between p-5 overflow-y-auto animate-in slide-in-from-right duration-300"
      aria-label="System Detail Drawer"
    >
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 hairline-b">
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor: STATUS_COLORS[highestLevel],
                boxShadow: `0 0 6px ${STATUS_COLORS[highestLevel]}`,
              }}
            />
            <h2 className="text-xs font-mono tracking-instrument text-[#ECE8E1] font-medium">
              {sysConfig.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#8D97A6] hover:text-[#ECE8E1] hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" strokeWidth={1.25} />
          </button>
        </div>

        {/* 2-Sentence Rationale */}
        <div className="my-4">
          <p className="text-xs text-[#8D97A6] leading-relaxed">
            {sysConfig.rationale}
          </p>
        </div>

        {/* Spaceflight Hazard Citation Link */}
        <div className="p-3 rounded bg-white/[0.02] border border-white/5 my-3">
          <div className="flex items-center justify-between text-[10px] font-mono tracking-instrument text-[#5B6573] uppercase mb-1">
            <span>NASA HRP HAZARD</span>
            <button
              onClick={() => onOpenHazard(sysConfig.hazardId)}
              className="flex items-center gap-1 text-[#B8CCE6] hover:underline"
            >
              <span>DETAILS</span>
              <ExternalLink className="w-2.5 h-2.5" strokeWidth={1.25} />
            </button>
          </div>
          <p className="text-xs font-medium text-[#ECE8E1]">
            {sysConfig.hazardId === 'isolation'
              ? 'Isolation & Confinement'
              : sysConfig.hazardId === 'radiation'
              ? 'Space Radiation'
              : sysConfig.hazardId === 'environment'
              ? 'Hostile Closed Environment'
              : 'Altered Gravity Fields'}
          </p>
        </div>

        {/* Telemetry Charts for Subsystem Indicators */}
        <div className="space-y-4 my-5">
          <h3 className="text-[10px] font-mono tracking-instrument text-[#5B6573] uppercase">
            SUBSYSTEM TELEMETRY (14D)
          </h3>

          {sysConfig.indicators.map((ind) => {
            const threshold = INDICATOR_THRESHOLDS[ind];
            const indRecords = records
              .filter((r) => r.type === ind)
              .slice(-14);
            const values = indRecords.map((r) => r.value);
            const latest = values[values.length - 1];
            const baseline = computeBaseline(records, ind);
            const zScore = latest !== undefined ? computeRobustZScore(latest, baseline) : 0;

            const minVal = Math.min(...values, threshold?.normal_range[0] || 0);
            const maxVal = Math.max(...values, threshold?.normal_range[1] || 100);
            const range = maxVal - minVal || 1;

            const width = 280;
            const height = 40;
            const padding = 4;
            const getY = (val: number) =>
              height - padding - ((val - minVal) / range) * (height - padding * 2);

            const points = values
              .map((val, idx) => {
                const x = padding + (idx / Math.max(values.length - 1, 1)) * (width - padding * 2);
                const y = getY(val);
                return `${x.toFixed(1)},${y.toFixed(1)}`;
              })
              .join(' ');

            return (
              <div key={ind} className="p-3 rounded bg-white/[0.02] border border-white/5">
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-[11px] font-mono text-[#8D97A6] uppercase tracking-wider">
                    {threshold?.label || ind}
                  </span>
                  <div className="flex items-baseline gap-1 font-mono">
                    <span className="text-base text-[#ECE8E1] font-light">
                      {latest !== undefined ? latest.toFixed(ind === 'temperature' ? 1 : 0) : '—'}
                    </span>
                    <span className="text-[10px] text-[#5B6573]">{threshold?.unit}</span>
                  </div>
                </div>

                {/* SVG Chart with 1.25px stroke & shaded baseline band */}
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-10 overflow-visible">
                  {/* Baseline Band */}
                  {baseline.is_established && (
                    <rect
                      x={padding}
                      y={getY(baseline.median + baseline.mad)}
                      width={width - padding * 2}
                      height={Math.max(
                        getY(baseline.median - baseline.mad) - getY(baseline.median + baseline.mad),
                        2
                      )}
                      fill="#B8CCE6"
                      opacity="0.08"
                    />
                  )}

                  {/* 1.25px Data Stroke */}
                  {points && (
                    <polyline
                      fill="none"
                      stroke="#ECE8E1"
                      strokeWidth="1.25"
                      points={points}
                      opacity="0.85"
                    />
                  )}
                </svg>

                {/* Baseline & Deviation Note */}
                <div className="flex items-center justify-between text-[10px] font-mono text-[#5B6573] mt-1">
                  <span>BASELINE: {baseline.median.toFixed(0)} {threshold?.unit}</span>
                  <span className={Math.abs(zScore) > 2 ? 'text-[#E0BE6A]' : ''}>
                    DEV: {zScore > 0 ? `+${zScore.toFixed(1)}σ` : `${zScore.toFixed(1)}σ`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Countermeasure Guidance */}
        <div className="p-3 rounded bg-white/[0.02] border border-white/5 my-3">
          <span className="text-[10px] font-mono tracking-instrument text-[#5B6573] uppercase block mb-1">
            OPERATIONAL COUNTERMEASURE
          </span>
          <p className="text-xs text-[#8D97A6] leading-relaxed">
            {sysConfig.countermeasure}
          </p>
        </div>
      </div>

      {/* Footer Disclaimer */}
      <div className="pt-3 hairline-t text-[10px] font-mono text-[#5B6573]">
        Prototype decision support, not a medical device.
      </div>
    </aside>
  );
};
