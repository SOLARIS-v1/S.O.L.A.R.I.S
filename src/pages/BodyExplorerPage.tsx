import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Activity,
  Heart,
  Eye,
  Zap,
  ShieldAlert,
  ChevronRight,
  Flame,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Radio,
  Lock,
  Info,
  ExternalLink
} from 'lucide-react';
import { useAstraStore } from '../api/mockClient';
import { useAstra } from '../context/AstraContext';
import { SOLARIS_ORGANS } from '../data/solarisCatalog';
import { type Status } from '../data/solarisFormat';
import { Body3D, type BodyView, type SkinMode, type Layers as BodyLayers } from '../components/body/anatomy3d/Body3D';
import { Anatomy } from '../components/body/anatomy3d/Anatomy';
import { ModelStatusBadge, type MLModelStatusType } from '../components/common/ModelStatusBadge';

interface SystemMeta {
  id: string;
  name: string;
  tag: string;
  systemKey: 'cardiovascular' | 'respiratory' | 'musculoskeletal' | 'neurological' | 'digestive' | 'renal' | 'immune' | 'ocular';
  organId: string;
  summary: string;
  spaceflightImpact: string;
  vitals: Array<{ label: string; value: string; unit?: string; status: 'nominal' | 'caution' | 'warning' }>;
  deepLinks: Array<{ label: string; to: string; icon: React.ReactNode }>;
  hazards: string[];
  mlResearch: {
    modelId: string;
    modelTitle: string;
    status: MLModelStatusType;
    endpoint: string;
    scoreOrValue: string;
    provenance: string;
    limitations: string;
  };
}

