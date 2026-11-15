import React, { useState, useEffect } from 'react';
import {
  Eye,
  Activity,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  Sparkles,
  User,
  ArrowUpRight
} from 'lucide-react';
import { useAstraStore } from '../api/mockClient';
import { EyeScreeningModal, type EyeScreeningResult } from '../components/measure/EyeScreeningModal';

interface ScreeningHistoryItem {
  id: string;
  sol: number;
  date: string;
  astronautName: string;
  leftSeverity: number;
  rightSeverity: number;
  leftDefectsCount: number;
  rightDefectsCount: number;
  status: 'nominal' | 'caution' | 'warning';
  notes: string;
}

const DEFAULT_HISTORY: ScreeningHistoryItem[] = [
  {
    id: 'hist-1',
    sol: 128,
    date: '2026-11-01',
    astronautName: 'Commander Vance',
    leftSeverity: 0,
    rightSeverity: 0,
    leftDefectsCount: 0,
    rightDefectsCount: 0,
    status: 'nominal',
    notes: 'Routine bi-weekly screening. Zero distortions or scotomas reported in either eye.',
  },
  {
    id: 'hist-2',
    sol: 114,
    date: '2026-10-18',
    astronautName: 'Commander Vance',
    leftSeverity: 0,
    rightSeverity: 0,
    leftDefectsCount: 0,
    rightDefectsCount: 0,
    status: 'nominal',
    notes: 'Nominal central fixation. Wearing reading glasses (+1.00D).',
  },
  {
    id: 'hist-3',
    sol: 100,
    date: '2026-10-04',
    astronautName: 'Commander Vance',
    leftSeverity: 1,
    rightSeverity: 0,
    leftDefectsCount: 1,
    rightDefectsCount: 0,
    status: 'caution',
    notes: 'Mild peripheral blur in infero-temporal sector OS after prolonged IVA task. Cleared on retest 24h later.',
  },
  {
    id: 'hist-4',
    sol: 0,
    date: '2026-06-25',
    astronautName: 'Commander Vance',
    leftSeverity: 0,
    rightSeverity: 0,
    leftDefectsCount: 0,
    rightDefectsCount: 0,
    status: 'nominal',
    notes: 'Pre-flight terrestrial baseline established at Johnson Space Center.',
  },
];

