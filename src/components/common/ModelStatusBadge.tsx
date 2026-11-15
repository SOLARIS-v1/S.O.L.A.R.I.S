import React from 'react';
import { ShieldCheck, AlertTriangle, Activity, Eye, Zap, Lock, Info } from 'lucide-react';

export type MLModelStatusType =
  | 'available'
  | 'experimental'
  | 'exploratory'
  | 'observational'
  | 'quarantined';

interface ModelStatusBadgeProps {
  status: MLModelStatusType;
  modelId?: string;
  showDetails?: boolean;
  className?: string;
}

export const ModelStatusBadge: React.FC<ModelStatusBadgeProps> = ({
  status,
  modelId,
  showDetails = false,
  className = '',
}) => {
  const metaMap: Record<
    MLModelStatusType,
    { label: string; bg: string; border: string; text: string; icon: React.FC<{ className?: string }> }
  > = {
    available: {
      label: 'Model Available (Statistical Score)',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-800',
      icon: ShieldCheck,
    },
    experimental: {
      label: 'Experimental Research Only',
      bg: 'bg-indigo-50',
      border: 'border-indigo-200',
      text: 'text-indigo-800',
      icon: Activity,
    },
    exploratory: {
      label: 'Exploratory PCA Projection',
      bg: 'bg-teal-50',
      border: 'border-teal-200',
      text: 'text-teal-800',
      icon: Zap,
    },
    observational: {
      label: 'Observational Data Only',
      bg: 'bg-sky-50',
      border: 'border-sky-200',
      text: 'text-sky-800',
      icon: Eye,
    },
    quarantined: {
      label: 'Quarantined / Disabled',
      bg: 'bg-amber-50',
      border: 'border-amber-300',
      text: 'text-amber-800',
      icon: Lock,
    },
  };

  const meta = metaMap[status] || metaMap.observational;
  const Icon = meta.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-mono font-semibold border ${meta.bg} ${meta.border} ${meta.text} ${className}`}
      title={modelId ? `Model ID: ${modelId}` : undefined}
    >
      <Icon className="w-3.5 h-3.5" />
      <span>{meta.label}</span>
    </span>
  );
};

export default ModelStatusBadge;
