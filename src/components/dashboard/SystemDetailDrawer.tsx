import React from 'react';
import { BodyRegion, Finding, HealthRecord, IndicatorType } from '../../api/types';
import { INDICATOR_THRESHOLDS } from '../../data/thresholds';
import { NASA_HAZARDS } from '../../data/hazards';
import { computeBaseline, computeRobustZScore, getEscalationAction } from '../../mock/engine';
import { StatusBadge } from '../common/StatusBadge';
import { SimulatedBadge } from '../common/SimulatedBadge';
import { X, ShieldAlert, ArrowUpRight, ArrowDownRight, ExternalLink, Activity } from 'lucide-react';

interface SystemDetailDrawerProps {
  region: BodyRegion | null;
  records: HealthRecord[];
  findings: Finding[];
  onClose: () => void;
  onOpenHazard: (hazardId: string) => void;
}

export const SystemDetailDrawer: React.FC<SystemDetailDrawerProps> = ({
  region,
  records,
  findings,
  onClose,
  onOpenHazard,
}) => {
  if (!region) return null;

  const configMap: Record<
    BodyRegion,
    { title: string; indicators: IndicatorType[]; hazardId: string; description: string }
  > = {
    head: {
      title: 'Neurobehavioral & Sleep',
      indicators: ['sleep', 'mood', 'fatigue'],
      hazardId: 'isolation',
      description:
        'Circadian misalignment and operational confinement reduce neurobehavioral performance. Recovery sleep architecture is vital for EVA decision fidelity.',
    },
    eyes: {
      title: 'Ocular & Visual (SANS)',
      indicators: ['blood_pressure_sys'],
      hazardId: 'gravity',
      description:
        'Cephalad fluid redistribution drives Spaceflight-Associated Neuro-ocular Syndrome. Papilledema and globe flattening occur without gravity drainage.',
    },
    heart: {
      title: 'Cardiovascular System',
      indicators: ['heart_rate', 'blood_pressure_sys', 'blood_pressure_dia', 'hrv'],
      hazardId: 'gravity',
      description:
        'Cardiovascular deconditioning and myocardial atrophy progress in microgravity. Daily aerobic and resistive exercise preserves stroke volume.',
    },
    lungs: {
      title: 'Cardiopulmonary System',
      indicators: ['spo2', 'respiratory_rate'],
      hazardId: 'environment',
      description:
        'Closed habitability loops demand strict partial pressure monitoring of O2 and CO2. Hypercapnic buildup impairs cognitive processing.',
    },
    abdomen: {
      title: 'Metabolic & Nutrition',
      indicators: ['glucose'],
      hazardId: 'environment',
      description:
        'Insulin sensitivity and metabolic turnover change under prolonged microgravity. Stable fasting glucose verifies caloric and macronutrient balance.',
    },
    skeleton: {
      title: 'Musculoskeletal System',
      indicators: ['fatigue'],
      hazardId: 'gravity',
      description:
        'Bone mineral density loss in weight-bearing trabecular bone exceeds 1% monthly without countermeasures. Heavy resistive loading preserves skeletal integrity.',
    },
    immune: {
      title: 'Immune & Radiation Response',
      indicators: ['temperature', 'heart_rate', 'radiation_rate'],
      hazardId: 'radiation',
      description:
        'Deep space galactic cosmic radiation and T-cell suppression heighten infection vulnerability. Thermal spikes signal acute systemic activation.',
    },
    wrist: {
      title: 'Peripheral Hemodynamics (Wrist PPG)',
      indicators: ['spo2', 'heart_rate'],
      hazardId: 'distance',
      description:
        'Continuous pulse oximetry and peripheral perfusion index from the AstroSkin wrist unit monitor microvascular tone.',
    },
    arm: {
      title: 'Brachial Hemodynamics (Cuff)',
      indicators: ['blood_pressure_sys', 'blood_pressure_dia'],
      hazardId: 'gravity',
      description:
        'Automated oscillometric brachial cuff evaluates systemic arterial pressure and mean arterial vascular resistance.',
    },
    pelvis: {
      title: 'Locomotor & Biomechanics (Pelvic Tri-Axial)',
      indicators: ['activity_minutes'],
      hazardId: 'gravity',
      description:
        'AstroSkin pelvic 3-axis accelerometer tracks operational countermeasure adherence, cadence, and active microgravity movement.',
    },
  };

  const currentSystem = configMap[region];
  const linkedHazard = NASA_HAZARDS.find(h => h.id === currentSystem.hazardId);
  const relevantFindings = findings.filter(f => f.body_region === region);

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[#FFFFFF] border-l border-[#E2E8F0] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200 font-mono text-slate-800">
      {/* Header */}
      <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#0EA5E9]/15 border border-[#0EA5E9]/30 flex items-center justify-center text-[#0284C7]">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#0F172A] uppercase tracking-wider">
              {currentSystem.title}
            </h2>
            <span className="text-[10px] text-[#64748B] uppercase">
              Physiological Subsystem
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#E2E8F0] transition-colors"
          title="Close drawer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Physiological Description */}
        <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
          <p className="text-xs text-[#64748B] leading-relaxed">
            {currentSystem.description}
          </p>
        </div>

        {/* Linked NASA Spaceflight Hazard Chip */}
        {linkedHazard && (
          <div
            onClick={() => onOpenHazard(linkedHazard.id)}
            className="p-3.5 rounded-xl bg-[#F0F9FF] border border-[#BAE6FD] hover:border-[#0284C7] cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-[#0284C7]" />
                <span className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                  Hazard: {linkedHazard.name}
                </span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-[#64748B] group-hover:text-[#0284C7] transition-colors" />
            </div>
            <p className="text-[11px] text-[#475569] line-clamp-2">
              {linkedHazard.description}
            </p>
            <div className="mt-2 text-[10px] text-[#0284C7] font-bold">
              Click to view NASA hazard intelligence →
            </div>
          </div>
        )}

        {/* Active System Findings */}
        {relevantFindings.length > 0 && (
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
              Active Findings ({relevantFindings.length})
            </span>
            {relevantFindings.map(f => {
              const action = getEscalationAction(f.level);
              return (
                <div
                  key={f.id}
                  className="p-3.5 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <StatusBadge level={f.level} size="sm" />
                    <span className="text-[10px] text-[#64748B]">
                      {f.rule_triggered}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-[#0F172A]">{f.summary}</p>
                  <p className="text-[11px] text-[#475569] leading-normal">{f.detail}</p>
                  <div className="pt-2 border-t border-[#FDE68A] flex items-center justify-between text-[10px] text-[#64748B]">
                    <span>Observed: <strong className="text-[#DC2626]">{f.observed_value}</strong></span>
                    <span>Baseline: <strong className="text-[#059669]">{f.baseline_value}</strong></span>
                  </div>
                  <div className="p-2 rounded-lg bg-white/60 text-[10px] text-[#D97706] font-bold">
                    Action: {action.text}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Indicators List for this System */}
        <div className="space-y-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
            Subsystem Telemetry
          </span>
          {currentSystem.indicators.map(ind => {
            const threshold = INDICATOR_THRESHOLDS[ind];
            const list = records
              .filter(r => r.type === ind && r.quality === 'ok')
              .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

            const latest = list[list.length - 1];
            const base = computeBaseline(records, ind);
            const val = latest ? latest.value : threshold.default_baseline;
            const diff = val - base.median;
            const z = computeRobustZScore(val, base);

            let lvl: 'normal' | 'watch' | 'review' | 'urgent' = 'normal';
            if (threshold.urgent_low !== undefined && val <= threshold.urgent_low) lvl = 'urgent';
            else if (threshold.urgent_high !== undefined && val >= threshold.urgent_high) lvl = 'urgent';
            else if (Math.abs(z) >= 3.0) lvl = 'review';
            else if (Math.abs(z) >= 2.0) lvl = 'watch';

            return (
              <div
                key={ind}
                className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-[#0F172A]">
                      {threshold.label}
                    </span>
                    {latest?.is_simulated && <SimulatedBadge size="sm" />}
                  </div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-xl font-bold tabular-nums text-[#0F172A]">{val}</span>
                    <span className="text-xs text-[#64748B]">{threshold.unit}</span>
                    <span
                      className={`text-[11px] font-bold flex items-center ${
                        diff > 0 ? 'text-[#EA580C]' : 'text-[#0284C7]'
                      }`}
                    >
                      {diff > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1)} vs base
                    </span>
                  </div>
                </div>

                <StatusBadge level={lvl} showLabel={false} size="sm" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
