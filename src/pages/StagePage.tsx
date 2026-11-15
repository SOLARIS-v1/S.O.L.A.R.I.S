import React, { useState } from 'react';
import { useSolaris } from '../context/SolarisContext';
import { useAstraStore } from '../api/mockClient';
import { BodyRegion } from '../api/types';
import { SystemStatusDials } from '../components/hud/SystemStatusDials';
import { HolographicBodyCenter } from '../components/hud/HolographicBodyCenter';
import { SystemDetailDrawer } from '../components/stage/SystemDetailDrawer';
import { HazardSideDrawer } from '../components/hazards/HazardSideDrawer';
import {
  Heart,
  Activity,
  Droplets,
  Radio,
  Thermometer,
  ShieldCheck,
  Calendar,
  MessageSquare,
  Clock,
  User,
  ChevronDown,
  Box,
  Eye,
  Plus,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

export const StagePage: React.FC = () => {
  const { activeCrew, sendInput } = useSolaris();
  const { records, activeSubjectId, findings } = useAstraStore();

  const [activeTab, setActiveTab] = useState<'ecg' | '3d'>('ecg');
  const [selectedRegion, setSelectedRegion] = useState<BodyRegion | null>(null);
  const [activeHazardId, setActiveHazardId] = useState<string | null>(null);

  const subjectRecords = records.filter((r) => r.subject_id === activeSubjectId);

  const vitals = activeCrew?.vitals || {
    heartRate: 78,
    hrv: 42,
    spo2: 98.4,
    respRate: 14.2,
    coreTemp: 37.1,
    radiation_mSv: 54.8,
    sleepHours: 6.8,
  };

  const isVance = activeCrew?.id === 'vance';
  const isChen = activeCrew?.id === 'chen';

  // Overall health index
  const healthScore = isVance ? 78 : isChen ? 69 : 94;

  return (
    <div className="w-full min-h-screen bg-[#F4F7FC] p-3 lg:p-6 select-none font-sans text-slate-800 space-y-5">
      {/* Top Banner Row: Patient Details + Add Record CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">
            {activeCrew ? activeCrew.name : 'Commander A. Vance'}
          </h2>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 font-mono">
            <span>EXPEDITION-64</span>
            <span>&middot;</span>
            <span className="font-semibold text-indigo-600">
              {activeCrew ? activeCrew.role : 'Mission Commander'}
            </span>
            <span>&middot;</span>
            <span>Sol 142 / 500</span>
          </div>
        </div>

        {/* View Toggle (ECG Waveform vs 3D Anatomical Twin) */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200/80 shadow-sm text-xs font-mono">
            <button
              onClick={() => setActiveTab('ecg')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'ecg'
                  ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>ECG Telemetry</span>
            </button>
            <button
              onClick={() => setActiveTab('3d')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === '3d'
                  ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>3D Digital Twin</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: 9 Cols (Dashboard) + 3 Cols (Right Sidebar Consults) */}
      <div className="grid grid-cols-12 gap-5">
        {/* Left 9 Columns */}
        <div className="col-span-12 xl:col-span-8 space-y-5">
          {/* Top 4 Metric Cards (Matching Screenshot) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Featured Royal Indigo Card: Heart Rate (Matching purple card in screenshot) */}
            <div className="bg-[#5046E5] text-white rounded-2xl p-4 shadow-[0_10px_25px_-5px_rgba(80,70,229,0.4)] flex flex-col justify-between relative overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between text-xs text-indigo-100 font-medium">
                <span>Heart Rate</span>
                <Heart className="w-4 h-4 text-indigo-200 fill-current opacity-80" />
              </div>

              {/* Big Bold Value */}
              <div className="my-3">
                <span className="text-3xl font-bold tracking-tight">
                  {vitals.heartRate}
                  <span className="text-xl font-normal opacity-80">/120</span>
                </span>
                <span className="text-[10px] block opacity-75 font-mono mt-0.5">
                  BPM · Astroskin 3-Lead ECG
                </span>
              </div>

              {/* Mini Sparkline with vertex dots (like screenshot) */}
              <div className="flex items-end justify-between pt-2 border-t border-indigo-400/30 text-[9px] font-mono">
                <div className="flex flex-col text-indigo-200 text-[8px] leading-tight">
                  <span>160</span>
                  <span>140</span>
                  <span>120</span>
                </div>
                <div className="flex-1 h-8 px-2 flex items-center">
                  <svg viewBox="0 0 100 24" className="w-full h-full overflow-visible">
                    <polyline
                      fill="none"
                      stroke="#FFFFFF"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points="0,18 25,12 50,20 75,10 100,6"
                    />
                    {[
                      [0, 18],
                      [25, 12],
                      [50, 20],
                      [75, 10],
                      [100, 6],
                    ].map(([x, y], i) => (
                      <circle key={i} cx={x} cy={y} r="2.5" fill="#FFFFFF" />
                    ))}
                  </svg>
                </div>
              </div>
            </div>

            {/* 2. Core Temp / Fever Card (Matching screenshot) */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Core Temp</span>
                <Heart className="w-4 h-4 text-slate-300" />
              </div>

              <div className="my-3">
                <span className="text-3xl font-bold text-slate-800 tracking-tight">
                  {vitals.coreTemp.toFixed(1)}
                  <span className="text-lg font-normal text-slate-400"> °C</span>
                </span>
                <span className="text-[10px] block text-slate-400 font-mono mt-0.5">
                  Thermistor Sensor Nominal
                </span>
              </div>

              {/* Mini Sparkline with vertex dots */}
              <div className="flex items-end justify-between pt-2 border-t border-slate-100 text-[9px] font-mono">
                <div className="flex flex-col text-slate-300 text-[8px] leading-tight">
                  <span>38.0</span>
                  <span>37.0</span>
                  <span>36.0</span>
                </div>
                <div className="flex-1 h-8 px-2 flex items-center">
                  <svg viewBox="0 0 100 24" className="w-full h-full overflow-visible">
                    <polyline
                      fill="none"
                      stroke="#5046E5"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points="0,16 25,14 50,8 75,8 100,10"
                    />
                    {[
                      [0, 16],
                      [25, 14],
                      [50, 8],
                      [75, 8],
                      [100, 10],
                    ].map(([x, y], i) => (
                      <circle key={i} cx={x} cy={y} r="2.5" fill="#5046E5" />
                    ))}
                  </svg>
                </div>
              </div>
            </div>

            {/* 3. Blood Pressure Card (Matching screenshot) */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Blood Pressure</span>
                <Activity className="w-4 h-4 text-indigo-500" />
              </div>

              <div className="my-2 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-slate-800 font-mono">118</span>
                  <span className="text-xs text-slate-400 font-mono uppercase">Upper</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-slate-800 font-mono">76</span>
                  <span className="text-xs text-slate-400 font-mono uppercase">Lower</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400 text-[10px]">MAP</span>
                <span className="font-bold text-slate-700">90.0 mmHg</span>
              </div>
            </div>

            {/* 4. Overall Health Score Card (Circular graph matching prompt + screenshot) */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Health Score</span>
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-bold text-[9px] flex items-center gap-0.5">
                  <TrendingUp className="w-2.5 h-2.5" />
                  +12%
                </span>
              </div>

              <div className="my-1.5 flex items-center justify-around gap-2">
                {/* Circular Radial Score Graph */}
                <div className="relative flex items-center justify-center">
                  <svg width="68" height="68" className="-rotate-90 transform">
                    <circle cx="34" cy="34" r="28" stroke="#EEF2FF" strokeWidth="6" fill="transparent" />
                    <circle
                      cx="34"
                      cy="34"
                      r="28"
                      stroke="#5046E5"
                      strokeWidth="6"
                      strokeDasharray={2 * Math.PI * 28}
                      strokeDashoffset={2 * Math.PI * 28 * (1 - healthScore / 100)}
                      strokeLinecap="round"
                      fill="transparent"
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-lg font-black text-slate-900 font-mono leading-none">
                      {healthScore}
                    </span>
                    <span className="text-[8px] text-slate-400 font-mono">/100</span>
                  </div>
                </div>

                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-800">Overall Index</span>
                  <span className="text-[10px] text-emerald-600 font-mono font-semibold">+12% Yesterday</span>
                  <span className="text-[9px] text-indigo-600 font-mono font-medium mt-0.5">AI Readings Evaluated</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10.5px]">
                <span className="text-slate-400 font-mono">AI Status</span>
                <span className={`font-bold font-mono text-[10px] ${
                  healthScore >= 85 ? 'text-emerald-600' : healthScore >= 70 ? 'text-amber-600' : 'text-rose-600'
                }`}>
                  {healthScore >= 85 ? 'NOMINAL // CLEAR' : healthScore >= 70 ? 'CAUTION // MONITOR' : 'DEFICIT'}
                </span>
              </div>
            </div>
          </div>

          {/* Middle Row: Large Heart ECG Waveform or 3D Twin (2/3) + Medical Officer Card (1/3) */}
          <div className="grid grid-cols-12 gap-5">
            {/* Heart ECG Waveform or 3D Twin (cols 1-8) */}
            <div className="col-span-12 lg:col-span-8 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
              {activeTab === 'ecg' ? (
                <>
                  {/* Card Header matching screenshot */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 tracking-tight">
                        Heart ECG
                      </h3>
                      <p className="text-xs text-slate-400 font-mono">
                        1 - 7 December 2026 &middot; Astroskin Lead-II
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 font-mono font-bold text-xs">
                        72 bmp <span className="font-normal text-slate-500">Average</span>
                      </span>
                    </div>
                  </div>

                  {/* High-Fidelity ECG Waveform matching screenshot */}
                  <div className="relative py-4 my-2">
                    {/* Active Tooltip Pill (matching screenshot's 70/120 badge) */}
                    <div className="absolute top-2 left-[56%] -translate-x-1/2 px-2.5 py-1 rounded-lg bg-[#1E293B] text-white text-[10px] font-mono font-bold shadow-md z-10 flex items-center gap-1">
                      <span>70/120</span>
                    </div>

                    <div className="w-full h-44">
                      <svg viewBox="0 0 500 120" className="w-full h-full overflow-visible">
                        {/* Horizontal Grid lines */}
                        <line x1="0" y1="20" x2="500" y2="20" stroke="#F1F5F9" strokeWidth="1" />
                        <line x1="0" y1="50" x2="500" y2="50" stroke="#F1F5F9" strokeWidth="1" />
                        <line x1="0" y1="80" x2="500" y2="80" stroke="#F1F5F9" strokeWidth="1" />
                        <line x1="0" y1="110" x2="500" y2="110" stroke="#F1F5F9" strokeWidth="1" />

                        {/* Characteristic ECG P-Q-R-S-T wave curve styled in royal indigo like screenshot */}
                        <path
                          d="M 0,70 Q 20,70 30,65 Q 40,70 50,70 L 60,78 L 70,25 L 80,95 L 90,68 Q 110,55 125,70 L 140,70 Q 155,70 165,65 L 175,70 L 185,78 L 195,20 L 205,98 L 215,68 Q 235,55 250,70 L 265,70 L 275,70 L 285,110 L 295,15 L 305,85 L 315,68 Q 330,68 350,70 L 370,70 Q 380,65 390,70 L 400,78 L 410,28 L 420,92 L 430,68 Q 450,55 465,70 L 500,70"
                          fill="none"
                          stroke="#5046E5"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />

                        {/* Highlight dot under tooltip */}
                        <circle cx="280" cy="70" r="4" fill="#5046E5" />
                        <circle cx="280" cy="70" r="8" fill="#5046E5" opacity="0.2" />
                      </svg>
                    </div>

                    {/* X-Axis Days of Week (Matching screenshot) */}
                    <div className="flex items-center justify-between text-xs font-mono text-slate-400 pt-2 border-t border-slate-100 px-2">
                      <span>Sun</span>
                      <span>Mon</span>
                      <span>Tue</span>
                      <span className="font-bold text-indigo-600">Wed</span>
                      <span>Thu</span>
                      <span>Fri</span>
                      <span>Sat</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="w-full h-80 flex flex-col">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                    <span className="text-xs font-bold text-slate-800">3D Holographic Digital Twin</span>
                    <span className="text-[10px] font-mono text-slate-400">Interactive Organ Inspector</span>
                  </div>
                  <div className="flex-1 w-full relative">
                    <HolographicBodyCenter onSelectZone={(z) => setSelectedRegion(z as BodyRegion)} />
                  </div>
                </div>
              )}
            </div>

            {/* Medical Officer Card (cols 9-12) (Matching screenshot's Linh Nguyen card) */}
            <div className="col-span-12 lg:col-span-4 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between items-center text-center">
              {/* Avatar with online dot */}
              <div className="relative">
                <div className="w-14 h-14 rounded-full bg-slate-900 overflow-hidden border-2 border-white shadow-md flex items-center justify-center text-white font-bold text-lg">
                  <User className="w-7 h-7 text-indigo-300" />
                </div>
                <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white" />
              </div>

              <div className="my-2">
                <h4 className="text-sm font-bold text-slate-900">Dr. Mike Taylor</h4>
                <p className="text-xs text-slate-400">Lead Flight Surgeon</p>
              </div>

              {/* Mini Wave Graph */}
              <div className="w-full h-10 px-4 my-2">
                <svg viewBox="0 0 100 24" className="w-full h-full overflow-visible">
                  <path
                    d="M 0,16 Q 25,6 50,18 T 100,10"
                    fill="none"
                    stroke="#5046E5"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              <div className="my-1">
                <span className="text-2xl font-extrabold text-slate-900 font-mono">852</span>
                <span className="text-[10px] block text-slate-400 uppercase tracking-wider font-semibold">
                  Packets Verified
                </span>
              </div>

              {/* Message Button matching screenshot */}
              <button
                onClick={() => sendInput('Read my health')}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                <span>Message & Consult</span>
              </button>
            </div>
          </div>

          {/* Bottom 4 Quick Cards (Matching screenshot bottom row) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* 1. Blood Pressure (Droplets icon) */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                <Droplets className="w-5 h-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] text-slate-400 block truncate">Blood Pressure</span>
                <span className="text-sm font-bold text-slate-800 font-mono">118/76 mmHg</span>
              </div>
            </div>

            {/* 2. Heart Rate (Heart icon) */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <Heart className="w-5 h-5 text-rose-600" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] text-slate-400 block truncate">Heart Rate</span>
                <span className="text-sm font-bold text-slate-800 font-mono">{vitals.heartRate} bpm</span>
              </div>
            </div>

            {/* 3. SpO2 Oxygen (Sensor icon) */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                <Activity className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] text-slate-400 block truncate">SpO2 Level</span>
                <span className="text-sm font-bold text-slate-800 font-mono">{vitals.spo2}%</span>
              </div>
            </div>

            {/* 4. Radiation Dose (Dosimeter icon) */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                <Radio className="w-5 h-5 text-purple-600" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] text-slate-400 block truncate">Daily Dose</span>
                <span className="text-sm font-bold text-slate-800 font-mono">0.12 mSv/d</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 4 Columns: Clinical Review Console & Scheduled Appointments (Matching screenshot right rail) */}
        <div className="col-span-12 xl:col-span-4 space-y-5">
          {/* Top Flight Surgeon Card (matching screenshot's Dr. Mike Taylor top right card) */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-400 flex items-center justify-center text-white font-bold text-base shadow-sm shrink-0">
              <User className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-slate-900 leading-tight">
                Dr. Mike Taylor
              </h4>
              <p className="text-xs text-slate-500 font-mono">
                Heart Specialist &middot; Flight Surgeon
              </p>
            </div>
          </div>

          {/* Scheduled Appointments Section (matching screenshot) */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Scheduled Consultations
              </h3>
              <span className="text-xs text-indigo-600 font-semibold cursor-pointer hover:underline">
                View All
              </span>
            </div>

            {/* Consult Card 1 (Routine Checkup) */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[9px] font-bold">
                  Routine Checkup
                </span>
                <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                  <Clock className="w-3 h-3 text-indigo-500" />
                  Starts in 25 m
                </span>
              </div>

              <div>
                <h5 className="text-xs font-bold text-slate-800">
                  Commander Vance &middot; Standard Consult
                </h5>
                <span className="text-[10px] text-slate-400 font-mono">
                  10:30am - 11:00am UTC &middot; Telemetry Sync
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-[9px] font-bold flex items-center justify-center">
                    V
                  </div>
                  <span className="text-[10px] text-slate-600 font-medium">Cmdr. Vance</span>
                </div>
                <button className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 text-[10px] font-semibold transition-colors shadow-2xs">
                  Edit Consult
                </button>
              </div>
            </div>

            {/* Consult Card 2 (Emergency / Arrhythmia) */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[9px] font-bold">
                  Arrhythmia Review
                </span>
                <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                  <Clock className="w-3 h-3 text-rose-500" />
                  Starts in 45 m
                </span>
              </div>

              <div>
                <h5 className="text-xs font-bold text-slate-800">
                  Mike Taylor &middot; Premium Consult
                </h5>
                <span className="text-[10px] text-slate-400 font-mono">
                  11:30am - 12:00pm UTC &middot; Ectopic Jumps
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-rose-100 text-rose-600 text-[9px] font-bold flex items-center justify-center">
                    T
                  </div>
                  <span className="text-[10px] text-slate-600 font-medium">Dr. Taylor</span>
                </div>
                <button className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 text-[10px] font-semibold transition-colors shadow-2xs">
                  Edit Consult
                </button>
              </div>
            </div>

            {/* Consult Card 3 (Vision / SANS) */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[9px] font-bold">
                  SANS Vision Check
                </span>
                <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                  <Clock className="w-3 h-3 text-purple-500" />
                  Starts in 2 h
                </span>
              </div>

              <div>
                <h5 className="text-xs font-bold text-slate-800">
                  Dr. Maya Chen &middot; Amsler Grid Review
                </h5>
                <span className="text-[10px] text-slate-400 font-mono">
                  14:00pm - 14:30pm UTC &middot; Eye Surveillance
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-purple-100 text-purple-600 text-[9px] font-bold flex items-center justify-center">
                    C
                  </div>
                  <span className="text-[10px] text-slate-600 font-medium">Dr. Chen</span>
                </div>
                <button className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 text-[10px] font-semibold transition-colors shadow-2xs">
                  Edit Consult
                </button>
              </div>
            </div>
          </div>

          {/* Full Overall Health Score Circular Gauge */}
          <SystemStatusDials />
        </div>
      </div>

      {/* System Detail Side Drawer */}
      <SystemDetailDrawer
        region={selectedRegion}
        records={subjectRecords}
        findings={findings.filter((f) => f.subject_id === activeSubjectId)}
        onClose={() => setSelectedRegion(null)}
        onOpenHazard={(hid) => setActiveHazardId(hid)}
      />

      {/* NASA Spaceflight Hazards Drawer */}
      <HazardSideDrawer
        hazardId={activeHazardId}
        records={subjectRecords}
        onClose={() => setActiveHazardId(null)}
      />
    </div>
  );
};

export default StagePage;
