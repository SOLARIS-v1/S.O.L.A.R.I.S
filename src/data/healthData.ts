// SOLARIS Astronaut Health Intelligence & Decision Support Platform
// Health Measurement Data Layer & Provenance Tracking

export type ValueProvenanceType = 'MEASURED' | 'DERIVED' | 'SIMULATED';

export interface MeasurementProvenance {
  type: ValueProvenanceType;
  sensorCode: string;
  hardware: string;
  samplingRate: string;
  calibrationDate: string;
  timestamp: string; // ISO 8601
  quality: 'OPTIMAL' | 'DEGRADED' | 'CALIBRATED' | 'SIMULATED';
  confidencePct: number;
  derivationFormula?: string;
  note?: string;
}

export interface RRInterval {
  index: number;
  rr_ms: number;
  timestamp: string;
}

export interface PoincarePoint {
  x: number; // RR_n (ms)
  y: number; // RR_n+1 (ms)
}

export interface CardiovascularTelemetry {
  heartRate: {
    current: number;
    resting: number;
    min24h: number;
    max24h: number;
    unit: 'bpm';
    provenance: MeasurementProvenance;
  };
  hrvRMSSD: {
    value: number; // ms
    unit: 'ms';
    baseline: number;
    status: 'OPTIMAL' | 'MODERATE_STRAIN' | 'AUTONOMIC_FATIGUE';
    provenance: MeasurementProvenance;
  };
  hrvSDNN: {
    value: number; // ms
    unit: 'ms';
    baseline: number;
    provenance: MeasurementProvenance;
  };
  pnn50: {
    value: number; // %
    unit: '%';
    provenance: MeasurementProvenance;
  };
  stressIndex: {
    value: number; // Baevsky Stress Index
    status: 'RELAXED' | 'EUSTRESS' | 'ELEVATED_STRAIN';
    provenance: MeasurementProvenance;
  };
  ecgSignal: {
    lead: 'Lead II (Thorax)';
    impedance_kohm: number;
    snr_db: number;
    filterBandwidth: '0.05 - 100 Hz';
    status: 'OPTIMAL' | 'ACCEPTABLE' | 'DEGRADED';
    provenance: MeasurementProvenance;
  };
  baselineComparison: {
    medianResting: number;
    mad: number;
    currentZScore: number;
    driftDirection: 'STABLE' | 'ELEVATED' | 'SUPPRESSED';
    clinicalVerdict: string;
  };
  rrIntervals: RRInterval[];
  poincareData: PoincarePoint[];
  history24h: Array<{ time: string; hr: number; hrvRMSSD: number }>;
  history7d: Array<{ day: string; hrResting: number; hrvRMSSD: number; hrvSDNN: number }>;
}

export interface BloodPressureTelemetry {
  systolic: {
    value: number;
    unit: 'mmHg';
    provenance: MeasurementProvenance;
  };
  diastolic: {
    value: number;
    unit: 'mmHg';
    provenance: MeasurementProvenance;
  };
  map: {
    value: number;
    unit: 'mmHg';
    formula: 'MAP = DP + 1/3(SP - DP) = (2×DP + SP) / 3';
    provenance: MeasurementProvenance;
  };
  pulsePressure: {
    value: number;
    unit: 'mmHg';
    formula: 'PP = SP - DP';
    provenance: MeasurementProvenance;
  };
  classification: 'OPTIMAL' | 'NORMAL' | 'ELEVATED' | 'STAGE_1_HYPERTENSION';
  qualityInfo: {
    cuffLocation: 'Left Upper Brachial';
    pneumaticSeal: 'CONFIRMED_NOMINAL';
    hydrostaticOffset: '0 mmHg (Microgravity neutral hydrostatic column)';
    motionArtifact: 'NONE_DETECTED';
  };
  history24h: Array<{ time: string; systolic: number; diastolic: number; map: number }>;
  history7d: Array<{ day: string; systolic: number; diastolic: number; map: number }>;
}

export interface SleepStageEpoch {
  time: string;
  stage: 'Awake' | 'REM' | 'Light' | 'Deep';
  stageIndex: 0 | 1 | 2 | 3; // 0=Awake, 1=REM, 2=Light(N1/N2), 3=Deep(N3)
}

export interface SleepRecoveryTelemetry {
  totalSleepTime_hrs: number; // TST
  timeInBed_hrs: number; // TIB
  sleepEfficiency_pct: {
    value: number; // (TST / TIB) * 100
    formula: '(Total Sleep Time / Time in Bed) × 100';
    provenance: MeasurementProvenance;
  };
  sleepLatency_min: number; // Latency to sleep onset
  waso_min: number; // Wake After Sleep Onset
  awakeningsCount: number;
  microArousalsCount: number;
  sleepFragmentationIndex: {
    value: number;
    formula: '(Awakenings + Micro-Arousals) / TST_hrs';
    status: 'LOW' | 'MODERATE' | 'HIGH';
    provenance: MeasurementProvenance;
  };
  stagesBreakdown: {
    rem_pct: number;
    deep_n3_pct: number;
    light_n1_n2_pct: number;
    awake_pct: number;
  };
  hypnogram: SleepStageEpoch[];
  fatigueCorrelations: {
    pvtReactionTime_ms: number; // Psychomotor Vigilance Task (PVT) median reaction time
    pvtLapsesCount: number; // PVT lapses > 500ms
    kssScore: number; // Karolinska Sleepiness Scale 1-9
    sleepDebtCumulative_hrs: number; // Cumulative sleep deficit over last 7 days
    recoveryScore_pct: number; // Combined recovery composite
    readinessGrade: 'OPTIMAL' | 'QUALIFIED' | 'FATIGUE_IMPAIRED';
    clinicalNotes: string;
  };
}

export interface DailyRadiationRecord {
  sol: number;
  date: string;
  absorbedDose_mGy: number; // Gy / mGy (Physical Energy Deposited: J/kg)
  equivalentDose_mSv: number; // Sv / mSv (Biological Damage: H = D × WR)
  effectiveQualityFactor_WR: number; // Average Radiation Weighting Factor
  gcrComponent_mSv: number;
  speComponent_mSv: number;
  isSimulatedScenario?: boolean;
}

export interface RadiationIntelligenceTelemetry {
  realTimeDoseRate: {
    absorbed_uGy_h: number; // micrograys per hour
    equivalent_uSv_h: number; // microsieverts per hour
    provenance: MeasurementProvenance;
  };
  currentDailyDose: {
    absorbed_mGy: number;
    equivalent_mSv: number;
    provenance: MeasurementProvenance;
  };
  cumulativeMissionDose: {
    absorbed_mGy: number;
    equivalent_mSv: number;
    formula: 'Equivalent Dose H (Sv) = ∑ [ Absorbed Dose D (Gy) × Weighting Factor WR ]';
    careerLimit_mSv: number; // NASA Space Permissible Exposure Limit (600 mSv)
    annualLimit_mSv: number; // 250 mSv / 1 year
    thirtyDayLimit_mSv: number; // 50 mSv / 30 day
    careerDosePercentage: number;
    provenance: MeasurementProvenance;
  };
  speEventStatus: {
    level: 'NOMINAL_GCR' | 'SPE_WATCH' | 'SPE_WARNING' | 'SPE_ACTIVE_ALERT';
    fluxRate_protons_cm2_s: number;
    warningLeadTime_min: number;
    stormShelterRecommended: boolean;
  };
  radiationDistinctionGuide: {
    absorbedDoseDef: 'Absorbed Dose (Gray, Gy = 1 J/kg): Measures the physical fundamental energy deposited by ionizing radiation per unit mass of biological tissue.';
    equivalentDoseDef: 'Equivalent Dose (Sievert, Sv): Measures the stochastic biological damage and cancer risk. Calculated as H = D × WR, where WR accounts for radiation type (WR = 1 for photons/electrons, WR = 2 for low-energy protons, WR = 20 for heavy GCR relativistic nuclei like 56Fe).';
  };
  clinicalGuidance: {
    currentStatus: string;
    protocol: string;
    countermeasures: string[];
    monitoringSchedule: string;
  };
  dailyHistory: DailyRadiationRecord[];
}

export interface MetabolicRespiratoryTelemetry {
  respiratoryRate: {
    value: number;
    unit: 'breaths/min';
    normalRange: [number, number];
    waveformSample: number[];
    provenance: MeasurementProvenance;
  };
  spo2: {
    value: number;
    unit: '%';
    normalRange: [number, number];
    perfusionIndex_pct: number;
    provenance: MeasurementProvenance;
  };
  bloodGlucose: {
    value_mg_dl: number;
    value_mmol_l: number;
    unit: 'mg/dL';
    normalRange: [number, number];
    mealStatus: 'FASTING_MORNING' | 'POST_PRANDIAL' | 'RANDOM';
    provenance: MeasurementProvenance;
  };
  coreTemperature: {
    value_c: number;
    value_f: number;
    unit: '°C';
    normalRange: [number, number];
    spaceflightHyperthermiaNote: string;
    provenance: MeasurementProvenance;
  };
  endTidalCO2: {
    value: number;
    unit: 'mmHg';
    normalRange: [number, number];
    provenance: MeasurementProvenance;
  };
  hydrationBioimpedance: {
    totalBodyWater_L: number;
    extracellularWaterRatio: number;
    hydrationStatus: 'EUHYDRATED' | 'BORDERLINE_DEFICIT' | 'HYPOHYDRATED';
    provenance: MeasurementProvenance;
  };
  capillaryLactate: {
    value: number;
    unit: 'mmol/L';
    normalRange: [number, number];
    provenance: MeasurementProvenance;
  };
}

