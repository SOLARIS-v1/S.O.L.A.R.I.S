import React, { useState } from 'react';
import { useAstraStore } from '../../api/mockClient';
import { HealthTimelineEvent } from '../../api/types';
import {
  Clock,
  Filter,
  Activity,
  ClipboardCheck,
  AlertTriangle,
  Stethoscope,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Download,
  Share2,
  Calendar,
  CheckCircle2,
} from 'lucide-react';

const SEVERITY_COLORS = {
  normal: '#6FBF9B',
  watch: '#E0BE6A',
  review: '#E58F55',
  urgent: '#DE6A64',
};

const CATEGORY_ICONS: Record<string, React.FC<{ className?: string }>> = {
  measurement: Activity,
  assessment: ClipboardCheck,
  symptom: AlertTriangle,
  finding: AlertTriangle,
  guidance: BookOpen,
  medical_action: Stethoscope,
  mission_event: Calendar,
};

export const AstronautHealthTimeline: React.FC = () => {
  const { timelineEvents, activeSubjectId, crew } = useAstraStore();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<'24H' | '7D' | '30D' | '90D' | 'ALL'>('7D');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const activeCrewMember = crew.find((c) => c.id === activeSubjectId) || crew[1];

  // Filter events by crew, category, and time horizon
  const filteredEvents = timelineEvents.filter((ev) => {
    // Subject filter
    if (ev.subject_id && ev.subject_id !== activeSubjectId) return false;

    // Category filter
    if (selectedCategory !== 'all' && ev.category !== selectedCategory) return false;

    // Time horizon filter
    const now = Date.now();
    const evTime = new Date(ev.timestamp).getTime();
    const diffHours = (now - evTime) / 3600000;
    if (timeFilter === '24H' && diffHours > 24) return false;
    if (timeFilter === '7D' && diffHours > 168) return false;
    if (timeFilter === '30D' && diffHours > 720) return false;
    if (timeFilter === '90D' && diffHours > 2160) return false;

    return true;
  });

  const handleExport = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(filteredEvents, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `SOLARIS_Health_Timeline_${activeCrewMember.name.replace(/\s+/g, '_')}_Sol142.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setExportNotice('Clinical timeline export generated for Flight Surgeon review.');
    setTimeout(() => setExportNotice(null), 3500);
  };

  return (
    <div className="w-full flex flex-col font-mono text-[#ECE8E1] select-none space-y-4">
      {/* Timeline Controls & Filter Bar */}
      <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg border border-white/15 bg-white/[0.04] flex items-center justify-center">
            <Clock className="w-4 h-4 text-[#B8CCE6]" strokeWidth={1.25} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-medium tracking-wide text-[#ECE8E1] uppercase">
                UNIFIED ASTRONAUT HEALTH TIMELINE
              </h2>
              <span className="px-2 py-0.5 rounded text-[9px] border border-white/10 bg-white/[0.03] text-[#8D97A6]">
                CHRONOLOGICAL AUDIT STREAM
              </span>
            </div>
            <p className="text-[10px] text-[#8D97A6] mt-0.5">
              Subject: {activeCrewMember.name} ({activeCrewMember.callsign}) · Sol 142 Expedition Mars
            </p>
          </div>
        </div>

        {/* Time Horizon Pills + Export Button */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white/[0.03] p-0.5 rounded-full border border-white/[0.08]">
            {(['24H', '7D', '30D', '90D', 'ALL'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTimeFilter(t)}
                className={`px-2.5 py-0.5 rounded-full text-[10px] transition-all ${
                  timeFilter === t
                    ? 'bg-white/15 text-[#ECE8E1] font-medium'
                    : 'text-[#8D97A6] hover:text-[#ECE8E1]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/15 bg-white/[0.04] hover:bg-white/10 text-xs text-[#ECE8E1] transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="text-[10px]">Export Packet</span>
          </button>
        </div>
      </div>

      {exportNotice && (
        <div className="p-2.5 rounded-lg border border-[#6FBF9B]/40 bg-[#6FBF9B]/10 text-xs text-[#6FBF9B] flex items-center justify-between animate-in fade-in">
          <span>{exportNotice}</span>
          <CheckCircle2 className="w-4 h-4" />
        </div>
      )}

      {/* Category Pills Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
        {[
          { id: 'all', label: 'All Event Types' },
          { id: 'assessment', label: 'Assessments' },
          { id: 'symptom', label: 'Symptoms' },
          { id: 'finding', label: 'Findings' },
          { id: 'guidance', label: 'Guidance' },
          { id: 'medical_action', label: 'Medical Actions' },
          { id: 'mission_event', label: 'Mission Events' },
        ].map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedCategory(c.id)}
            className={`px-3 py-1 rounded-full text-[10px] border transition-all shrink-0 ${
              selectedCategory === c.id
                ? 'bg-white/15 text-[#ECE8E1] border-white/25 font-medium'
                : 'bg-black/30 text-[#8D97A6] border-white/5 hover:text-[#ECE8E1]'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Vertical Chronological Timeline */}
      <div className="relative pl-6 lg:pl-8 space-y-4 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[1px] before:bg-white/10">
        {filteredEvents.length === 0 ? (
          <div className="p-6 text-center rounded-xl border border-white/5 bg-white/[0.01] text-xs text-[#8D97A6]">
            No recorded health events matching current criteria.
          </div>
        ) : (
          filteredEvents.map((ev) => {
            const isExpanded = expandedId === ev.id;
            const Icon = CATEGORY_ICONS[ev.category] || Activity;
            const sevColor = (ev.severity && SEVERITY_COLORS[ev.severity]) || '#6FBF9B';
            const formattedTime = new Date(ev.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });
            const formattedDate = new Date(ev.timestamp).toLocaleDateString([], {
              month: 'short',
              day: 'numeric',
            });

            return (
              <div key={ev.id} className="relative group">
                {/* Node Dot on vertical rail */}
                <div
                  className="absolute -left-6 lg:-left-8 top-3.5 w-2.5 h-2.5 rounded-full border border-black transform -translate-x-[4.5px] transition-transform group-hover:scale-125"
                  style={{ backgroundColor: sevColor, boxShadow: `0 0 8px ${sevColor}60` }}
                />

                {/* Event Card */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : ev.id)}
                  className="p-3.5 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:border-white/20 transition-all cursor-pointer space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 text-[#B8CCE6]" />
                      <span className="text-[10px] text-[#8D97A6] uppercase tracking-wider">
                        {ev.category.replace('_', ' ')}
                      </span>
                      <span className="text-[#5B6573]">·</span>
                      <span className="text-[10px] text-[#8D97A6]">
                        {formattedDate} at {formattedTime}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {ev.is_simulated && (
                        <span className="px-1.5 py-0.5 rounded text-[8.5px] font-mono border border-white/10 text-[#5B6573]">
                          [SIMULATED]
                        </span>
                      )}
                      <span
                        className="px-2 py-0.5 rounded text-[8.5px] uppercase font-bold border"
                        style={{
                          borderColor: `${sevColor}40`,
                          color: sevColor,
                          backgroundColor: `${sevColor}10`,
                        }}
                      >
                        {ev.severity}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs lg:text-sm font-medium text-[#ECE8E1]">{ev.title}</h3>
                    <p className="text-[11px] text-[#8D97A6] mt-0.5">{ev.summary}</p>
                  </div>

                  {/* Expandable Clinical Provenance and Correlation */}
                  {isExpanded && (
                    <div className="pt-2.5 hairline-t space-y-2 text-[11px] animate-in fade-in duration-200">
                      {ev.detail && (
                        <div className="p-2.5 rounded bg-black/40 border border-white/5">
                          <span className="text-[9px] uppercase text-[#8D97A6] block mb-0.5">
                            CLINICAL DETAIL & INTERPRETATION:
                          </span>
                          <p className="text-[#ECE8E1] leading-relaxed">{ev.detail}</p>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-[#5B6573]">
                        <span>SOURCE / SENSOR: {ev.source}</span>
                        {ev.action_required && (
                          <span className="text-[#E0BE6A] font-semibold">
                            ⚠️ Flight Surgeon Action Pending
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
