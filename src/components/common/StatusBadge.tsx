import React from 'react';
import { FindingLevel } from '../../api/types';
import { CheckCircle2, AlertTriangle, AlertCircle, Octagon } from 'lucide-react';

interface StatusBadgeProps {
  level: FindingLevel | 'simulated';
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
  const configMap: Record<
    string,
    { color: string; bg: string; border: string; label: string; icon: React.FC<{ className?: string }> }
  > = {
    normal: {
      color: 'text-[#4EBE8E]',
      bg: 'bg-[#4EBE8E]/15',
      border: 'border-[#4EBE8E]/35',
      label: 'Nominal',
      icon: CheckCircle2,
    },
    watch: {
      color: 'text-[#E0B042]',
      bg: 'bg-[#E0B042]/15',
      border: 'border-[#E0B042]/35',
      label: 'Observation',
      icon: AlertTriangle,
    },
    observation: {
      color: 'text-[#E0B042]',
      bg: 'bg-[#E0B042]/15',
      border: 'border-[#E0B042]/35',
      label: 'Observation',
      icon: AlertTriangle,
    },
    review: {
      color: 'text-[#E58540]',
      bg: 'bg-[#E58540]/20',
      border: 'border-[#E58540]/40',
      label: 'Review',
      icon: AlertCircle,
    },
    urgent: {
      color: 'text-[#DE5852]',
      bg: 'bg-[#DE5852]/20',
      border: 'border-[#DE5852]/40',
      label: 'Urgent',
      icon: Octagon,
    },
    simulated: {
      color: 'text-[#9D8EC2]',
      bg: 'bg-[#9D8EC2]/20',
      border: 'border-[#9D8EC2]/40',
      label: 'Simulated',
      icon: AlertCircle,
    },
  };

  const config = configMap[level] || configMap.normal;
  const IconComponent = config.icon;
  const isAbnormal = level !== 'normal';
  const shouldPulse = pulse || isAbnormal;

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  const textSizes = {
    sm: 'text-[9.5px] px-2 py-0.5 font-mono',
    md: 'text-[10.5px] px-2.5 py-0.5 font-mono',
    lg: 'text-xs px-3 py-1 font-mono',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-mono font-medium tracking-wide border ${config.bg} ${config.border} ${config.color} ${textSizes[size]} ${className}`}
    >
      <span className={`relative flex items-center justify-center ${shouldPulse ? 'animate-pulse' : ''}`}>
        <IconComponent className={iconSizes[size]} />
      </span>
      {showLabel && <span>{config.label}</span>}
    </span>
  );
};
export default StatusBadge;
