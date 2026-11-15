import { GuidanceRecommendation, HealthTimelineEvent } from '../api/types';

export const INITIAL_GUIDANCE: GuidanceRecommendation[] = [
  {
    id: 'guide-01',
    subject_id: 'ASTRA-02', // Maya Chen
    category: 'sleep',
    title: 'Circadian Phase Advance & Sleep Compression Protocol',
    observed: 'Total sleep duration suppressed to 4.5h over consecutive 72-hour window. REM duration reduced by 34%.',
    why_matters:
      'Cumulative microgravity sleep deprivation degrades working memory, reaction latency, and autonomic cardiovascular regulation.',
    what_to_monitor: 'Actiwatch nocturnal awakening frequency and morning reaction time test scores.',
    next_step:
      'Initiate 45-minute 480nm blue-enriched LED exposure upon waking. Enforce strict 8.5h dark sleep block in crew quarters.',
    when_medical_support:
      'If sleep duration persists below 5.0 hours for >48 hours or cognitive reaction lapses exceed threshold.',
    sources: ['NASA-STD-3001 Vol 1 §4.2', 'HRP Behavioral Health & Performance Standards'],
    status: 'active',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 'guide-02',
    subject_id: 'ASTRA-02', // Maya Chen
    category: 'musculoskeletal',
    title: 'ARED Axial Compression & Spine Unloading Protocol',
    observed: 'Subjective lumbar spine discomfort score 6.8/10. 3-axis IMU records +3.4 cm microgravity elongation.',
    why_matters:
      'Intervertebral disc swelling without axial gravity causes paraspinal muscle spasm and increases risk of post-landing herniation.',
    what_to_monitor: 'Lumbar morning pain score, trunk flexion range, and post-exercise soreness.',
    next_step:
      'Perform 20 minutes of ARED axial heel-drop loading and deadlifts at 85% 1-RM. Wear spinal compression harness for 60 min.',
    when_medical_support:
      'If radicular pain radiates down lower extremities or motor weakness is reported.',
    sources: ['NASA-STD-3001 Vol 1 §4.3.2', 'HRP Bone Demineralization Evidence Report'],
    status: 'active',
    timestamp: new Date(Date.now() - 14400000).toISOString(),
  },
  {
    id: 'guide-03',
    subject_id: 'ASTRA-01', // Vance / Alex Morgan
    category: 'cardiovascular',
    title: 'Post-Fluid Redistribution Hydration & Autonomic Stabilization',
    observed: 'Intermittent ectopic rate jumps up to 96 BPM. HRV RMSSD dipping to 38 ms during operational shift.',
    why_matters:
      'Cephalad fluid redistribution triggers baroreceptor resetting and circulating plasma volume contraction (-15%).',
    what_to_monitor: 'Continuous 3-lead ECG rhythm telemetry and orthostatic heart rate variability.',
    next_step:
      'Consume 500 mL isotonic electrolyte solution prior to aerobic CEVIS cycle session. Maintain daily fluid log >2.5 L.',
    when_medical_support:
      'If sustained palpitations, chest discomfort, or resting tachycardia >105 BPM occurs.',
    sources: ['NASA OCHMO Cardiovascular Protocol §2.1', 'NASA-STD-3001 Vol 1 §4.3.1'],
    status: 'active',
    timestamp: new Date(Date.now() - 21600000).toISOString(),
  },
  {
    id: 'guide-04',
    subject_id: 'ASTRA-04', // Patel / Sofia Reyes
    category: 'exercise',
    title: 'Standard Nominal Spaceflight Conditioning Maintenance',
    observed: 'All biometric telemetry within nominal envelopes. Physical readiness index 98%.',
    why_matters:
      'Sustained high compliance with resistive and aerobic training preserves musculoskeletal bone mineral density.',
    what_to_monitor: 'ARED peak force outputs and cycle ergometer VO2 max tracking.',
    next_step: 'Continue baseline 2.5-hour countermeasure daily cycle (60 min ARED + 30 min T2 treadmill).',
    when_medical_support: 'Routine weekly Flight Surgeon teleconference only.',
    sources: ['NASA-STD-3001 Vol 1 §4.3', 'HRP Exercise Countermeasures Project'],
    status: 'completed',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
  },
];

export const INITIAL_TIMELINE_EVENTS: HealthTimelineEvent[] = [
  {
    id: 'tl-01',
    subject_id: 'ASTRA-02',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    category: 'assessment',
    title: 'Daily Health Assessment Submitted',
    summary: 'Resting HR: 88 bpm · BP: 122/80 · Sleep: 4.5h · Lumbar ache score: 6/10',
    detail: 'Completed via SOLARIS interactive check-in. Flagged microgravity lumbar elongation and acute sleep deficit.',
    severity: 'review',
    source: 'SOLARIS Voice & Check-In Interface',
    is_simulated: true,
    action_required: true,
  },
  {
    id: 'tl-02',
    subject_id: 'ASTRA-02',
    timestamp: new Date(Date.now() - 5400000).toISOString(),
    category: 'symptom',
    title: 'Verbal Symptom Self-Report: Lumbar Spine Ache',
    summary: 'Reported: "My back hurts and I couldn\'t sleep." Correlated with +3.4cm spinal decompression.',
    detail: 'SOLARIS Causal Engine linked sleep deficit and spinal unloading strain to elevated autonomic tone.',
    severity: 'watch',
    source: 'SOLARIS Verbal AI Engine',
    is_simulated: true,
    action_required: false,
  },
  {
    id: 'tl-03',
    subject_id: 'ASTRA-01',
    timestamp: new Date(Date.now() - 10800000).toISOString(),
    category: 'finding',
    title: 'Clinical Rule Triggered: Intermittent Tachycardia & HRV Dip',
    summary: 'Thoracic ECG recorded heart rate jumps to 96 BPM with HRV dipping to 38 ms.',
    detail: 'NASA OCHMO algorithm flagged Rule CVS-02 (Autonomic Strain). Transmitted to Flight Surgeon console.',
    severity: 'watch',
    source: 'Astroskin 3-Lead ECG',
    is_simulated: true,
    action_required: true,
  },
  {
    id: 'tl-04',
    subject_id: 'ASTRA-01',
    timestamp: new Date(Date.now() - 18000000).toISOString(),
    category: 'guidance',
    title: 'Guidance Prescribed: Oral Electrolyte Rehydration',
    summary: 'Prescribed 500 mL isotonic solution prior to CEVIS aerobic exercise.',
    severity: 'normal',
    source: 'Health Guidance Centre',
    is_simulated: true,
    action_required: false,
  },
  {
    id: 'tl-05',
    subject_id: 'ASTRA-03',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    category: 'medical_action',
    title: 'Medical Review Signed Off: Dr. D. Brooks, CMO',
    summary: 'Reviewed Sofia Reyes 7-day sleep architecture. Marked nominal with standard actigraphy tracking.',
    severity: 'normal',
    source: 'Authorised Flight Surgeon Console',
    is_simulated: false,
    action_required: false,
  },
  {
    id: 'tl-06',
    subject_id: 'ASTRA-02',
    timestamp: new Date(Date.now() - 172800000).toISOString(),
    category: 'mission_event',
    title: 'Mission Sol 142 Transition: Mars Orbit Insertion Readiness',
    summary: 'Habitability ppCO2 stable at 1.8 mmHg. High solar background radiation detected by HERA.',
    severity: 'normal',
    source: 'Mission Operations Control',
    is_simulated: true,
    action_required: false,
  },
];
