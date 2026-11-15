import React, { useState } from 'react';
import { useAstraStore } from '../../api/mockClient';
import { useSolaris } from '../../context/SolarisContext';
import { CrewMember } from '../../api/types';
import { StatusBadge } from '../common/StatusBadge';
import { ShieldCheck, ArrowRight, User, X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AstronautIdentificationModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  const { crew, activeSubjectId, setActiveSubject } = useAstraStore();
  const { selectCrew } = useSolaris();
  const [selectedId, setSelectedId] = useState<string>(activeSubjectId);

  // Custom Astronaut input
  const [isCustom, setIsCustom] = useState<boolean>(false);
  const [customName, setCustomName] = useState<string>('');
  const [customCallsign, setCustomCallsign] = useState<string>('');
  const [customRole, setCustomRole] = useState<string>('Flight Specialist');
  const [customGender, setCustomGender] = useState<'female' | 'male'>('female');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (isCustom && customName.trim()) {
      const newId = `ASTRA-CUSTOM-${Date.now()}`;
      const newCrew: CrewMember = {
        id: newId,
        name: customName.trim(),
        callsign: customCallsign.trim() || 'Cosmo',
        role: customRole,
        gender: customGender,
        mission_day: 142,
        status: 'normal',
        scenario: 'Active telemetry stream',
        baseline_established: true,
      };
      useAstraStore.setState((state) => ({
        crew: [...state.crew, newCrew],
        activeSubjectId: newId,
      }));
    } else {
      setActiveSubject(selectedId);
      if (selectedId === 'ASTRA-001') {
        selectCrew('vance');
      } else if (selectedId === 'ASTRA-002') {
        selectCrew('patel');
      } else if (selectedId === 'ASTRA-003') {
        selectCrew('chen');
      }
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-200 font-sans text-slate-800 select-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="identify-modal-title"
    >
      <div className="w-full max-w-xl rounded-3xl bg-white border border-slate-200/90 shadow-[0_20px_60px_rgba(0,0,0,0.15)] p-6 sm:p-7 space-y-5 relative overflow-hidden">
        {/* Top accent */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-indigo-500 via-[#5850EC] to-indigo-400" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-xs text-indigo-700 font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
            <span>SOLARIS BIOMETRIC IDENTIFICATION</span>
          </div>
          <h2
            id="identify-modal-title"
            className="text-xl font-bold tracking-tight text-slate-900"
          >
            Identify Crew Member
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Select your astronaut profile to initialize your personalized 3D anatomical twin and real-time clinical telemetry.
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex rounded-xl bg-slate-100 p-1 text-xs">
          <button
            onClick={() => setIsCustom(false)}
            className={`flex-1 py-1.5 rounded-lg transition-all font-semibold ${
              !isCustom
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Expedition Roster ({crew.length} Crew)
          </button>
          <button
            onClick={() => setIsCustom(true)}
            className={`flex-1 py-1.5 rounded-lg transition-all font-semibold ${
              isCustom
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            + New Crew Profile
          </button>
        </div>

        {/* Option 1: Existing Roster */}
        {!isCustom ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
            {crew.map((c) => {
              const isSelected = selectedId === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  role="button"
                  tabIndex={0}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                    isSelected
                      ? 'bg-indigo-50/70 border-indigo-400 ring-2 ring-indigo-200 shadow-sm'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white text-indigo-600 border-slate-200'
                    }`}
                  >
                    <User className="w-5 h-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {c.name}
                      </span>
                      <StatusBadge level={c.status} showLabel={false} size="sm" />
                    </div>
                    <span className="text-[10px] text-slate-500 block truncate mt-0.5">
                      {c.role} &middot; {c.callsign}
                    </span>
                    <span className="text-[9px] text-indigo-600 block truncate mt-1 font-semibold">
                      {c.gender === 'female' ? 'Female Anatomy Model' : 'Male Anatomy Model'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Option 2: Custom Astronaut Input */
          <div className="space-y-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 uppercase font-bold">Astronaut Full Name</label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g. Commander Sarah Vance"
                className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:border-indigo-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase font-bold">Callsign</label>
                <input
                  type="text"
                  value={customCallsign}
                  onChange={(e) => setCustomCallsign(e.target.value)}
                  placeholder="e.g. VALKYRIE"
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:border-indigo-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase font-bold">Mission Role</label>
                <select
                  value={customRole}
                  onChange={(e) => setCustomRole(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:border-indigo-400"
                >
                  <option value="Mission Commander">Mission Commander</option>
                  <option value="Medical Specialist">Medical Specialist</option>
                  <option value="Flight Engineer">Flight Engineer</option>
                  <option value="Payload Scientist">Payload Scientist</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <label className="text-[10px] text-slate-500 uppercase font-bold block">
                3D Anatomical Twin Gender
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCustomGender('female')}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    customGender === 'female'
                      ? 'bg-indigo-50 border-indigo-400 text-indigo-700 font-bold'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  Female Anatomy Model
                </button>
                <button
                  type="button"
                  onClick={() => setCustomGender('male')}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    customGender === 'male'
                      ? 'bg-indigo-50 border-indigo-400 text-indigo-700 font-bold'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  Male Anatomy Model
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={handleConfirm}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#5850EC] hover:bg-[#4F46E5] text-white font-semibold text-xs tracking-wide transition-all shadow-[0_4px_12px_rgba(88,80,236,0.25)]"
        >
          <span>Synchronize Personal Telemetry Twin</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default AstronautIdentificationModal;
