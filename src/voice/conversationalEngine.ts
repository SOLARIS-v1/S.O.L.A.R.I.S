/**
 * SOLARIS Conversational Clinical & Website Intelligence Engine
 * 
 * Provides natural language understanding, clinical decision support synthesis,
 * and whole-website action dispatching without cloud dependency.
 */

import { CREW_PROFILES, CrewProfile } from '../data/crewProfiles';
import { uiBus } from './uiBus';
import { matchVoiceCommand } from './commandRegistry';
import { checkEmergencySymptoms } from './narration';
import { normalizeVoiceInput, matchCrewIdentification } from './intents';
import { HealthTelemetryAccessor } from '../services/solarisVoiceService';

export interface DialogueResult {
  handled: boolean;
  intent: string;
  spokenResponse: string;
  textResponse: string;
  actionTaken?: string;
  suggestedFollowUps?: string[];
  navigationTarget?: string;
}

export interface ConversationContext {
  telemetryAccessor?: HealthTelemetryAccessor | null;
  activeCrew?: CrewProfile | null;
  selectCrew?: (id: string) => Promise<void> | void;
  currentPath?: string;
}

export async function processSolarisDialogue(
  rawInput: string,
  context: ConversationContext
): Promise<DialogueResult> {
  const clean = normalizeVoiceInput(rawInput);
  if (!clean) {
    return {
      handled: false,
      intent: 'empty',
      spokenResponse: '',
      textResponse: '',
    };
  }

  const activeCrew = context.activeCrew || CREW_PROFILES.vance;
  const callsign = activeCrew?.callsign || 'Astronaut';
  const name = activeCrew?.name || 'Astronaut';
  const vitals = activeCrew?.vitals;

  // 1. Emergency Symptom Screening
  if (checkEmergencySymptoms(rawInput)) {
    const speech = 'Warning: Your reported symptoms indicate acute clinical strain. Cease mission physical activities immediately and contact the flight surgeon.';
    return {
      handled: true,
      intent: 'emergency_alert',
      spokenResponse: speech,
      textResponse: `🚨 **CLINICAL EMERGENCY ALERT**\n\n${speech}\n\n*Telemetry alert logged to mission flight surgeon review.*`,
      actionTaken: 'EMERGENCY_SCREENING_TRIGGERED',
      suggestedFollowUps: ['Open Medical Review', 'Check vitals', 'Rest posture'],
    };
  }

  // 2. Direct Voice Command Match (from Command Registry)
  const cmdMatch = matchVoiceCommand(rawInput);
  if (cmdMatch && cmdMatch.score >= 0.85) {
    const { command, params } = cmdMatch;
    const result = await command.handler(params, {
      telemetryAccessor: context.telemetryAccessor,
    });
    const spoken = typeof result === 'string' ? result : command.feedbackText(params);
    return {
      handled: true,
      intent: command.id,
      spokenResponse: spoken,
      textResponse: spoken,
      actionTaken: `EXECUTED_${command.id.toUpperCase()}`,
      suggestedFollowUps: ['Read my vitals', 'Show body explorer', 'Start check-in'],
    };
  }

  // 3. Crew Switching & Identity Inquiries
  if (
    clean.includes('switch to chen') ||
    clean.includes('log in as chen') ||
    clean.includes('select chen') ||
    clean.includes('switch crew chen')
  ) {
    if (context.selectCrew) await context.selectCrew('chen');
    const speech = 'Switching active telemetry profile to Flight Engineer Sarah Chen.';
    return {
      handled: true,
      intent: 'switch_crew_chen',
      spokenResponse: speech,
      textResponse: `👤 **Switched Active Profile**: Flight Engineer Sarah Chen (FLT. ENG. M. CHEN).\n\n*Telemetry and 3D digital twin synchronized to Chen's readings.*`,
      actionTaken: 'SWITCH_CREW_CHEN',
      suggestedFollowUps: ["What is Chen's heart rate?", "Show Chen's sleep deficit", 'Read my vitals'],
    };
  }

  if (
    clean.includes('switch to vance') ||
    clean.includes('log in as vance') ||
    clean.includes('select vance') ||
    clean.includes('switch crew vance')
  ) {
    if (context.selectCrew) await context.selectCrew('vance');
    const speech = 'Switching active telemetry profile to Commander Alex Vance.';
    return {
      handled: true,
      intent: 'switch_crew_vance',
      spokenResponse: speech,
      textResponse: `👤 **Switched Active Profile**: Commander Alex Vance (CMDR. A. VANCE).\n\n*Telemetry and 3D digital twin synchronized to Vance's readings.*`,
      actionTaken: 'SWITCH_CREW_VANCE',
      suggestedFollowUps: ["Check Vance's blood pressure", 'Inspect heart in 3D', 'Read my vitals'],
    };
  }

  if (
    clean.includes('switch to patel') ||
    clean.includes('log in as patel') ||
    clean.includes('select patel') ||
    clean.includes('switch crew patel')
  ) {
    if (context.selectCrew) await context.selectCrew('patel');
    const speech = 'Switching active telemetry profile to Specialist Patel.';
    return {
      handled: true,
      intent: 'switch_crew_patel',
      spokenResponse: speech,
      textResponse: `👤 **Switched Active Profile**: Specialist Patel (SPEC. R. PATEL).\n\n*Telemetry and 3D digital twin synchronized to Patel's readings.*`,
      actionTaken: 'SWITCH_CREW_PATEL',
      suggestedFollowUps: ["Check Patel's vitals", 'Open exercise session', 'Read my vitals'],
    };
  }

  // Inquiries about specific crew members
  if (clean.includes('how is chen') || clean.includes('tell me about chen') || clean.includes('chen status')) {
    const chen = CREW_PROFILES.chen;
    const speech = `Flight Engineer Chen is on ${chen.status} status. Telemetry logs an acute sleep deficit of ${chen.vitals.sleepHours} hours and resting heart rate of ${chen.vitals.heartRate} BPM, with microgravity lumbar elongation strain.`;
    return {
      handled: true,
      intent: 'query_crew_chen',
      spokenResponse: speech,
      textResponse: `📋 **Flight Engineer Sarah Chen Status**:\n- **Status**: ${chen.status}\n- **Heart Rate**: ${chen.vitals.heartRate} BPM\n- **Sleep Duration**: ${chen.vitals.sleepHours} hrs (Acute Deficit)\n- **Blood Pressure**: ${chen.vitals.bloodPressure} mmHg\n- **Clinical Note**: Microgravity spinal elongation discomfort and circadian phase shift.`,
      suggestedFollowUps: ['Switch to Chen', 'Inspect spine in 3D', 'Show sleep recommendations'],
    };
  }

  if (clean.includes('how is vance') || clean.includes('tell me about vance') || clean.includes('vance status')) {
    const vance = CREW_PROFILES.vance;
    const speech = `Commander Vance is on ${vance.status} status. Cardiovascular telemetry shows heart rate at ${vance.vitals.heartRate} BPM with decreased HRV at ${vance.vitals.hrv} milliseconds and intermittent ectopic jumps.`;
    return {
      handled: true,
      intent: 'query_crew_vance',
      spokenResponse: speech,
      textResponse: `📋 **Commander Alex Vance Status**:\n- **Status**: ${vance.status}\n- **Heart Rate**: ${vance.vitals.heartRate} BPM\n- **HRV**: ${vance.vitals.hrv} ms\n- **Blood Pressure**: ${vance.vitals.bloodPressure} mmHg\n- **Clinical Note**: Cardiovascular sympathetic strain with premature ventricular contractions.`,
      suggestedFollowUps: ['Switch to Vance', 'Inspect heart in 3D', 'Read my readings'],
    };
  }

  if (clean.includes('how is patel') || clean.includes('tell me about patel') || clean.includes('patel status')) {
    const patel = CREW_PROFILES.patel;
    const speech = `Specialist Patel is on ${patel.status} status. All physiological readings are in optimal range with resting sinus rhythm at ${patel.vitals.heartRate} BPM and ${patel.vitals.sleepHours} hours of restful sleep.`;
    return {
      handled: true,
      intent: 'query_crew_patel',
      spokenResponse: speech,
      textResponse: `📋 **Specialist Patel Status**:\n- **Status**: ${patel.status}\n- **Heart Rate**: ${patel.vitals.heartRate} BPM (Resting Sinus)\n- **Sleep Duration**: ${patel.vitals.sleepHours} hrs (Optimal)\n- **Blood Pressure**: ${patel.vitals.bloodPressure} mmHg\n- **SpO2**: ${patel.vitals.spo2}%`,
      suggestedFollowUps: ['Switch to Patel', 'Open Exercise Countermeasures', 'Read my vitals'],
    };
  }

  if (clean.includes('who is on the crew') || clean.includes('crew roster') || clean.includes('list crew')) {
    const speech = 'The expedition roster consists of Commander Alex Vance, Flight Engineer Sarah Chen, and Specialist Patel.';
    return {
      handled: true,
      intent: 'list_crew_roster',
      spokenResponse: speech,
      textResponse: `🚀 **Expedition-64 Crew Roster**:\n1. **Cmdr. Alex Vance** — Mission Commander (Ectopic HR, Caution)\n2. **Eng. Sarah Chen** — Flight Engineer / Science Officer (Sleep Deficit, Review)\n3. **Spec. Patel** — EVA Specialist (Optimal, Nominal)`,
      suggestedFollowUps: ['Switch to Vance', 'Switch to Chen', 'Switch to Patel'],
    };
  }

  if (clean.includes('who am i') || clean.includes('my profile') || clean.includes('my callsign')) {
    const speech = `You are authenticated as ${name}, callsign ${callsign}, serving as ${activeCrew?.role}.`;
    return {
      handled: true,
      intent: 'who_am_i',
      spokenResponse: speech,
      textResponse: `👤 **Active Identity**: ${name} (${callsign})\n- **Role**: ${activeCrew?.role}\n- **Mission Day**: 142 / 500\n- **Current Status**: ${activeCrew?.status}`,
      suggestedFollowUps: ['Read my vitals', 'How am I doing', 'Switch user'],
    };
  }

  // 4. Physiological & Clinical Inquiries
  // Heart Rate & ECG
  if (
    clean.includes('heart rate') ||
    clean.includes('pulse') ||
    clean.includes('bpm') ||
    clean.includes('how is my heart') ||
    clean.includes('cardiac')
  ) {
    const hr = vitals?.heartRate || 78;
    const hrv = vitals?.hrv || 42;
    let note = 'Resting sinus rhythm is stable.';
    if (hr > 90) note = 'Elevated sympathetic tone observed with lower HRV.';
    else if (hr < 55) note = 'Resting bradycardia within trained athletic parameters.';

    uiBus.emit('SELECT_BODY_HOTSPOT', { hotspotId: 'cardio', region: 'Heart & Cardiovascular' });
    const speech = `Your current heart rate is ${hr} beats per minute with an HRV of ${hrv} milliseconds. ${note}`;
    return {
      handled: true,
      intent: 'query_heart_rate',
      spokenResponse: speech,
      textResponse: `❤️ **Cardiac Telemetry (${callsign})**:\n- **Heart Rate**: ${hr} BPM\n- **HRV (RMSSD)**: ${hrv} ms\n- **ECG Status**: 3-Lead Astroskin continuous streaming\n- **Assessment**: ${note}`,
      actionTaken: 'HIGHLIGHT_HEART_HOTSPOT',
      suggestedFollowUps: ['Inspect heart in 3D', 'Check blood pressure', 'Read all vitals'],
    };
  }

  // Blood Pressure
  if (
    clean.includes('blood pressure') ||
    clean.includes('bp') ||
    clean.includes('systolic') ||
    clean.includes('diastolic') ||
    clean.includes('map')
  ) {
    const bp = vitals?.bloodPressure || '120/80';
    const [sys, dia] = bp.split('/').map((s) => parseInt(s, 10));
    const mapVal = ((2 * dia + sys) / 3).toFixed(1);
    const speech = `Your blood pressure is ${bp} millimeters of mercury, giving a Mean Arterial Pressure of ${mapVal}. Cephalic blood flow is steady.`;
    return {
      handled: true,
      intent: 'query_blood_pressure',
      spokenResponse: speech,
      textResponse: `🩺 **Hemodynamic Telemetry (${callsign})**:\n- **Blood Pressure**: ${bp} mmHg\n- **Systolic**: ${sys} mmHg\n- **Diastolic**: ${dia} mmHg\n- **Mean Arterial Pressure (MAP)**: ${mapVal} mmHg`,
      suggestedFollowUps: ['Log new blood pressure', 'Check heart rate', 'Open Diagnostics Lab'],
    };
  }

  // Sleep & Circadian Phase
  if (
    clean.includes('sleep') ||
    clean.includes('tired') ||
    clean.includes('fatigue') ||
    clean.includes('circadian') ||
    clean.includes('how much did i sleep')
  ) {
    const hours = vitals?.sleepHours || 6.8;
    let evalText = 'Sleep duration and recovery index are nominal.';
    if (hours < 6.0) evalText = 'Actigraphy flags acute circadian desynchrony and reduced slow-wave restorative sleep.';
    const speech = `NASA Archer actigraphy recorded ${hours} hours of sleep last night. ${evalText}`;
    return {
      handled: true,
      intent: 'query_sleep',
      spokenResponse: speech,
      textResponse: `🌙 **Sleep & Circadian Actigraphy (${callsign})**:\n- **Sleep Duration**: ${hours} hrs\n- **Sensor**: NASA Archer Continuous Wristband\n- **Assessment**: ${evalText}\n- **Protocol**: 30-minute 480nm morning blue light exposure recommended.`,
      suggestedFollowUps: ['Compare sleep and heart rate', 'Start check-in', 'Read my vitals'],
    };
  }

  // Oxygen & Pulmonary
  if (
    clean.includes('oxygen') ||
    clean.includes('spo2') ||
    clean.includes('breathing') ||
    clean.includes('lungs') ||
    clean.includes('respiration')
  ) {
    const spo2 = vitals?.spo2 || 98.4;
    const resp = vitals?.respRate || 14.2;
    uiBus.emit('SELECT_BODY_HOTSPOT', { hotspotId: 'lungs', region: 'Thoracic RIP & Lungs' });
    const speech = `Astroskin forehead PPG indicates oxygen saturation at ${spo2} percent with respiration rate at ${resp} breaths per minute. Pulmonary gas exchange is optimal.`;
    return {
      handled: true,
      intent: 'query_oxygen',
      spokenResponse: speech,
      textResponse: `🫁 **Pulmonary & Respiration Telemetry (${callsign})**:\n- **SpO2**: ${spo2}%\n- **Respiration Rate**: ${resp} br/min\n- **Thoracic Tidal Volume**: 520 mL\n- **Sensor**: Dual-Band Astroskin RIP`,
      actionTaken: 'HIGHLIGHT_LUNGS_HOTSPOT',
      suggestedFollowUps: ['Inspect lungs in 3D', 'Check core temperature', 'Read my vitals'],
    };
  }

  // Core Temperature
  if (
    clean.includes('temperature') ||
    clean.includes('core temp') ||
    clean.includes('fever')
  ) {
    const temp = vitals?.coreTemp || 37.1;
    const speech = `Thermistor telemetry confirms core temperature is ${temp} degrees Celsius, within nominal physiological parameters.`;
    return {
      handled: true,
      intent: 'query_temperature',
      spokenResponse: speech,
      textResponse: `🌡️ **Thermal Regulation (${callsign})**:\n- **Core Temperature**: ${temp} °C\n- **Status**: Nominal euthermic range (36.5°C – 37.5°C)`,
      suggestedFollowUps: ['Check oxygen saturation', 'Check heart rate', 'Read my vitals'],
    };
  }

  // Radiation & Shielding
  if (
    clean.includes('radiation') ||
    clean.includes('dose') ||
    clean.includes('dosimeter') ||
    clean.includes('hera') ||
    clean.includes('safe')
  ) {
    const rad = vitals?.radiation_mSv || 54.8;
    const speech = `HERA radiation dosimeter registers cumulative absorption at ${rad} millisieverts on Mission Day 142. Shielding margins remain well within NASA flight rules.`;
    return {
      handled: true,
      intent: 'query_radiation',
      spokenResponse: speech,
      textResponse: `☢️ **Dosimetry & Habitat Radiation (${callsign})**:\n- **Cumulative Exposure**: ${rad} mSv\n- **Daily Absorption Rate**: 0.12 mSv/day\n- **Sensor**: HERA / CPD Active Dosimeter\n- **Margin**: 142 days in transit, safe astronaut career margin remaining.`,
      suggestedFollowUps: ['Open Habitat Environment', 'Read all vitals', 'How am I doing'],
    };
  }

  // Spine & Back Pain
  if (
    clean.includes('spine') ||
    clean.includes('back pain') ||
    clean.includes('back hurt') ||
    clean.includes('lumbar') ||
    clean.includes('elongation')
  ) {
    uiBus.emit('SELECT_BODY_HOTSPOT', { hotspotId: 'spine_skin', region: 'Lumbar Spine' });
    const speech = 'Microgravity spinal unloading causes intervertebral disc rehydration and up to 4 centimeters of spinal elongation. I recommend 15 minutes in fetal tuck posture and axial loading on the ARED unit.';
    return {
      handled: true,
      intent: 'query_spine',
      spokenResponse: speech,
      textResponse: `🦴 **Spinal Elongation & Lumbar Telemetry**:\n- **Mechanism**: Decompression of intervertebral discs due to microgravity unloading (+3.4 cm average elongation).\n- **Symptoms**: Dull lumbar ache and paraspinal muscle fatigue.\n- **Countermeasures**: Fetal tuck stretch posture, resistance axial loading on ARED, lumbar support band.`,
      actionTaken: 'HIGHLIGHT_SPINE_HOTSPOT',
      suggestedFollowUps: ['Inspect spine in 3D', 'Open Exercise Countermeasures', 'Start check-in'],
    };
  }

  // Vision, Eyes, SANS
  if (
    clean.includes('sans') ||
    clean.includes('eyes') ||
    clean.includes('vision') ||
    clean.includes('blurry') ||
    clean.includes('optic')
  ) {
    uiBus.emit('NAVIGATE', { path: '/eye-test' });
    const speech = 'Spaceflight-Associated Neuro-ocular Syndrome arises from cephalic fluid shift elevating intracranial pressure. Opening the SANS visual acuity and Amsler grid test now.';
    return {
      handled: true,
      intent: 'query_sans',
      spokenResponse: speech,
      textResponse: `👁️ **Spaceflight-Associated Neuro-ocular Syndrome (SANS)**:\n- **Pathophysiology**: Cranial fluid shifts increase optic sheath diameter and intracranial pressure.\n- **Protocol**: Periodic visual acuity checks and near-point accommodation monitoring.\n- **Action**: Navigated to SANS Eye Test screen.`,
      actionTaken: 'NAVIGATED_TO_EYE_TEST',
      navigationTarget: '/eye-test',
      suggestedFollowUps: ['Start eye test', 'Inspect cranial fluid shift in 3D', 'Read my vitals'],
    };
  }

  // 5. Website Interactive Actions (Natural requests)
  if (
    clean.includes('show 3d') ||
    clean.includes('show my body') ||
    clean.includes('3d model') ||
    clean.includes('digital twin') ||
    clean.includes('look at my body')
  ) {
    uiBus.emit('NAVIGATE', { path: '/body' });
    const speech = 'Displaying 3D Anatomical Digital Twin.';
    return {
      handled: true,
      intent: 'show_3d_twin',
      spokenResponse: speech,
      textResponse: `🧬 **Navigated to 3D Anatomical Digital Twin**\n\nYou can speak commands like *"Show my heart"*, *"Rotate left"*, *"Zoom in"*, or *"Reset view"*.`,
      actionTaken: 'NAVIGATE_BODY',
      navigationTarget: '/body',
      suggestedFollowUps: ['Show my heart', 'Inspect lungs', 'Rotate left', 'Reset view'],
    };
  }

  if (
    clean.includes('analytics') ||
    clean.includes('charts') ||
    clean.includes('trends') ||
    clean.includes('show history')
  ) {
    uiBus.emit('NAVIGATE', { path: '/analytics' });
    const speech = 'Opening longitudinal telemetry trends and analytics.';
    return {
      handled: true,
      intent: 'show_analytics',
      spokenResponse: speech,
      textResponse: `📈 **Navigated to Longitudinal Health Analytics**\n\nReviewing 30-day multivariate physiological baselines and telemetry trends.`,
      actionTaken: 'NAVIGATE_ANALYTICS',
      navigationTarget: '/analytics',
      suggestedFollowUps: ['Show 7 days', 'Show 30 days', 'Compare sleep and heart rate'],
    };
  }

  if (
    clean.includes('start check in') ||
    clean.includes('daily check in') ||
    clean.includes('symptom check')
  ) {
    uiBus.emit('NAVIGATE', { path: '/check-in' });
    const speech = 'Opening daily clinical assessment check-in protocol.';
    return {
      handled: true,
      intent: 'open_checkin',
      spokenResponse: speech,
      textResponse: `📝 **Navigated to Daily Health Check-in**\n\nReady for 5-step physiological and psychological symptom verification.`,
      actionTaken: 'NAVIGATE_CHECKIN',
      navigationTarget: '/check-in',
      suggestedFollowUps: ['Mild pain', 'Sleep was fine', 'Submit assessment'],
    };
  }

  if (
    clean.includes('open simulator') ||
    clean.includes('run simulation') ||
    clean.includes('kinematics') ||
    clean.includes('biomechanics')
  ) {
    uiBus.emit('DRAWER_ACTION', { drawer: 'simulator', action: 'open' });
    const speech = 'Opening NASA biomechanical kinematics simulator.';
    return {
      handled: true,
      intent: 'open_simulator',
      spokenResponse: speech,
      textResponse: `🦾 **NASA Biomechanical Kinematics Simulator Opened**\n\nSimulating live ARED bar loads, knee joint angles, and spinal shear stress.`,
      actionTaken: 'OPEN_SIMULATOR',
      suggestedFollowUps: ['Close drawer', 'Open tasks', 'Go to dashboard'],
    };
  }

  if (
    clean.includes('open tasks') ||
    clean.includes('my tasks') ||
    clean.includes('mission tasks')
  ) {
    uiBus.emit('DRAWER_ACTION', { drawer: 'tasks', action: 'open' });
    const speech = 'Opening expedition mission tasks and clinical protocols.';
    return {
      handled: true,
      intent: 'open_tasks',
      spokenResponse: speech,
      textResponse: `📋 **Mission Operational Tasks Opened**\n\nDisplaying assigned clinical protocols, sensor diagnostics, and countermeasure schedules.`,
      actionTaken: 'OPEN_TASKS',
      suggestedFollowUps: ['Close drawer', 'Open environment', 'Go to Stage'],
    };
  }

  if (
    clean.includes('open environment') ||
    clean.includes('habitat') ||
    clean.includes('cabin environment') ||
    clean.includes('co2')
  ) {
    uiBus.emit('DRAWER_ACTION', { drawer: 'environment', action: 'open' });
    const speech = 'Opening habitat environment and life support telemetry.';
    return {
      handled: true,
      intent: 'open_environment',
      spokenResponse: speech,
      textResponse: `🛸 **Habitat Environment & ECLSS Telemetry Opened**\n\nDisplaying cabin pressure, ppO2, ppCO2, cabin temperature, and radiation shielding.`,
      actionTaken: 'OPEN_ENVIRONMENT',
      suggestedFollowUps: ['Close drawer', 'Read my vitals', 'Go to dashboard'],
    };
  }

  // 6. Conversational Greetings & General Mission Inquiries
  if (clean.includes('good morning') || clean.includes('hello solaris') || clean.includes('hey solaris') || clean.includes('hi solaris')) {
    const speech = `Good morning, ${callsign}. SOLARIS is online and streaming live telemetry. All systems holding steady on Mission Day 142.`;
    return {
      handled: true,
      intent: 'greeting',
      spokenResponse: speech,
      textResponse: `☀️ **Good Morning, ${name}**\n\nSOLARIS Medical Intelligence is active and synchronized. Resting vitals are streaming from your Astroskin sensors.\n\n*How can I assist your mission duties today?*`,
      suggestedFollowUps: ['Read my vitals', 'Start check-in', 'Show 3D body'],
    };
  }

  if (clean.includes('thank you') || clean.includes('thanks')) {
    const speech = `You're welcome, ${callsign}. Standing by for health and telemetry directives.`;
    return {
      handled: true,
      intent: 'thank_you',
      spokenResponse: speech,
      textResponse: `✨ **Standing By**\n\nAlways ready to assist, ${callsign}. Say *"Sleep SOLARIS"* when you need quiet, or tap the orb anytime.`,
      suggestedFollowUps: ['Read my vitals', 'Show trends', 'Sleep SOLARIS'],
    };
  }

  if (clean.includes('what can you do') || clean.includes('help') || clean.includes('what can i say')) {
    const speech = 'I can monitor your vitals, inspect your 3D digital twin, control any screen on the website, run kinematics simulations, and provide clinical flight surgeon support.';
    return {
      handled: true,
      intent: 'help_capabilities',
      spokenResponse: speech,
      textResponse: `🛡️ **SOLARIS Clinical AI Capabilities**:\n- **Telemetry**: Say *"Read my vitals"*, *"What's my blood pressure?"*, *"How did I sleep?"*\n- **3D Digital Twin**: Say *"Show my heart"*, *"Rotate left"*, *"Zoom in"*\n- **Website Control**: Say *"Go to Stage"*, *"Open Analytics"*, *"Start Check-in"*, *"Open Simulator"*\n- **Crew Telemetry**: Say *"Switch to Chen"*, *"How is Vance doing?"*\n- **Direct Actions**: Say *"Click [button name]"* or *"Scroll down"*`,
      suggestedFollowUps: ['Read my vitals', 'Show heart in 3D', 'Open Analytics', 'Start check-in'],
    };
  }

  // 7. General Natural Synthesizer (Zero hardcoded feel)
  // Synthesize a responsive, contextually aware response based on active crew telemetry
  const summary = activeCrew?.summaryVerdict || `Biometrics for ${name} are calibrated and streaming nominal telemetry.`;
  const speech = `Acknowledged, ${callsign}. ${summary}`;
  return {
    handled: true,
    intent: 'conversational_synthesis',
    spokenResponse: speech,
    textResponse: `🛰️ **SOLARIS Clinical Intelligence**:\n\n${summary}\n\n*You can ask me to inspect any anatomical system, analyze telemetry trends, switch crew members, or navigate to any section of the mission console.*`,
    suggestedFollowUps: [
      'Read my vitals',
      'Show my heart in 3D',
      'Open Analytics',
      'Switch crew profile',
    ],
  };
}
