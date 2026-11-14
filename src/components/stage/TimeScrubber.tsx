import React, { useMemo } from 'react';
import { Finding, FindingLevel } from '../../api/types';
import { RotateCcw } from 'lucide-react';

interface TimeScrubberProps {
  currentDay: number; // 1 to 30
  maxDay?: number; // 30
  missionDayNumber?: number; // e.g. 142
  findings?: Finding[];
  onDayChange: (day: number) => void;
}

const STATUS_COLORS: Record<FindingLevel, string> = {
  normal: '#6FBF9B',
  watch: '#E0BE6A',
  review: '#E58F55',
  urgent: '#DE6A64',
};

export const TimeScrubber: React.FC<TimeScrubberProps> = ({
  currentDay,
  maxDay = 30,
  missionDayNumber = 142,
  findings = [],
  onDayChange,
}) => {
  // Map findings to days (1 to 30)
  const findingTicks = useMemo(() => {
    const ticks: Array<{ day: number; level: FindingLevel }> = [];
    const now = new Date();
    
    findings.forEach((f) => {
      try {
        const fDate = new Date(f.timestamp);
        const diffMs = now.getTime() - fDate.getTime();
        const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
        const day = 30 - diffDays;
        if (day >= 1 && day <= 30) {
          ticks.push({ day, level: f.level });
        }
      } catch {
        // ignore invalid dates
      }
    });

    return ticks;
  }, [findings]);

  const isLive = currentDay === maxDay;

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-2 select-none">
      {/* Scrubber Label & Stats Bar */}
      <div className="flex items-center justify-between text-[11px] font-mono tracking-instrument text-[#8D97A6] mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[#ECE8E1] font-medium">DAY {currentDay}</span>
          <span className="text-[#5B6573]">/ {maxDay}</span>
          <span className="text-[#5B6573]">·</span>
          <span className="text-[#5B6573]">EXPEDITION SOL {missionDayNumber - (maxDay - currentDay)}</span>
        </div>

        {!isLive && (
          <button
            onClick={() => onDayChange(maxDay)}
            className="flex items-center gap-1 text-[10px] text-[#B8CCE6] hover:text-[#ECE8E1] transition-colors"
          >
            <RotateCcw className="w-3 h-3" strokeWidth={1.25} />
            <span>RETURN TO LIVE</span>
          </button>
        )}
      </div>

      {/* Track & Ticks */}
      <div className="relative flex items-center h-5 cursor-pointer group">
        {/* Background Track Line */}
        <div className="absolute inset-x-0 h-[2px] bg-white/10 rounded-full" />

        {/* Progress Track Line */}
        <div
          className="absolute left-0 h-[2px] bg-[#B8CCE6] rounded-full transition-all duration-75"
          style={{ width: `${((currentDay - 1) / (maxDay - 1)) * 100}%` }}
        />

        {/* Finding Event Ticks along the track */}
        {findingTicks.map((tick, idx) => {
          const leftPct = ((tick.day - 1) / (maxDay - 1)) * 100;
          return (
            <div
              key={`${tick.day}-${idx}`}
              className="absolute w-[2px] h-2.5 -top-[3px] rounded-full z-10 pointer-events-none"
              style={{
                left: `${leftPct}%`,
                backgroundColor: STATUS_COLORS[tick.level],
                boxShadow: `0 0 4px ${STATUS_COLORS[tick.level]}`,
              }}
              title={`Day ${tick.day} finding: ${tick.level}`}
            />
          );
        })}

        {/* Native Hidden Range Input for smooth drag & accessibility */}
        <input
          type="range"
          min={1}
          max={maxDay}
          step={1}
          value={currentDay}
          onChange={(e) => onDayChange(parseInt(e.target.value, 10))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
          aria-label="30-Day Mission History Replay Scrubber"
        />

        {/* Visual Custom Slider Thumb */}
        <div
          className="absolute w-3 h-3 rounded-full bg-[#ECE8E1] shadow-[0_0_8px_rgba(255,255,255,0.4)] pointer-events-none transition-transform -translate-x-1/2 group-hover:scale-125 z-10"
          style={{ left: `${((currentDay - 1) / (maxDay - 1)) * 100}%` }}
        />
      </div>

      {/* Subtle Day Markings */}
      <div className="flex justify-between text-[9px] font-mono text-[#5B6573] mt-1 px-0.5">
        <span>DAY 1</span>
        <span>DAY 10</span>
        <span>DAY 20</span>
        <span className={isLive ? 'text-[#6FBF9B]' : ''}>DAY 30 (LIVE)</span>
      </div>
    </div>
  );
};