export interface FullCrewHealthDataset {
  astronautId: string;
  name: string;
  callsign: string;
  missionDay: number;
  solarisStatus: 'NOMINAL' | 'OBSERVATION' | 'REVIEW' | 'URGENT';
  cardiovascular: CardiovascularTelemetry;
  bloodPressure: BloodPressureTelemetry;
  sleepRecovery: SleepRecoveryTelemetry;
  radiation: RadiationIntelligenceTelemetry;
  metabolic: MetabolicRespiratoryTelemetry;
}

// Helper to compute MAP
export function calculateMAP(systolic: number, diastolic: number): number {
  return Math.round(((2 * diastolic + systolic) / 3) * 10) / 10;
}

// Helper to compute Pulse Pressure
export function calculatePulsePressure(systolic: number, diastolic: number): number {
  return systolic - diastolic;
}

// Helper to calculate Sleep Efficiency
export function calculateSleepEfficiency(totalSleepHrs: number, timeInBedHrs: number): number {
  if (timeInBedHrs <= 0) return 0;
  return Math.round((totalSleepHrs / timeInBedHrs) * 1000) / 10;
}

// Helper to calculate Sleep Fragmentation Index
export function calculateSleepFragmentation(awakenings: number, microArousals: number, totalSleepHrs: number): number {
  if (totalSleepHrs <= 0) return 0;
  return Math.round(((awakenings + microArousals) / totalSleepHrs) * 10) / 10;
}

// Generate realistic RR intervals for a given mean heart rate and HRV RMSSD
export function generateRRIntervals(meanHR: number, rmssd: number, count = 60): { rrs: RRInterval[]; poincare: PoincarePoint[] } {
  const meanRR = 60000 / meanHR;
  const rrs: RRInterval[] = [];
  const poincare: PoincarePoint[] = [];

  let currentRR = meanRR;
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    // Autoregressive variation with target RMSSD
    const delta = (Math.random() - 0.5) * 2 * (rmssd * 1.4);
    // respiratory sinus arrhythmia component (0.25 Hz oscillation)
    const rsa = Math.sin(i * 0.4) * (rmssd * 0.6);
    currentRR = Math.max(500, Math.min(1300, meanRR + delta + rsa));

    rrs.push({
      index: i + 1,
      rr_ms: Math.round(currentRR),
      timestamp: new Date(now - (count - i) * 850).toISOString(),
    });
  }

  for (let i = 0; i < rrs.length - 1; i++) {
    poincare.push({
      x: rrs[i].rr_ms,
      y: rrs[i + 1].rr_ms,
    });
  }

  return { rrs, poincare };
}

