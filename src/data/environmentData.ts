// SOLARIS Astronaut Health Intelligence & Decision Support Platform
// Mission Habitat Environment & Life Support Telemetry Layer

import { ValueProvenanceType, MeasurementProvenance } from './healthData';

export interface AtmosphericTelemetry {
  totalPressure_kPa: {
    value: number; // nominal: 101.3 kPa (1 atm)
    unit: 'kPa';
    psiEquivalent: number; // 14.69 psi
    mmHgEquivalent: number; // 760 mmHg
    setpoint: number;
    delta_kPa: number;
    status: 'NOMINAL' | 'WARNING' | 'CRITICAL';
    provenance: MeasurementProvenance;
  };
  ppO2_kPa: {
    value: number; // nominal: 21.3 kPa
    unit: 'kPa';
    percentage: number; // ~21.0%
    normalRange: [19.5, 23.5];
    status: 'NOMINAL' | 'HYPOXIC_RISK' | 'HYPEROXIC_RISK';
    provenance: MeasurementProvenance;
  };
  ppCO2_mmHg: {
    value: number; // nominal: < 3.0 mmHg
    unit: 'mmHg';
    kPaEquivalent: number;
    spaceflightThresholds: {
      nominalMax: 3.0; // NASA standard flight guideline
      advisoryAlert: 3.5; // Mild cognitive & headache risk
      actionLimit: 4.0; // SANS optic disc edema / severe headache risk
    };
    status: 'NOMINAL' | 'ELEVATED' | 'HAZARDOUS';
    provenance: MeasurementProvenance;
  };
  ppN2_kPa: {
    value: number; // ~78.8 kPa
    unit: 'kPa';
    percentage: number; // ~78.0%
    provenance: MeasurementProvenance;
  };
  leakRate_kPa_per_day: {
    value: number; // 0.02 kPa/day
    unit: 'kPa/day';
    nominalLimit: 0.08;
    status: 'OPTIMAL_SEAL' | 'DEGRADED_SEAL';
    provenance: MeasurementProvenance;
  };
  eclssSystems: {
    cdra: {
      name: 'Carbon Dioxide Removal Assembly (CDRA)';
      mode: 'ACTIVE_ADSORPTION_BED_A' | 'DESORBING_BED_B' | 'REGENERATING';
      efficiencyPct: number;
      scrubberUptimeHours: number;
    };
    ogs: {
      name: 'Oxygen Generation System (OGS Electrolysis)';
      mode: 'ELECTROLYSIS_OPTIMAL' | 'STANDBY';
      h2oElectrolyzedRate_L_day: number;
      o2ProducedRate_kg_day: number;
    };
    tccs: {
      name: 'Trace Contaminant Control Subsystem';
      catalyticOxidizerTemp_C: number;
      charcoalBedDeltaP_kPa: number;
    };
    waterRecovery: {
      efficiencyPct: number;
      potableWaterStorage_pct: number;
    };
  };
}

export interface ThermalAcousticTelemetry {
  cabinTemperature: {
    value_c: number; // ~22.4 °C
    value_f: number; // ~72.3 °F
    unit: '°C';
    normalRange: [20.0, 24.5];
    status: 'NOMINAL' | 'WARM' | 'COLD';
    provenance: MeasurementProvenance;
  };
  relativeHumidity: {
    value_pct: number; // ~46.5%
    unit: '%';
    normalRange: [35, 60];
    status: 'NOMINAL' | 'DRY' | 'CONDENSATION_RISK';
    provenance: MeasurementProvenance;
  };
  dewPoint_C: {
    value: number; // ~10.4 °C
    unit: '°C';
    provenance: MeasurementProvenance;
  };
  ventilationAirspeed_mps: {
    value: number; // ~0.18 m/s
    unit: 'm/s';
    minimumRecommended: 0.08; // Below 0.08 m/s causes CO2 bubble pocketing around sleeping astronauts
    status: 'ADEQUATE_DISPERSION' | 'STAGNANT_POCKET_RISK';
    provenance: MeasurementProvenance;
  };
  ambientNoise_dBA: {
    value: number; // ~52.4 dBA
    unit: 'dBA';
    nasaStandardNC52_limit: 60; // Work quarters limit
    status: 'COMPLIANT' | 'BORDERLINE' | 'EXCEEDED';
    provenance: MeasurementProvenance;
  };
  sleepCompartmentNoise_dBA: {
    value: number; // ~43.8 dBA
    unit: 'dBA';
    nasaStandardNC40_limit: 48; // Sleep quarters acoustic requirement
    status: 'OPTIMAL_QUIET' | 'EXCEEDED';
    provenance: MeasurementProvenance;
  };
  octaveBands_dB: Array<{
    frequencyHz: number;
    measured_dB: number;
    nc52Limit_dB: number;
  }>;
}

