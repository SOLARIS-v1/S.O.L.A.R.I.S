import { IndicatorType, BodyRegion } from '../api/types';
import { AnatomicalSystemId } from '../components/body/ScientificAnatomicalModel';

export interface AnatomicalSystemMeta {
  id: AnatomicalSystemId;
  name: string;
  tag: string;
  functionDesc: string;
  spaceflightRelevance: string;
  relevantIndicators: IndicatorType[];
  bodyRegion: BodyRegion;
  recommendedGuidance: string;
}

export const ANATOMICAL_SYSTEMS: Record<AnatomicalSystemId, AnatomicalSystemMeta> = {
  cardiovascular: {
    id: 'cardiovascular',
    name: 'Cardiovascular System',
    tag: 'CVS-01',
    functionDesc:
      'Pumps oxygenated and nutrient-rich blood throughout systemic and pulmonary circulation via myocardial contraction, cardiac output regulation, and arterial compliance.',
    spaceflightRelevance:
      'Cephalad fluid redistribution causes acute central hypervolemia followed by circulating plasma volume contraction (-15%), baroreceptor resetting, and progressive left ventricular myocardial remodeling during prolonged microgravity.',
    relevantIndicators: ['heart_rate', 'blood_pressure_sys', 'blood_pressure_dia', 'hrv'],
    bodyRegion: 'heart',
    recommendedGuidance:
      'Maintain daily 30-minute aerobic interval protocol on CEVIS cycle ergometer. Verify oral rehydration and electrolyte fluid loading prior to gravitational transitions.',
  },
  respiratory: {
    id: 'respiratory',
    name: 'Respiratory & Cardiopulmonary System',
    tag: 'PULM-02',
    functionDesc:
      'Facilitates alveolar gas exchange, ventilatory perfusion matching, acid-base arterial blood homeostasis, and cellular oxygen transport to microgravity tissues.',
    spaceflightRelevance:
      'Alveolar ventilation-perfusion matching improves slightly without hydrostatic gravity gradients, but closed spacecraft ECLSS air loops carry acute sensitivity to ambient CO2 partial pressure (ppCO2) spikes and cabin trace particulate irritation.',
    relevantIndicators: ['spo2', 'respiratory_rate'],
    bodyRegion: 'lungs',
    recommendedGuidance:
      'Monitor habitat ppCO2 levels (<3.0 mmHg) in crew sleep quarters. Execute respiratory impedance and peak expiratory flow telemetry review if nocturnal headache or hypercapnia symptoms present.',
  },
  musculoskeletal: {
    id: 'musculoskeletal',
    name: 'Musculoskeletal & Skeletal System',
    tag: 'MSK-03',
    functionDesc:
      'Provides structural framework, trabecular mineral reservoir, joint biomechanics, and locomotor actuation via axial skeletal alignment and muscle group contraction.',
    spaceflightRelevance:
      'Absence of axial gravity loading causes cancellous bone demineralization (~1.0% to 1.5% bone mineral density loss monthly at lumbar spine and femoral neck) alongside selective postural slow-twitch type-I myofiber atrophy.',
    relevantIndicators: ['activity_minutes', 'fatigue'],
    bodyRegion: 'skeleton',
    recommendedGuidance:
      'Complete mandatory Advanced Resistive Exercise Device (ARED) protocol focusing on axial loading (squats, deadlifts, heel raises) combined with 2000 IU/day oral Vitamin D3 supplementation.',
  },
  nervous: {
    id: 'nervous',
    name: 'Central & Peripheral Nervous System',
    tag: 'NEURO-04',
    functionDesc:
      'Controls cognitive executive functioning, motor coordination, circadian neuroendocrine entrainment, and autonomic nervous system equilibrium via cranial cortex and spinal pathways.',
    spaceflightRelevance:
      'Elevated intracranial pressure and venous engorgement contribute to Spaceflight-Associated Neuro-ocular Syndrome (SANS), globe flattening, and optic disc edema, compounded by sensory conflict during vestibular microgravity adaptation.',
    relevantIndicators: ['sleep', 'mood', 'fatigue'],
    bodyRegion: 'head',
    recommendedGuidance:
      'Perform weekly high-resolution optical coherence tomography (OCT) retina scans. Adhere to strict 8-hour sleep scheduled dark cabin lighting cycle to protect circadian amplitude.',
  },
  immune: {
    id: 'immune',
    name: 'Immune, Lymphatic & Thermal System',
    tag: 'IMM-05',
    functionDesc:
      'Defends against opportunistic microbiological pathogens, surveils radiation-induced cellular DNA damage, and regulates deep systemic core thermoregulation.',
    spaceflightRelevance:
      'Deep space galactic cosmic radiation (GCR) exposure, persistent psychological confinement, and altered sleep architecture produce progressive T-cell dysregulation and heightened subclinical viral reactivation (Epstein-Barr, VZV).',
    relevantIndicators: ['temperature', 'radiation_rate'],
    bodyRegion: 'immune',
    recommendedGuidance:
      'Verify passive personal radiation dosimeter readings weekly. Administer prophylactic micronutrient immune support and isolate crew if febrile spikes (>38.0°C) are accompanied by resting tachycardia.',
  },
  external_sensors: {
    id: 'external_sensors',
    name: 'Integumentary & Wearable Sensor Array',
    tag: 'SKIN-06',
    functionDesc:
      'Monitors epidermal barrier integrity, sweat evaporation, and houses the non-invasive CSA Bio-Monitor and AstroSkin smart garment dry-contact sensing electrodes.',
    spaceflightRelevance:
      'Skin microflora alterations, decreased dermal collagen synthesis, and garment friction in microgravity elevate risk of contact dermatitis and sensor contact impedance artifact.',
    relevantIndicators: ['spo2', 'heart_rate', 'temperature', 'blood_pressure_sys'],
    bodyRegion: 'arm',
    recommendedGuidance:
      'Inspect thoracic dry-contact electrode sites every 48 hours for contact erythema. Cleanse sensor contact points with alcohol wipes before re-securing garment zip tension.',
  },
};
