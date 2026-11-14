import {
  HealthRecord,
  IndicatorType,
  BaselineStats,
  Finding,
  FindingLevel,
  BodyRegion,
} from '../api/types';
import { INDICATOR_THRESHOLDS } from '../data/thresholds';

/**
 * Calculates median of an array of numbers
 */
export function calculateMedian(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Calculates Median Absolute Deviation (MAD)
 */
export function calculateMAD(numbers: number[], median: number): number {
  if (numbers.length === 0) return 0;
  const deviations = numbers.map(x => Math.abs(x - median));
  return calculateMedian(deviations);
}

/**
 * Computes baseline statistics for an indicator from subject records.
 * Per spec: needs at least 5 valid readings to establish baseline.
 */
export function computeBaseline(records: HealthRecord[], indicator: IndicatorType): BaselineStats {
  const filtered = records
    .filter(r => r.type === indicator && r.quality === 'ok')
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  if (filtered.length < 5) {
    const fallback = INDICATOR_THRESHOLDS[indicator];
    return {
      indicator,
      count: filtered.length,
      median: filtered.length > 0 ? calculateMedian(filtered.map(r => r.value)) : fallback.default_baseline,
      mad: filtered.length > 0 ? Math.max(0.1, calculateMAD(filtered.map(r => r.value), calculateMedian(filtered.map(r => r.value)))) : fallback.default_mad,
      min: filtered.length > 0 ? Math.min(...filtered.map(r => r.value)) : fallback.default_baseline - fallback.default_mad * 2,
      max: filtered.length > 0 ? Math.max(...filtered.map(r => r.value)) : fallback.default_baseline + fallback.default_mad * 2,
      is_established: false,
    };
  }

  // Use the last 14 valid readings for active running baseline
  const recent14 = filtered.slice(-14);
  const values = recent14.map(r => r.value);
  const med = calculateMedian(values);
  const mad = Math.max(0.05, calculateMAD(values, med));

  return {
    indicator,
    count: filtered.length,
    median: Number(med.toFixed(1)),
    mad: Number(mad.toFixed(2)),
    min: Math.min(...values),
    max: Math.max(...values),
    is_established: true,
  };
}

/**
 * Calculates robust z-score: (x - median) / (1.4826 * MAD)
 */
export function computeRobustZScore(value: number, baseline: BaselineStats): number {
  const normalizer = 1.4826 * baseline.mad;
  if (normalizer <= 0.001) return 0;
  return Number(((value - baseline.median) / normalizer).toFixed(2));
}

/**
 * Evaluates records for a subject and produces explainable findings
 */
export function evaluateSubjectRecords(
  subjectId: string,
  allRecords: HealthRecord[]
): Finding[] {
  const records = allRecords.filter(r => r.subject_id === subjectId);
  if (records.length === 0) return [];

  const findings: Finding[] = [];
  const latestByIndicator: Partial<Record<IndicatorType, HealthRecord>> = {};
  const historyByIndicator: Partial<Record<IndicatorType, HealthRecord[]>> = {};

  // Group records by indicator
  for (const r of records) {
    if (!historyByIndicator[r.type]) {
      historyByIndicator[r.type] = [];
    }
    historyByIndicator[r.type]!.push(r);
  }

  // Find latest for each
  for (const [key, list] of Object.entries(historyByIndicator)) {
    const indicator = key as IndicatorType;
    const sorted = [...list].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    latestByIndicator[indicator] = sorted[0];
  }

  // Check Named Combination 1: Fever with raised heart rate
  const latestTemp = latestByIndicator['temperature'];
  const latestHR = latestByIndicator['heart_rate'];
  if (latestTemp && latestHR) {
    const tempBase = computeBaseline(records, 'temperature');
    const hrBase = computeBaseline(records, 'heart_rate');
    const tempZ = computeRobustZScore(latestTemp.value, tempBase);
    const hrZ = computeRobustZScore(latestHR.value, hrBase);

    if (latestTemp.value >= 37.6 && (latestHR.value > 85 || hrZ >= 2.0)) {
      const isUrgent = latestTemp.value >= 38.3 || hrZ >= 3.5;
      findings.push({
        id: `finding-${subjectId}-fever-hr-${latestTemp.id}`,
        subject_id: subjectId,
        level: isUrgent ? 'urgent' : 'review',
        indicators: ['temperature', 'heart_rate'],
        summary: 'Febrile hyperdynamic response detected.',
        detail: `Core temperature is ${latestTemp.value}°C (+${(latestTemp.value - tempBase.median).toFixed(1)}°C over baseline) paired with heart rate at ${latestHR.value} bpm (${hrZ > 0 ? '+' : ''}${hrZ} robust deviations).`,
        timestamp: latestTemp.timestamp,
        observed_value: `${latestTemp.value}°C / ${latestHR.value} bpm`,
        baseline_value: `${tempBase.median}°C / ${hrBase.median} bpm`,
        rule_triggered: 'Named Combination: Fever with tachycardia',
        body_region: 'heart',
        hazard_id: 'radiation',
        status: 'new',
      });
    }
  }

  // Check Named Combination 2: Poor sleep + high fatigue + low mood
  const latestSleep = latestByIndicator['sleep'];
  const latestFatigue = latestByIndicator['fatigue'];
  const latestMood = latestByIndicator['mood'];
  if (latestSleep && latestFatigue) {
    const sleepBase = computeBaseline(records, 'sleep');
    const fatigueBase = computeBaseline(records, 'fatigue');
    const sleepDiff = latestSleep.value - sleepBase.median;
    const fatigueDiff = latestFatigue.value - fatigueBase.median;

    if (latestSleep.value < 6.2 && latestFatigue.value >= 3.5) {
      findings.push({
        id: `finding-${subjectId}-sleep-fatigue-${latestSleep.id}`,
        subject_id: subjectId,
        level: latestFatigue.value >= 4.0 || latestSleep.value < 5.0 ? 'review' : 'watch',
        indicators: ['sleep', 'fatigue', 'mood'],
        summary: 'Cumulative sleep deficit & fatigue cluster.',
        detail: `Sleep duration recorded at ${latestSleep.value} h (${Math.abs(sleepDiff).toFixed(1)} h below 14-day baseline) with perceived fatigue at ${latestFatigue.value}/5 (+${fatigueDiff.toFixed(1)} over baseline).`,
        timestamp: latestSleep.timestamp,
        observed_value: `${latestSleep.value} h sleep / ${latestFatigue.value} fatigue`,
        baseline_value: `${sleepBase.median} h / ${fatigueBase.median} fatigue`,
        rule_triggered: 'Named Combination: Sleep-Fatigue Syndrome',
        body_region: 'head',
        hazard_id: 'isolation',
        status: 'new',
      });
    }
  }

  // Check individual indicators
  const indicatorsToCheck: IndicatorType[] = [
    'heart_rate',
    'blood_pressure_sys',
    'temperature',
    'glucose',
    'spo2',
    'sleep',
    'fatigue',
  ];

  for (const ind of indicatorsToCheck) {
    const latest = latestByIndicator[ind];
    if (!latest) continue;

    const base = computeBaseline(records, ind);
    const z = computeRobustZScore(latest.value, base);
    const threshold = INDICATOR_THRESHOLDS[ind];

    // Check red-flag absolutes
    let redFlag = false;
    if (threshold.urgent_low !== undefined && latest.value <= threshold.urgent_low) redFlag = true;
    if (threshold.urgent_high !== undefined && latest.value >= threshold.urgent_high) redFlag = true;

    if (redFlag) {
      findings.push({
        id: `finding-${subjectId}-${ind}-urgent-${latest.id}`,
        subject_id: subjectId,
        level: 'urgent',
        indicators: [ind],
        summary: `Critical ${threshold.label.toLowerCase()} limit reached.`,
        detail: `${threshold.label} measured at ${latest.value} ${threshold.unit}, exceeding strict NASA exploration threshold. Urgent medical review recommended.`,
        timestamp: latest.timestamp,
        observed_value: `${latest.value} ${threshold.unit}`,
        baseline_value: `${base.median} ${threshold.unit}`,
        rule_triggered: 'Red-Flag Absolute Boundary',
        body_region: threshold.body_region,
        hazard_id: threshold.hazard_id,
        status: 'new',
      });
      continue;
    }

    // Check persistence rule: same-direction deviation on 3 consecutive readings
    const history = (historyByIndicator[ind] || []).slice(-3);
    const persistent =
      history.length >= 3 &&
      history.every(h => {
        const itemZ = computeRobustZScore(h.value, base);
        return Math.abs(itemZ) >= 1.8 && Math.sign(itemZ) === Math.sign(z);
      });

    if (Math.abs(z) >= 2.0 || persistent) {
      // Don't duplicate if already covered by named combination
      const alreadyCovered = findings.some(f => f.indicators.includes(ind));
      if (!alreadyCovered) {
        let level: FindingLevel = 'watch';
        if (Math.abs(z) >= 3.0 || (persistent && Math.abs(z) >= 2.2)) {
          level = 'review';
        }

        const dir = z > 0 ? 'above' : 'below';
        findings.push({
          id: `finding-${subjectId}-${ind}-${latest.id}`,
          subject_id: subjectId,
          level,
          indicators: [ind],
          summary: `${threshold.label} ${dir} personal baseline.`,
          detail: `${threshold.label} has been ${Math.abs(z).toFixed(1)} robust deviations ${dir} personal baseline (${base.median} ${threshold.unit}) across ${persistent ? '3 consecutive readings' : 'recent observation'}.`,
          timestamp: latest.timestamp,
          observed_value: `${latest.value} ${threshold.unit}`,
          baseline_value: `${base.median} ${threshold.unit}`,
          rule_triggered: persistent ? 'Persistence: 3-point same-direction shift' : 'Robust Z-score deviation',
          body_region: threshold.body_region,
          hazard_id: threshold.hazard_id,
          status: 'new',
        });
      }
    }
  }

  return findings;
}

/**
 * Next step message mapping per spec Section 6
 */
export function getEscalationAction(level: FindingLevel): { text: string; icon: string } {
  switch (level) {
    case 'normal':
      return { text: 'Continue routine', icon: 'CheckCircle' };
    case 'watch':
      return { text: 'Recheck at next scheduled window and read guidance', icon: 'Clock' };
    case 'review':
      return { text: 'Add to report and inform medical officer at next window', icon: 'FileText' };
    case 'urgent':
      return { text: 'Contact medical officer now and transmit report immediately', icon: 'AlertOctagon' };
  }
}
