import { RiskQuestion } from '../api/types';

export const RISK_ASSESSMENT_CATEGORIES = [
  {
    id: 'isolation',
    title: 'Isolation, Confinement & Behavioral Health',
    subtitle: 'NASA BHP Behavioral Health Protocol',
    icon: 'Brain',
    description: 'Monitors psychological equilibrium, monotony tolerance, circadian entrainment, and team dynamics during deep space transit.',
  },
  {
    id: 'fluid_shift',
    title: 'Space Adaptation & Cephalad Fluid Shift',
    subtitle: 'SANS & Cardiovascular Adaptation',
    icon: 'Activity',
    description: 'Tracks microgravity cranial fluid redistribution, jugular venous engorgement symptoms, and spine lengthening adaptation.',
  },
  {
    id: 'environmental',
    title: 'ECLSS & Closed Habitat Stress',
    subtitle: 'NASA Environmental Health Protocol',
    icon: 'Radioactive',
    description: 'Monitors cabin acoustic fatigue from continuous life-support ventilation, mucosal dryness, and environmental sensory irritation.',
  },
  {
    id: 'workload',
    title: 'Cognitive Workload & Operational Fatigue',
    subtitle: 'NASA-TLX Neuro-Readiness Screen',
    icon: 'Zap',
    description: 'Assesses subjective mental strain, task-induced reaction fatigue, and operational coping capacity before high-consequence tasks.',
  },
];

