import React, { useState } from 'react';
import { useAstraStore } from '../../api/mockClient';
import { GuidanceCategory, GuidanceRecommendation } from '../../api/types';
import {
  LucideIcon,
  ShieldAlert,
  Search,
  BookOpen,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  Filter,
  Stethoscope,
  Activity,
  Moon,
  Dumbbell,
  Droplet,
  Heart,
  Brain,
} from 'lucide-react';

const CATEGORY_META: Record<
  GuidanceCategory,
  { label: string; icon: LucideIcon }
> = {
  sleep: { label: 'Sleep & Recovery', icon: Moon },
  hydration_nutrition: { label: 'Hydration & Nutrition', icon: Droplet },
  exercise: { label: 'Physical Exercise', icon: Dumbbell },
  cardiovascular: { label: 'Cardiovascular', icon: Heart },
  musculoskeletal: { label: 'Musculoskeletal', icon: Activity },
  mental_behavioral: { label: 'Mental Wellbeing', icon: Brain },
  symptom: { label: 'Symptom Escalation', icon: AlertTriangle },
  measurement: { label: 'Sensor Procedures', icon: Stethoscope },
};

export const HealthGuidanceCentre: React.FC = () => {
  const { guidanceList, updateGuidanceStatus, activeSubjectId, crew } = useAstraStore();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'in_progress' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const activeCrewMember = crew.find((c) => c.id === activeSubjectId) || crew[1];

  const filteredList = guidanceList.filter((item) => {
    // Subject filter: match current crew or mission-wide
    const matchesSubject = !item.subject_id || item.subject_id === activeSubjectId;
    if (!matchesSubject) return false;

    // Category filter
    if (selectedCategory !== 'all' && item.category !== selectedCategory) {
      return false;
    }

    // Status filter
    if (statusFilter !== 'all' && item.status !== statusFilter) {
      return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const inTitle = item.title.toLowerCase().includes(q);
      const inObserved = item.observed.toLowerCase().includes(q);
      const inWhy = item.why_matters.toLowerCase().includes(q);
      const inSources = item.sources.some((s) => s.toLowerCase().includes(q));
      if (!inTitle && !inObserved && !inWhy && !inSources) return false;
    }

    return true;
  });

  return (
    <div className="w-full flex flex-col font-mono text-[#ECE8E1] select-none space-y-4">
      {/* Top Banner */}
      <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg border border-white/15 bg-white/[0.04] flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-[#B8CCE6]" strokeWidth={1.25} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-medium tracking-wide text-[#ECE8E1] uppercase">
                DEDICATED HEALTH GUIDANCE CENTRE
              </h2>
              <span className="px-2 py-0.5 rounded text-[9px] border border-[#6FBF9B]/30 bg-[#6FBF9B]/10 text-[#6FBF9B]">
                NASA-STD-3001 ALIGNED
              </span>
            </div>
            <p className="text-[10px] text-[#8D97A6] mt-0.5">
              Flight Surgeon Clinical Protocols · 8 Behavioral & Physiological Domains · Mission Subject: {activeCrewMember.name}
            </p>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-[#8D97A6] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search guidelines or NASA standards..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-[#ECE8E1] placeholder:text-[#5B6573] focus:outline-none focus:border-white/30"
          />
        </div>
      </div>

      {/* Category Pills Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-3 py-1 rounded-full text-[10.5px] border transition-all shrink-0 ${
            selectedCategory === 'all'
              ? 'bg-white/15 text-[#ECE8E1] border-white/25 font-medium'
              : 'bg-black/30 text-[#8D97A6] border-white/5 hover:text-[#ECE8E1]'
          }`}
        >
          All Domains ({guidanceList.length})
        </button>
        {(Object.keys(CATEGORY_META) as GuidanceCategory[]).map((catKey) => {
          const meta = CATEGORY_META[catKey];
          const Icon = meta.icon;
          const isSelected = selectedCategory === catKey;
          const count = guidanceList.filter((g) => g.category === catKey).length;
          return (
            <button
              key={catKey}
              onClick={() => setSelectedCategory(catKey)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] border transition-all shrink-0 ${
                isSelected
                  ? 'bg-white/15 text-[#ECE8E1] border-white/25 font-medium'
                  : 'bg-black/30 text-[#8D97A6] border-white/5 hover:text-[#ECE8E1]'
              }`}
            >
              <Icon className="w-3 h-3 text-[#B8CCE6]" />
              <span>{meta.label}</span>
              {count > 0 && <span className="text-[9px] opacity-70">({count})</span>}
            </button>
          );
        })}
      </div>

      {/* Status Filter Sub-Bar */}
      <div className="flex items-center justify-between text-xs text-[#8D97A6] px-1">
        <div className="flex items-center gap-2 text-[10px]">
          <span className="text-[#5B6573]">STATUS:</span>
          {(['all', 'active', 'in_progress', 'completed'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`capitalize px-2 py-0.5 rounded transition-colors ${
                statusFilter === st
                  ? 'bg-white/10 text-[#ECE8E1] font-medium'
                  : 'hover:text-[#ECE8E1]'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
        <span className="text-[10px] text-[#5B6573]">
          Showing {filteredList.length} clinical protocols
        </span>
      </div>

      {/* Guidance Cards Grid */}
      <div className="space-y-3">
        {filteredList.length === 0 ? (
          <div className="p-8 text-center rounded-xl border border-white/5 bg-white/[0.01] text-xs text-[#8D97A6]">
            No clinical guidelines matching your active query and category filters.
          </div>
        ) : (
          filteredList.map((item) => {
            const isExpanded = expandedId === item.id;
            const meta = CATEGORY_META[item.category] || { label: item.category, icon: Activity };
            const Icon = meta.icon;

            return (
              <div
                key={item.id}
                className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:border-white/15 transition-all space-y-3"
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg border border-white/10 bg-white/[0.03] flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-[#B8CCE6]" strokeWidth={1.25} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9.5px] uppercase tracking-wider text-[#8D97A6]">
                          {meta.label}
                        </span>
                        <span className="text-[#5B6573]">·</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[8.5px] uppercase font-bold border ${
                            item.status === 'active'
                              ? 'border-[#E0BE6A]/40 bg-[#E0BE6A]/10 text-[#E0BE6A]'
                              : item.status === 'in_progress'
                              ? 'border-[#B8CCE6]/40 bg-[#B8CCE6]/10 text-[#B8CCE6]'
                              : 'border-[#6FBF9B]/40 bg-[#6FBF9B]/10 text-[#6FBF9B]'
                          }`}
                        >
                          {item.status.replace('_', ' ')}
                        </span>
                      </div>
                      <h3 className="text-xs lg:text-sm font-medium text-[#ECE8E1] mt-0.5">
                        {item.title}
                      </h3>
                    </div>
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.status !== 'completed' && (
                      <button
                        onClick={() =>
                          updateGuidanceStatus(
                            item.id,
                            item.status === 'active' ? 'in_progress' : 'completed'
                          )
                        }
                        className="px-2.5 py-1 rounded text-[10px] font-mono border border-white/15 bg-white/[0.04] hover:bg-white/10 text-[#ECE8E1] transition-colors"
                      >
                        {item.status === 'active' ? 'Initiate Protocol' : 'Complete ✓'}
                      </button>
                    )}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      className="p-1 rounded hover:bg-white/5 text-[#8D97A6] hover:text-[#ECE8E1]"
                    >
                      <ChevronRight
                        className={`w-4 h-4 transition-transform duration-200 ${
                          isExpanded ? 'rotate-90' : ''
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* 6 Essential NASA Clinical Points */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 hairline-t text-[11px]">
                  {/* Point 1: Observed Trigger */}
                  <div className="p-2.5 rounded-lg bg-black/30 border border-white/5">
                    <span className="text-[9px] uppercase text-[#8D97A6] tracking-wider block mb-1 font-semibold">
                      1. WHAT WAS OBSERVED (PHYSIOLOGICAL TRIGGER)
                    </span>
                    <p className="text-[#ECE8E1] leading-relaxed">{item.observed}</p>
                  </div>

                  {/* Point 2: Why it matters */}
                  <div className="p-2.5 rounded-lg bg-black/30 border border-white/5">
                    <span className="text-[9px] uppercase text-[#8D97A6] tracking-wider block mb-1 font-semibold">
                      2. WHY IT MATTERS IN SPACEFLIGHT
                    </span>
                    <p className="text-[#ECE8E1] leading-relaxed">{item.why_matters}</p>
                  </div>

                  {/* Point 3: What to monitor */}
                  <div className="p-2.5 rounded-lg bg-black/30 border border-white/5">
                    <span className="text-[9px] uppercase text-[#8D97A6] tracking-wider block mb-1 font-semibold">
                      3. WHAT TO MONITOR (BIOMETRIC TARGETS)
                    </span>
                    <p className="text-[#ECE8E1] leading-relaxed">{item.what_to_monitor}</p>
                  </div>

                  {/* Point 4: Next Steps / Immediate Action */}
                  <div className="p-2.5 rounded-lg bg-black/30 border border-white/5">
                    <span className="text-[9px] uppercase text-[#B8CCE6] tracking-wider block mb-1 font-semibold">
                      4. NEXT STEPS / PRESCRIBED ACTION
                    </span>
                    <p className="text-[#ECE8E1] leading-relaxed">{item.next_step}</p>
                  </div>
                </div>

                {/* Point 5: Explicit Flight Surgeon Escalation Criteria */}
                <div className="p-2.5 rounded-lg bg-[#DE6A64]/10 border border-[#DE6A64]/30 flex items-start gap-2.5 text-[11px]">
                  <AlertTriangle className="w-4 h-4 text-[#DE6A64] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[9px] uppercase font-bold text-[#DE6A64] tracking-wider block">
                      5. WHEN TO SEEK MEDICAL SUPPORT (ESCALATION CRITERIA)
                    </span>
                    <p className="text-[#ECE8E1] mt-0.5 leading-relaxed">
                      {item.when_medical_support}
                    </p>
                  </div>
                </div>

                {/* Point 6: Approved NASA Source Authorities */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[9px] uppercase text-[#5B6573] font-semibold mr-1">
                    6. APPROVED NASA AUTHORITIES:
                  </span>
                  {item.sources.map((src, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded text-[9px] font-mono border border-white/10 bg-white/[0.03] text-[#8D97A6]"
                    >
                      {src}
                    </span>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
