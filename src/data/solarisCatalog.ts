// SOLARIS Astronaut Health Intelligence & Decision Support Platform
// Complete 15-Metric, 8-Organ, Routine and Exercise Catalog

export interface MetricDef {
  id: string;
  label: string;
  unit: string;
  decimals: number;
  category: string;
  body_region: string;
  hazard_id: string;
  context_sensitive?: boolean;
  input: {
    kind: 'number' | 'bp' | 'mood' | 'reaction' | 'vision' | 'symptoms';
    min: number;
    max: number;
    step: number;
    placeholder: string;
    labels?: string[];
  };
  prepare: {
    equipment: string;
    conditions: string;
    instructions: string;
    duration: string;
  };
  why_matters: {
    purpose: string;
    space_impact: string;
    sources: string[];
  };
  normal_range: [number, number];
  watch_range?: [number, number];
}

export interface OrganDef {
  id: string;
  name: string;
  metrics: string[];
  hazards: string[];
  function: string;
  space: string;
  actions: string[];
  sources: string[];
}

export interface ExerciseDef {
  id: string;
  name: string;
  kind: 'resistance' | 'aerobic' | 'rest';
  anim: 'squat' | 'deadlift' | 'heel_raise' | 'press' | 'row' | 'run' | 'cycle';
  targets: string[];
  why: string;
  cues: string[];
  equipment: string;
  default_sets?: number | null;
  default_reps?: number | null;
  default_intensity: string;
  default_duration_min: number;
}

export interface RoutineTaskDef {
  id: string;
  time: string;
  title: string;
  metrics: string[];
  xp: number;
  is_weekly?: boolean;
}