export const RISK_QUESTIONS: Record<string, RiskQuestion[]> = {
  isolation: [
    {
      id: 'iso_1',
      category: 'isolation',
      question: 'How would you rate your perceived emotional equilibrium and morale over the past 48 hours?',
      subtext: 'Consider your sense of motivation, mood stability, and daily task engagement.',
      options: [
        { score: 1, label: 'Optimal & Centered', description: 'Energetic, positive outlook, highly engaged in mission timeline.' },
        { score: 2, label: 'Nominal Baseline', description: 'Steady and productive with normal day-to-day emotional variation.' },
        { score: 3, label: 'Mild Fatigue / Flat', description: 'Low enthusiasm, routine duties require deliberate conscious effort.' },
        { score: 4, label: 'Noticeable Irritability', description: 'Heightened sensitivity to minor crew friction or schedule delays.' },
        { score: 5, label: 'Significant Strain', description: 'Pervasive detachment, feeling isolated or overwhelmed.' },
      ],
    },
    {
      id: 'iso_2',
      category: 'isolation',
      question: 'Are you experiencing sensory monotony or psychological effects of Earth-out-of-view?',
      subtext: 'Applies as planetary distance increases and visual contact with Earth diminishes.',
      options: [
        { score: 1, label: 'No Monotony', description: 'Cabin environment feels stimulating, strong personal connection.' },
        { score: 2, label: 'Occasional Reflection', description: 'Brief thoughts of Earth, no interference with operational tasks.' },
        { score: 3, label: 'Mild Repetitiveness', description: 'Routine environments feel noticeably repetitive; seeking novel stimuli.' },
        { score: 4, label: 'Distracting Monotony', description: 'Significant boredom or wistfulness impacting sleep latency.' },
        { score: 5, label: 'Acute Isolation Discomfort', description: 'Severe feeling of cosmic isolation and confinement.' },
      ],
    },
    {
      id: 'iso_3',
      category: 'isolation',
      question: 'How cohesive and supportive do team communications and habitat interactions feel?',
      subtext: 'Team psychological safety directly impacts autonomous crisis response.',
      options: [
        { score: 1, label: 'Highly Collaborative', description: 'Seamless team communication, mutual trust, and camaraderie.' },
        { score: 2, label: 'Smooth & Professional', description: 'Standard professional coordination without social friction.' },
        { score: 3, label: 'Minor Interpersonal Friction', description: 'Small communicative misunderstandings, promptly resolved.' },
        { score: 4, label: 'Guarded Communication', description: 'Avoidance of certain interactions or non-essential communication.' },
        { score: 5, label: 'Team Strain', description: 'Observable friction affecting workflow efficiency and handover.' },
      ],
    },
  ],

  fluid_shift: [
    {
      id: 'fs_1',
      category: 'fluid_shift',
      question: 'Rate your sensation of cephalad (headward) fluid fullness and facial congestion today:',
      subtext: 'Microgravity shifts ~2 liters of interstitial fluid from lower limbs into the upper torso and head.',
      options: [
        { score: 1, label: 'Normal / Fully Adapted', description: 'Minimal head pressure; nasal passages clear.' },
        { score: 2, label: 'Mild Sinus Fullness', description: 'Slight nasal stuffiness, similar to mild head allergy.' },
        { score: 3, label: 'Moderate Cephalic Pressure', description: 'Noticeable head fullness, especially when inverted or exercising.' },
        { score: 4, label: 'Heavy Facial Engorgement', description: 'Persistent sinus throbbing, vocal changes, and puffiness.' },
        { score: 5, label: 'Severe Intracranial Pressure', description: 'Distracting head pressure, requiring sunglasses or darkness.' },
      ],
    },
    {
      id: 'fs_2',
      category: 'fluid_shift',
      question: 'Have you noticed any visual blurriness, globe tenderness, or focus latency (SANS signs)?',
      subtext: 'Spaceflight-Associated Neuro-ocular Syndrome manifests through optic nerve edema and globe flattening.',
      options: [
        { score: 1, label: 'Sharp Visual Acuity', description: 'Zero change in visual focus or reading acuity.' },
        { score: 2, label: 'Slight Near-Vision Latency', description: 'Occasional need to adjust reading distance for checklist screens.' },
        { score: 3, label: 'Mild Globe Heaviness', description: 'Tired eye sensation after looking at displays; minor blur.' },
        { score: 4, label: 'Noticeable Visual Blur', description: 'Persistent difficulty focusing on small checklist text without corrective aids.' },
        { score: 5, label: 'Distinct Visual Distortion', description: 'Marked distortion or scotoma requiring clinical review.' },
      ],
    },
    {
      id: 'fs_3',
      category: 'fluid_shift',
      question: 'Assess spinal stretching or lumbar backache experienced during sleep or locomotion:',
      subtext: 'Intervertebral discs expand by 4-7 cm without gravity, placing strain on paraspinal ligaments.',
      options: [
        { score: 1, label: 'Zero Spinal Discomfort', description: 'Spine feels supple and elongated comfortably.' },
        { score: 2, label: 'Mild Morning Stiffness', description: 'Brief lumbar tightness upon waking, relieved by fetal tuck.' },
        { score: 3, label: 'Moderate Lumbar Ache', description: 'Persistent mild backache during routine workstation tasks.' },
        { score: 4, label: 'Distracting Spinal Pain', description: 'Sharp pain during exercise countermeasure loading.' },
        { score: 5, label: 'Severe Spine Pain', description: 'Restricts full hip extension or sleep recovery.' },
      ],
    },
  ],

  environmental: [
    {
      id: 'env_1',
      category: 'environmental',
      question: 'How is your tolerance to continuous cabin fan noise and acoustic vibration?',
      subtext: 'Life-support scrubbers and avionics produce continuous 55-65 dBA acoustic loading.',
      options: [
        { score: 1, label: 'Undisturbed', description: 'Background acoustic noise is easily tuned out; restful sleep.' },
        { score: 2, label: 'Mild Background Awareness', description: 'Noticeable fan hum, but no interference with conversation.' },
        { score: 3, label: 'Occasional Acoustic Fatigue', description: 'Prefer hearing protection during focused cognitive tasks.' },
        { score: 4, label: 'Persistent Irritation', description: 'Noise levels interfere with speech comprehension or relaxation.' },
        { score: 5, label: 'Severe Acoustic Distress', description: 'Headache or sleep fragmentation attributable to habitat noise.' },
      ],
    },
    {
      id: 'env_2',
      category: 'environmental',
      question: 'Are you experiencing dry mucous membranes, ocular irritation, or thirst debt?',
      subtext: 'Closed environmental control systems maintain low relative humidity (25-40%).',
      options: [
        { score: 1, label: 'Optimal Hydration', description: 'Mucosa moist, skin comfortable, urine pale.' },
        { score: 2, label: 'Mild Dryness', description: 'Occasional eye drop use or dry lips; easily managed.' },
        { score: 3, label: 'Moderate Dry Throat', description: 'Frequent thirst or scratchy throat upon waking.' },
        { score: 4, label: 'Irritated Airway', description: 'Dry coughing or nasal crusting from recycled cabin airflow.' },
        { score: 5, label: 'Acute Dehydration Strain', description: 'Marked thirst, chapped skin, and mucosal discomfort.' },
      ],
    },
  ],

  workload: [
    {
      id: 'work_1',
      category: 'workload',
      question: 'Rate your neurocognitive mental demand and concentration demands today:',
      subtext: 'Measures procedural memory, checklist execution speed, and mental stamina.',
      options: [
        { score: 1, label: 'Effortless Focus', description: 'Mental tasks completed smoothly with high accuracy and reserve.' },
        { score: 2, label: 'Normal Cognitive Load', description: 'Complex tasks require standard focused attention.' },
        { score: 3, label: 'Elevated Mental Effort', description: 'Need to double-check procedures; slower calculation speed.' },
        { score: 4, label: 'High Cognitive Fatigue', description: 'Difficulty maintaining focus on telemetry displays; brain fog.' },
        { score: 5, label: 'Cognitive Overload', description: 'Severe fatigue; risk of procedural omission or oversight.' },
      ],
    },
    {
      id: 'work_2',
      category: 'workload',
      question: 'Evaluate your physical stamina and muscle recovery following countermeasure sessions:',
      subtext: 'Tracks post-ARED and T2 treadmill adaptation without cumulative overtraining debt.',
      options: [
        { score: 1, label: 'Peak Physical Readiness', description: 'Muscles feel primed, rapid heart rate recovery post-workout.' },
        { score: 2, label: 'Nominal Fatigue', description: 'Normal exercise exertion with full recovery within 2 hours.' },
        { score: 3, label: 'Persistent Muscle Heaviness', description: 'Lethargy in quadriceps or shoulder girdle during duty hours.' },
        { score: 4, label: 'Delayed Soreness & Weakness', description: 'Incomplete recovery, reduced power output on ergometer.' },
        { score: 5, label: 'Physical Exhaustion', description: 'Extreme fatigue impeding routine hatch operations or mobility.' },
      ],
    },
  ],
};
