import {
  HealthRecord,
  CrewMember,
  MissionTask,
  IndicatorType,
} from '../api/types';
import { INDICATOR_THRESHOLDS } from '../data/thresholds';

export const CREW_MEMBERS: CrewMember[] = [
  {
    id: 'ASTRA-01',
    name: 'Commander Vance',
    callsign: 'CMDR. A. VANCE',
    role: 'Mission Commander',
    gender: 'male',
    mission_day: 142,
    status: 'watch',
    scenario: 'Ectopic HR & elevated cardiovascular load',
    last_assessment: 'Today 07:15',
    baseline_established: true,
  },
  {
    id: 'ASTRA-02',
    name: 'Flight Engineer Chen',
    callsign: 'FLT. ENG. M. CHEN',
    role: 'Flight Engineer / Science Officer',
    gender: 'female',
    mission_day: 142,
    status: 'review',
    scenario: 'Sleep disruption, fatigue, & multi-indicator deviation',
    last_assessment: 'Today 07:45',
    baseline_established: true,
  },
  {
    id: 'ASTRA-03',
    name: 'Specialist Patel',
    callsign: 'SPEC. R. PATEL',
    role: 'EVA Specialist',
    gender: 'male',
    mission_day: 142,
    status: 'normal',
    scenario: 'Nominal physiological baseline',
    last_assessment: 'Today 08:00',
    baseline_established: true,
  },
  {
    id: 'ASTRA-04',
    name: 'Dr. Alexei Brooks',
    callsign: 'DR. A. BROOKS',
    role: 'Medical Specialist',
    gender: 'male',
    mission_day: 142,
    status: 'normal',
    scenario: 'Clinical decision support observation',
    last_assessment: 'Today 06:50',
    baseline_established: true,
  },
];

/**
 * Deterministic pseudo-random number generator for reproducible seed data
 */
function pseudoRandom(seed: number) {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

/**
 * Generate 30 days of records for all 4 crew members
 */
export function generateSeedRecords(): HealthRecord[] {
  const records: HealthRecord[] = [];
  const now = new Date();
  let seedIndex = 12345;

  const crewIds = ['ASTRA-01', 'ASTRA-02', 'ASTRA-03', 'ASTRA-04'];
  const allIndicators: IndicatorType[] = [
    'heart_rate',
    'blood_pressure_sys',
    'blood_pressure_dia',
    'glucose',
    'temperature',
    'sleep',
    'mood',
    'fatigue',
    'spo2',
    'respiratory_rate',
    'hrv',
  ];

  for (const subjectId of crewIds) {
    for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
      const recordDate = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000);
      const dayNumber = 30 - dayOffset; // 1 to 30
      const isMaya = subjectId === 'ASTRA-02';
      const isDaniel = subjectId === 'ASTRA-03';
      const isSofia = subjectId === 'ASTRA-04';

      for (const ind of allIndicators) {
        seedIndex++;
        const rand = pseudoRandom(seedIndex);
        const threshold = INDICATOR_THRESHOLDS[ind];
        let val = threshold.default_baseline;

        // Custom astronaut profile curves
        if (isMaya) {
          // Days 1-14: Stable
          // Days 15-20: Sleep falls, fatigue climbs, mood dips
          // Days 21-30: Heart rate & BP drift up, temperature develops mild fever spike
          if (ind === 'sleep') {
            if (dayNumber <= 14) {
              val = 7.4 + (rand - 0.5) * 0.6;
            } else if (dayNumber <= 20) {
              // Decreasing sleep from 7.2 down to 5.2
              val = 7.2 - ((dayNumber - 14) / 6) * 2.0 + (rand - 0.5) * 0.4;
            } else {
              // Day 21-30: persistently low sleep 4.8 - 5.5
              val = 5.2 + (rand - 0.5) * 0.5;
            }
          } else if (ind === 'fatigue') {
            if (dayNumber <= 14) {
              val = 1.6 + (rand - 0.5) * 0.4;
            } else if (dayNumber <= 20) {
              // Fatigue climbing from 1.8 to 3.8
              val = 1.8 + ((dayNumber - 14) / 6) * 2.0 + (rand - 0.5) * 0.3;
            } else {
              // Sustained fatigue 3.8 - 4.4
              val = 3.9 + (rand - 0.5) * 0.4;
            }
          } else if (ind === 'mood') {
            if (dayNumber <= 14) {
              val = 4.2 + (rand - 0.5) * 0.4;
            } else {
              val = Math.max(2.0, 4.0 - ((dayNumber - 14) / 10) * 1.5 + (rand - 0.5) * 0.4);
            }
          } else if (ind === 'heart_rate') {
            if (dayNumber <= 18) {
              val = 63 + (rand - 0.5) * 4;
            } else {
              // Drift upward from 64 to 86 bpm
              val = 64 + ((dayNumber - 18) / 12) * 22 + (rand - 0.5) * 3;
            }
          } else if (ind === 'blood_pressure_sys') {
            if (dayNumber <= 18) {
              val = 115 + (rand - 0.5) * 6;
            } else {
              // Drift upward to 134 mmHg
              val = 116 + ((dayNumber - 18) / 12) * 18 + (rand - 0.5) * 4;
            }
          } else if (ind === 'temperature') {
            if (dayNumber <= 24) {
              val = 36.7 + (rand - 0.5) * 0.3;
            } else {
              // Mild fever emergence: 37.8 - 38.2°C
              val = 37.4 + ((dayNumber - 24) / 6) * 0.7 + (rand - 0.5) * 0.2;
            }
          } else {
            val = threshold.default_baseline + (rand - 0.5) * (threshold.default_mad * 1.5);
          }
        } else if (isDaniel) {
          // Persistent cardiovascular drift
          if (ind === 'heart_rate') {
            val = 78 + (rand - 0.5) * 6;
          } else if (ind === 'blood_pressure_sys') {
            val = 132 + (rand - 0.5) * 8;
          } else {
            val = threshold.default_baseline + (rand - 0.5) * (threshold.default_mad * 1.2);
          }
        } else if (isSofia) {
          // Sleep fragmentation
          if (ind === 'sleep') {
            val = 6.1 + (rand - 0.5) * 1.2;
          } else if (ind === 'fatigue') {
            val = 2.8 + (rand - 0.5) * 0.6;
          } else {
            val = threshold.default_baseline + (rand - 0.5) * (threshold.default_mad * 1.1);
          }
        } else {
          // Alex Morgan (Stable commander)
          val = threshold.default_baseline + (rand - 0.5) * (threshold.default_mad * 0.9);
        }

        // Format to sensible precision
        const precision = ind === 'temperature' || ind === 'sleep' || ind === 'mood' || ind === 'fatigue' ? 1 : 0;
        const roundedValue = Number(val.toFixed(precision));

        records.push({
          id: `rec-${subjectId}-${ind}-d${dayNumber}`,
          subject_id: subjectId,
          type: ind,
          value: roundedValue,
          unit: threshold.unit,
          timestamp: recordDate.toISOString(),
          source: ind === 'mood' || ind === 'fatigue' || ind === 'glucose' ? 'manual' : 'simulated_device',
          is_simulated: true, // All seeded demo data is marked simulated
          quality: 'ok',
          mission_phase: `Transit Day ${112 + dayNumber}`,
          synced: true,
          synced_at: recordDate.toISOString(),
        });
      }
    }
  }

  return records;
}