export const SOLARIS_METRICS: MetricDef[] = [
  {
    "id": "hr",
    "label": "Heart rate",
    "unit": "bpm",
    "decimals": 0,
    "category": "Heart & circulation",
    "body_region": "chest",
    "hazard_id": "gravity",
    "context_sensitive": true,
    "input": {
      "kind": "number",
      "min": 25,
      "max": 220,
      "step": 1,
      "placeholder": "64"
    },
    "prepare": {
      "equipment": "Astroskin 3-Lead Thoracic ECG",
      "conditions": "Rest seated for 5 minutes in microgravity",
      "instructions": "Ensure electrode contact points are flush with skin.",
      "duration": "1 min"
    },
    "why_matters": {
      "purpose": "Assesses physiological adaptation to long-duration spaceflight.",
      "space_impact": "Fluid shifts and lack of gravitational loading alter baseline homeostatic regulation.",
      "sources": [
        "NASA-STD-3001 Vol 1 \u00a74",
        "HRP Human Research Roadmap"
      ]
    },
    "normal_range": [
      60,
      100
    ]
  },
  {
    "id": "bp",
    "label": "Blood pressure",
    "unit": "mmHg",
    "decimals": 0,
    "category": "Heart & circulation",
    "body_region": "chest",
    "hazard_id": "gravity",
    "context_sensitive": true,
    "input": {
      "kind": "bp",
      "min": 50,
      "max": 260,
      "step": 1,
      "placeholder": "116/76"
    },
    "prepare": {
      "equipment": "Brachial Inflatable Cuff",
      "conditions": "Rest seated for 5 minutes in microgravity",
      "instructions": "Ensure electrode contact points are flush with skin.",
      "duration": "2 min"
    },
    "why_matters": {
      "purpose": "Assesses physiological adaptation to long-duration spaceflight.",
      "space_impact": "Fluid shifts and lack of gravitational loading alter baseline homeostatic regulation.",
      "sources": [
        "NASA-STD-3001 Vol 1 \u00a74",
        "HRP Human Research Roadmap"
      ]
    },
    "normal_range": [
      90,
      130
    ]
  },
  {
    "id": "spo2",
    "label": "Blood oxygen",
    "unit": "%",
    "decimals": 0,
    "category": "Lungs & breathing",
    "body_region": "chest",
    "hazard_id": "gravity",
    "context_sensitive": false,
    "input": {
      "kind": "number",
      "min": 50,
      "max": 100,
      "step": 1,
      "placeholder": "98"
    },
    "prepare": {
      "equipment": "Forehead Optical PPG Sensor",
      "conditions": "Rest seated for 5 minutes in microgravity",
      "instructions": "Ensure electrode contact points are flush with skin.",
      "duration": "30 sec"
    },
    "why_matters": {
      "purpose": "Assesses physiological adaptation to long-duration spaceflight.",
      "space_impact": "Fluid shifts and lack of gravitational loading alter baseline homeostatic regulation.",
      "sources": [
        "NASA-STD-3001 Vol 1 \u00a74",
        "HRP Human Research Roadmap"
      ]
    },
    "normal_range": [
      95,
      100
    ]
  },
  {
    "id": "resp",
    "label": "Breathing rate",
    "unit": "/min",
    "decimals": 0,
    "category": "Lungs & breathing",
    "body_region": "chest",
    "hazard_id": "gravity",
    "context_sensitive": true,
    "input": {
      "kind": "number",
      "min": 4,
      "max": 60,
      "step": 1,
      "placeholder": "15"
    },
    "prepare": {
      "equipment": "Astroskin wearable sensor garment",
      "conditions": "Rest seated for 5 minutes in microgravity",
      "instructions": "Ensure electrode contact points are flush with skin.",
      "duration": "2-3 min"
    },
    "why_matters": {
      "purpose": "Assesses physiological adaptation to long-duration spaceflight.",
      "space_impact": "Fluid shifts and lack of gravitational loading alter baseline homeostatic regulation.",
      "sources": [
        "NASA-STD-3001 Vol 1 \u00a74",
        "HRP Human Research Roadmap"
      ]
    },
    "normal_range": [
      4,
      60
    ]
  },
  {
    "id": "temp",
    "label": "Body temperature",
    "unit": "\u00b0C",
    "decimals": 1,
    "category": "Immune system",
    "body_region": "chest",
    "hazard_id": "gravity",
    "context_sensitive": false,
    "input": {
      "kind": "number",
      "min": 30,
      "max": 43,
      "step": 0.1,
      "placeholder": "36.9"
    },
    "prepare": {
      "equipment": "Astroskin wearable sensor garment",
      "conditions": "Rest seated for 5 minutes in microgravity",
      "instructions": "Ensure electrode contact points are flush with skin.",
      "duration": "2-3 min"
    },
    "why_matters": {
      "purpose": "Assesses physiological adaptation to long-duration spaceflight.",
      "space_impact": "Fluid shifts and lack of gravitational loading alter baseline homeostatic regulation.",
      "sources": [
        "NASA-STD-3001 Vol 1 \u00a74",
        "HRP Human Research Roadmap"
      ]
    },
    "normal_range": [
      30,
      43
    ]
  },
  {
    "id": "glucose",
    "label": "Blood glucose",
    "unit": "mg/dL",
    "decimals": 0,
    "category": "Metabolism & nutrition",
    "body_region": "chest",
    "hazard_id": "gravity",
    "context_sensitive": false,
    "input": {
      "kind": "number",
      "min": 20,
      "max": 600,
      "step": 1,
      "placeholder": "88"
    },
    "prepare": {
      "equipment": "Astroskin wearable sensor garment",
      "conditions": "Rest seated for 5 minutes in microgravity",
      "instructions": "Ensure electrode contact points are flush with skin.",
      "duration": "2-3 min"
    },
    "why_matters": {
      "purpose": "Assesses physiological adaptation to long-duration spaceflight.",
      "space_impact": "Fluid shifts and lack of gravitational loading alter baseline homeostatic regulation.",
      "sources": [
        "NASA-STD-3001 Vol 1 \u00a74",
        "HRP Human Research Roadmap"
      ]
    },
    "normal_range": [
      20,
      600
    ]
  },
  {
    "id": "hydration",
    "label": "Fluid intake",
    "unit": "L",
    "decimals": 1,
    "category": "Kidneys & fluids",
    "body_region": "chest",
    "hazard_id": "gravity",
    "context_sensitive": false,
    "input": {
      "kind": "number",
      "min": 0,
      "max": 8,
      "step": 0.1,
      "placeholder": "2.2"
    },
    "prepare": {
      "equipment": "Astroskin wearable sensor garment",
      "conditions": "Rest seated for 5 minutes in microgravity",
      "instructions": "Ensure electrode contact points are flush with skin.",
      "duration": "2-3 min"
    },
    "why_matters": {
      "purpose": "Assesses physiological adaptation to long-duration spaceflight.",
      "space_impact": "Fluid shifts and lack of gravitational loading alter baseline homeostatic regulation.",
      "sources": [
        "NASA-STD-3001 Vol 1 \u00a74",
        "HRP Human Research Roadmap"
      ]
    },
    "normal_range": [
      0,
      8
    ]
  },
  {
    "id": "mass",
    "label": "Body mass",
    "unit": "kg",
    "decimals": 1,
    "category": "Metabolism & nutrition",
    "body_region": "chest",
    "hazard_id": "gravity",
    "context_sensitive": false,
    "input": {
      "kind": "number",
      "min": 30,
      "max": 150,
      "step": 0.1,
      "placeholder": "70.0"
    },
    "prepare": {
      "equipment": "Astroskin wearable sensor garment",
      "conditions": "Rest seated for 5 minutes in microgravity",
      "instructions": "Ensure electrode contact points are flush with skin.",
      "duration": "2-3 min"
    },
    "why_matters": {
      "purpose": "Assesses physiological adaptation to long-duration spaceflight.",
      "space_impact": "Fluid shifts and lack of gravitational loading alter baseline homeostatic regulation.",
      "sources": [
        "NASA-STD-3001 Vol 1 \u00a74",
        "HRP Human Research Roadmap"
      ]
    },
    "normal_range": [
      30,
      150
    ]
  },
  {
    "id": "nutrition",
    "label": "Food intake",
    "unit": "%",
    "decimals": 0,
    "category": "Metabolism & nutrition",
    "body_region": "chest",
    "hazard_id": "gravity",
    "context_sensitive": false,
    "input": {
      "kind": "number",
      "min": 0,
      "max": 200,
      "step": 5,
      "placeholder": "100"
    },
    "prepare": {
      "equipment": "Astroskin wearable sensor garment",
      "conditions": "Rest seated for 5 minutes in microgravity",
      "instructions": "Ensure electrode contact points are flush with skin.",
      "duration": "2-3 min"
    },
    "why_matters": {
      "purpose": "Assesses physiological adaptation to long-duration spaceflight.",
      "space_impact": "Fluid shifts and lack of gravitational loading alter baseline homeostatic regulation.",
      "sources": [
        "NASA-STD-3001 Vol 1 \u00a74",
        "HRP Human Research Roadmap"
      ]
    },
    "normal_range": [
      0,
      200
    ]
  },
  {
    "id": "sleep",
    "label": "Sleep",
    "unit": "h",
    "decimals": 1,
    "category": "Brain & behavior",
    "body_region": "chest",
    "hazard_id": "gravity",
    "context_sensitive": false,
    "input": {
      "kind": "number",
      "min": 0,
      "max": 16,
      "step": 0.1,
      "placeholder": "7.5"
    },
    "prepare": {
      "equipment": "Astroskin wearable sensor garment",
      "conditions": "Rest seated for 5 minutes in microgravity",
      "instructions": "Ensure electrode contact points are flush with skin.",
      "duration": "2-3 min"
    },
    "why_matters": {
      "purpose": "Assesses physiological adaptation to long-duration spaceflight.",
      "space_impact": "Fluid shifts and lack of gravitational loading alter baseline homeostatic regulation.",
      "sources": [
        "NASA-STD-3001 Vol 1 \u00a74",
        "HRP Human Research Roadmap"
      ]
    },
    "normal_range": [
      0,
      16
    ]
  },
  {
    "id": "mood",
    "label": "Mood",
    "unit": "/5",
    "decimals": 0,
    "category": "Brain & behavior",
    "body_region": "chest",
    "hazard_id": "gravity",
    "context_sensitive": false,
    "input": {
      "kind": "mood",
      "min": 1,
      "max": 5,
      "step": 1,
      "placeholder": "4",
      "labels": [
        "Awful",
        "Low",
        "Okay",
        "Good",
        "Great"
      ]
    },
    "prepare": {
      "equipment": "Astroskin wearable sensor garment",
      "conditions": "Rest seated for 5 minutes in microgravity",
      "instructions": "Ensure electrode contact points are flush with skin.",
      "duration": "2-3 min"
    },
    "why_matters": {
      "purpose": "Assesses physiological adaptation to long-duration spaceflight.",
      "space_impact": "Fluid shifts and lack of gravitational loading alter baseline homeostatic regulation.",
      "sources": [
        "NASA-STD-3001 Vol 1 \u00a74",
        "HRP Human Research Roadmap"
      ]
    },
    "normal_range": [
      1,
      5
    ]
  },
  {
    "id": "reaction",
    "label": "Reaction time",
    "unit": "ms",
    "decimals": 0,
    "category": "Brain & behavior",
    "body_region": "chest",
    "hazard_id": "gravity",
    "context_sensitive": false,
    "input": {
      "kind": "reaction",
      "min": 100,
      "max": 2000,
      "step": 1,
      "placeholder": "260"
    },
    "prepare": {
      "equipment": "SOLARIS Cognitive Response Pad",
      "conditions": "Quiet habitat environment, seated position",
      "instructions": "Wait for green signal, tap immediately. Three consecutive trials.",
      "duration": "1-2 min"
    },
    "why_matters": {
      "purpose": "Measures cognitive speed, psychomotor vigilance, and neuro-attentional fatigue.",
      "space_impact": "Fluid shifts and lack of gravitational loading alter baseline homeostatic regulation.",
      "sources": [
        "NASA-STD-3001 Vol 1 \u00a74",
        "HRP Human Research Roadmap"
      ]
    },
    "normal_range": [
      100,
      2000
    ]
  },
  {
    "id": "exercise",
    "label": "Exercise",
    "unit": "min",
    "decimals": 0,
    "category": "Bones & muscles",
    "body_region": "chest",
    "hazard_id": "gravity",
    "context_sensitive": false,
    "input": {
      "kind": "number",
      "min": 0,
      "max": 400,
      "step": 5,
      "placeholder": "120"
    },
    "prepare": {
      "equipment": "Astroskin wearable sensor garment",
      "conditions": "Rest seated for 5 minutes in microgravity",
      "instructions": "Ensure electrode contact points are flush with skin.",
      "duration": "2-3 min"
    },
    "why_matters": {
      "purpose": "Assesses physiological adaptation to long-duration spaceflight.",
      "space_impact": "Fluid shifts and lack of gravitational loading alter baseline homeostatic regulation.",
      "sources": [
        "NASA-STD-3001 Vol 1 \u00a74",
        "HRP Human Research Roadmap"
      ]
    },
    "normal_range": [
      0,
      400
    ]
  },
  {
    "id": "vision",
    "label": "Vision check",
    "unit": "",
    "decimals": 0,
    "category": "Eyes & vision",
    "body_region": "chest",
    "hazard_id": "gravity",
    "context_sensitive": false,
    "input": {
      "kind": "vision",
      "min": 0,
      "max": 2,
      "step": 1,
      "placeholder": "0",
      "labels": [
        "Normal",
        "Distorted",
        "Missing",
        "Blurred"
      ]
    },
    "prepare": {
      "equipment": "Amsler Grid Vision Chart / Display",
      "conditions": "Standard habitat illumination (150-300 lux), reading distance 30 cm",
      "instructions": "Cover one eye, gaze at center dot, report grid distortion or missing lines.",
      "duration": "2 min"
    },
    "why_matters": {
      "purpose": "Screens for Spaceflight-Associated Neuro-ocular Syndrome (SANS).",
      "space_impact": "Cephalad fluid shift elevates intracranial pressure, causing optic disc edema, globe flattening, and hyperopic refractive shifts.",
      "sources": [
        "NASA-STD-3001 Vol 1 \u00a74",
        "HRP Human Research Roadmap"
      ]
    },
    "normal_range": [
      0,
      2
    ]
  },
  {
    "id": "symptoms",
    "label": "Symptom check",
    "unit": "",
    "decimals": 0,
    "category": "General",
    "body_region": "chest",
    "hazard_id": "gravity",
    "context_sensitive": false,
    "input": {
      "kind": "symptoms",
      "min": 0,
      "max": 20,
      "step": 1,
      "placeholder": "0"
    },
    "prepare": {
      "equipment": "Astroskin wearable sensor garment",
      "conditions": "Rest seated for 5 minutes in microgravity",
      "instructions": "Ensure electrode contact points are flush with skin.",
      "duration": "2-3 min"
    },
    "why_matters": {
      "purpose": "Assesses physiological adaptation to long-duration spaceflight.",
      "space_impact": "Fluid shifts and lack of gravitational loading alter baseline homeostatic regulation.",
      "sources": [
        "NASA-STD-3001 Vol 1 \u00a74",
        "HRP Human Research Roadmap"
      ]
    },
    "normal_range": [
      0,
      20
    ]
  }
];

