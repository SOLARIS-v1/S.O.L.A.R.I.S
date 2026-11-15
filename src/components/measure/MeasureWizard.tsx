import React, { useState, useMemo } from 'react';
import type { MetricDef } from '../../data/solarisCatalog';
import { SOLARIS_SYMPTOMS } from '../../data/solarisCatalog';
import { STATUS_LABEL, type Status, fmtMetric } from '../../data/solarisFormat';
import { useSolaris } from '../../context/SolarisContext';
import { useAstraStore } from '../../api/mockClient';
import { RangeBar } from '../charts/RangeBar';
import { NumberInput, MoodPicker, ReactionTest, AmslerTest, SymptomPicker } from './inputs';
import {
  X,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertTriangle,
  Siren,
  Sparkles,
  Activity,
  Heart,
  Eye,
  Zap,
  Clock,
  ShieldCheck,
  Stethoscope
} from 'lucide-react';

interface MeasureWizardProps {
  metric: MetricDef;
  onClose: () => void;
  onSaved?: (result: { value: number | null; value2?: number | null; items?: string[] }) => void;
}

const STEPS = ['Prepare', 'Why it matters', 'Measure', 'Result'] as const;

export const MeasureWizard: React.FC<MeasureWizardProps> = ({ metric, onClose, onSaved }) => {
  const { activeCrew, speakText } = useSolaris();
  const { addTimelineEvent } = useAstraStore();

  const [step, setStep] = useState<number>(0);
  const [value, setValue] = useState<number | null>(null);
  const [value2, setValue2] = useState<number | null>(null);
  const [items, setItems] = useState<string[]>([]);
  const [measureContext, setMeasureContext] = useState<string>('resting');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const kind = metric.input.kind;
  const { min, max } = metric.input;

  // Validation
  const isValid = useMemo(() => {
    if (kind === 'symptoms') return true;
    if (kind === 'reaction' || kind === 'vision') return value !== null;
    if (kind === 'mood') return value !== null;
    if (kind === 'bp') {
      return (
        value !== null &&
        value2 !== null &&
        value >= min &&
        value <= max &&
        value2 >= 30 &&
        value2 < value
      );
    }
    return value !== null && value >= min && value <= max;
  }, [kind, value, value2, min, max]);

  // Clinical evaluation
  const evaluation = useMemo((): { status: Status; verdict: string; advice: string } => {
    if (kind === 'symptoms') {
      const redFlags = items.filter((id) =>
        SOLARIS_SYMPTOMS.some((s) => s.id === id && s.red_flag)
      );
      if (redFlags.length > 0) {
        return {
          status: 'act',
          verdict: 'RED-FLAG SYMPTOMS PRESENT',
          advice: 'Immediate flight surgeon consultation required. Review contingency medical checklist.',
        };
      }
      if (items.length > 0) {
        return {
          status: 'watch',
          verdict: 'SYMPTOM CLUSTER DETECTED',
          advice: 'Non-critical discomfort recorded. Hydration and rest countermeasure recommended.',
        };
      }
      return {
        status: 'ok',
        verdict: 'ASYMPTOMATIC NOMINAL',
        advice: 'No acute physiological or neurovestibular discomfort reported.',
      };
    }

    if (kind === 'vision') {
      const v = value ?? 0;
      if (v >= 2) {
        return {
          status: 'act',
          verdict: 'SANS DISTORTION DETECTED',
          advice: 'Significant visual metamorphosis on Amsler grid. Possible optic disc edema / choroidal folds.',
        };
      }
      if (v === 1) {
        return {
          status: 'watch',
          verdict: 'MILD VISUAL DISTORTION',
          advice: 'Slight line distortion observed. Re-screen in 48 hours and monitor cephalic fluid shift.',
        };
      }
      return {
        status: 'ok',
        verdict: 'VISION NOMINAL',
        advice: 'Grid lines straight and parallel. Central macular and optic disc function nominal.',
      };
    }

    if (kind === 'reaction') {
      const avg = value ?? 240;
      if (avg > 360) {
        return {
          status: 'act',
          verdict: 'PSYCHOMOTOR SLOWING',
          advice: 'Reaction time slowed beyond threshold. Significant fatigue or cognitive overload.',
        };
      }
      if (avg > 280) {
        return {
          status: 'watch',
          verdict: 'MILD COGNITIVE FATIGUE',
          advice: 'Psychomotor vigilance slightly depressed. Ensure 8-hour sleep opportunity tonight.',
        };
      }
      return {
        status: 'ok',
        verdict: 'OPTIMAL PSYCHOMOTOR ALERTNESS',
        advice: 'Neuromuscular response and vigilance index are sharp and nominal.',
      };
    }

    if (value === null) {
      return { status: 'ok', verdict: 'NO READING', advice: 'Awaiting sensor input.' };
    }

    // Default numeric check against metric.normal_range
    const [normMin, normMax] = metric.normal_range;
    if (value < normMin || value > normMax) {
      const severe =
        value < normMin * 0.85 || value > normMax * 1.15;
      return {
        status: severe ? 'act' : 'watch',
        verdict: severe ? 'OUT OF NOMINAL BOUNDS (ELEVATED)' : 'SLIGHT DEVIATION FROM BASELINE',
        advice: `Reading ${value} ${metric.unit} exceeds normal baseline [${normMin} - ${normMax}]. Monitor closely.`,
      };
    }

    return {
      status: 'ok',
      verdict: 'NOMINAL PHYSIOLOGICAL STATE',
      advice: `Reading ${value} ${metric.unit} is balanced and well within spaceflight reference boundaries.`,
    };
  }, [kind, value, items, metric]);

  // Simulate authentic sensor input
  const handleSimulate = () => {
    const mid = metric.id;
    if (mid === 'hr') setValue(74 + Math.floor(Math.random() * 8));
    else if (mid === 'bp' || kind === 'bp') {
      setValue(118 + Math.floor(Math.random() * 6));
      setValue2(76 + Math.floor(Math.random() * 4));
    } else if (mid === 'spo2') setValue(98.4);
    else if (mid === 'resp') setValue(14.5);
    else if (mid === 'temp') setValue(36.8);
    else if (mid === 'glucose') setValue(92);
    else if (mid === 'hydration') setValue(2.8);
    else if (mid === 'mass') setValue(77.2);
    else if (mid === 'sleep') setValue(7.4);
    else if (mid === 'mood' || kind === 'mood') setValue(4);
    else if (mid === 'reaction' || kind === 'reaction') setValue(218);
    else if (mid === 'vision' || kind === 'vision') setValue(0);
    else if (mid === 'exercise') setValue(60);
    else if (mid === 'nutrition') setValue(95);
    else if (mid === 'symptoms' || kind === 'symptoms') setItems([]);
    else setValue(metric.normal_range[0] + (metric.normal_range[1] - metric.normal_range[0]) * 0.5);
  };

  // Commit reading
  const handleSaveReading = async () => {
    setIsSaving(true);
    const readingValue = value;
    const readingValue2 = value2;

    // Add to timeline
    addTimelineEvent({
      subject_id: activeCrew?.name.toLowerCase() || 'vance',
      timestamp: new Date().toISOString(),
      category: 'measurement',
      severity: evaluation.status === 'ok' ? 'normal' : evaluation.status === 'watch' ? 'watch' : 'review',
      title: `${metric.label}: ${fmtMetric(metric, readingValue, readingValue2)} ${metric.unit}`.trim(),
      summary: evaluation.advice,
      source: 'SOLARIS Diagnostics Centre',
      is_simulated: true,
    });

    // Notify backend if online
    try {
      await fetch('http://localhost:8000/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          crew_name: activeCrew?.name || 'Vance',
          vitals: {
            heartRate: metric.id === 'hr' ? readingValue : undefined,
            bloodPressure:
              metric.id === 'bp' && readingValue && readingValue2
                ? `${readingValue}/${readingValue2}`
                : undefined,
            spo2: metric.id === 'spo2' ? readingValue : undefined,
            coreTemp: metric.id === 'temp' ? readingValue : undefined,
          },
          symptoms: items,
          notes: `${metric.label} measurement logged via SOLARIS Measurement Wizard.`,
        }),
      });
    } catch {
      // Offline fallback: handled locally
    }

    // Voice announcement
    if (typeof speakText === 'function') {
      speakText(
        `Measurement recorded for ${metric.label}. Value is ${fmtMetric(metric, readingValue, readingValue2)} ${metric.unit}. Status is ${STATUS_LABEL[evaluation.status]}.`
      );
    }

    setIsSaving(false);
    setSavedSuccess(true);
    setStep(3); // Go to Result step
    onSaved?.({ value: readingValue, value2: readingValue2, items });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/40 backdrop-blur-sm animate-fade-in font-sans">
      <div className="w-full max-w-2xl bg-white border border-slate-200/90 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-900 animate-scale-up">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-indigo-50 border border-indigo-200/80 flex items-center justify-center text-indigo-600 shadow-2xs font-bold">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono tracking-wider font-bold text-indigo-600 uppercase block">
                {metric.category} · PROTOCOL
              </span>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                {metric.label}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4-Step Progress Navigation */}
        <div className="grid grid-cols-4 border-b border-slate-200 bg-slate-50">
          {STEPS.map((sLabel, idx) => {
            const isActive = step === idx;
            const isCompleted = step > idx;
            return (
              <button
                key={sLabel}
                onClick={() => setStep(idx)}
                disabled={idx === 3 && !savedSuccess}
                className={`py-3 px-3 text-center text-xs font-mono transition-all border-b-2 flex items-center justify-center gap-1.5 ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600 bg-white font-bold shadow-2xs'
                    : isCompleted
                    ? 'border-transparent text-emerald-600 font-semibold hover:text-emerald-700'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                } ${idx === 3 && !savedSuccess ? 'cursor-not-allowed opacity-40' : ''}`}
              >
                <span>0{idx + 1}.</span>
                <span>{sLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Step Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* STEP 0: PREPARE */}
          {step === 0 && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <span className="text-[10.5px] font-mono uppercase tracking-wider font-bold text-slate-500 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  Equipment Required
                </span>
                <p className="text-xs font-mono text-slate-800 pl-6 font-medium">
                  {metric.prepare.equipment}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <span className="text-[10.5px] font-mono uppercase tracking-wider font-bold text-slate-500 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  Physiological Conditions & Time
                </span>
                <p className="text-xs font-mono text-slate-800 pl-6 font-medium">
                  {metric.prepare.conditions} (Expected duration: {metric.prepare.duration})
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <span className="text-[10.5px] font-mono uppercase tracking-wider font-bold text-slate-500 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  Protocol Instructions
                </span>
                <p className="text-xs text-slate-700 leading-relaxed pl-6 font-medium">
                  {metric.prepare.instructions}
                </p>
              </div>
            </div>
          )}

          {/* STEP 1: WHY IT MATTERS */}
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <span className="text-[10.5px] font-mono uppercase tracking-wider font-bold text-indigo-600">
                  Biomedical Purpose
                </span>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  {metric.why_matters.purpose}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <span className="text-[10.5px] font-mono uppercase tracking-wider font-bold text-amber-600">
                  Microgravity & Deep Spaceflight Impact
                </span>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  {metric.why_matters.space_impact}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <span className="text-[10.5px] font-mono uppercase tracking-wider font-bold text-slate-500">
                  Clinical & Aerospace References
                </span>
                <ul className="text-xs font-mono text-slate-600 space-y-1 list-disc list-inside">
                  {metric.why_matters.sources.map((src, i) => (
                    <li key={i}>{src}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* STEP 2: MEASURE */}
          {step === 2 && (
            <div className="space-y-5 animate-fade-in">
              {/* Context Picker if sensitive */}
              {metric.context_sensitive && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs">
                  <span className="text-[10.5px] text-slate-500 uppercase tracking-wider font-bold">
                    Context:
                  </span>
                  {(['resting', 'post_exercise', 'post_eva'] as const).map((ctx) => (
                    <button
                      key={ctx}
                      onClick={() => setMeasureContext(ctx)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                        measureContext === ctx
                          ? 'bg-indigo-600 text-white font-bold shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {ctx.replace('_', ' ').toUpperCase()}
                    </button>
                  ))}
                </div>
              )}

              {/* Input Component based on kind */}
              <div className="p-6 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex flex-col items-center justify-center min-h-[170px] shadow-inner">
                {kind === 'number' && (
                  <NumberInput
                    metric={metric}
                    value={value}
                    onChange={(v) => setValue(v)}
                    focusOnMount
                  />
                )}

                {kind === 'bp' && (
                  <div className="flex flex-col sm:flex-row gap-4 items-center justify-center w-full">
                    <NumberInput
                      metric={metric}
                      label="Systolic"
                      value={value}
                      onChange={(v) => setValue(v)}
                      focusOnMount
                    />
                    <span className="text-2xl font-mono text-slate-400 font-light">/</span>
                    <NumberInput
                      metric={{ ...metric, input: { ...metric.input, min: 30, max: 130 } }}
                      label="Diastolic"
                      value={value2}
                      onChange={(v) => setValue2(v)}
                    />
                  </div>
                )}

                {kind === 'mood' && (
                  <MoodPicker
                    value={value}
                    onChange={(v) => setValue(v)}
                    labels={metric.input.labels || ['Very low', 'Low', 'Nominal', 'Good', 'Excellent']}
                  />
                )}

                {kind === 'reaction' && (
                  <ReactionTest onDone={(avgMs) => setValue(avgMs)} />
                )}

                {kind === 'vision' && (
                  <AmslerTest
                    labels={metric.input.labels || ['Straight and clear', 'Slightly wavy', 'Severely distorted']}
                    onChange={(v) => setValue(v)}
                  />
                )}

                {kind === 'symptoms' && (
                  <SymptomPicker
                    symptoms={SOLARIS_SYMPTOMS}
                    value={items}
                    onChange={(arr) => setItems(arr)}
                  />
                )}
              </div>

              {/* Simulation Shortcut */}
              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={handleSimulate}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 font-semibold transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Simulate Sensor Reading</span>
                </button>

                <span className="text-xs font-mono text-slate-500 font-semibold">
                  {isValid ? 'Ready to evaluate' : 'Input required'}
                </span>
              </div>
            </div>
          )}

          {/* STEP 3: RESULT */}
          {step === 3 && (
            <div className="space-y-4 animate-fade-in font-mono">
              {/* Verdict Banner */}
              <div
                className={`p-5 rounded-2xl border flex items-center justify-between shadow-sm ${
                  evaluation.status === 'ok'
                    ? 'border-emerald-200 bg-emerald-50/80'
                    : evaluation.status === 'watch'
                    ? 'border-amber-200 bg-amber-50/80'
                    : 'border-rose-200 bg-rose-50/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3.5 h-3.5 rounded-full ${
                      evaluation.status === 'ok'
                        ? 'bg-emerald-500'
                        : evaluation.status === 'watch'
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                  />
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                      CLINICAL STATUS · {STATUS_LABEL[evaluation.status]}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">
                      {evaluation.verdict}
                    </h3>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-2xl font-bold text-slate-900">
                    {fmtMetric(metric, value, value2)}
                  </span>
                  <span className="text-xs text-slate-500 ml-1">
                    {metric.unit}
                  </span>
                </div>
              </div>

              {/* RangeBar if numeric */}
              {value !== null && kind !== 'symptoms' && kind !== 'vision' && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <RangeBar
                    value={value}
                    ok={metric.normal_range}
                    watch={metric.watch_range}
                    status={evaluation.status}
                    unit={metric.unit}
                  />
                </div>
              )}

              {/* Physiological Advice */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5 font-sans">
                <span className="text-[10.5px] font-mono uppercase tracking-wider font-bold text-indigo-600 flex items-center gap-1.5">
                  <Stethoscope className="w-4 h-4 text-indigo-600" />
                  SOLARIS Medical Recommendation
                </span>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  {evaluation.advice}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200/80 bg-slate-50/60 font-mono">
          {step > 0 && step < 3 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="flex items-center gap-1 px-4 py-2 rounded-xl text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition-colors font-semibold border border-slate-200 bg-white"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {step < 2 && (
            <button
              onClick={() => setStep(step + 1)}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs text-white bg-indigo-600 hover:bg-indigo-700 transition-colors font-semibold shadow-sm ml-auto"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {step === 2 && (
            <button
              onClick={handleSaveReading}
              disabled={!isValid || isSaving}
              className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold transition-all shadow-sm ${
                isValid && !isSaving
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSaving ? 'Logging...' : 'Save & Evaluate'}</span>
            </button>
          )}

          {step === 3 && (
            <button
              onClick={onClose}
              className="flex items-center gap-1 px-5 py-2 rounded-xl text-xs text-white bg-slate-900 hover:bg-slate-800 transition-colors font-semibold shadow-sm ml-auto"
            >
              <span>Done / Return</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MeasureWizard;
