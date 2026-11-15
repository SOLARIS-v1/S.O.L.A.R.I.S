import React, { useState } from 'react';
import {
  Activity,
  Clock,
  BookOpen,
  TrendingUp,
  TrendingDown,
  Sparkles,
  ShieldCheck,
  Lock,
  Eye,
  Zap,
  Info,
  ShieldAlert,
  Layers
} from 'lucide-react';
import { AstronautHealthTimeline } from '../components/timeline/AstronautHealthTimeline';
import { HealthGuidanceCentre } from '../components/guidance/HealthGuidanceCentre';
import { ModelStatusBadge, type MLModelStatusType } from '../components/common/ModelStatusBadge';

export const AnalyticsPage: React.FC = () => {
  const [subTab, setSubTab] = useState<'trends' | 'timeline' | 'guidance'>('trends');
  const [filter, setFilter] = useState<'24H' | '7D' | '30D' | '90D'>('7D');

  const hrData = [
    { day: 'Day 136', val: 72 },
    { day: '137', val: 74 },
    { day: '138', val: 77 },
    { day: '139', val: 75 },
    { day: '140', val: 78 },
    { day: '141', val: 84 },
    { day: '142', val: 86 },
  ];

  const sleepData = [
    { day: '136', val: 7.8 },
    { day: '137', val: 7.4 },
    { day: '138', val: 6.8 },
    { day: '139', val: 7.2 },
    { day: '140', val: 6.9 },
    { day: '141', val: 5.6 },
    { day: '142', val: 5.3 },
  ];

  const researchModels = [
    {
      id: 'cardiovascular_anomaly_detector',
      name: 'Cardiovascular Anomaly Detector',
      type: 'Isolation Forest',
      status: 'experimental' as MLModelStatusType,
      currentValue: 'Score: 0.14 (Nominal)',
      basis: '184 epochs from 4 records; unsupervised statistical deviation score only.',
      limitations: 'Prohibited claims: Not diagnostic for arrhythmia, disease probability, or clinical alerts.',
      dataQuality: 'High Quality (250Hz ECG & Brachial Cuff)',
    },
    {
      id: 'immune_trajectory_pca',
      name: 'Immune Repertoire Trajectory',
      type: 'PCA Projection',
      status: 'exploratory' as MLModelStatusType,
      currentValue: 'Coords: [1.24, -0.42]',
      basis: 'High-dimensional log2 fold change genomic / cytokine profiles.',
      limitations: 'Exploratory projection only. Prohibited claims: Not diagnostic for recovery state or risk.',
      dataQuality: 'Batch Normalised Transcriptomics',
    },
    {
      id: 'radiation_dosimetry_engine',
      name: 'Radiation Dosimetry Engine',
      type: 'Deterministic Physical Dosimetry',
      status: 'observational' as MLModelStatusType,
      currentValue: '0.38 mGy/d (Absorbed)',
      basis: 'Physical absorbed dose requiring explicit non-negative daily measurement.',
      limitations: 'Absorbed dose in mGy. Does not claim universal regulatory compliance without full spectrum.',
      dataQuality: 'NASA CAD Active Dosimeter Array',
    },
    {
      id: 'ocular_bone_observations',
      name: 'Ocular & Bone Observation Engine',
      type: 'Observational Passthrough',
      status: 'observational' as MLModelStatusType,
      currentValue: 'ONSD 5.3mm • T-score -0.8',
      basis: 'Caller-supplied B-scan ultrasound and DXA surrogate measurements.',
      limitations: 'Observational only. Strictly avoids SANS risk tiers, optic-disc edema, or bone loss forecasts.',
      dataQuality: 'Direct Ultrasound / Clinical Review',
    },
    {
      id: 'sleep_recovery_model',
      name: 'Sleep Recovery Regression Model',
      type: 'Random Forest Regressor',
      status: 'quarantined' as MLModelStatusType,
      currentValue: 'QUARANTINED',
      basis: 'Quarantined due to target leakage (TST & time-in-bed mathematically define efficiency target).',
      limitations: 'Disabled by SOLARIS scientific governance policy. Direct polysomnography proxies displayed.',
      dataQuality: 'Target Leakage Quarantine',
    },
    {
      id: 'stress_circadian_model',
      name: 'Circadian Stress Predictor',
      type: 'Endocrine Regressor',
      status: 'quarantined' as MLModelStatusType,
      currentValue: 'QUARANTINED',
      basis: 'Quarantined due to negative predictive R² score in out-of-sample evaluation.',
      limitations: 'Disabled. Measured biomarkers and self-report scales kept strictly independent.',
      dataQuality: 'Negative R² Quarantine',
    },
    {
      id: 'plasma_proteomics_model',
      name: 'Plasma Proteomics Stress Model',
      type: 'Classifier',
      status: 'quarantined' as MLModelStatusType,
      currentValue: 'QUARANTINED',
      basis: 'Quarantined because 100% training accuracy across N=4 astronaut cohort lacks generalization.',
      limitations: 'Disabled. Direct capillary glucose & core thermometry reported without synthetic classification.',
      dataQuality: 'Unvalidated Cohort Quarantine',
    },
    {
      id: 'physical_performance_model',
      name: 'Physical Workload Predictor',
      type: 'Regression Model',
      status: 'quarantined' as MLModelStatusType,
      currentValue: 'QUARANTINED',
      basis: 'Quarantined because constructed target formula reuses predictor features.',
      limitations: 'Disabled. Direct ARED resistive load and cycle ergometer telemetry used exclusively.',
      dataQuality: 'Constructed Target Quarantine',
    },
  ];

  return (
    <div className="w-full h-full max-w-7xl mx-auto flex flex-col justify-between p-3 lg:p-6 select-none font-sans text-slate-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-slate-200/80 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-[#5850EC] shadow-sm">
            <Activity className="w-5 h-5" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-slate-900 uppercase font-mono">
              Health Analytics & ML Research Governance
            </h1>
            <p className="text-xs text-slate-500 font-mono">
              Physiological Trends, Unified Timeline & Authoritative Model Registry
            </p>
          </div>
        </div>

        {/* Sub-Tab Navigation Pills */}
        <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200/80 shadow-inner">
          <button
            onClick={() => setSubTab('trends')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
              subTab === 'trends'
                ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>TRENDS & ML</span>
          </button>
          <button
            onClick={() => setSubTab('timeline')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
              subTab === 'timeline'
                ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>TIMELINE</span>
          </button>
          <button
            onClick={() => setSubTab('guidance')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
              subTab === 'guidance'
                ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>GUIDANCE</span>
          </button>
        </div>

        {/* Time Filter Pills */}
        {subTab === 'trends' && (
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
            {(['24H', '7D', '30D', '90D'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                  filter === t
                    ? 'bg-gradient-to-r from-indigo-600 to-[#5850EC] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tab 1: Trends & Patterns */}
      {subTab === 'trends' && (
        <div className="flex-1 flex flex-col justify-between space-y-5">
          {/* Upper Grid: 2 Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-h-[230px]">
            {/* Heart Rate Trend Line Chart */}
            <div className="p-4 rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_16px_rgba(0,0,0,0.04)] flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
                  Heart Rate Trend (7-Day Rolling)
                </span>
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="text-slate-500 font-semibold">Avg: 76 bpm</span>
                  <span className="text-rose-600 font-bold flex items-center gap-0.5">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>+2.4%</span>
                  </span>
                </div>
              </div>

              {/* Line Chart Canvas / SVG */}
              <div className="w-full flex-1 relative flex items-center min-h-[130px]">
                <svg viewBox="0 0 320 120" className="w-full h-full overflow-visible">
                  <text x="0" y="15" fill="#94A3B8" fontSize="9" fontWeight="600" fontFamily="monospace">90</text>
                  <text x="0" y="45" fill="#94A3B8" fontSize="9" fontWeight="600" fontFamily="monospace">80</text>
                  <text x="0" y="75" fill="#94A3B8" fontSize="9" fontWeight="600" fontFamily="monospace">70</text>
                  <text x="0" y="105" fill="#94A3B8" fontSize="9" fontWeight="600" fontFamily="monospace">60</text>

                  <line x1="20" y1="12" x2="310" y2="12" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="20" y1="42" x2="310" y2="42" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="20" y1="72" x2="310" y2="72" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="20" y1="102" x2="310" y2="102" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="3 3" />

                  <polygon
                    fill="rgba(88, 80, 236, 0.08)"
                    points="30,72 75,66 120,57 165,63 210,54 255,36 300,30 300,102 30,102"
                  />

                  <polyline
                    fill="none"
                    stroke="#5850EC"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points="30,72 75,66 120,57 165,63 210,54 255,36 300,30"
                  />

                  {[
                    { x: 30, y: 72 },
                    { x: 75, y: 66 },
                    { x: 120, y: 57 },
                    { x: 165, y: 63 },
                    { x: 210, y: 54 },
                    { x: 255, y: 36 },
                    { x: 300, y: 30 },
                  ].map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#5850EC" stroke="#FFFFFF" strokeWidth="1.5" />
                  ))}
                </svg>
              </div>

              <div className="flex justify-between pl-6 text-[10px] text-slate-500 font-mono font-medium mt-1">
                {hrData.map((d) => (
                  <span key={d.day}>{d.day}</span>
                ))}
              </div>
            </div>

            {/* Sleep Duration Bar Chart */}
            <div className="p-4 rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_16px_rgba(0,0,0,0.04)] flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
                  Sleep Duration (Daily Hours)
                </span>
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="text-slate-500 font-semibold">Avg: 6.8 h</span>
                  <span className="text-amber-600 font-bold flex items-center gap-0.5">
                    <TrendingDown className="w-3.5 h-3.5" />
                    <span>-12%</span>
                  </span>
                </div>
              </div>

              <div className="w-full flex-1 relative flex items-center min-h-[130px]">
                <svg viewBox="0 0 320 120" className="w-full h-full overflow-visible">
                  <text x="0" y="15" fill="#94A3B8" fontSize="9" fontWeight="600" fontFamily="monospace">10h</text>
                  <text x="0" y="38" fill="#94A3B8" fontSize="9" fontWeight="600" fontFamily="monospace">8h</text>
                  <text x="0" y="60" fill="#94A3B8" fontSize="9" fontWeight="600" fontFamily="monospace">6h</text>
                  <text x="0" y="82" fill="#94A3B8" fontSize="9" fontWeight="600" fontFamily="monospace">4h</text>
                  <text x="0" y="105" fill="#94A3B8" fontSize="9" fontWeight="600" fontFamily="monospace">2h</text>

                  <line x1="20" y1="12" x2="310" y2="12" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="20" y1="58" x2="310" y2="58" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="20" y1="102" x2="310" y2="102" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="3 3" />

                  {[
                    { x: 30, h: 78 },
                    { x: 75, h: 74 },
                    { x: 120, h: 68 },
                    { x: 165, h: 72 },
                    { x: 210, h: 69 },
                    { x: 255, h: 56 },
                    { x: 300, h: 53 },
                  ].map((b, i) => (
                    <rect
                      key={i}
                      x={b.x - 9}
                      y={102 - b.h * 0.9}
                      width="18"
                      height={b.h * 0.9}
                      rx="4"
                      fill={i >= 5 ? '#F59E0B' : '#5850EC'}
                      opacity={i >= 5 ? 0.9 : 0.8}
                    />
                  ))}
                </svg>
              </div>

              <div className="flex justify-between pl-6 text-[10px] text-slate-500 font-mono font-medium mt-1">
                {sleepData.map((d) => (
                  <span key={d.day}>Sol {d.day}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Research ML Model Governance & Scientific Provenance Matrix */}
          <div className="p-5 rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_16px_rgba(0,0,0,0.04)] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-100 gap-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
                  SOLARIS Research ML Model Registry & Scientific Provenance
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                Authoritative Package: <code className="text-indigo-600 font-bold">solaris_ml v2.0</code>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
              {researchModels.map((m) => (
                <div
                  key={m.id}
                  className="p-3.5 rounded-xl border border-slate-200/70 bg-slate-50/70 flex flex-col justify-between space-y-2 hover:bg-white hover:border-indigo-200 transition-all shadow-sm"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">{m.type}</span>
                      <ModelStatusBadge status={m.status} modelId={m.id} />
                    </div>
                    <div className="font-bold text-slate-900 text-xs truncate" title={m.name}>
                      {m.name}
                    </div>
                    <div className="text-[11px] font-extrabold text-indigo-700">
                      {m.currentValue}
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-500 space-y-1 pt-1.5 border-t border-slate-200/60 leading-tight">
                    <p className="line-clamp-2" title={m.basis}><strong className="text-slate-700">Basis: </strong>{m.basis}</p>
                    <p className="line-clamp-2 text-slate-400" title={m.limitations}><strong className="text-slate-600">Limitations: </strong>{m.limitations}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Chronological Health Timeline */}
      {subTab === 'timeline' && (
        <div className="flex-1 overflow-y-auto pr-1">
          <AstronautHealthTimeline />
        </div>
      )}

      {/* Tab 3: Dedicated Health Guidance Centre */}
      {subTab === 'guidance' && (
        <div className="flex-1 overflow-y-auto pr-1">
          <HealthGuidanceCentre />
        </div>
      )}
    </div>
  );
};

export default AnalyticsPage;