export const SOLARIS_ORGANS: OrganDef[] = [
  {
    "id": "brain",
    "name": "Brain & behavior",
    "metrics": [
      "sleep",
      "mood",
      "reaction"
    ],
    "hazards": [
      "R",
      "I",
      "D"
    ],
    "function": "Controls mood, sleep, attention, decisions and, with the inner ear, balance: the crew's most important tool.",
    "space": "Isolation, confinement, odd light cycles and workload disturb sleep and mood. Deep-space radiation may affect cognition over long missions. The inner ear's balance organs misread weightlessness at first (space motion sickness) and again after landing, when balance takes days to recover.",
    "actions": [
      "Protect an 8.5-hour sleep window",
      "Use scheduled lighting",
      "Call family or psych support at the next comm window"
    ],
    "sources": [
      "hrp_cog",
      "hrp_sleep",
      "hrp_sport",
      "csa_body"
    ]
  },
  {
    "id": "eyes",
    "name": "Eyes & vision",
    "metrics": [
      "vision"
    ],
    "hazards": [
      "R",
      "G",
      "E"
    ],
    "function": "Vision for every task, from reading displays to docking.",
    "space": "Fluid shift toward the head can swell the optic disc, where the optic nerve enters the eye, and flatten the eye: Spaceflight-Associated Neuro-ocular Syndrome (SANS).",
    "actions": [
      "Weekly Amsler grid self-check",
      "Report any new blur",
      "Ground may request an eye ultrasound"
    ],
    "sources": [
      "hrp_sans"
    ]
  },
  {
    "id": "heart",
    "name": "Heart & circulation",
    "metrics": [
      "hr",
      "bp"
    ],
    "hazards": [
      "R",
      "I",
      "D",
      "G"
    ],
    "function": "Pumps blood and oxygen to every organ.",
    "space": "With less work to do the heart can decondition. Fluid shift changes blood pressure, and returning to gravity can cause dizziness or fainting.",
    "actions": [
      "Daily aerobic exercise",
      "At least 2 L of fluids",
      "Report chest pain or fainting at once"
    ],
    "sources": [
      "hrp_cardio",
      "std3001v1",
      "csa_body"
    ]
  },
  {
    "id": "lungs",
    "name": "Lungs & breathing",
    "metrics": [
      "spo2",
      "resp"
    ],
    "hazards": [
      "D",
      "E"
    ],
    "function": "Brings oxygen in and removes CO2.",
    "space": "CO2 can build up in a sealed cabin. On the Moon and Mars, fine reactive dust can irritate the airways after EVAs.",
    "actions": [
      "Check cabin CO2 if you have a headache",
      "Dust control after EVAs",
      "Re-measure SpO2 if breathless"
    ],
    "sources": [
      "std3001v2",
      "ochmo_tb004",
      "hrp_dust",
      "hrp_hypoxia"
    ]
  },
  {
    "id": "metabolism",
    "name": "Metabolism & nutrition",
    "metrics": [
      "glucose",
      "mass",
      "nutrition"
    ],
    "hazards": [
      "I",
      "D",
      "G",
      "E"
    ],
    "function": "Turns food into energy and keeps blood sugar stable.",
    "space": "Appetite changes, a limited menu and less activity can lead to weight loss and lower insulin sensitivity.",
    "actions": [
      "Eat the full planned menu",
      "Weekly body-mass check",
      "Fasting glucose each morning"
    ],
    "sources": [
      "hrp_food",
      "std3001v1",
      "csa_body"
    ]
  },
  {
    "id": "immune",
    "name": "Immune system",
    "metrics": [
      "temp"
    ],
    "hazards": [
      "R",
      "I",
      "D",
      "E"
    ],
    "function": "Defends against infection. Fever is its alarm signal.",
    "space": "Stress, radiation and closed living change immune function. Dormant viruses can reactivate, and microbes spread easily in a sealed habitat.",
    "actions": [
      "Hand hygiene",
      "Report fever or sore throat early",
      "Keep personal items separate if ill"
    ],
    "sources": [
      "hrp_immuno",
      "hrp_microbe"
    ]
  },
  {
    "id": "kidneys",
    "name": "Kidneys & fluids",
    "metrics": [
      "hydration"
    ],
    "hazards": [
      "G",
      "E"
    ],
    "function": "Filter the blood and balance fluids and minerals.",
    "space": "Calcium released from shrinking bones raises kidney-stone risk, and the sense of thirst is weaker in weightlessness.",
    "actions": [
      "Drink at least 2 L a day",
      "Extra water on exercise days",
      "Report flank pain"
    ],
    "sources": [
      "hrp_renal"
    ]
  },
  {
    "id": "musculo",
    "name": "Bones & muscles",
    "metrics": [
      "exercise"
    ],
    "hazards": [
      "G"
    ],
    "function": "Bones and muscles give support, movement and calcium storage.",
    "space": "Unloaded bones lose roughly 1-1.5% of their mass per month, most at the hips and spine. Anti-gravity muscles of the calves, thighs, hips and back waste fastest, and the spine lengthens, causing back pain.",
    "actions": [
      "About 2 hours of exercise daily",
      "Load the hips, legs and spine",
      "Stretch for back pain"
    ],
    "sources": [
      "hrp_bone",
      "hrp_dynload",
      "csa_body"
    ]
  }
];

