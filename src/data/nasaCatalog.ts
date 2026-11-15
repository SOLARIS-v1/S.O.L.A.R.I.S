/**
 * NASA Spaceflight Biomedical Knowledge Catalog
 * Derived from NASA Human Research Program (HRP) Evidence Books,
 * NASA-STD-3001 (Space Flight Human-System Standard), and OCHMO Clinical Guidelines.
 */

export type HazardId = 'R' | 'I' | 'D' | 'G' | 'E';

export interface HazardDefinition {
  id: HazardId;
  name: string;
  code: string;
  summary: string;
  effects: string[];
  countermeasures: string[];
  monitoringFocus: string;
  sources: string[];
}

export const NASA_HAZARDS: Record<HazardId, HazardDefinition> = {
  R: {
    id: 'R',
    name: 'Space Radiation',
    code: 'HAZ-RAD',
    summary:
      "Outside Earth's magnetosphere, crews encounter galactic cosmic rays (GCR) and solar particle events (SPE) consisting of high-energy protons and HZE nuclei that cause cellular ionization and DNA strand breakage.",
    effects: [
      'Elevated cumulative lifetime excess risk of cancer',
      'Central nervous system cellular degeneration and neurocognitive decline',
      'Subclinical microvascular endothelial changes and cardiac remodeling',
      'Acute radiation syndrome risk during unshielded solar coronal mass ejections',
    ],
    countermeasures: [
      'Continuous active dosimetry monitoring via HERA / CPD units against 600 mSv career threshold',
      'Temporary retreat to storm-shelter module during solar particle alert events',
      'Deployment of water reservoirs and polyethylene cargo as localized radiation shielding',
    ],
    monitoringFocus: 'Daily radiation dose rate (mSv/d), cumulative mission dose, and peripheral hematologic parameters.',
    sources: ['NASA-STD-3001 Vol 1 §4.2', 'HRP Evidence Book: Space Radiation Cancer Risk'],
  },
  I: {
    id: 'I',
    name: 'Isolation & Confinement',
    code: 'HAZ-ISO',
    summary:
      'Living with a small crew in a confined habitat without natural daylight or immediate external social contact provokes circadian desynchrony, sleep structure compression, and psychosocial friction.',
    effects: [
      'Circadian rhythm desynchronization and reduction in restorative slow-wave/REM sleep',
      'Elevated subjective fatigue, affective blunting, and operational cognitive slowdown',
      'Interpersonal tension and potential crew-ground communication misalignment',
    ],
    countermeasures: [
      'Strict adherence to scheduled 8.5-hour sleep opportunity with synchronized 24-hour sleep-wake cycle',
      'Dynamic 480nm blue-enriched LED lighting protocols for morning circadian phase advancing',
      'Private psychological medical conferences and regular asynchronous family contact',
    ],
    monitoringFocus: 'Actigraphy sleep duration, sleep quality index, subjective fatigue (1-5), and mood stability.',
    sources: ['NASA-STD-3001 Vol 2 §8.1', 'HRP Evidence Book: Behavioral Health and Performance'],
  },
  D: {
    id: 'D',
    name: 'Distance from Earth',
    code: 'HAZ-DIST',
    summary:
      'As mission distance increases toward Mars (up to 400M km), one-way radio communication latency stretches up to 22 minutes, making real-time telemedicine impossible and requiring crew clinical autonomy.',
    effects: [
      'Zero possibility of medical evacuation or emergency resupply from Earth',
      'Inability to consult flight surgeons interactively during acute diagnostic dilemmas',
      'Increased psychological pressure on the designated crew medical officer (CMO)',
    ],
    countermeasures: [
      'Autonomous on-board clinical decision support system (SOLARIS AI) with local offline guidance',
      'Standardized emergency medical protocols and self-guided diagnostic ultrasound procedures',
      'Comprehensive on-board medical inventory with expiration and usage tracking',
    ],
    monitoringFocus: 'Earth-link latency status, on-board consumable medical supplies, and autonomous clinical review logs.',
    sources: ['NASA OCHMO Medical Operations Protocol §3.4', 'HRP Exploration Medical Capability'],
  },
  G: {
    id: 'G',
    name: 'Gravity Fields',
    code: 'HAZ-GRAV',
    summary:
      'Transitioning from 1G to microgravity (0G) and later to Martian partial gravity (0.38G) causes rapid cephalad fluid redistribution, vestibular neuro-vestibular discord, muscle atrophy, and bone demineralization.',
    effects: [
      'Cephalad fluid shift causing venous engorgement, facial edema, and Spaceflight-Associated Neuro-ocular Syndrome (SANS)',
      'Circulating plasma volume contraction (-15%) and post-flight orthostatic intolerance',
      'Axial bone mineral loss (-1.0% to 1.5% per month at lumbar spine) and spinal elongation (+3-5 cm)',
      'Selective postural slow-twitch type-I muscle fiber atrophy',
    ],
    countermeasures: [
      '2.5 hours daily physical conditioning (ARED heavy resistive loading + T2 treadmill / cycle)',
      'Oral rehydration and electrolyte fluid loading protocol (1.0 L isotonic fluid) prior to re-entry',
      'Lower Body Negative Pressure (LBNP) sessions and compressive lower-body garments',
    ],
    monitoringFocus: 'Resting heart rate, blood pressure, lumbar spine discomfort score, and cranial pulse transit time.',
    sources: ['NASA-STD-3001 Vol 1 §4.3', 'HRP Evidence Book: Bone Demineralization & SANS'],
  },
  E: {
    id: 'E',
    name: 'Hostile Closed Environments',
    code: 'HAZ-ENV',
    summary:
      'Spacecraft and extraterrestrial habitats rely entirely on artificial life-support systems (ECLSS). Carbon dioxide buildup, trace volatile toxic contaminants, acoustic noise, and microbial colonization pose continuous hazards.',
    effects: [
      'Hypercapnia symptoms (nocturnal headache, cognitive sluggishness) from ppCO2 > 2.5 mmHg pockets',
      'Acoustic fatigue, temporary threshold shifts, and speech interference from continuous ventilation noise',
      'Altered cutaneous microflora and contact dermal irritation from lack of conventional water washing',
      'Inhalation of abrasive extraterrestrial regolith or airborne particulate matter',
    ],
    countermeasures: [
      'Active ECLSS scrubber monitoring maintaining ppCO2 < 2.0 mmHg across all quarters',
      'Acoustic muffling of fan louvers and mandatory hearing protection during loud maintenance tasks',
      'HEPA filtration and strict particulate containment during EVA airlock ingress',
    ],
    monitoringFocus: 'Habitability ppCO2 (mmHg), acoustic noise level (dBA), SpO2, and dermal irritation score.',
    sources: ['NASA-STD-3001 Vol 2 §6.2', 'HRP Evidence Book: Environmental Factors & Toxicology'],
  },
};

