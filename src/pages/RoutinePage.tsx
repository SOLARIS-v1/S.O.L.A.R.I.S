import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SOLARIS_ROUTINE_TASKS, SOLARIS_METRICS, type RoutineTaskDef } from '../data/solarisCatalog';
import { MeasureWizard } from '../components/measure/MeasureWizard';
import { useSolaris } from '../context/SolarisContext';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  Flame,
  Award,
  Users,
  Calendar,
  Sparkles,
  ChevronRight,
  ListTodo
} from 'lucide-react';

export const RoutinePage: React.FC = () => {
  const navigate = useNavigate();
  const { activeCrew } = useSolaris();

  const [activeTaskMetric, setActiveTaskMetric] = useState<string | null>(null);

  // Sol 142 routine status
  const currentClock = '14:25 UTC';
  const streakDays = 14;

  const tasksWithState = SOLARIS_ROUTINE_TASKS.map((t, idx) => {
    // 0..4 are done, 5 is due now, others upcoming
    let state: 'done' | 'due' | 'upcoming' | 'overdue' = 'done';
    if (idx === 5) state = 'due';
    else if (idx > 5) state = 'upcoming';
    return { ...t, state };
  });

  const nextUp =
    tasksWithState.find((t) => t.state === 'due') ??
    tasksWithState.find((t) => t.state === 'upcoming');

  const doneCount = tasksWithState.filter((t) => t.state === 'done').length;
  const totalCount = tasksWithState.length;

  const crewMembers = [
    { name: 'Cmdr. Alex Vance', id: 'vance', done: 5, total: 6 },
    { name: 'Spec. Priya Patel', id: 'patel', done: 5, total: 6 },
    { name: 'Flt. Eng. Maya Chen', id: 'chen', done: 4, total: 6 },
    { name: 'Dr. Daniel Brooks', id: 'brooks', done: 5, total: 6 },
  ];

  const totalCrewDone = crewMembers.reduce((acc, c) => acc + c.done, 0);
  const totalCrewTarget = crewMembers.reduce((acc, c) => acc + c.total, 0);

  const handleStartTask = (task: RoutineTaskDef) => {
    const targetMetricId = task.metrics[0];
    if (targetMetricId === 'exercise') {
      navigate('/exercise');
    } else {
      setActiveTaskMetric(targetMetricId);
    }
  };

  const selectedMetricDef = activeTaskMetric
    ? SOLARIS_METRICS.find((m) => m.id === activeTaskMetric) || null
    : null;

  return (
    <div className="w-full min-h-full max-w-7xl mx-auto flex flex-col gap-6 p-3 lg:p-6 select-none font-sans text-slate-900">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono tracking-widest text-indigo-600 font-bold uppercase">
              SOLARIS HABITAT CHRONOLOGY
            </span>
            <span className="text-slate-300">/</span>
            <span className="text-[10px] font-mono text-slate-500 font-semibold">EXPEDITION SOL 142</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 font-mono">
            Daily Health & Countermeasure Routine
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            {doneCount} of {totalCount} checks logged, 0 overdue. Habitual microgravity telemetry maintains your baseline.
          </p>
        </div>

        {/* Streak & Clock Indicators */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-orange-50 border border-orange-200 shadow-sm">
            <Flame className="w-4 h-4 text-orange-600 fill-orange-500" />
            <span className="text-xs font-mono font-bold text-orange-800">
              {streakDays} DAY STREAK
            </span>
          </div>
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 shadow-sm">
            <Clock className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-mono font-bold text-slate-700">{currentClock}</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Timeline + Crew Goal Aside */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Next Up + Chronological Day Timeline */}
        <div className="lg:col-span-2 space-y-4">
          {/* Next Up Highlight Card */}
          {nextUp && (
            <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-50/90 via-white to-indigo-50/40 border border-indigo-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-mono tracking-widest text-indigo-600 font-bold uppercase block">
                  ACTION REQUIRED NOW · {nextUp.time}
                </span>
                <h3 className="text-base font-bold text-slate-900 font-mono">
                  {nextUp.title}
                </h3>
                <span className="text-xs font-mono text-slate-600 font-medium block">
                  Metrics: {nextUp.metrics.join(', ')} · +{nextUp.xp} XP Operational Compliance
                </span>
              </div>
              <button
                onClick={() => handleStartTask(nextUp)}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider text-white bg-gradient-to-r from-indigo-600 to-[#5850EC] hover:from-indigo-700 hover:to-indigo-800 shadow-md shadow-indigo-100 transition-all hover:scale-105 active:scale-95 shrink-0"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start Now</span>
              </button>
            </div>
          )}

          {/* Timeline List */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_4px_16px_rgba(0,0,0,0.04)] space-y-3">
            <span className="text-[11px] font-mono uppercase tracking-widest text-slate-500 font-bold block mb-3">
              Expedition Day 142 Chronological Sequence
            </span>

            <div className="space-y-2.5">
              {tasksWithState.map((task) => {
                const isDone = task.state === 'done';
                const isDue = task.state === 'due';
                return (
                  <div
                    key={task.id}
                    className={`p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                      isDue
                        ? 'bg-amber-50/80 border-amber-300 ring-1 ring-amber-200 shadow-sm'
                        : isDone
                        ? 'bg-slate-50/70 border-slate-200/80 text-slate-500'
                        : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-bold text-slate-500 w-12">
                        {task.time}
                      </span>
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-2.5 h-2.5 rounded-full ${
                            isDone
                              ? 'bg-emerald-500'
                              : isDue
                              ? 'bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                              : 'bg-slate-300'
                          }`}
                        />
                        <div>
                          <span className={`text-xs font-mono font-bold block ${isDone ? 'text-slate-600 line-through' : 'text-slate-900'}`}>
                            {task.title}
                          </span>
                          <span className="text-[11px] font-mono text-slate-500">
                            {task.metrics.join(', ')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          isDone
                            ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                            : isDue
                            ? 'text-amber-800 bg-amber-100 border border-amber-300'
                            : 'text-slate-500 bg-slate-100'
                        }`}
                      >
                        {isDone ? 'Completed' : isDue ? 'Due Now' : 'Upcoming'}
                      </span>
                      {!isDone && (
                        <button
                          onClick={() => handleStartTask(task)}
                          className="px-3 py-1 rounded-lg text-xs font-mono font-bold text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-600 border border-indigo-200 transition-all shadow-sm"
                        >
                          Start
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Crew Goal & Gamified Health Compliance */}
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_4px_16px_rgba(0,0,0,0.04)] space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-widest text-indigo-600 font-bold flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                Crew Mission Goal
              </span>
              <span className="text-xs font-mono text-slate-900 font-extrabold">
                {totalCrewDone} / {totalCrewTarget} Checks
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              5 more telemetry checks today unlocks the high-bandwidth orbital Earth observation relay for the habitat lounge.
            </p>

            {/* Progress Bar */}
            <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden border border-slate-200 shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500 rounded-full"
                style={{ width: `${(totalCrewDone / totalCrewTarget) * 100}%` }}
              />
            </div>

            {/* Per-Crew Member List */}
            <div className="space-y-2 pt-3 border-t border-slate-100">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold block">
                Crew Member Breakdown
              </span>
              {crewMembers.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between text-xs font-mono p-2 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <span className="text-slate-800 font-medium">{c.name}</span>
                  <span className="text-slate-500 font-bold">
                    {c.done} of {c.total}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* SOLARIS Autonomous Medical Schedule Advisory */}
          <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200/80 shadow-sm space-y-2">
            <span className="text-xs font-mono uppercase tracking-widest text-amber-800 font-bold flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-600" />
              Circadian Routine Optimizer
            </span>
            <p className="text-xs text-amber-900 leading-relaxed font-medium">
              Based on yesterday's sleep latency and evening heart rate deceleration, your evening check-in has been scheduled for 21:00 UTC to protect melatonin synthesis.
            </p>
          </div>
        </div>
      </div>

      {/* Measurement Wizard Modal when launched from routine */}
      {selectedMetricDef && (
        <MeasureWizard
          metric={selectedMetricDef}
          onClose={() => setActiveTaskMetric(null)}
        />
      )}
    </div>
  );
};

export default RoutinePage;