export const SOLARIS_EXERCISES: ExerciseDef[] = [
  {
    "id": "squat",
    "name": "Squat",
    "kind": "resistance",
    "anim": "squat",
    "targets": [
      "Hips",
      "Thighs",
      "Spine"
    ],
    "why": "Loads the hips and spine, where astronauts lose the most bone: about 1-1.5 % a month without it.",
    "cues": [
      "Feet shoulder-width, bar across the upper back",
      "Sit back until thighs are level",
      "Drive up through the heels; breathe out on the way up"
    ],
    "equipment": "ARED",
    "default_sets": 3,
    "default_reps": 10,
    "default_intensity": "75-85% 1-RM",
    "default_duration_min": 45
  },
  {
    "id": "deadlift",
    "name": "Deadlift",
    "kind": "resistance",
    "anim": "deadlift",
    "targets": [
      "Back",
      "Glutes",
      "Hamstrings"
    ],
    "why": "Keeps the back and hip muscles strong; back pain is common after the spine lengthens in microgravity.",
    "cues": [
      "Hinge at the hips, back flat",
      "Bar close to the shins",
      "Stand tall, squeeze the glutes at the top"
    ],
    "equipment": "ARED",
    "default_sets": 3,
    "default_reps": 10,
    "default_intensity": "75-85% 1-RM",
    "default_duration_min": 45
  },
  {
    "id": "heel_raise",
    "name": "Heel raise",
    "kind": "resistance",
    "anim": "heel_raise",
    "targets": [
      "Calves",
      "Ankles"
    ],
    "why": "Calf muscles shrink fastest in microgravity because feet no longer carry weight.",
    "cues": [
      "Bar on the shoulders, knees soft",
      "Rise onto the balls of the feet",
      "Lower slowly, 2 seconds down"
    ],
    "equipment": "ARED",
    "default_sets": 3,
    "default_reps": 10,
    "default_intensity": "75-85% 1-RM",
    "default_duration_min": 45
  },
  {
    "id": "press",
    "name": "Bench press",
    "kind": "resistance",
    "anim": "press",
    "targets": [
      "Chest",
      "Shoulders",
      "Arms"
    ],
    "why": "Upper-body strength for EVA suit work, hatch operations and emergency egress.",
    "cues": [
      "Shoulder blades pulled back",
      "Lower the bar to mid-chest",
      "Press up and slightly back"
    ],
    "equipment": "ARED",
    "default_sets": 3,
    "default_reps": 10,
    "default_intensity": "75-85% 1-RM",
    "default_duration_min": 45
  },
  {
    "id": "row",
    "name": "Seated row",
    "kind": "resistance",
    "anim": "row",
    "targets": [
      "Back",
      "Arms",
      "Grip"
    ],
    "why": "Upper-body pulling strength for suit work and hatch operations; the flywheel loads both directions.",
    "cues": [
      "Feet braced, back tall",
      "Pull the handle to the lower ribs",
      "Let the flywheel pull you back slowly"
    ],
    "equipment": "ARED",
    "default_sets": 3,
    "default_reps": 10,
    "default_intensity": "75-85% 1-RM",
    "default_duration_min": 45
  },
  {
    "id": "run",
    "name": "Treadmill run",
    "kind": "aerobic",
    "anim": "run",
    "targets": [
      "Heart",
      "Lungs",
      "Legs",
      "Bones"
    ],
    "why": "Running is the only aerobic exercise that also gives bones the impact they need.",
    "cues": [
      "Harness snug at hips and shoulders",
      "Short, quick steps",
      "Land mid-foot under the hips"
    ],
    "equipment": "T2 Treadmill",
    "default_sets": null,
    "default_reps": null,
    "default_intensity": "70-80% HRmax",
    "default_duration_min": 30
  },
  {
    "id": "cycle_intervals",
    "name": "Cycle intervals",
    "kind": "aerobic",
    "anim": "cycle",
    "targets": [
      "Heart",
      "Lungs"
    ],
    "why": "Short hard intervals keep aerobic fitness (VO2max) high in a fraction of the time.",
    "cues": [
      "Clip in, hands light on the bars",
      "Hard: above 90 % of max heart rate",
      "Easy pedalling between efforts"
    ],
    "equipment": "CEVIS Cycle Ergometer",
    "default_sets": null,
    "default_reps": null,
    "default_intensity": "70-80% HRmax",
    "default_duration_min": 30
  },
  {
    "id": "cycle_steady",
    "name": "Steady ride",
    "kind": "aerobic",
    "anim": "cycle",
    "targets": [
      "Heart",
      "Lungs"
    ],
    "why": "Steady endurance work builds the base for EVAs and long work days.",
    "cues": [
      "Hold a pace you could talk at",
      "About 70-75 % of max heart rate",
      "Keep cadence smooth, 70-90 rpm"
    ],
    "equipment": "CEVIS Cycle Ergometer",
    "default_sets": null,
    "default_reps": null,
    "default_intensity": "70-80% HRmax",
    "default_duration_min": 30
  }
];

