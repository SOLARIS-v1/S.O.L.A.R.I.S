import { radioGroupKeys } from '../../data/a11y';
import { Link } from 'react-router-dom';
import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { cx } from '../../data/solarisFormat';
import type { MetricDef } from '../../data/solarisCatalog';
export interface Symptom {
  id: string;
  label: string;
  organ: string;
  red_flag: boolean;
}
import { Minus, Plus, Siren, AlertTriangle as TriangleAlert, ShieldAlert, Eye, Maximize2 } from 'lucide-react';
import { EyeScreeningModal, type EyeScreeningResult } from './EyeScreeningModal';
import s from './wizard.module.css';

export function TabList({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div role="tablist" aria-label={label} className={className}>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ number */
export function NumberInput({
  metric,
  value,
  onChange,
  onEnter,
  label,
  focusOnMount,
}: {
  metric: MetricDef;
  value: number | null;
  onChange: (v: number | null) => void;
  onEnter?: () => void;
  label?: string;
  focusOnMount?: boolean;
}) {
  const { min, max, step } = metric.input;
  const [text, setText] = useState(value === null ? '' : String(value));
  const [synced, setSynced] = useState(value);
  if (synced !== value) {
    // Value changed from outside (stepper or simulated sensor): show it, unless the user is typing it.
    setSynced(value);
    if (!(value !== null && Number.parseFloat(text) === value)) setText(value === null ? '' : String(value));
  }
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const hintId = `${id}-hint`;
  const name = label ?? metric.label;
  useEffect(() => {
    if (focusOnMount) inputRef.current?.focus();
  }, [focusOnMount]);
  const bump = (dir: 1 | -1) => {
    const fallback = Number.parseFloat(metric.input.placeholder.split('/')[label === 'Diastolic' ? 1 : 0]);
    const base = value ?? (Number.isFinite(fallback) ? fallback : min);
    const next = Math.min(max, Math.max(min, Number((base + dir * step).toFixed(3))));
    onChange(next);
  };
  const out = value !== null && (value < min || value > max);
  return (
    <div className={s.numberWrap}>
      {label ? (
        <label htmlFor={id} className="overline">
          {label}
        </label>
      ) : null}
      <div className={cx(s.number, out && s.invalid)}>
        <button type="button" className={s.step} onClick={() => bump(-1)} aria-label={`Decrease ${name}`}>
          <Minus size={20} />
        </button>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          enterKeyHint="done"
          className={s.numberInput}
          value={text}
          placeholder="—"
          ref={inputRef}
          aria-label={label ? undefined : `${metric.label} in ${metric.unit}`}
          aria-invalid={out}
          aria-describedby={out ? hintId : undefined}
          onChange={(e) => {
            const t = e.target.value.replace(',', '.');
            if (!/^-?\d*\.?\d*$/.test(t)) return;
            setText(t);
            const n = Number.parseFloat(t);
            onChange(Number.isFinite(n) ? n : null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onEnter?.();
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              bump(1);
            }
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              bump(-1);
            }
          }}
        />
        <span className={s.numberUnit}>{metric.unit}</span>
        <button type="button" className={s.step} onClick={() => bump(1)} aria-label={`Increase ${name}`}>
          <Plus size={20} />
        </button>
      </div>
      {out ? (
        <span id={hintId} className={s.hint} style={{ color: 'var(--act)' }}>
          Enter a value between {min} and {max} {metric.unit}
        </span>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ mood */
function MoodFace({ level, size = 54 }: { level: number; size?: number }) {
  const curve = (level - 3) * 5.5;
  const color = ['var(--act)', 'var(--watch)', 'var(--text-2)', 'var(--accent)', 'var(--ok)'][level - 1];
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <circle cx="24" cy="24" r="21" fill="none" stroke={color} strokeWidth="2.4" />
      <circle cx="17" cy="20" r="2.4" fill={color} />
      <circle cx="31" cy="20" r="2.4" fill={color} />
      {level === 1 ? (
        <>
          <path d="M13 15 L20 17" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <path d="M35 15 L28 17" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </>
      ) : null}
      <path d={`M15 ${32 - curve / 3} Q24 ${32 + curve} 33 ${32 - curve / 3}`} fill="none" stroke={color}
        strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

export function MoodPicker({ value, onChange, labels }: { value: number | null; onChange: (v: number) => void;
  labels: string[] }) {
  return (
    <div className={s.moods} role="radiogroup" aria-label="How do you feel right now?" onKeyDown={radioGroupKeys} tabIndex={-1}>
      {[1, 2, 3, 4, 5].map((lv) => (
        <button
          key={lv}
          type="button"
          role="radio"
          aria-checked={value === lv}
          tabIndex={lv === (value ?? 1) ? 0 : -1}
          className={cx(s.mood, value === lv && s.moodOn)}
          onClick={() => onChange(lv)}
        >
          <MoodFace level={lv} />
          <span>{labels[lv - 1]}</span>
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ reaction */
type Phase = 'idle' | 'wait' | 'go' | 'early' | 'done';
export function ReactionTest({ onDone }: { onDone: (avgMs: number | null) => void }) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [trials, setTrials] = useState<number[]>([]);
  const t0 = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  const hit = useCallback(() => {
    if (phase === 'done') return;
    if (phase === 'idle' || phase === 'early') {
      setPhase('wait');
      timer.current = setTimeout(() => {
        t0.current = performance.now();
        setPhase('go');
      }, 1200 + Math.random() * 2000);
    } else if (phase === 'wait') {
      if (timer.current) clearTimeout(timer.current);
      setPhase('early');
    } else if (phase === 'go') {
      const ms = Math.round(performance.now() - t0.current);
      const next = [...trials, ms];
      setTrials(next);
      if (next.length >= 3) {
        setPhase('done');
        onDone(Math.round(next.reduce((a, b) => a + b, 0) / next.length));
      } else setPhase('idle');
    }
  }, [phase, trials, onDone]);
  const text = {
    idle: trials.length ? `Tap to start trial ${trials.length + 1} of 3` : 'Tap to start',
    wait: 'Wait for green…',
    go: 'TAP!',
    early: 'Too soon! Tap to try again',
    done: `Average ${Math.round(trials.reduce((a, b) => a + b, 0) / Math.max(1, trials.length))} ms`,
  }[phase];
  return (
    <div>
      <button
        type="button"
        className={cx(s.pad, s[`pad_${phase}`])}
        onPointerDown={(e) => {
          e.preventDefault();
          hit();
        }}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            hit();
          }
        }}
        aria-live="assertive"
      >
        {text}
      </button>
      <div className={s.trials}>
        {[0, 1, 2].map((i) => (
          <span key={i} className={cx(trials[i] !== undefined && s.trialDone)}>
            Trial {i + 1} · <b className="num">{trials[i] !== undefined ? `${trials[i]} ms` : '–'}</b>
          </span>
        ))}
        {phase === 'done' ? (
          <button type="button" className="btn btn-text btn-sm" onClick={() => {
            setTrials([]);
            setPhase('idle');
            onDone(null);
          }}>
            Retake
          </button>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Amsler grid */
export function AmslerTest({
  labels,
  onChange,
  onEyesChange,
}: {
  labels: string[];
  onChange: (v: number | null) => void;
  onEyesChange?: (res: { left: number | null; right: number | null }) => void;
}) {
  const [eye, setEye] = useState<'left' | 'right'>('left');
  const [res, setRes] = useState<{ left: number | null; right: number | null }>({ left: null, right: null });
  const [showFullModal, setShowFullModal] = useState(false);

  const choose = (v: number) => {
    const next = { ...res, [eye]: v };
    setRes(next);
    onEyesChange?.(next);
    // Report overall status value
    if (next.left !== null && next.right !== null) {
      onChange(Math.max(next.left, next.right));
    } else {
      onChange(next[eye]);
    }
    if (eye === 'left' && next.right === null) {
      setTimeout(() => setEye('right'), 250);
    }
  };

  const handleModalSaved = (result: EyeScreeningResult) => {
    const leftScore = result.leftEye.severityScore;
    const rightScore = result.rightEye.severityScore;
    setRes({ left: leftScore, right: rightScore });
    onEyesChange?.({ left: leftScore, right: rightScore });
    onChange(Math.max(leftScore, rightScore));
    setShowFullModal(false);
  };

  const lines = Array.from({ length: 21 }, (_, i) => i * 10);

  return (
    <div className="space-y-4">
      {/* Clinical Safety Directive */}
      <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2.5 shadow-2xs">
        <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <span className="text-[11px] leading-relaxed">
          <strong className="font-bold">CLINICAL SAFETY:</strong> Functional visual field screening only. Amsler testing does <u>NOT</u> diagnose SANS or optic-disc edema (which requires OCT and dilated fundoscopy).
        </span>
      </div>

      <div className={s.amsler}>
        <div className={s.amslerGrid}>
          <svg viewBox="-2 -2 204 204" aria-label="Clinical Amsler grid with a centre red dot">
            <rect x="0" y="0" width="200" height="200" fill="var(--surface)" stroke="var(--text)" strokeWidth="1.5" />
            {lines.map((p) => (
              <g key={p}>
                <line x1={p} y1={0} x2={p} y2={200} stroke="var(--text)" strokeOpacity="0.55" strokeWidth="0.8" />
                <line x1={0} y1={p} x2={200} y2={p} stroke="var(--text)" strokeOpacity="0.55" strokeWidth="0.8" />
              </g>
            ))}
            <circle cx="100" cy="100" r="3.8" fill="#EF4444" />
          </svg>
        </div>

        <div className={s.amslerSide}>
          <TabList label="Which eye is open" className="seg">
            {(['left', 'right'] as const).map((e) => (
              <button
                key={e}
                type="button"
                className={cx(eye === e && 'on')}
                onClick={() => setEye(e)}
                role="tab"
                aria-selected={eye === e}
              >
                {e === 'left' ? 'Left eye (OS)' : 'Right eye (OD)'} {res[e] !== null ? '✓' : ''}
              </button>
            ))}
          </TabList>

          <p className="muted" style={{ fontSize: 13, margin: '6px 0' }}>
            Cover your <b>{eye === 'left' ? 'right' : 'left'} eye gently</b> (no pressure on globe). Fixate on the red dot from ~33 cm distance.
          </p>

          <div className={s.amslerOptions}>
            {labels.map((l, i) => (
              <button
                key={l}
                type="button"
                className={cx(s.option, res[eye] === i && s.optionOn, `st-${['ok', 'watch', 'act'][i]}`)}
                onClick={() => choose(i)}
              >
                <span className={s.optionDot} />
                {l}
              </button>
            ))}
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowFullModal(true)}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 text-indigo-700 text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-2xs"
            >
              <Maximize2 className="w-4 h-4" />
              <span>Launch 4-Step Clinical Protocol</span>
            </button>
          </div>
        </div>
      </div>

      {showFullModal && (
        <EyeScreeningModal
          isOpen={showFullModal}
          onClose={() => setShowFullModal(false)}
          onSaved={handleModalSaved}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ symptoms */
export function SymptomPicker({ symptoms, value, onChange }: { symptoms: Symptom[]; value: string[];
  onChange: (v: string[]) => void }) {
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  const common = symptoms.filter((x) => !x.red_flag);
  const red = symptoms.filter((x) => x.red_flag);
  const hasRed = value.some((v) => red.some((r) => r.id === v));
  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className={s.chips}>
        {common.map((sym) => (
          <button key={sym.id} type="button" className={cx(s.symChip, value.includes(sym.id) && s.symOn)}
            aria-pressed={value.includes(sym.id)} onClick={() => toggle(sym.id)}>
            {sym.label}
          </button>
        ))}
      </div>
      <div>
        <span className="overline" style={{ color: 'var(--act)' }}>Red-flag symptoms</span>
        <div className={s.chips} style={{ marginTop: 8 }}>
          {red.map((sym) => (
            <button key={sym.id} type="button" className={cx(s.symChip, s.symRed, value.includes(sym.id) && s.symRedOn)}
              aria-pressed={value.includes(sym.id)} onClick={() => toggle(sym.id)}>
              <TriangleAlert size={14} /> {sym.label}
            </button>
          ))}
        </div>
      </div>
      {hasRed ? (
        <div className={s.redAlert} role="alert">
          <Siren size={20} />
          <div>
            <b>This is a red-flag symptom.</b> Tell the Crew Medical Officer now. If it is severe or sudden, start the
            emergency protocol.
          </div>
          <Link to="/emergency" className="btn btn-danger btn-sm">
            Emergency
          </Link>
        </div>
      ) : null}
      <button type="button" className={cx('btn btn-ghost btn-sm', value.length === 0 && 'on')} style={{ alignSelf: 'flex-start' }}
        onClick={() => onChange([])}>
        {value.length === 0 ? '✓ No symptoms today' : 'Clear: no symptoms'}
      </button>
    </div>
  );
}
