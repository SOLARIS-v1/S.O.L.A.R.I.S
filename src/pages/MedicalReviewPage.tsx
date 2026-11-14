import React, { useState } from 'react';
import { useAstraStore } from '../api/mockClient';
import { Stethoscope, Check, FileText } from 'lucide-react';

export const MedicalReviewPage: React.FC = () => {
  const { crew, activeSubjectId, setActiveSubject } = useAstraStore();
  const [selectedCrewId, setSelectedCrewId] = useState<string>(activeSubjectId || 'ASTRA-02');
  const [reviewNote, setReviewNote] = useState<string>('');
  const [resolvedIds, setResolvedIds] = useState<string[]>([]);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const selectedAstronaut = crew.find((c) => c.id === selectedCrewId) || crew[1]; // Maya Chen

  const findings = [
    {
      id: 'f-1',
      level: 'Review',
      badgeColor: '#E58F55',
      rule: 'RULE: Named Combination: Fever with tachycardia',
      subtext: 'Febrile hyperdynamic response detected.',
      telemetry: '38.1 °C / 86 bpm',
      baseline: '36.8 °C / 73 bpm',
    },
    {
      id: 'f-2',
      level: 'Watch',
      badgeColor: '#E0BE6A',
      rule: 'RULE: Named Combination: Sleep-Fatigue Syndrome',
      subtext: 'Cumulative sleep deficit & fatigue cluster.',
      telemetry: '5.3 h sleep / 3.8 fatigue',
      baseline: '5.3 h / 3.8 fatigue',
    },
  ];

  const handleResolve = (id: string) => {
    setResolvedIds((prev) => [...prev, id]);
    setSuccessMsg('Finding resolved and signed off.');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleLogEntry = () => {
    if (!reviewNote.trim()) return;
    setReviewNote('');
    setSuccessMsg('Clinical review entry logged successfully to mission archive.');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleOrderQuestionnaire = (type: string) => {
    setSuccessMsg(`Ordered supplementary questionnaire: ${type}`);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  return (
    <div className="w-full h-full max-w-7xl mx-auto flex flex-col justify-between p-2 lg:p-4 select-none font-mono text-[#ECE8E1]">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 mb-3 hairline-b">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg border border-white/10 bg-white/[0.03] flex items-center justify-center">
            <Stethoscope className="w-4 h-4 text-[#ECE8E1]" strokeWidth={1.25} />
          </div>
          <div>
            <h1 className="text-xs lg:text-sm font-medium tracking-wide text-[#ECE8E1] uppercase">
              AUTHORISED CLINICAL FLIGHT SURGEON REVIEW CONSOLE
            </h1>
            <p className="text-[10px] text-[#8D97A6]">
              Human Medical Decision Support · Ground / Orbital Clinical Authority
            </p>
          </div>
        </div>

        <div className="text-[10px] text-[#8D97A6]">
          <span>AUTHORISED REVIEWER: </span>
          <span className="text-[#ECE8E1] font-medium">Dr. D. Brooks, Lead Flight Surgeon</span>
        </div>
      </div>

      {/* 4 Crew Selector Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
        {crew.map((c) => {
          const isSelected = selectedCrewId === c.id;
          const alertsCount = c.id === 'ASTRA-02' ? 2 : c.id === 'ASTRA-04' ? 0 : 1;

          return (
            <button
              key={c.id}
              onClick={() => {
                setSelectedCrewId(c.id);
                setActiveSubject(c.id);
              }}
              className={`p-3 rounded-xl text-left border transition-all ${
                isSelected
                  ? 'border-white bg-white/[0.06] shadow-sm'
                  : 'border-white/[0.08] bg-white/[0.02] hover:border-white/20'
              }`}
            >
              <div className="text-xs text-[#ECE8E1] font-medium truncate">{c.name}</div>
              <div className="text-[9px] text-[#8D97A6] truncate mt-0.5">{c.role} ({c.callsign})</div>
              <div className="text-[9px] text-[#5B6573] mt-1">Unreviewed Alerts: {alertsCount}</div>
            </button>
          );
        })}
      </div>

      {/* Main 2-Column Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 min-h-[300px]">
        {/* Left Column: Active Telemetry Findings (cols 1-7) */}
        <div className="lg:col-span-7 flex flex-col justify-between p-3.5 rounded-xl border border-white/[0.08] bg-white/[0.02]">
          <div>
            <span className="text-xs text-[#ECE8E1] font-medium block mb-3">
              ACTIVE TELEMETRY FINDINGS (2)
            </span>

            <div className="space-y-3">
              {findings.map((f) => {
                const isResolved = resolvedIds.includes(f.id);

                return (
                  <div
                    key={f.id}
                    className={`p-3 rounded-lg border transition-all ${
                      isResolved
                        ? 'border-white/5 opacity-50 bg-transparent'
                        : 'border-white/10 bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-1.5 py-0.2 rounded text-[8px] font-mono border border-white/20 text-[#ECE8E1] bg-white/[0.04]">
                        {f.level}
                      </span>
                      <span className="text-[11px] font-medium text-[#ECE8E1]">{f.rule}</span>
                    </div>

                    <p className="text-[10px] text-[#8D97A6] mb-2">{f.subtext}</p>

                    <div className="flex items-center justify-between text-[10px] text-[#8D97A6] hairline-t pt-2 mt-1">
                      <div>
                        <span>Telemetry: </span>
                        <span className="text-[#ECE8E1]">{f.telemetry}</span>
                      </div>
                      <div>
                        <span>Personal Baseline: </span>
                        <span className="text-[#ECE8E1]">{f.baseline}</span>
                      </div>
                    </div>

                    <div className="flex justify-end mt-2.5">
                      <button
                        onClick={() => handleResolve(f.id)}
                        disabled={isResolved}
                        className="flex items-center gap-1 px-3 py-1 rounded text-[10px] font-mono border border-white/15 bg-white/[0.04] hover:bg-white/10 text-[#ECE8E1] disabled:opacity-40 transition-colors"
                      >
                        <Check className="w-3 h-3" strokeWidth={1.5} />
                        <span>{isResolved ? 'RESOLVED' : 'RESOLVE & SIGN OFF'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {successMsg && (
            <div className="text-[10px] text-[#6FBF9B] font-mono mt-2 animate-in fade-in">
              ✓ {successMsg}
            </div>
          )}
        </div>

        {/* Right Column: Review Entry & Questionnaires (cols 8-12) */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-3">
          {/* Medical Officer Review Entry */}
          <div className="p-3.5 rounded-xl border border-white/[0.08] bg-white/[0.02] flex flex-col justify-between flex-1">
            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-[#ECE8E1] font-medium">MEDICAL OFFICER REVIEW ENTRY</span>
                <span className="text-[10px] text-[#8D97A6]">Subject: {selectedAstronaut.name}</span>
              </div>

              <textarea
                rows={4}
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="Enter flight surgeon evaluation notes, clinical countermeasure prescription, or clearance remarks..."
                className="w-full p-2.5 rounded-lg bg-white/[0.03] border border-white/10 text-[11px] font-mono text-[#ECE8E1] placeholder:text-[#5B6573] focus:outline-none focus:border-white/30 resize-none"
              />
            </div>

            <button
              onClick={handleLogEntry}
              className="w-full mt-2 py-2 rounded-lg text-xs font-mono font-medium border border-white/15 bg-white/[0.04] hover:bg-white/10 text-[#ECE8E1] transition-colors"
            >
              LOG CLINICAL REVIEW ENTRY
            </button>
          </div>

          {/* Order Supplementary Questionnaire */}
          <div className="p-3.5 rounded-xl border border-white/[0.08] bg-white/[0.02]">
            <div className="flex items-center gap-1.5 text-xs text-[#ECE8E1] font-medium mb-2.5">
              <FileText className="w-3.5 h-3.5 text-[#8D97A6]" strokeWidth={1.25} />
              <span>ORDER SUPPLEMENTARY QUESTIONNAIRE</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleOrderQuestionnaire('Fluid Shift / SANS')}
                className="p-2 rounded-lg border border-white/10 hover:border-white/20 bg-white/[0.02] text-[10px] text-[#ECE8E1] hover:bg-white/[0.06] text-left transition-colors"
              >
                + Fluid Shift / SANS
              </button>
              <button
                onClick={() => handleOrderQuestionnaire('Behavioral Health')}
                className="p-2 rounded-lg border border-white/10 hover:border-white/20 bg-white/[0.02] text-[10px] text-[#ECE8E1] hover:bg-white/[0.06] text-left transition-colors"
              >
                + Behavioral Health
              </button>
              <button
                onClick={() => handleOrderQuestionnaire('Acoustic Fatigue')}
                className="p-2 rounded-lg border border-white/10 hover:border-white/20 bg-white/[0.02] text-[10px] text-[#ECE8E1] hover:bg-white/[0.06] text-left transition-colors"
              >
                + Acoustic Fatigue
              </button>
              <button
                onClick={() => handleOrderQuestionnaire('Cognitive Workload')}
                className="p-2 rounded-lg border border-white/10 hover:border-white/20 bg-white/[0.02] text-[10px] text-[#ECE8E1] hover:bg-white/[0.06] text-left transition-colors"
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