export const SOLARIS_ROUTINE_TASKS: RoutineTaskDef[] = [
  {
    "id": "morning",
    "time": "07:30",
    "title": "Morning vitals",
    "metrics": [
      "hr",
      "bp",
      "spo2"
    ],
    "xp": 30
  },
  {
    "id": "glucose",
    "time": "07:45",
    "title": "Fasting glucose",
    "metrics": [
      "glucose"
    ],
    "xp": 15
  },
  {
    "id": "sleep",
    "time": "08:00",
    "title": "Sleep log",
    "metrics": [
      "sleep"
    ],
    "xp": 10
  },
  {
    "id": "exercise",
    "time": "10:00",
    "title": "Exercise block (2 h)",
    "metrics": [
      "exercise"
    ],
    "xp": 40
  },
  {
    "id": "reaction",
    "time": "14:00",
    "title": "Alertness test",
    "metrics": [
      "reaction"
    ],
    "xp": 15
  },
  {
    "id": "evening",
    "time": "18:00",
    "title": "Evening check",
    "metrics": [
      "temp",
      "resp"
    ],
    "xp": 20
  },
  {
    "id": "fluids",
    "time": "20:30",
    "title": "Food & fluids log",
    "metrics": [
      "hydration",
      "nutrition"
    ],
    "xp": 15
  },
  {
    "id": "wellbeing",
    "time": "21:00",
    "title": "Mood & symptoms",
    "metrics": [
      "mood",
      "symptoms"
    ],
    "xp": 20
  },
  {
    "id": "mass",
    "time": "07:50",
    "title": "Weekly body mass",
    "metrics": [
      "mass"
    ],
    "xp": 10,
    "is_weekly": true
  },
  {
    "id": "vision",
    "time": "09:30",
    "title": "Weekly vision self-check",
    "metrics": [
      "vision"
    ],
    "xp": 20,
    "is_weekly": true
  }
];

