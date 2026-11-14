import React, { useState } from 'react';
import { useAstraStore } from '../../api/mockClient';
import { CrewMember } from '../../api/types';
import { StatusBadge } from '../common/StatusBadge';
import { User, ShieldCheck, ArrowRight, Sparkles, Activity, Check } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AstronautIdentificationModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  const { crew, activeSubjectId, setActiveSubject } = useAstraStore();
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
      useAstraStore.setState(state => ({
        crew: [...state.crew, newCrew],
        activeSubjectId: newId,
      }));
    } else {
      setActiveSubject(selectedId);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 font-mono">
      <div className="w-full max-w-xl rounded-2xl bg-[#FFFFFF] border border-[#CBD5E1] shadow-2xl p-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0EA5E9]/10 border border-[#0EA5E9]/30 text-xs text-[#0284C7] font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>ASTRA // BIOMETRIC IDENTIFICATION</span>
          </div>
          <h2 className="text-xl font-bold tracking-wider text-[#0F172A] uppercase">
            Identify Crew Member
          </h2>
          <p className="text-xs text-[#64748B] max-w-md mx-auto">
            Select your astronaut profile to initialize your personalized 3D anatomical twin, wearable biosensors, and private telemetry records.
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex rounded-xl bg-[#F1F5F9] p-1 border border-[#E2E8F0] text-xs">
          <button
            onClick={() => setIsCustom(false)}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              !isCustom
                ? 'bg-[#FFFFFF] text-[#0284C7] font-bold border border-[#CBD5E1] shadow-sm'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            Expedition Roster (4 Astronauts)
          </button>
          <button
            onClick={() => setIsCustom(true)}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              isCustom
                ? 'bg-[#FFFFFF] text-[#0284C7] font-bold border border-[#CBD5E1] shadow-sm'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            + New Astronaut Profile
          </button>
        </div>

        {/* Option 1: Existing Roster */}
        {!isCustom ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {crew.map(c => {
              const isSelected = selectedId === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                    isSelected
                      ? 'bg-[#F0F9FF] border-[#0EA5E9] ring-2 ring-[#0EA5E9]/20 shadow-sm'
                      : 'bg-[#F8FAFC] border-[#E2E8F0] hover:border-[#CBD5E1] hover:bg-[#FFFFFF]'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border ${
                      isSelected
                        ? 'bg-[#0284C7] text-white border-[#0284C7]'
                        : 'bg-[#E2E8F0] text-[#475569] border-[#CBD5E1]'
                    }`}
                  >
                    {c.callsign.substring(0, 2)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#0F172A] truncate">
                        {c.name}
                      </span>
                      <StatusBadge level={c.status} showLabel={false} size="sm" />
                    </div>
                    <span className="text-[10px] text-[#64748B] block truncate mt-0.5">
                      {c.role} ({c.gender})
                    </span>
                    <span className="text-[9px] text-[#0284C7] block truncate mt-1 font-bold">
                      Twin: {c.gender === 'female' ? 'Female Anatomical Model' : 'Male Anatomical Model'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Option 2: Custom Astronaut Input */
          <div className="space-y-3 p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs">
            <div className="space-y-1">
              <label className="text-[10px] text-[#64748B] uppercase font-bold">Astronaut Full Name</label>
              <input
                type="text"
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                placeholder="e.g. Alex Rivera"
                className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-lg p-2.5 text-[#0F172A] focus:outline-none focus:border-[#0EA5E9]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-[#64748B] uppercase font-bold">Callsign</label>
                <input
                  type="text"
                  value={customCallsign}
                  onChange={e => setCustomCallsign(e.target.value)}
                  placeholder="e.g. Apex"
                  className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-lg p-2.5 text-[#0F172A] focus:outline-none focus:border-[#0EA5E9]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-[#64748B] uppercase font-bold">Mission Role</label>
                <select
                  value={customRole}
                  onChange={e => setCustomRole(e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-lg p-2.5 text-[#0F172A] focus:outline-none focus:border-[#0EA5E9]"
                >
                  <option value="Flight Engineer">Flight Engineer</option>
                  <option value="Mission Commander">Mission Commander</option>
                  <option value="Medical Specialist">Medical Specialist</option>
                  <option value="Payload Scientist">Payload Scientist</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <label className="text-[10px] text-[#64748B] uppercase font-bold block">
                3D Anatomical Twin Gender
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCustomGender('female')}
                  className={`p-2.5 rounded-lg border text-center transition-all ${
                    customGender === 'female'
                      ? 'bg-[#0284C7] border-[#0284C7] text-white font-bold'
                      : 'bg-[#FFFFFF] border-[#CBD5E1] text-[#64748B]'
                  }`}
                >
                  Female Anatomy Model
                </button>
                <button
                  type="button"
                  onClick={() => setCustomGender('male')}
                  className={`p-2.5 rounded-lg border text-center transition-all ${
                    customGender === 'male'
                      ? 'bg-[#0284C7] border-[#0284C7] text-white font-bold'
                      : 'bg-[#FFFFFF] border-[#CBD5E1] text-[#64748B]'
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
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-[#0284C7] to-[#0EA5E9] hover:from-[#0EA5E9] hover:to-[#38BDF8] text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md"
        >
          <span>Synchronize Personal Telemetry Twin</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