// Mock Hypnogram Generator
export function generateHypnogram(totalHours: number): SleepStageEpoch[] {
  const epochs: SleepStageEpoch[] = [];
  const totalMinutes = Math.round(totalHours * 60);
  const stepMin = 5;
  const startTime = new Date(Date.now() - totalHours * 3600 * 1000 - 8 * 3600 * 1000); // 8 hours ago

  for (let m = 0; m < totalMinutes; m += stepMin) {
    const timeStr = new Date(startTime.getTime() + m * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    let stage: 'Awake' | 'REM' | 'Light' | 'Deep' = 'Light';
    let stageIndex: 0 | 1 | 2 | 3 = 2;

    const cyclePos = (m % 90) / 90; // 90-minute sleep cycle
    if (m < 20) {
      stage = 'Awake';
      stageIndex = 0;
    } else if (cyclePos < 0.25) {
      stage = 'Light';
      stageIndex = 2;
    } else if (cyclePos < 0.65) {
      // Early night has more deep, late night has more REM
      if (m < totalMinutes * 0.5) {
        stage = 'Deep';
        stageIndex = 3;
      } else {
        stage = 'REM';
        stageIndex = 1;
      }
    } else if (cyclePos < 0.85) {
      stage = 'REM';
      stageIndex = 1;
    } else {
      stage = 'Light';
      stageIndex = 2;
    }

    // Occasional brief awakenings
    if (m === 145 || m === 260) {
      stage = 'Awake';
      stageIndex = 0;
    }

    epochs.push({ time: timeStr, stage, stageIndex });
  }

  return epochs;
}

// Generate Sol 1-142 cumulative and daily radiation records
export function generateRadiationHistory(isSimulationScenario = false): DailyRadiationRecord[] {
  const records: DailyRadiationRecord[] = [];
  const totalSols = 142;

  for (let sol = 1; sol <= totalSols; sol++) {
    // Normal galactic cosmic ray background: ~0.33 mGy/day absorbed, WR ~ 1.8 -> ~0.59 mSv/day equivalent
    let gcr_mGy = 0.32 + Math.sin(sol * 0.05) * 0.04 + (Math.random() - 0.5) * 0.02;
    let spe_mGy = 0;

    // Simulate Sol 139-140 mild Solar Particle Event in simulation scenario
    if (isSimulationScenario && (sol === 139 || sol === 140)) {
      spe_mGy = sol === 139 ? 0.85 : 1.45;
    }

    const totalAbsorbed_mGy = Math.round((gcr_mGy + spe_mGy) * 100) / 100;
    // WR weighting: GCR high-Z ions WR ~ 1.8; SPE solar protons WR ~ 1.2
    const wr_effective = spe_mGy > 0 ? 1.4 : 1.82;
    const gcr_mSv = Math.round(gcr_mGy * 1.82 * 100) / 100;
    const spe_mSv = Math.round(spe_mGy * 1.25 * 100) / 100;
    const totalEquivalent_mSv = Math.round((gcr_mSv + spe_mSv) * 100) / 100;

    const dateStr = `Sol ${sol}`;
    records.push({
      sol,
      date: dateStr,
      absorbedDose_mGy: totalAbsorbed_mGy,
      equivalentDose_mSv: totalEquivalent_mSv,
      effectiveQualityFactor_WR: wr_effective,
      gcrComponent_mSv: gcr_mSv,
      speComponent_mSv: spe_mSv,
      isSimulatedScenario: spe_mGy > 0,
    });
  }

  return records;
}

// Pre-built profiles for Vance, Patel, Chen
export function getCrewHealthDataset(crewId: 'vance' | 'patel' | 'chen' | string): FullCrewHealthDataset {
  const id = (crewId || 'vance').toLowerCase();
  const nowIso = new Date().toISOString();

  if (id === 'chen') {
    const rrData = generateRRIntervals(88, 32, 60);
    const radHistory = generateRadiationHistory(false);
    const cumulativeAbsorbed = radHistory.reduce((acc, r) => acc + r.absorbedDose_mGy, 0);
    const cumulativeEquivalent = radHistory.reduce((acc, r) => acc + r.equivalentDose_mSv, 0);

    return {
      astronautId: 'chen',
      name: 'Dr. Maya Chen',
      callsign: 'AURA',
      missionDay: 142,
      solarisStatus: 'REVIEW',
      cardiovascular: {
        heartRate: {
          current: 88,
          resting: 84,
          min24h: 72,
          max24h: 122,
          unit: 'bpm',
          provenance: {
            type: 'MEASURED',
            sensorCode: 'ECG-01',
            hardware: 'Bio-Monitor / AstroSkin 3-Lead Thoracic Array',
            samplingRate: '250 Hz Continuous',
            calibrationDate: '2026-10-01 (Pre-Flight Certified)',
            timestamp: nowIso,
            quality: 'OPTIMAL',
            confidencePct: 99.4,
          },
        },
        hrvRMSSD: {
          value: 32,
          unit: 'ms',
          baseline: 46,
          status: 'AUTONOMIC_FATIGUE',
          provenance: {
            type: 'DERIVED',
            sensorCode: 'ECG-01-ALG',
            hardware: 'Solaris On-Board HRV DSP Kernel',
            samplingRate: 'Per Beat-to-Beat Interval',
            calibrationDate: '2026-11-14 (Real-time)',
            timestamp: nowIso,
            quality: 'OPTIMAL',
            confidencePct: 98.2,
            derivationFormula: 'RMSSD = √[ (1/(N-1)) × ∑(RR_i+1 - RR_i)² ]',
            note: 'Depressed RMSSD reflects sympathetic predominance secondary to cumulative sleep disruption.',
          },
        },
        hrvSDNN: {
          value: 41,
          unit: 'ms',
          baseline: 58,
          provenance: {
            type: 'DERIVED',
            sensorCode: 'ECG-01-ALG',
            hardware: 'Solaris On-Board HRV DSP Kernel',
            samplingRate: '5-minute rolling window',
            calibrationDate: '2026-11-14',
            timestamp: nowIso,
            quality: 'OPTIMAL',
            confidencePct: 97.5,
            derivationFormula: 'SDNN = √[ (1/(N-1)) × ∑(RR_i - RR_mean)² ]',
          },
        },
        pnn50: {
          value: 4.8,
          unit: '%',
          provenance: {
            type: 'DERIVED',
            sensorCode: 'ECG-01-ALG',
            hardware: 'Solaris On-Board HRV DSP Kernel',
            samplingRate: '5-minute window',
            calibrationDate: '2026-11-14',
            timestamp: nowIso,
            quality: 'OPTIMAL',
            confidencePct: 98.0,
            derivationFormula: 'pNN50 = (Count of |RR_i+1 - RR_i| > 50ms / Total RR pairs) × 100',
          },
        },
        stressIndex: {
          value: 168,
          status: 'ELEVATED_STRAIN',
          provenance: {
            type: 'DERIVED',
            sensorCode: 'ALG-BAEVSKY',
            hardware: 'Baevsky Tension Index Evaluator',
            samplingRate: 'Per-minute batch',
            calibrationDate: '2026-11-14',
            timestamp: nowIso,
            quality: 'OPTIMAL',
            confidencePct: 95.0,
            derivationFormula: 'SI = AMo / (2 × VR × Mo)',
          },
        },
        ecgSignal: {
          lead: 'Lead II (Thorax)',
          impedance_kohm: 4.2,
          snr_db: 28.4,
          filterBandwidth: '0.05 - 100 Hz',
          status: 'OPTIMAL',
          provenance: {
            type: 'MEASURED',
            sensorCode: 'ECG-01',
            hardware: 'AstroSkin Dry Contact Thoracic Electrodes',
            samplingRate: '250 Hz',
            calibrationDate: '2026-10-01',
            timestamp: nowIso,
            quality: 'OPTIMAL',
            confidencePct: 99.2,
          },
        },
        baselineComparison: {
          medianResting: 66,
          mad: 3.8,
          currentZScore: 3.1,
          driftDirection: 'ELEVATED',
          clinicalVerdict: 'Resting rate is +18 bpm above pre-flight baseline (Z=3.1). Indicates autonomic fatigue and microgravity fluid shift compensation.',
        },
        rrIntervals: rrData.rrs,
        poincareData: rrData.poincare,
        history24h: [
          { time: '00:00', hr: 74, hrvRMSSD: 38 },
          { time: '04:00', hr: 72, hrvRMSSD: 39 },
          { time: '08:00', hr: 89, hrvRMSSD: 31 },
          { time: '12:00', hr: 94, hrvRMSSD: 29 },
          { time: '16:00', hr: 91, hrvRMSSD: 30 },
          { time: '20:00', hr: 87, hrvRMSSD: 33 },
          { time: 'Live', hr: 88, hrvRMSSD: 32 },
        ],
        history7d: [
          { day: 'Sol 136', hrResting: 68, hrvRMSSD: 44, hrvSDNN: 56 },
          { day: 'Sol 137', hrResting: 70, hrvRMSSD: 42, hrvSDNN: 54 },
          { day: 'Sol 138', hrResting: 73, hrvRMSSD: 39, hrvSDNN: 50 },
          { day: 'Sol 139', hrResting: 76, hrvRMSSD: 36, hrvSDNN: 47 },
          { day: 'Sol 140', hrResting: 80, hrvRMSSD: 34, hrvSDNN: 44 },
          { day: 'Sol 141', hrResting: 83, hrvRMSSD: 33, hrvSDNN: 42 },
          { day: 'Sol 142', hrResting: 84, hrvRMSSD: 32, hrvSDNN: 41 },
        ],
      },
      bloodPressure: {
        systolic: {
          value: 128,
          unit: 'mmHg',
          provenance: {
            type: 'MEASURED',
            sensorCode: 'BP-03',
            hardware: 'AstroSkin Automatic Inflatable Arm Cuff',
            samplingRate: 'Hourly Cycle',
            calibrationDate: '2026-10-01',
            timestamp: nowIso,
            quality: 'OPTIMAL',
            confidencePct: 98.6,
          },
        },
        diastolic: {
          value: 82,
          unit: 'mmHg',
          provenance: {
            type: 'MEASURED',
            sensorCode: 'BP-03',
            hardware: 'AstroSkin Automatic Inflatable Arm Cuff',
            samplingRate: 'Hourly Cycle',
            calibrationDate: '2026-10-01',
            timestamp: nowIso,
            quality: 'OPTIMAL',
            confidencePct: 98.6,
          },
        },
        map: {
          value: calculateMAP(128, 82),
          unit: 'mmHg',
          formula: 'MAP = DP + 1/3(SP - DP) = (2×DP + SP) / 3',
          provenance: {
            type: 'DERIVED',
            sensorCode: 'BP-03-DERIVED',
            hardware: 'Solaris Physiological Inference Engine',
            samplingRate: 'Calculated upon BP cycle completion',
            calibrationDate: '2026-11-14',
            timestamp: nowIso,
            quality: 'OPTIMAL',
            confidencePct: 98.6,
            derivationFormula: 'MAP = 82 + (128 - 82)/3 = 97.3 mmHg',
          },
        },
        pulsePressure: {
          value: calculatePulsePressure(128, 82),
          unit: 'mmHg',
          formula: 'PP = SP - DP',
          provenance: {
            type: 'DERIVED',
            sensorCode: 'BP-03-DERIVED',
            hardware: 'Solaris Physiological Inference Engine',
            samplingRate: 'Calculated upon BP cycle completion',
            calibrationDate: '2026-11-14',
            timestamp: nowIso,
            quality: 'OPTIMAL',
            confidencePct: 98.6,
            derivationFormula: 'PP = 128 - 82 = 46 mmHg',
          },
        },
        classification: 'ELEVATED',
        qualityInfo: {
          cuffLocation: 'Left Upper Brachial',
          pneumaticSeal: 'CONFIRMED_NOMINAL',
          hydrostaticOffset: '0 mmHg (Microgravity neutral hydrostatic column)',
          motionArtifact: 'NONE_DETECTED',
        },
        history24h: [
          { time: '00:00', systolic: 118, diastolic: 76, map: 90.0 },
          { time: '04:00', systolic: 114, diastolic: 72, map: 86.0 },
          { time: '08:00', systolic: 126, diastolic: 80, map: 95.3 },
          { time: '12:00', systolic: 130, diastolic: 84, map: 99.3 },
          { time: '16:00', systolic: 129, diastolic: 83, map: 98.3 },
          { time: '20:00', systolic: 127, diastolic: 81, map: 96.3 },
          { time: 'Live', systolic: 128, diastolic: 82, map: 97.3 },
        ],
        history7d: [
          { day: 'Sol 136', systolic: 116, diastolic: 74, map: 88.0 },
          { day: 'Sol 137', systolic: 118, diastolic: 76, map: 90.0 },
          { day: 'Sol 138', systolic: 120, diastolic: 77, map: 91.3 },
          { day: 'Sol 139', systolic: 124, diastolic: 80, map: 94.7 },
          { day: 'Sol 140', systolic: 126, diastolic: 81, map: 96.0 },
          { day: 'Sol 141', systolic: 128, diastolic: 82, map: 97.3 },
          { day: 'Sol 142', systolic: 128, diastolic: 82, map: 97.3 },
        ],
      },
      sleepRecovery: {
        totalSleepTime_hrs: 5.2,
        timeInBed_hrs: 7.4,
        sleepEfficiency_pct: {
          value: calculateSleepEfficiency(5.2, 7.4),
          formula: '(Total Sleep Time / Time in Bed) × 100',
          provenance: {
            type: 'DERIVED',
            sensorCode: 'ACT-07-ALG',
            hardware: 'Bio-Monitor Pelvic Actimetry + RIP Algorithm',
            samplingRate: 'Aggregated Polysomnography Proxy',
            calibrationDate: '2026-11-14',
            timestamp: nowIso,
            quality: 'OPTIMAL',
            confidencePct: 96.0,
            derivationFormula: '(5.2 / 7.4) × 100 = 70.3%',
          },
        },
        sleepLatency_min: 36,
        waso_min: 58,
        awakeningsCount: 5,
        microArousalsCount: 14,
        sleepFragmentationIndex: {
          value: calculateSleepFragmentation(5, 14, 5.2),
          formula: '(Awakenings + Micro-Arousals) / TST_hrs',
          status: 'HIGH',
          provenance: {
            type: 'DERIVED',
            sensorCode: 'ACT-07-SFI',
            hardware: 'Actigraphy Movement & Arousal Counter',
            samplingRate: 'Nightly Sleep Window Integration',
            calibrationDate: '2026-11-14',
            timestamp: nowIso,
            quality: 'OPTIMAL',
            confidencePct: 94.5,
            derivationFormula: '(5 + 14) / 5.2 = 3.65 events/hour',
          },
        },
        stagesBreakdown: {
          rem_pct: 16.5,
          deep_n3_pct: 12.0,
          light_n1_n2_pct: 48.0,
          awake_pct: 23.5,
        },
        hypnogram: generateHypnogram(7.4),
        fatigueCorrelations: {
          pvtReactionTime_ms: 312,
          pvtLapsesCount: 4,
          kssScore: 6,
          sleepDebtCumulative_hrs: 10.4,
          recoveryScore_pct: 58,
          readinessGrade: 'FATIGUE_IMPAIRED',
          clinicalNotes: 'Elevated sleep fragmentation index (3.7) with WASO of 58 min. PVT shows response latency lengthening (+58 ms). Recommend 45-min post-lunch nap countermeasure and light visor adjustment.',
        },
      },
      radiation: {
        realTimeDoseRate: {
          absorbed_uGy_h: 14.8,
          equivalent_uSv_h: 26.9,
          provenance: {
            type: 'MEASURED',
            sensorCode: 'CAD-06',
            hardware: 'NASA Crew Active Dosimeter (CAD Silicon Semiconductor)',
            samplingRate: '1-Minute Integration',
            calibrationDate: '2026-10-01',
            timestamp: nowIso,
            quality: 'OPTIMAL',
            confidencePct: 99.8,
          },
        },
        currentDailyDose: {
          absorbed_mGy: 0.35,
          equivalent_mSv: 0.64,
          provenance: {
            type: 'DERIVED',
            sensorCode: 'CAD-06-INTEG',
            hardware: 'Solaris Active Dosimetry Processor',
            samplingRate: 'Daily Sol Cumulative',
            calibrationDate: '2026-11-14',
            timestamp: nowIso,
            quality: 'OPTIMAL',
            confidencePct: 99.8,
            derivationFormula: 'Daily H = ∫ (Ḋ(t) × WR) dt over 24.6h Sol cycle',
          },
        },
        cumulativeMissionDose: {
          absorbed_mGy: Math.round(cumulativeAbsorbed * 10) / 10,
          equivalent_mSv: Math.round(cumulativeEquivalent * 10) / 10,
          formula: 'Equivalent Dose H (Sv) = ∑ [ Absorbed Dose D (Gy) × Weighting Factor WR ]',
          careerLimit_mSv: 600,
          annualLimit_mSv: 250,
          thirtyDayLimit_mSv: 50,
          careerDosePercentage: Math.round(((cumulativeEquivalent) / 600) * 1000) / 10,
          provenance: {
            type: 'DERIVED',
            sensorCode: 'CAD-06-CUMUL',
            hardware: 'Solaris Dosimetry Core',
            samplingRate: 'Sol 1 through Sol 142 Integration',
            calibrationDate: '2026-11-14',
            timestamp: nowIso,
            quality: 'OPTIMAL',
            confidencePct: 99.9,
          },
        },
        speEventStatus: {
          level: 'NOMINAL_GCR',
          fluxRate_protons_cm2_s: 1.2,
          warningLeadTime_min: 180,
          stormShelterRecommended: false,
        },
        radiationDistinctionGuide: {
          absorbedDoseDef: 'Absorbed Dose (Gray, Gy = 1 J/kg): Measures the physical fundamental energy deposited by ionizing radiation per unit mass of biological tissue.',
          equivalentDoseDef: 'Equivalent Dose (Sievert, Sv): Measures the stochastic biological damage and cancer risk. Calculated as H = D × WR, where WR accounts for radiation type (WR = 1 for photons/electrons, WR = 2 for low-energy protons, WR = 20 for heavy GCR relativistic nuclei like 56Fe).',
        },
        clinicalGuidance: {
          currentStatus: 'Galactic Cosmic Ray (GCR) baseline nominal. No Solar Particle Event (SPE) alert active.',
          protocol: 'Standard ALARA (As Low As Reasonably Achievable) monitoring. Personal active dosimeter pocket check every shift.',
          countermeasures: [
            'Crew sleeping quarters polyethylene and water-wall shielding active',
            'Nutritional antioxidant supplementation: Selenium 200µg, Vitamin C 500mg, Vitamin E 400IU daily',
            'Quarterly peripheral blood lymphocyte micronucleus assay scheduled for Sol 180',
          ],
          monitoringSchedule: 'Real-time 1-min active dosimeter polling; automated warning threshold at > 50 µSv/h.',
        },
        dailyHistory: radHistory,
      },
      metabolic: {
        respiratoryRate: {
          value: 15.6,
          unit: 'breaths/min',
          normalRange: [12, 18],
          waveformSample: [0, 0.4, 0.8, 1.0, 0.7, 0.2, 0, -0.3, -0.1, 0],
          provenance: {
            type: 'MEASURED',
            sensorCode: 'RIP-02',
            hardware: 'AstroSkin Thoracic & Abdominal Respiration Bands',
            samplingRate: '50 Hz Waveform',
            calibrationDate: '2026-10-01',
            timestamp: nowIso,
            quality: 'OPTIMAL',
            confidencePct: 98.4,
          },
        },
        spo2: {
          value: 98.2,
          unit: '%',
          normalRange: [95, 100],
          perfusionIndex_pct: 4.2,
          provenance: {
            type: 'MEASURED',
            sensorCode: 'OX-04',
            hardware: 'Bio-Monitor Continuous Optical PPG Sensor',
            samplingRate: '1 Hz Continuous',
            calibrationDate: '2026-10-01',
            timestamp: nowIso,
            quality: 'OPTIMAL',
            confidencePct: 99.1,
          },
        },
        bloodGlucose: {
          value_mg_dl: 94,
          value_mmol_l: 5.2,
          unit: 'mg/dL',
          normalRange: [70, 99],
          mealStatus: 'FASTING_MORNING',
          provenance: {
            type: 'MEASURED',
            sensorCode: 'BIO-GLUC-01',
            hardware: 'Microfluidic Capillary Blood Analyzer',
            samplingRate: 'Single Pre-Breakfast Test',
            calibrationDate: '2026-11-14',
            timestamp: nowIso,
            quality: 'OPTIMAL',
            confidencePct: 97.8,
          },
        },
        coreTemperature: {
          value_c: 37.3,
          value_f: 99.14,
          unit: '°C',
          normalRange: [36.5, 37.5],
          spaceflightHyperthermiaNote: 'Microgravity-induced space fever profile detected (+0.4°C baseline elevation). Diminished convective skin cooling in closed cabin.',
          provenance: {
            type: 'MEASURED',
            sensorCode: 'TMP-05',
            hardware: 'AstroSkin Infrared Core & Skin Heat-Flux Thermistor',
            samplingRate: '10-Second Continuous Averaging',
            calibrationDate: '2026-10-01',
            timestamp: nowIso,
            quality: 'OPTIMAL',
            confidencePct: 99.0,
          },
        },
        endTidalCO2: {
          value: 39,
          unit: 'mmHg',
          normalRange: [35, 45],
          provenance: {
            type: 'MEASURED',
            sensorCode: 'CAPNO-01',
            hardware: 'ECLSS Integrated Capnography Mask',
            samplingRate: 'Per-Breath Sampling',
            calibrationDate: '2026-10-15',
            timestamp: nowIso,
            quality: 'OPTIMAL',
            confidencePct: 98.2,
          },
        },
        hydrationBioimpedance: {
          totalBodyWater_L: 39.8,
          extracellularWaterRatio: 0.39,
          hydrationStatus: 'BORDERLINE_DEFICIT',
          provenance: {
            type: 'DERIVED',
            sensorCode: 'BIS-01',
            hardware: 'Bio-Impedance Spectroscopy Garment Array',
            samplingRate: 'Morning Baseline Cycle',
            calibrationDate: '2026-11-14',
            timestamp: nowIso,
            quality: 'OPTIMAL',
            confidencePct: 95.4,
            derivationFormula: 'Cole-Cole dispersion model for extracellular/intracellular fluid partitioning',
          },
        },
        capillaryLactate: {
          value: 1.2,
          unit: 'mmol/L',
          normalRange: [0.5, 2.0],
          provenance: {
            type: 'MEASURED',
            sensorCode: 'LACT-02',
            hardware: 'Electrochemical Test Strip',
            samplingRate: 'Post-Rest Baseline',
            calibrationDate: '2026-11-14',
            timestamp: nowIso,
            quality: 'OPTIMAL',
            confidencePct: 98.0,
          },
        },
      },
    };
  }

  if (id === 'patel') {
    const rrData = generateRRIntervals(64, 62, 60);
    const radHistory = generateRadiationHistory(false);
    const cumulativeAbsorbed = radHistory.reduce((acc, r) => acc + r.absorbedDose_mGy, 0) * 0.95;
    const cumulativeEquivalent = radHistory.reduce((acc, r) => acc + r.equivalentDose_mSv, 0) * 0.95;

    return {
      astronautId: 'patel',
      name: 'Specialist Rajesh Patel',
      callsign: 'TITAN',
      missionDay: 142,
      solarisStatus: 'NOMINAL',
      cardiovascular: {
        heartRate: {
          current: 64,
          resting: 62,
          min24h: 52,
          max24h: 135,
          unit: 'bpm',
          provenance: {
            type: 'MEASURED',
            sensorCode: 'ECG-01',
            hardware: 'Bio-Monitor / AstroSkin 3-Lead Thoracic Array',
            samplingRate: '250 Hz Continuous',
            calibrationDate: '2026-10-01',
            timestamp: nowIso,
            quality: 'OPTIMAL',
            confidencePct: 99.7,
          },
        },
        hrvRMSSD: {
          value: 62,
          unit: 'ms',
          baseline: 60,
          status: 'OPTIMAL',
          provenance: {
            type: 'DERIVED',
            sensorCode: 'ECG-01-ALG',
            hardware: 'Solaris On-Board HRV DSP Kernel',
            samplingRate: 'Per Beat-to-Beat Interval',
            calibrationDate: '2026-11-14',
            timestamp: nowIso,
            quality: 'OPTIMAL',
            confidencePct: 99.0,
            derivationFormula: 'RMSSD = √[ (1/(N-1)) × ∑(RR_i+1 - RR_i)² ]',
          },
        },
        hrvSDNN: {
          value: 74,
          unit: 'ms',
          baseline: 72,
          provenance: {
            type: 'DERIVED',
            sensorCode: 'ECG-01-ALG',
            hardware: 'Solaris On-Board HRV DSP Kernel',
            samplingRate: '5-minute rolling window',
            calibrationDate: '2026-11-14',
            timestamp: nowIso,
            quality: 'OPTIMAL',
            confidencePct: 98.8,
          },
        },
        pnn50: {
          value: 18.4,
          unit: '%',
          provenance: {
            type: 'DERIVED',
            sensorCode: 'ECG-01-ALG',
            hardware: 'Solaris On-Board HRV DSP Kernel',
            samplingRate: '5-minute window',
            calibrationDate: '2026-11-14',
            timestamp: nowIso,
            quality: 'OPTIMAL',
            confidencePct: 99.1,
          },
        },
        stressIndex: {
          value: 64,
          status: 'RELAXED',
          provenance: {
            type: 'DERIVED',
            sensorCode: 'ALG-BAEVSKY',
            hardware: 'Baevsky Tension Index Evaluator',
            samplingRate: 'Per-minute batch',
            calibrationDate: '2026-11-14',
            timestamp: nowIso,
            quality: 'OPTIMAL',
            confidencePct: 97.2,
          },
        },
        ecgSignal: {
          lead: 'Lead II (Thorax)',
          impedance_kohm: 3.1,
          snr_db: 34.2,
          filterBandwidth: '0.05 - 100 Hz',
          status: 'OPTIMAL',
          provenance: {
            type: 'MEASURED',
            sensorCode: 'ECG-01',
            hardware: 'AstroSkin Dry Contact Thoracic Electrodes',
            samplingRate: '250 Hz',
            calibrationDate: '2026-10-01',
            timestamp: nowIso,
            quality: 'OPTIMAL',
            confidencePct: 99.6,
          },
        },
        baselineComparison: {
          medianResting: 61,
          mad: 2.5,
          currentZScore: 0.4,
          driftDirection: 'STABLE',
          clinicalVerdict: 'Resting rate and HRV match pre-flight endurance conditioning baseline within 0.4 standard deviations. High vagal tone preserved.',
        },
        rrIntervals: rrData.rrs,
        poincareData: rrData.poincare,
        history24h: [
          { time: '00:00', hr: 56, hrvRMSSD: 68 },
          { time: '04:00', hr: 54, hrvRMSSD: 70 },
          { time: '08:00', hr: 66, hrvRMSSD: 60 },
          { time: '12:00', hr: 72, hrvRMSSD: 58 },
          { time: '16:00', hr: 68, hrvRMSSD: 61 },
          { time: '20:00', hr: 63, hrvRMSSD: 64 },
          { time: 'Live', hr: 64, hrvRMSSD: 62 },
        ],
        history7d: [
          { day: 'Sol 136', hrResting: 61, hrvRMSSD: 64, hrvSDNN: 75 },
          { day: 'Sol 137', hrResting: 60, hrvRMSSD: 65, hrvSDNN: 76 },
          { day: 'Sol 138', hrResting: 62, hrvRMSSD: 62, hrvSDNN: 73 },
          { day: 'Sol 139', hrResting: 63, hrvRMSSD: 61, hrvSDNN: 72 },
          { day: 'Sol 140', hrResting: 61, hrvRMSSD: 63, hrvSDNN: 74 },
          { day: 'Sol 141', hrResting: 62, hrvRMSSD: 62, hrvSDNN: 73 },
          { day: 'Sol 142', hrResting: 62, hrvRMSSD: 62, hrvSDNN: 74 },
        ],
      },
      bloodPressure: {
        systolic: {
          value: 114,
          unit: 'mmHg',
          provenance: {
            type: 'MEASURED',
            sensorCode: 'BP-03',
            hardware: 'AstroSkin Automatic Inflatable Arm Cuff',
            samplingRate: 'Hourly Cycle',
            calibrationDate: '2026-10-01',
            timestamp: nowIso,
            quality: 'OPTIMAL',
            confidencePct: 99.1,
          },
        },
        diastolic: {
          value: 72,
          unit: 'mmHg',
          provenance: {
            type: 'MEASURED',
            sensorCode: 'BP-03',
            hardware: 'AstroSkin Automatic Inflatable Arm Cuff',
            samplingRate: 'Hourly Cycle',
            calibrationDate: '2026-10-01',
            timestamp: nowIso,
            quality: 'OPTIMAL',
            confidencePct: 99.1,
          },
        },
        map: {
          value: calculateMAP(114, 72),
          unit: 'mmHg',
          formula: 'MAP = DP + 1/3(SP - DP) = (2×DP + SP) / 3',
          provenance: {
            type: 'DERIVED',
            sensorCode: 'BP-03-DERIVED',
            hardware: 'Solaris Physiological Inference Engine',
            samplingRate: 'Calculated upon BP cycle completion',
            calibrationDate: '2026-11-14',
            timestamp: nowIso,
            quality: 'OPTIMAL',
            confidencePct: 99.1,
            derivationFormula: 'MAP = 72 + (114 - 72)/3 = 86.0 mmHg',
          },
        },
        pulsePressure: {
          value: calculatePulsePressure(114, 72),
          unit: 'mmHg',
          formula: 'PP = SP - DP',
          provenance: {
            type: 'DERIVED',
            sensorCode: 'BP-03-DERIVED',
            hardware: 'Solaris Physiological Inference Engine',
            samplingRate: 'Calculated upon BP cycle completion',
            calibrationDate: '2026-11-14',
            timestamp: nowIso,
            quality: 'OPTIMAL',
            confidencePct: 99.1,
            derivationFormula: 'PP = 114 - 72 = 42 mmHg',
          },
        },
        classification: 'OPTIMAL',
        qualityInfo: {
          cuffLocation: 'Left Upper Brachial',
          pneumaticSeal: 'CONFIRMED_NOMINAL',
          hydrostaticOffset: '0 mmHg (Microgravity neutral hydrostatic column)',
          motionArtifact: 'NONE_DETECTED',
        },
        history24h: [
          { time: '00:00', systolic: 110, diastolic: 68, map: 82.0 },
          { time: '04:00', systolic: 108, diastolic: 66, map: 80.0 },
          { time: '08:00', systolic: 115, diastolic: 73, map: 87.0 },
          { time: '12:00', systolic: 118, diastolic: 75, map: 89.3 },
          { time: '16:00', systolic: 116, diastolic: 74, map: 88.0 },
          { time: '20:00', systolic: 113, diastolic: 71, map: 85.0 },
          { time: 'Live', systolic: 114, diastolic: 72, map: 86.0 },
        ],
        history7d: [
          { day: 'Sol 136', systolic: 114, diastolic: 71, map: 85.3 },
          { day: 'Sol 137', systolic: 113, diastolic: 72, map: 85.7 },
          { day: 'Sol 138', systolic: 115, diastolic: 73, map: 87.0 },
          { day: 'Sol 139', systolic: 114, diastolic: 72, map: 86.0 },
          { day: 'Sol 140', systolic: 113, diastolic: 71, map: 85.0 },
          { day: 'Sol 141', systolic: 115, diastolic: 72, map: 86.3 },
          { day: 'Sol 142', systolic: 114, diastolic: 72, map: 86.0 },
        ],
      },
      sleepRecovery: {
        totalSleepTime_hrs: 7.8,
        timeInBed_hrs: 8.2,
        sleepEfficiency_pct: {
          value: calculateSleepEfficiency(7.8, 8.2),
          formula: '(Total Sleep Time / Time in Bed) × 100',
          provenance: {
            type: 'DERIVED',
            sensorCode: 'ACT-07-ALG',
            hardware: 'Bio-Monitor Pelvic Actimetry + RIP Algorithm',
            samplingRate: 'Aggregated Polysomnography Proxy',
            calibrationDate: '2026-11-14',
            timestamp: nowIso,
            quality: 'OPTIMAL',
            confidencePct: 98.4,
            derivationFormula: '(7.8 / 8.2) × 100 = 95.1%',
          },
        },
        sleepLatency_min: 14,
        waso_min: 18,
        awakeningsCount: 1,
        microArousalsCount: 5,
        sleepFragmentationIndex: {
          value: calculateSleepFragmentation(1, 5, 7.8),
          formula: '(Awakenings + Micro-Arousals) / TST_hrs',
          status: 'LOW',
          provenance: {
            type: 'DERIVED',
            sensorCode: 'ACT-07-SFI',
            hardware: 'Actigraphy Movement & Arousal Counter',
            samplingRate: 'Nightly Sleep Window Integration',
            calibrationDate: '2026-11-14',
            timestamp: nowIso,
            quality: 'OPTIMAL',
            confidencePct: 98.0,
            derivationFormula: '(1 + 5) / 7.8 = 0.77 events/hour',
          },
        },
        stagesBreakdown: {
          rem_pct: 22.4,
          deep_n3_pct: 20.8,
          light_n1_n2_pct: 51.2,
          awake_pct: 5.6,
        },
        hypnogram: generateHypnogram(8.2),
        fatigueCorrelations: {
          pvtReactionTime_ms: 224,
          pvtLapsesCount: 0,
          kssScore: 2,
          sleepDebtCumulative_hrs: 0.2,
          recoveryScore_pct: 94,
          readinessGrade: 'OPTIMAL',
          clinicalNotes: 'Excellent sleep continuity with robust slow-wave N3 deep sleep (20.8%). PVT reaction time 224 ms with 0 lapses indicates full operational alertness for planned EVA activity.',
        },
      },
      radiation: {
        realTimeDoseRate: {
          absorbed_uGy_h: 13.9,
          equivalent_uSv_h: 25.3,
          provenance: {
            type: 'MEASURED',
            sensorCode: 'CAD-06',
            hardware: 'NASA Crew Active Dosimeter (CAD Silicon Semiconductor)',
            samplingRate: '1-Minute Integration',
            calibrationDate: '2026-10-01',
            timestamp: nowIso,
            quality: 'OPTIMAL',
            confidencePct: 99.8,
          },
        },
        currentDailyDose: {
          absorbed_mGy: 0.33,
          equivalent_mSv: 0.60,
          provenance: {
            type: 'DERIVED',
            sensorCode: 'CAD-06-INTEG',
            hardware: 'Solaris Active Dosimetry Processor',
            samplingRate: 'Daily Sol Cumulative',
            calibrationDate: '2026-11-14',
            timestamp: nowIso,
            quality: 'OPTIMAL',
            confidencePct: 99.8,
          },
        },
        cumulativeMissionDose: {
          absorbed_mGy: Math.round(cumulativeAbsorbed * 10) / 10,
          equivalent_mSv: Math.round(cumulativeEquivalent * 10) / 10,
          formula: 'Equivalent Dose H (Sv) = ∑ [ Absorbed Dose D (Gy) × Weighting Factor WR ]',
          careerLimit_mSv: 600,
          annualLimit_mSv: 250,
          thirtyDayLimit_mSv: 50,
          careerDosePercentage: Math.round(((cumulativeEquivalent) / 600) * 1000) / 10,
          provenance: {
            type: 'DERIVED',
            sensorCode: 'CAD-06-CUMUL',
            hardware: 'Solaris Dosimetry Core',
            samplingRate: 'Sol 1 through Sol 142 Integration',
            calibrationDate: '2026-11-14',
            timestamp: nowIso,
            quality: 'OPTIMAL',
            confidencePct: 99.9,
          },
        },
        speEventStatus: {
          level: 'NOMINAL_GCR',
          fluxRate_protons_cm2_s: 1.1,
          warningLeadTime_min: 180,
          stormShelterRecommended: false,
        },
        radiationDistinctionGuide: {
          absorbedDoseDef: 'Absorbed Dose (Gray, Gy = 1 J/kg): Measures the physical fundamental energy deposited by ionizing radiation per unit mass of biological tissue.',
          equivalentDoseDef: 'Equivalent Dose (Sievert, Sv): Measures the stochastic biological damage and cancer risk. Calculated as H = D × WR, where WR accounts for radiation type (WR = 1 for photons/electrons, WR = 2 for low-energy protons, WR = 20 for heavy GCR relativistic nuclei like 56Fe).',
        },
        clinicalGuidance: {
          currentStatus: 'Galactic Cosmic Ray (GCR) nominal. Career dose accumulation tracking at 13.3% of 600 mSv limit.',
          protocol: 'Approved for scheduled extravehicular activity (EVA) suit dosimeter deployment.',
          countermeasures: [
            'Suit supplemental water-cooling garment radiation absorption factor 1.08',
            'Post-EVA active badge cross-calibration protocol',
          ],
          monitoringSchedule: 'Real-time telemetry continuous; EVA threshold alarm set at 100 µSv/h.',
        },
        dailyHistory: radHistory,
      },
      metabolic: {
        respiratoryRate: {
          value: 12.8,
          unit: 'breaths/min',
          normalRange: [12, 18],
          waveformSample: [0, 0.5, 0.9, 1.0, 0.6, 0.1, 0, -0.4, -0.1, 0],
          provenance: {
            type: 'MEASURED',
            sensorCode: 'RIP-02',
            hardware: 'AstroSkin Thoracic & Abdominal Respiration Bands',
            samplingRate: '50 Hz Waveform',
            calibrationDate: '2026-10-01',
            timestamp: nowIso,
            quality: 'OPTIMAL',
            confidencePct: 99.2,
          },
        },
        spo2: {
          value: 99.1,
          unit: '%',
          normalRange: [95, 100],
          perfusionIndex_pct: 6.8,
          provenance: {
            type: 'MEASURED',
            sensorCode: 'OX-04',
            hardware: 'Bio-Monitor Continuous Optical PPG Sensor',
            samplingRate: '1 Hz Continuous',
            calibrationDate: '2026-10-01',
            timestamp: nowIso,
            quality: 'OPTIMAL',
            confidencePct: 99.7,
          },
        },
        bloodGlucose: {
          value_mg_dl: 86,
          value_mmol_l: 4.8,
          unit: 'mg/dL',
          normalRange: [70, 99],
          mealStatus: 'FASTING_MORNING',
          provenance: {
            type: 'MEASURED',
            sensorCode: 'BIO-GLUC-01',
            hardware: 'Microfluidic Capillary Blood Analyzer',
            samplingRate: 'Single Pre-Breakfast Test',
            calibrationDate: '2026-11-14',
            timestamp: nowIso,
            quality: 'OPTIMAL',
            confidencePct: 98.5,
          },
        },
        coreTemperature: {
          value_c: 36.8,
          value_f: 98.24,
          unit: '°C',
          normalRange: [36.5, 37.5],
          spaceflightHyperthermiaNote: 'Thermal balance nominal. Efficient dermal dissipation maintained.',
          provenance: {
            type: 'MEASURED',
            sensorCode: 'TMP-05',
            hardware: 'AstroSkin Infrared Core & Skin Heat-Flux Thermistor',
            samplingRate: '10-Second Continuous Averaging',
            calibrationDate: '2026-10-01',
            timestamp: nowIso,
            quality: 'OPTIMAL',
            confidencePct: 99.5,
          },
        },
        endTidalCO2: {
          value: 36,
          unit: 'mmHg',
          normalRange: [35, 45],
          provenance: {
            type: 'MEASURED',
            sensorCode: 'CAPNO-01',
            hardware: 'ECLSS Integrated Capnography Mask',
            samplingRate: 'Per-Breath Sampling',
            calibrationDate: '2026-10-15',
            timestamp: nowIso,
            quality: 'OPTIMAL',
            confidencePct: 98.9,
          },
        },
        hydrationBioimpedance: {
          totalBodyWater_L: 44.5,
          extracellularWaterRatio: 0.38,
          hydrationStatus: 'EUHYDRATED',
          provenance: {
            type: 'DERIVED',
            sensorCode: 'BIS-01',
            hardware: 'Bio-Impedance Spectroscopy Garment Array',
            samplingRate: 'Morning Baseline Cycle',
            calibrationDate: '2026-11-14',
            timestamp: nowIso,
            quality: 'OPTIMAL',
            confidencePct: 97.2,
          },
        },
        capillaryLactate: {
          value: 0.9,
          unit: 'mmol/L',
          normalRange: [0.5, 2.0],
          provenance: {
            type: 'MEASURED',
            sensorCode: 'LACT-02',
            hardware: 'Electrochemical Test Strip',
            samplingRate: 'Post-Rest Baseline',
            calibrationDate: '2026-11-14',
            timestamp: nowIso,
            quality: 'OPTIMAL',
            confidencePct: 98.5,
          },
        },
      },
    };
  }

  // Default: Vance (Commander Vance)
  const rrData = generateRRIntervals(96, 38, 60);
  const radHistory = generateRadiationHistory(false);
  const cumulativeAbsorbed = radHistory.reduce((acc, r) => acc + r.absorbedDose_mGy, 0);
  const cumulativeEquivalent = radHistory.reduce((acc, r) => acc + r.equivalentDose_mSv, 0);

  return {
    astronautId: 'vance',
    name: 'Commander Alexander Vance',
    callsign: 'APEX',
    missionDay: 142,
    solarisStatus: 'OBSERVATION',
    cardiovascular: {
      heartRate: {
        current: 96,
        resting: 92,
        min24h: 68,
        max24h: 128,
        unit: 'bpm',
        provenance: {
          type: 'MEASURED',
          sensorCode: 'ECG-01',
          hardware: 'Bio-Monitor / AstroSkin 3-Lead Thoracic Array',
          samplingRate: '250 Hz Continuous',
          calibrationDate: '2026-10-01',
          timestamp: nowIso,
          quality: 'OPTIMAL',
          confidencePct: 99.5,
        },
      },
      hrvRMSSD: {
        value: 38,
        unit: 'ms',
        baseline: 52,
        status: 'MODERATE_STRAIN',
        provenance: {
          type: 'DERIVED',
          sensorCode: 'ECG-01-ALG',
          hardware: 'Solaris On-Board HRV DSP Kernel',
          samplingRate: 'Per Beat-to-Beat Interval',
          calibrationDate: '2026-11-14',
          timestamp: nowIso,
          quality: 'OPTIMAL',
          confidencePct: 98.5,
          derivationFormula: 'RMSSD = √[ (1/(N-1)) × ∑(RR_i+1 - RR_i)² ]',
          note: 'Moderate vagal withdrawal accompanied by intermittent ectopic jumps under microgravity cephalad fluid shift.',
        },
      },
      hrvSDNN: {
        value: 48,
        unit: 'ms',
        baseline: 64,
        provenance: {
          type: 'DERIVED',
          sensorCode: 'ECG-01-ALG',
          hardware: 'Solaris On-Board HRV DSP Kernel',
          samplingRate: '5-minute rolling window',
          calibrationDate: '2026-11-14',
          timestamp: nowIso,
          quality: 'OPTIMAL',
          confidencePct: 98.0,
          derivationFormula: 'SDNN = √[ (1/(N-1)) × ∑(RR_i - RR_mean)² ]',
        },
      },
      pnn50: {
        value: 6.2,
        unit: '%',
        provenance: {
          type: 'DERIVED',
          sensorCode: 'ECG-01-ALG',
          hardware: 'Solaris On-Board HRV DSP Kernel',
          samplingRate: '5-minute window',
          calibrationDate: '2026-11-14',
          timestamp: nowIso,
          quality: 'OPTIMAL',
          confidencePct: 98.5,
        },
      },
      stressIndex: {
        value: 142,
        status: 'EUSTRESS',
        provenance: {
          type: 'DERIVED',
          sensorCode: 'ALG-BAEVSKY',
          hardware: 'Baevsky Tension Index Evaluator',
          samplingRate: 'Per-minute batch',
          calibrationDate: '2026-11-14',
          timestamp: nowIso,
          quality: 'OPTIMAL',
          confidencePct: 96.0,
        },
      },
      ecgSignal: {
        lead: 'Lead II (Thorax)',
        impedance_kohm: 3.8,
        snr_db: 31.0,
        filterBandwidth: '0.05 - 100 Hz',
        status: 'OPTIMAL',
        provenance: {
          type: 'MEASURED',
          sensorCode: 'ECG-01',
          hardware: 'AstroSkin Dry Contact Thoracic Electrodes',
          samplingRate: '250 Hz',
          calibrationDate: '2026-10-01',
          timestamp: nowIso,
          quality: 'OPTIMAL',
          confidencePct: 99.4,
        },
      },
      baselineComparison: {
        medianResting: 64,
        mad: 3.5,
        currentZScore: 2.8,
        driftDirection: 'ELEVATED',
        clinicalVerdict: 'Resting rate is +28 bpm above terrestrial baseline (92 vs 64 bpm). Ectopic premature atrial complexes detected in Lead II. Cephalic venous congestion under review.',
      },
      rrIntervals: rrData.rrs,
      poincareData: rrData.poincare,
      history24h: [
        { time: '00:00', hr: 78, hrvRMSSD: 42 },
        { time: '04:00', hr: 74, hrvRMSSD: 45 },
        { time: '08:00', hr: 94, hrvRMSSD: 37 },
        { time: '12:00', hr: 98, hrvRMSSD: 36 },
        { time: '16:00', hr: 95, hrvRMSSD: 38 },
        { time: '20:00', hr: 92, hrvRMSSD: 40 },
        { time: 'Live', hr: 96, hrvRMSSD: 38 },
      ],
      history7d: [
        { day: 'Sol 136', hrResting: 72, hrvRMSSD: 48, hrvSDNN: 60 },
        { day: 'Sol 137', hrResting: 75, hrvRMSSD: 46, hrvSDNN: 58 },
        { day: 'Sol 138', hrResting: 79, hrvRMSSD: 44, hrvSDNN: 55 },
        { day: 'Sol 139', hrResting: 83, hrvRMSSD: 41, hrvSDNN: 52 },
        { day: 'Sol 140', hrResting: 88, hrvRMSSD: 39, hrvSDNN: 50 },
        { day: 'Sol 141', hrResting: 90, hrvRMSSD: 38, hrvSDNN: 49 },
        { day: 'Sol 142', hrResting: 92, hrvRMSSD: 38, hrvSDNN: 48 },
      ],
    },
    bloodPressure: {
      systolic: {
        value: 124,
        unit: 'mmHg',
        provenance: {
          type: 'MEASURED',
          sensorCode: 'BP-03',
          hardware: 'AstroSkin Automatic Inflatable Arm Cuff',
          samplingRate: 'Hourly Cycle',
          calibrationDate: '2026-10-01',
          timestamp: nowIso,
          quality: 'OPTIMAL',
          confidencePct: 98.8,
        },
      },
      diastolic: {
        value: 78,
        unit: 'mmHg',
        provenance: {
          type: 'MEASURED',
          sensorCode: 'BP-03',
          hardware: 'AstroSkin Automatic Inflatable Arm Cuff',
          samplingRate: 'Hourly Cycle',
          calibrationDate: '2026-10-01',
          timestamp: nowIso,
          quality: 'OPTIMAL',
          confidencePct: 98.8,
        },
      },
      map: {
        value: calculateMAP(124, 78),
        unit: 'mmHg',
        formula: 'MAP = DP + 1/3(SP - DP) = (2×DP + SP) / 3',
        provenance: {
          type: 'DERIVED',
          sensorCode: 'BP-03-DERIVED',
          hardware: 'Solaris Physiological Inference Engine',
          samplingRate: 'Calculated upon BP cycle completion',
          calibrationDate: '2026-11-14',
          timestamp: nowIso,
          quality: 'OPTIMAL',
          confidencePct: 98.8,
          derivationFormula: 'MAP = 78 + (124 - 78)/3 = 93.3 mmHg',
        },
      },
      pulsePressure: {
        value: calculatePulsePressure(124, 78),
        unit: 'mmHg',
        formula: 'PP = SP - DP',
        provenance: {
          type: 'DERIVED',
          sensorCode: 'BP-03-DERIVED',
          hardware: 'Solaris Physiological Inference Engine',
          samplingRate: 'Calculated upon BP cycle completion',
          calibrationDate: '2026-11-14',
          timestamp: nowIso,
          quality: 'OPTIMAL',
          confidencePct: 98.8,
          derivationFormula: 'PP = 124 - 78 = 46 mmHg',
        },
      },
      classification: 'NORMAL',
      qualityInfo: {
        cuffLocation: 'Left Upper Brachial',
        pneumaticSeal: 'CONFIRMED_NOMINAL',
        hydrostaticOffset: '0 mmHg (Microgravity neutral hydrostatic column)',
        motionArtifact: 'NONE_DETECTED',
      },
      history24h: [
        { time: '00:00', systolic: 116, diastolic: 72, map: 86.7 },
        { time: '04:00', systolic: 112, diastolic: 70, map: 84.0 },
        { time: '08:00', systolic: 122, diastolic: 76, map: 91.3 },
        { time: '12:00', systolic: 126, diastolic: 80, map: 95.3 },
        { time: '16:00', systolic: 125, diastolic: 79, map: 94.3 },
        { time: '20:00', systolic: 123, diastolic: 77, map: 92.3 },
        { time: 'Live', systolic: 124, diastolic: 78, map: 93.3 },
      ],
      history7d: [
        { day: 'Sol 136', systolic: 118, diastolic: 74, map: 88.7 },
        { day: 'Sol 137', systolic: 119, diastolic: 75, map: 89.7 },
        { day: 'Sol 138', systolic: 121, diastolic: 76, map: 91.0 },
        { day: 'Sol 139', systolic: 122, diastolic: 77, map: 92.0 },
        { day: 'Sol 140', systolic: 123, diastolic: 78, map: 93.0 },
        { day: 'Sol 141', systolic: 124, diastolic: 78, map: 93.3 },
        { day: 'Sol 142', systolic: 124, diastolic: 78, map: 93.3 },
      ],
    },
    sleepRecovery: {
      totalSleepTime_hrs: 5.4,
      timeInBed_hrs: 7.2,
      sleepEfficiency_pct: {
        value: calculateSleepEfficiency(5.4, 7.2),
        formula: '(Total Sleep Time / Time in Bed) × 100',
        provenance: {
          type: 'DERIVED',
          sensorCode: 'ACT-07-ALG',
          hardware: 'Bio-Monitor Pelvic Actimetry + RIP Algorithm',
          samplingRate: 'Aggregated Polysomnography Proxy',
          calibrationDate: '2026-11-14',
          timestamp: nowIso,
          quality: 'OPTIMAL',
          confidencePct: 96.5,
          derivationFormula: '(5.4 / 7.2) × 100 = 75.0%',
        },
      },
      sleepLatency_min: 28,
      waso_min: 44,
      awakeningsCount: 4,
      microArousalsCount: 11,
      sleepFragmentationIndex: {
        value: calculateSleepFragmentation(4, 11, 5.4),
        formula: '(Awakenings + Micro-Arousals) / TST_hrs',
        status: 'MODERATE',
        provenance: {
          type: 'DERIVED',
          sensorCode: 'ACT-07-SFI',
          hardware: 'Actigraphy Movement & Arousal Counter',
          samplingRate: 'Nightly Sleep Window Integration',
          calibrationDate: '2026-11-14',
          timestamp: nowIso,
          quality: 'OPTIMAL',
          confidencePct: 95.0,
          derivationFormula: '(4 + 11) / 5.4 = 2.78 events/hour',
        },
      },
      stagesBreakdown: {
        rem_pct: 18.2,
        deep_n3_pct: 14.5,
        light_n1_n2_pct: 53.3,
        awake_pct: 14.0,
      },
      hypnogram: generateHypnogram(7.2),
      fatigueCorrelations: {
        pvtReactionTime_ms: 278,
        pvtLapsesCount: 2,
        kssScore: 5,
        sleepDebtCumulative_hrs: 6.8,
        recoveryScore_pct: 72,
        readinessGrade: 'QUALIFIED',
        clinicalNotes: 'Sleep latency prolonged at 28 min with moderate WASO of 44 min. Circadian misalignment likely exacerbated by command scheduling. Prescribe 0.3mg melatonin 30 min before sleep station cabin blackout.',
      },
    },
    radiation: {
      realTimeDoseRate: {
        absorbed_uGy_h: 14.2,
        equivalent_uSv_h: 25.8,
        provenance: {
          type: 'MEASURED',
          sensorCode: 'CAD-06',
          hardware: 'NASA Crew Active Dosimeter (CAD Silicon Semiconductor)',
          samplingRate: '1-Minute Integration',
          calibrationDate: '2026-10-01',
          timestamp: nowIso,
          quality: 'OPTIMAL',
          confidencePct: 99.8,
        },
      },
      currentDailyDose: {
        absorbed_mGy: 0.34,
        equivalent_mSv: 0.61,
        provenance: {
          type: 'DERIVED',
          sensorCode: 'CAD-06-INTEG',
          hardware: 'Solaris Active Dosimetry Processor',
          samplingRate: 'Daily Sol Cumulative',
          calibrationDate: '2026-11-14',
          timestamp: nowIso,
          quality: 'OPTIMAL',
          confidencePct: 99.8,
        },
      },
      cumulativeMissionDose: {
        absorbed_mGy: Math.round(cumulativeAbsorbed * 10) / 10,
        equivalent_mSv: Math.round(cumulativeEquivalent * 10) / 10,
        formula: 'Equivalent Dose H (Sv) = ∑ [ Absorbed Dose D (Gy) × Weighting Factor WR ]',
        careerLimit_mSv: 600,
        annualLimit_mSv: 250,
        thirtyDayLimit_mSv: 50,
        careerDosePercentage: Math.round(((cumulativeEquivalent) / 600) * 1000) / 10,
        provenance: {
          type: 'DERIVED',
          sensorCode: 'CAD-06-CUMUL',
          hardware: 'Solaris Dosimetry Core',
          samplingRate: 'Sol 1 through Sol 142 Integration',
          calibrationDate: '2026-11-14',
          timestamp: nowIso,
          quality: 'OPTIMAL',
          confidencePct: 99.9,
        },
      },
      speEventStatus: {
        level: 'NOMINAL_GCR',
        fluxRate_protons_cm2_s: 1.15,
        warningLeadTime_min: 180,
        stormShelterRecommended: false,
      },
      radiationDistinctionGuide: {
        absorbedDoseDef: 'Absorbed Dose (Gray, Gy = 1 J/kg): Measures the physical fundamental energy deposited by ionizing radiation per unit mass of biological tissue.',
        equivalentDoseDef: 'Equivalent Dose (Sievert, Sv): Measures the stochastic biological damage and cancer risk. Calculated as H = D × WR, where WR accounts for radiation type (WR = 1 for photons/electrons, WR = 2 for low-energy protons, WR = 20 for heavy GCR relativistic nuclei like 56Fe).',
      },
      clinicalGuidance: {
        currentStatus: 'Galactic Cosmic Ray (GCR) exposure nominal. Cumulative mission equivalent dose at 84.2 mSv (14.0% of NASA 600 mSv career limit).',
        protocol: 'Daily personal dosimeter inspection; verify sleep berth water jacket configuration.',
        countermeasures: [
          'Hydration maintenance with trace zinc and selenium antioxidants',
          'Avoid unshielded cupola viewing sessions exceeding 30 min per Sol',
        ],
        monitoringSchedule: 'Continuous 1-minute Cad sensor stream; automated alert threshold at 50 µSv/h.',
      },
      dailyHistory: radHistory,
    },
    metabolic: {
      respiratoryRate: {
        value: 14.2,
        unit: 'breaths/min',
        normalRange: [12, 18],
        waveformSample: [0, 0.45, 0.85, 1.0, 0.65, 0.15, 0, -0.35, -0.1, 0],
        provenance: {
          type: 'MEASURED',
          sensorCode: 'RIP-02',
          hardware: 'AstroSkin Thoracic & Abdominal Respiration Bands',
          samplingRate: '50 Hz Waveform',
          calibrationDate: '2026-10-01',
          timestamp: nowIso,
          quality: 'OPTIMAL',
          confidencePct: 98.7,
        },
      },
      spo2: {
        value: 98.4,
        unit: '%',
        normalRange: [95, 100],
        perfusionIndex_pct: 5.2,
        provenance: {
          type: 'MEASURED',
          sensorCode: 'OX-04',
          hardware: 'Bio-Monitor Continuous Optical PPG Sensor',
          samplingRate: '1 Hz Continuous',
          calibrationDate: '2026-10-01',
          timestamp: nowIso,
          quality: 'OPTIMAL',
          confidencePct: 99.3,
        },
      },
      bloodGlucose: {
        value_mg_dl: 92,
        value_mmol_l: 5.1,
        unit: 'mg/dL',
        normalRange: [70, 99],
        mealStatus: 'FASTING_MORNING',
        provenance: {
          type: 'MEASURED',
          sensorCode: 'BIO-GLUC-01',
          hardware: 'Microfluidic Capillary Blood Analyzer',
          samplingRate: 'Single Pre-Breakfast Test',
          calibrationDate: '2026-11-14',
          timestamp: nowIso,
          quality: 'OPTIMAL',
          confidencePct: 98.0,
        },
      },
      coreTemperature: {
        value_c: 37.1,
        value_f: 98.78,
        unit: '°C',
        normalRange: [36.5, 37.5],
        spaceflightHyperthermiaNote: 'Microgravity-induced spaceflight core temperature reset observed (+0.2°C). Baseline stable.',
        provenance: {
          type: 'MEASURED',
          sensorCode: 'TMP-05',
          hardware: 'AstroSkin Infrared Core & Skin Heat-Flux Thermistor',
          samplingRate: '10-Second Continuous Averaging',
          calibrationDate: '2026-10-01',
          timestamp: nowIso,
          quality: 'OPTIMAL',
          confidencePct: 99.2,
        },
      },
      endTidalCO2: {
        value: 38,
        unit: 'mmHg',
        normalRange: [35, 45],
        provenance: {
          type: 'MEASURED',
          sensorCode: 'CAPNO-01',
          hardware: 'ECLSS Integrated Capnography Mask',
          samplingRate: 'Per-Breath Sampling',
          calibrationDate: '2026-10-15',
          timestamp: nowIso,
          quality: 'OPTIMAL',
          confidencePct: 98.6,
        },
      },
      hydrationBioimpedance: {
        totalBodyWater_L: 42.4,
        extracellularWaterRatio: 0.38,
        hydrationStatus: 'EUHYDRATED',
        provenance: {
          type: 'DERIVED',
          sensorCode: 'BIS-01',
          hardware: 'Bio-Impedance Spectroscopy Garment Array',
          samplingRate: 'Morning Baseline Cycle',
          calibrationDate: '2026-11-14',
          timestamp: nowIso,
          quality: 'OPTIMAL',
          confidencePct: 96.8,
        },
      },
      capillaryLactate: {
        value: 1.1,
        unit: 'mmol/L',
        normalRange: [0.5, 2.0],
        provenance: {
          type: 'MEASURED',
          sensorCode: 'LACT-02',
          hardware: 'Electrochemical Test Strip',
          samplingRate: 'Post-Rest Baseline',
          calibrationDate: '2026-11-14',
          timestamp: nowIso,
          quality: 'OPTIMAL',
          confidencePct: 98.2,
        },
      },
    },
  };
}
