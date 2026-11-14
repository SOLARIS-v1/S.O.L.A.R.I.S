import React, { useState } from 'react';
import { Activity, ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown } from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const [filter, setFilter] = useState<'24H' | '7D' | '30D' | '90D'>('7D');

  const hrData = [
    { day: 'Day136', val: 72 },
    { day: '137', val: 74 },
    { day: '138', val: 77 },
    { day: '139', val: 75 },
    { day: '140', val: 78 },
    { day: '141', val: 84 },
    { day: '142', val: 86 },
  ];

  const sleepData = [
    { day: '136', val: 7.8 },
    { day: '137', val: 7.4 },
    { day: '138', val: 6.8 },
    { day: '139', val: 7.2 },
    { day: '140', val: 6.9 },
    { day: '141', val: 5.6 },
    { day: '142', val: 5.3 },
  ];

  return (
    <div className="w-full h-full max-w-7xl mx-auto flex flex-col justify-between p-2 lg:p-4 select-none font-mono text-[#ECE8E1]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-3 hairline-b">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg border border-white/10 bg-white/[0.03] flex items-center justify-center">
            <Activity className="w-4 h-4 text-[#ECE8E1]" strokeWidth={1.25} />
          </div>
          <div>
            <h1 className="text-sm font-medium tracking-wide text-[#ECE8E1]">
              Health Analytics
            </h1>
            <p className="text-[10px] text-[#8D97A6]">
              Trends, patterns and anomaly detection
            </p>
          </div>
        </div>

        {/* Time Filter Pills */}
        <div className="flex items-center gap-1 bg-white/[0.02] p-0.5 rounded-full border border-white/[0.06]">
          {(['24H', '7D', '30D', '90D'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-3 py-1 rounded-full text-[10px] transition-all ${
                filter === t
                  ? 'bg-white/10 text-[#ECE8E1] font-medium border border-white/15'
                  : 'text-[#8D97A6] hover:text-[#ECE8E1]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Upper Grid: 2 Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3 flex-1 min-h-[220px]">
        {/* Heart Rate Trend Line Chart */}
        <div className="p-3.5 rounded-xl border border-white/[0.08] bg-white/[0.02] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#ECE8E1] font-medium">Heart Rate Trend</span>
            <div className="flex items-center gap-2 text-[10px]">
              <span className="text-[#8D97A6]">Avg: 76 bpm</span>
              <span className="text-[#6FBF9B] flex items-center">▲ +2.4%</span>
            </div>
          </div>

          {/* Line Chart Canvas / SVG */}
          <div className="w-full flex-1 relative flex items-center">
            <svg viewBox="0 0 320 120" className="w-full h-full overflow-visible">
              {/* Y-axis labels */}
              <text x="0" y="15" fill="#5B6573" fontSize="9">90</text>
              <text x="0" y="45" fill="#5B6573" fontSize="9">80</text>
              <text x="0" y="75" fill="#5B6573" fontSize="9">70</text>
              <text x="0" y="105" fill="#5B6573" fontSize="9">60</text>

              {/* Grid lines */}
              <line x1="20" y1="12" x2="310" y2="12" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
              <line x1="20" y1="42" x2="310" y2="42" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
              <line x1="20" y1="72" x2="310" y2="72" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
              <line x1="20" y1="102" x2="310" y2="102" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />

              {/* Data Polyline */}
              <polyline
                fill="none"
                stroke="#ECE8E1"
                strokeWidth="1.5"
                points="30,72 75,66 120,57 165,63 210,54 255,36 300,30"
              />

              {/* Nodes */}
              {[
                { x: 30, y: 72 },
                { x: 75, y: 66 },
                { x: 120, y: 57 },
                { x: 165, y: 63 },
                { x: 210, y: 54 },
                { x: 255, y: 36 },
                { x: 300, y: 30 },
              ].map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="#ECE8E1" />
              ))}
            </svg>
          </div>

          {/* X-axis days */}
          <div className="flex justify-between pl-6 text-[9px] text-[#5B6573] mt-1">
            {hrData.map((d) => (
              <span key={d.day}>{d.day}</span>
            ))}
          </div>
        </div>

        {/* Sleep Duration Bar Chart */}
        <div className="p-3.5 rounded-xl border border-white/[0.08] bg-white/[0.02] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#ECE8E1] font-medium">Sleep Duration</span>
            <div className="flex items-center gap-2 text-[10px]">
              <span className="text-[#8D97A6]">Avg: 6.8 h</span>
              <span className="text-[#DE6A64] flex items-center">▼ -12%</span>
            </div>
          </div>

          {/* Bar Chart Canvas / SVG */}
          <div className="w-full flex-1 relative flex items-center">
            <svg viewBox="0 0 320 120" className="w-full h-full overflow-visible">
              {/* Y-axis labels */}
              <text x="0" y="15" fill="#5B6573" fontSize="9">10</text>
              <text x="0" y="38" fill="#5B6573" fontSize="9">8</text>
              <text x="0" y="60" fill="#5B6573" fontSize="9">6</text>
              <text x="0" y="82" fill="#5B6573" fontSize="9">4</text>
              <text x="0" y="105" fill="#5B6573" fontSize="9">2</text>

              {/* Grid lines */}
              <line x1="20" y1="12" x2="310" y2="12" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
              <line x1="20" y1="58" x2="310" y2="58" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
              <line x1="20" y1="102" x2="310" y2="102" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />

              {/* 7 Bars */}
              {[
                { x: 30, h: 78 },
                { x: 75, h: 74 },
                { x: 120, h: 68 },
                { x: 165, h: 72 },
                { x: 210, h: 69 },
                { x: 255, h: 56 },
                { x: 300, h: 53 },
              ].map((b, i) => (
                <rect
                  key={i}
                  x={b.x - 7}
                  y={102 - b.h * 0.9}
                  width="14"
                  height={b.h * 0.9}
                  rx="2"
                  fill="rgba(255, 255, 255, 0.22)"
                />
              ))}
            </svg>
          </div>

          {/* X-axis days */}
          <div className="flex justify-between pl-6 text-[9px] text-[#5B6573] mt-1">
            {sleepData.map((d) => (
              <span key={d.day}>{d.day}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Lower Grid: Key Insights & System Correlation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 min-h-[140px]">
        {/* Key Insights Panel */}
        <div className="p-3.5 rounded-xl border border-white/[0.08] bg-white/[0.02] flex flex-col justify-between">
          <span className="text-xs text-[#ECE8E1] font-medium mb-2">Key Insights</span>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-[#ECE8E1]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#ECE8E1]" />
                <span>All core vitals within normal range</span>
              </div>
              <span className="text-[10px] text-[#5B6573]">2m ago</span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-[#ECE8E1]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#ECE8E1]" />
                <span>Slight increase in heart rate detected</span>
              </div>
              <span className="text-[10px] text-[#5B6573]">12m ago</span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-[#ECE8E1]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#ECE8E1]" />
                <span>Sleep duration below 7-day average</span>
              </div>
              <span className="text-[10px] text-[#5B6573]">18m ago</span>
            </div>
          </div>
        </div>

        {/* System Correlation Panel */}
        <div className="p-3.5 rounded-xl border border-white/[0.08] bg-white/[0.02] flex flex-col justify-between">
          <span className="text-xs text-[#ECE8E1] font-medium mb-2">System Correlation</span>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5 text-[#ECE8E1]">
                <Activity className="w-3.5 h-3.5 text-[#8D97A6]" strokeWidth={1.25} />
                <span>Sleep</span>
                <span className="text-[#8D97A6]">↗</span>
                <span>Heart Rate</span>
              </div>
              <span className="text-[11px] text-[#ECE8E1] font-light">(+4.2%)</span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5 text-[#ECE8E1]">
                <Activity className="w-3.5 h-3.5 text-[#8D97A6]" strokeWidth={1.25} />
                <span>Activity</span>
                <span className="text-[#8D97A6]">↘</span>
                <span>HRV</span>
              </div>
              <span className="text-[11px] text-[#ECE8E1] font-light">(-15%)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
