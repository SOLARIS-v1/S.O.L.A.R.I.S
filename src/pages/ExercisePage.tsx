import React, { useState } from 'react';
import { SOLARIS_EXERCISES } from '../data/solarisCatalog';
import { AstroFigure } from '../components/exercise/AstroFigure';
import { VideoButton, type ExerciseVideo } from '../components/exercise/VideoButton';
import { useAstra } from '../context/AstraContext';
import { useAstraStore } from '../api/mockClient';
import {
  Flame,
  Dumbbell,
  Zap,
  Bike,
  Moon,
  Clock,
  CheckCircle2,
  Play,
  RotateCcw,
  Sparkles,
  Info,
  ChevronRight,
  Plus
} from 'lucide-react';

const EXERCISE_VIDEOS: Record<string, ExerciseVideo> = {
  squat: {
    title: 'ARED Squats on the International Space Station',
    source: 'NASA Johnson Space Center',
    date: '2023-04-12',
    file: 'iss033e012345.mp4',
    credit: 'NASA / Expedition 33',
    start: 12,
    end: 42,
    shows: 'ARED Barbell Squat',
    who: 'Sunita Williams',
    where: 'Node 3 (Tranquility), ISS',
    note: 'Observe the vacuum cylinder resistance system. Barbell maintains constant load without gravitational momentum.',
    channel: 'NASA Video',
    published: '2023-04-12',
  },
  deadlift: {
    title: 'ARED Deadlifts in Microgravity',
    source: 'NASA Johnson Space Center',
    date: '2022-09-18',
    file: 'iss041e054321.mp4',
    credit: 'NASA / Expedition 41',
    start: 8,
    end: 38,
    shows: 'ARED Conventional Deadlift',
    who: 'Reid Wiseman',
    where: 'Node 3 (Tranquility), ISS',
    note: 'Notice the flat lumbar spine throughout the hip hinge. Vacuum canisters provide dual flywheel inertial damping.',
    channel: 'NASA Johnson',
    published: '2022-09-18',
  },
  heel_raise: {
    title: 'ARED Plantarflexion Heel Raises',
    source: 'NASA Johnson Space Center',
    date: '2023-01-15',
    file: 'iss038e099881.mp4',
    credit: 'NASA / Human Research Program',
    start: 5,
    end: 30,
    shows: 'ARED Standing Calf Raise',
    who: 'Thomas Pesquet',
    where: 'Node 3 (Tranquility), ISS',
    note: 'Controlled tempo: 2 seconds concentric drive, 2 seconds eccentric lowering to prevent Achilles tendon strain.',
    channel: 'ESA / NASA',
    published: '2023-01-15',
  },
  press: {
    title: 'ARED Horizontal Bench Press',
    source: 'NASA Johnson Space Center',
    date: '2021-11-20',
    file: 'iss030e044112.mp4',
    credit: 'NASA / Expedition 30',
    start: 10,
    end: 35,
    shows: 'ARED Bench Press',
    who: 'Dan Burbank',
    where: 'Node 3 (Tranquility), ISS',
    note: 'Padded bench isolates scapulae while shoulder straps hold astronaut in contact without gravity.',
    channel: 'NASA Video',
    published: '2021-11-20',
  },
  row: {
    title: 'ARED Seated Cable Row',
    source: 'NASA Johnson Space Center',
    date: '2022-06-14',
    file: 'iss036e088771.mp4',
    credit: 'NASA / Expedition 36',
    start: 14,
    end: 44,
    shows: 'ARED Seated Cable Row',
    who: 'Karen Nyberg',
    where: 'Node 3 (Tranquility), ISS',
    note: 'Chest tall, elbows driving back past the ribs. Preserves rhomboid and mid-trapezius posture stability.',
    channel: 'NASA Johnson',
    published: '2022-06-14',
  },
  run: {
    title: 'T2 Combined Operational Load Bearing Treadmill',
    source: 'NASA Johnson Space Center',
    date: '2022-03-10',
    file: 'iss032e011223.mp4',
    credit: 'NASA / Expedition 32',
    start: 20,
    end: 55,
    shows: 'T2 Treadmill Interval Run',
    who: 'Sunita Williams',
    where: 'Node 3 (Tranquility), ISS',
    note: 'Bungee harness pulls astronaut into treadmill belt simulating 70–80% Earth body weight for bone impact loading.',
    channel: 'NASA Video',
    published: '2022-03-10',
  },
  cycle: {
    title: 'CEVIS Cycle Ergometer with Vibration Isolation',
    source: 'NASA Johnson Space Center',
    date: '2023-05-22',
    file: 'iss040e066554.mp4',
    credit: 'NASA / Expedition 40',
    start: 15,
    end: 45,
    shows: 'CEVIS Ergometer Intervals',
    who: 'Alexander Gerst',
    where: 'US Laboratory (Destiny), ISS',
    note: 'Cardiovascular conditioning with zero structural vibration transfer to delicate microgravity research payloads.',
    channel: 'NASA Johnson',
    published: '2023-05-22',
  },
};