export interface BodySystemDefinition {
  id: string;
  name: string;
  shortName: string;
  code: string;
  metrics: string[];
  hazards: HazardId[];
  functionSummary: string;
  spaceflightRelevance: string;
  monitoredIndicators: string[];
  clinicalSignificance: string;
  recommendedGuidance: string;
  approvedSources: string[];
}

export const BODY_SYSTEMS: Record<string, BodySystemDefinition> = {
  cardiovascular: {
    id: 'cardiovascular',
    name: 'Cardiovascular & Hemodynamic System',
    shortName: 'Cardiovascular',
    code: 'SYS-CVS',
    metrics: ['heart_rate', 'blood_pressure_sys', 'blood_pressure_dia', 'hrv'],
    hazards: ['G', 'I'],
    functionSummary:
      'Maintains systemic arterial perfusion, ventricular contraction rhythm, myocardial oxygenation, and autonomic baroreceptor equilibrium.',
    spaceflightRelevance:
      'Removal of hydrostatic gravity gradients induces immediate cephalad fluid redistribution, followed by circulating plasma volume contraction (-15%), baroreceptor resetting, and cardiac left ventricular mass loss during long flights.',
    monitoredIndicators: ['Resting Heart Rate (BPM)', 'Blood Pressure (SYS/DIA mmHg)', 'HRV RMSSD (ms)', 'Ectopic Arrhythmia Frequency'],
    clinicalSignificance:
      'Elevated resting heart rate or suppressed HRV indicates autonomic sympathetic overdrive, acute fatigue, or dehydration. Ectopic cardiac jumps require continuous rhythm surveillance.',
    recommendedGuidance:
      'Maintain 30-min aerobic interval conditioning on CEVIS cycle ergometer. Verify 2.5 L daily fluid intake with electrolyte replenishment.',
    approvedSources: ['NASA-STD-3001 Vol 1 §4.3.1', 'OCHMO Spaceflight Cardiovascular Risk Protocol'],
  },
  respiratory: {
    id: 'respiratory',
    name: 'Respiratory & Cardiopulmonary System',
    shortName: 'Respiratory',
    code: 'SYS-RESP',
    metrics: ['spo2', 'respiratory_rate'],
    hazards: ['E', 'G'],
    functionSummary:
      'Facilitates alveolar oxygen uptake, carbon dioxide excretion, arterial blood gas equilibrium, and thoracic ventilatory impedance matching.',
    spaceflightRelevance:
      'In microgravity, ventilation-perfusion matching is preserved, but closed habitat ECLSS dynamics make the respiratory system sensitive to localized cabin CO2 pockets, hypercapnic ventilatory response, and trace atmospheric particulate irritation.',
    monitoredIndicators: ['Oxygen Saturation SpO2 (%)', 'Respiration Rate (br/m)', 'Thoracic Tidal Volume (mL)'],
    clinicalSignificance:
      'SpO2 < 95% or respiration rate > 20 br/m indicates respiratory compromise, hypoventilation, or elevated ambient ppCO2 in crew sleep compartments.',
    recommendedGuidance:
      'Verify habitat ppCO2 remains < 2.0 mmHg. Check cabin air diffuser circulation fans. Perform peak expiratory flow test if morning headache occurs.',
    approvedSources: ['NASA-STD-3001 Vol 2 §6.3', 'OCHMO Habitability Carbon Dioxide Guidelines'],
  },
  musculoskeletal: {
    id: 'musculoskeletal',
    name: 'Musculoskeletal & Skeletal System',
    shortName: 'Musculoskeletal',
    code: 'SYS-MSK',
    metrics: ['fatigue', 'activity_minutes', 'spine_pain'],
    hazards: ['G'],
    functionSummary:
      'Provides axial biomechanical support, trabecular calcium reservoir, locomotor actuation, and spinal column posture preservation.',
    spaceflightRelevance:
      'Without gravitational axial loading, intervertebral discs decompress and expand (+3 to 5 cm height increase), producing microgravity lumbar spine elongation pain. Bone mineral density declines ~1-1.5% monthly at femoral neck and lumbar vertebrae without resistive exercise.',
    monitoredIndicators: ['Lumbar Spine Discomfort Score (0-10)', 'Daily ARED Resistance Load (kg)', 'Trunk Posture IMU Unloading'],
    clinicalSignificance:
      'Persistent lumbar ache reflects spinal unloading strain. Unchecked musculoskeletal deconditioning increases risk of vertebral disc herniation upon gravitational return.',
    recommendedGuidance:
      'Execute prescribed Advanced Resistive Exercise Device (ARED) session focusing on axial squats and deadlifts. Apply spinal axial compression harness during rest blocks.',
    approvedSources: ['NASA-STD-3001 Vol 1 §4.3.2', 'HRP Bone Demineralization Evidence Report'],
  },
  neurological: {
    id: 'neurological',
    name: 'Neurological & Neurobehavioral Wellbeing',
    shortName: 'Neurological',
    code: 'SYS-NEURO',
    metrics: ['sleep', 'mood', 'fatigue', 'cranial_ptt'],
    hazards: ['I', 'R', 'G'],
    functionSummary:
      'Regulates executive cognitive processing, circadian rhythm entrainment, sensory-motor coordination, ocular neuro-retinal transmission, and emotional equilibrium.',
    spaceflightRelevance:
      'Cephalad venous congestion elevates intracranial pressure, implicated in SANS (optic disc edema and globe flattening). Confinement and abnormal orbital light/dark cycles cause cumulative sleep structure fragmentation and subjective fatigue.',
    monitoredIndicators: ['Sleep Duration (hours)', 'Sleep Quality (1-5)', 'Subjective Fatigue & Mood (1-5)', 'Cranial Pulse Transit Time (ms)'],
    clinicalSignificance:
      'Sleep duration < 5.0 hours impairs operational vigilance, reaction latency, and decision reliability during critical mission tasks (EVA, docking).',
    recommendedGuidance:
      'Enforce strict 8.5h sleep opportunity in sound-dampened quarters. Administer morning 480nm blue light exposure for 45 minutes to resynchronize suprachiasmatic circadian oscillator.',
    approvedSources: ['NASA-STD-3001 Vol 2 §8.2', 'HRP Behavioral Health & Performance Standards'],
  },
  immune: {
    id: 'immune',
    name: 'Immune, Dermal & Physiological Status',
    shortName: 'Immune & Dermal',
    code: 'SYS-IMM',
    metrics: ['temperature', 'glucose', 'radiation_rate', 'skin_irritation'],
    hazards: ['R', 'E'],
    functionSummary:
      'Maintains cellular pathogen defense, systemic inflammatory modulation, epidermal barrier integrity, core thermoregulation, and metabolic glucose homeostasis.',
    spaceflightRelevance:
      'Deep space radiation and confinement provoke subclinical T-cell dysregulation and latent herpesvirus reactivation (EBV, VZV). Dermal barrier integrity is challenged by lack of running water and constant sensor garment contact.',
    monitoredIndicators: ['Core Body Temperature (°C)', 'Blood Glucose (mg/dL)', 'Cumulative Radiation Dose (mSv)', 'Dermal Irritation Score (0-10)'],
    clinicalSignificance:
      'Fever (>37.8°C) combined with elevated resting HR indicates acute systemic infection or inflammatory flare. Dermal contact lesions require barrier treatment to prevent microbial infiltration.',
    recommendedGuidance:
      'Cleanse Astroskin dry-electrode contact sites every 48 hours. Apply barrier emollient. Ensure daily dietary polyphenol and Vitamin D3 compliance.',
    approvedSources: ['NASA-STD-3001 Vol 1 §4.4', 'HRP Immunology Evidence Book'],
  },
};
