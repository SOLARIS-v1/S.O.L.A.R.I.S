// SOLARIS Orbital Medical Intelligence — Health Monitoring Page
// Implements Cardiovascular (ECG & RR), Blood Pressure (MAP), Sleep & Recovery, Radiation Intelligence (Gy vs Sv), and Metabolic Telemetry

import React, { useState, useEffect } from 'react';
import { getCrewHealthDataset, FullCrewHealthDataset } from '../data/healthData';
import { InteractiveECGViewer } from '../components/charts/InteractiveECGViewer';
import { RRIntervalAnalysisCard } from '../components/charts/RRIntervalAnalysisCard';
import { BloodPressureCard } from '../components/charts/BloodPressureCard';
import { SleepRecoveryCard } from '../components/charts/SleepRecoveryCard';
import { RadiationIntelligenceCard } from '../components/charts/RadiationIntelligenceCard';
import { MetabolicTelemetryCard } from '../components/charts/MetabolicTelemetryCard';
import { ModelStatusBadge } from '../components/common/ModelStatusBadge';
import { useSolaris } from '../context/SolarisContext';
import {
  Activity,
  Heart,
  Moon,
  Zap,
  Wind,
  Shield,
  Layers,
  FileText,
  UserCheck,
  Download,
  AlertCircle,
  Clock,
  Sparkles,
  ShieldAlert,
  Info,
  CheckCircle2,
} from 'lucide-react';

