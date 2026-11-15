/**
 * Crew Profile definitions and baseline configurations for SOLARIS.
 */

export interface CrewVitals {
  heartRate: number;
  hrv: number;
  spo2: number;
  respRate: number;
  coreTemp: number;
  radiation_mSv: number;
  sleepHours: number;
  bloodPressure?: string;
  sleepDuration?: number;
}

export interface HotspotNarration {
  hotspot: string;
  text: string;
}

export interface MLAnalysis {
  status: 'NOMINAL' | 'CAUTION' | 'CRITICAL';
  confidence_pct: number;
  is_anomaly: boolean;
  anomaly_score: number;
  top_contributing_factors?: Array<{ feature: string; value: number; impact_score: number }>;
  causal_explanation?: string;
  countermeasures?: string[];
}

export interface CrewProfile {
  id: 'vance' | 'patel' | 'chen' | string;
  name: string;
  callsign: string;
  role: string;
  status: 'Nominal' | 'Caution' | 'Warning' | 'normal' | 'watch' | 'review';
  badgeColor: string;
  vitals: CrewVitals;
  summaryVerdict: string;
  narrationScript: HotspotNarration[];
  mlAnalysis?: MLAnalysis;
}

export const CREW_PROFILES: Record<string, CrewProfile> = {
  vance: {
    id: 'vance',
    name: 'Commander Vance',
    callsign: 'CMDR. A. VANCE',
    role: 'Mission Commander',
    status: 'Caution',
    badgeColor: '#E0BE6A',
    vitals: {
      spo2: 98.4,
      respRate: 14.2,
      heartRate: 96,
      hrv: 38,
      coreTemp: 37.1,
      radiation_mSv: 54.8,
      sleepHours: 5.4,
      bloodPressure: '128/84',
      sleepDuration: 5.4,
    },
    summaryVerdict:
      'All pulmonary and oxygen readings are nominal, Commander Vance. Cardiac telemetry indicates elevated heart rate at 96 BPM with decreased HRV.',
    narrationScript: [
      {
        hotspot: 'headband',
        text: 'Astroskin forehead PPG indicates oxygen saturation at 98.4 percent with steady cranial pulse transit time.',
      },
      {
        hotspot: 'heart',
        text: 'Thoracic ECG registers heart rate at 96 BPM with lower heart rate variability at 38 milliseconds.',
      },
      {
        hotspot: 'lungs',
        text: 'Dual-band respiration is stable at 14.2 breaths per minute, and core temperature is nominal at 37.1 degrees.',
      },
      {
        hotspot: 'archer',
        text: 'Actigraphy logs sleep duration at 5.4 hours with moderate circadian phase disruption.',
      },
      {
        hotspot: 'dosimeter',
        text: 'HERA dosimeter registers cumulative radiation within mission limits.',
      },
    ],
  },
  patel: {
    id: 'patel',
    name: 'Specialist Patel',
    callsign: 'SPEC. R. PATEL',
    role: 'EVA Specialist',
    status: 'Nominal',
    badgeColor: '#6FBF9B',
    vitals: {
      spo2: 99.1,
      respRate: 12.8,
      heartRate: 64,
      hrv: 62,
      coreTemp: 36.8,
      radiation_mSv: 48.2,
      sleepHours: 7.8,
      bloodPressure: '118/76',
      sleepDuration: 7.8,
    },
    summaryVerdict:
      'All biometric parameters are in optimal range, Specialist Patel. Physical readiness indicators are nominal.',
    narrationScript: [
      {
        hotspot: 'headband',
        text: 'Astroskin headband confirms optimal cephalic hemodynamics and oxygen saturation at 99.1 percent.',
      },
      {
        hotspot: 'heart',
        text: 'Thoracic ECG indicates resting sinus rhythm of 64 BPM and robust HRV at 62 milliseconds.',
      },
      {
        hotspot: 'lungs',
        text: 'Respiration is steady at 12.8 breaths per minute, core temperature optimal at 36.8 degrees.',
      },
      {
        hotspot: 'archer',
        text: 'Actigraphy confirms 7.8 hours of restful sleep and nominal circadian recovery.',
      },
      {
        hotspot: 'dosimeter',
        text: 'HERA dosimeter confirms nominal environmental shielding with cumulative dose nominal.',
      },
    ],
  },
  chen: {
    id: 'chen',
    name: 'Commander Sarah Chen',
    callsign: 'CDR. S. CHEN',
    role: 'Flight Engineer / Science Officer',
    status: 'Warning',
    badgeColor: '#E58F55',
    vitals: {
      spo2: 97.6,
      respRate: 15.6,
      heartRate: 88,
      hrv: 35,
      coreTemp: 37.3,
      radiation_mSv: 56.4,
      sleepHours: 4.5,
      bloodPressure: '132/88',
      sleepDuration: 4.5,
    },
    summaryVerdict:
      'Commander Chen, telemetry indicates microgravity spinal unloading discomfort and a sleep deficit of 4.5 hours with elevated heart rate.',
    narrationScript: [
      {
        hotspot: 'headband',
        text: 'Astroskin headband notes slight cranial fluid shifting, with SpO2 at 97.6 percent.',
      },
      {
        hotspot: 'heart',
        text: 'Thoracic ECG shows resting heart rate of 88 BPM reflecting autonomic response to fatigue.',
      },
      {
        hotspot: 'lungs',
        text: 'Respiration rate is slightly elevated at 15.6 breaths per minute.',
      },
      {
        hotspot: 'archer',
        text: 'Actigraphy flags reduced sleep duration at 4.5 hours, indicating circadian desynchrony.',
      },
      {
        hotspot: 'dosimeter',
        text: 'HERA dosimeter telemetry confirms cumulative radiation within solar quiet thresholds.',
      },
    ],
  },
  brooks: {
    id: 'brooks',
    name: 'Dr. Alexei Brooks',
    callsign: 'DR. A. BROOKS',
    role: 'Medical Specialist',
    status: 'Nominal',
    badgeColor: '#3B82F6',
    vitals: {
      spo2: 98.8,
      respRate: 13.5,
      heartRate: 72,
      hrv: 55,
      coreTemp: 36.9,
      radiation_mSv: 50.1,
      sleepHours: 7.2,
      bloodPressure: '120/80',
      sleepDuration: 7.2,
    },
    summaryVerdict:
      'All biometric readings are within mission parameters, Dr. Brooks. Autonomic indicators and recovery status nominal.',
    narrationScript: [
      {
        hotspot: 'headband',
        text: 'Astroskin headband indicates nominal cerebral blood flow and oxygen saturation at 98.8 percent.',
      },
      {
        hotspot: 'heart',
        text: 'Thoracic ECG indicates resting sinus rhythm of 72 BPM and healthy autonomic balance.',
      },
      {
        hotspot: 'lungs',
        text: 'Respiratory mechanics are nominal at 13.5 breaths per minute.',
      },
      {
        hotspot: 'archer',
        text: 'Actigraphy registers 7.2 hours of consolidated rest.',
      },
      {
        hotspot: 'dosimeter',
        text: 'Radiation dosimeter confirms cumulative dose within mission constraints.',
      },
    ],
  },
};
