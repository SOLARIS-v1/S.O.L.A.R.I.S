import React from 'react';
import { FindingLevel } from '../../api/types';
import { CheckCircle2, AlertTriangle, AlertCircle, Octagon } from 'lucide-react';

interface StatusBadgeProps {
  level: FindingLevel;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  level,
  showLabel = true,
  size = 'md',
  pulse = false,
  className = '',
}) => {
  const config = {
    normal: {
      color: 'text-[#059669]',
      bg: 'bg-[#10B981]/15',
      border: 'border-[#10B981]/30',
      fill: '#10B981',
      label: 'Healthy',
      icon: CheckCircle2,
    },
    watch: {
      color: 'text-[#D97706]',
      bg: 'bg-[#F59E0B]/15',
      border: 'border-[#F59E0B]/30',
      fill: '#F59E0B',
      label: 'Watch',
      icon: AlertTriangle,
    },
    review: {
      color: 'text-[#D97706]',
      bg: 'bg-[#F59E0B]/20',
      border: 'border-[#F59E0B]/40',
      fill: '#F59E0B',
      label: 'Review',
      icon: AlertCircle,
    },
    urgent: {
      color: 'text-[#DC2626]',
      bg: 'bg-[#EF4444]/15',
      border: 'border-[#EF4444]/35',
      fill: '#EF4444',
      label: 'Critical',
      icon: Octagon,
    },
  }[level];

  const IconComponent = config.icon;
  const isAbnormal = level !== 'normal';
  const shouldPulse = pulse || isAbnormal;

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  const textSizes = {
    sm: 'text-[10px] px-2 py-0.5 font-mono',
    md: 'text-[11px] px-2.5 py-0.5 font-mono',
    lg: 'text-xs px-3 py-1 font-mono',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-mono font-medium tracking-wide border ${config.bg} ${config.border} ${config.color} ${textSizes[size]} ${className}`}
    >
      <span className={`relative flex items-center justify-center ${shouldPulse ? 'animate-subtle-pulse' : ''}`}>
        <IconComponent className={iconSizes[size]} />
      </span>
      {showLabel && <span>{config.label}</span>}
    </span>
  );
};