export const SOLARIS_SYMPTOMS = [
  {
    "id": "headache",
    "label": "Headache",
    "organ": "brain",
    "red_flag": false
  },
  {
    "id": "fatigue",
    "label": "Unusual fatigue",
    "organ": "brain",
    "red_flag": false
  },
  {
    "id": "congestion",
    "label": "Nasal congestion",
    "organ": "lungs",
    "red_flag": false
  },
  {
    "id": "cough",
    "label": "Cough",
    "organ": "lungs",
    "red_flag": false
  },
  {
    "id": "sore_throat",
    "label": "Sore throat",
    "organ": "immune",
    "red_flag": false
  },
  {
    "id": "nausea",
    "label": "Nausea",
    "organ": "brain",
    "red_flag": false
  },
  {
    "id": "back_pain",
    "label": "Back pain",
    "organ": "musculo",
    "red_flag": false
  },
  {
    "id": "eye_irritation",
    "label": "Eye irritation",
    "organ": "eyes",
    "red_flag": false
  },
  {
    "id": "rash",
    "label": "Skin rash",
    "organ": "immune",
    "red_flag": false
  },
  {
    "id": "dizziness",
    "label": "Dizziness",
    "organ": "heart",
    "red_flag": false
  },
  {
    "id": "chest_pain",
    "label": "Chest pain or pressure",
    "organ": "heart",
    "red_flag": true
  },
  {
    "id": "short_breath",
    "label": "Shortness of breath",
    "organ": "lungs",
    "red_flag": true
  },
  {
    "id": "confusion",
    "label": "Confusion",
    "organ": "brain",
    "red_flag": true
  },
  {
    "id": "vision_loss",
    "label": "Sudden vision change",
    "organ": "eyes",
    "red_flag": true
  }
];