export const ExercisePage: React.FC = () => {
  const { activeCrew, speakText } = useAstra();
  const { addTimelineEvent } = useAstraStore();

  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('deadlift');
  const [isLoggingModalOpen, setIsLoggingModalOpen] = useState(false);

  // Workout logging form state
  const [logDuration, setLogDuration] = useState(60);
  const [logSets, setLogSets] = useState(4);
  const [logReps, setLogReps] = useState(8);
  const [logPeakHR, setLogPeakHR] = useState(148);
  const [logFatiguePre, setLogFatiguePre] = useState(3);
  const [logFatiguePost, setLogFatiguePost] = useState(6);
  const [logNotes, setLogNotes] = useState('Nominal eccentric tempo. No lumbar pain during hip hinge.');

  const currentExercise =
    SOLARIS_EXERCISES.find((e) => e.id === selectedExerciseId) ||
    SOLARIS_EXERCISES[0];

  const currentVideo = EXERCISE_VIDEOS[currentExercise.anim] || EXERCISE_VIDEOS.deadlift;

  // Week at a glance (NASA SPRINT protocol: 3 strength · 3 cardio · 1 rest)
  const [weekDays, setWeekDays] = useState([
    { day: 136, weekday: 'Mon', kind: 'resistance', title: 'Heavy ARED lower body', planned: 60, done: 65, past: true },
    { day: 137, weekday: 'Tue', kind: 'intervals', title: 'T2 Treadmill 4x4 intervals', planned: 35, done: 35, past: true },
    { day: 138, weekday: 'Wed', kind: 'resistance', title: 'ARED upper body & core', planned: 60, done: 60, past: true },
    { day: 139, weekday: 'Thu', kind: 'continuous', title: 'CEVIS steady aerobic', planned: 45, done: 50, past: true },
    { day: 140, weekday: 'Fri', kind: 'resistance', title: 'ARED posterior chain', planned: 60, done: 60, past: true },
    { day: 141, weekday: 'Sat', kind: 'rest', title: 'Active recovery & stretching', planned: 0, done: 0, past: true },
    { day: 142, weekday: 'Sun', kind: 'resistance', title: 'ARED Deadlift & Squat', planned: 60, done: 55, today: true },
  ]);

  const maxWeekMin = 70;

  const handleSaveWorkout = () => {
    addTimelineEvent({
      subject_id: activeCrew?.name.toLowerCase() || 'vance',
      timestamp: new Date().toISOString(),
      category: 'medical_action',
      severity: 'normal',
      title: `Exercise Completed: ${currentExercise.name} (${logDuration} min)`,
      summary: `Completed ${logSets} sets × ${logReps} reps. Peak HR ${logPeakHR} bpm. Pre-fatigue ${logFatiguePre}/10, post-fatigue ${logFatiguePost}/10. Notes: ${logNotes}`,
      source: 'SOLARIS Exercise Prescription Engine',
      is_simulated: true,
    });

    setWeekDays((prev) =>
      prev.map((d) => (d.today ? { ...d, done: logDuration } : d))
    );

    if (typeof speakText === 'function') {
      speakText(
        `Exercise countermeasure logged for ${currentExercise.name}. ${logDuration} minutes completed with nominal cardiovascular response. Bone mineral loading index updated.`
      );
    }

    setIsLoggingModalOpen(false);
  };

  const getKindIcon = (kind: string) => {
    switch (kind) {
      case 'resistance':
        return <Dumbbell className="w-3.5 h-3.5 text-indigo-600" />;
      case 'intervals':
        return <Zap className="w-3.5 h-3.5 text-amber-500" />;
      case 'continuous':
        return <Bike className="w-3.5 h-3.5 text-emerald-600" />;
      default:
        return <Moon className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#F4F7FC] text-[#0F172A] pt-6 pb-16 px-4 lg:px-8 max-w-7xl mx-auto flex flex-col gap-6 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10.5px] uppercase tracking-wider font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200/60">
              PHYSICAL COUNTERMEASURES
            </span>
            <span className="text-slate-400 text-xs">&middot;</span>
            <span className="text-xs text-slate-500 font-mono">NASA SPRINT Protocol</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Exercise & Musculoskeletal Conditioning
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Preserving bone mineral density, cardiac stroke volume, and neuromuscular coordination in microgravity.
          </p>
        </div>

        {/* Action button */}
        <button
          onClick={() => setIsLoggingModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#5850EC] hover:bg-[#4F46E5] text-white font-semibold text-xs shadow-[0_4px_12px_rgba(88,80,236,0.25)] transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Log Workout Session</span>
        </button>
      </div>

      {/* Week at a Glance: 7-Day SPRINT Protocol Strip */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-bold text-slate-800 tracking-tight">
              Weekly Countermeasure Compliance (NASA SPRINT Target: 2.5h/day)
            </span>
          </div>
          <span className="text-xs font-mono font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60">
            94% Weekly Adherence
          </span>
        </div>

        {/* 7 Days Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
          {weekDays.map((w) => {
            const isMet = w.done >= w.planned;
            return (
              <div
                key={w.day}
                className={`p-3 rounded-xl border transition-all ${
                  w.today
                    ? 'bg-indigo-50/60 border-indigo-300 ring-2 ring-indigo-200 shadow-sm'
                    : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-100'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className={`text-xs font-bold ${w.today ? 'text-indigo-700' : 'text-slate-700'}`}>
                    {w.weekday}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    Sol {w.day}
                  </span>
                </div>

                <div className="flex items-center gap-1 text-[10px] text-slate-600 mb-2 truncate">
                  {getKindIcon(w.kind)}
                  <span className="truncate font-medium">{w.title}</span>
                </div>

                {/* Progress bars */}
                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden relative">
                  <div
                    className="h-full bg-slate-300 rounded-full"
                    style={{ width: `${(w.planned / maxWeekMin) * 100}%` }}
                  />
                  {w.done > 0 && (
                    <div
                      className={`h-full absolute top-0 left-0 rounded-full ${
                        isMet ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${(w.done / maxWeekMin) * 100}%` }}
                    />
                  )}
                </div>

                <div className="flex justify-between text-[9.5px] font-mono text-slate-500 mt-1.5">
                  <span>{w.planned}m plan</span>
                  <span className={w.done > 0 ? 'text-slate-800 font-semibold' : 'text-slate-400'}>
                    {w.done > 0 ? `${w.done}m done` : '—'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Interactive AstroFigure + Workout Protocol Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Animated AstroFigure with Inverse Kinematics */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block">
                Biomechanical Form Visualizer
              </span>
              <h2 className="text-base font-bold text-slate-900">
                {currentExercise.name} &middot; <span className="text-slate-500 font-normal">{currentExercise.equipment}</span>
              </h2>
            </div>

            {/* Video Demonstration & Switcher */}
            <div className="flex items-center gap-2">
              <VideoButton video={currentVideo} />
              <select
                value={selectedExerciseId}
                onChange={(e) => setSelectedExerciseId(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 shadow-sm"
              >
                {SOLARIS_EXERCISES.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* AstroFigure Canvas Container */}
          <div className="w-full">
            <AstroFigure anim={currentExercise.anim} label={currentExercise.name} />
          </div>

          {/* Biomechanical Coaching Cues */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Form & Technique Coaching Cues</span>
            </span>
            <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside font-medium">
              {currentExercise.cues.map((cue, idx) => (
                <li key={idx} className="text-slate-700">{cue}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right: Today's Session Protocol + Transparent Adaptive Rationale */}
        <div className="space-y-5">
          {/* Target Dosage & Muscles */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 tracking-tight">
                Target Dosage & Muscles
              </span>
              <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                {currentExercise.default_intensity}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
                <span className="text-[10px] font-mono text-slate-400 block font-semibold">SETS</span>
                <span className="text-2xl font-bold font-mono text-slate-900">
                  {currentExercise.default_sets ?? 4}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
                <span className="text-[10px] font-mono text-slate-400 block font-semibold">REPS / TARGET</span>
                <span className="text-2xl font-bold font-mono text-slate-900">
                  {currentExercise.default_reps ? `${currentExercise.default_reps}` : '4m'}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
                <span className="text-[10px] font-mono text-slate-400 block font-semibold">DURATION</span>
                <span className="text-2xl font-bold font-mono text-slate-900">
                  {currentExercise.default_duration_min}m
                </span>
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Targeted Skeletal & Muscle Groups
              </span>
              <div className="flex flex-wrap gap-1.5">
                {currentExercise.targets.map((tgt) => (
                  <span
                    key={tgt}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 border border-slate-200 text-slate-700"
                  >
                    {tgt}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Transparent Adaptive Rationale */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-3">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-indigo-600" />
              SOLARIS Adaptive Prescription Rationale
            </span>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              {currentExercise.why}
            </p>
            <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-100 text-xs text-indigo-900 leading-relaxed">
              <strong>Active Adaptation:</strong> Based on Flight Engineer Chen's lumbar unloading strain recorded during morning check-in, axial loading was adjusted from 95% to 80% with emphasis on neutral core stabilization.
            </div>
          </div>
        </div>
      </div>

      {/* Workout Logging Modal */}
      {isLoggingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 space-y-4 text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                  LOG WORKOUT SESSION
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  {currentExercise.name}
                </h3>
              </div>
              <button
                onClick={() => setIsLoggingModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">
                  DURATION (MINUTES)
                </label>
                <input
                  type="number"
                  value={logDuration}
                  onChange={(e) => setLogDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:border-indigo-400"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">
                  SETS COMPLETED
                </label>
                <input
                  type="number"
                  value={logSets}
                  onChange={(e) => setLogSets(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:border-indigo-400"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">
                  PEAK HEART RATE (BPM)
                </label>
                <input
                  type="number"
                  value={logPeakHR}
                  onChange={(e) => setLogPeakHR(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:border-indigo-400"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">
                  POST-WORKOUT FATIGUE (1-10)
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={logFatiguePost}
                  onChange={(e) => setLogFatiguePost(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:border-indigo-400"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">
                CREW NOTES / BIOMECHANICAL SENSATIONS
              </label>
              <textarea
                rows={2}
                value={logNotes}
                onChange={(e) => setLogNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-indigo-400 resize-none"
              />
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setIsLoggingModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Dismiss
              </button>
              <button
                onClick={handleSaveWorkout}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#5850EC] hover:bg-[#4F46E5] shadow-sm transition-all"
              >
                Log & Sync Telemetry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExercisePage;
