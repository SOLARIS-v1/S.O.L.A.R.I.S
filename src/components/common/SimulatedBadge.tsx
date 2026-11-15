import React from 'react';
import { Cpu } from 'lucide-react';

interface SimulatedBadgeProps {
  size?: 'sm' | 'md';
  className?: string;
  label?: string;
}

export const SimulatedBadge: React.FC<SimulatedBadgeProps> = ({
  size = 'md',
  className = '',
  label = 'SIMULATED DATA',
}) => {
  const isSm = size === 'sm';
  return (
    <span
      className={`inline-flex items-center gap-1 font-mono tracking-wider uppercase rounded-full border border-[#9D8EC2]/40 bg-[#9D8EC2]/15 text-[#9D8EC2] font-semibold ${
        isSm ? 'text-[9px] px-2 py-0.5' : 'text-[10px] px-2.5 py-0.5'
      } ${className}`}
      title="Synthetically generated telemetry record (Offline Simulation)"
    >
      <Cpu className={isSm ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
      <span>{label}</span>
    </span>
  );
};
export default SimulatedBadge;