export interface GravitationalTelemetry {
  currentG: {
    value: number; // 0.00g (Microgravity)
    unit: 'g';
    regime: 'TRANSIT_MICROGRAVITY' | 'LUNAR_GRAVITY_0_166' | 'MARS_GRAVITY_0_38' | 'CENTRIFUGE_ARTIFICIAL';
    provenance: MeasurementProvenance;
  };
  microVibration_ug: {
    axisX: number; // µg
    axisY: number;
    axisZ: number;
    vectorMagnitude_ug: number;
    primarySource: 'Reaction Wheels & ECLSS Fluid Pumps';
    provenance: MeasurementProvenance;
  };
  vestibularAdaptation: {
    status: 'COMPLETE' | 'IN_PROGRESS' | 'ACUTE_SPACE_MOTION_SICKNESS';
    solarisIndex: string;
    otolithResetState: 'Microgravity otolith-ocular reflex calibrated';
  };
  fluidShiftVector: {
    status: 'STABILIZED_CEPHALIC_DISTRIBUTION';
    jugularPressureEst_mmHg: 14.2;
    intracranialTranslocationPct: 32;
    countermeasureActive: 'Lower Body Negative Pressure (LBNP) scheduled 17:00';
  };
}

export interface EarthLinkTelemetry {
  distance: {
    millionKm: number; // 258.4 million km
    astronomicalUnits_AU: number; // 1.727 AU
    provenance: MeasurementProvenance;
  };
  oneWayLightTime: {
    seconds: number; // 862 seconds
    formattedMinutes: string; // "14m 22s"
    formula: 'OWLT = Distance / Speed of Light c (299,792.458 km/s)';
    provenance: MeasurementProvenance;
  };
  roundTripTime: {
    seconds: number; // 1724 seconds
    formattedMinutes: string; // "28m 44s"
    formula: 'RTT = 2 × OWLT';
    provenance: MeasurementProvenance;
  };
  linkState: {
    status: 'CONNECTED' | 'LIMITED' | 'OCCULTED';
    groundStation: 'Deep Space Network - Goldstone DSS-14 (70m)';
    stationElevation_deg: 44.8;
    carrierBand: 'Ka-Band (32 GHz Uplink / 34 GHz Downlink)';
    opticalLaserTerminal: 'DSOC Near-Infrared Laser Transceiver Locked';
    provenance: MeasurementProvenance;
  };
  bandwidthAndQuality: {
    downlinkRate_Mbps: number; // 12.8 Mbps
    uplinkRate_Mbps: number; // 2.4 Mbps
    signalMargin_dB: number; // +6.4 dB
    bitErrorRate: string; // "1.2e-9"
    packetLossPct: number; // 0.04%
    antennaPointingOffset_deg: number; // 0.002°
    provenance: MeasurementProvenance;
  };
}

export interface TraceContaminantsTelemetry {
  carbonMonoxide_ppm: {
    value: number; // 1.2 ppm
    smac24h_limit: 10.0; // Spacecraft Maximum Allowable Concentration
    status: 'NOMINAL';
    provenance: MeasurementProvenance;
  };
  ammonia_ppm: {
    value: number; // 0.4 ppm
    smac24h_limit: 5.0;
    status: 'NOMINAL';
    provenance: MeasurementProvenance;
  };
  vocTotal_mg_m3: {
    value: number; // 0.18 mg/m³
    limit: 1.0;
    status: 'NOMINAL';
    provenance: MeasurementProvenance;
  };
  particulateHEPA_ug_m3: {
    value: number; // 14 µg/m³
    limit: 50.0;
    status: 'NOMINAL';
    provenance: MeasurementProvenance;
  };
}