export const SEEDED_TASKS: MissionTask[] = [
  {
    id: 'TASK-01',
    title: 'EVA-03 Exterior Radiator Inspection',
    timeline_slot: 'Today 14:00 - 18:30 (4.5h)',
    mission_day: 142,
    assigned_to: 'ASTRA-02', // Maya Chen
    demands: {
      exertion: 5,
      duration: 5,
      cognitive_load: 4,
      dexterity: 5,
      exposure: 4,
    },
    affected_indicators: ['heart_rate', 'blood_pressure_sys', 'sleep', 'fatigue', 'spo2'],
    readiness_output: 'Review recommended',
    readiness_reason: 'Assigned astronaut has persistent sleep deficit and rising fatigue with cardiac drift. Recommend medical review or secondary crew reassignment before high-exertion EVA.',
  },
  {
    id: 'TASK-02',
    title: 'ARED Heavy Resistive Countermeasure Cycle',
    timeline_slot: 'Today 10:00 - 11:30 (1.5h)',
    mission_day: 142,
    assigned_to: 'ASTRA-03', // Daniel Brooks
    demands: {
      exertion: 4,
      duration: 3,
      cognitive_load: 2,
      dexterity: 2,
      exposure: 1,
    },
    affected_indicators: ['heart_rate', 'blood_pressure_sys', 'hrv'],
    readiness_output: 'No concern identified',
    readiness_reason: 'Routine countermeasure protocol maintains bone mineral density. Monitored systolic blood pressure remains within monitored parameters for resistive loading.',
  },
  {
    id: 'TASK-03',
    title: 'Life Support Sabatier Reactor Loop Filter Swap',
    timeline_slot: 'Tomorrow 09:00 - 10:30 (1.5h)',
    mission_day: 143,
    assigned_to: 'ASTRA-01', // Alex Morgan
    demands: {
      exertion: 2,
      duration: 2,
      cognitive_load: 3,
      dexterity: 3,
      exposure: 2,
    },
    affected_indicators: ['spo2', 'respiratory_rate'],
    readiness_output: 'No concern identified',
    readiness_reason: 'Commander baseline metrics fully stable. Nominal suit seal and cabin atmosphere parameters projected.',
  },
  {
    id: 'TASK-04',
    title: 'Bioculture Alpha Plate Microscopy Sampling',
    timeline_slot: 'Tomorrow 13:00 - 15:00 (2.0h)',
    mission_day: 143,
    assigned_to: 'ASTRA-04', // Sofia Reyes
    demands: {
      exertion: 1,
      duration: 3,
      cognitive_load: 4,
      dexterity: 4,
      exposure: 1,
    },
    affected_indicators: ['fatigue', 'mood'],
    readiness_output: 'No concern identified',
    readiness_reason: 'Fine motor tasks aligned with morning circadian window. Moderate cognitive demand appropriate for stable readiness.',
  },
];