const SYSTEM_CATALOG: SystemMeta[] = [
  {
    id: 'cardiovascular',
    name: 'Cardiovascular System',
    tag: 'CVS-01',
    systemKey: 'cardiovascular',
    organId: 'heart',
    summary: 'Central myocardial pump, aortic compliance, systemic and pulmonary microcirculation.',
    spaceflightImpact: 'Cephalad fluid redistribution causes acute central hypervolemia followed by circulating plasma volume contraction (-15%), baroreceptor resetting, and progressive left ventricular remodeling.',
    vitals: [
      { label: 'Heart Rate', value: '72', unit: 'bpm', status: 'nominal' },
      { label: 'Blood Pressure', value: '120/78', unit: 'mmHg', status: 'nominal' },
      { label: 'Mean Arterial Pressure', value: '92', unit: 'mmHg', status: 'nominal' },
      { label: 'HRV (RMSSD)', value: '42', unit: 'ms', status: 'nominal' },
      { label: 'Cardiac Output', value: '4.8', unit: 'L/min', status: 'nominal' },
    ],
    deepLinks: [
      { label: 'Live Cardiovascular Monitoring', to: '/monitoring', icon: <Activity className="w-3.5 h-3.5" /> },
      { label: 'Heart Rate Diagnostic', to: '/measure/hr', icon: <Heart className="w-3.5 h-3.5" /> },
      { label: 'Blood Pressure Protocol', to: '/measure/bp', icon: <Activity className="w-3.5 h-3.5" /> },
    ],
    hazards: ['Microgravity Fluid Shift', 'Orthostatic Intolerance Post-Landing'],
    mlResearch: {
      modelId: 'cardiovascular_anomaly_detector',
      modelTitle: 'Isolation Forest Statistical Deviation',
      status: 'experimental',
      endpoint: '/api/ml/cardiovascular/analyze',
      scoreOrValue: 'Deviation Score: 0.14 (Nominal)',
      provenance: '184 epochs from 4 records; Astroskin 250Hz ECG & Cuff Telemetry',
      limitations: 'Unsupervised statistical deviation score only. Prohibited claims: Not diagnostic for arrhythmia, disease probability, or automated alarms.',
    },
  },
  {
    id: 'respiratory',
    name: 'Respiratory & Gas Exchange',
    tag: 'PULM-02',
    systemKey: 'respiratory',
    organId: 'lungs',
    summary: 'Pulmonary ventilation, alveolar-capillary O2/CO2 diffusion, acid-base homeostasis.',
    spaceflightImpact: 'Ventilation-perfusion matching improves without hydrostatic gravity gradients, but closed spacecraft ECLSS carries acute vulnerability to ambient CO2 spikes and particulate lung irritation.',
    vitals: [
      { label: 'Blood Oxygen (SpO2)', value: '98.4', unit: '%', status: 'nominal' },
      { label: 'Respiratory Rate', value: '14.2', unit: 'br/min', status: 'nominal' },
      { label: 'Alveolar pO2', value: '104', unit: 'mmHg', status: 'nominal' },
      { label: 'Cabin ppCO2', value: '2.1', unit: 'mmHg', status: 'nominal' },
    ],
    deepLinks: [
      { label: 'Respiratory Telemetry', to: '/monitoring', icon: <Activity className="w-3.5 h-3.5" /> },
      { label: 'Oxygen Saturation Protocol', to: '/measure/spo2', icon: <Activity className="w-3.5 h-3.5" /> },
      { label: 'Respiratory Rate Assessment', to: '/measure/resp', icon: <Activity className="w-3.5 h-3.5" /> },
    ],
    hazards: ['Cabin Elevated ppCO2', 'Trace Aerosol Irritants'],
    mlResearch: {
      modelId: 'physical_performance_model',
      modelTitle: 'Constructed Performance Predictor',
      status: 'quarantined',
      endpoint: '/api/ml/status',
      scoreOrValue: 'Quarantined / Disabled',
      provenance: 'Direct RIP chest expansion band & forehead optical PPG',
      limitations: 'Quarantined due to constructed target formula reusing predictor features. Direct physical respiratory measurements used exclusively.',
    },
  },
  {
    id: 'musculoskeletal',
    name: 'Musculoskeletal & Skeletal',
    tag: 'MSK-03',
    systemKey: 'musculoskeletal',
    organId: 'musculo',
    summary: 'Axial skeleton, trabecular mineral reservoir, myofibril contractile biomechanics.',
    spaceflightImpact: 'Absence of axial gravity loading causes cancellous bone demineralization (~1.0% to 1.5% bone mineral density loss monthly at lumbar spine and femoral neck) alongside postural slow-twitch type-I myofiber atrophy.',
    vitals: [
      { label: 'ARED Compliance', value: '96', unit: '%', status: 'nominal' },
      { label: 'Lumbar BMD Delta', value: '-0.8', unit: '%/mo', status: 'caution' },
      { label: 'Lean Muscle Mass', value: '64.2', unit: 'kg', status: 'nominal' },
      { label: 'Resistive Load Work', value: '48.5', unit: 'kJ', status: 'nominal' },
    ],
    deepLinks: [
      { label: 'ARED Resistive Countermeasures', to: '/exercise', icon: <Zap className="w-3.5 h-3.5" /> },
      { label: 'Body Mass Tracking', to: '/measure/mass', icon: <Activity className="w-3.5 h-3.5" /> },
    ],
    hazards: ['Trabecular Osteopenia', 'Postural Muscle Atrophy'],
    mlResearch: {
      modelId: 'ocular_bone_observations',
      modelTitle: 'Bone Mineral Density Observational Passthrough',
      status: 'observational',
      endpoint: '/api/ml/bone/observations',
      scoreOrValue: 'T-Score: -0.8 (Lumbar Spine)',
      provenance: 'Caller-supplied DXA / QCT baseline surrogate scan',
      limitations: 'Observational passthrough only. Does not classify osteopenia risk tiers or predict longitudinal fractures.',
    },
  },
  {
    id: 'neurological',
    name: 'Neurological & Cognitive',
    tag: 'NEURO-04',
    systemKey: 'neurological',
    organId: 'brain',
    summary: 'Cranial executive cortex, neurovestibular balance integration, sleep architecture.',
    spaceflightImpact: 'Elevated intracranial venous pressure and loss of postural hydrostatic gradients alter cerebral perfusion, vestibular microgravity adaptation produces transient space motion sickness (SMS), and cabin confinement impacts neurobehavioral performance.',
    vitals: [
      { label: 'Reaction Latency', value: '228', unit: 'ms', status: 'nominal' },
      { label: 'Sleep Efficiency', value: '88', unit: '%', status: 'nominal' },
      { label: 'Sleep Duration', value: '7.2', unit: 'hrs', status: 'nominal' },
      { label: 'Circadian Amplitude', value: '0.84', unit: 'index', status: 'nominal' },
    ],
    deepLinks: [
      { label: 'Psychomotor Vigilance Test', to: '/measure/reaction', icon: <Zap className="w-3.5 h-3.5" /> },
      { label: 'Sleep Architecture Log', to: '/measure/sleep', icon: <Activity className="w-3.5 h-3.5" /> },
      { label: 'Cognitive Health Assessment', to: '/check-in', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    ],
    hazards: ['Space Motion Sickness (SMS)', 'Sleep Fragmentation & Confinement'],
    mlResearch: {
      modelId: 'sleep_recovery_model',
      modelTitle: 'Sleep Recovery Predictive Engine',
      status: 'quarantined',
      endpoint: '/api/ml/sleep/analytics',
      scoreOrValue: 'Quarantined (Target Leakage)',
      provenance: 'NASA Archer actigraphy wristband + PVT 10-minute vigilance tests',
      limitations: 'Predictive regression quarantined because input variables mathematically construct target. Direct polysomnography proxies displayed.',
    },
  },
  {
    id: 'digestive',
    name: 'Digestive & Metabolic',
    tag: 'MET-05',
    systemKey: 'digestive',
    organId: 'metabolism',
    summary: 'Gastrointestinal motility, hepatic metabolism, caloric balance, core thermoregulation.',
    spaceflightImpact: 'Upward cephalad shift of intra-abdominal organs can delay gastric emptying and alter gut microbiome diversity; microgravity space anemia and altered nutrient absorption require tight dietary macronutrient monitoring.',
    vitals: [
      { label: 'Fasting Blood Glucose', value: '94', unit: 'mg/dL', status: 'nominal' },
      { label: 'Daily Caloric Target', value: '2,750', unit: 'kcal', status: 'nominal' },
      { label: 'Core Temperature', value: '37.1', unit: '°C', status: 'nominal' },
      { label: 'GI Motility Index', value: 'Nominal', status: 'nominal' },
    ],
    deepLinks: [
      { label: 'Nutrition & Metabolic Ledger', to: '/measure/nutrition', icon: <Activity className="w-3.5 h-3.5" /> },
      { label: 'Core Temperature Protocol', to: '/measure/temp', icon: <Activity className="w-3.5 h-3.5" /> },
    ],
    hazards: ['Microbiome Alteration', 'Spaceflight Microgravity Anemia'],
    mlResearch: {
      modelId: 'plasma_proteomics_model',
      modelTitle: 'Plasma Proteomics Stress Predictor',
      status: 'quarantined',
      endpoint: '/api/ml/metabolic/analytics',
      scoreOrValue: 'Quarantined (Unvalidated Generalization)',
      provenance: 'Capillary blood sensor + Astroskin chest heat-flux thermistor',
      limitations: '15-sample pilot dataset insufficient to establish clinical generalization. Direct capillary glucose & core temperature logged.',
    },
  },
  {
    id: 'renal',
    name: 'Renal & Fluid Regulation',
    tag: 'REN-06',
    systemKey: 'renal',
    organId: 'kidneys',
    summary: 'Glomerular filtration, electrolyte balance, blood volume regulation, calcium excretion.',
    spaceflightImpact: 'Accelerated bone calcium resorption combined with reduced fluid intake elevates urinary calcium concentration, significantly increasing nephrolithiasis (kidney stone) formation risk in long-duration microgravity.',
    vitals: [
      { label: 'Daily Fluid Intake', value: '2.8', unit: 'L', status: 'nominal' },
      { label: 'Urine Specific Gravity', value: '1.018', status: 'nominal' },
      { label: 'Serum Electrolytes', value: '140 / 4.2', unit: 'mmol/L', status: 'nominal' },
      { label: 'Nephrolithiasis Risk', value: 'Low', status: 'nominal' },
    ],
    deepLinks: [
      { label: 'Hydration Protocol', to: '/measure/hydration', icon: <Activity className="w-3.5 h-3.5" /> },
      { label: 'Daily Assessment Log', to: '/check-in', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    ],
    hazards: ['Nephrolithiasis (Kidney Stones)', 'Hypovolemia on Gravity Re-entry'],
    mlResearch: {
      modelId: 'stress_circadian_model',
      modelTitle: 'Endocrine Stress Response Model',
      status: 'quarantined',
      endpoint: '/api/ml/status',
      scoreOrValue: 'Quarantined (Negative R²)',
      provenance: 'Daily fluid log + electrolyte balance sensor',
      limitations: 'Quarantined due to negative out-of-sample R². Questionnaire and physiological values kept strictly segregated.',
    },
  },
  {
    id: 'immune',
    name: 'Immune & Lymphatic',
    tag: 'IMM-07',
    systemKey: 'immune',
    organId: 'immune',
    summary: 'Adaptive and innate immunity, splenic filtration, lymphatic drainage, radiation surveillance.',
    spaceflightImpact: 'Deep space galactic cosmic radiation (GCR) exposure, persistent psychological confinement, and altered sleep architecture produce progressive T-cell dysregulation and heightened subclinical viral reactivation (Epstein-Barr, VZV).',
    vitals: [
      { label: 'Cumulative Dose', value: '54.8', unit: 'mSv', status: 'nominal' },
      { label: 'Daily Radiation Rate', value: '0.38', unit: 'mSv/d', status: 'nominal' },
      { label: 'WBC Surrogate', value: '6.4', unit: '10³/µL', status: 'nominal' },
      { label: 'Viral Reactivation', value: 'Negative', status: 'nominal' },
    ],
    deepLinks: [
      { label: 'Radiation Exposure Intelligence', to: '/environment', icon: <Radio className="w-3.5 h-3.5" /> },
      { label: 'Immune Symptoms Log', to: '/measure/symptoms', icon: <ShieldAlert className="w-3.5 h-3.5" /> },
    ],
    hazards: ['Galactic Cosmic Radiation (GCR)', 'Subclinical Latent Viral Reactivation'],
    mlResearch: {
      modelId: 'immune_trajectory_pca',
      modelTitle: 'Immune Repertoire PCA Trajectory',
      status: 'exploratory',
      endpoint: '/api/ml/immune/analytics',
      scoreOrValue: 'PCA Coords: [1.24, -0.42]',
      provenance: 'High-dimensional log2 fold change genomic / cytokine profiles',
      limitations: 'Exploratory dimensionality reduction projection only. Prohibited claims: Not diagnostic for immune recovery, viral risk, or infection status.',
    },
  },
  {
    id: 'ocular',
    name: 'Ocular & Visual Field',
    tag: 'OCU-08',
    systemKey: 'ocular',
    organId: 'eyes',
    summary: 'Globe morphology, macula/fovea centralis, optic nerve sheath, retinal nerve fiber layer.',
    spaceflightImpact: 'Microgravity cephalad venous fluid redistribution causes elevated retrobulbar optic nerve sheath pressure, optic disc edema, globe flattening, choroidal folds, and hyperopic refractive shifts (SANS).',
    vitals: [
      { label: 'Amsler Field Score', value: '0 (Nominal)', status: 'nominal' },
      { label: 'Estimated IOP', value: '16.4', unit: 'mmHg', status: 'nominal' },
      { label: 'Near Visual Acuity', value: '20/20 OS • 20/20 OD', status: 'nominal' },
      { label: 'Retrobulbar ONSD', value: '5.3', unit: 'mm', status: 'nominal' },
    ],
    deepLinks: [
      { label: 'Clinical Amsler Eye Screening', to: '/vision', icon: <Eye className="w-3.5 h-3.5" /> },
      { label: 'Vision Measurement Protocol', to: '/measure/vision', icon: <Eye className="w-3.5 h-3.5" /> },
    ],
    hazards: ['Spaceflight-Associated Neuro-ocular Syndrome (SANS)', 'Hyperopic Refractive Shift'],
    mlResearch: {
      modelId: 'ocular_bone_observations',
      modelTitle: 'Retrobulbar ONSD Observational Passthrough',
      status: 'observational',
      endpoint: '/api/ml/ocular/observations',
      scoreOrValue: 'ONSD: 5.3 mm (OS/OD)',
      provenance: 'High-frequency B-scan ocular ultrasound surrogate',
      limitations: 'Caller-supplied observation only. Does not classify SANS risk tiers, optic-disc edema, or treatment protocols.',
    },
  },
];

export const BodyExplorerPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeSubjectId, crew, findings } = useAstraStore();
  const { activeCrew, sendInput } = useAstra();
  const activeAstronaut = crew.find((c) => c.id === activeSubjectId) || crew[0];

  const [selectedOrganId, setSelectedOrganId] = useState<string | null>('heart');
  const [hoveredOrganId, setHoveredOrganId] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<BodyView>('anatomy');
  const [skinMode, setSkinMode] = useState<SkinMode>('muscles');
  const [layers] = useState<BodyLayers>({ skeleton: true, organs: true });

  const [is3DMode, setIs3DMode] = useState<boolean>(true);
  const [webGLSupported, setWebGLSupported] = useState<boolean>(true);

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      setWebGLSupported(!!gl);
    } catch (e) {
      setWebGLSupported(false);
      setIs3DMode(false);
    }
  }, []);

  const organStatus = useMemo((): Record<string, Status> => {
    const map: Record<string, Status> = {
      heart: 'ok',
      lungs: 'ok',
      musculo: 'ok',
      brain: 'ok',
      metabolism: 'ok',
      kidneys: 'ok',
      immune: 'ok',
      eyes: 'ok',
    };

    const subjectFindings = findings.filter((f) => f.subject_id === activeSubjectId);
    for (const f of subjectFindings) {
      const level = f.level;
      const st: Status = level === 'urgent' ? 'act' : level === 'review' || level === 'watch' ? 'watch' : 'ok';
      if (f.body_region === 'heart') map.heart = st;
      if (f.body_region === 'lungs') map.lungs = st;
      if (f.body_region === 'skeleton') map.musculo = st;
      if (f.body_region === 'head') map.brain = st;
      if (f.body_region === 'abdomen') map.metabolism = st;
      if (f.body_region === 'eyes') map.eyes = st;
      if (f.body_region === 'immune') map.immune = st;
    }
    return map;
  }, [findings, activeSubjectId]);

  const activeMeta = useMemo(() => {
    if (!selectedOrganId) return null;
    return SYSTEM_CATALOG.find((s) => s.organId === selectedOrganId) || null;
  }, [selectedOrganId]);

  const activeFindings = useMemo(() => {
    if (!activeMeta) return [];
    return findings.filter(
      (f) =>
        f.subject_id === activeSubjectId &&
        (f.body_region === (activeMeta.organId === 'musculo' ? 'skeleton' : activeMeta.organId === 'brain' ? 'head' : activeMeta.organId))
    );
  }, [findings, activeSubjectId, activeMeta]);

  const handleSelectSystem = (organId: string | null) => {
    setSelectedOrganId(organId);
    if (organId) {
      const meta = SYSTEM_CATALOG.find((s) => s.organId === organId);
      if (meta) {
        sendInput?.(`Inspecting ${meta.name}`);
      }
    }
  };

  const heartRate = activeCrew?.vitals?.heartRate || 72;
  const breathRate = activeCrew?.vitals?.respRate || 14;

  return (
    <div className="w-full h-[calc(100vh-68px)] flex flex-col bg-[#F4F7FC] text-slate-800 overflow-hidden select-none font-sans">
      {/* Top Cockpit Header: System Selector Strip + Controls */}
      <div className="px-5 py-3 bg-white border-b border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-3 shrink-0 z-20">
        {/* 8 Organ Systems Pill Selector Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={() => handleSelectSystem(null)}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono tracking-wider border transition-all shrink-0 ${
              selectedOrganId === null
                ? 'bg-indigo-600 text-white font-bold shadow-sm border-indigo-600'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border-slate-200/80'
            }`}
          >
            WHOLE BODY
          </button>

          {SYSTEM_CATALOG.map((sys) => {
            const isSelected = selectedOrganId === sys.organId;
            const status = organStatus[sys.organId] || 'ok';
            return (
              <button
                key={sys.id}
                onClick={() => handleSelectSystem(isSelected ? null : sys.organId)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono tracking-wider border transition-all shrink-0 ${
                  isSelected
                    ? 'bg-indigo-600 text-white font-bold shadow-sm border-indigo-600'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border-slate-200/80'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    status === 'act'
                      ? 'bg-rose-500 animate-ping'
                      : status === 'watch'
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                />
                <span>{sys.name.split(' ')[0].toUpperCase()}</span>
                <span className={`text-[10px] ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>{sys.tag}</span>
              </button>
            );
          })}
        </div>

        {/* Right Controls: Layer Toggles + View Mode + 3D/2D */}
        <div className="flex items-center gap-2 font-mono text-xs">
          {/* Layer Mode Toggle (Muscles / Skeletal / X-Ray) */}
          <div className="flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200">
            {(['muscles', 'skeletal', 'xray'] as SkinMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setSkinMode(mode)}
                className={`px-2.5 py-1 rounded-lg text-[11px] capitalize transition-all ${
                  skinMode === mode
                    ? 'bg-white text-slate-900 font-bold shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {mode === 'xray' ? 'X-Ray' : mode}
              </button>
            ))}
          </div>

          {/* View Mode Toggle: Natural vs Status */}
          <div className="flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200">
            <button
              onClick={() => setViewMode('anatomy')}
              className={`px-2.5 py-1 rounded-lg text-[11px] transition-all ${
                viewMode === 'anatomy'
                  ? 'bg-white text-slate-900 font-bold shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Natural
            </button>
            <button
              onClick={() => setViewMode('status')}
              className={`px-2.5 py-1 rounded-lg text-[11px] transition-all ${
                viewMode === 'status'
                  ? 'bg-white text-slate-900 font-bold shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Status Tints
            </button>
          </div>

          {/* 3D vs 2D Toggle */}
          <button
            onClick={() => setIs3DMode(!is3DMode)}
            disabled={!webGLSupported}
            title={!webGLSupported ? 'WebGL is not available on this browser' : 'Toggle 3D WebGL vs 2D Vector'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] transition-all ${
              is3DMode
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-semibold'
                : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 shadow-sm'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>{is3DMode ? '3D VIEW' : '2D VECTOR'}</span>
          </button>
        </div>
      </div>

      {/* Main Body Workspace: Viewport + Right Inspector Panel */}
      <div className="flex-1 w-full h-full relative flex flex-col lg:flex-row overflow-hidden">
        {/* Anatomical Stage */}
        <div className="flex-1 h-full relative overflow-hidden flex items-center justify-center bg-gradient-to-b from-[#EAEFF8] via-[#F4F7FC] to-[#EAEFF8]">
          {is3DMode && webGLSupported ? (
            <div className="w-full h-full relative select-none">
              <Body3D
                organs={SOLARIS_ORGANS}
                organStatus={organStatus}
                grey={{}}
                focus={selectedOrganId}
                hover={hoveredOrganId}
                view={viewMode}
                layers={layers}
                skinMode={skinMode}
                heartRate={heartRate}
                breathRate={breathRate}
                crewName={activeAstronaut.name}
                onSelect={(id) => handleSelectSystem(id)}
                onHover={(id) => setHoveredOrganId(id)}
              />

              {/* Viewport Overlay HUD */}
              <div className="absolute top-4 left-4 pointer-events-none z-10 flex flex-col gap-1 font-mono text-[11px] text-slate-500 bg-white/80 backdrop-blur-md p-3 rounded-2xl border border-slate-200/80 shadow-sm">
                <div className="flex items-center gap-2 text-slate-900 font-bold tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>3D ANATOMICAL DIGITAL TWIN</span>
                </div>
                <div>Model: BodyParts3D 4.0 (astra-anatomy.glb)</div>
                <div>Heart Rate: {heartRate} bpm • Breathing: {breathRate}/min</div>
              </div>

              {/* Reset Camera View Button */}
              {selectedOrganId && (
                <div className="absolute bottom-4 left-4 z-10">
                  <button
                    onClick={() => handleSelectSystem(null)}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700 shadow-md transition-all font-semibold"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Full Body Framing</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-full relative flex items-center justify-center p-4 overflow-auto">
              <div className="max-w-xl w-full h-full flex flex-col items-center justify-center">
                <div className="mb-2 text-xs font-mono text-slate-500 flex items-center gap-2">
                  <span>2D VECTOR SCHEMATIC FALLBACK</span>
                  <span>•</span>
                  <span>Interactive System Mapping</span>
                </div>
                <div className="relative w-full max-h-[85vh] flex items-center justify-center">
                  <Anatomy
                    organs={SOLARIS_ORGANS}
                    organStatus={organStatus}
                    selected={selectedOrganId}
                    hover={hoveredOrganId}
                    view={viewMode}
                    layers={layers}
                    onSelect={(id) => handleSelectSystem(id)}
                    onHover={(id) => setHoveredOrganId(id)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right-Hand Telemetry & System Findings Inspector Panel */}
        <div className="w-full lg:w-96 shrink-0 h-full bg-white border-t lg:border-t-0 lg:border-l border-slate-200/80 flex flex-col justify-between overflow-y-auto z-10 font-sans shadow-sm">
          {activeMeta ? (
            <div className="p-5 space-y-4 animate-fadeIn">
              {/* System Header */}
              <div className="border-b border-slate-100 pb-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold">
                    {activeMeta.tag}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        organStatus[activeMeta.organId] === 'act'
                          ? 'bg-rose-500'
                          : organStatus[activeMeta.organId] === 'watch'
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                    />
                    <span className="text-xs font-mono uppercase font-semibold text-slate-600">
                      {organStatus[activeMeta.organId] === 'act'
                        ? 'Critical Attention'
                        : organStatus[activeMeta.organId] === 'watch'
                        ? 'Under Observation'
                        : 'Nominal Homeostasis'}
                    </span>
                  </div>
                </div>

                <h2 className="text-lg font-bold text-slate-900 mt-1 tracking-tight font-sans">
                  {activeMeta.name}
                </h2>
                <p className="text-xs text-slate-600 leading-relaxed mt-1">
                  {activeMeta.summary}
                </p>
              </div>

              {/* Research ML Observational / Deviation Section */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 space-y-2 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-indigo-900 tracking-wider">
                    RESEARCH ML OBSERVATION
                  </span>
                  <ModelStatusBadge status={activeMeta.mlResearch.status} modelId={activeMeta.mlResearch.modelId} />
                </div>

                <div className="flex items-baseline justify-between pt-1">
                  <span className="text-xs font-bold text-slate-900">{activeMeta.mlResearch.modelTitle}</span>
                  <span className="text-xs font-bold text-indigo-700">{activeMeta.mlResearch.scoreOrValue}</span>
                </div>

                <div className="text-[10px] text-slate-600 space-y-1 pt-1 border-t border-indigo-100">
                  <div>
                    <strong className="text-slate-800">Endpoint: </strong>
                    <code className="text-indigo-600 font-semibold">{activeMeta.mlResearch.endpoint}</code>
                  </div>
                  <div>
                    <strong className="text-slate-800">Provenance: </strong>
                    <span>{activeMeta.mlResearch.provenance}</span>
                  </div>
                  <div>
                    <strong className="text-slate-800">Limitations: </strong>
                    <span className="text-slate-500">{activeMeta.mlResearch.limitations}</span>
                  </div>
                </div>
              </div>

              {/* Spaceflight Physiology Impact */}
              <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/60 space-y-1">
                <div className="text-[11px] font-mono text-amber-900 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-600" />
                  <span>Microgravity Adaptation</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {activeMeta.spaceflightImpact}
                </p>
              </div>

              {/* Associated Live Telemetry Values */}
              <div className="space-y-2">
                <div className="text-xs font-mono font-bold text-slate-900 uppercase tracking-wider">
                  Associated Telemetry Values
                </div>

                <div className="grid grid-cols-2 gap-2 font-mono">
                  {activeMeta.vitals.map((v, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-0.5"
                    >
                      <div className="text-[10px] text-slate-500 truncate">{v.label}</div>
                      <div className="text-sm font-bold text-slate-900 flex items-baseline gap-1">
                        <span>{v.value}</span>
                        {v.unit && <span className="text-[10px] text-slate-500">{v.unit}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Clinical Findings */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-500 uppercase tracking-wider">
                  <span>Active Clinical Findings</span>
                  <span>{activeFindings.length} Active</span>
                </div>

                {activeFindings.length === 0 ? (
                  <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-mono text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>No active findings or alerts for this organ system.</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeFindings.map((f) => (
                      <div
                        key={f.id}
                        className="p-3 rounded-2xl bg-rose-50 border border-rose-200 space-y-1 font-mono text-xs"
                      >
                        <div className="flex items-center justify-between font-bold text-rose-950">
                          <span>{f.summary}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-600 text-white font-bold">
                            {f.level.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-700">{f.detail}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Spaceflight Hazards Associated */}
              <div className="space-y-1.5 font-mono text-xs">
                <div className="text-slate-500 font-bold uppercase tracking-wider text-[10.5px]">
                  Associated Spaceflight Hazards
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {activeMeta.hazards.map((h, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-0.5 rounded-xl bg-slate-100 border border-slate-200 text-[10.5px] text-slate-700 font-medium"
                    >
                      {h}
                    </span>
                  ))}
                </div>
              </div>

              {/* Deep Links to Health Modules */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="text-xs font-mono font-bold text-slate-900 uppercase tracking-wider">
                  Deep Links to Health Modules
                </div>

                <div className="space-y-1.5">
                  {activeMeta.deepLinks.map((link, idx) => (
                    <button
                      key={idx}
                      onClick={() => navigate(link.to)}
                      className="w-full flex items-center justify-between px-3.5 py-2 rounded-2xl bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 hover:border-indigo-200 text-xs font-mono text-indigo-700 transition-all group"
                    >
                      <div className="flex items-center gap-2.5">
                        {link.icon}
                        <span className="font-semibold">{link.label}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 h-full flex flex-col items-center justify-center text-center space-y-4 font-mono text-xs text-slate-500">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
                <Box className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="text-sm font-bold text-slate-900">Full Body Overview</div>
                <p className="max-w-xs text-xs leading-relaxed text-slate-600">
                  Select an organ system from the top selector or click directly on any anatomical structure to inspect telemetry and research ML findings.
                </p>
              </div>

              <div className="pt-4 grid grid-cols-2 gap-2 w-full text-left">
                {SYSTEM_CATALOG.slice(0, 4).map((sys) => (
                  <button
                    key={sys.id}
                    onClick={() => handleSelectSystem(sys.organId)}
                    className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 hover:border-indigo-300 text-[11px] text-slate-800 transition-colors shadow-sm"
                  >
                    <div className="font-bold text-slate-900">{sys.name}</div>
                    <div className="text-[10px] text-slate-500">{sys.tag}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Bottom Astronaut Identity Strip */}
          <div className="p-3.5 border-t border-slate-200/80 bg-slate-50 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-slate-900 font-semibold">{activeAstronaut.name}</span>
            </div>
            <span className="text-slate-500">Sol 142 Transit</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BodyExplorerPage;