export interface HabitatEnvironmentDataset {
  habitatId: string;
  habitatName: string;
  missionSol: number;
  missionPhase: string;
  atmospheric: AtmosphericTelemetry;
  thermalAcoustic: ThermalAcousticTelemetry;
  gravitational: GravitationalTelemetry;
  earthLink: EarthLinkTelemetry;
  traceContaminants: TraceContaminantsTelemetry;
}

export function getHabitatEnvironment(isElevatedCO2Scenario = false): HabitatEnvironmentDataset {
  const nowIso = new Date().toISOString();

  const ppCO2 = isElevatedCO2Scenario ? 3.8 : 2.8;
  const ppCO2Status = isElevatedCO2Scenario ? 'ELEVATED' : 'NOMINAL';

  return {
    habitatId: 'HAB-SOL-01',
    habitatName: 'SOLARIS Deep Space Habitat (Transit Mod Alpha)',
    missionSol: 142,
    missionPhase: 'Trans-Mars Injection Phase 3 (Outbound Sol 142 of 500)',
    atmospheric: {
      totalPressure_kPa: {
        value: 101.3,
        unit: 'kPa',
        psiEquivalent: 14.69,
        mmHgEquivalent: 759.8,
        setpoint: 101.3,
        delta_kPa: 0.0,
        status: 'NOMINAL',
        provenance: {
          type: 'MEASURED',
          sensorCode: 'ECLSS-BARO-01',
          hardware: 'Capacitive Ceramic Diaphragm Pressure Transducer',
          samplingRate: '1 Hz Continuous',
          calibrationDate: '2026-10-01',
          timestamp: nowIso,
          quality: 'OPTIMAL',
          confidencePct: 99.9,
        },
      },
      ppO2_kPa: {
        value: 21.3,
        unit: 'kPa',
        percentage: 21.0,
        normalRange: [19.5, 23.5],
        status: 'NOMINAL',
        provenance: {
          type: 'MEASURED',
          sensorCode: 'ECLSS-O2-02',
          hardware: 'Zirconia Solid-Electrolyte Oxygen Sensor',
          samplingRate: '1 Hz Continuous',
          calibrationDate: '2026-10-01',
          timestamp: nowIso,
          quality: 'OPTIMAL',
          confidencePct: 99.8,
        },
      },
      ppCO2_mmHg: {
        value: ppCO2,
        unit: 'mmHg',
        kPaEquivalent: Math.round((ppCO2 * 0.133322) * 100) / 100,
        spaceflightThresholds: {
          nominalMax: 3.0,
          advisoryAlert: 3.5,
          actionLimit: 4.0,
        },
        status: ppCO2Status,
        provenance: {
          type: isElevatedCO2Scenario ? 'SIMULATED' : 'MEASURED',
          sensorCode: 'ECLSS-CO2-03',
          hardware: 'Non-Dispersive Infrared Spectrophotometer (NDIR)',
          samplingRate: '1 Hz Continuous',
          calibrationDate: '2026-10-01',
          timestamp: nowIso,
          quality: isElevatedCO2Scenario ? 'SIMULATED' : 'OPTIMAL',
          confidencePct: isElevatedCO2Scenario ? 90.0 : 99.7,
          note: isElevatedCO2Scenario
            ? 'SIMULATED SCENARIO: Elevated ppCO2 injected for environmental anomaly response verification.'
            : 'Operational reading. Continuous cabin trace CO2 monitored.',
        },
      },
      ppN2_kPa: {
        value: 78.8,
        unit: 'kPa',
        percentage: 77.8,
        provenance: {
          type: 'DERIVED',
          sensorCode: 'ECLSS-BAL-ALG',
          hardware: 'Dalton Partial Pressure Mass Balance Kernel',
          samplingRate: '1 Hz Calculated',
          calibrationDate: '2026-11-14',
          timestamp: nowIso,
          quality: 'OPTIMAL',
          confidencePct: 99.5,
          derivationFormula: 'ppN2 = Total Pressure - (ppO2 + ppCO2 + ppH2O)',
        },
      },
      leakRate_kPa_per_day: {
        value: 0.02,
        unit: 'kPa/day',
        nominalLimit: 0.08,
        status: 'OPTIMAL_SEAL',
        provenance: {
          type: 'DERIVED',
          sensorCode: 'ECLSS-LEAK-ALG',
          hardware: 'Habitat Hermetic Seal 24-Hour Regressive Estimator',
          samplingRate: 'Daily Integration',
          calibrationDate: '2026-11-14',
          timestamp: nowIso,
          quality: 'OPTIMAL',
          confidencePct: 99.0,
          derivationFormula: 'dP/dt evaluated with PV=nRT thermal volume compensation',
        },
      },
      eclssSystems: {
        cdra: {
          name: 'Carbon Dioxide Removal Assembly (CDRA)',
          mode: isElevatedCO2Scenario ? 'DESORBING_BED_B' : 'ACTIVE_ADSORPTION_BED_A',
          efficiencyPct: isElevatedCO2Scenario ? 89.2 : 98.4,
          scrubberUptimeHours: 3408,
        },
        ogs: {
          name: 'Oxygen Generation System (OGS Electrolysis)',
          mode: 'ELECTROLYSIS_OPTIMAL',
          h2oElectrolyzedRate_L_day: 5.4,
          o2ProducedRate_kg_day: 4.8,
        },
        tccs: {
          name: 'Trace Contaminant Control Subsystem',
          catalyticOxidizerTemp_C: 398,
          charcoalBedDeltaP_kPa: 0.42,
        },
        waterRecovery: {
          efficiencyPct: 96.4,
          potableWaterStorage_pct: 92.0,
        },
      },
    },
    thermalAcoustic: {
      cabinTemperature: {
        value_c: 22.4,
        value_f: 72.3,
        unit: '°C',
        normalRange: [20.0, 24.5],
        status: 'NOMINAL',
        provenance: {
          type: 'MEASURED',
          sensorCode: 'ECLSS-TH-01',
          hardware: 'Four-Wire Platinum Resistance Temperature Detector (RTD Pt100)',
          samplingRate: '0.1 Hz Continuous',
          calibrationDate: '2026-10-01',
          timestamp: nowIso,
          quality: 'OPTIMAL',
          confidencePct: 99.8,
        },
      },
      relativeHumidity: {
        value_pct: 46.5,
        unit: '%',
        normalRange: [35, 60],
        status: 'NOMINAL',
        provenance: {
          type: 'MEASURED',
          sensorCode: 'ECLSS-RH-02',
          hardware: 'Thin-Film Capacitive Humidity Polymer Sensor',
          samplingRate: '0.1 Hz Continuous',
          calibrationDate: '2026-10-01',
          timestamp: nowIso,
          quality: 'OPTIMAL',
          confidencePct: 99.2,
        },
      },
      dewPoint_C: {
        value: 10.4,
        unit: '°C',
        provenance: {
          type: 'DERIVED',
          sensorCode: 'ECLSS-DEW-ALG',
          hardware: 'Magnus-Tetens Psychrometric Formula Kernel',
          samplingRate: '0.1 Hz Calculated',
          calibrationDate: '2026-11-14',
          timestamp: nowIso,
          quality: 'OPTIMAL',
          confidencePct: 99.5,
          derivationFormula: 'DewPoint = f(Temperature, RelativeHumidity)',
        },
      },
      ventilationAirspeed_mps: {
        value: 0.18,
        unit: 'm/s',
        minimumRecommended: 0.08,
        status: 'ADEQUATE_DISPERSION',
        provenance: {
          type: 'MEASURED',
          sensorCode: 'VENT-HOTWIRE-04',
          hardware: 'Omnidirectional Constant-Temperature Thermal Anemometer',
          samplingRate: '1 Hz Continuous',
          calibrationDate: '2026-10-01',
          timestamp: nowIso,
          quality: 'OPTIMAL',
          confidencePct: 98.7,
          note: 'Continuous cabin ventilation prevents hypoxic/hypercapnic microgravity pocketing in zero-g.',
        },
      },
      ambientNoise_dBA: {
        value: 52.4,
        unit: 'dBA',
        nasaStandardNC52_limit: 60,
        status: 'COMPLIANT',
        provenance: {
          type: 'MEASURED',
          sensorCode: 'ACOU-MIC-01',
          hardware: 'Type 1 Precision Sound Level Meter / Condenser Microphone',
          samplingRate: 'A-Weighted RMS Fast Continuous',
          calibrationDate: '2026-10-01',
          timestamp: nowIso,
          quality: 'OPTIMAL',
          confidencePct: 99.5,
        },
      },
      sleepCompartmentNoise_dBA: {
        value: 43.8,
        unit: 'dBA',
        nasaStandardNC40_limit: 48,
        status: 'OPTIMAL_QUIET',
        provenance: {
          type: 'MEASURED',
          sensorCode: 'ACOU-SLEEP-02',
          hardware: 'Crew Quarters Dedicated Acoustic Monitor',
          samplingRate: 'Continuous Nighttime Averaging',
          calibrationDate: '2026-10-01',
          timestamp: nowIso,
          quality: 'OPTIMAL',
          confidencePct: 99.4,
        },
      },
      octaveBands_dB: [
        { frequencyHz: 63, measured_dB: 58.2, nc52Limit_dB: 69.0 },
        { frequencyHz: 125, measured_dB: 54.1, nc52Limit_dB: 62.0 },
        { frequencyHz: 250, measured_dB: 49.8, nc52Limit_dB: 56.0 },
        { frequencyHz: 500, measured_dB: 46.5, nc52Limit_dB: 51.0 },
        { frequencyHz: 1000, measured_dB: 43.2, nc52Limit_dB: 48.0 },
        { frequencyHz: 2000, measured_dB: 38.6, nc52Limit_dB: 45.0 },
        { frequencyHz: 4000, measured_dB: 34.0, nc52Limit_dB: 43.0 },
        { frequencyHz: 8000, measured_dB: 29.5, nc52Limit_dB: 42.0 },
      ],
    },
    gravitational: {
      currentG: {
        value: 0.00,
        unit: 'g',
        regime: 'TRANSIT_MICROGRAVITY',
        provenance: {
          type: 'MEASURED',
          sensorCode: 'NAV-IMU-01',
          hardware: 'Honeywell Space-Grade Ring Laser Gyroscope & Accelerometer',
          samplingRate: '100 Hz Raw',
          calibrationDate: '2026-10-01',
          timestamp: nowIso,
          quality: 'OPTIMAL',
          confidencePct: 99.99,
        },
      },
      microVibration_ug: {
        axisX: 12.4,
        axisY: 8.6,
        axisZ: 22.1,
        vectorMagnitude_ug: 26.8,
        primarySource: 'Reaction Wheels & ECLSS Fluid Pumps',
        provenance: {
          type: 'MEASURED',
          sensorCode: 'STRUCT-ACC-03',
          hardware: 'High-Sensitivity Piezoelectric Triaxial Micro-Accelerometer',
          samplingRate: '500 Hz Waveform',
          calibrationDate: '2026-10-01',
          timestamp: nowIso,
          quality: 'OPTIMAL',
          confidencePct: 99.1,
        },
      },
      vestibularAdaptation: {
        status: 'COMPLETE',
        solarisIndex: 'Vestibular Sickness Index = 0 / 10 (Sol > 14 Adaptation Plateau)',
        otolithResetState: 'Microgravity otolith-ocular reflex calibrated',
      },
      fluidShiftVector: {
        status: 'STABILIZED_CEPHALIC_DISTRIBUTION',
        jugularPressureEst_mmHg: 14.2,
        intracranialTranslocationPct: 32,
        countermeasureActive: 'Lower Body Negative Pressure (LBNP) scheduled 17:00',
      },
    },
    earthLink: {
      distance: {
        millionKm: 258.4,
        astronomicalUnits_AU: 1.727,
        provenance: {
          type: 'DERIVED',
          sensorCode: 'NAV-EPHEM-01',
          hardware: 'Solaris Precision Ephemeris & Orbit Determination Kernel',
          samplingRate: 'Real-Time Keplerian State Vector Integration',
          calibrationDate: '2026-11-14',
          timestamp: nowIso,
          quality: 'OPTIMAL',
          confidencePct: 99.99,
          derivationFormula: 'r_Earth(t) - r_Craft(t) vector magnitude from JPL DE440 ephemeris',
        },
      },
      oneWayLightTime: {
        seconds: 862,
        formattedMinutes: '14m 22s',
        formula: 'OWLT = Distance / Speed of Light c (299,792.458 km/s)',
        provenance: {
          type: 'DERIVED',
          sensorCode: 'COMM-OWLT-ALG',
          hardware: 'Deep Space Relativistic Light-Time Calculator',
          samplingRate: 'Real-Time Continuous',
          calibrationDate: '2026-11-14',
          timestamp: nowIso,
          quality: 'OPTIMAL',
          confidencePct: 99.99,
          derivationFormula: 'OWLT = (258,400,000 km) / (299,792.458 km/s) = 861.93 seconds (~14 min 22 sec)',
        },
      },
      roundTripTime: {
        seconds: 1724,
        formattedMinutes: '28m 44s',
        formula: 'RTT = 2 × OWLT',
        provenance: {
          type: 'DERIVED',
          sensorCode: 'COMM-RTT-ALG',
          hardware: 'Deep Space Relativistic Light-Time Calculator',
          samplingRate: 'Real-Time Continuous',
          calibrationDate: '2026-11-14',
          timestamp: nowIso,
          quality: 'OPTIMAL',
          confidencePct: 99.99,
          derivationFormula: 'RTT = 2 × 861.93s = 1723.86 seconds (~28 min 44 sec)',
        },
      },
      linkState: {
        status: 'CONNECTED',
        groundStation: 'Deep Space Network - Goldstone DSS-14 (70m)',
        stationElevation_deg: 44.8,
        carrierBand: 'Ka-Band (32 GHz Uplink / 34 GHz Downlink)',
        opticalLaserTerminal: 'DSOC Near-Infrared Laser Transceiver Locked',
        provenance: {
          type: 'MEASURED',
          sensorCode: 'COMM-RF-01',
          hardware: 'Deep Space Ka-Band High-Gain Antenna (HGA 3.5m Dish)',
          samplingRate: '10 Hz Continuous Beacon Tracking',
          calibrationDate: '2026-11-14',
          timestamp: nowIso,
          quality: 'OPTIMAL',
          confidencePct: 99.9,
        },
      },
      bandwidthAndQuality: {
        downlinkRate_Mbps: 12.8,
        uplinkRate_Mbps: 2.4,
        signalMargin_dB: 6.4,
        bitErrorRate: '1.2e-9',
        packetLossPct: 0.04,
        antennaPointingOffset_deg: 0.002,
        provenance: {
          type: 'MEASURED',
          sensorCode: 'COMM-MODEM-02',
          hardware: 'CCSDS Telemetry Baseband Processor',
          samplingRate: '1 Hz Packet Statistics',
          calibrationDate: '2026-11-14',
          timestamp: nowIso,
          quality: 'OPTIMAL',
          confidencePct: 99.8,
        },
      },
    },
    traceContaminants: {
      carbonMonoxide_ppm: {
        value: 1.2,
        smac24h_limit: 10.0,
        status: 'NOMINAL',
        provenance: {
          type: 'MEASURED',
          sensorCode: 'ECLSS-GAS-CO',
          hardware: 'Gas Chromatography Mass Spectrometer (VCA-GCMS)',
          samplingRate: '15-Minute Cycle',
          calibrationDate: '2026-10-01',
          timestamp: nowIso,
          quality: 'OPTIMAL',
          confidencePct: 99.1,
        },
      },
      ammonia_ppm: {
        value: 0.4,
        smac24h_limit: 5.0,
        status: 'NOMINAL',
        provenance: {
          type: 'MEASURED',
          sensorCode: 'ECLSS-GAS-NH3',
          hardware: 'Tunable Diode Laser Absorption Spectrometer',
          samplingRate: 'Continuous Sweep',
          calibrationDate: '2026-10-01',
          timestamp: nowIso,
          quality: 'OPTIMAL',
          confidencePct: 99.3,
        },
      },
      vocTotal_mg_m3: {
        value: 0.18,
        limit: 1.0,
        status: 'NOMINAL',
        provenance: {
          type: 'MEASURED',
          sensorCode: 'ECLSS-GAS-VOC',
          hardware: 'Photoionization Detector (PID Array)',
          samplingRate: '1-Minute Sampling',
          calibrationDate: '2026-10-01',
          timestamp: nowIso,
          quality: 'OPTIMAL',
          confidencePct: 98.5,
        },
      },
      particulateHEPA_ug_m3: {
        value: 14.0,
        limit: 50.0,
        status: 'NOMINAL',
        provenance: {
          type: 'MEASURED',
          sensorCode: 'ECLSS-DUST-01',
          hardware: 'Laser Optical Particle Counter',
          samplingRate: '10-Second Continuous',
          calibrationDate: '2026-10-01',
          timestamp: nowIso,
          quality: 'OPTIMAL',
          confidencePct: 99.0,
        },
      },
    },
  };
}