export const HealthMonitoringPage: React.FC = () => {
  // Astra / Solaris context connection
  const { activeCrew, selectCrew } = useSolaris();

  // Active astronaut state
  const [selectedCrewId, setSelectedCrewId] = useState<'vance' | 'patel' | 'chen'>(
    (activeCrew?.id as 'vance' | 'patel' | 'chen') || 'vance'
  );
  const [activeCategory, setActiveCategory] = useState<'all' | 'cardio' | 'bp' | 'sleep' | 'radiation' | 'metabolic'>('all');
  const [isSimulatedScenario, setIsSimulatedScenario] = useState<boolean>(false);
  const [exportedNotice, setExportedNotice] = useState<boolean>(false);

  // Sync state if activeCrew changes globally
  useEffect(() => {
    if (activeCrew?.id && (activeCrew.id === 'vance' || activeCrew.id === 'patel' || activeCrew.id === 'chen')) {
      setSelectedCrewId(activeCrew.id as 'vance' | 'patel' | 'chen');
    }
  }, [activeCrew?.id]);

  // Load authoritative health dataset for selected astronaut
  const healthData: FullCrewHealthDataset = getCrewHealthDataset(selectedCrewId);

  const handleSelectAstronaut = (id: 'vance' | 'patel' | 'chen') => {
    setSelectedCrewId(id);
    if (selectCrew) {
      selectCrew(id);
    }
  };

  // Export clinical report handler
  const handleExportSummary = () => {
    const reportText = `SOLARIS CLINICAL TELEMETRY SUMMARY
=========================================
Subject: ${healthData.name} (${healthData.callsign})
Mission Sol: ${healthData.missionDay} / 500
Status: ${healthData.solarisStatus}
Timestamp: ${new Date().toISOString()}

CARDIOVASCULAR & AUTONOMIC
- Heart Rate: ${healthData.cardiovascular.heartRate.current} bpm (Resting: ${healthData.cardiovascular.heartRate.resting} bpm) [${healthData.cardiovascular.heartRate.provenance.type}]
- HRV RMSSD: ${healthData.cardiovascular.hrvRMSSD.value} ms (Baseline: ${healthData.cardiovascular.hrvRMSSD.baseline} ms) [${healthData.cardiovascular.hrvRMSSD.provenance.type}]
- HRV SDNN: ${healthData.cardiovascular.hrvSDNN.value} ms [${healthData.cardiovascular.hrvSDNN.provenance.type}]
- Baevsky Stress Index: ${healthData.cardiovascular.stressIndex.value} (${healthData.cardiovascular.stressIndex.status})
- ML Research Model (cardiovascular_anomaly_detector): Isolation Forest Unsupervised Score 0.14 (Nominal) [No disease claims]

HEMODYNAMICS & BLOOD PRESSURE
- Systolic: ${healthData.bloodPressure.systolic.value} mmHg [${healthData.bloodPressure.systolic.provenance.type}]
- Diastolic: ${healthData.bloodPressure.diastolic.value} mmHg [${healthData.bloodPressure.diastolic.provenance.type}]
- Derived MAP: ${healthData.bloodPressure.map.value} mmHg [${healthData.bloodPressure.map.provenance.type} - ${healthData.bloodPressure.map.formula}]
- Pulse Pressure: ${healthData.bloodPressure.pulsePressure.value} mmHg [${healthData.bloodPressure.pulsePressure.provenance.type}]

SLEEP & RECOVERY
- Total Sleep Time: ${healthData.sleepRecovery.totalSleepTime_hrs} hrs (TIB: ${healthData.sleepRecovery.timeInBed_hrs} hrs)
- Sleep Efficiency: ${healthData.sleepRecovery.sleepEfficiency_pct.value}% [${healthData.sleepRecovery.sleepEfficiency_pct.provenance.type}]
- WASO: ${healthData.sleepRecovery.waso_min} min | Latency: ${healthData.sleepRecovery.sleepLatency_min} min
- Sleep Fragmentation Index: ${healthData.sleepRecovery.sleepFragmentationIndex.value} (${healthData.sleepRecovery.sleepFragmentationIndex.status})
- ML Predictive Model (sleep_recovery_model): QUARANTINED (Target leakage - TST mathematically defines target). Direct actigraphy recorded.

RADIATION DOSIMETRY INTELLIGENCE
- Real-Time Rate: ${healthData.radiation.realTimeDoseRate.equivalent_uSv_h} µSv/h (Absorbed: ${healthData.radiation.realTimeDoseRate.absorbed_uGy_h} µGy/h)
- Sol 142 Daily Dose: ${healthData.radiation.currentDailyDose.equivalent_mSv} mSv/day (Absorbed: ${healthData.radiation.currentDailyDose.absorbed_mGy} mGy/day)
- Mission Cumulative: ${healthData.radiation.cumulativeMissionDose.equivalent_mSv} mSv (Absorbed: ${healthData.radiation.cumulativeMissionDose.absorbed_mGy} mGy)
- NASA Career Limit: ${healthData.radiation.cumulativeMissionDose.careerDosePercentage}% of 600 mSv PEL used
- Dosimetry Engine (radiation_dosimetry_engine): Deterministic physical absorbed dose in mGy.

METABOLIC & RESPIRATORY
- Respiration: ${healthData.metabolic.respiratoryRate.value} breaths/min [${healthData.metabolic.respiratoryRate.provenance.type}]
- SpO2: ${healthData.metabolic.spo2.value}% (PI: ${healthData.metabolic.spo2.perfusionIndex_pct}%) [${healthData.metabolic.spo2.provenance.type}]
- Blood Glucose: ${healthData.metabolic.bloodGlucose.value_mg_dl} mg/dL (${healthData.metabolic.bloodGlucose.value_mmol_l} mmol/L)
- Core Temperature: ${healthData.metabolic.coreTemperature.value_c} °C (${healthData.metabolic.coreTemperature.value_f} °F)
- ML Model (plasma_proteomics_model): QUARANTINED (Unvalidated generalization across 15 samples). Direct biomarkers used.
=========================================
End of Solaris Clinical Telemetry Record.`;

    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SOLARIS_Telemetry_${healthData.astronautId}_Sol142.txt`;
    link.click();
    URL.revokeObjectURL(url);

    setExportedNotice(true);
    setTimeout(() => setExportedNotice(false), 3000);
  };

  return (
    <div className="w-full min-h-screen bg-[#F4F7FC] text-slate-800 font-sans p-4 lg:p-6 select-none space-y-6">
      {/* Top Banner / Breadcrumb & Astronaut Profile Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-indigo-600 mb-1">
            <span>MISSION SOL 142 / 500</span>
            <span>·</span>
            <span>TRANS-MARS INJECTION</span>
            <span>·</span>
            <span className="text-emerald-600 font-semibold">TELEMETRY STREAM SYNCHRONIZED</span>
          </div>
          <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-3 font-mono">
            Astronaut Health Monitoring & Measurement Intelligence
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            Continuous Biometric Telemetry · Hemodynamics · Sleep Polysomnography · Active Dosimetry · ML Research Governance
          </p>
        </div>

        {/* Right Action Bar: Astronaut Switcher & Export */}
        <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
          {/* Astronaut Selector Buttons */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
            {(
              [
                { id: 'vance', name: 'Cmdr. Vance', status: 'OBSERVATION' },
                { id: 'patel', name: 'Spec. Patel', status: 'NOMINAL' },
                { id: 'chen', name: 'Dr. Chen', status: 'REVIEW' },
              ] as const
            ).map((ast) => (
              <button
                key={ast.id}
                onClick={() => handleSelectAstronaut(ast.id)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-2 ${
                  selectedCrewId === ast.id
                    ? 'bg-white text-indigo-700 border border-indigo-200 font-bold shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    ast.status === 'NOMINAL'
                      ? 'bg-emerald-500'
                      : ast.status === 'OBSERVATION'
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                />
                <span>{ast.name}</span>
              </button>
            ))}
          </div>

          {/* Export Telemetry Button */}
          <button
            onClick={handleExportSummary}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm transition-colors font-semibold"
            title="Export Clinical Telemetry Record"
          >
            <Download className="w-3.5 h-3.5 text-indigo-600" />
            <span>{exportedNotice ? 'RECORD DOWNLOADED' : 'EXPORT RECORD'}</span>
          </button>
        </div>
      </div>

      {/* Provenance & Methodology Banner */}
      <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_4px_16px_rgba(0,0,0,0.04)] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center flex-wrap gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500" />
            <span className="text-slate-500">
              <strong className="text-slate-900">MEASURED:</strong> Physical sensor (250Hz ECG, Cuff, RIP, Dosimeter)
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-teal-500" />
            <span className="text-slate-500">
              <strong className="text-slate-900">DERIVED:</strong> Algorithmic mathematical synthesis (MAP, RMSSD, TST)
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-purple-500" />
            <span className="text-slate-500">
              <strong className="text-slate-900">SIMULATED:</strong> Injected readiness scenario telemetry
            </span>
          </div>
        </div>

        <div className="text-[11px] text-slate-500 flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-indigo-600" />
          <span>Active Subject: <strong className="text-slate-900">{healthData.name} ({healthData.callsign})</strong></span>
        </div>
      </div>

      {/* Module Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 font-mono text-xs border-b border-slate-200 pb-3">
        {(
          [
            { id: 'all', label: 'ALL BIOMETRICS', icon: Layers },
            { id: 'cardio', label: 'CARDIOVASCULAR & ECG', icon: Heart },
            { id: 'bp', label: 'HEMODYNAMICS & MAP', icon: Activity },
            { id: 'sleep', label: 'SLEEP & RECOVERY', icon: Moon },
            { id: 'radiation', label: 'RADIATION DOSIMETRY', icon: Zap },
            { id: 'metabolic', label: 'METABOLIC & RESPIRATORY', icon: Wind },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-medium transition-all ${
                activeCategory === tab.id
                  ? 'bg-gradient-to-r from-indigo-600 to-[#5850EC] text-white font-bold shadow-md shadow-indigo-200'
                  : 'text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200/80 shadow-sm'
              }`}
            >
              <Icon className={`w-4 h-4 ${activeCategory === tab.id ? 'text-white' : 'text-indigo-600'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Dynamic View Panels */}
      <div className="space-y-6">
        {/* SECTION 1: CARDIOVASCULAR HEALTH */}
        {(activeCategory === 'all' || activeCategory === 'cardio') && (
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-mono">
                <Heart className="w-4 h-4 text-rose-500" />
                <h2 className="text-base font-bold tracking-wide text-slate-900">
                  1. CARDIOVASCULAR SYSTEM & CONTINUOUS LEAD-II ECG
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <ModelStatusBadge status="experimental" modelId="cardiovascular_anomaly_detector" />
                <span className="text-xs font-mono text-slate-500">
                  250 Hz Continuous Telemetry
                </span>
              </div>
            </div>

            {/* Research ML Cardiovascular Governance Card */}
            <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-mono">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-indigo-900">SOLARIS Research ML: Isolation Forest Statistical Deviation</span>
                  <span className="px-2 py-0.5 rounded bg-white text-indigo-700 font-bold border border-indigo-200 text-[10px]">
                    EXPERIMENTAL DEVIATION SCORE: 0.14 (NOMINAL)
                  </span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Basis: 184 epochs from 4 astronaut records. Emits unsupervised outlier deviation score only.
                  <strong className="text-indigo-950 ml-1">Prohibited claims:</strong> Not diagnostic for arrhythmia, disease probability, or automatic clinical alarms.
                </p>
              </div>
              <div className="text-[11px] text-slate-500 shrink-0 border-l border-indigo-200 pl-3 hidden md:block">
                <span>Data Quality: </span><strong className="text-emerald-700">HIGH (250Hz Synced)</strong><br />
                <span>Format: </span><span>Physical Units (BPM, ms, mmHg)</span>
              </div>
            </div>

            {/* Interactive ECG Waveform Viewer */}
            <InteractiveECGViewer
              heartRate={healthData.cardiovascular.heartRate.current}
              hrvRMSSD={healthData.cardiovascular.hrvRMSSD.value}
              provenance={healthData.cardiovascular.heartRate.provenance}
              astronautName={healthData.name}
            />

            {/* RR Interval & Autonomic Tone Card */}
            <RRIntervalAnalysisCard cardio={healthData.cardiovascular} />
          </section>
        )}

        {/* SECTION 2: BLOOD PRESSURE & MAP */}
        {(activeCategory === 'all' || activeCategory === 'bp') && (
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-mono">
                <Activity className="w-4 h-4 text-indigo-600" />
                <h2 className="text-base font-bold tracking-wide text-slate-900">
                  2. ARTERIAL HEMODYNAMICS & DERIVED MEAN ARTERIAL PRESSURE (MAP)
                </h2>
              </div>
              <span className="text-xs font-mono text-slate-500">
                Inflatable Brachial Cuff · Hydrostatic Zero-Gradient Analysis
              </span>
            </div>

            {/* Blood Pressure & MAP Card */}
            <BloodPressureCard bp={healthData.bloodPressure} />
          </section>
        )}

        {/* SECTION 3: SLEEP & RECOVERY */}
        {(activeCategory === 'all' || activeCategory === 'sleep') && (
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-mono">
                <Moon className="w-4 h-4 text-purple-600" />
                <h2 className="text-base font-bold tracking-wide text-slate-900">
                  3. SLEEP ARCHITECTURE, FRAGMENTATION & FATIGUE CORRELATION
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <ModelStatusBadge status="quarantined" modelId="sleep_recovery_model" />
                <span className="text-xs font-mono text-slate-500">
                  Actigraphy Polysomnography
                </span>
              </div>
            </div>

            {/* Research ML Quarantine Notice Banner */}
            <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-300 text-xs font-mono flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-amber-900">Model Quarantine Policy Notice: sleep_recovery_model Disabled</span>
                  <span className="px-2 py-0.2 rounded bg-amber-200/60 text-amber-900 font-bold text-[10px]">
                    TARGET LEAKAGE
                  </span>
                </div>
                <p className="text-amber-800 text-[11px] leading-relaxed">
                  The experimental sleep regression model was quarantined because predictor inputs (TST, time-in-bed) mathematically construct the Sleep Efficiency target formula.
                  SOLARIS policy mandates using recorded direct polysomnography measurements (WASO, Latency, Fragmentation Index) and descriptive longitudinal analytics instead.
                </p>
              </div>
            </div>

            {/* Sleep & Recovery Card */}
            <SleepRecoveryCard sleep={healthData.sleepRecovery} />
          </section>
        )}

        {/* SECTION 4: RADIATION EXPOSURE INTELLIGENCE */}
        {(activeCategory === 'all' || activeCategory === 'radiation') && (
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-mono">
                <Zap className="w-4 h-4 text-amber-500" />
                <h2 className="text-base font-bold tracking-wide text-slate-900">
                  4. RADIATION EXPOSURE INTELLIGENCE & DOSIMETRY (Gy vs. Sv)
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <ModelStatusBadge status="observational" modelId="radiation_dosimetry_engine" />
                <span className="text-xs font-mono text-slate-500">
                  NASA CAD Silicon Array
                </span>
              </div>
            </div>

            {/* Research ML Dosimetry Governance Card */}
            <div className="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-200 text-xs font-mono flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sky-950">Deterministic Physical Dosimetry Engine</span>
                  <span className="px-2 py-0.2 rounded bg-white text-sky-800 font-bold border border-sky-200 text-[10px]">
                    PHYSICAL ABSORBED DOSE (mGy)
                  </span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Requires non-negative absorbed physical dose in mGy/day. Equivalent dose (mSv) uses operational surrogate quality factors.
                  <strong className="text-sky-950 ml-1">Limitations:</strong> Does not claim universal regulatory compliance or complete tissue weighting without spectrometer validation.
                </p>
              </div>
              <div className="text-[11px] text-slate-500 shrink-0 border-l border-sky-200 pl-3 hidden md:block">
                <span>NASA Career PEL: </span><strong className="text-slate-900">600 mSv</strong><br />
                <span>Cumulative: </span><span>{healthData.radiation.cumulativeMissionDose.careerDosePercentage}% Used</span>
              </div>
            </div>

            {/* Radiation Intelligence Card */}
            <RadiationIntelligenceCard
              radiation={healthData.radiation}
              isSimulatedScenario={isSimulatedScenario}
              onToggleScenario={(val) => setIsSimulatedScenario(val)}
            />
          </section>
        )}

        {/* SECTION 5: METABOLIC & RESPIRATORY */}
        {(activeCategory === 'all' || activeCategory === 'metabolic') && (
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-mono">
                <Wind className="w-4 h-4 text-teal-600" />
                <h2 className="text-base font-bold tracking-wide text-slate-900">
                  5. METABOLIC, BIOCHEMICAL & RESPIRATORY TELEMETRY
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <ModelStatusBadge status="quarantined" modelId="plasma_proteomics_model" />
                <span className="text-xs font-mono text-slate-500">
                  Direct Capillary Biomarkers
                </span>
              </div>
            </div>

            {/* Proteomics Quarantine Notice */}
            <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs font-mono flex items-start gap-3">
              <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-amber-900">Research Model Quarantine: plasma_proteomics_model Disabled</span>
                  <span className="px-2 py-0.2 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">
                    UNVALIDATED GENERALIZATION
                  </span>
                </div>
                <p className="text-amber-800 text-[11px] leading-relaxed">
                  Quarantined because 100% reported training accuracy across 15 samples does not establish clinical generalization.
                  Direct capillary glucose, core thermometry, and dual-band RIP respiration are reported without synthetic ML predictions.
                </p>
              </div>
            </div>

            {/* Metabolic Telemetry Card */}
            <MetabolicTelemetryCard metabolic={healthData.metabolic} />
          </section>
        )}
      </div>

      {/* Clinical Reference Footer */}
      <footer className="pt-6 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-slate-500">
        <div>
          SOLARIS Spaceflight Medical Intelligence · Certified to NASA-STD-3001 Vol 1 & 2 Standards
        </div>
        <div className="flex items-center gap-3">
          <span>Decisional Support Protocol</span>
          <span>·</span>
          <span>Not a stand-alone diagnostic medical device</span>
        </div>
      </footer>
    </div>
  );
};

export default HealthMonitoringPage;
