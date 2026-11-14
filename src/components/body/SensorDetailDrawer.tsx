import React from 'react';
import { WearableSensor, HealthRecord, Finding } from '../../api/types';
import { INDICATOR_THRESHOLDS } from '../../data/thresholds';
import { computeBaseline, computeRobustZScore } from '../../mock/engine';
import { StatusBadge } from '../common/StatusBadge';
import { SimulatedBadge } from '../common/SimulatedBadge';
import { X, Cpu, Radio, ShieldAlert, ArrowUpRight, ArrowDownRight, ExternalLink } from 'lucide-react';

interface SensorDetailDrawerProps {
  sensor: WearableSensor | null;
  records: HealthRecord[];
  findings: Finding[];
  onClose: () => void;
  onOpenHazard: (hazardId: string) => void;
}

export const SensorDetailDrawer: React.FC<SensorDetailDrawerProps> = ({
  sensor,
  records,
  findings,
  onClose,
  onOpenHazard,
}) => {
  if (!sensor) return null;

  const relevantFindings = findings.filter(f =>
    sensor.metrics.some(m => f.indicators.includes(m))
  );

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[#FFFFFF] border-l border-[#E2E8F0] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200 font-mono">
      {/* Header */}
      <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0EA5E9]/10 border border-[#0EA5E9]/30 flex items-center justify-center text-[#0284C7] shadow-sm">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#0EA5E9]/15 text-[#0284C7] border border-[#0EA5E9]/30">
                {sensor.code}
              </span>
              <h2 className="text-sm font-bold text-[#0F172A] uppercase tracking-wider">
                {sensor.name}
              </h2>
            </div>
            <span className="text-[10px] text-[#64748B] uppercase">
              {sensor.hardware}
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
        {/* Hardware Specs Strip */}
        <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-[10px] text-[#64748B] uppercase block">Anatomical Site</span>
            <span className="text-[#0F172A] font-semibold">{sensor.anatomical_site}</span>
          </div>
          <div>
            <span className="text-[10px] text-[#64748B] uppercase block">Sampling Mode</span>
            <span className="text-[#0284C7] font-semibold">{sensor.sample_frequency}</span>
          </div>
        </div>

        {/* Operational Sensor Description */}
        <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
          <span className="text-[10px] uppercase tracking-wider text-[#0284C7] font-bold block">
            Spaceflight Biosensing Architecture
          </span>
          <p className="text-xs text-[#475569] leading-relaxed">
            {sensor.description}
          </p>
        </div>

        {/* Monitored Metrics with Live Values & Baseline Bands */}
        <div className="space-y-2">
          <span className="text-[11px] uppercase tracking-wider text-[#64748B] block">
            Integrated Data Streams
          </span>

          {sensor.metrics.map(metric => {
            const threshold = INDICATOR_THRESHOLDS[metric];
            if (!threshold) return null;

            const list = records
              .filter(r => r.type === metric && r.quality === 'ok')
              .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

            const latest = list[list.length - 1];
            const base = computeBaseline(records, metric);
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
                key={metric}
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
                    <span className="text-2xl font-bold tabular-nums text-[#0F172A]">{val}</span>
                    <span className="text-xs text-[#64748B]">{threshold.unit}</span>
                    <span
                      className={`text-[11px] flex items-center ${
                        diff > 0 ? 'text-[#D97706]' : 'text-[#0284C7]'
                      }`}
                    >
                      {diff > 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                      {diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1)} vs base ({base.median})
                    </span>
                  </div>
                </div>

                <StatusBadge level={lvl} size="sm" />
              </div>
            );
          })}
        </div>

        {/* Active Findings for this Hardware Sensor */}
        {relevantFindings.length > 0 && (
          <div className="space-y-2">
            <span className="text-[11px] uppercase tracking-wider text-[#D97706] block font-bold">
              Flagged Anomalies ({relevantFindings.length})
            </span>
            {relevantFindings.map(f => (
              <div
                key={f.id}
                className="p-3.5 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <StatusBadge level={f.level} size="sm" />
                  <span className="text-[10px] text-[#64748B]">
                    {f.rule_triggered}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-[#0F172A]">{f.summary}</h4>
                <p className="text-xs text-[#475569] leading-relaxed">{f.detail}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