export const EyeScreeningPage: React.FC = () => {
  const { activeSubjectId, crew } = useAstraStore();
  const activeAstronaut = crew.find((c) => c.id === activeSubjectId) || crew[0];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [historyList, setHistoryList] = useState<ScreeningHistoryItem[]>(DEFAULT_HISTORY);

  // Load any saved screenings from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('solaris_eye_screenings_v1');
      if (saved) {
        const parsed: EyeScreeningResult[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const transformed: ScreeningHistoryItem[] = parsed.map((item, idx) => ({
            id: item.id || `local-${idx}`,
            sol: 142,
            date: new Date(item.timestamp).toISOString().split('T')[0],
            astronautName: activeAstronaut.name,
            leftSeverity: item.leftEye.severityScore,
            rightSeverity: item.rightEye.severityScore,
            leftDefectsCount: item.leftEye.markedPoints?.length || 0,
            rightDefectsCount: item.rightEye.markedPoints?.length || 0,
            status: item.overallStatus,
            notes: item.notes || 'Completed via SOLARIS clinical Amsler station.',
          }));
          setHistoryList([...transformed, ...DEFAULT_HISTORY]);
        }
      }
    } catch (e) {
      console.warn('Failed to parse solaris_eye_screenings_v1', e);
    }
  }, [activeAstronaut]);

  const handleSavedResult = (result: EyeScreeningResult) => {
    const newItem: ScreeningHistoryItem = {
      id: result.id,
      sol: 142,
      date: new Date(result.timestamp).toISOString().split('T')[0],
      astronautName: activeAstronaut.name,
      leftSeverity: result.leftEye.severityScore,
      rightSeverity: result.rightEye.severityScore,
      leftDefectsCount: result.leftEye.markedPoints.length,
      rightDefectsCount: result.rightEye.markedPoints.length,
      status: result.overallStatus,
      notes: result.notes || 'Screening recorded in electronic health ledger.',
    };
    setHistoryList([newItem, ...historyList]);
  };

  const latestScreening = historyList[0] || DEFAULT_HISTORY[0];

  return (
    <div className="w-full min-h-screen bg-[#F4F7FC] text-slate-800 p-4 md:p-8 space-y-6 select-none font-sans">
      {/* Page Header */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
            <Eye className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 font-sans">
                Eye Screening & Vision Diagnostics
              </h1>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold">
                SANS PROTOCOL
              </span>
            </div>
            <p className="text-xs font-mono text-slate-500 mt-1">
              Visual Field Surveillance • SANS Risk Monitoring • High-Contrast Amsler Grid
            </p>
          </div>
        </div>

        {/* CTA Launch Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-xs tracking-wider font-mono hover:bg-indigo-700 shadow-md transition-all transform hover:-translate-y-0.5"
          >
            <Eye className="w-4 h-4" />
            <span>START AMSLER GRID TEST</span>
          </button>
        </div>
      </div>

      {/* Clinical Directive Notification */}
      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-xs text-amber-900 leading-relaxed shadow-sm">
        <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
        <div>
          <strong className="font-semibold text-amber-950">CLINICAL SAFETY MANDATE (NASA-STD-3001 §4.3):</strong> Amsler Grid visual field testing is a subjective functional screening designed to identify macular metamorphopsia (line distortion) and central scotomas. <u>It does not diagnose optic-disc edema or SANS.</u> All functional abnormalities must be correlated with high-resolution Spectral-Domain Optical Coherence Tomography (OCT) and fundoscopic imaging.
        </div>
      </div>

      {/* Main Grid: Active Surveillance Cards + Diagnostic Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Left Eye (OS) Visual Field */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-500 uppercase tracking-wider font-medium">
              Left Eye (OS) Field
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-bold font-mono text-slate-900">
              {latestScreening.leftSeverity === 0 ? 'Nominal' : `Score ${latestScreening.leftSeverity}/3`}
            </div>
          </div>
          <p className="text-xs text-slate-500">
            {latestScreening.leftDefectsCount === 0
              ? 'No distortion or scotoma in 20° central field'
              : `${latestScreening.leftDefectsCount} defect loci recorded`}
          </p>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-emerald-700 font-medium">
            <span>Fixation: Stable</span>
            <span>Sol {latestScreening.sol}</span>
          </div>
        </div>

        {/* Metric 2: Right Eye (OD) Visual Field */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-500 uppercase tracking-wider font-medium">
              Right Eye (OD) Field
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-bold font-mono text-slate-900">
              {latestScreening.rightSeverity === 0 ? 'Nominal' : `Score ${latestScreening.rightSeverity}/3`}
            </div>
          </div>
          <p className="text-xs text-slate-500">
            {latestScreening.rightDefectsCount === 0
              ? 'No distortion or scotoma in 20° central field'
              : `${latestScreening.rightDefectsCount} defect loci recorded`}
          </p>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-emerald-700 font-medium">
            <span>Fixation: Stable</span>
            <span>Sol {latestScreening.sol}</span>
          </div>
        </div>

        {/* Metric 3: Intraocular Pressure (IOP) Surrogate */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-500 uppercase tracking-wider font-medium">
              Estimated IOP (Tono-Pen)
            </span>
            <Activity className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-bold font-mono text-slate-900">16.4</div>
            <span className="text-xs font-mono text-slate-500">mmHg</span>
          </div>
          <p className="text-xs text-slate-500">
            Nominal range 12–21 mmHg • Monitored for cephalad shift
          </p>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-emerald-700 font-medium">
            <span>Status: Normal Range</span>
            <span>Δ +1.8 vs Ground</span>
          </div>
        </div>

        {/* Metric 4: Optic Nerve Sheath Diameter (ONSD) */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-500 uppercase tracking-wider font-medium">
              Retrobulbar ONSD
            </span>
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-bold font-mono text-slate-900">5.3</div>
            <span className="text-xs font-mono text-slate-500">mm</span>
          </div>
          <p className="text-xs text-slate-500">
            Normal threshold &lt; 5.8 mm • Ultrasound ICP surrogate
          </p>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-emerald-700 font-medium">
            <span>ICP: Nominal</span>
            <span>Sol 135 Ultrasound</span>
          </div>
        </div>
      </div>

      {/* SANS Clinical Deep Dive & Protocol Education */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): SANS Pathophysiology Overview */}
        <div className="lg:col-span-8 p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold font-mono text-slate-900 uppercase tracking-wider">
                SANS Surveillance & Pathophysiology
              </h2>
            </div>
            <span className="text-[10px] font-mono text-slate-500">NASA HRP ROADMAP</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-2">
              <div className="text-xs font-mono font-bold text-indigo-700">1. CEPHALAD FLUID SHIFT</div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Microgravity removes hydrostatic pooling, moving ~1.5 to 2.0 L of venous fluid toward the head, elevating jugular and intracranial venous pressures.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-2">
              <div className="text-xs font-mono font-bold text-amber-700">2. GLOBE FLATTENING & EDEMA</div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Persistent optic sheath distension can flatten the posterior sclera, induce hyperopic shifts (loss of near vision), and cause optic disc swelling.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-2">
              <div className="text-xs font-mono font-bold text-teal-700">3. FUNCTIONAL DETECTION</div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Amsler Grid testing allows rapid bi-weekly crew self-testing for retinal folding or macular distortion without needing complex laser imaging systems.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs font-mono text-slate-600">
            <div className="text-slate-900 font-semibold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>Recommended Screening Cadence & Standards</span>
            </div>
            <ul className="list-disc pl-5 space-y-1 text-[11px] leading-relaxed text-slate-600">
              <li>Execute bi-weekly Amsler tests during rest periods with ambient illumination nominal.</li>
              <li>Always wear near visual correction if prescribed; document reading distance strictly at 33 cm.</li>
              <li>Preserve Left (OS) and Right (OD) findings independently to track unilateral versus bilateral changes.</li>
              <li>Report any sudden metamorphopsia, transient visual obscurations, or new blind spots immediately to the Flight Surgeon.</li>
            </ul>
          </div>
        </div>

        {/* Right Column (4 cols): Active Crew Visual Status Card */}
        <div className="lg:col-span-4 p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-mono font-bold text-slate-900 uppercase tracking-wider">
                  Active Crew Profile
                </span>
              </div>
              <span className="text-[10px] font-mono text-emerald-800 font-semibold px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200">
                SURVEILLANCE NOMINAL
              </span>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Subject Name:</span>
                <span className="text-slate-900 font-bold">{activeAstronaut.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Callsign:</span>
                <span className="text-slate-700">{activeAstronaut.callsign}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Mission Phase:</span>
                <span className="text-indigo-600 font-semibold">Transit Sol 142 of 500</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Near Visual Acuity:</span>
                <span className="text-slate-900 font-bold">20/20 OS • 20/20 OD</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">OCT Scan Status:</span>
                <span className="text-emerald-700 font-medium">Sol 120 (RNFL Nominal)</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full py-3 rounded-2xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            <span>Launch Visual Field Test</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Historical Trend Records Table */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold font-mono text-slate-900 uppercase tracking-wider">
              Visual Screening Examination History
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-500">
            Showing {historyList.length} recorded diagnostic sessions
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2.5 pr-4">Sol / Date</th>
                <th className="py-2.5 px-4">Subject</th>
                <th className="py-2.5 px-4">Left Eye (OS)</th>
                <th className="py-2.5 px-4">Right Eye (OD)</th>
                <th className="py-2.5 px-4">Defects Plotted</th>
                <th className="py-2.5 px-4">Overall Status</th>
                <th className="py-2.5 pl-4">Clinical Observations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {historyList.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50/70 transition-colors"
                >
                  <td className="py-3 pr-4 font-bold text-slate-900">
                    Sol {item.sol} <span className="text-[10px] text-slate-500 font-normal">({item.date})</span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{item.astronautName}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        item.leftSeverity === 0
                          ? 'bg-emerald-50 text-emerald-800'
                          : 'bg-amber-50 text-amber-800'
                      }`}
                    >
                      {item.leftSeverity === 0 ? 'Nominal' : `Score ${item.leftSeverity}/3`}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        item.rightSeverity === 0
                          ? 'bg-emerald-50 text-emerald-800'
                          : 'bg-amber-50 text-amber-800'
                      }`}
                    >
                      {item.rightSeverity === 0 ? 'Nominal' : `Score ${item.rightSeverity}/3`}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    OS: {item.leftDefectsCount} • OD: {item.rightDefectsCount}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                        item.status === 'nominal'
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.status === 'caution'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="py-3 pl-4 text-slate-500 max-w-xs truncate" title={item.notes}>
                    {item.notes}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Amsler Test Modal */}
      <EyeScreeningModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={handleSavedResult}
      />
    </div>
  );
};

export default EyeScreeningPage;
