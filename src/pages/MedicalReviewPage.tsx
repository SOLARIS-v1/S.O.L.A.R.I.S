import React, { useState } from 'react';
import { useAstraStore } from '../api/mockClient';
import {
  Stethoscope,
  Check,
  FileText,
  AlertCircle,
  ShieldAlert,
  User,
  CheckCircle2,
  Info,
  ShieldCheck,
  Lock
} from 'lucide-react';
import { ModelStatusBadge, type MLModelStatusType } from '../components/common/ModelStatusBadge';

export const MedicalReviewPage: React.FC = () => {
  const { crew, activeSubjectId, setActiveSubject } = useAstraStore();
  const [selectedCrewId, setSelectedCrewId] = useState<string>(activeSubjectId || 'ASTRA-002');
  const [reviewNote, setReviewNote] = useState<string>('');
  const [resolvedIds, setResolvedIds] = useState<string[]>([]);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const selectedAstronaut = crew.find((c) => c.id === selectedCrewId) || crew[1];

  const findings = [
    {
      id: 'f-1',
      level: 'Review',
      levelClass: 'bg-amber-50 text-amber-800 border-amber-300',
      rule: 'Named Cluster: Febrile Hyperdynamic Response',
      subtext: 'Core body temperature elevation with concurrent resting tachycardia.',
      telemetry: '38.1 °C / 86 bpm',
      baseline: '36.8 °C / 73 bpm',
      mlStatus: 'experimental' as MLModelStatusType,
      mlModelName: 'cardiovascular_anomaly_detector (Isolation Forest)',
      provenance: '250Hz Lead-II ECG & Inflatable Cuff Telemetry',
      limitations: 'Unsupervised statistical score only. Never claims arrhythmia, disease probability, or automatic alerts.',
      dataQuality: 'High Quality Physical Telemetry',
    },
    {
      id: 'f-2',
      level: 'Observation',
      levelClass: 'bg-yellow-50 text-yellow-800 border-yellow-300',
      rule: 'Circadian Disruption: Sleep-Fatigue Syndrome',
      subtext: 'Cumulative 48-hour sleep deficit with elevated paraspinal ache.',
      telemetry: '5.3 h sleep / 3.8 fatigue',
      baseline: '7.2 h / 1.5 fatigue',
      mlStatus: 'quarantined' as MLModelStatusType,
      mlModelName: 'sleep_recovery_model (Target Leakage Quarantine)',
      provenance: 'NASA Archer actigraphy wristband + PVT 10-minute reaction test',
      limitations: 'ML predictive regression is quarantined. Finding is based strictly on physical actigraphy logs and self-reported NRS fatigue.',
      dataQuality: 'Direct Actigraphy & Survey',
    },
  ];

  const handleResolve = (id: string) => {
    setResolvedIds((prev) => [...prev, id]);
    setSuccessMsg('Clinical finding resolved and signed off into mission medical log.');
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const handleLogEntry = () => {
    if (!reviewNote.trim()) return;
    setReviewNote('');
    setSuccessMsg('Flight surgeon clinical review entry logged and committed to ground telemetry.');
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const handleOrderQuestionnaire = (type: string) => {
    setSuccessMsg(`Ordered supplementary clinical questionnaire: ${type}`);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  return (
    <div className="w-full h-full max-w-7xl mx-auto flex flex-col justify-between p-3 lg:p-6 select-none font-sans text-slate-900">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-slate-200/80 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-[#5850EC] shadow-sm">
            <Stethoscope className="w-5 h-5" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-slate-900 uppercase font-mono">
              Clinical Flight Surgeon Review Console
            </h1>
            <p className="text-xs text-slate-500 font-mono">
              Human Medical Decision Support · Ground / Orbital Clinical Authority · solaris_ml Governance
            </p>
          </div>
        </div>

        <div className="text-xs font-mono bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2">
          <span className="text-slate-500 font-medium">AUTHORISED REVIEWER:</span>
          <span className="text-slate-900 font-bold">Dr. D. Brooks, Lead Flight Surgeon</span>
        </div>
      </div>

      {/* 4 Crew Selector Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {crew.map((c) => {
          const isSelected = selectedCrewId === c.id;
          const alertsCount = c.id === 'ASTRA-002' || c.id === 'ASTRA-02' ? 2 : c.id === 'ASTRA-001' ? 1 : 0;

          return (
            <button
              key={c.id}
              onClick={() => {
                setSelectedCrewId(c.id);
                setActiveSubject(c.id);
              }}
              className={`p-3.5 rounded-2xl text-left border transition-all ${
                isSelected
                  ? 'border-indigo-400 bg-indigo-50/70 shadow-sm ring-2 ring-indigo-200/60'
                  : 'border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50 shadow-[0_2px_8px_rgba(0,0,0,0.02)]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-900 truncate font-mono">{c.name}</span>
                {alertsCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-bold font-mono">
                    {alertsCount}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-500 truncate font-mono">{c.role} ({c.callsign})</div>
              <div className="text-[10px] text-slate-400 mt-1 font-mono">
                {alertsCount > 0 ? `${alertsCount} Unreviewed Alerts` : 'Nominal Status'}
              </div>
            </button>
          );
        })}
      </div>

      {/* Main 2-Column Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-[340px]">
        {/* Left Column: Active Telemetry Findings (cols 1-7) */}
        <div className="lg:col-span-7 flex flex-col justify-between p-5 rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
                Active Telemetry Findings ({findings.length})
              </span>
              <span className="text-xs text-slate-500 font-mono">Crew Subject: {selectedAstronaut.name}</span>
            </div>

            <div className="space-y-3">
              {findings.map((f) => {
                const isResolved = resolvedIds.includes(f.id);

                return (
                  <div
                    key={f.id}
                    className={`p-4 rounded-xl border transition-all space-y-2 ${
                      isResolved
                        ? 'border-slate-200 bg-slate-50/60 opacity-60'
                        : 'border-slate-200/80 bg-slate-50/80 shadow-sm'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${f.levelClass}`}>
                          {f.level}
                        </span>
                        <span className="text-xs font-bold text-slate-900 font-mono">{f.rule}</span>
                      </div>
                      <ModelStatusBadge status={f.mlStatus} />
                    </div>

                    <p className="text-xs text-slate-600 font-medium">{f.subtext}</p>

                    <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-200/80 pt-2 font-mono">
                      <div>
                        <span>Telemetry: </span>
                        <span className="text-slate-900 font-bold">{f.telemetry}</span>
                      </div>
                      <div>
                        <span>Personal Baseline: </span>
                        <span className="text-slate-700 font-semibold">{f.baseline}</span>
                      </div>
                    </div>

                    {/* Scientific Limitations & Provenance Disclosure */}
                    <div className="p-2.5 rounded-lg bg-white border border-slate-200/70 text-[10.5px] font-mono text-slate-600 space-y-0.5">
                      <div>
                        <strong className="text-slate-800">Model: </strong>
                        <span className="text-indigo-700 font-semibold">{f.mlModelName}</span>
                      </div>
                      <div>
                        <strong className="text-slate-800">Provenance: </strong>
                        <span>{f.provenance} ({f.dataQuality})</span>
                      </div>
                      <div>
                        <strong className="text-slate-800">Limitations: </strong>
                        <span className="text-slate-500">{f.limitations}</span>
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => handleResolve(f.id)}
                        disabled={isResolved}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all ${
                          isResolved
                            ? 'bg-slate-200 text-slate-500 cursor-default'
                            : 'bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-sm hover:shadow'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{isResolved ? 'RESOLVED & SIGNED' : 'RESOLVE & SIGN OFF'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {successMsg && (
            <div className="text-xs text-emerald-700 font-mono font-semibold mt-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 animate-in fade-in flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        {/* Right Column: Review Entry & Questionnaires (cols 8-12) */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
          {/* Medical Officer Review Entry */}
          <div className="p-5 rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_16px_rgba(0,0,0,0.04)] flex flex-col justify-between flex-1">
            <div>
              <div className="flex items-center justify-between text-xs mb-2.5">
                <span className="text-slate-900 font-bold uppercase font-mono">Flight Surgeon Clinical Log</span>
                <span className="text-[11px] text-slate-500 font-mono">{selectedAstronaut.callsign}</span>
              </div>

              <textarea
                rows={4}
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="Enter flight surgeon evaluation notes, clinical countermeasure prescription, or clearance remarks..."
                className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white resize-none shadow-inner"
              />
            </div>

            <button
              onClick={handleLogEntry}
              className="w-full mt-3 py-2.5 rounded-xl text-xs font-mono font-bold tracking-wider uppercase bg-gradient-to-r from-indigo-600 to-[#5850EC] hover:from-indigo-700 hover:to-indigo-800 text-white shadow-md shadow-indigo-100 transition-all active:scale-95"
            >
              LOG CLINICAL REVIEW ENTRY
            </button>
          </div>

          {/* Order Supplementary Questionnaire */}
          <div className="p-5 rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-2 text-xs text-slate-900 font-bold uppercase font-mono mb-3">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>Order Supplementary Questionnaire</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => handleOrderQuestionnaire('Fluid Shift / SANS')}
                className="p-2.5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 bg-white text-xs text-slate-700 hover:text-indigo-700 font-mono font-medium text-left transition-all shadow-sm"
              >
                + Fluid Shift / SANS
              </button>
              <button
                onClick={() => handleOrderQuestionnaire('Behavioral Health')}
                className="p-2.5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 bg-white text-xs text-slate-700 hover:text-indigo-700 font-mono font-medium text-left transition-all shadow-sm"
              >
                + Behavioral Health
              </button>
              <button
                onClick={() => handleOrderQuestionnaire('Acoustic Fatigue')}
                className="p-2.5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 bg-white text-xs text-slate-700 hover:text-indigo-700 font-mono font-medium text-left transition-all shadow-sm"
              >
                + Acoustic Fatigue
              </button>
              <button
                onClick={() => handleOrderQuestionnaire('Cognitive Workload')}
                className="p-2.5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 bg-white text-xs text-slate-700 hover:text-indigo-700 font-mono font-medium text-left transition-all shadow-sm"
              >
                + Cognitive Workload
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MedicalReviewPage;
